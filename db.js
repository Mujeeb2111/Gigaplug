const { Sequelize } = require("sequelize");
const path = require("path");
const fs = require("fs");

const sqlitePath = process.env.SQLITE_PATH || "./data/gigaplug.sqlite";
const dir = path.dirname(sqlitePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Using SQLite through Sequelize so the project runs with zero external
// database setup. If you'd rather use MongoDB, swap this file + models
// for a mongoose connection - the routes/controllers don't care which
// ORM is underneath as long as the same functions are exported.
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: sqlitePath,
  logging: false,
});

module.exports = sequelize;
