// seed.js - seeds demo users, donors, rescuers, listings
// Usage: node seed.js

const fs = require('fs');
const path = require('path');
const { db, init } = require('./db');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');

async function run() {
  await init();
  await db.read();

  // create demo users
  db.data.users = db.data.users || [];
  const makeUser = (email, name, role, pwd) => {
    if (db.data.users.find(u => u.email === email)) return;
    const id = 'user_' + nanoid(8);
    const hash = bcrypt.hashSync(pwd || 'password', 8);
    db.data.users.push({ id, name, email, password: hash, role });
    console.log('Created user', email, 'id', id);
  };

  makeUser('donor@example.com', 'Demo Donor', 'donor', 'password');
  makeUser('rescuer@example.com', 'Demo Rescuer', 'rescuer', 'password');

  // donors/rescuers records
  db.data.donors = db.data.donors || [];
  db.data.rescuers = db.data.rescuers || [];

  if (!db.data.donors.find(d => d.id === 'donor_demo')) {
    db.data.donors.push({ id: 'donor_demo', name: 'Demo Donor', phone: '+254700000001', subscription: 'free', reputation: 4.8 });
  }

  if (!db.data.rescuers.find(r => r.id === 'rescuer_demo')) {
    db.data.rescuers.push({
      id: 'rescuer_demo',
      userId: db.data.users.find(u => u.email === 'rescuer@example.com')?.id || null,
      name: 'Demo Rescuer',
      phone: '+254700000002',
      lat: -1.28333,
      lon: 36.81667,
      pushSubscriptions: []
    });
  }

  // sample listings (Nairobi + Kiambu)
  db.data.listings = db.data.listings || [];
  if ((db.data.listings || []).length === 0) {
    const samples = [
      { foodType: 'Fresh Mangoes', qty: 12, lat: -1.2146, lon: 36.8810, perish: 'Perishable - 2hrs', addr: 'Kilimani, Nairobi', qtyKg: 12 },
      { foodType: 'Cooked Chapati', qty: 20, lat: -1.2921, lon: 36.8219, perish: 'Perishable - 2hrs', addr: 'CBD, Nairobi', qtyKg: 15 },
      { foodType: 'Rice Bags', qty: 5, lat: -1.1000, lon: 36.7600, perish: 'Non-Perishable', addr: 'Kiambu Town', qtyKg: 40 },
      { foodType: 'Vegetables', qty: 8, lat: -1.2200, lon: 36.9000, perish: 'Stable - 24hrs', addr: 'Westlands', qtyKg: 10 }
    ];
    samples.forEach(s => {
      const id = 'listing_' + nanoid(8);
      db.data.listings.push({
        id,
        donorId: 'donor_demo',
        foodType: s.foodType,
        quantityKg: s.qtyKg || s.qty,
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
    });
    console.log('Seeded sample listings:', samples.length);
  } else {
    console.log('Listings already exist, skipping listing seeding.');
  }

  await db.write();
  console.log('Seeding complete. Demo credentials: donor@example.com / password  and rescuer@example.com / password');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
