// db.js - robust lowdb initialization that ensures db.json exists with defaults
const fs = require('fs');
const path = require('path');

let Low, JSONFile;
try {
  // Try common export shapes for different lowdb versions/builds
  const lowdb = require('lowdb');
  // prefer explicit properties if present
  Low = lowdb.Low || lowdb.default?.Low || lowdb;
  JSONFile = lowdb.JSONFile || lowdb.default?.JSONFile;
  // try the node entry if JSONFile wasn't on the main export
  if (!JSONFile) {
    const nodeEntry = require('lowdb/node');
    JSONFile = nodeEntry.JSONFile || nodeEntry.default?.JSONFile || nodeEntry;
  }
} catch (errMain) {
  // Fallback to node entry if direct require('lowdb') didn't work as expected
  try {
    const nodeEntry = require('lowdb/node');
    JSONFile = nodeEntry.JSONFile || nodeEntry.default?.JSONFile || nodeEntry;
    Low = require('lowdb').Low || require('lowdb').default?.Low;
  } catch (err) {
    // rethrow with helpful message
    throw new Error('Failed to require lowdb. Ensure lowdb is installed. Inner errors: ' + errMain + ' / ' + err);
  }
}

// Normalize default exports if present
if (JSONFile && JSONFile.default) JSONFile = JSONFile.default;
if (Low && Low.default) Low = Low.default;

const DB_FILE = path.join(__dirname, 'db.json');
const defaultData = {
  users: [],
  donors: [],
  rescuers: [],
  listings: [],
  intasend_bookings: [],
  impact: { day: new Date().toISOString().slice(0,10), totalKg: 0, pickups: 0 }
};

function ensureDbFile() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
      console.log('Created db.json with default structure.');
      return;
    }
    // try parse and patch missing keys
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      let changed = false;
      for (const k of Object.keys(defaultData)) {
        if (parsed[k] === undefined) { parsed[k] = defaultData[k]; changed = true; }
      }
      if (changed) fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    } catch (err) {
      // malformed JSON -> back up and recreate
      fs.renameSync(DB_FILE, DB_FILE + '.bak_' + Date.now());
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
      console.log('Malformed db.json backed up and replaced with defaults.');
    }
  } catch (err) {
    console.error('Error ensuring db file:', err);
    throw err;
  }
}

ensureDbFile();

if (typeof JSONFile !== 'function') {
  throw new Error('JSONFile is not available as a constructor. Resolved JSONFile: ' + String(JSONFile));
}

// create adapter and construct Low; try passing defaultData to avoid "missing default data" for newer lowdb
const adapter = new JSONFile(DB_FILE);

let db;
try {
  db = new Low(adapter, defaultData);
} catch (err) {
  // older lowdb versions accept only one argument
  db = new Low(adapter);
}

async function init() {
  await db.read();
  db.data = db.data || defaultData;
  // ensure keys exist
  for (const k of Object.keys(defaultData)) if (db.data[k] === undefined) db.data[k] = defaultData[k];
  await db.write();
}

module.exports = { db, init };
