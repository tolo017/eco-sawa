# EcoSawa — Pitch Deck (Concise)

--- Slide 1 — Title
EcoSawa
Rescuing surplus food. Reducing hunger. Nairobi & Kiambu pilot.

--- Slide 2 — Problem
- Millions of kg of edible food wasted daily.
- Small charities and informal food networks lack real-time routing and trust tools.
- Donors lack simple, low-cost ways to share surplus and verify collection.

--- Slide 3 — Solution
- Mobile-first donor + rescuer platform.
- Real-time pickup listings with location (Leaflet).
- Claim, schedule, and confirm pickups (QR / InstaSend simulation for payment/verification).
- Offline-first demo mode for field pilots and hackathons.

--- Slide 4 — Product/demo
- Donor dashboard: create listing, generate QR token.
- Rescuer dashboard: map of pickups (Nairobi & Kiambu), claim & schedule, confirm via token.
- Simple API backend for demos; easily replaceable with DB-backed or serverless endpoints.

--- Slide 5 — How it works (architecture)
- Frontend: static site (HTML, JS, Leaflet) served over HTTP.
- Backend: Node/Express demo server providing /api endpoints (simulated listings).
- Optional persistence via lowdb; can migrate to Azure Functions + Cosmos DB or Static Web Apps.

--- Slide 6 — Impact & Metrics
- Metric examples to track:
  - kg diverted per day
  - pickups fulfilled
  - donors onboarded
  - average pickup time
- Pilot goal: divert 5,000 kg in first 3 months inside Nairobi + Kiambu.

--- Slide 7 — Business model (revenue)
- Commission-free core service for NGOs and community groups.
- Revenue channels:
  - Premium logistics features for restaurants/retailers (routing, scheduled pickups) — subscription.
  - B2B partnerships with food banks / municipalities — service contracts.
  - Transaction fee for value-added payments/insurance (InstaSend partner model).
  - Data & reporting for CSR teams (subscription or one-off reports).

--- Slide 8 — Competitors & differentiation
- Competitors: Olio, Too Good To Go, local food banks.
- Differentiators:
  - Focus on informal rescue networks + low-tech QR confirmations.
  - Localized mapping + routing for Nairobi & Kiambu.
  - Lightweight, privacy-friendly demo-first approach for grassroots organizations.

--- Slide 9 — Go-to-market
- Stage 1: Pilot with local NGOs & restaurants in Nairobi / Kiambu.
- Stage 2: Partnerships with municipal waste / food rescue programs.
- Stage 3: Expand to other Kenyan counties and regional hubs.

--- Slide 10 — Roadmap (next 6 months)
- Month 0–1: Field pilot, iterate UI for rescuer reliability.
- Month 2–3: Add persistence, auth, QR generation, backend metrics.
- Month 4–6: Integrate payment/verification partners (InstaSend pilot), onboarding partnerships, commercial trials.

--- Slide 11 — Team & ask
- Team: (add names/roles)
- Ask: Pilot partners, 10k USD for platform improvements & outreach, introductions to logistics partners.

--- Slide 12 — Contact
- Repo: (local)
- Demo: http://localhost:4000
- "EcoSawa - Iko Sawa."