// db.js - lowdb JSON persistence
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function init() {
  await db.read();
  db.data = db.data || {
    users: [],
    donors: [],
    rescuers: [],
    listings: [],
    intasend_bookings: [],
    impact: { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 }
  };

  await db.write();  // Ensure this updates the JSON file with the default structure if it was missing.
}

module.exports = { db, init };
