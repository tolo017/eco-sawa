# eco-sawa
A food rescuer application.

EcoSawa — MVP

Prereqs:
- Node 18+
- npx serve (optional) to serve frontend

Setup:
1. cd backend
2. npm install
3. cp .env.example .env (edit if needed)
4. npm run migrate
5. npm start

Serve frontend:
- cd frontend
- npx serve .   (or use any static server)
- Open http://localhost:5000 (or provided port) and use pages:
  - index.html (homepage/impact)
  - donor.html (create listings; shows QR)
  - rescuer.html (register, map interactions, claim, confirm with QR)

Notes:
- IntaSend is simulated. Create booking via POST /api/intasend/createBooking; confirm with POST /api/intasend/confirm/:bookingId
- Database file: backend/database.sqlite

