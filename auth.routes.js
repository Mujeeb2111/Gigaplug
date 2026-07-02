const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Wallet } = require("../models");
const monnify = require("../services/monnify.service");
const { protect } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sanitize(user) {
  const { passwordHash, ...safe } = user.toJSON();
  return safe;
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, phone, bvn } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "fullName, email and password are required" });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ success: false, message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const role = email.toLowerCase() === (process.env.ADMIN_EMAIL || "admin@swiftverify.com").toLowerCase()
      ? "admin"
      : "user";

    const user = await User.create({ fullName, email: email.toLowerCase(), phone, passwordHash, role });
    await Wallet.create({ userId: user.id, balance: 0 });

    // Try to provision a Monnify virtual account. If Monnify isn't configured
    // yet (no keys in .env) or the call fails, don't block signup - the user
    // can still log in, and an admin can retry provisioning later.
    try {
      const account = await monnify.createReservedAccount({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        bvn,
      });
      user.monnifyAccountReference = account.accountReference;
      user.monnifyAccountNumber = account.accountNumber;
      user.monnifyBankName = account.bankName;
      user.monnifyAccountName = account.accountName;
      await user.save();
    } catch (monnifyErr) {
      console.error("Monnify account provisioning failed:", monnifyErr?.response?.data || monnifyErr.message);
    }

    const token = signToken(user);
    res.status(201).json({ success: true, token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = signToken(user);
    res.json({ success: true, token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

router.get("/me", protect, async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
});

module.exports = router;
