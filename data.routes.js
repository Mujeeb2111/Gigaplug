const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { sequelize, Wallet, Transaction } = require("../models");
const { getSettings } = require("../models/Settings");
const { protect } = require("../middleware/auth");
const clubkonnect = require("../services/clubkonnect.service");

const router = express.Router();

// Simple in-memory cache so we don't hammer ClubKonnect on every page load.
let planCache = { fetchedAt: 0, plans: [] };
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getPlansWithMarkup() {
  const settings = await getSettings();
  const markup = Number(settings.dataMarkup);

  if (Date.now() - planCache.fetchedAt > CACHE_TTL_MS) {
    planCache = { fetchedAt: Date.now(), plans: await clubkonnect.fetchDataPlans() };
  }

  return planCache.plans.map((p) => ({
    ...p,
    sellPrice: Math.ceil(p.apiCost + markup),
  }));
}

router.get("/plans", protect, async (req, res) => {
  try {
    const { network } = req.query;
    let plans = await getPlansWithMarkup();
    if (network) plans = plans.filter((p) => p.network.toLowerCase() === network.toLowerCase());
    res.json({ success: true, plans });
  } catch (err) {
    console.error("Failed to fetch ClubKonnect plans:", err?.response?.data || err.message);
    res.status(502).json({ success: false, message: "Could not fetch live data plans right now" });
  }
});

router.post("/purchase", protect, async (req, res) => {
  const { network, planCode, phone } = req.body;
  if (!network || !planCode || !phone) {
    return res.status(400).json({ success: false, message: "network, planCode and phone are required" });
  }

  const t = await sequelize.transaction();
  try {
    const plans = await getPlansWithMarkup();
    const plan = plans.find((p) => p.network.toLowerCase() === network.toLowerCase() && String(p.planCode) === String(planCode));
    if (!plan) throw Object.assign(new Error("Plan not found"), { status: 404 });

    const wallet = await Wallet.findOne({ where: { userId: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (Number(wallet.balance) < plan.sellPrice) {
      throw Object.assign(new Error("Insufficient wallet balance"), { status: 402 });
    }

    // Debit first so we never sell what the user can't afford, then call
    // ClubKonnect. If ClubKonnect fails, roll the debit back.
    wallet.balance = Number(wallet.balance) - plan.sellPrice;
    await wallet.save({ transaction: t });

    const requestId = uuidv4().replace(/-/g, "").slice(0, 20);
    const txn = await Transaction.create(
      {
        userId: req.user.id,
        type: "data",
        description: `${plan.network} ${plan.name} - ${phone}`,
        amount: -plan.sellPrice,
        costPrice: plan.apiCost,
        profit: plan.sellPrice - plan.apiCost,
        status: "pending",
        reference: requestId,
      },
      { transaction: t }
    );

    await t.commit();

    // Call ClubKonnect outside the DB transaction (external network call).
    try {
      const result = await clubkonnect.purchaseData({ network, planCode, phone, requestId });
      txn.status = result.success ? "success" : "failed";
      txn.meta = JSON.stringify(result.raw);
      await txn.save();

      if (!result.success) {
        // refund
        const w = await Wallet.findOne({ where: { userId: req.user.id } });
        w.balance = Number(w.balance) + plan.sellPrice;
        await w.save();
        await Transaction.create({
          userId: req.user.id,
          type: "refund",
          description: `Refund: failed data purchase (${requestId})`,
          amount: plan.sellPrice,
          status: "success",
          reference: requestId,
        });
        return res.status(502).json({ success: false, message: "Data purchase failed upstream, wallet refunded", detail: result.raw });
      }

      res.json({ success: true, transaction: txn });
    } catch (upstreamErr) {
      console.error("ClubKonnect purchase error:", upstreamErr?.response?.data || upstreamErr.message);
      txn.status = "failed";
      await txn.save();

      const w = await Wallet.findOne({ where: { userId: req.user.id } });
      w.balance = Number(w.balance) + plan.sellPrice;
      await w.save();
      await Transaction.create({
        userId: req.user.id,
        type: "refund",
        description: `Refund: ClubKonnect error (${requestId})`,
        amount: plan.sellPrice,
        status: "success",
        reference: requestId,
      });

      res.status(502).json({ success: false, message: "Data provider error, wallet refunded" });
    }
  } catch (err) {
    await t.rollback();
    res.status(err.status || 500).json({ success: false, message: err.message || "Purchase failed" });
  }
});

module.exports = router;
