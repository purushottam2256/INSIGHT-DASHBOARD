import { useMemo, useEffect, useRef, useState } from 'react';
import { 
    TrendingUp, TrendingDown, Minus, AlertTriangle, 
    CheckCircle, ClipboardList, Clock, BarChart3 
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
        const duration = 1200; // slightly longer for premium feel
        const from = 0;
        const to = value;

        const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            // easeOutExpo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
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
                label: 'Faculty on Leave',
                value: leaveRequests.filter(l => ['approved', 'accepted'].includes(l.status)).length,
                suffix: '',
                icon: Clock,
                trend: 'flat' as const,
                trendText: `${totalClasses} classes scheduled today`,
                color: leaveRequests.filter(l => ['approved', 'accepted'].includes(l.status)).length > 0 ? 'red' : 'emerald',
            },
            {
                label: 'Completed Classes',
                value: completedClasses,
                suffix: '',
                icon: CheckCircle,
                trend: completedClasses === totalClasses && totalClasses > 0 ? 'up' : 'flat',
                trendText: `${totalClasses - completedClasses} classes remaining`,
                color: completedClasses === totalClasses && totalClasses > 0 ? 'emerald' : 'primary',
            },
        ];
    }, [todayClasses, leaveRequests, attendancePercent]);

    const getColorClasses = (color: string) => {
        switch (color) {
            case 'emerald': return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20', gradient: 'from-emerald-400 to-emerald-600' };
            case 'amber': return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20', gradient: 'from-amber-400 to-amber-600' };
            case 'red': return { bg: 'bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500/20', gradient: 'from-red-400 to-red-600' };
            default: return { bg: 'bg-primary/10', text: 'text-primary', ring: 'ring-primary/20', gradient: 'from-primary to-orange-500' };
        }
    };

    const TrendIcon = ({ trend }: { trend: string }) => {
        if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
        if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
        return <Minus className="h-4 w-4 text-muted-foreground opacity-50" />;
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
                const colors = getColorClasses(stat.color);
                const Icon = stat.icon;
                return (
                    <div
                        key={i}
                        className="group relative p-5 md:p-6 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-500 overflow-hidden hover:shadow-lg hover:-translate-y-1"
                    >
                        {/* Gradient active border glow */}
                        <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        
                        {/* Subtle ambient hover glow */}
                        <div className={`absolute -inset-20 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-[0.03] blur-2xl transition-opacity duration-700 pointer-events-none`} />

                        {/* Top gradient accent line inside */}
                        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${colors.gradient} opacity-40 group-hover:opacity-100 transition-opacity duration-500`} />
                        
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-2xl ${colors.bg} ${colors.ring} ring-1 shadow-inner relative overflow-hidden`}>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-10`} />
                                    <Icon className={`h-5 w-5 ${colors.text} relative z-10`} />
                                </div>
                                <div className="p-1.5 rounded-full bg-secondary/80 backdrop-blur border border-border/40 shadow-sm">
                                    <TrendIcon trend={stat.trend} />
                                </div>
                            </div>
                            
                            <div>
                                <div className="text-3xl md:text-4xl font-black text-foreground tracking-tighter drop-shadow-sm mb-1 group-hover:scale-[1.02] origin-left transition-transform duration-500">
                                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                                </div>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">{stat.label}</p>
                            </div>
                            
                            <div className={`mt-4 pt-4 border-t border-border/40 text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${stat.color === 'red' ? 'text-red-500/80' : 'text-muted-foreground/80'}`}>
                                {stat.color === 'red' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                {stat.trendText}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
