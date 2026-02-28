import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    TrendingUp, Download, 
    Calendar, Layers, GitCompareArrows, AlertCircle
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';

type ChartType = 'line' | 'bar' | 'area';
type TimePeriod = '7' | '14' | '30';

interface CompareData {
    date: string;
    [key: string]: number | string;
}

export function ComparePage() {
    const { role, dept } = useUserRole();
    const [chartType, setChartType] = useState<ChartType>('area');
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('7');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<CompareData[]>([]);
    const [error, setError] = useState<string | null>(null);

    const colors = [
        'hsl(28, 90%, 48%)',   // primary orange
        'hsl(33, 95%, 55%)',   // amber
        'hsl(20, 90%, 40%)',   // dark orange
        'hsl(45, 93%, 47%)',   // golden
        'hsl(0, 72%, 51%)',    // red
        'hsl(262, 83%, 58%)',  // purple
    ];

    // Fetch available classes from attendance_sessions
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                let query = supabase
                    .from('attendance_sessions')
                    .select('target_dept, target_year, target_section')
                    .limit(500);

                const isHOD = role === 'hod' && dept;
                if (isHOD) {
                    query = query.eq('target_dept', dept);
                }

                const { data: sessions, error: err } = await query;
                if (err) throw err;

                // Build unique class labels
                const classSet = new Set<string>();
                (sessions || []).forEach((s: any) => {
                    classSet.add(`${s.target_dept}-${s.target_year}${s.target_section}`);
                });

                const sorted = Array.from(classSet).sort();
                setAvailableClasses(sorted);
                // Auto-select first 2
                setSelectedClasses(sorted.slice(0, Math.min(2, sorted.length)));
            } catch (err: any) {
                console.error('Error fetching classes:', err);
            }
        };
        fetchClasses();
    }, [role, dept]);

    // Fetch real attendance data
    const fetchData = useCallback(async () => {
        if (selectedClasses.length === 0) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const days = parseInt(timePeriod);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startStr = startDate.toISOString().split('T')[0];

            
            // Fetch attendance sessions for the date range
            const { data: sessions, error: err } = await supabase
                .from('attendance_sessions')
                .select('date, target_dept, target_year, target_section, total_students, present_count')
                .gte('date', startStr)
                .order('date', { ascending: true });

            if (err) throw err;

            // Group by date and class
            const dateMap = new Map<string, CompareData>();

            for (let i = 0; i < days; i++) {
                const d = new Date();
                d.setDate(d.getDate() - (days - 1 - i));
                const dateStr = d.toISOString().split('T')[0];
                const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
                
                const entry: CompareData = { date: displayDate };
                selectedClasses.forEach(cls => { entry[cls] = 0; });
                dateMap.set(dateStr, entry);
            }

            // Aggregate sessions into the date map
            (sessions || []).forEach((s: any) => {
                const classLabel = `${s.target_dept}-${s.target_year}${s.target_section}`;
                if (!selectedClasses.includes(classLabel)) return;

                const entry = dateMap.get(s.date);
                if (!entry) return;

                if (s.total_students > 0) {
                    const pct = Math.round((s.present_count / s.total_students) * 100);
                    // Average if multiple sessions for same class on same day
                    const currentVal = entry[classLabel] as number;
                    entry[classLabel] = currentVal > 0 ? Math.round((currentVal + pct) / 2) : pct;
                }
            });

            setData(Array.from(dateMap.values()));
        } catch (err: any) {
            console.error('Error fetching compare data:', err);
            setError('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    }, [selectedClasses, timePeriod]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleClass = (cls: string) => {
        setSelectedClasses(prev => 
            prev.includes(cls) 
                ? prev.filter(c => c !== cls) 
                : prev.length < 5 ? [...prev, cls] : prev
        );
    };

    // Compute averages
    const averages = useMemo(() => {
        return selectedClasses.map(cls => {
            const values = data.map(d => d[cls] as number).filter(v => v > 0);
            const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
            return { cls, avg };
        });
    }, [data, selectedClasses]);

    const renderChart = () => {
        const commonProps = {
            data,
            margin: { top: 5, right: 20, left: -10, bottom: 5 },
        };

        const lines = selectedClasses.map((cls, i) => {
            if (chartType === 'bar') {
                return <Bar key={cls} dataKey={cls} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} barSize={20} />;
            }
            if (chartType === 'area') {
                return (
                    <Area
                        key={cls}
                        type="monotone"
                        dataKey={cls}
                        stroke={colors[i % colors.length]}
                        fill={colors[i % colors.length]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                );
            }
            return (
                <Line
                    key={cls}
                    type="monotone"
                    dataKey={cls}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                />
            );
        });

        const Chart = chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart;

        return (
            <ResponsiveContainer width="100%" height={380}>
                <Chart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip 
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            padding: '12px 16px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                        itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        formatter={(value: number) => [`${value}%`, '']}
                    />
                    <Legend 
                        verticalAlign="top" 
                        height={36}
                        formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{value}</span>}
                    />
                    {lines}
                </Chart>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <GitCompareArrows className="h-6 w-6 text-primary" />
                        Attendance Comparison
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Compare real attendance trends across classes and sections
                    </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                    <Download className="h-4 w-4" />
                    Export
                </Button>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
                {/* Date Range */}
                <Select value={timePeriod} onValueChange={(v: TimePeriod) => setTimePeriod(v)}>
                    <SelectTrigger className="w-36 rounded-xl bg-secondary/40 border-border/40">
                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="14">Last 14 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                    </SelectContent>
                </Select>

                {/* Chart Type */}
                <div className="flex items-center bg-secondary/40 rounded-xl p-0.5 border border-border/40">
                    {(['area', 'line', 'bar'] as ChartType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setChartType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                chartType === type 
                                    ? 'bg-primary text-primary-foreground shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-border/60 hidden sm:block" />

                {/* Class Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <Layers className="h-4 w-4 text-muted-foreground mr-1" />
                    {availableClasses.length === 0 && !loading && (
                        <span className="text-xs text-muted-foreground italic">No classes found</span>
                    )}
                    {availableClasses.map(cls => (
                        <button
                            key={cls}
                            onClick={() => toggleClass(cls)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 border ${
                                selectedClasses.includes(cls)
                                    ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                                    : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            }`}
                        >
                            {cls}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Chart Card */}
            <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Attendance Trends
                    </h3>
                    <span className="text-xs text-muted-foreground">
                        {selectedClasses.length} classes selected · Last {timePeriod} days
                    </span>
                </div>

                {loading ? (
                    <Skeleton className="h-[380px] w-full rounded-xl" />
                ) : selectedClasses.length === 0 ? (
                    <div className="h-[380px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">Select classes above to compare</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Choose up to 5 classes</p>
                        </div>
                    </div>
                ) : (
                    renderChart()
                )}
            </div>

            {/* Stats Summary Cards */}
            {averages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {averages.map(({ cls, avg }, i) => (
                        <div 
                            key={cls} 
                            className="p-4 rounded-xl bg-card border border-border/50 shadow-sm text-center group hover:border-primary/30 transition-all duration-200"
                        >
                            <div 
                                className="w-3 h-3 rounded-full mx-auto mb-2 shadow-sm"
                                style={{ backgroundColor: colors[i % colors.length] }}
                            />
                            <p className="text-xs font-medium text-muted-foreground mb-1">{cls}</p>
                            <p className="text-2xl font-bold text-foreground">{avg > 0 ? `${avg}%` : '—'}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Avg. Attendance</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
