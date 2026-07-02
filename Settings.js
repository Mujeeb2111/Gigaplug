const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Single-row table holding platform-wide pricing rules that admins can edit.
const Settings = sequelize.define("Settings", {
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
  dataMarkup: { type: DataTypes.DECIMAL(10, 2), defaultValue: 20 }, // flat ₦ added to every ClubKonnect data plan
  otpMarginType: { type: DataTypes.ENUM("flat", "percent"), defaultValue: "flat" },
  otpMarginValue: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1500 }, // flat ₦ or % added to 5SIM cost
});

async function getSettings() {
  const [settings] = await Settings.findOrCreate({ where: { id: 1 }, defaults: {} });
  return settings;
}

module.exports = { Settings, getSettings };
