# WaterTrace AI — Deployment Guide

## Prerequisites

- Supabase project configured (see SUPABASE_SETUP.md)
- Vercel account (free tier works)
- Render account (free tier works)
- Anthropic API key (optional — deterministic fallback works without it)

---

## 1. Deploy Backend to Render

### Create the service

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repository (push your code first)
3. Set Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Plan: Free (or Starter for persistent runtime)

### Set environment variables in Render

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=your-anthropic-key
ALLOWED_ORIGINS=https://your-app.vercel.app
ENVIRONMENT=production
CLUSTER_RADIUS_METERS=800
CLUSTER_TIME_WINDOW_MINUTES=120
CLUSTER_MIN_REPORTS=2
```

### Note your backend URL
After deployment: `https://your-service-name.onrender.com`

---

## 2. Deploy Frontend to Vercel

### Via Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel --prod
```

### Via Vercel Dashboard

1. Go to https://vercel.com → New Project
2. Import your GitHub repository
3. Set Root Directory: `frontend`
4. Framework: Next.js (auto-detected)

### Set environment variables in Vercel

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=https://your-service-name.onrender.com
```

---

## 3. Update CORS in backend

After getting your Vercel URL, update `ALLOWED_ORIGINS` in Render:
```
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

---

## 4. Verify deployment

### Backend health check
```
GET https://your-service-name.onrender.com/health
```
Expected: `{"status": "healthy", "service": "watertrace-ai-backend"}`

### API documentation
```
GET https://your-service-name.onrender.com/docs
```

### Frontend
Visit your Vercel URL — you should see the WaterTrace AI landing page.

---

## 5. Seed demo data

```bash
cd data/demo_scenarios
pip install supabase python-dotenv

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

python seed_demo.py
```

---

## 6. Run intelligence analysis

After seeding, log in as admin and click "Run AI Analysis" in the Admin Dashboard,
or call the API directly:

```bash
curl -X POST https://your-backend.onrender.com/api/v1/incidents/analyze \
  -H "Authorization: Bearer <your-admin-jwt-token>"
```

---

## Local development with Docker

```bash
cp .env.example .env
# Fill in your Supabase credentials

docker-compose up --build
```

Frontend: http://localhost:3000
Backend: http://localhost:8000
API Docs: http://localhost:8000/docs

---

## Important notes

- The Render free tier spins down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds.
- Upgrade to Render Starter ($7/mo) for persistent service in production.
- Never commit `.env` or `.env.local` files to version control.
- The `SUPABASE_SERVICE_ROLE_KEY` must only ever be used in backend environment variables. Never expose it in the browser.
