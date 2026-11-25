-- ============================================================
-- WaterTrace AI — Migration 001: Initial Schema
-- ============================================================

-- Enable PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with application-level data
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT,
    phone_number    TEXT,
    role            TEXT NOT NULL DEFAULT 'citizen'
                        CHECK (role IN ('citizen', 'maintenance', 'admin')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- Individual citizen water issue reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    issue_category          TEXT NOT NULL CHECK (issue_category IN (
                                'NO_SUPPLY', 'LOW_PRESSURE', 'LEAKAGE',
                                'DISCOLOURED_WATER', 'UNUSUAL_SMELL',
                                'INTERMITTENT_SUPPLY', 'INFRASTRUCTURE_DAMAGE', 'OTHER'
                            )),
    description             TEXT NOT NULL,
    location                GEOGRAPHY(POINT, 4326) NOT NULL,
    location_description    TEXT,
    occurrence_time         TIMESTAMPTZ NOT NULL,
    submitted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- AI classification output
    ai_category             TEXT,
    ai_confidence           NUMERIC(4,3),
    ai_symptoms             JSONB DEFAULT '[]',
    ai_explanation          TEXT,

    -- User confirmed/corrected classification
    confirmed_category      TEXT,
    user_confirmed          BOOLEAN NOT NULL DEFAULT false,

    -- Processing
    processing_status       TEXT NOT NULL DEFAULT 'PENDING'
                                CHECK (processing_status IN (
                                    'PENDING', 'CLASSIFIED', 'CLUSTERED',
                                    'INCIDENT_LINKED', 'REJECTED', 'DUPLICATE'
                                )),
    is_demo                 BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geographic index for spatial queries
CREATE INDEX IF NOT EXISTS reports_location_idx
    ON public.reports USING GIST (location);

CREATE INDEX IF NOT EXISTS reports_user_id_idx
    ON public.reports (user_id);

CREATE INDEX IF NOT EXISTS reports_occurrence_time_idx
    ON public.reports (occurrence_time DESC);

CREATE INDEX IF NOT EXISTS reports_processing_status_idx
    ON public.reports (processing_status);

-- ============================================================
-- REPORT EVIDENCE
-- Photos uploaded to Supabase Storage
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_evidence (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id       UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    storage_path    TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    file_size_bytes BIGINT,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_evidence_report_id_idx
    ON public.report_evidence (report_id);

-- ============================================================
-- INCIDENTS
-- Candidate incidents detected by the intelligence engine
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                   TEXT NOT NULL,
    center_location         GEOGRAPHY(POINT, 4326),
    affected_radius_meters  NUMERIC,
    primary_categories      TEXT[] NOT NULL DEFAULT '{}',
    independent_reporter_count INTEGER NOT NULL DEFAULT 0,
    total_report_count      INTEGER NOT NULL DEFAULT 0,
    detection_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence_confidence     NUMERIC(4,3) NOT NULL DEFAULT 0,
    investigation_priority  NUMERIC(4,3) NOT NULL DEFAULT 0,
    explanation             TEXT,
    status                  TEXT NOT NULL DEFAULT 'DETECTED'
                                CHECK (status IN (
                                    'DETECTED', 'NEEDS_REVIEW', 'UNDER_INVESTIGATION',
                                    'ACTION_INITIATED', 'RESOLVED', 'REOPENED', 'REJECTED'
                                )),
    assigned_to             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_notes        TEXT,
    is_demo                 BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incidents_center_location_idx
    ON public.incidents USING GIST (center_location);

CREATE INDEX IF NOT EXISTS incidents_status_idx
    ON public.incidents (status);

CREATE INDEX IF NOT EXISTS incidents_detection_time_idx
    ON public.incidents (detection_time DESC);

-- ============================================================
-- INCIDENT_REPORTS
-- Junction table linking incidents to contributing reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, report_id)
);

CREATE INDEX IF NOT EXISTS incident_reports_incident_id_idx
    ON public.incident_reports (incident_id);

CREATE INDEX IF NOT EXISTS incident_reports_report_id_idx
    ON public.incident_reports (report_id);

-- ============================================================
-- INCIDENT_EVENTS
-- Immutable audit log for incident lifecycle changes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type      TEXT NOT NULL,
    from_status     TEXT,
    to_status       TEXT,
    notes           TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incident_events_incident_id_idx
    ON public.incident_events (incident_id);

-- ============================================================
-- AREA_SUBSCRIPTIONS
-- Citizens following specific geographic areas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.area_subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    area_name       TEXT NOT NULL,
    center_location GEOGRAPHY(POINT, 4326) NOT NULL,
    radius_meters   NUMERIC NOT NULL DEFAULT 2000,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, area_name)
);

CREATE INDEX IF NOT EXISTS area_subscriptions_user_id_idx
    ON public.area_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS area_subscriptions_location_idx
    ON public.area_subscriptions USING GIST (center_location);

-- ============================================================
-- NOTIFICATIONS
-- In-app notifications for users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    incident_id     UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    report_id       UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
    ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS notifications_is_read_idx
    ON public.notifications (user_id, is_read);

-- ============================================================
-- TRIGGERS: auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER incidents_updated_at
    BEFORE UPDATE ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile on new Supabase Auth user
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'citizen')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
