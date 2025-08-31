// db.js - lowdb JSON persistence (pure JS, no native builds)
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// initialize default data (call init once)
async function init() {
  await db.read();
  db.data = db.data || { donors: [], rescuers: [], listings: [], intasend_bookings: [], impact: { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 } };
  // ensure impact day exists
  if (!db.data.impact) db.data.impact = { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 };
  await db.write();
}

module.exports = { db, init };
