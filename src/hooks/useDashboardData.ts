import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    DashboardProfile, 
    LeaveRequest, 
    ODStudent, 
    ClassSession, 
    AcademicEvent,
    AttendanceStat
} from '@/types/dashboard';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

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

const EMPTY_DATA = {
    leaveRequests: [] as LeaveRequest[],
    odStudents: [] as ODStudent[],
    todayClasses: [] as ClassSession[],
    upcomingEvents: [] as AcademicEvent[],
    stats: [] as AttendanceStat[],
    sessions: [] as ClassSession[]
};

export const useDashboardData = (filters?: DashboardFilters) => {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboardData', user?.id, profile?.role, profile?.dept, filters],
        enabled: !!user && !!profile,
        queryFn: async () => {
            const result = { ...EMPTY_DATA };
            const todayStr = format(new Date(), 'yyyy-MM-dd');

            // 1. Leave Requests
            try {
                const { data: pendingLeaves } = await supabase
                    .from('leaves')
                    .select('*')
                    .in('status', ['pending', 'pending_hod', 'pending_principal'])
                    .limit(20);

                const { data: activeLeaves } = await supabase
                    .from('leaves')
                    .select('*')
                    .in('status', ['approved', 'hod_approved', 'accepted'])
                    .lte('start_date', todayStr)
                    .gte('end_date', todayStr)
                    .limit(20);

                const rawLeaves = [...(pendingLeaves || []), ...(activeLeaves || [])];
                
                if (rawLeaves.length > 0) {
                     const userIds = [...new Set(rawLeaves.map(l => l.user_id))];
                     const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
                     
                     result.leaveRequests = rawLeaves.map(leave => {
                          const prof = profs?.find(p => p.id === leave.user_id);
                          return {
                              ...leave,
                              profiles: { full_name: prof?.full_name || 'Unknown Faculty' }
                          };
                     }) as LeaveRequest[];
                }
            } catch (err) {
                console.error("Leave requests fetch error:", err);
            }

            // 2. OD Students
            try {
                const { data: ods } = await supabase
                    .from('attendance_permissions')
                    .select('*, students(full_name, roll_no, dept, section, year)')
                    .eq('type', 'od')
                    .eq('is_active', true)
                    .lte('start_date', todayStr)
                    .gte('end_date', todayStr)
                    .order('created_at', { ascending: false })
                    .limit(10);
                result.odStudents = (ods as unknown as ODStudent[]) || [];
            } catch (err) {
                console.error("OD Students fetch error:", err);
            }

            // 3. Today's Classes
            try {
                const { data: classes } = await supabase
                    .from('attendance_sessions')
                    .select('*, subjects(name, code), profiles!attendance_sessions_faculty_id_fkey(full_name)')
                    .eq('date', todayStr)
                    .order('start_time');

                if (classes) {
                     result.todayClasses = classes.map(c => {
                        const now = new Date();
                        const start = new Date(c.start_time);
                        const end = c.end_time ? new Date(c.end_time) : new Date(start.getTime() + 60*60*1000);
                        let status: 'Completed' | 'Ongoing' | 'Upcoming' = 'Upcoming';
                        if (now > end) status = 'Completed';
                        else if (now >= start && now <= end) status = 'Ongoing';
                        return { ...c, status, room: c.room || 'TBD' };
                    }) as ClassSession[];
                }
            } catch (err) {
                console.error("Today classes fetch error:", err);
            }

            // 4. Upcoming Events
            try {
                const { data: events } = await supabase.from('holidays').select('*').gte('date', todayStr).order('date', { ascending: true }).limit(5);
                result.upcomingEvents = (events as AcademicEvent[]) || [];
            } catch (err) {
                console.error("Upcoming Events fetch error:", err);
            }

            // 5. Analytics Stats & Sessions
            try {
                let query = supabase.from('attendance_sessions').select('*');
                
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

                if (filters?.batch && filters.batch !== 'all-batches') query = query.eq('batch', parseInt(filters.batch));
                if (filters?.year && filters.year !== 'all-years' && filters.year !== 'All') query = query.eq('target_year', parseInt(filters.year));
                if (filters?.section && filters.section !== 'all-sections' && filters.section !== 'All') query = query.eq('target_section', filters.section);
                
                if (filters?.dept && filters.dept !== 'all-dept' && filters.dept !== 'All') {
                     query = query.eq('target_dept', filters.dept);
                }

                if (filters?.period && filters.period !== 'all-periods' && filters.period !== 'All') {
                     query = query.eq('period', filters.period);
                }
                
                const { data: sessionsData, error: statsError } = await query.order('start_time', { ascending: true });
                if (statsError) throw statsError;

                const filteredSessions = sessionsData || [];
                result.sessions = filteredSessions as any;

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

                result.stats = sortedStats;
            } catch (err) {
                 console.error("Analytics fetch error:", err);
            }

            return result;
        }
    });

    // Realtime Subs
    useEffect(() => {
        if (!user || !profile) return;

        const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboardData'] });

        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_leaves' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_attendance_logs' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_permissions' }, invalidate)
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [user, profile, queryClient]);

    const finalData = data || EMPTY_DATA;

    return {
        profile: profile as DashboardProfile | null,
        leaveRequests: finalData.leaveRequests,
        odStudents: finalData.odStudents,
        todayClasses: finalData.todayClasses,
        upcomingEvents: finalData.upcomingEvents,
        stats: finalData.stats,
        sessions: finalData.sessions,
        loading: isLoading,
        error: error ? error.message : null
    };
};
