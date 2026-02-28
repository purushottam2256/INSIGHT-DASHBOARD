-- ============================================================
-- INSIGHT DASHBOARD — Schema Migration
-- Run this in Supabase SQL Editor (all at once, copy-paste)
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. LEAVES TABLE: Drop old CHECK constraint, add new one
-- ──────────────────────────────────────────────
-- The existing constraint only allows: pending, accepted, declined.
-- We need: pending, pending_hod, pending_principal, approved, rejected
-- (plus old values for backward compat)

ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_status_check;

ALTER TABLE leaves ADD CONSTRAINT leaves_status_check
    CHECK (status IN ('pending', 'pending_hod', 'pending_principal', 'approved', 'rejected', 'accepted', 'declined'));

-- ──────────────────────────────────────────────
-- 2. Add two-stage approval tracking columns
-- ──────────────────────────────────────────────

ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approved_by_hod UUID REFERENCES profiles(id);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS hod_approved_at TIMESTAMPTZ;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approved_by_principal UUID REFERENCES profiles(id);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS principal_approved_at TIMESTAMPTZ;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ──────────────────────────────────────────────
-- 3. MIGRATE OLD statuses → new statuses
-- ──────────────────────────────────────────────

UPDATE leaves SET status = 'pending_hod' WHERE status = 'pending';
UPDATE leaves SET status = 'approved'    WHERE status = 'accepted';
UPDATE leaves SET status = 'rejected'    WHERE status = 'declined';

-- ──────────────────────────────────────────────
-- 4. STUDENT AGGREGATES VIEW (for Compliance & Benchmarking)
-- ──────────────────────────────────────────────
-- Both CompliancePage and BenchmarkingPage read from this view.
-- It aggregates attendance records per student.

DROP MATERIALIZED VIEW IF EXISTS view_student_aggregates;
DROP VIEW IF EXISTS view_student_aggregates;
DROP TABLE IF EXISTS view_student_aggregates;

CREATE VIEW view_student_aggregates AS
SELECT
    s.id AS student_id,
    s.roll_no,
    s.full_name,
    s.dept,
    s.section,
    s.year,
    COALESCE(agg.present_sessions, 0)  AS present_sessions,
    COALESCE(agg.absent_sessions, 0)   AS absent_sessions,
    COALESCE(agg.od_sessions, 0)       AS od_sessions,
    COALESCE(agg.total_sessions, 0)    AS total_sessions,
    CASE
        WHEN COALESCE(agg.total_sessions, 0) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(agg.present_sessions, 0)::NUMERIC / agg.total_sessions) * 100, 2
        )
    END AS attendance_percentage
FROM students s
LEFT JOIN (
    SELECT
        al.student_id,
        COUNT(*) AS total_sessions,
        COUNT(*) FILTER (WHERE al.status = 'present') AS present_sessions,
        COUNT(*) FILTER (WHERE al.status = 'absent')  AS absent_sessions,
        COUNT(*) FILTER (WHERE al.status = 'od')      AS od_sessions
    FROM attendance_logs al
    GROUP BY al.student_id
) agg ON s.id = agg.student_id
WHERE s.is_active = TRUE;

-- ──────────────────────────────────────────────
-- 5. APP CONFIG TABLE (for Semester Upgrader)
-- ──────────────────────────────────────────────
-- Stores configuration like current semester, academic year, etc.

CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES profiles(id)
);

-- Insert default semester config if not exists
INSERT INTO app_config (key, value)
VALUES ('semester', '{"current": 1, "academic_year": "2025-26"}')
ON CONFLICT (key) DO NOTHING;

-- ──────────────────────────────────────────────
-- 6. RLS: Allow authenticated users to read/write leaves
-- ──────────────────────────────────────────────

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaves_read_all' AND tablename = 'leaves') THEN
        CREATE POLICY leaves_read_all ON leaves FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaves_insert_own' AND tablename = 'leaves') THEN
        CREATE POLICY leaves_insert_own ON leaves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaves_update_any' AND tablename = 'leaves') THEN
        CREATE POLICY leaves_update_any ON leaves FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ──────────────────────────────────────────────
-- 7. RLS: Academic Calendar (fix insert/delete errors)
-- ──────────────────────────────────────────────

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_read_all' AND tablename = 'holidays') THEN
        CREATE POLICY calendar_read_all ON holidays FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_insert_any' AND tablename = 'holidays') THEN
        CREATE POLICY calendar_insert_any ON holidays FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_update_any' AND tablename = 'holidays') THEN
        CREATE POLICY calendar_update_any ON holidays FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'calendar_delete_any' AND tablename = 'holidays') THEN
        CREATE POLICY calendar_delete_any ON holidays FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- Grant read access on the view
GRANT SELECT ON view_student_aggregates TO authenticated;

-- ============================================================
-- DONE! All migrations applied.
-- ============================================================
