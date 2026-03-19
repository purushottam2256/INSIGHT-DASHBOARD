import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';

export interface SearchResultItem {
    id: string;
    title: string;
    subtitle: string;
    meta?: string;
    type: 'student' | 'faculty' | 'subject' | 'session';
}

export interface SearchResults {
    students: SearchResultItem[];
    faculty: SearchResultItem[];
    subjects: SearchResultItem[];
    sessions: SearchResultItem[];
    keywords: SearchResultItem[];
}

const EMPTY_RESULTS: SearchResults = {
    students: [],
    faculty: [],
    subjects: [],
    sessions: [],
    keywords: [],
};

export const useSearch = (query: string, debounceMs = 300) => {
    const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
    const [loading, setLoading] = useState(false);
    const { role, dept } = useUserRole();
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        // Clear previous timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Reset if query too short
        if (!query || query.trim().length < 2) {
            setResults(EMPTY_RESULTS);
            setLoading(false);
            return;
        }

        setLoading(true);

        timerRef.current = setTimeout(async () => {
            try {
                const searchTerm = `%${query.trim()}%`;

                // Determine if user is dept-scoped (HOD) or has full access
                const isHOD = role === 'hod' && !!dept;

                // 1. Search Students
                let studentsQuery = supabase
                    .from('students')
                    .select('id, full_name, roll_no, dept, year, section')
                    .or(`full_name.ilike.${searchTerm},roll_no.ilike.${searchTerm}`)
                    .eq('is_active', true)
                    .limit(8);

                if (isHOD) {
                    studentsQuery = studentsQuery.eq('dept', dept);
                }

                // 2. Search Faculty (profiles)
                let facultyQuery = supabase
                    .from('profiles')
                    .select('id, full_name, email, role, dept')
                    .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
                    .limit(8);

                if (isHOD) {
                    facultyQuery = facultyQuery.eq('dept', dept);
                }

                // 3. Search Subjects
                let subjectsQuery = supabase
                    .from('subjects')
                    .select('id, name, code, dept, year')
                    .or(`name.ilike.${searchTerm},code.ilike.${searchTerm}`)
                    .eq('is_active', true)
                    .limit(8);

                if (isHOD) {
                    subjectsQuery = subjectsQuery.eq('dept', dept);
                }

                // 4. Search Attendance Sessions (recent, with subject info)
                let sessionsQuery = supabase
                    .from('attendance_sessions')
                    .select('id, date, target_dept, target_year, target_section, total_students, present_count, subjects(name, code)')
                    .or(`target_dept.ilike.${searchTerm},target_section.ilike.${searchTerm}`)
                    .order('date', { ascending: false })
                    .limit(8);

                if (isHOD) {
                    sessionsQuery = sessionsQuery.eq('target_dept', dept);
                }

                // Execute all queries in parallel
                const [studentsRes, facultyRes, subjectsRes, sessionsRes] = await Promise.all([
                    studentsQuery,
                    facultyQuery,
                    subjectsQuery,
                    sessionsQuery,
                ]);

                const staticKeywords = [
                    // Core
                    { id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Overview & Analytics', type: 'keyword', route: '/dashboard' },
                    { id: 'nav-registration', title: 'Registration', subtitle: 'Students & Faculty', type: 'keyword', route: '/registration' },
                    { id: 'nav-timetable', title: 'Timetable', subtitle: 'Schedule Management', type: 'keyword', route: '/timetable' },
                    { id: 'nav-attendance', title: 'Monthly Overview', subtitle: 'Track & Manage Attendance', type: 'keyword', route: '/attendance-manager' },
                    { id: 'nav-leaves', title: 'Leave Manager', subtitle: 'Two-Stage Approvals', type: 'keyword', route: '/leaves' },
                    
                    // Analytics
                    { id: 'nav-compare', title: 'Compare', subtitle: 'Analytics & Trends', type: 'keyword', route: '/compare' },
                    { id: 'nav-reports', title: 'Reports', subtitle: 'Generate & Export Data', type: 'keyword', route: '/reports' },
                    { id: 'nav-fees', title: 'Project Fees', subtitle: 'Fee Collection & Tracking', type: 'keyword', route: '/project-fees' },
                    { id: 'nav-bench', title: 'Benchmarking', subtitle: 'Department Performance', type: 'keyword', route: '/benchmarking' },
                    
                    // Management
                    { id: 'nav-overview', title: 'Management Overview', subtitle: 'Campus-wide Status', type: 'keyword', route: '/overview' },
                    { id: 'nav-faclogs', title: 'Faculty Logs', subtitle: 'Login & Attendance History', type: 'keyword', route: '/faculty-logs' },
                    { id: 'nav-calendar', title: 'Calendar', subtitle: 'Events & Holidays', type: 'keyword', route: '/calendar' },
                    { id: 'nav-broadcast', title: 'Broadcast', subtitle: 'Announcements & Messages', type: 'keyword', route: '/broadcast' },
                    
                    // System
                    { id: 'nav-audit', title: 'Audit Log', subtitle: 'Accountability Trail', type: 'keyword', route: '/audit-log' },
                    { id: 'nav-semester', title: 'Semester Manager', subtitle: 'Upgrade Year/Semester', type: 'keyword', route: '/semester-upgrade' },
                    { id: 'nav-settings', title: 'Settings', subtitle: 'App Configuration', type: 'keyword', route: '/settings' },
                    { id: 'nav-help', title: 'Help', subtitle: 'Guides & Support', type: 'keyword', route: '/help' },
                    { id: 'nav-scanner', title: 'Scanner', subtitle: 'QR Code Attendance Tool', type: 'keyword', route: '/scanner' },
                    
                    // Utility aliases
                    { id: 'kw1', title: 'Logout', subtitle: 'Sign out of your account', type: 'keyword', route: 'logout' },
                    { id: 'kw3', title: 'Profile', subtitle: 'View your profile details', type: 'keyword', route: '/settings' },
                ];

                const matchingKeywords = staticKeywords.filter(k => 
                    k.title.toLowerCase().includes(query.trim().toLowerCase())
                );

                setResults({
                    students: (studentsRes.data || []).map((s: any) => ({
                        id: s.id,
                        title: s.full_name,
                        subtitle: s.roll_no,
                        meta: `${s.dept} • Y${s.year} • ${s.section}`,
                        type: 'student' as const,
                    })),
                    faculty: (facultyRes.data || []).map((f: any) => ({
                        id: f.id,
                        title: f.full_name,
                        subtitle: f.email,
                        meta: `${f.role || 'faculty'}${f.dept ? ' • ' + f.dept : ''}`,
                        type: 'faculty' as const,
                    })),
                    subjects: (subjectsRes.data || []).map((s: any) => ({
                        id: s.id,
                        title: s.name,
                        subtitle: s.code,
                        meta: s.dept ? `${s.dept}${s.year ? ' • Y' + s.year : ''}` : undefined,
                        type: 'subject' as const,
                    })),
                    sessions: (sessionsRes.data || []).map((s: any) => ({
                        id: s.id,
                        title: (s.subjects as any)?.name || 'Session',
                        subtitle: `${s.date} • ${s.target_dept}-${s.target_year}-${s.target_section}`,
                        meta: s.total_students > 0
                            ? `${Math.round((s.present_count / s.total_students) * 100)}% attendance`
                            : undefined,
                        type: 'session' as const,
                    })),
                    keywords: matchingKeywords as any,
                });
            } catch (err) {
                console.error('Search error:', err);
                setResults(EMPTY_RESULTS);
            } finally {
                setLoading(false);
            }
        }, debounceMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [query, role, dept]);

    return { results, loading };
};
