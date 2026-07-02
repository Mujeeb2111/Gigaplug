const express = require("express");
const { Wallet, Transaction } = require("../models");
const { protect } = require("../middleware/auth");
const monnify = require("../services/monnify.service");

const router = express.Router();

router.get("/balance", protect, async (req, res) => {
  const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
  res.json({ success: true, balance: wallet ? Number(wallet.balance) : 0 });
});

router.get("/account", protect, async (req, res) => {
  res.json({
    success: true,
    account: {
      accountNumber: req.user.monnifyAccountNumber,
      bankName: req.user.monnifyBankName,
      accountName: req.user.monnifyAccountName,
    },
  });
});

router.get("/transactions", protect, async (req, res) => {
  const transactions = await Transaction.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
  res.json({ success: true, transactions });
});

/**
 * Monnify webhook: fires when a customer transfers money into their
 * reserved account. Verify the signature, then credit the wallet.
 * Register this URL (e.g. https://yourdomain.com/api/wallet/webhook/monnify)
 * in your Monnify dashboard.
 *
 * IMPORTANT: this route needs the raw request body for signature
 * verification - see the express.raw() wiring in server.js.
 */
router.post("/webhook/monnify", async (req, res) => {
  try {
    const signature = req.headers["monnify-signature"];
    const rawBody = req.body; // Buffer, thanks to express.raw() in server.js

    if (!monnify.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const eventData = payload.eventData || {};
    const eventType = payload.eventType;

    if (eventType === "SUCCESSFUL_TRANSACTION") {
      const accountReference = eventData?.product?.reference || eventData?.destinationAccountInformation?.accountReference;
      const amountPaid = Number(eventData.amountPaid || eventData.settlementAmount || 0);

      const { User } = require("../models");
      const user = await User.findOne({ where: { monnifyAccountReference: accountReference } });

      if (user && amountPaid > 0) {
        const wallet = await Wallet.findOne({ where: { userId: user.id } });
        wallet.balance = Number(wallet.balance) + amountPaid;
        await wallet.save();

        await Transaction.create({
          userId: user.id,
          type: "funding",
          description: "Wallet funding via Monnify bank transfer",
          amount: amountPaid,
          status: "success",
          reference: eventData.transactionReference,
          meta: JSON.stringify(eventData),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Monnify webhook error:", err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
