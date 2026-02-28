import { useMemo, useEffect, useRef, useState } from 'react';
import { 
    TrendingUp, TrendingDown, Minus, AlertTriangle, 
    CheckCircle, ClipboardList, Users, BarChart3 
} from 'lucide-react';
import { ClassSession, LeaveRequest } from '@/types/dashboard';

interface SmartSummaryCardsProps {
    todayClasses: ClassSession[];
    leaveRequests: LeaveRequest[];
    attendancePercent: number;
}

/** Animated counter that counts up from 0 → value */
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0);
    const ref = useRef<number | null>(null);

    useEffect(() => {
        if (ref.current !== null) cancelAnimationFrame(ref.current);
        const start = performance.now();
        const duration = 800;
        const from = 0;
        const to = value;

        const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setDisplay(Math.round(from + (to - from) * eased));
            if (progress < 1) ref.current = requestAnimationFrame(animate);
        };
        ref.current = requestAnimationFrame(animate);
        return () => { if (ref.current) cancelAnimationFrame(ref.current); };
    }, [value]);

    return <>{display}{suffix}</>;
}

export function SmartSummaryCards({ todayClasses, leaveRequests, attendancePercent }: SmartSummaryCardsProps) {
    const stats = useMemo(() => {
        const totalStudents = todayClasses.reduce((acc, c) => acc + (c.total_students || 0), 0);
        const completedClasses = todayClasses.filter(c => c.status === 'Completed').length;
        const totalClasses = todayClasses.length;
        const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;

        // Attendance health trend (compare to a baseline of 85%)
        const trendDiff = attendancePercent - 85;

        return [
            {
                label: 'Attendance Health',
                value: attendancePercent,
                suffix: '%',
                icon: BarChart3,
                trend: trendDiff > 0 ? 'up' : trendDiff < 0 ? 'down' : 'flat',
                trendText: trendDiff > 0 ? `+${trendDiff}% above avg` : trendDiff < 0 ? `${trendDiff}% below avg` : 'On target',
                color: attendancePercent >= 85 ? 'emerald' : attendancePercent >= 75 ? 'amber' : 'red',
            },
            {
                label: 'Pending Actions',
                value: pendingLeaves,
                suffix: '',
                icon: ClipboardList,
                trend: pendingLeaves > 3 ? 'down' : pendingLeaves === 0 ? 'up' : 'flat',
                trendText: pendingLeaves === 0 ? 'All clear!' : `${pendingLeaves} leave${pendingLeaves > 1 ? 's' : ''} awaiting`,
                color: pendingLeaves === 0 ? 'emerald' : pendingLeaves > 3 ? 'red' : 'amber',
            },
            {
                label: 'Total Students',
                value: totalStudents,
                suffix: '',
                icon: Users,
                trend: 'flat' as const,
                trendText: `Across ${totalClasses} class${totalClasses !== 1 ? 'es' : ''}`,
                color: 'primary',
            },
            {
                label: 'Schedule Progress',
                value: totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0,
                suffix: '%',
                icon: CheckCircle,
                trend: completedClasses === totalClasses && totalClasses > 0 ? 'up' : 'flat',
                trendText: `${completedClasses}/${totalClasses} classes done`,
                color: completedClasses === totalClasses && totalClasses > 0 ? 'emerald' : 'primary',
            },
        ];
    }, [todayClasses, leaveRequests, attendancePercent]);

    const getColorClasses = (color: string) => {
        switch (color) {
            case 'emerald': return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' };
            case 'amber': return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' };
            case 'red': return { bg: 'bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500/20' };
            default: return { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/20' };
        }
    };

    const TrendIcon = ({ trend }: { trend: string }) => {
        if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
        if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, i) => {
                const colors = getColorClasses(stat.color);
                const Icon = stat.icon;
                return (
                    <div
                        key={i}
                        className="group relative p-4 rounded-2xl bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border/40 shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden"
                    >
                        {/* Subtle gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 rounded-xl ${colors.bg} ${colors.ring} ring-1`}>
                                    <Icon className={`h-4 w-4 ${colors.text}`} />
                                </div>
                                <TrendIcon trend={stat.trend} />
                            </div>
                            <div className="text-2xl font-extrabold text-foreground tracking-tight">
                                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                            </div>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                                {stat.color === 'red' && <AlertTriangle className="h-2.5 w-2.5 text-red-400" />}
                                {stat.trendText}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
