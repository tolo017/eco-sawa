const { init, db: dbRef } = require('./db');
const { init, db: dbRef } = require('./db');

(async () => {
  try {
    // pass the default data into init
    await init(defaultData);

    // after init, require DB reference from the exported module
    const { db } = require('./db');

    console.log('Seeding started...');
    // ... your seeding logic that uses `db` ...
    // example:
    // db.data.users.push({ id: 1, name: 'Admin' });
    // await db.write();

    console.log('Seeding completed.');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
})();
// default structure used when creating db.json
// const defaultData = { ... } // Removed duplicate declaration
// Modified db.js to export init function that accepts defaultData
const { Low, JSONFile } = require('lowdb');
const path = require('path');

let db;

// initialize DB, require caller to provide defaultData to avoid lowdb error
async function init(defaultData = {}) {
    const adapter = new JSONFile(DB_FILE);
    // pass defaultData into Low constructor
    db = new Low(adapter, defaultData);
    await db.read();
    db.data ||= defaultData;
    await db.write();
}

module.exports = { db, init };
(async () => {
  try {
    // pass the default data into init
    await init(defaultData);

    // after init, require DB reference from the exported module
    const { db } = require('./db');

    console.log('Seeding started...');
    // ... your seeding logic that uses `db` ...
    // example:
    // db.data.users.push({ id: 1, name: 'Admin' });
    // await db.write();

    console.log('Seeding completed.');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
})();// seed.js - robust seeding that ensures db.json exists with defaults before using lowdb
// Usage: node seed.js
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');
const defaultData = {
  users: [],
  donors: [],
  rescuers: [],
  listings: [],
  intasend_bookings: [],
  impact: { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 }
};

// Ensure file exists and is valid JSON with default structure
function ensureDbFile() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), { encoding: 'utf8' });
      console.log('Created new db.json with default structure.');
      return;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    try {
      const parsed = JSON.parse(raw || '{}');
      // ensure required keys exist
      let changed = false;
      for (const k of Object.keys(defaultData)) {
        if (parsed[k] === undefined) { parsed[k] = defaultData[k]; changed = true; }
      }
      if (changed) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), { encoding: 'utf8' });
        console.log('Patched db.json with missing default keys.');
      }
    } catch (err) {
      // malformed JSON — back it up and write fresh
      fs.renameSync(DB_FILE, DB_FILE + '.bak_' + Date.now());
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), { encoding: 'utf8' });
      console.log('Malformed db.json backed up and replaced with default structure.');
    }
  } catch (err) {
    console.error('Failed to ensure db.json:', err);
    process.exit(1);
  }
}

(async () => {
  try {
    ensureDbFile();

    // Now require lowdb-backed db module (which expects db.json present)
    const { db, init } = require('./db');
    const { nanoid } = require('nanoid');
    const bcrypt = require('bcryptjs');

    await init();           // lowdb init will read existing db.json
    await db.read();

    db.data = db.data || {};

    db.data.users = db.data.users || [];
    db.data.donors = db.data.donors || [];
    db.data.rescuers = db.data.rescuers || [];
    db.data.listings = db.data.listings || [];
    db.data.intasend_bookings = db.data.intasend_bookings || [];
    db.data.impact = db.data.impact || { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 };

    function makeUser(email, name, role, pwd) {
      if (db.data.users.find(u => u.email === email)) return;
      const id = 'user_' + nanoid(8);
      const hash = bcrypt.hashSync(pwd || 'password', 8);
      db.data.users.push({ id, name, email, password: hash, role });
      console.log('Created user', email, 'id', id);
    }

    makeUser('donor@example.com', 'Demo Donor', 'donor', 'password');
    makeUser('rescuer@example.com', 'Demo Rescuer', 'rescuer', 'password');

    if (!db.data.donors.find(d => d.id === 'donor_demo')) {
      db.data.donors.push({ id: 'donor_demo', name: 'Demo Donor', phone: '+254700000001', subscription: 'free', reputation: 4.8 });
      console.log('Created donor_demo');
    }

    if (!db.data.rescuers.find(r => r.id === 'rescuer_demo')) {
      const rescuerUser = db.data.users.find(u => u.email === 'rescuer@example.com');
      db.data.rescuers.push({
        id: 'rescuer_demo',
        userId: rescuerUser ? rescuerUser.id : null,
        name: 'Demo Rescuer',
        phone: '+254700000002',
        lat: -1.28333,
        lon: 36.81667,
        pushSubscriptions: []
      });
      console.log('Created rescuer_demo');
    }

    if ((db.data.listings || []).length === 0) {
      const samples = [
        { foodType: 'Fresh Mangoes', lat: -1.2146, lon: 36.8810, perish: 'Perishable - 2hrs', addr: 'Kilimani, Nairobi', qtyKg: 12 },
        { foodType: 'Cooked Chapati', lat: -1.2921, lon: 36.8219, perish: 'Perishable - 2hrs', addr: 'CBD, Nairobi', qtyKg: 15 },
        { foodType: 'Rice Bags', lat: -1.1000, lon: 36.7600, perish: 'Non-Perishable', addr: 'Kiambu Town', qtyKg: 40 },
        { foodType: 'Vegetables', lat: -1.2200, lon: 36.9000, perish: 'Stable - 24hrs', addr: 'Westlands', qtyKg: 10 }
      ];
      for (const s of samples) {
        const id = 'listing_' + nanoid(8);
        db.data.listings.push({
          id,
          donorId: 'donor_demo',
          foodType: s.foodType,
          quantityKg: s.qtyKg,
          category: 'Produce',
          perishabilityTag: s.perish,
          urgencyColor: s.perish.toLowerCase().includes('2hr') ? 'red' : (s.perish.toLowerCase().includes('24hr') ? 'orange' : 'green'),
          lat: s.lat,
          lon: s.lon,
          address: s.addr,
          timeWindow: '',
          status: 'available',
          claimedBy: null,
          createdAt: Date.now(),
          claimedAt: null,
          completedAt: null,
          qrToken: nanoid(16)
        });
      }
      console.log('Seeded sample listings:', samples.length);
    } else {
      console.log('Listings already exist, skipping listing seeding.');
    }

    await db.write();
    console.log('Seeding complete. Demo credentials: donor@example.com / password  and rescuer@example.com / password');
    process.exit(0);

  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
})();
