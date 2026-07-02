const express = require("express");
const { sequelize, Wallet, Transaction, OtpOrder } = require("../models");
const { getSettings } = require("../models/Settings");
const { protect } = require("../middleware/auth");
const fivesim = require("../services/fivesim.service");

const router = express.Router();

function applyMargin(costNaira, settings) {
  const value = Number(settings.otpMarginValue);
  if (settings.otpMarginType === "percent") {
    return Math.ceil(costNaira * (1 + value / 100));
  }
  return Math.ceil(costNaira + value);
}

// NOTE: 5SIM prices come back in RUB (or the currency tied to your account).
// You are responsible for converting to NGN with your own FX rate before
// applying margin - USD_TO_NGN below is a placeholder, wire it to a real
// rate source (your own settings table, an FX API, etc.) before going live.
const FX_RATE_TO_NGN = Number(process.env.FIVESIM_FX_TO_NGN || 1);

router.get("/countries", protect, async (req, res) => {
  try {
    const data = await fivesim.getCountries();
    res.json({ success: true, countries: data });
  } catch (err) {
    console.error("5SIM countries error:", err?.response?.data || err.message);
    res.status(502).json({ success: false, message: "Could not fetch countries" });
  }
});

router.get("/products", protect, async (req, res) => {
  try {
    const { country, operator } = req.query;
    if (!country) return res.status(400).json({ success: false, message: "country is required" });

    const settings = await getSettings();
    const raw = await fivesim.getProducts(country, operator || "any");

    const products = Object.entries(raw || {}).map(([name, info]) => {
      const costNaira = Number(info.Price) * FX_RATE_TO_NGN;
      return {
        product: name,
        category: info.Category,
        qty: info.Qty,
        costPrice: costNaira,
        sellPrice: applyMargin(costNaira, settings),
      };
    });

    res.json({ success: true, products });
  } catch (err) {
    console.error("5SIM products error:", err?.response?.data || err.message);
    res.status(502).json({ success: false, message: "Could not fetch products" });
  }
});

router.post("/buy", protect, async (req, res) => {
  const { country, operator, product } = req.body;
  if (!country || !product) return res.status(400).json({ success: false, message: "country and product are required" });

  const t = await sequelize.transaction();
  try {
    const settings = await getSettings();
    const productData = await fivesim.getProducts(country, operator || "any");
    const info = productData[product];
    if (!info) throw Object.assign(new Error("Product/number not available"), { status: 404 });

    const costNaira = Number(info.Price) * FX_RATE_TO_NGN;
    const sellPrice = applyMargin(costNaira, settings);

    const wallet = await Wallet.findOne({ where: { userId: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (Number(wallet.balance) < sellPrice) {
      throw Object.assign(new Error("Insufficient wallet balance"), { status: 402 });
    }

    // Buy from 5SIM first here since numbers can go out of stock between
    // page load and checkout - we don't want to debit for a number we
    // couldn't actually get.
    await t.rollback(); // release lock while we do the external call
    const order = await fivesim.buyActivation({ country, operator: operator || "any", product });

    const t2 = await sequelize.transaction();
    try {
      const wallet2 = await Wallet.findOne({ where: { userId: req.user.id }, transaction: t2, lock: t2.LOCK.UPDATE });
      if (Number(wallet2.balance) < sellPrice) {
        await fivesim.cancelOrder(order.id).catch(() => {});
        throw Object.assign(new Error("Insufficient wallet balance"), { status: 402 });
      }

      wallet2.balance = Number(wallet2.balance) - sellPrice;
      await wallet2.save({ transaction: t2 });

      const otpOrder = await OtpOrder.create(
        {
          userId: req.user.id,
          fivesimOrderId: String(order.id),
          country,
          operator: operator || "any",
          product,
          phone: order.phone,
          costPrice: costNaira,
          sellPrice,
          status: order.status || "PENDING",
        },
        { transaction: t2 }
      );

      await Transaction.create(
        {
          userId: req.user.id,
          type: "otp",
          description: `${country} · ${product} number rental`,
          amount: -sellPrice,
          costPrice: costNaira,
          profit: sellPrice - costNaira,
          status: "success",
          reference: String(order.id),
          meta: JSON.stringify(order),
        },
        { transaction: t2 }
      );

      await t2.commit();
      res.status(201).json({ success: true, order: otpOrder });
    } catch (innerErr) {
      await t2.rollback();
      throw innerErr;
    }
  } catch (err) {
    if (t && !t.finished) await t.rollback().catch(() => {});
    console.error("5SIM buy error:", err?.response?.data || err.message);
    res.status(err.status || 502).json({ success: false, message: err.message || "Number purchase failed" });
  }
});

// Poll for the SMS/OTP code on a rented number.
router.get("/status/:orderId", protect, async (req, res) => {
  try {
    const order = await OtpOrder.findOne({ where: { fivesimOrderId: req.params.orderId, userId: req.user.id } });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const live = await fivesim.checkOrder(req.params.orderId);
    order.status = live.status;
    if (live.sms && live.sms.length > 0) {
      order.smsCode = live.sms[0].code;
      order.smsText = live.sms[0].text;
    }
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    console.error("5SIM status error:", err?.response?.data || err.message);
    res.status(502).json({ success: false, message: "Could not check order status" });
  }
});

router.post("/cancel/:orderId", protect, async (req, res) => {
  try {
    const order = await OtpOrder.findOne({ where: { fivesimOrderId: req.params.orderId, userId: req.user.id } });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    await fivesim.cancelOrder(req.params.orderId);
    order.status = "CANCELED";
    await order.save();

    // Refund the user since a canceled order (before an SMS arrives) is free on 5SIM.
    const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
    wallet.balance = Number(wallet.balance) + Number(order.sellPrice);
    await wallet.save();

    await Transaction.create({
      userId: req.user.id,
      type: "refund",
      description: `Refund: canceled number order (${order.fivesimOrderId})`,
      amount: Number(order.sellPrice),
      status: "success",
      reference: order.fivesimOrderId,
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("5SIM cancel error:", err?.response?.data || err.message);
    res.status(502).json({ success: false, message: "Could not cancel order" });
  }
});

module.exports = router;
