import { useState, useMemo, useEffect } from "react"
import { format } from "date-fns"
import { RefreshCw, BarChart3 } from "lucide-react" 
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { useUserRole } from "@/hooks/useUserRole"
import { AttendanceStat, Timeframe, ClassSession } from '@/types/dashboard';

import { DEPARTMENTS, YEARS, SECTIONS } from "@/lib/constants"

interface AttendanceAnalyticsProps {
    stats: AttendanceStat[];
    sessions?: ClassSession[];
    onFilterChange?: (filters: any) => void;
    loading?: boolean;
}

const AttendanceAnalytics = ({ sessions = [], onFilterChange, loading }: AttendanceAnalyticsProps) => {
    const { role, dept: userDept } = useUserRole();
    
    // State for filters
    const [timeframe, setTimeframe] = useState<Timeframe>("week");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [year, setYear] = useState<string>("all-years");
    const [section, setSection] = useState<string>("all-sections");
    const [batch, setBatch] = useState<string>("all-batches");
    const [dept, setDept] = useState<string>("all-dept");
    const [period, setPeriod] = useState<string>("all-periods"); // Default to All Periods

    // 1. Memoize filtered departments
    const filteredDepartments = useMemo(() => {
        if (role === 'hod' && userDept) {
             const cleanUserDept = userDept.trim().toLowerCase();
             return DEPARTMENTS.filter(d => d.value.toLowerCase() === cleanUserDept);
        }
        return DEPARTMENTS;
    }, [role, userDept]);

    // 2. Enforce HOD Selection
    useEffect(() => {
        if (role === 'hod' && userDept) {
            const cleanUserDept = userDept.trim().toLowerCase();
            const validDept = DEPARTMENTS.find(d => d.value.toLowerCase() === cleanUserDept);
            
            if (validDept) {
                setDept(validDept.value);
            }
        }
    }, [role, userDept]);

    // Notify Parent
    useEffect(() => {
        if (onFilterChange) {
            const isAllClasses = (year === "all-years" || section === "all-sections");
            const groupBy = isAllClasses ? 'class' : 'time';
            
            const activePeriod = (timeframe === 'day' && period !== 'all-periods') ? period : null;

            onFilterChange({
                timeframe,
                date,
                year: year === "all-years" ? null : year,
                section: section === "all-sections" ? null : section,
                batch: batch === "all-batches" ? null : batch,
                dept: dept === "all-dept" ? null : dept,
                groupBy,
                period: activePeriod 
            });
        }
    }, [timeframe, date, year, section, batch, dept, period]);

    const isDeptLocked = !['principal', 'management', 'developer', 'admin'].includes(role || '');

    const handleRefresh = () => {
        setTimeframe("week");
        setDate(new Date());
        setYear("all-years");
        setSection("all-sections");
        setBatch("all-batches");
        setPeriod("all-periods");
        if (!isDeptLocked) setDept("all-dept");
    };

    // --- CHART DATA PREPARATION ---
    const lineChartData = useMemo(() => {
        if (!sessions) return { data: [], lines: [] };

        const groupedData = new Map<string, any>();
        const allClassNames = new Set<string>();

        if (timeframe === 'month') {
             for(let i=1; i<=5; i++) {
                 const key = `Week ${i}`;
                 groupedData.set(key, { name: key });
             }
        } else if (timeframe === 'week') {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach(d => groupedData.set(d, { name: d }));
        } else if (timeframe === 'semester') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            months.forEach(m => groupedData.set(m, { name: m }));
        }

        sessions.forEach(s => {
            if (!s.date) return;
            
            let timeKey = '';
            if (timeframe === 'week') timeKey = format(new Date(s.date), 'EEE'); 
            else if (timeframe === 'month') {
                const d = new Date(s.date);
                const day = d.getDate();
                const weekNum = Math.ceil(day / 7);
                timeKey = `Week ${weekNum}`;
            } else if (timeframe === 'semester') {
                timeKey = format(new Date(s.date), 'MMM');
            }

            let cleanSection = s.target_section.replace(new RegExp(s.target_dept, 'gi'), '')
                                              .replace(new RegExp(s.target_year.toString(), 'gi'), '')
                                              .replace(/[^a-zA-Z0-9]/g, '');
            
            if (!cleanSection) cleanSection = s.target_section;

            const className = `${s.target_year}-${s.target_dept}-${cleanSection}`.toLowerCase();
            allClassNames.add(className);

            if (!groupedData.has(timeKey)) groupedData.set(timeKey, { name: timeKey });
            
            const entry = groupedData.get(timeKey);
            
            if (!entry[`${className}_count`]) entry[`${className}_count`] = 0;
            if (!entry[`${className}_total`]) entry[`${className}_total`] = 0;

            entry[`${className}_count`] += (s.present_count || 0);
            entry[`${className}_total`] += (s.total_students || 0);

            if (entry[`${className}_total`] > 0) {
                entry[className] = Number(((entry[`${className}_count`] / entry[`${className}_total`]) * 100).toFixed(1));
            } else {
                entry[className] = 0;
            }
        });

        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const result = Array.from(groupedData.values())
            .filter(() => true)
            .sort((a, b) => {
                if (timeframe === 'week') return dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name);
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });
        
        return { data: result, lines: Array.from(allClassNames) };
    }, [sessions, timeframe]);

    const filteredSections = useMemo(() => {
        const isCSE = dept === 'CSE';
        const isAll = dept === 'all-dept';
        
        if (isAll || isCSE) {
            return SECTIONS;
        }
        return SECTIONS.filter(s => ['A', 'B', 'C'].includes(s));
    }, [dept]);

    return (
        <Card className="col-span-1 bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] h-full flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300 z-10 group/analytics">
            <CardHeader className="pb-4 pt-5 space-y-4 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                     <div className="flex items-center gap-3">
                         <div className="p-2 rounded-[10px] bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20">
                             <BarChart3 className="h-4 w-4" />
                         </div>
                         <div>
                             <CardTitle className="text-[17px] font-black tracking-tight text-foreground">
                                 Trend Pulse
                             </CardTitle>
                             <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">Attendance Analytics</p>
                         </div>
                     </div>

                     {/* Filters aligned right on desktop */}
                     <div className="flex flex-col gap-2.5 w-full md:w-auto">
                        <div className="flex items-center gap-2 self-end">
                            <div className="flex p-1 bg-background/50 dark:bg-black/20 rounded-xl backdrop-blur-md border border-border/40 shadow-inner">
                                {(['week', 'month', 'semester'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeframe(t as Timeframe)}
                                        className={cn(
                                            "px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-300 capitalize",
                                            timeframe === t 
                                                ? "bg-white dark:bg-card text-primary shadow-sm ring-1 ring-border/20" 
                                                : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/50"
                                        )}
                                    >
                                        {t === 'semester' ? 'Sem' : t}
                                    </button>
                                ))}
                            </div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={handleRefresh} 
                                className="h-8 w-8 rounded-xl border-border/40 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all font-bold shadow-sm"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { 
                                    value: (role === 'hod' && filteredDepartments.length === 1) 
                                           ? filteredDepartments[0].value 
                                           : (dept || 'all-dept'), 
                                    onChange: setDept, 
                                    placeholder: 'Dept', 
                                    options: filteredDepartments, 
                                    disabled: isDeptLocked, 
                                    allLabel: 'All Depts',
                                    disableAll: role === 'hod' && filteredDepartments.length === 1
                                },
                                { value: year || 'all-years', onChange: setYear, placeholder: 'Year', options: YEARS, allLabel: 'All Years' },
                                { value: section || 'all-sections', onChange: setSection, placeholder: 'Section', options: filteredSections.map(s => ({ value: s, label: s })), allLabel: 'All Sections' }
                            ].map((filter, i) => (
                                 <Select key={i} value={filter.value} onValueChange={filter.onChange} disabled={filter.disabled}>
                                <SelectTrigger className="h-[30px] text-[11px] font-bold border-border/40 bg-background/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-foreground backdrop-blur-md shadow-sm rounded-lg ring-inset focus:ring-1 focus:ring-primary/40 focus:border-primary/40">
                                        <SelectValue placeholder={filter.placeholder} />
                                    </SelectTrigger>
                                    <SelectContent className="backdrop-blur-2xl bg-popover/90 dark:bg-popover/80 border-border/40 rounded-xl shadow-xl">
                                        {!filter.disableAll && (
                                            <SelectItem value={filter.value.startsWith('all') ? filter.value : `all-${filter.placeholder.toLowerCase()}s`} className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">
                                                {filter.allLabel}
                                            </SelectItem>
                                        )}
                                        {filter.options.map((opt: any) => <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ))}
                        </div>
                     </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-5 min-h-[300px] relative">
                  {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20 transition-all duration-300">
                             <div className="p-3 bg-card rounded-2xl shadow-xl border border-border/50">
                                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                             </div>
                        </div>
                    )}

                  <ResponsiveContainer width="100%" height="100%">
                        {lineChartData.data && lineChartData.data.length > 0 && lineChartData.lines.length > 0 ? (
                            <LineChart data={lineChartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 600 }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} 
                                    cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-popover/90 dark:bg-popover/80 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 min-w-[160px]">
                                                    <p className="text-[11px] font-black uppercase tracking-widest mb-3 text-foreground border-b border-border/50 pb-2">{label}</p>
                                                    <div className="space-y-2">
                                                        {payload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center justify-between gap-4 text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-background/20 shadow-sm" style={{ backgroundColor: entry.color }} />
                                                                    <span className="text-muted-foreground font-semibold uppercase tracking-wider">{entry.name}:</span>
                                                                </div>
                                                                <span className="font-bold text-foreground tabular-nums bg-secondary/50 px-1.5 py-0.5 rounded-md">{entry.value}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend verticalAlign="top" height={40} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}/>
                                {lineChartData.lines.map((className, index) => (
                                    <Line 
                                        key={className}
                                        type="monotone" 
                                        dataKey={className} 
                                        stroke={`hsl(${(index * 45) % 360}, 85%, 55%)`} 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: `hsl(${(index * 45) % 360}, 85%, 55%)`, strokeWidth: 2, stroke: 'var(--background)' }}
                                        activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--background)' }}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    />
                                ))}
                            </LineChart>
                        ) : <div className="flex flex-col h-full items-center justify-center text-muted-foreground/60 text-sm">
                            <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-semibold tracking-tight">No trend data available</p>
                        </div>}
                  </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default AttendanceAnalytics;
