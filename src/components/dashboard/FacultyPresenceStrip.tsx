import { useEffect, useState } from 'react';
import { Users, CalendarOff, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type PresenceStatus = 'logged_in' | 'logged_out' | 'on_leave';

interface FacultyMember {
    id: string;
    full_name: string;
    avatar_url?: string;
    dept?: string;
    status: PresenceStatus;
}

export function FacultyPresenceStrip() {
    const [faculty, setFaculty] = useState<FacultyMember[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPresence = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Fetch all faculty profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, dept')
                .order('full_name');

            // Fetch today's approved leaves
            const { data: leaves } = await supabase
                .from('leaves')
                .select('user_id')
                .in('status', ['approved', 'accepted', 'pending_principal'])
                .lte('start_date', today)
                .gte('end_date', today);

            // Fetch today's attendance logs
            const { data: logs } = await supabase
                .from('faculty_attendance_logs')
                .select('faculty_id, check_in, check_out')
                .eq('date', today);

            const onLeaveIds = new Set(leaves?.map(l => l.user_id) || []);
            const logMap = new Map<string, { check_in: string; check_out: string | null }>();
            (logs || []).forEach(log => {
                logMap.set(log.faculty_id, { check_in: log.check_in, check_out: log.check_out });
            });

            const result: FacultyMember[] = (profiles || []).map(p => {
                let status: PresenceStatus = 'logged_out'; // Default: RED
                if (onLeaveIds.has(p.id)) {
                    status = 'on_leave';
                } else {
                    const log = logMap.get(p.id);
                    if (log && log.check_in && !log.check_out) {
                        status = 'logged_in'; // GREEN — checked in, not yet checked out
                    }
                    // If log exists but has check_out, or no log at all → stays logged_out (RED)
                }
                return {
                    id: p.id,
                    full_name: p.full_name || 'Unknown',
                    avatar_url: p.avatar_url,
                    dept: p.dept,
                    status,
                };
            });

            // Sort: logged_in first, then logged_out, then on_leave
            const order: Record<PresenceStatus, number> = { logged_in: 0, logged_out: 1, on_leave: 2 };
            result.sort((a, b) => order[a.status] - order[b.status]);
            setFaculty(result);
        } catch (err) {
            console.error('Error fetching faculty presence:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPresence();

        // Real-time subscription on attendance logs for instant updates
        const channel = supabase.channel('presence-strip')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_attendance_logs' }, () => {
                fetchPresence();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const loggedInCount = faculty.filter(f => f.status === 'logged_in').length;
    const loggedOutCount = faculty.filter(f => f.status === 'logged_out').length;
    const leaveCount = faculty.filter(f => f.status === 'on_leave').length;

    if (loading) {
        return (
            <Card className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
                <div className="w-10 h-10 rounded-xl bg-muted/50 shimmer shrink-0" />
                <div className="flex gap-3 overflow-hidden">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-muted/50 shimmer shrink-0" />
                    ))}
                </div>
            </Card>
        );
    }

    if (faculty.length === 0) return null;

    const getStatusColor = (status: PresenceStatus) => {
        switch (status) {
            case 'logged_in': return { border: 'border-emerald-500/50', dot: 'bg-emerald-500', bg: 'bg-primary/10 text-primary', opacity: '' };
            case 'on_leave': return { border: 'border-amber-500/40', dot: 'bg-amber-500', bg: 'bg-amber-500/10 text-amber-500', opacity: 'opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100' };
            case 'logged_out': return { border: 'border-red-500/40', dot: 'bg-red-500', bg: 'bg-red-500/10 text-red-500', opacity: 'opacity-70' };
        }
    };

    const getStatusLabel = (status: PresenceStatus) => {
        switch (status) {
            case 'logged_in': return 'Logged In';
            case 'on_leave': return 'On Leave';
            case 'logged_out': return 'Not Logged In';
        }
    };

    return (
        <Card className="p-4 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col md:flex-row md:items-center gap-4 transition-all duration-300">
            {/* Left Header Area */}
            <div className="flex items-center justify-between md:flex-col md:items-start md:justify-center md:min-w-[140px] md:pr-4 md:border-r border-border/30 gap-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20">
                        <Users className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black tracking-tight text-foreground leading-none">
                            Faculty
                        </h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Live Status</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mt-1 text-[11px] font-bold tracking-tight flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <LogIn className="h-3 w-3" />
                        {loggedInCount} 
                    </span>
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                        {loggedOutCount}
                    </span>
                    {leaveCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <CalendarOff className="h-3 w-3" />
                            {leaveCount} 
                        </span>
                    )}
                </div>
            </div>

            {/* Scrolling Avatars */}
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2.5 pb-2 pt-1 px-1">
                        {faculty.map((f) => {
                            const colors = getStatusColor(f.status);
                            return (
                                    <div key={f.id} className="relative group shrink-0 cursor-pointer" title={`${f.full_name} — ${getStatusLabel(f.status)}`}>
                                        <Avatar className={cn(
                                            "h-10 w-10 border-2 transition-all duration-300 group-hover:scale-110 shadow-sm",
                                            colors.border,
                                            colors.opacity
                                        )}>
                                            <AvatarImage src={f.avatar_url || ''} />
                                            <AvatarFallback className={cn(
                                                "text-xs font-black uppercase tracking-wider",
                                                colors.bg
                                            )}>
                                                {f.full_name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        
                                        {/* Status Dot */}
                                        <div className={cn(
                                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm transition-all duration-300",
                                            colors.dot
                                        )}>
                                            {f.status === 'logged_in' && (
                                                <div className="absolute inset-0 rounded-full animate-ping opacity-50 bg-emerald-500" />
                                            )}
                                        </div>
                                    </div>
                            );
                        })}
                </div>
                <ScrollBar orientation="horizontal" className="h-1.5" />
            </ScrollArea>
        </Card>
    );
}
