// db.js - singleton sqlite connection
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
module.exports = db;
