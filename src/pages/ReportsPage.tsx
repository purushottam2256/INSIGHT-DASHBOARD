import { useState, useMemo } from 'react';
import { 
    FileSpreadsheet, Download, Filter, Users,
    BarChart3, Loader2, Printer, Search, RotateCcw, Briefcase, Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import { DEPARTMENTS, YEARS } from '@/lib/constants';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ReportType = 'attendance' | 'workload' | 'leaves' | 'performance';


interface MatrixRow {
    classLabel: string;
    dept: string;
    year: number;
    section: string;
    dateValues: Record<string, number>; // date -> percentage
    average: number;
}



interface WorkloadRow {
    faculty: string;
    dept: string;
    totalSlots: number;
    subjects: string[];
    classes: string[];
}

interface PerformanceRow {
    classLabel: string;
    dept: string;
    year: number;
    section: string;
    totalSessions: number;
    avgAttendance: number;
    bestDay: string;
    worstDay: string;
}

interface LeaveRow {
    faculty: string;
    dept: string;
    totalLeaves: number;
    approved: number;
    rejected: number;
    pending: number;
}

export function ReportsPage() {
    const { role, dept: userDept } = useUserRole();
    const [reportType, setReportType] = useState<ReportType>('attendance');
    const [loading, setLoading] = useState(false);
    const [dept, setDept] = useState(userDept || 'all');
    const [year, setYear] = useState('all');
    const [section, setSection] = useState('all');
    const [session, setSession] = useState('all');
    const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));


    const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
    const SESSIONS = [
        { value: 'all', label: 'All Sessions' },
        { value: 'fn', label: 'FN — Forenoon (P1)' },
        { value: 'an', label: 'AN — Afternoon (P4)' },
    ];


    const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
    const [matrixDates, setMatrixDates] = useState<string[]>([]);

    const [leaveData, setLeaveData] = useState<LeaveRow[]>([]);
    const [workloadData, setWorkloadData] = useState<WorkloadRow[]>([]);
    const [performanceData, setPerformanceData] = useState<PerformanceRow[]>([]);

    const isDeptLocked = !['principal', 'management', 'developer', 'admin'].includes(role || '');

    const filteredDepartments = useMemo(() => {
        if (isDeptLocked && userDept) {
            return DEPARTMENTS.filter(d => d.value.toLowerCase() === userDept.toLowerCase());
        }
        return DEPARTMENTS;
    }, [isDeptLocked, userDept]);

    const generateReport = async () => {
        setLoading(true);
        try {
            if (reportType === 'attendance') {
                let query = supabase
                    .from('attendance_sessions')
                    .select('date, target_dept, target_year, target_section, total_students, present_count, absent_count, od_count, slot_id')
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: true });

                if (dept !== 'all') query = query.eq('target_dept', dept);
                if (year !== 'all') query = query.eq('target_year', parseInt(year));
                if (section !== 'all') query = query.eq('target_section', section);

                // Filter by session (slot_id)
                if (session === 'fn') query = query.eq('slot_id', 'p1');
                else if (session === 'an') query = query.eq('slot_id', 'p4');

                const { data, error } = await query;
                if (error) throw error;

                // Aggregate by class + date
                const aggMap = new Map<string, Map<string, { present: number; absent: number; od: number; total: number }>>(); 
                const dateSet = new Set<string>();

                (data || []).forEach((s: any) => {
                    const classLabel = `${s.target_dept}-${s.target_year}${s.target_section}`;
                    const dateStr = s.date;
                    dateSet.add(dateStr);

                    if (!aggMap.has(classLabel)) aggMap.set(classLabel, new Map());
                    const classMap = aggMap.get(classLabel)!;

                    if (!classMap.has(dateStr)) {
                        classMap.set(dateStr, { present: 0, absent: 0, od: 0, total: 0 });
                    }
                    const entry = classMap.get(dateStr)!;
                    entry.present += s.present_count || 0;
                    entry.absent += s.absent_count || 0;
                    entry.od += s.od_count || 0;
                    entry.total += s.total_students || 0;
                });

                // Build sorted dates
                const sortedDates = Array.from(dateSet).sort();
                setMatrixDates(sortedDates);

                // Build matrix rows
                const rows: MatrixRow[] = [];
                aggMap.forEach((classMap, classLabel) => {
                    const parts = classLabel.match(/^(.+)-(\d)(\w)$/);
                    const dateValues: Record<string, number> = {};
                    let totalPct = 0;
                    let daysWithData = 0;

                    sortedDates.forEach(d => {
                        const entry = classMap.get(d);
                        if (entry && entry.total > 0) {
                            const pct = Math.round(((entry.present + entry.od) / entry.total) * 100);
                            dateValues[d] = pct;
                            totalPct += pct;
                            daysWithData++;
                        } else {
                            dateValues[d] = -1; // no data
                        }
                    });

                    rows.push({
                        classLabel,
                        dept: parts ? parts[1] : classLabel,
                        year: parts ? parseInt(parts[2]) : 0,
                        section: parts ? parts[3] : '',
                        dateValues,
                        average: daysWithData > 0 ? Math.round(totalPct / daysWithData) : 0,
                    });
                });

                rows.sort((a, b) => a.classLabel.localeCompare(b.classLabel));
                setMatrixData(rows);


            } else if (reportType === 'workload') {
                // Faculty Workload from master_timetables
                let query = supabase.from('master_timetables').select('faculty_id, dept, year, section, subjects:subject_id(name, code, acronym), profiles:faculty_id(full_name, dept)');
                if (dept !== 'all') query = query.eq('dept', dept);
                const { data, error } = await query;
                if (error) throw error;
                const map = new Map<string, WorkloadRow>();
                (data || []).forEach((t: any) => {
                    const key = t.faculty_id;
                    if (!map.has(key)) map.set(key, { faculty: t.profiles?.full_name || 'Unknown', dept: t.profiles?.dept || '-', totalSlots: 0, subjects: [], classes: [] });
                    const entry = map.get(key)!;
                    entry.totalSlots++;
                    const subj = t.subjects?.acronym || t.subjects?.code || '?';
                    const cls = `${t.dept}-${t.year}${t.section}`;
                    if (!entry.subjects.includes(subj)) entry.subjects.push(subj);
                    if (!entry.classes.includes(cls)) entry.classes.push(cls);
                });
                setWorkloadData(Array.from(map.values()).sort((a, b) => b.totalSlots - a.totalSlots));
            } else if (reportType === 'performance') {
                // Class Performance from attendance_sessions
                let query = supabase.from('attendance_sessions').select('date, target_dept, target_year, target_section, total_students, present_count, od_count').gte('date', startDate).lte('date', endDate);
                if (dept !== 'all') query = query.eq('target_dept', dept);
                if (year !== 'all') query = query.eq('target_year', parseInt(year));
                const { data, error } = await query;
                if (error) throw error;
                const map = new Map<string, { totPct: number; count: number; dayMap: Map<string, { pct: number; count: number }>; dept: string; year: number; section: string }>();
                (data || []).forEach((s: any) => {
                    const key = `${s.target_dept}-${s.target_year}${s.target_section}`;
                    if (!map.has(key)) map.set(key, { totPct: 0, count: 0, dayMap: new Map(), dept: s.target_dept, year: s.target_year, section: s.target_section });
                    const entry = map.get(key)!;
                    const pct = s.total_students > 0 ? ((s.present_count + (s.od_count || 0)) / s.total_students) * 100 : 0;
                    entry.totPct += pct; entry.count++;
                    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(s.date).getDay()];
                    if (!entry.dayMap.has(dayName)) entry.dayMap.set(dayName, { pct: 0, count: 0 });
                    const d = entry.dayMap.get(dayName)!; d.pct += pct; d.count++;
                });
                const rows: PerformanceRow[] = [];
                map.forEach((v, k) => {
                    let bestDay = '-', worstDay = '-', bestPct = -1, worstPct = 101;
                    v.dayMap.forEach((dv, dn) => { const avg = dv.pct / dv.count; if (avg > bestPct) { bestPct = avg; bestDay = dn; } if (avg < worstPct) { worstPct = avg; worstDay = dn; } });
                    rows.push({ classLabel: k, dept: v.dept, year: v.year, section: v.section, totalSessions: v.count, avgAttendance: Math.round(v.totPct / v.count), bestDay: `${bestDay} (${Math.round(bestPct)}%)`, worstDay: `${worstDay} (${Math.round(worstPct)}%)` });
                });
                setPerformanceData(rows.sort((a, b) => b.avgAttendance - a.avgAttendance));
            } else if (reportType === 'leaves') {
                const { data, error } = await supabase
                    .from('leaves')
                    .select('user_id, status, profiles:user_id(full_name, dept)')
                    .gte('start_date', startDate)
                    .lte('start_date', endDate);

                if (error) throw error;

                const map = new Map<string, LeaveRow>();
                (data || []).forEach((l: any) => {
                    const key = l.user_id;
                    if (!map.has(key)) {
                        map.set(key, {
                            faculty: l.profiles?.full_name || 'Unknown',
                            dept: l.profiles?.dept || '-',
                            totalLeaves: 0,
                            approved: 0,
                            rejected: 0,
                            pending: 0,
                        });
                    }
                    const entry = map.get(key)!;
                    entry.totalLeaves++;
                    if (l.status === 'approved' || l.status === 'accepted') entry.approved++;
                    else if (l.status === 'rejected' || l.status === 'declined') entry.rejected++;
                    else entry.pending++;
                });
                setLeaveData(Array.from(map.values()).sort((a, b) => b.totalLeaves - a.totalLeaves));
            }
        } catch (err: any) {
            console.error('Report generation error:', err);
            toast.error('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        let csv = '';
        let filename = '';

        if (reportType === 'attendance') {
            csv = `Class,${matrixDates.map(d => format(new Date(d), 'dd/MM')).join(',')},Average\n`;
            matrixData.forEach(r => {
                const vals = matrixDates.map(d => r.dateValues[d] >= 0 ? `${r.dateValues[d]}%` : '-').join(',');
                csv += `${r.classLabel},${vals},${r.average}%\n`;
            });
            filename = `institutional_attendance_${session === 'fn' ? 'FN' : session === 'an' ? 'AN' : 'ALL'}_${startDate}_to_${endDate}.csv`;
        } else if (reportType === 'workload') {
            csv = 'Faculty,Dept,Total Slots/Week,Subjects,Classes\n';
            workloadData.forEach(r => {
                csv += `${r.faculty},${r.dept},${r.totalSlots},"${r.subjects.join('; ')}","${r.classes.join('; ')}"\n`;
            });
            filename = `faculty_workload.csv`;
        } else if (reportType === 'performance') {
            csv = 'Class,Dept,Year,Section,Sessions,Avg %,Best Day,Worst Day\n';
            performanceData.forEach(r => {
                csv += `${r.classLabel},${r.dept},${r.year},${r.section},${r.totalSessions},${r.avgAttendance}%,${r.bestDay},${r.worstDay}\n`;
            });
            filename = `class_performance_${startDate}_to_${endDate}.csv`;
        } else {
            csv = 'Faculty,Dept,Total Leaves,Approved,Rejected,Pending\n';
            leaveData.forEach(r => {
                csv += `${r.faculty},${r.dept},${r.totalLeaves},${r.approved},${r.rejected},${r.pending}\n`;
            });
            filename = `leave_summary_${startDate}_to_${endDate}.csv`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const hasData = reportType === 'attendance' ? matrixData.length > 0
        : reportType === 'workload' ? workloadData.length > 0
        : reportType === 'performance' ? performanceData.length > 0
        : leaveData.length > 0;

    const reportTabs = [
        { key: 'attendance' as ReportType, label: 'Attendance Register', icon: BarChart3 },
        { key: 'leaves' as ReportType, label: 'Leave Summary', icon: Users },
        { key: 'workload' as ReportType, label: 'Faculty Workload', icon: Briefcase },
        { key: 'performance' as ReportType, label: 'Class Performance', icon: Trophy },
    ];

    return (
        <div className="space-y-6">
            {/* Report Type Tabs */}
            <div className="flex p-1 bg-secondary/60 dark:bg-secondary/30 rounded-xl w-full max-w-lg">
                {reportTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setReportType(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                reportType === tab.key
                                    ? 'bg-card text-primary shadow-md ring-1 ring-border/30'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters Card */}
            <Card className="border-border/40 shadow-lg bg-card/80 dark:bg-card/60 backdrop-blur-xl">
                <CardHeader className="pb-3 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Filter className="h-4 w-4 text-primary" />
                        Report Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">From</label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs h-9" />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">To</label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs h-9" />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Department</label>
                            <Select value={dept} onValueChange={setDept} disabled={isDeptLocked}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {!isDeptLocked && <SelectItem value="all">All Depts</SelectItem>}
                                    {filteredDepartments.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Year</label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {YEARS.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Section</label>
                            <Select value={section} onValueChange={setSection}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sections</SelectItem>
                                    {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {reportType === 'attendance' && (
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Session</label>
                                <Select value={session} onValueChange={setSession}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SESSIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <Button
                            onClick={generateReport}
                            disabled={loading}
                            className="h-9 bg-gradient-to-r from-primary to-amber-500 text-white shadow-md gap-1.5"
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                            Generate
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => { setMatrixData([]); setMatrixDates([]); setLeaveData([]); setWorkloadData([]); setPerformanceData([]); setDept(userDept || 'all'); setYear('all'); setSection('all'); setSession('all'); setStartDate(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); }}
                            className="h-9 gap-1.5 text-xs"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            {hasData && (
                <Card className="border-border/40 shadow-lg bg-card/80 dark:bg-card/60 backdrop-blur-xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20 flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                            {reportType === 'attendance' ? 'Institutional Attendance Matrix' : 'Results'}
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                {reportType === 'attendance' ? `${matrixData.length} classes × ${matrixDates.length} days` : reportType === 'workload' ? `${workloadData.length} faculty` : reportType === 'performance' ? `${performanceData.length} classes` : `${leaveData.length} rows`}
                            </span>
                            {reportType === 'attendance' && session !== 'all' && (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                                    {session === 'fn' ? 'FN (P1)' : 'AN (P4)'}
                                </span>
                            )}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs h-8 gap-1.5">
                                <Download className="h-3.5 w-3.5" /> CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs h-8 gap-1.5">
                                <Printer className="h-3.5 w-3.5" /> Print
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            {reportType === 'attendance' && matrixData.length > 0 && (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/30">
                                            <th className="px-3 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/30 z-10 min-w-[100px]">Class</th>
                                            {matrixDates.map(d => (
                                                <th key={d} className="px-2 py-2.5 text-center font-bold text-muted-foreground uppercase tracking-wider min-w-[55px]">
                                                    {format(new Date(d), 'dd/MM')}
                                                </th>
                                            ))}
                                            <th className="px-3 py-2.5 text-center font-bold text-primary uppercase tracking-wider min-w-[60px] bg-primary/5">Avg</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrixData.map((row, i) => (
                                            <tr key={i} className="border-b border-border/10 hover:bg-accent/20 transition-colors">
                                                <td className="px-3 py-2 font-bold text-foreground sticky left-0 bg-card z-10 border-r border-border/20">{row.classLabel}</td>
                                                {matrixDates.map(d => {
                                                    const val = row.dateValues[d];
                                                    const colorClass = val < 0 ? 'text-muted-foreground/40' : val >= 75 ? 'text-emerald-600' : val >= 65 ? 'text-amber-600' : 'text-red-500';
                                                    return (
                                                        <td key={d} className={`px-2 py-2 text-center font-bold ${colorClass}`}>
                                                            {val < 0 ? '—' : `${val}%`}
                                                        </td>
                                                    );
                                                })}
                                                <td className={`px-3 py-2 text-center font-extrabold bg-primary/5 ${row.average >= 75 ? 'text-emerald-600' : row.average >= 65 ? 'text-amber-600' : row.average > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                    {row.average > 0 ? `${row.average}%` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-primary/5 border-t-2 border-primary/20">
                                            <td className="px-3 py-2.5 font-extrabold text-primary sticky left-0 bg-primary/5 z-10">INSTITUTIONAL AVG</td>
                                            {matrixDates.map(d => {
                                                const vals = matrixData.map(r => r.dateValues[d]).filter(v => v >= 0);
                                                const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : -1;
                                                const colorClass = avg < 0 ? 'text-muted-foreground/40' : avg >= 75 ? 'text-emerald-600' : avg >= 65 ? 'text-amber-600' : 'text-red-500';
                                                return (
                                                    <td key={d} className={`px-2 py-2.5 text-center font-extrabold ${colorClass}`}>
                                                        {avg < 0 ? '—' : `${avg}%`}
                                                    </td>
                                                );
                                            })}
                                            {(() => {
                                                const allAvgs = matrixData.map(r => r.average).filter(v => v > 0);
                                                const instAvg = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : 0;
                                                return (
                                                    <td className={`px-3 py-2.5 text-center font-extrabold bg-primary/10 ${instAvg >= 75 ? 'text-emerald-600' : instAvg >= 65 ? 'text-amber-600' : instAvg > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                        {instAvg > 0 ? `${instAvg}%` : '—'}
                                                    </td>
                                                );
                                            })()}
                                        </tr>
                                    </tfoot>
                                </table>
                            )}

                            {reportType === 'workload' && workloadData.length > 0 && (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/30">
                                            {['Faculty', 'Dept', 'Slots/Week', 'Subjects', 'Classes'].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workloadData.map((row, i) => (
                                            <tr key={i} className="border-b border-border/10 hover:bg-accent/20 transition-colors">
                                                <td className="px-3 py-2 font-medium text-foreground">{row.faculty}</td>
                                                <td className="px-3 py-2">{row.dept}</td>
                                                <td className="px-3 py-2 font-bold text-primary">{row.totalSlots}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{row.subjects.join(', ')}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{row.classes.join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {reportType === 'performance' && performanceData.length > 0 && (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/30">
                                            {['Class', 'Sessions', 'Avg %', 'Best Day', 'Worst Day'].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performanceData.map((row, i) => (
                                            <tr key={i} className="border-b border-border/10 hover:bg-accent/20 transition-colors">
                                                <td className="px-3 py-2 font-bold text-foreground">{row.classLabel}</td>
                                                <td className="px-3 py-2">{row.totalSessions}</td>
                                                <td className={`px-3 py-2 font-bold ${row.avgAttendance >= 75 ? 'text-emerald-600' : row.avgAttendance >= 65 ? 'text-amber-600' : 'text-red-500'}`}>{row.avgAttendance}%</td>
                                                <td className="px-3 py-2 text-emerald-600">{row.bestDay}</td>
                                                <td className="px-3 py-2 text-red-500">{row.worstDay}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}



                            {reportType === 'leaves' && (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/30">
                                            {['Faculty', 'Dept', 'Total', 'Approved', 'Rejected', 'Pending'].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaveData.map((row, i) => (
                                            <tr key={i} className="border-b border-border/10 hover:bg-accent/20 transition-colors">
                                                <td className="px-3 py-2 font-medium text-foreground">{row.faculty}</td>
                                                <td className="px-3 py-2">{row.dept}</td>
                                                <td className="px-3 py-2 font-bold">{row.totalLeaves}</td>
                                                <td className="px-3 py-2 text-emerald-600 font-bold">{row.approved}</td>
                                                <td className="px-3 py-2 text-red-500 font-bold">{row.rejected}</td>
                                                <td className="px-3 py-2 text-amber-500 font-bold">{row.pending}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty state when no data generated yet */}
            {!hasData && !loading && (
                <div className="text-center py-16 text-muted-foreground">
                    <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No Report Generated</h3>
                    <p className="text-sm">Select filters and click "Generate" to create a report.</p>
                </div>
            )}
        </div>
    );
}
