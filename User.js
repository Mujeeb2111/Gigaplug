const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING, allowNull: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("user", "admin"), defaultValue: "user" },

  // Monnify reserved (virtual) account details
  monnifyAccountReference: { type: DataTypes.STRING, allowNull: true },
  monnifyAccountNumber: { type: DataTypes.STRING, allowNull: true },
  monnifyBankName: { type: DataTypes.STRING, allowNull: true },
  monnifyAccountName: { type: DataTypes.STRING, allowNull: true },
});

module.exports = User;
