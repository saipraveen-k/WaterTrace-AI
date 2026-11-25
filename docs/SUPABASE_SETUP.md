# WaterTrace AI — Supabase Setup Guide

## Step 1: Create account and project

1. Go to https://supabase.com and create a free account
2. Click **New Project**
3. Set project name: `watertrace-ai`
4. Set a strong database password (save this)
5. Choose your region (closest to users)
6. Wait for the project to provision (~2 minutes)

## Step 2: Enable PostGIS

1. Go to **Database** → **Extensions**
2. Search for `postgis`
3. Enable it

Verify in the SQL editor:
```sql
SELECT PostGIS_Version();
```

## Step 3: Run migrations

Go to **SQL Editor** and run each migration in order:

1. Run contents of `supabase/migrations/001_initial_schema.sql`
2. Run contents of `supabase/migrations/002_rls_policies.sql`

Verify tables were created:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- area_subscriptions
- incident_events
- incident_reports
- incidents
- notifications
- profiles
- report_evidence
- reports

## Step 4: Create Storage bucket

1. Go to **Storage** → **New bucket**
2. Name: `report-evidence`
3. Set to **Private** (not public)
4. Enable RLS on the bucket

## Step 5: Configure Authentication

1. Go to **Authentication** → **Settings**
2. Set Site URL to your frontend URL (e.g., `https://your-app.vercel.app`)
3. Add redirect URLs for your domains
4. Email confirmation can be disabled for hackathon demo

## Step 6: Get your credentials

Go to **Settings** → **API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`
- `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — backend only)
- `JWT Secret` (under Settings → API → JWT Settings) → `SUPABASE_JWT_SECRET`

## Step 7: Create admin user

1. Register via the app at `/auth/register`
2. In Supabase SQL Editor, promote to admin:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-admin@email.com'
);
```

## Verifying RLS policies

Test that citizens cannot read other users' reports:
```sql
-- As authenticated user (use your JWT token)
-- Citizens should only see their own reports
SELECT * FROM reports; -- Should only return own reports
```

## Troubleshooting

**PostGIS geography queries failing:**
Ensure the `postgis` extension is enabled and the `geography` type is in `extensions` schema.

**Auth trigger not creating profiles:**
Check if the `on_auth_user_created` trigger exists:
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'auth';
```

**RLS blocking everything:**
Check policies are attached:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```
