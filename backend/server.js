// server.js (lowdb version) - no native deps
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { nanoid } = require('nanoid');
const { db, init } = require('./db');
const QRCode = require('qrcode');
const geolib = require('geolib');
const { optimizeRoute } = require('./route-optimizer'); // keep route-optimizer.js as before

const app = express();
app.use(cors());
app.use(bodyParser.json());

async function loadDB() {
  await init();
  await db.read();
}

function urgencyColor(tag){
  if (!tag) return 'green';
  const t = tag.toLowerCase();
  if (t.includes('2hr') || t.includes('perishable')) return 'red';
  if (t.includes('24hr') || t.includes('stable')) return 'orange';
  return 'green';
}

/* Utility helpers for lowdb arrays */
function findById(collection, id) {
  return db.data[collection].find(x => x.id === id);
}

/* Start server after DB init */
loadDB().then(() => {

  /* Donors */
  app.post('/api/donors', async (req,res)=>{
    await db.read();
    const { id, name, phone } = req.body;
    const did = id || nanoid(8);
    let donor = findById('donors', did);
    if (!donor) {
      donor = { id: did, name: name || `Donor ${did}`, phone: phone || null, subscription: 'free', reputation: 5.0 };
      db.data.donors.push(donor);
    } else {
      donor.name = name || donor.name;
      donor.phone = phone || donor.phone;
    }
    await db.write();
    res.json({ ok:true, donor });
  });

  app.get('/api/donors/:id/reputation', async (req,res)=>{
    await db.read();
    const donor = findById('donors', req.params.id);
    if(!donor) return res.status(404).json({ error:'donor not found' });
    res.json({ ok:true, reputation: donor.reputation });
  });

  /* Rescuers */
  app.post('/api/rescuers', async (req,res)=>{
    await db.read();
    const { id, name, phone, location } = req.body;
    const rid = id || nanoid(8);
    let r = findById('rescuers', rid);
    if (!r) {
      r = { id: rid, name: name || `Rescuer ${rid}`, phone: phone || null, lat: location?.lat || null, lon: location?.lon || null };
      db.data.rescuers.push(r);
    } else {
      r.name = name || r.name;
      r.phone = phone || r.phone;
      if (location) { r.lat = location.lat; r.lon = location.lon; }
    }
    await db.write();
    res.json({ ok:true, rescuer: r });
  });

  /* Listings - create with QR token */
  app.post('/api/listings', async (req,res)=>{
    await db.read();
    const id = nanoid(10);
    const now = Date.now();
    const { donorId, foodType, quantityKg, category, perishabilityTag, location, timeWindow, address } = req.body;
    const color = urgencyColor(perishabilityTag);
    const qrToken = nanoid(16);
    const listing = {
      id, donorId, foodType, quantityKg, category,
      perishabilityTag, urgencyColor: color,
      lat: location?.lat || 0, lon: location?.lon || 0,
      address: address || (location?.address || ''),
      timeWindow: timeWindow || '',
      status: 'available', claimedBy: null, createdAt: now, claimedAt: null, completedAt: null, qrToken
    };
    db.data.listings.push(listing);
    await db.write();
    const qrData = await QRCode.toDataURL(JSON.stringify({ listingId: id, token: qrToken }));
    res.json({ ok:true, listing: { ...listing, qrData } });
  });

  /* Get available listings */
  app.get('/api/listings', async (req,res)=>{
    await db.read();
    const available = db.data.listings.filter(l => l.status === 'available');
    res.json({ ok:true, listings: available });
  });

  /* Claim listing */
  app.post('/api/listings/:id/claim', async (req,res)=>{
    await db.read();
    const { id } = req.params;
    const { rescuerId } = req.body;
    const listing = findById('listings', id);
    if(!listing) return res.status(404).json({ error:'Not found' });
    if(listing.status !== 'available') return res.status(400).json({ error:'Not available' });
    listing.status = 'claimed';
    listing.claimedBy = rescuerId;
    listing.claimedAt = Date.now();
    await db.write();
    res.json({ ok:true, listingId: id });
  });

  /* Confirm pickup via QR token */
  app.post('/api/listings/:id/confirm-qr', async (req,res)=>{
    await db.read();
    const { id } = req.params;
    const { rescuerId, token } = req.body;
    const listing = findById('listings', id);
    if(!listing) return res.status(404).json({ error:'Not found' });
    if(listing.claimedBy !== rescuerId) return res.status(403).json({ error:'Listing not claimed by rescuer' });
    if(listing.qrToken !== token) return res.status(400).json({ error:'Invalid QR token' });

    listing.status = 'completed';
    listing.completedAt = Date.now();

    // Update impact for today
    const day = new Date().toISOString().slice(0,10);
    if (!db.data.impact || db.data.impact.day !== day) {
      db.data.impact = { day, totalKg: listing.quantityKg || 0, pickups: 1 };
    } else {
      db.data.impact.totalKg = (db.data.impact.totalKg || 0) + (listing.quantityKg || 0);
      db.data.impact.pickups = (db.data.impact.pickups || 0) + 1;
    }

    // Update donor reputation: (successful / total) * 5
    const donorId = listing.donorId;
    const donorListings = db.data.listings.filter(l => l.donorId === donorId);
    const total = donorListings.length;
    const successful = donorListings.filter(l => l.status === 'completed').length;
    const rep = total === 0 ? 5.0 : Number(((successful/total)*5).toFixed(2));
    const donor = findById('donors', donorId);
    if (donor) donor.reputation = rep;

    await db.write();
    res.json({ ok:true, newReputation: rep });
  });

  /* Impact */
  app.get('/api/impact', async (req,res)=>{
    await db.read();
    const imp = db.data.impact || { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 };
    res.json({ ok:true, impact: { totalKg: imp.totalKg, pickupsToday: imp.pickups } });
  });

  /* Simulated IntaSend create booking */
  app.post('/api/intasend/createBooking', async (req,res)=>{
    await db.read();
    const bookingId = 'sim_' + Date.now();
    const { listingId, amountKES } = req.body;
    db.data.intasend_bookings.push({ id: bookingId, listingId, status: 'created', amountKES: amountKES || 0, createdAt: Date.now() });
    await db.write();
    res.json({ ok:true, bookingId, status: 'created', paymentUrl: `${process.env.BASE_URL}/sim-pay/${bookingId}` });
  });

  /* Simulate payment confirmation */
  app.post('/api/intasend/confirm/:bookingId', async (req,res)=>{
    await db.read();
    const { bookingId } = req.params;
    const b = db.data.intasend_bookings.find(x => x.id === bookingId);
    if (!b) return res.status(404).json({ error:'Booking not found' });
    b.status = 'paid';
    await db.write();
    res.json({ ok:true, bookingId, status:'paid' });
  });

  /* Route optimizer */
  app.post('/api/route/optimize', async (req,res)=>{
    await db.read();
    const { rescuerLocation, listingIds } = req.body;
    if(!rescuerLocation || !Array.isArray(listingIds)) return res.status(400).json({ error:'Bad payload' });
    const pts = db.data.listings.filter(l => listingIds.includes(l.id)).map(l => ({ id: l.id, lat: l.lat, lon: l.lon }));
    const route = optimizeRoute({ lat: rescuerLocation.lat, lon: rescuerLocation.lon }, pts);
    res.json({ ok:true, route });
  });

  /* Nearby rescuers */
  app.get('/api/rescuers/nearby', async (req,res)=>{
    await db.read();
    const lat = Number(req.query.lat), lon = Number(req.query.lon), radiusKm = Number(req.query.radiusKm) || 5;
    const all = db.data.rescuers.filter(r => r.lat != null);
    const nearby = all.filter(r => {
      const d = geolib.getDistance({latitude: lat, longitude: lon}, {latitude: r.lat, longitude: r.lon});
      return d <= radiusKm * 1000;
    });
    res.json({ ok:true, rescuers: nearby });
  });

  /* Debug listing all */
  app.get('/api/listings/all', async (req,res)=>{
    await db.read();
    res.json({ ok:true, listings: db.data.listings });
  });

  const port = process.env.PORT || 4000;
  app.listen(port, ()=> console.log(`EcoSawa backend (lowdb) running on ${port}`));
}).catch(err => {
  console.error('DB init error', err);
});
