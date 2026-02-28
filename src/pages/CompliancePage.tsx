import { useState, useEffect, useMemo } from 'react';
import { Shield, Download, Search, Calendar, Users, AlertTriangle, TrendingUp, BarChart3, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { DEPARTMENTS } from '@/lib/constants';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface StudentAttendance {
  student_id: string;
  roll_no: string;
  full_name: string;
  dept: string;
  section: string;
  year: number;
  present_sessions: number;
  absent_sessions: number;
  od_sessions: number;
  total_sessions: number;
  attendance_percentage: number;
}

type CondonationThreshold = 50 | 60 | 75;
type TabType = 'condonation' | 'eligibility' | 'naac' | 'workload';

export default function CompliancePage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<TabType>('condonation');
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>(permissions.isDeptScoped ? permissions.userDept || '' : '');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [threshold, setThreshold] = useState<CondonationThreshold>(75);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch student attendance data
  useEffect(() => {
    async function fetchStudentData() {
      setLoading(true);
      try {
        let query = supabase.from('view_student_aggregates').select('*');
        if (selectedDept) query = query.eq('dept', selectedDept);
        if (selectedYear) query = query.eq('year', parseInt(selectedYear));
        if (permissions.isDeptScoped && permissions.userDept) {
          query = query.eq('dept', permissions.userDept);
        }
        const { data, error } = await query.order('attendance_percentage', { ascending: true });
        if (error) throw error;
        setStudents((data as StudentAttendance[]) || []);
      } catch (err: any) {
        toast.error('Failed to load student data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStudentData();
  }, [selectedDept, selectedYear, permissions.isDeptScoped, permissions.userDept]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = students;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) => s.full_name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q)
      );
    }
    return result;
  }, [students, searchQuery]);

  // Condonation list
  const condonationList = useMemo(
    () => filteredStudents.filter((s) => s.attendance_percentage < threshold && s.total_sessions > 0),
    [filteredStudents, threshold]
  );

  // Eligibility stats
  const eligibilityStats = useMemo(() => {
    const withSessions = filteredStudents.filter((s) => s.total_sessions > 0);
    const eligible = withSessions.filter((s) => s.attendance_percentage >= 75);
    const notEligible = withSessions.filter((s) => s.attendance_percentage < 75);
    const condonationZone = withSessions.filter(
      (s) => s.attendance_percentage >= 65 && s.attendance_percentage < 75
    );
    return { eligible, notEligible, condonationZone, total: withSessions.length };
  }, [filteredStudents]);

  // Export to Excel
  const exportToExcel = (data: StudentAttendance[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((s) => ({
        'Roll No': s.roll_no,
        'Name': s.full_name,
        'Department': s.dept,
        'Year': s.year,
        'Section': s.section,
        'Total Classes': s.total_sessions,
        'Present': s.present_sessions,
        'Absent': s.absent_sessions,
        'OD': s.od_sessions,
        'Attendance %': s.attendance_percentage,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported successfully');
  };

  // NAAC/NBA export
  const exportNAACReport = () => {
    const deptwise = DEPARTMENTS.map((d) => {
      const deptStudents = students.filter((s) => s.dept === d.value && s.total_sessions > 0);
      const avgAttendance =
        deptStudents.length > 0
          ? deptStudents.reduce((sum, s) => sum + s.attendance_percentage, 0) / deptStudents.length
          : 0;
      const defaulters = deptStudents.filter((s) => s.attendance_percentage < 75).length;
      return {
        'Department': d.label,
        'Total Students': deptStudents.length,
        'Avg Attendance %': Math.round(avgAttendance * 100) / 100,
        'Students ≥75%': deptStudents.filter((s) => s.attendance_percentage >= 75).length,
        'Students <75%': defaulters,
        'Defaulter Rate %': deptStudents.length > 0 ? Math.round((defaulters / deptStudents.length) * 10000) / 100 : 0,
      };
    });

    const wb = XLSX.utils.book_new();

    // Sheet 1: Department Summary (NAAC Criterion 2.6)
    const ws1 = XLSX.utils.json_to_sheet(deptwise);
    XLSX.utils.book_append_sheet(wb, ws1, 'Dept Summary (Criterion 2.6)');

    // Sheet 2: Complete Student Data
    const ws2 = XLSX.utils.json_to_sheet(
      students.filter(s => s.total_sessions > 0).map((s) => ({
        'Roll No': s.roll_no,
        'Name': s.full_name,
        'Dept': s.dept,
        'Year': s.year,
        'Section': s.section,
        'Total Sessions': s.total_sessions,
        'Present': s.present_sessions,
        'Attendance %': s.attendance_percentage,
        'Status': s.attendance_percentage >= 75 ? 'Eligible' : 'Not Eligible',
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws2, 'Student Data');

    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    XLSX.writeFile(wb, `NAAC_NBA_Compliance_${month.replace(' ', '_')}.xlsx`);
    toast.success('NAAC/NBA compliance report exported');
  };

  const tabs = [
    { id: 'condonation' as TabType, label: 'Condonation List', icon: AlertTriangle },
    { id: 'eligibility' as TabType, label: '75% Eligibility', icon: TrendingUp },
    { id: 'naac' as TabType, label: 'NAAC/NBA Export', icon: FileSpreadsheet },
    { id: 'workload' as TabType, label: 'Faculty Scorecard', icon: Users },
  ];

  return (
    <div className="space-y-6 animate-fade-in">


      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {!permissions.isDeptScoped && (
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        )}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">All Years</option>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'condonation' && (
        <div className="space-y-4">
          {/* Threshold selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Threshold:</span>
            {([50, 60, 75] as CondonationThreshold[]).map((t) => (
              <button
                key={t}
                onClick={() => setThreshold(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  threshold === t
                    ? 'bg-destructive text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                &lt;{t}%
              </button>
            ))}
            <div className="ml-auto">
              <button
                onClick={() => exportToExcel(condonationList, `Condonation_Below_${threshold}`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                disabled={condonationList.length === 0}
              >
                <Download className="h-4 w-4" />
                Export ({condonationList.length})
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([50, 60, 75] as const).map((t) => {
              const count = filteredStudents.filter((s) => s.attendance_percentage < t && s.total_sessions > 0).length;
              return (
                <div key={t} className={`p-4 rounded-xl border ${threshold === t ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'} premium-glow`}>
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-sm text-muted-foreground">Students below {t}%</div>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Roll No</th>
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Dept</th>
                    <th className="text-center px-4 py-3 font-semibold">Year</th>
                    <th className="text-center px-4 py-3 font-semibold">Section</th>
                    <th className="text-center px-4 py-3 font-semibold">Total</th>
                    <th className="text-center px-4 py-3 font-semibold">Present</th>
                    <th className="text-center px-4 py-3 font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : condonationList.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No students below {threshold}% threshold</td></tr>
                  ) : (
                    condonationList.map((s, i) => (
                      <tr key={s.student_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.roll_no}</td>
                        <td className="px-4 py-3 font-medium">{s.full_name}</td>
                        <td className="px-4 py-3">{s.dept}</td>
                        <td className="px-4 py-3 text-center">{s.year}</td>
                        <td className="px-4 py-3 text-center">{s.section}</td>
                        <td className="px-4 py-3 text-center">{s.total_sessions}</td>
                        <td className="px-4 py-3 text-center">{s.present_sessions}</td>
                        <td className={`px-4 py-3 text-center font-bold ${
                          s.attendance_percentage < 50
                            ? 'text-red-500'
                            : s.attendance_percentage < 75
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}>
                          {s.attendance_percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'eligibility' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 premium-glow">
              <div className="text-3xl font-bold text-emerald-600">{eligibilityStats.eligible.length}</div>
              <div className="text-sm text-muted-foreground">Eligible (≥75%)</div>
            </div>
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 premium-glow">
              <div className="text-3xl font-bold text-red-500">{eligibilityStats.notEligible.length}</div>
              <div className="text-sm text-muted-foreground">Not Eligible (&lt;75%)</div>
            </div>
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 premium-glow">
              <div className="text-3xl font-bold text-amber-500">{eligibilityStats.condonationZone.length}</div>
              <div className="text-sm text-muted-foreground">Condonation Zone (65-75%)</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card premium-glow">
              <div className="text-3xl font-bold text-foreground">{eligibilityStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => exportToExcel(eligibilityStats.notEligible, 'Ineligible_Students')}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90"
            >
              <Download className="h-4 w-4" />
              Export Ineligible ({eligibilityStats.notEligible.length})
            </button>
            <button
              onClick={() => exportToExcel(eligibilityStats.condonationZone, 'Condonation_Zone')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-500/90"
            >
              <Download className="h-4 w-4" />
              Export Condonation Zone ({eligibilityStats.condonationZone.length})
            </button>
          </div>

          {/* Dept-wise breakdown */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="px-4 py-3 border-b border-border bg-muted/30 font-semibold">Department-wise Eligibility</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3">Department</th>
                    <th className="text-center px-4 py-3">Total</th>
                    <th className="text-center px-4 py-3">Eligible</th>
                    <th className="text-center px-4 py-3">Not Eligible</th>
                    <th className="text-center px-4 py-3">Eligibility %</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map((d) => {
                    const deptStudents = filteredStudents.filter((s) => s.dept === d.value && s.total_sessions > 0);
                    const eligible = deptStudents.filter((s) => s.attendance_percentage >= 75);
                    const pct = deptStudents.length > 0 ? Math.round((eligible.length / deptStudents.length) * 100) : 0;
                    return (
                      <tr key={d.value} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{d.label}</td>
                        <td className="px-4 py-3 text-center">{deptStudents.length}</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-medium">{eligible.length}</td>
                        <td className="px-4 py-3 text-center text-red-500 font-medium">{deptStudents.length - eligible.length}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'naac' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 glass-card">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">NAAC/NBA Compliance Report</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pre-formatted report matching NAAC Criterion 2.6 (Student Performance & Learning Outcomes)
                  and Criterion 6.5 (Internal Quality Assurance). Includes department-wise attendance analysis,
                  eligibility status, and defaulter statistics.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={exportNAACReport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Report
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Criterion 2.6 — Student Performance
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Department-wise attendance percentage</li>
                <li>• Student eligibility status (≥75%)</li>
                <li>• Defaulter counts and rates</li>
                <li>• Complete student attendance data</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Criterion 6.5 — Quality Assurance
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Attendance monitoring compliance</li>
                <li>• Faculty engagement rates</li>
                <li>• Institutional performance metrics</li>
                <li>• Monthly trend analysis</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workload' && (
        <div className="p-8 text-center text-muted-foreground rounded-xl border border-border bg-card">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Faculty Scorecard</p>
          <p className="text-sm mt-1">Faculty workload analytics will populate as attendance data accumulates.</p>
        </div>
      )}
    </div>
  );
}
