# WaterTrace AI

> "One report is a complaint. A hundred connected reports may reveal an infrastructure failure."

WaterTrace AI is a full-stack water infrastructure intelligence platform that transforms independent citizen water issue reports into explainable candidate incidents using spatial-temporal AI correlation.

---

## What It Does

Citizens report water problems (no supply, leakage, discolouration, etc.) with their approximate location and time. The intelligence engine analyzes reports across geographic proximity, time windows, symptom compatibility and independent reporting sources to detect possible shared infrastructure incidents. Maintenance teams can investigate, update and resolve these candidate incidents with a full audit trail.

**Important:** WaterTrace AI is a decision-support tool. Detected incidents are candidate findings, not confirmed infrastructure failures. All findings require investigation by qualified maintenance personnel.

---

## Architecture

```
watertrace-ai/
├── frontend/          # Next.js 16, TypeScript, Tailwind CSS
├── backend/           # Python, FastAPI, intelligence engine
├── supabase/
│   └── migrations/    # PostgreSQL + PostGIS schema migrations
├── data/
│   └── demo_scenarios/ # Synthetic demo data seeder
├── docker-compose.yml
└── .env.example
```

**Stack:**
- Frontend: Next.js 16, TypeScript, Tailwind CSS, Leaflet/OpenStreetMap
- Backend: Python, FastAPI, scikit-learn (DBSCAN), Pandas, Shapely
- Database: Supabase PostgreSQL + PostGIS, Row Level Security
- Auth: Supabase Auth (email + password)
- Storage: Supabase Storage
- AI: Anthropic Claude (classification + explanation) with deterministic fallback
- Deployment: Vercel (frontend) + Render (backend) + Supabase (managed)

---

## Intelligence Engine

The spatial-temporal clustering pipeline:

1. **Geographic filtering** — PostGIS ST_DWithin candidate selection
2. **Temporal filtering** — configurable time window (default: 120 min)
3. **Category compatibility** — symptom similarity matrix
4. **DBSCAN clustering** — normalized spatial-temporal feature space
5. **Evidence confidence** — transparent formula: reporter independence + geographic concentration + temporal concentration + category compatibility
6. **Investigation priority** — symptom severity + reporters + recency
7. **Explanation generation** — human-readable, data-driven rationale

**Key design decisions:**
- Multiple reports from one user do NOT count as independent confirmations
- Original reports are preserved if a cluster is later rejected
- All confidence and priority scores are labelled as prototype parameters

---

## Quick Start

### Prerequisites
- Docker and docker-compose
- Node.js 20+
- Python 3.11+
- Supabase account (free tier works)

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials and API keys
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Enable PostGIS: Dashboard → Database → Extensions → Enable `postgis`
3. Run migrations in order:

```sql
-- In Supabase SQL Editor, run these files:
-- supabase/migrations/001_initial_schema.sql
-- supabase/migrations/002_rls_policies.sql
```

4. Create Storage bucket named `report-evidence` (private)
5. Copy your project URL, anon key, service role key and JWT secret to `.env`

### 3. Start with Docker

```bash
docker-compose up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs

### 4. Seed demo data

```bash
cd data/demo_scenarios
pip install supabase python-dotenv
python seed_demo.py
```

### 5. Run intelligence analysis

After seeding, trigger clustering via the Admin dashboard or:
```bash
curl -X POST http://localhost:8000/api/v1/incidents/analyze \
  -H "Authorization: Bearer <admin-token>"
```

---

## Deployment

### Frontend — Vercel

```bash
cd frontend
vercel --prod
```

Environment variables to set in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BACKEND_URL
```

### Backend — Render

1. Create a new Web Service on Render
2. Connect this repository, set root to `/backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set all environment variables from `.env.example`

---

## API Reference

Full OpenAPI documentation: `GET /docs`

Key endpoints:
```
POST   /api/v1/reports              Submit a water report
GET    /api/v1/reports              List reports
GET    /api/v1/incidents            List incidents (public)
GET    /api/v1/incidents/map        Lightweight map data
POST   /api/v1/incidents/analyze    Trigger clustering (admin)
PATCH  /api/v1/incidents/{id}/status Update status (admin)
GET    /api/v1/dashboard/summary    Operations summary
GET    /api/v1/analytics/categories Reports by category
GET    /api/v1/analytics/trends     Daily trends
```

---

## Security

- Supabase Auth with secure SSR cookie sessions
- Row Level Security on all tables (citizens see only their own data)
- JWT verification on every FastAPI endpoint
- Service-role key never exposed to browser
- Approximate location storage (not exact home addresses)
- File upload validation (MIME type, size limits)
- Rate limiting recommended for production

---

## Demo Data Scenarios

| Scenario | Location | Reports | Users | Expected Result |
|---|---|---|---|---|
| Supply disruption | Banjara Hills | 22 | 7 | Should cluster → incident |
| Pipeline leakage | Jubilee Hills | 18 | 6 | Should cluster → incident |
| Discoloured water | Madhapur | 15 | 5 | Should cluster → incident |
| Isolated reports | City-wide | 10 | 8 | Should NOT cluster |
| Same-user duplicates | Same location | 5 | 1 | Should NOT = independent |
| Old reports | Banjara Hills | 5 | 5 | Should NOT cluster with fresh |

---

## Known Limitations

- Clustering parameters (radius, time window) are prototype defaults and require tuning with real data
- Evidence confidence and priority formulas are initial heuristics, not validated against real infrastructure data
- No email/SMS notifications (in-app only)
- No real-time WebSocket updates (page refresh required)
- Telugu localization not yet implemented (UI is ready for i18n)
- Photo upload endpoint defined but file validation UI is a future enhancement

---

## Responsible AI Disclaimer

WaterTrace AI analyzes self-reported citizen observations. It does not:
- Confirm water contamination or safety issues
- Replace professional infrastructure engineering assessment
- Guarantee accuracy of spatial-temporal correlations

All candidate incidents must be investigated by qualified personnel before any action is taken.
