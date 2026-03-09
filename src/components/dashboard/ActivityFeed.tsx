import { useEffect, useState } from 'react';
import { 
    Activity, CheckCircle2, XCircle, UserCheck, CalendarPlus, 
    ClipboardCheck, Bell, Clock, FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityItem {
    id: string;
    type: 'attendance' | 'leave_approved' | 'leave_rejected' | 'event_added' | 'notification' | 'registration';
    title: string;
    description: string;
    timestamp: string;
    actor?: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    attendance: { icon: ClipboardCheck, color: 'text-primary', bg: 'bg-primary/10 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5' },
    leave_approved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5' },
    leave_rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-500/5' },
    event_added: { icon: CalendarPlus, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5' },
    notification: { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5' },
    registration: { icon: UserCheck, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5' },
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
                    .select('id, status, updated_at, user_id')
                    .in('status', ['approved', 'rejected'])
                    .order('updated_at', { ascending: false })
                    .limit(5);

                if (leaves && leaves.length > 0) {
                    const userIds = [...new Set(leaves.map(l => l.user_id))];
                    const { data: profs } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', userIds);
                    const profMap = new Map((profs || []).map(p => [p.id, p]));

                    leaves.forEach(l => {
                        const name = profMap.get(l.user_id)?.full_name || 'Faculty';
                        items.push({
                            id: `leave-${l.id}`,
                            type: l.status === 'approved' ? 'leave_approved' : 'leave_rejected',
                            title: `Leave ${l.status} for ${name}`,
                            description: l.status === 'approved' ? 'Request approved' : 'Request declined',
                            timestamp: l.updated_at,
                            actor: name,
                        });
                    });
                }

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
                        title: `🎉 ${e.name}`,
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
        <Card className="rounded-[1.5rem] bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden transition-all duration-300 z-10 w-full mb-6">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-[10px] bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20">
                        <Activity className="h-4 w-4" />
                    </div>
                    <div>
                        <CardTitle className="text-[15px] font-black tracking-tight text-foreground">
                            Activity Feed
                        </CardTitle>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Live Updates</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded-full shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Live</span>
                </div>
            </CardHeader>

            {/* Feed list */}
            <CardContent className="p-0">
                <ScrollArea className="max-h-[350px] scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border scrollbar-track-transparent">
                    {loading ? (
                        <div className="p-10 flex flex-col items-center justify-center gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading activities...</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="p-10 flex flex-col items-center justify-center text-center text-muted-foreground/60 bg-muted/10 mx-5 my-5 rounded-2xl border border-dashed border-border/40">
                            <FileSpreadsheet className="h-10 w-10 mb-3 opacity-20" />
                            <p className="text-sm font-semibold tracking-tight">No activity recorded today</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/20 px-2">
                            {activities.map((item, index) => {
                                const config = typeConfig[item.type] || typeConfig.attendance;
                                const Icon = config.icon;
                                let timeAgo = '';
                                try {
                                    timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });
                                } catch { timeAgo = ''; }

                                return (
                                    <div key={item.id} className={cn(
                                        "flex gap-4 p-4 mx-2 my-1.5 rounded-xl transition-all duration-300 group hover:bg-card/80 hover:shadow-sm border border-transparent hover:border-border/40 cursor-default",
                                        index === 0 && "bg-primary/5 border-primary/10" // highlight the most recent item slightly
                                    )}>
                                        <div className={cn("p-2 rounded-xl shrink-0 border h-fit shadow-sm", config.bg)}>
                                            <Icon className={cn("h-4 w-4", config.color)} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.title}</p>
                                            <p className="text-[11px] font-medium text-muted-foreground/80 mt-1 line-clamp-1">{item.description}</p>
                                            <span className="text-[10px] font-bold text-muted-foreground/60 flex items-center gap-1.5 mt-2 uppercase tracking-widest">
                                                <Clock className="h-3 w-3" />
                                                {timeAgo}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
