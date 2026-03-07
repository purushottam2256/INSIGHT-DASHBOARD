import { useState, useEffect, useMemo } from 'react';
import { Download, Search, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { DEPARTMENTS } from '@/lib/constants';
import { toast } from 'sonner';


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

type TabType = 'condonation' | 'eligibility';

export default function CompliancePage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<TabType>('condonation');
  const [selectedCard, setSelectedCard] = useState<'notEligible' | 'condonation' | 'eligible'>('condonation');
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>(permissions.isDeptScoped ? permissions.userDept || '' : '');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Condonation range (adjustable)
  const [condLower, setCondLower] = useState(50);
  const [condUpper, setCondUpper] = useState(75);
  const NOT_ELIGIBLE_THRESHOLD = 30;

  // Flat condonation fee — same for everyone in range
  const [condonationFee, setCondonationFee] = useState(5000);

  // Fee: flat for anyone in range, 0 otherwise
  const getCondonationFee = (pct: number): number => {
    if (pct >= condLower && pct < condUpper) return condonationFee;
    return 0;
  };

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

  // Condonation list (students in condonation range)
  const condonationList = useMemo(
    () => filteredStudents.filter((s) => s.attendance_percentage >= condLower && s.attendance_percentage < condUpper && s.total_sessions > 0),
    [filteredStudents, condLower, condUpper]
  );

  // Not eligible list
  const notEligibleList = useMemo(
    () => filteredStudents.filter((s) => s.attendance_percentage < NOT_ELIGIBLE_THRESHOLD && s.total_sessions > 0),
    [filteredStudents]
  );

  // Eligible list (above condonation)
  const eligibleList = useMemo(
    () => filteredStudents.filter((s) => s.attendance_percentage >= condUpper && s.total_sessions > 0),
    [filteredStudents, condUpper]
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

  // Institutional-level summary
  const institutionalSummary = useMemo(() => {
    const withSessions = students.filter(s => s.total_sessions > 0);
    const totalStudents = withSessions.length;
    const avgAttendance = totalStudents > 0
      ? Math.round(withSessions.reduce((sum, s) => sum + s.attendance_percentage, 0) / totalStudents)
      : 0;
    const eligibleCount = withSessions.filter(s => s.attendance_percentage >= 75).length;
    const passRate = totalStudents > 0 ? Math.round((eligibleCount / totalStudents) * 100) : 0;
    const criticalCount = withSessions.filter(s => s.attendance_percentage < 50).length;
    return { totalStudents, avgAttendance, eligibleCount, passRate, criticalCount };
  }, [students]);

  // Export to Excel (CSV fallback)
  const exportToExcel = (data: StudentAttendance[], filename: string) => {
    let csv = 'Roll No,Name,Department,Year,Section,Total Classes,Present,Absent,OD,Attendance %\n';
    data.forEach(s => {
      csv += `${s.roll_no},${s.full_name},${s.dept},${s.year},${s.section},${s.total_sessions},${s.present_sessions},${s.absent_sessions},${s.od_sessions},${s.attendance_percentage}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const tabs = [
    { id: 'condonation' as TabType, label: 'Condonation List', icon: AlertTriangle },
    { id: 'eligibility' as TabType, label: 'Department Compliance', icon: TrendingUp },
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
          {/* Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setSelectedCard('notEligible')}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${selectedCard === 'notEligible' ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/20' : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'}`}
            >
              <div className="text-2xl font-bold text-red-500">{notEligibleList.length}</div>
              <div className="text-sm text-muted-foreground">Not Eligible (&lt;{NOT_ELIGIBLE_THRESHOLD}%)</div>
              <div className="text-[10px] text-red-400 mt-1">Detained / No condonation</div>
            </div>
            <div 
              onClick={() => setSelectedCard('condonation')}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${selectedCard === 'condonation' ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20' : 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'}`}
            >
              <div className="text-2xl font-bold text-amber-600">{condonationList.length}</div>
              <div className="text-sm text-muted-foreground">Condonation ({condLower}–{condUpper}%)</div>
              <div className="text-[10px] text-amber-500 mt-1">Fee applies</div>
            </div>
            <div 
              onClick={() => setSelectedCard('eligible')}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${selectedCard === 'eligible' ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20' : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'}`}
            >
              <div className="text-2xl font-bold text-emerald-600">{eligibleList.length}</div>
              <div className="text-sm text-muted-foreground">Eligible (≥{condUpper}%)</div>
              <div className="text-[10px] text-emerald-500 mt-1">Fee: ₹0</div>
            </div>
            <button
              onClick={() => {
                const list = selectedCard === 'notEligible' ? notEligibleList : selectedCard === 'eligible' ? eligibleList : condonationList;
                exportToExcel(list, `${selectedCard}_list_${condLower}_to_${condUpper}`)
              }}
              disabled={
                (selectedCard === 'notEligible' && notEligibleList.length === 0) ||
                (selectedCard === 'condonation' && condonationList.length === 0) ||
                (selectedCard === 'eligible' && eligibleList.length === 0)
              }
              className="p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-5 w-5 text-primary" />
              <div className="text-sm font-semibold text-primary">Export CSV</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{selectedCard}</div>
            </button>
          </div>

          {/* Adjustable Range + Max Fee (Only for Condonation) */}
          {selectedCard === 'condonation' && (
          <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl bg-secondary/30 border border-border/40">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">From %</label>
              <input type="text" defaultValue={condLower} onBlur={e => { const v = parseInt(e.target.value) || 30; setCondLower(Math.max(NOT_ELIGIBLE_THRESHOLD, Math.min(v, condUpper - 1))); e.target.value = String(Math.max(NOT_ELIGIBLE_THRESHOLD, Math.min(v, condUpper - 1))); }} className="w-20 px-3 py-2 rounded-lg border border-border bg-card text-sm font-bold text-center" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">To %</label>
              <input type="text" defaultValue={condUpper} onBlur={e => { const v = parseInt(e.target.value) || 75; setCondUpper(Math.max(condLower + 1, Math.min(v, 100))); e.target.value = String(Math.max(condLower + 1, Math.min(v, 100))); }} className="w-20 px-3 py-2 rounded-lg border border-border bg-card text-sm font-bold text-center" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Fee (₹)</label>
              <input type="text" defaultValue={condonationFee} onBlur={e => { const v = parseInt(e.target.value) || 5000; setCondonationFee(Math.max(0, v)); e.target.value = String(Math.max(0, v)); }} className="w-24 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/5 text-sm font-bold text-amber-600 text-center" />
            </div>
          </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Roll No</th>
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-center px-4 py-3 font-semibold">Class</th>
                    <th className="text-center px-4 py-3 font-semibold">Total</th>
                    <th className="text-center px-4 py-3 font-semibold">Present</th>
                    <th className="text-center px-4 py-3 font-semibold">%</th>
                    {selectedCard === 'condonation' && <th className="text-center px-4 py-3 font-semibold">Fee</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={selectedCard === 'condonation' ? 8 : 7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : (
                    (selectedCard === 'notEligible' && notEligibleList.length === 0) ||
                    (selectedCard === 'condonation' && condonationList.length === 0) ||
                    (selectedCard === 'eligible' && eligibleList.length === 0)
                  ) ? (
                    <tr><td colSpan={selectedCard === 'condonation' ? 8 : 7} className="text-center py-8 text-muted-foreground">No students found in this category</td></tr>
                  ) : (
                    (selectedCard === 'notEligible' ? notEligibleList : selectedCard === 'eligible' ? eligibleList : condonationList).map((s, i) => {
                      const fee = getCondonationFee(s.attendance_percentage);
                      return (
                        <tr key={s.student_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-mono text-xs">{s.roll_no}</td>
                          <td className="px-4 py-3 font-medium">{s.full_name}</td>
                          <td className="px-4 py-3 text-center font-medium text-xs">{s.year}-{s.dept.toUpperCase()}-{s.section}</td>
                          <td className="px-4 py-3 text-center">{s.total_sessions}</td>
                          <td className="px-4 py-3 text-center">{s.present_sessions}</td>
                          <td className={`px-4 py-3 text-center font-bold ${selectedCard === 'notEligible' ? 'text-red-500' : selectedCard === 'eligible' ? 'text-emerald-600' : 'text-amber-600'}`}>{s.attendance_percentage}%</td>
                          {selectedCard === 'condonation' && <td className="px-4 py-3 text-center font-bold text-red-500">₹{fee.toLocaleString()}</td>}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'eligibility' && (
        <div className="space-y-4">
          {/* Institutional Summary */}
          <div className="p-5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-amber-500/5">
            <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Institutional Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold text-foreground">{institutionalSummary.totalStudents}</div>
                <div className="text-xs text-muted-foreground">Total Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{institutionalSummary.avgAttendance}%</div>
                <div className="text-xs text-muted-foreground">Avg Attendance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{institutionalSummary.passRate}%</div>
                <div className="text-xs text-muted-foreground">Pass Rate (≥75%)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{institutionalSummary.eligibleCount}</div>
                <div className="text-xs text-muted-foreground">Eligible Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{institutionalSummary.criticalCount}</div>
                <div className="text-xs text-muted-foreground">Critical (&lt;50%)</div>
              </div>
            </div>
          </div>
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

    </div>
  );
}
