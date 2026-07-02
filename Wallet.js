const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Wallet = sequelize.define("Wallet", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  balance: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
});

module.exports = Wallet;
