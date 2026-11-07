# Support-SLA-Escalations (SupportSLA Board)

Support teams may miss response targets because tickets are not prioritised by due time. SupportSLA is a real-time ticket tracker with configurable response targets, SLA countdowns, warning thresholds, and automatic escalation status.

## Features
- Real-time countdown, warning, and breach flags for every support ticket, sorted by nearest deadline.
- Configurable SLA policies and target response times.
- Express API backend with MongoDB Atlas persistence and health checking.
- Responsive React + Vite + Tailwind dashboard with dark/light mode.

## Setup & Local Development
1. Configure environment:
   ```bash
   cp server/.env.example server/.env
   ```
2. Set your MongoDB URI in `server/.env`:
   ```bash
   MONGODB_URI=your_mongodb_connection_string
   ```
   *(Note: Without `MONGODB_URI`, the backend still starts with `/api/health` reporting `db: "disconnected"` without crashing).*
3. Backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```
4. Frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
5. Pages:
   - `/` - Tickets dashboard + countdowns
   - `/settings` - SLA targets and rule builder
