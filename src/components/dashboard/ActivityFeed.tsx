import { useEffect, useState } from 'react';
import { 
    Activity, CheckCircle2, XCircle, UserCheck, CalendarPlus, 
    ClipboardCheck, Bell, Clock, FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: string;
    type: 'attendance' | 'leave_approved' | 'leave_rejected' | 'event_added' | 'notification' | 'registration';
    title: string;
    description: string;
    timestamp: string;
    actor?: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    attendance: { icon: ClipboardCheck, color: 'text-primary', bg: 'bg-primary/10' },
    leave_approved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    leave_rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    event_added: { icon: CalendarPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    notification: { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    registration: { icon: UserCheck, color: 'text-violet-500', bg: 'bg-violet-500/10' },
};

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const items: ActivityItem[] = [];
                const today = new Date().toISOString().split('T')[0];

                // 1. Recent attendance sessions (today)
                const { data: sessions } = await supabase
                    .from('attendance_sessions')
                    .select('id, date, target_dept, target_year, target_section, present_count, total_students, created_at, profiles!attendance_sessions_faculty_id_fkey(full_name)')
                    .eq('date', today)
                    .order('created_at', { ascending: false })
                    .limit(5);

                sessions?.forEach(s => {
                    const faculty = (s as any).profiles?.full_name || 'Faculty';
                    items.push({
                        id: `att-${s.id}`,
                        type: 'attendance',
                        title: `Attendance marked for ${s.target_year}-${s.target_dept}-${s.target_section}`,
                        description: `${s.present_count}/${s.total_students} present · by ${faculty}`,
                        timestamp: s.created_at,
                        actor: faculty,
                    });
                });

                // 2. Recent leave decisions
                const { data: leaves } = await supabase
                    .from('leaves')
                    .select('id, status, updated_at, profiles:user_id(full_name)')
                    .in('status', ['approved', 'rejected'])
                    .order('updated_at', { ascending: false })
                    .limit(5);

                leaves?.forEach(l => {
                    const name = (l as any).profiles?.full_name || 'Faculty';
                    items.push({
                        id: `leave-${l.id}`,
                        type: l.status === 'approved' ? 'leave_approved' : 'leave_rejected',
                        title: `Leave ${l.status} for ${name}`,
                        description: l.status === 'approved' ? 'Request approved' : 'Request declined',
                        timestamp: l.updated_at,
                        actor: name,
                    });
                });

                // 3. Recent events added
                const { data: events } = await supabase
                    .from('holidays')
                    .select('id, name, created_at')
                    .order('created_at', { ascending: false })
                    .limit(3);

                events?.forEach(e => {
                    items.push({
                        id: `event-${e.id}`,
                        type: 'event_added',
                        title: `🎉 Holiday: ${e.name}`,
                        description: `Added to calendar`,
                        timestamp: e.created_at,
                    });
                });

                // 4. Recent notifications sent
                const { data: notifs } = await supabase
                    .from('notifications')
                    .select('id, title, created_at')
                    .order('created_at', { ascending: false })
                    .limit(3);

                notifs?.forEach(n => {
                    items.push({
                        id: `notif-${n.id}`,
                        type: 'notification',
                        title: `Notification: ${n.title}`,
                        description: 'Sent to faculty',
                        timestamp: n.created_at,
                    });
                });

                // Sort all by timestamp (newest first) and take top 10
                items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setActivities(items.slice(0, 10));
            } catch (err) {
                console.error('Activity feed error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden transition-all duration-300 z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Activity Feed</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
                </div>
            </div>

            {/* Feed list */}
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                {loading ? (
                    <div className="p-6 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                        <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">No activity recorded today</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/20">
                        {activities.map((item) => {
                            const config = typeConfig[item.type] || typeConfig.attendance;
                            const Icon = config.icon;
                            let timeAgo = '';
                            try {
                                timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });
                            } catch { timeAgo = ''; }

                            return (
                                <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                                    <div className={`p-1.5 rounded-lg ${config.bg} shrink-0 mt-0.5`}>
                                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/60 shrink-0 flex items-center gap-1 mt-0.5">
                                        <Clock className="h-2.5 w-2.5" />
                                        {timeAgo}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
