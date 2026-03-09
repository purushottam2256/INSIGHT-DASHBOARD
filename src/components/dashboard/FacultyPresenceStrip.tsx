import { useEffect, useState } from 'react';
import { Users, UserCheck, CalendarOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FacultyMember {
    id: string;
    full_name: string;
    avatar_url?: string;
    dept?: string;
    isOnLeave: boolean;
}

export function FacultyPresenceStrip() {
    const [faculty, setFaculty] = useState<FacultyMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPresence = async () => {
             // Keep existing fetch logic
            try {
                // Fetch all faculty profiles
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, dept')
                    .order('full_name');

                // Fetch today's leaves (approved)
                const today = new Date().toISOString().split('T')[0];
                const { data: leaves } = await supabase
                    .from('leaves')
                    .select('user_id')
                    .in('status', ['approved', 'accepted', 'pending_principal'])
                    .lte('start_date', today)
                    .gte('end_date', today);

                const onLeaveIds = new Set(leaves?.map(l => l.user_id) || []);

                const result: FacultyMember[] = (profiles || []).map(p => ({
                    id: p.id,
                    full_name: p.full_name || 'Unknown',
                    avatar_url: p.avatar_url,
                    dept: p.dept,
                    isOnLeave: onLeaveIds.has(p.id),
                }));

                // Sort: present first, then on-leave
                result.sort((a, b) => Number(a.isOnLeave) - Number(b.isOnLeave));
                setFaculty(result);
            } catch (err) {
                console.error('Error fetching faculty presence:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPresence();
    }, []);

    const presentCount = faculty.filter(f => !f.isOnLeave).length;
    const leaveCount = faculty.filter(f => f.isOnLeave).length;

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
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Status</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 mt-1 text-[11px] font-bold tracking-tight">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <UserCheck className="h-3 w-3" />
                        {presentCount} 
                    </span>
                    {leaveCount > 0 && (
                        <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                            <CalendarOff className="h-3 w-3" />
                            {leaveCount} 
                        </span>
                    )}
                </div>
            </div>

            {/* Scrolling Avatars */}
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2.5 pb-2 pt-1 px-1">
                        {faculty.map((f) => (
                                    <div key={f.id} className="relative group shrink-0 cursor-pointer" title={`${f.full_name} (${f.isOnLeave ? 'On Leave' : 'Present'})`}>
                                        <Avatar className={cn(
                                            "h-10 w-10 border-2 transition-all duration-300 group-hover:scale-110 shadow-sm",
                                            f.isOnLeave 
                                                ? "border-red-500/40 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100" 
                                                : "border-primary/50 group-hover:border-primary shadow-[0_0_15px_rgba(var(--primary),0.1)] group-hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                                        )}>
                                            <AvatarImage src={f.avatar_url || ''} />
                                            <AvatarFallback className={cn(
                                                "text-xs font-black uppercase tracking-wider",
                                                f.isOnLeave 
                                                    ? "bg-red-500/10 text-red-500" 
                                                    : "bg-primary/10 text-primary"
                                            )}>
                                                {f.full_name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        
                                        {/* Status Glow Dot */}
                                        <div className={cn(
                                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm transition-all duration-300",
                                            f.isOnLeave 
                                                ? "bg-red-500" 
                                                : "bg-emerald-500"
                                        )}>
                                            {!f.isOnLeave && (
                                                <div className="absolute inset-0 rounded-full animate-ping opacity-50 bg-emerald-500" />
                                            )}
                                        </div>
                                    </div>
                        ))}
                </div>
                <ScrollBar orientation="horizontal" className="h-1.5" />
            </ScrollArea>
        </Card>
    );
}
