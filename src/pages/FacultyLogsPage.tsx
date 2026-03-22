import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { SectionLoader } from '@/components/ui/LoadingState';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DEPARTMENTS } from '@/lib/constants';

interface FacultyLog {
    id: string;
    faculty_id: string;
    date: string;
    check_in: string;
    check_out: string | null;
    status: string;
    profiles: {
        full_name: string;
        dept: string;
    };
}

type Timeframe = 'today' | 'week' | 'month';
const PAGE_SIZE = 50;

export function FacultyLogsPage() {
    const { profile } = useAuth();
    
    // Data States
    const [logs, setLogs] = useState<FacultyLog[]>([]);
    const [graphLogs, setGraphLogs] = useState<any[]>([]);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    
    // Filter States
    const [timeframe, setTimeframe] = useState<Timeframe>('today');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    const isElevated = ['principal', 'management', 'developer'].includes(profile?.role || '');
    const canFilterDept = isElevated;
    const [deptFilter, setDeptFilter] = useState(isElevated ? 'All' : (profile?.dept || ''));

    // Debounce search input to avoid spamming the DB
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch data whenever filters change
    useEffect(() => {
        fetchGraphData();
        fetchLogs(true);
        
        const channel = supabase.channel('faculty-logs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_attendance_logs' }, () => {
                fetchGraphData();
                fetchLogs(true);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [timeframe, deptFilter, debouncedSearch]);

    const buildBaseQuery = (table: string, columns: string) => {
        let query = supabase.from(table).select(columns, { count: 'exact' });

        if (timeframe === 'today') {
            query = query.eq('date', format(new Date(), 'yyyy-MM-dd'));
        } else if (timeframe === 'week') {
            const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            query = query.gte('date', start).lte('date', end);
        } else {
            const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
            const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
            query = query.gte('date', start).lte('date', end);
        }

        if (deptFilter !== 'All') {
            query = query.eq('profiles.dept', deptFilter);
        }

        if (debouncedSearch.trim()) {
            query = query.ilike('profiles.full_name', `%${debouncedSearch.trim()}%`);
        }

        return query;
    };

    const fetchGraphData = async () => {
        // Lightweight query for just dates and status to build the graph
        const query = buildBaseQuery('faculty_attendance_logs', `date, status, profiles:faculty_id!inner(dept, full_name)`);
        const { data, error } = await query;
        if (!error && data) {
            setGraphLogs(data);
        }
    };

    const fetchLogs = async (reset = false) => {
        const currentPage = reset ? 0 : page;
        if (reset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        let query = buildBaseQuery('faculty_attendance_logs', `
            *,
            profiles:faculty_id!inner(full_name, dept)
        `).order('date', { ascending: false }).order('check_in', { ascending: false });

        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        
        if (!error && data) {
            const newLogs = data as unknown as FacultyLog[];
            if (reset) {
                setLogs(newLogs);
            } else {
                setLogs(prev => [...prev, ...newLogs]);
            }
            
            const totalCount = count ?? 0;
            setHasMore(totalCount > from + newLogs.length);
            setPage(currentPage + 1);
        } else if (error) {
            console.error('Error fetching paginated logs:', error);
        }
        
        setLoading(false);
        setLoadingMore(false);
    };

    const graphData = useMemo(() => {
        const days = timeframe === 'month' ? 30 : 7;
        const countsByDate: Record<string, { present: number; absent: number }> = {};
        
        for (let i = days - 1; i >= 0; i--) {
            const dStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
            countsByDate[dStr] = { present: 0, absent: 0 };
        }

        graphLogs.forEach(log => {
            if (countsByDate[log.date]) {
                if (log.status === 'present') countsByDate[log.date].present++;
                else countsByDate[log.date].absent++;
            }
        });

        return Object.keys(countsByDate).map(date => ({
            name: format(new Date(date), timeframe === 'month' ? 'dd' : 'EEE'),
            Present: countsByDate[date].present,
            Absent: countsByDate[date].absent
        }));
    }, [graphLogs, timeframe]);

    if (loading && logs.length === 0) return <SectionLoader text="Loading faculty logs..." />;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3 flex-wrap flex-1">
                    {/* Faculty Search */}
                    <div className="relative w-full max-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search faculty..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs rounded-xl"
                        />
                    </div>

                    {/* Dept Filter */}
                    <Select value={deptFilter} onValueChange={setDeptFilter} disabled={!canFilterDept}>
                        <SelectTrigger className="w-36 h-9 text-xs rounded-xl">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Depts</SelectItem>
                            {DEPARTMENTS.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Timeframe Toggle */}
                <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl backdrop-blur-sm border border-border/40 shrink-0">
                    {(['today', 'week', 'month'] as Timeframe[]).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                                timeframe === tf ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tf === 'today' ? 'Today' : tf === 'week' ? 'This Week' : 'This Month'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden flex flex-col max-h-[600px]">
                    <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
                        <div className="overflow-x-auto overflow-y-auto flex-1 p-0 m-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/60 text-xs uppercase font-bold text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 py-3">Faculty</th>
                                        <th className="px-4 py-3">Dept</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Check In</th>
                                        <th className="px-4 py-3">Check Out</th>
                                        <th className="px-4 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {logs.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-muted-foreground font-semibold">No logs found for selected filters</td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-4 py-3 font-bold">{log.profiles?.full_name || 'N/A'}</td>
                                                <td className="px-4 py-3 text-xs uppercase font-bold tracking-widest text-muted-foreground">{log.profiles?.dept || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium">{format(new Date(log.date), 'MMM do')}</td>
                                                <td className="px-4 py-3 font-medium text-emerald-600 dark:text-emerald-400">
                                                    {log.check_in ? format(new Date(log.check_in), 'h:mm a') : '-'}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-amber-600 dark:text-amber-400">
                                                    {log.check_out ? format(new Date(log.check_out), 'h:mm a') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-full ${
                                                        log.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            {/* Load More Button */}
                            {hasMore && (
                                <div className="p-4 flex justify-center border-t border-border/50 bg-card/80 sticky bottom-0 z-10">
                                    <button 
                                        onClick={() => fetchLogs(false)}
                                        disabled={loadingMore}
                                        className="px-6 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                                    >
                                        {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        {loadingMore ? 'Loading...' : 'Load More Logs'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm rounded-3xl overflow-hidden flex flex-col">
                    <CardContent className="p-6 flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }} />
                                <RechartsTooltip 
                                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontWeight: 'bold', fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                                <Bar dataKey="Present" fill="hsl(var(--primary))" radius={[4,4,0,0]} maxBarSize={30} />
                                <Bar dataKey="Absent" fill="hsl(var(--destructive))" radius={[4,4,0,0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
