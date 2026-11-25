-- WaterTrace AI — Seed: Create demo admin user profile
-- Run AFTER creating a user via Supabase Auth dashboard or the app.
-- Replace the UUID with the actual auth.users ID of your admin user.

-- Example: promote a user to admin role
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'your-user-uuid-here';

-- To verify PostGIS is enabled:
SELECT PostGIS_Version();

-- To verify the schema:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
