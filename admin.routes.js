const express = require("express");
const { User, Transaction, Wallet } = require("../models");
const { getSettings, Settings } = require("../models/Settings");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();
router.use(protect, adminOnly);

router.get("/settings", async (req, res) => {
  const settings = await getSettings();
  res.json({ success: true, settings });
});

router.put("/settings", async (req, res) => {
  const { dataMarkup, otpMarginType, otpMarginValue } = req.body;
  const settings = await getSettings();

  if (dataMarkup !== undefined) settings.dataMarkup = dataMarkup;
  if (otpMarginType !== undefined) settings.otpMarginType = otpMarginType;
  if (otpMarginValue !== undefined) settings.otpMarginValue = otpMarginValue;
  await settings.save();

  res.json({ success: true, settings });
});

router.get("/overview", async (req, res) => {
  const [userCount, txns] = await Promise.all([
    User.count(),
    Transaction.findAll({ order: [["createdAt", "DESC"]], limit: 50 }),
  ]);

  const totalRevenue = txns.reduce((sum, t) => (t.amount < 0 ? sum + Math.abs(Number(t.amount)) : sum), 0);
  const totalProfit = txns.reduce((sum, t) => sum + Number(t.profit || 0), 0);

  res.json({
    success: true,
    stats: { userCount, transactionCount: txns.length, totalRevenue, totalProfit },
    recentTransactions: txns,
  });
});

router.get("/users", async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ["passwordHash"] },
    include: [{ model: Wallet }],
    order: [["createdAt", "DESC"]],
  });
  res.json({ success: true, users });
});

router.get("/transactions", async (req, res) => {
  const transactions = await Transaction.findAll({ order: [["createdAt", "DESC"]], limit: 200 });
  res.json({ success: true, transactions });
});

module.exports = router;
