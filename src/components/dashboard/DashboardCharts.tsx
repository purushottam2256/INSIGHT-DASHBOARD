import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { ClassSession } from '@/types/dashboard';

interface DashboardChartsProps {
    todayClasses: ClassSession[];
    type: "dept-bar" | "attendance-donut";
    title?: string;
}

const PREMIUM_COLORS = {
    present: 'hsl(28, 90%, 48%)',
    absent: 'hsl(0, 72%, 51%)',
    od: 'hsl(36, 100%, 50%)',
    total: 'hsl(220, 14%, 80%)',
    departments: ['hsl(28,90%,48%)', 'hsl(36,100%,50%)', 'hsl(20,90%,40%)', 'hsl(45,93%,47%)', 'hsl(30,80%,55%)', 'hsl(15,85%,45%)'],
};

function PremiumTooltip({ active, payload, label }: any) {
    if (!active || !payload) return null;
    return (
        <div className="bg-popover/90 dark:bg-popover/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            {label && <p className="text-sm font-black text-foreground mb-2">{label}</p>}
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-xs py-1">
                    <div className="w-3 h-3 rounded-md shadow-sm" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider">{entry.name}:</span>
                    <span className="font-bold text-foreground ml-auto">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

export function DashboardCharts({ todayClasses, type, title }: DashboardChartsProps) {

    // Class-wise data: each class as a separate bar showing total students vs present
    const classData = useMemo(() => {
        return todayClasses.map(c => ({
            name: `${c.target_dept}-${c.target_year}${c.target_section}`,
            present: (c.present_count || 0) + (c.od_count || 0),
            absent: c.absent_count || 0,
            total: c.total_students || 0,
            registered: c.total_students || 0,
        }));
    }, [todayClasses]);

    // Overall attendance donut
    const donutData = useMemo(() => {
        let present = 0, absent = 0, od = 0;
        todayClasses.forEach(c => {
            present += c.present_count || 0;
            absent += c.absent_count || 0;
            od += c.od_count || 0;
        });
        const total = present + absent + od;
        if (total === 0) return [];
        return [
            { name: 'Present', value: present, color: PREMIUM_COLORS.present },
            { name: 'Absent', value: absent, color: PREMIUM_COLORS.absent },
            { name: 'OD', value: od, color: PREMIUM_COLORS.od },
        ];
    }, [todayClasses]);

    const totalStudents = donutData.reduce((acc, d) => acc + d.value, 0);
    const presentPercent = totalStudents > 0 
        ? Math.round((donutData.find(d => d.name === 'Present')?.value || 0) / totalStudents * 100) 
        : 0;

    if (type === "attendance-donut") {
        return (
            <Card className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] h-full overflow-hidden rounded-[1.5rem] transition-all duration-300">
                <CardHeader className="pb-3 pt-5 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                    <CardTitle className="text-[15px] font-black tracking-tight flex items-center gap-2.5 text-foreground">
                        <div className="p-1.5 rounded-[10px] bg-primary/10 dark:bg-primary/15 text-primary ring-1 ring-primary/20">
                            <PieChartIcon className="h-4 w-4" />
                        </div>
                        {title || "Today's Overview"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-5">
                    {classData.length === 0 ? (
                        <div className="text-muted-foreground/60 text-sm text-center py-12 flex flex-col items-center justify-center">
                            <PieChartIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="font-semibold tracking-tight">No attendance data today</p>
                        </div>
                    ) : (
                        <div>
                            {/* Class-wise horizontal bars: Total (grey) vs Present (orange) */}
                            <div className="space-y-4">
                                {classData.map((c, i) => {
                                    const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
                                    return (
                                        <div key={i} className="group cursor-default">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-bold tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">{c.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold">
                                                    <span className="font-bold text-foreground">{c.present}</span>/{c.total} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-4 w-full bg-secondary dark:bg-muted/30 rounded-full overflow-hidden relative border border-black/5 dark:border-white/5 shadow-inner">
                                                <div 
                                                    className="absolute inset-0 bg-muted/30"
                                                    style={{ width: '100%' }}
                                                />
                                                <div 
                                                    className="h-full rounded-full transition-all duration-1000 ease-out relative z-10 shadow-sm"
                                                    style={{ 
                                                        width: `${pct}%`, 
                                                        backgroundColor: pct >= 85 ? 'hsl(28, 90%, 48%)' : pct >= 75 ? 'hsl(36, 100%, 50%)' : 'hsl(0, 72%, 51%)' 
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Summary */}
                            <div className="mt-6 pt-5 border-t border-border/30 flex items-center justify-around bg-secondary/20 rounded-2xl mx-1 mb-1 shadow-inner">
                                <div className="text-center p-2">
                                    <span className="flex text-2xl font-black text-foreground tracking-tighter drop-shadow-sm">{totalStudents}</span>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Total</p>
                                </div>
                                <div className="text-center p-2">
                                    <span className="flex text-2xl font-black text-primary tracking-tighter drop-shadow-sm">{presentPercent}%</span>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Present</p>
                                </div>
                                <div className="text-center p-2">
                                    <span className="flex text-2xl font-black text-red-500 tracking-tighter drop-shadow-sm">{totalStudents - (donutData.find(d => d.name === 'Present')?.value || 0) - (donutData.find(d => d.name === 'OD')?.value || 0)}</span>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Absent</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (type === "dept-bar") {
        const deptData = useMemo(() => {
            const map = new Map<string, { dept: string; present: number; absent: number; od: number; total: number }>();
            todayClasses.forEach(c => {
                const key = c.target_dept || 'Unknown';
                if (!map.has(key)) map.set(key, { dept: key, present: 0, absent: 0, od: 0, total: 0 });
                const entry = map.get(key)!;
                entry.present += c.present_count || 0;
                entry.absent += c.absent_count || 0;
                entry.od += c.od_count || 0;
                entry.total += c.total_students || 0;
            });
            return Array.from(map.values()).sort((a, b) => b.total - a.total);
        }, [todayClasses]);
        
        return (
            <Card className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] h-full overflow-hidden rounded-[1.5rem] transition-all duration-300">
                <CardHeader className="pb-3 pt-5 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                    <CardTitle className="text-[15px] font-black tracking-tight flex items-center gap-2.5 text-foreground">
                        <div className="p-1.5 rounded-[10px] bg-primary/10 dark:bg-primary/15 text-primary ring-1 ring-primary/20">
                            <BarChart3 className="h-4 w-4" />
                        </div>
                        {title || "Department Breakdown"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pl-0 pb-4 h-[250px] md:h-[300px] pt-4">
                    {deptData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 text-sm">
                            <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-semibold tracking-tight">No department data</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={deptData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="dept" type="category" axisLine={false} tickLine={false} width={70}
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4, rx: 8 }} content={<PremiumTooltip />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '16px' }} />
                                <Bar dataKey="present" name="Present" fill={PREMIUM_COLORS.present} radius={[0, 4, 4, 0]} barSize={12} />
                                <Bar dataKey="od" name="OD" fill={PREMIUM_COLORS.od} radius={[0, 4, 4, 0]} barSize={12} />
                                <Bar dataKey="absent" name="Absent" fill={PREMIUM_COLORS.absent} radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        );
    }

    return null;
}
