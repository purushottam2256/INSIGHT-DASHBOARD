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
    const [period, setPeriod] = useState<string>("all-periods"); // Default to All Periods for Today view

    // Debugging HOD Logic
    // console.log("AttendanceAnalytics Render:", { role, userDept, currentDeptValues: dept, filteredLength: filteredDepartments.length });

    // 1. Memoize filtered departments (Must be before useEffect)
    const filteredDepartments = useMemo(() => {
        if (role === 'hod' && userDept) {
             const cleanUserDept = userDept.trim().toLowerCase();
             return DEPARTMENTS.filter(d => d.value.toLowerCase() === cleanUserDept);
        }
        return DEPARTMENTS;
    }, [role, userDept]);

    // 2. Enforce HOD Selection (Effect)
    useEffect(() => {
        if (role === 'hod' && userDept) {
            const cleanUserDept = userDept.trim().toLowerCase();
            const validDept = DEPARTMENTS.find(d => d.value.toLowerCase() === cleanUserDept);
            
            // If we found a valid department, strictly set it
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
            
            // For Today (Day) view, user usually wants to see All Periods breakdown. 
            // If they select a specific Period in Sub-filter, we pass it.
            // For Week/Month, Period filter is usually irrelevant (aggregated by Day/Week).
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

    // 1. Line Chart Data (for Week/Month - TRENDS)
    // 1. Line Chart Data (for Week/Month - TRENDS)
    // 1. Line Chart Data (for Week/Month - TRENDS)
    const lineChartData = useMemo(() => {
        if (!sessions) return { data: [], lines: [] };

        const groupedData = new Map<string, any>();
        const allClassNames = new Set<string>();

        // Pre-fill keys to ensure continuous axis
        if (timeframe === 'month') {
             // For Month view, ensure we have Weeks 1-5 (months often span 5 weeks)
             for(let i=1; i<=5; i++) {
                 const key = `Week ${i}`;
                 groupedData.set(key, { name: key });
             }
        } else if (timeframe === 'week') {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach(d => groupedData.set(d, { name: d }));
        } else if (timeframe === 'semester') {
            // Semester: group by month name
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

            // Fix for "3-CSM-CSM-3-A" -> "3-csm-a" (Normalize)
            // 1. Clean Section: Remove Department from Section if present
            let cleanSection = s.target_section.replace(new RegExp(s.target_dept, 'gi'), '')
                                              .replace(new RegExp(s.target_year.toString(), 'gi'), '') // Remove Year too if present
                                              .replace(/[^a-zA-Z0-9]/g, ''); // Remove special chars
            
            // Fallback if section becomes empty (unlikely but safe)
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
            .filter(() => {
                // If it's a pre-filled item with no data, show 0?
                // Yes, showing 0 is better than missing axis.
                return true; 
            })
            .sort((a, b) => {
                if (timeframe === 'week') return dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name);
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });
        
        return { data: result, lines: Array.from(allClassNames) };
    }, [sessions, timeframe]);



    // Sections Filtering Logic
    const filteredSections = useMemo(() => {
        // "only cse dept has upto f other all dept have only a,b,c"
        // We assume 'all-dept' should show all options to allow filtering for CSE sections globaly if needed,
        // or strictly follow the rule that if a specific dept is not CSE, limit it.
        const isCSE = dept === 'CSE';
        const isAll = dept === 'all-dept';
        
        if (isAll || isCSE) {
            return SECTIONS; // Returns A, B, C, D...
        }
        // For other departments, limit to A, B, C
        return SECTIONS.filter(s => ['A', 'B', 'C'].includes(s));
    }, [dept]);

    return (
        <Card className="col-span-1 border-border/50 shadow-xl h-full flex flex-col overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl ring-1 ring-border/30 transition-all hover:shadow-2xl hover:bg-card/90 dark:hover:bg-card/70">
            <CardHeader className="pb-4 space-y-4 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                {/* Layer 1: Scope Filters (Top Row) */}
                <div className="flex flex-col gap-3">
                     <div className="flex items-center justify-between">
                         <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                            <div className="p-2 rounded-xl bg-primary/10 dark:bg-primary/15 text-primary backdrop-blur-sm ring-1 ring-primary/20">
                                <BarChart3 className="h-4 w-4" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                                Trend Pulse
                            </span>
                        </CardTitle>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleRefresh} 
                            className="h-8 w-8 hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors"
                        >
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>

                     <div className="grid grid-cols-3 gap-2">
                        {/* Glassy Selects */}
                        {[
                            { 
                                // Fix for HOD:
                                // Only force selection if we have successfully narrowed down to exactly 1 department.
                                // Otherwise, show current state (which might be 'all-dept' during loading)
                                value: (role === 'hod' && filteredDepartments.length === 1) 
                                       ? filteredDepartments[0].value 
                                       : (dept || 'all-dept'), 
                                onChange: setDept, 
                                placeholder: 'Dept', 
                                options: filteredDepartments, 
                                disabled: isDeptLocked, 
                                allLabel: 'All Depts',
                                // Only hide "All Depts" if we have successfully restricted the list to 1 item
                                disableAll: role === 'hod' && filteredDepartments.length === 1
                            },
                            { value: year || 'all-years', onChange: setYear, placeholder: 'Year', options: YEARS, allLabel: 'All Years' },
                            { value: section || 'all-sections', onChange: setSection, placeholder: 'Section', options: filteredSections.map(s => ({ value: s, label: s })), allLabel: 'All Sections' }
                        ].map((filter, i) => (
                             <Select key={i} value={filter.value} onValueChange={filter.onChange} disabled={filter.disabled}>
                            <SelectTrigger className="h-8 text-xs border-border/50 bg-secondary/50 dark:bg-secondary/30 hover:bg-secondary/80 dark:hover:bg-secondary/50 focus:ring-primary/30 text-foreground backdrop-blur-md">
                                    <SelectValue placeholder={filter.placeholder} />
                                </SelectTrigger>
                                <SelectContent className="backdrop-blur-xl bg-popover/95 dark:bg-popover/95 border-border/50">
                                    {/* Conditionally hide "All" option if disabled (e.g. for HOD) */}
                                    {!filter.disableAll && (
                                        <SelectItem value={filter.value.startsWith('all') ? filter.value : `all-${filter.placeholder.toLowerCase()}s`}>
                                            {filter.allLabel}
                                        </SelectItem>
                                    )}
                                    {filter.options.map((opt: any) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ))}
                    </div>
                </div>

                {/* Layer 2: Time Mode Toggle (Segmented Glass) */}
                <div className="flex items-center justify-between gap-2">
                     <div className="flex p-1 bg-secondary/60 dark:bg-secondary/30 rounded-xl w-full sm:w-auto backdrop-blur-md border border-border/30">
                        {(['week', 'month', 'semester'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t as Timeframe)}
                                className={cn(
                                    "flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 capitalize",
                                    timeframe === t 
                                        ? "bg-card dark:bg-card/80 text-primary shadow-lg shadow-primary/10 ring-1 ring-border/30" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                )}
                            >
                                {t === 'semester' ? 'Sem' : t}
                            </button>
                        ))}
                    </div>

                    {/* No sub-filter for week/month/semester — removed day-specific period filter */}
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-4 min-h-[300px] relative">
                  {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                    )}

                  {/* CHART RENDERING */}
                  <ResponsiveContainer width="100%" height="100%">
                        {/* Line Chart (Trends for Week/Month/Semester) */}
                        {lineChartData.data && lineChartData.data.length > 0 ? (
                            <LineChart data={lineChartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" opacity={0.5} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                                    cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl z-50 min-w-[150px]">
                                                    <p className="text-xs font-bold mb-3 text-white border-b border-white/10 pb-2">{label}</p>
                                                    <div className="space-y-1.5">
                                                        {payload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center justify-between gap-4 text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: entry.color }} />
                                                                    <span className="text-slate-300 font-medium capitalize">{entry.name}:</span>
                                                                </div>
                                                                <span className="font-bold text-white tabular-nums">{entry.value}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '12px' }}/>
                                {lineChartData.lines.map((className, index) => (
                                    <Line 
                                        key={className}
                                        type="monotone" 
                                        dataKey={className} 
                                        stroke={`hsl(${(index * 35) % 360}, 80%, 50%)`} 
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: `hsl(${(index * 35) % 360}, 80%, 50%)` }}
                                        activeDot={{ r: 5 }}
                                    />
                                ))}
                            </LineChart>
                        ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No trend data available</div>}
                  </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default AttendanceAnalytics;
