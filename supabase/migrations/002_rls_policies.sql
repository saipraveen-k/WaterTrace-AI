-- ============================================================
-- WaterTrace AI — Migration 002: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: get the role of the current authenticated user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES policies
-- ============================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin"
    ON public.profiles FOR SELECT
    USING (public.get_my_role() IN ('admin', 'maintenance'));

-- Users can update their own profile (non-role fields)
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Admins can update any profile including role
CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    USING (public.get_my_role() = 'admin');

-- ============================================================
-- REPORTS policies
-- ============================================================

-- Citizens can create reports
CREATE POLICY "reports_insert_authenticated"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Citizens can read their own reports
CREATE POLICY "reports_select_own"
    ON public.reports FOR SELECT
    USING (user_id = auth.uid());

-- Maintenance and admin can read all reports
CREATE POLICY "reports_select_staff"
    ON public.reports FOR SELECT
    USING (public.get_my_role() IN ('admin', 'maintenance'));

-- Citizens can update their own pending reports (description, category correction)
CREATE POLICY "reports_update_own_pending"
    ON public.reports FOR UPDATE
    USING (user_id = auth.uid() AND processing_status = 'PENDING')
    WITH CHECK (user_id = auth.uid());

-- Maintenance/admin can update any report
CREATE POLICY "reports_update_staff"
    ON public.reports FOR UPDATE
    USING (public.get_my_role() IN ('admin', 'maintenance'));

-- ============================================================
-- REPORT_EVIDENCE policies
-- ============================================================

-- Users can upload evidence to their own reports
CREATE POLICY "evidence_insert_own"
    ON public.report_evidence FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reports
            WHERE id = report_id AND user_id = auth.uid()
        )
    );

-- Users can read evidence for their own reports
CREATE POLICY "evidence_select_own"
    ON public.report_evidence FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports
            WHERE id = report_id AND user_id = auth.uid()
        )
    );

-- Staff can read all evidence
CREATE POLICY "evidence_select_staff"
    ON public.report_evidence FOR SELECT
    USING (public.get_my_role() IN ('admin', 'maintenance'));

-- ============================================================
-- INCIDENTS policies
-- ============================================================

-- All authenticated users can read non-rejected incidents
CREATE POLICY "incidents_select_authenticated"
    ON public.incidents FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND status != 'REJECTED'
        OR public.get_my_role() IN ('admin', 'maintenance')
    );

-- Anonymous users can read DETECTED/UNDER_INVESTIGATION/RESOLVED incidents (public map)
CREATE POLICY "incidents_select_public"
    ON public.incidents FOR SELECT
    USING (
        status IN ('DETECTED', 'NEEDS_REVIEW', 'UNDER_INVESTIGATION', 'ACTION_INITIATED', 'RESOLVED')
    );

-- Only staff can insert/update incidents
CREATE POLICY "incidents_insert_staff"
    ON public.incidents FOR INSERT
    WITH CHECK (public.get_my_role() IN ('admin', 'maintenance'));

CREATE POLICY "incidents_update_staff"
    ON public.incidents FOR UPDATE
    USING (public.get_my_role() IN ('admin', 'maintenance'));

-- ============================================================
-- INCIDENT_REPORTS policies
-- ============================================================

CREATE POLICY "incident_reports_select_authenticated"
    ON public.incident_reports FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "incident_reports_select_public"
    ON public.incident_reports FOR SELECT
    USING (true);

CREATE POLICY "incident_reports_insert_staff"
    ON public.incident_reports FOR INSERT
    WITH CHECK (public.get_my_role() IN ('admin', 'maintenance'));

CREATE POLICY "incident_reports_delete_staff"
    ON public.incident_reports FOR DELETE
    USING (public.get_my_role() IN ('admin', 'maintenance'));

-- ============================================================
-- INCIDENT_EVENTS policies
-- ============================================================

-- All authenticated users can read incident events
CREATE POLICY "incident_events_select_authenticated"
    ON public.incident_events FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only staff and system (service role) can insert events
CREATE POLICY "incident_events_insert_staff"
    ON public.incident_events FOR INSERT
    WITH CHECK (public.get_my_role() IN ('admin', 'maintenance'));

-- ============================================================
-- AREA_SUBSCRIPTIONS policies
-- ============================================================

CREATE POLICY "subscriptions_all_own"
    ON public.area_subscriptions FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================

CREATE POLICY "notifications_select_own"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
