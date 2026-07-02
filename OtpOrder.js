const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OtpOrder = sequelize.define("OtpOrder", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  fivesimOrderId: { type: DataTypes.STRING, allowNull: false },
  country: { type: DataTypes.STRING, allowNull: false },
  operator: { type: DataTypes.STRING, allowNull: false },
  product: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  costPrice: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  sellPrice: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: "PENDING" }, // mirrors 5sim status
  smsCode: { type: DataTypes.STRING, allowNull: true },
  smsText: { type: DataTypes.TEXT, allowNull: true },
});

module.exports = OtpOrder;
