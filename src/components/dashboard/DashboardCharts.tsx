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
        <div className="bg-popover/95 dark:bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-3 shadow-xl">
            {label && <p className="text-xs font-bold text-foreground mb-1.5">{label}</p>}
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-bold text-foreground">{entry.value}</span>
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
            <Card className="border-border/50 shadow-xl h-full overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl ring-1 ring-border/30">
                <CardHeader className="pb-2 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/15 text-primary ring-1 ring-primary/20">
                            <PieChartIcon className="h-3.5 w-3.5" />
                        </div>
                        {title || "Today's Overview"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    {classData.length === 0 ? (
                        <div className="text-muted-foreground text-sm text-center py-8">
                            <PieChartIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            No attendance data today
                        </div>
                    ) : (
                        <div>
                            {/* Class-wise horizontal bars: Total (grey) vs Present (orange) */}
                            <div className="space-y-2.5">
                                {classData.map((c, i) => {
                                    const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
                                    return (
                                        <div key={i}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold text-foreground">{c.name}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    <span className="font-bold text-foreground">{c.present}</span>/{c.total} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-muted/50 dark:bg-muted/30 rounded-full overflow-hidden relative">
                                                {/* Total bar (full width background) */}
                                                <div 
                                                    className="absolute inset-0 rounded-full bg-muted/30"
                                                    style={{ width: '100%' }}
                                                />
                                                {/* Present bar */}
                                                <div 
                                                    className="h-full rounded-full transition-all duration-700 ease-out relative z-10"
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
                            <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-around">
                                <div className="text-center">
                                    <span className="text-lg font-bold text-foreground">{totalStudents}</span>
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-lg font-bold text-primary">{presentPercent}%</span>
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Present</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-lg font-bold text-red-500">{totalStudents - (donutData.find(d => d.name === 'Present')?.value || 0) - (donutData.find(d => d.name === 'OD')?.value || 0)}</span>
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Absent</p>
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
            <Card className="border-border/50 shadow-xl h-full overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl ring-1 ring-border/30">
                <CardHeader className="pb-2 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/15 text-primary ring-1 ring-primary/20">
                            <BarChart3 className="h-3.5 w-3.5" />
                        </div>
                        {title || "Department Breakdown"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pl-0 pb-2 h-[250px]">
                    {deptData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            <BarChart3 className="h-8 w-8 mr-2 opacity-20" />
                            No department data
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={deptData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="dept" type="category" axisLine={false} tickLine={false} width={65}
                                    tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<PremiumTooltip />} />
                                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                <Bar dataKey="present" name="Present" fill={PREMIUM_COLORS.present} radius={[0, 4, 4, 0]} barSize={10} />
                                <Bar dataKey="od" name="OD" fill={PREMIUM_COLORS.od} radius={[0, 4, 4, 0]} barSize={10} />
                                <Bar dataKey="absent" name="Absent" fill={PREMIUM_COLORS.absent} radius={[0, 4, 4, 0]} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        );
    }

    return null;
}
