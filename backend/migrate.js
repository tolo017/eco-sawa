// migrate.js - run once: node migrate.js
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS donors (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  subscription TEXT DEFAULT 'free',
  reputation REAL DEFAULT 5.0
);

CREATE TABLE IF NOT EXISTS rescuers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  lat REAL,
  lon REAL
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  donorId TEXT,
  foodType TEXT,
  quantityKg REAL,
  category TEXT,
  perishabilityTag TEXT,
  urgencyColor TEXT,
  lat REAL,
  lon REAL,
  address TEXT,
  timeWindow TEXT,
  status TEXT DEFAULT 'available',
  claimedBy TEXT,
  createdAt INTEGER,
  claimedAt INTEGER,
  completedAt INTEGER,
  qrToken TEXT,
  FOREIGN KEY(donorId) REFERENCES donors(id),
  FOREIGN KEY(claimedBy) REFERENCES rescuers(id)
);

CREATE TABLE IF NOT EXISTS intasend_bookings (
  id TEXT PRIMARY KEY,
  listingId TEXT,
  status TEXT,
  amountKES REAL,
  createdAt INTEGER,
  FOREIGN KEY(listingId) REFERENCES listings(id)
);

CREATE TABLE IF NOT EXISTS impact (
  day TEXT PRIMARY KEY,
  totalKg REAL,
  pickups INTEGER
);

INSERT OR IGNORE INTO impact(day, totalKg, pickups) VALUES (date('now'), 0, 0);
`);

console.log('Migration done.');
db.close();
