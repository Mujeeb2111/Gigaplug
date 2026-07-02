require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const { sequelize } = require("./models");

const authRoutes = require("./routes/auth.routes");
const walletRoutes = require("./routes/wallet.routes");
const dataRoutes = require("./routes/data.routes");
const otpRoutes = require("./routes/otp.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*", credentials: true }));

// The Monnify webhook needs the *raw* body to verify the HMAC signature,
// so it must be mounted BEFORE the global express.json() parser.
app.use("/api/wallet/webhook/monnify", express.raw({ type: "application/json" }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use("/api/", limiter);

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ success: true, service: "gigaplug-backend", time: new Date() }));

// Serve the frontend build (optional - see /public/index.html)
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // creates tables if they don't exist yet
    console.log("Database connected and synced.");

    app.listen(PORT, () => console.log(`Gigaplug backend running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
