import { useState, useMemo } from 'react';
import { 
    FileSpreadsheet, Download, Filter, Users, AlertTriangle,
    BarChart3, Loader2, Printer, Search
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

type ReportType = 'attendance' | 'defaulters' | 'leaves';

interface AttendanceRow {
    date: string;
    dept: string;
    year: number;
    section: string;
    subject: string;
    faculty: string;
    present: number;
    absent: number;
    od: number;
    total: number;
    percentage: number;
}

interface DefaulterRow {
    rollNo: string;
    name: string;
    dept: string;
    year: number;
    section: string;
    totalClasses: number;
    attended: number;
    percentage: number;
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
    const [section] = useState('all');
    const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [threshold, setThreshold] = useState(75);

    const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
    const [defaulterData, setDefaulterData] = useState<DefaulterRow[]>([]);
    const [leaveData, setLeaveData] = useState<LeaveRow[]>([]);

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
                    .select('*, subjects(name, code), profiles!attendance_sessions_faculty_id_fkey(full_name)')
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false });

                if (dept !== 'all') query = query.eq('target_dept', dept);
                if (year !== 'all') query = query.eq('target_year', parseInt(year));
                if (section !== 'all') query = query.eq('target_section', section);

                const { data, error } = await query;
                if (error) throw error;

                const rows: AttendanceRow[] = (data || []).map((s: any) => ({
                    date: format(new Date(s.date), 'dd/MM/yyyy'),
                    dept: s.target_dept,
                    year: s.target_year,
                    section: s.target_section,
                    subject: s.subjects?.name || s.subjects?.code || '-',
                    faculty: s.profiles?.full_name || '-',
                    present: s.present_count || 0,
                    absent: s.absent_count || 0,
                    od: s.od_count || 0,
                    total: s.total_students || 0,
                    percentage: s.total_students > 0
                        ? Math.round(((s.present_count || 0) + (s.od_count || 0)) / s.total_students * 100)
                        : 0,
                }));
                setAttendanceData(rows);
            } else if (reportType === 'defaulters') {
                // Aggregate per-student attendance
                const { data, error } = await supabase.rpc('get_student_attendance_summary', {
                    start_date_param: startDate,
                    end_date_param: endDate,
                });
                if (error) {
                    // Fallback: show empty with instructions
                    console.warn('RPC not found — defaulter report needs a DB function. Showing placeholder.');
                    setDefaulterData([]);
                    return;
                }
                const rows: DefaulterRow[] = (data || [])
                    .filter((s: any) => s.percentage < threshold)
                    .map((s: any) => ({
                        rollNo: s.roll_no,
                        name: s.full_name,
                        dept: s.dept,
                        year: s.year,
                        section: s.section,
                        totalClasses: s.total_classes,
                        attended: s.attended,
                        percentage: s.percentage,
                    }));
                setDefaulterData(rows);
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
            csv = 'Date,Dept,Year,Section,Subject,Faculty,Present,Absent,OD,Total,%\n';
            attendanceData.forEach(r => {
                csv += `${r.date},${r.dept},${r.year},${r.section},${r.subject},${r.faculty},${r.present},${r.absent},${r.od},${r.total},${r.percentage}%\n`;
            });
            filename = `attendance_report_${startDate}_to_${endDate}.csv`;
        } else if (reportType === 'defaulters') {
            csv = 'Roll No,Name,Dept,Year,Section,Total Classes,Attended,%\n';
            defaulterData.forEach(r => {
                csv += `${r.rollNo},${r.name},${r.dept},${r.year},${r.section},${r.totalClasses},${r.attended},${r.percentage}%\n`;
            });
            filename = `defaulters_below_${threshold}_percent.csv`;
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

    const hasData = reportType === 'attendance' ? attendanceData.length > 0
        : reportType === 'defaulters' ? defaulterData.length > 0
        : leaveData.length > 0;

    const reportTabs = [
        { key: 'attendance' as ReportType, label: 'Attendance Register', icon: BarChart3 },
        { key: 'defaulters' as ReportType, label: 'Defaulter List', icon: AlertTriangle },
        { key: 'leaves' as ReportType, label: 'Leave Summary', icon: Users },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary">
                    Reports & Export
                </h1>
                <p className="text-muted-foreground">
                    Generate attendance reports, defaulter lists, and leave summaries.
                </p>
            </div>

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
                        {reportType === 'defaulters' && (
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Threshold %</label>
                                <Input type="number" value={threshold} onChange={e => setThreshold(parseInt(e.target.value))} className="text-xs h-9" min={1} max={100} />
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
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            {hasData && (
                <Card className="border-border/40 shadow-lg bg-card/80 dark:bg-card/60 backdrop-blur-xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20 flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                            Results
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                {reportType === 'attendance' ? attendanceData.length : reportType === 'defaulters' ? defaulterData.length : leaveData.length} rows
                            </span>
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
                            {reportType === 'attendance' && (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/30">
                                            {['Date', 'Dept', 'Year', 'Sec', 'Subject', 'Faculty', 'Present', 'Absent', 'OD', 'Total', '%'].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceData.map((row, i) => (
                                            <tr key={i} className="border-b border-border/10 hover:bg-accent/20 transition-colors">
                                                <td className="px-3 py-2 font-medium text-foreground">{row.date}</td>
                                                <td className="px-3 py-2">{row.dept}</td>
                                                <td className="px-3 py-2">{row.year}</td>
                                                <td className="px-3 py-2">{row.section}</td>
                                                <td className="px-3 py-2 font-medium">{row.subject}</td>
                                                <td className="px-3 py-2">{row.faculty}</td>
                                                <td className="px-3 py-2 text-emerald-600 font-bold">{row.present}</td>
                                                <td className="px-3 py-2 text-red-500 font-bold">{row.absent}</td>
                                                <td className="px-3 py-2 text-amber-500 font-bold">{row.od}</td>
                                                <td className="px-3 py-2 font-bold">{row.total}</td>
                                                <td className={`px-3 py-2 font-bold ${row.percentage >= 85 ? 'text-emerald-600' : row.percentage >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {row.percentage}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {reportType === 'defaulters' && (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/30">
                                            {['Roll No', 'Name', 'Dept', 'Year', 'Sec', 'Total', 'Attended', '%'].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {defaulterData.map((row, i) => (
                                            <tr key={i} className="border-b border-border/10 hover:bg-accent/20 transition-colors">
                                                <td className="px-3 py-2 font-mono font-medium">{row.rollNo}</td>
                                                <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                                                <td className="px-3 py-2">{row.dept}</td>
                                                <td className="px-3 py-2">{row.year}</td>
                                                <td className="px-3 py-2">{row.section}</td>
                                                <td className="px-3 py-2">{row.totalClasses}</td>
                                                <td className="px-3 py-2">{row.attended}</td>
                                                <td className="px-3 py-2 text-red-500 font-bold">{row.percentage}%</td>
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
