# EcoSawa — Hackathon demo

Summary
- EcoSawa connects donors (surplus food) with local rescuers to reduce food waste and fight hunger.
- This repo contains a lightweight frontend (donor + rescuer) and a simple Node/Express backend that serves simulated listings for demos.

Quick start (Windows PowerShell)
1. Open backend folder and install deps
   cd "C:\Users\PCMan\OneDrive\Documents\eco-sawa-1\backend"
   npm init -y
   npm install express

2. Start the demo server
   node simple-server.js

3. Open pages in your browser (must use http:// to allow API requests)
   - Rescuer dashboard: http://localhost:4000/rescuer.html
   - Donor dashboard: http://localhost:4000/donor.html
   - Index: http://localhost:4000/index.html

What the server provides
- Serves frontend static files from ../frontend
- /api/listings — simulated available pickups (Nairobi + Kiambu)
- /api/listings/all — all listings (for rescuer)
- /api/listings (POST) — create donor listing (returns QR token)
- /api/listings/:id/claim (POST) — claim a listing
- /api/listings/:id/confirm-qr (POST) — confirm pickup using token

Notes & troubleshooting
- If rescuer.html appears unavailable, make sure you opened http://localhost:4000/rescuer.html (not file://). The frontend expects the API to be served over HTTP.
- If ports already in use, change PORT env var before starting server:
  $env:PORT=5000; node simple-server.js
- For persistence or production, integrate with lowdb or another DB and enable CORS/HTTPS.

Next steps (suggested)
- Persist listings to lowdb (backend/db.js) to keep data across restarts.
- Add basic auth (JWT) to simulate real rescuer/donor flows.
- Add QR code generation (donor) and scanning (rescuer) UI.
- Deploy as an Azure Static Web App + Azure Functions for serverless API (I can prepare a deployment plan if you'd like).

License: MIT
