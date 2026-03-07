import { useEffect, useState } from 'react';
import { Users, UserCheck, CalendarOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-sm">
                <div className="animate-pulse flex gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="w-9 h-9 rounded-full bg-muted shimmer" />
                    ))}
                </div>
            </div>
        );
    }

    if (faculty.length === 0) return null;

    return (
        <div className="px-4 py-3 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                        <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Faculty Presence</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <UserCheck className="h-3 w-3" />
                        {presentCount} Present
                    </span>
                    {leaveCount > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                            <CalendarOff className="h-3 w-3" />
                            {leaveCount} Leave
                        </span>
                    )}
                </div>
            </div>

            {/* Avatar strip with horizontal scroll */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {faculty.map((f) => (
                    <div key={f.id} className="relative group shrink-0">
                        <Avatar className={`h-9 w-9 border-2 transition-transform group-hover:scale-110 ${
                            f.isOnLeave 
                                ? 'border-red-400/50 opacity-50 grayscale' 
                                : 'border-emerald-400/50'
                        }`}>
                            <AvatarImage src={f.avatar_url} />
                            <AvatarFallback className={`text-[10px] font-bold ${
                                f.isOnLeave 
                                    ? 'bg-red-500/10 text-red-400' 
                                    : 'bg-primary/10 text-primary'
                            }`}>
                                {f.full_name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        {/* Status dot */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                            f.isOnLeave ? 'bg-red-400' : 'bg-emerald-400'
                        }`} />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
                            <div className="bg-foreground text-background text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap shadow-xl">
                                {f.full_name}
                                {f.isOnLeave && <span className="text-red-300 ml-1">· On Leave</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
