const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Transaction = sequelize.define("Transaction", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM("funding", "data", "otp", "refund"), allowNull: false },
  description: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false }, // positive = credit, negative = debit
  costPrice: { type: DataTypes.DECIMAL(14, 2), allowNull: true }, // what we paid upstream (ClubKonnect/5SIM)
  profit: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  status: { type: DataTypes.ENUM("pending", "success", "failed"), defaultValue: "pending" },
  reference: { type: DataTypes.STRING, allowNull: true },
  meta: { type: DataTypes.TEXT, allowNull: true }, // JSON.stringify blob for provider response
});

module.exports = Transaction;
