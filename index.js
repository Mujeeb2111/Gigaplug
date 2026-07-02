const sequelize = require("../config/db");
const User = require("./User");
const Wallet = require("./Wallet");
const Transaction = require("./Transaction");
const OtpOrder = require("./OtpOrder");
const { Settings } = require("./Settings");

User.hasOne(Wallet, { foreignKey: "userId" });
Wallet.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Transaction, { foreignKey: "userId" });
Transaction.belongsTo(User, { foreignKey: "userId" });

User.hasMany(OtpOrder, { foreignKey: "userId" });
OtpOrder.belongsTo(User, { foreignKey: "userId" });

module.exports = { sequelize, User, Wallet, Transaction, OtpOrder, Settings };
