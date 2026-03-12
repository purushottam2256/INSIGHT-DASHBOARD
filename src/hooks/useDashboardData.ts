import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    DashboardProfile, 
    LeaveRequest, 
    ODStudent, 
    ClassSession, 
    AcademicEvent,
    AttendanceStat
} from '@/types/dashboard';
import { format } from 'date-fns';

interface DashboardFilters {
    date?: Date;
    year?: string | null;
    section?: string | null;
    period?: string | null;
    dept?: string | null;
    batch?: string | null;
    timeframe?: 'day' | 'week' | 'month' | 'semester';
    groupBy?: 'time' | 'class';
}

import { useAuth } from '@/contexts/AuthContext';

export const useDashboardData = (filters?: DashboardFilters) => {
    const { profile, user } = useAuth();
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [odStudents, setOdStudents] = useState<ODStudent[]>([]);
    const [todayClasses, setTodayClasses] = useState<ClassSession[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<AcademicEvent[]>([]);
    const [stats, setStats] = useState<AttendanceStat[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const fetchDashboardData = useCallback(async () => {
        if (!user || !profile) return;

        try {
            setLoading(true);

            const todayStr = new Date().toISOString().split('T')[0];

            // 2. Leave Requests
            const { data: rawLeaves } = await supabase
                .from('leaves')
                .select('*')
                .or(`status.in.(pending,pending_hod,pending_principal),and(status.in.(approved,hod_approved,accepted),start_date.lte.${todayStr},end_date.gte.${todayStr})`)
                .limit(20);
            
            let dashboardLeaves: LeaveRequest[] = []

            if (rawLeaves && rawLeaves.length > 0) {
                 const userIds = rawLeaves.map(l => l.user_id)
                 const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
                 
                 dashboardLeaves = rawLeaves.map(leave => {
                      const prof = profs?.find(p => p.id === leave.user_id)
                      return {
                          ...leave,
                          profiles: { full_name: prof?.full_name || 'Unknown Faculty' }
                      }
                 }) as LeaveRequest[]
            }
            setLeaveRequests(dashboardLeaves);

            // 3. OD Students (active today)
            const { data: ods, error: odError } = await supabase
                .from('attendance_permissions')
                .select('*, students(full_name, roll_no, dept, section, year)')
                .eq('type', 'od')
                .eq('is_active', true)
                .lte('start_date', todayStr)
                .gte('end_date', todayStr)
                .order('created_at', { ascending: false })
                .limit(10);
            if (odError) console.error('OD fetch error:', odError);
            setOdStudents((ods as unknown as ODStudent[]) || []);

            // 4. Today's Classes
            const { data: classes } = await supabase.from('attendance_sessions').select('*, subjects(name, code), profiles!attendance_sessions_faculty_id_fkey(full_name)').eq('date', todayStr).order('start_time');
            if (classes) {
                 const processed = classes.map(c => {
                    const now = new Date();
                    const start = new Date(c.start_time);
                    const end = c.end_time ? new Date(c.end_time) : new Date(start.getTime() + 60*60*1000);
                    let status: 'Completed' | 'Ongoing' | 'Upcoming' = 'Upcoming';
                    if (now > end) status = 'Completed';
                    else if (now >= start && now <= end) status = 'Ongoing';
                    return { ...c, status, room: c.room || 'TBD' };
                });
                setTodayClasses(processed as ClassSession[]);
            }

            // 5. Upcoming Events
            const { data: events } = await supabase.from('holidays').select('*').gte('date', todayStr).order('date', { ascending: true }).limit(5);
            setUpcomingEvents(events as AcademicEvent[] || []);

            // 6. Analytics Stats - DYNAMIC FILTERING & AGGREGATION
            let query = supabase.from('attendance_sessions').select('*');
            
            // Date Range Logic
            const anchorDate = filters?.date || new Date();
            let startDate = new Date(anchorDate);
            let endDate = new Date(anchorDate);

            if (filters?.timeframe === 'week') {
                const day = startDate.getDay();
                const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); 
                startDate.setDate(diff);
                endDate.setDate(startDate.getDate() + 6);
            } else if (filters?.timeframe === 'month') {
                startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
                endDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
            } else if (filters?.timeframe === 'semester') {
                startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 5, 1);
                endDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
            }

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            if (filters?.timeframe === 'day') {
                query = query.eq('date', startDateStr);
            } else {
                query = query.gte('date', startDateStr).lte('date', endDateStr);
            }

            // Additional Filters
            if (filters?.batch && filters.batch !== 'all-batches') query = query.eq('batch', parseInt(filters.batch));
            if (filters?.year && filters.year !== 'all-years') query = query.eq('target_year', parseInt(filters.year));
            if (filters?.section && filters.section !== 'all-sections') query = query.eq('target_section', filters.section);
            if (filters?.dept && filters.dept !== 'all-dept') query = query.eq('target_dept', filters.dept);

            if (filters?.period && filters.period !== 'all-periods') {
                 query = query.eq('period', filters.period);
            }
            
            const { data: sessionsData, error: statsError } = await query.order('start_time', { ascending: true });

            if (statsError) throw statsError;

            let filteredSessions = sessionsData || [];
            setSessions(filteredSessions as any);

            // Aggregation Logic
            const statsMap = new Map<string, AttendanceStat>();
            
            filteredSessions.forEach((s: any) => {
                let key = ''; 
                
                if (filters?.groupBy === 'class') {
                     key = `${s.target_year}-${s.target_dept}-${s.target_section}`;
                } else if (filters?.timeframe === 'month') {
                    const date = new Date(s.date);
                    const day = date.getDate();
                    const weekNum = Math.ceil(day / 7);
                    key = `Week ${weekNum}`;
                } else if (filters?.timeframe === 'week') {
                     key = format(new Date(s.date), 'EEE'); 
                } else if (filters?.timeframe === 'semester') {
                     key = format(new Date(s.date), 'MMM');
                } else {
                     key = s.start_time ? format(new Date(s.start_time), 'h:mm a') : 'Unknown';
                }
                
                if (!statsMap.has(key)) {
                    statsMap.set(key, { date: key, present: 0, absent: 0, od: 0, total: 0 });
                }
                const entry = statsMap.get(key)!;
                entry.present += (s.present_count || 0);
                entry.absent += (s.absent_count || 0);
                entry.od += (s.od_count || 0);
                entry.total += (s.total_students || 0); 
            });

            // Convert map to array and sort
            let sortedStats = Array.from(statsMap.values());

             if (filters?.groupBy === 'class') {
                 sortedStats.sort((a, b) => a.date.localeCompare(b.date, undefined, { numeric: true, sensitivity: 'base' }));
             } else if (filters?.timeframe === 'week') {
                 const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                 sortedStats.sort((a, b) => days.indexOf(a.date) - days.indexOf(b.date));
             } else if (filters?.timeframe === 'month') {
                 sortedStats.sort((a, b) => a.date.localeCompare(b.date, undefined, { numeric: true }));
             } else if (filters?.timeframe === 'semester') {
                 const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                 sortedStats.sort((a, b) => months.indexOf(a.date) - months.indexOf(b.date));
             }

            setStats(sortedStats.length > 0 ? sortedStats : []);

        } catch (err: any) {
            console.error("Error fetching dashboard data:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id, profile?.role, profile?.dept, filters?.date, filters?.year, filters?.section, filters?.dept, filters?.batch, filters?.timeframe, filters?.groupBy]);

    useEffect(() => {
        if (!user || !profile) {
            setLoading(false);
            return;
        }

        fetchDashboardData();

        // ── Realtime: auto-refresh when DB changes ──────────────────
        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, () => fetchDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_permissions' }, () => fetchDashboardData())
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [fetchDashboardData]);

    return {
        profile: profile as DashboardProfile | null,
        leaveRequests,
        odStudents,
        todayClasses,
        upcomingEvents,
        stats,
        sessions,
        loading,
        error
    };
};
