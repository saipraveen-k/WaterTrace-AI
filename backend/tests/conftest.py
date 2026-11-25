"""
Pytest configuration — set dummy environment variables so config loads
without a real .env file. These are only used for offline unit tests
that do not require Supabase connectivity.
"""

import os

# Set dummy env vars before any app module is imported
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-32-chars-minimum!!")
os.environ.setdefault("ANTHROPIC_API_KEY", "")
os.environ.setdefault("ALLOWED_ORIGINS", '["http://localhost:3000"]')
