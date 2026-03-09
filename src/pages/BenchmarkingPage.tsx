import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Trophy, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DEPARTMENTS } from '@/lib/constants';
import { toast } from 'sonner';

interface DeptMetrics {
  dept: string;
  label: string;
  avgAttendance: number;
  totalStudents: number;
  defaulterCount: number;
  eligibleCount: number;
  eligibilityRate: number;
}

export default function BenchmarkingPage() {
  const [deptMetrics, setDeptMetrics] = useState<DeptMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('view_student_aggregates')
          .select('dept, attendance_percentage, total_sessions');
        if (error) throw error;

        const metrics: DeptMetrics[] = DEPARTMENTS.map((d) => {
          const students = (data || []).filter((s: any) => s.dept === d.value && s.total_sessions > 0);
          const avg = students.length > 0
            ? students.reduce((sum: number, s: any) => sum + (s.attendance_percentage || 0), 0) / students.length
            : 0;
          const defaulters = students.filter((s: any) => (s.attendance_percentage || 0) < 75).length;
          const eligible = students.length - defaulters;
          return {
            dept: d.value,
            label: d.label,
            avgAttendance: Math.round(avg * 100) / 100,
            totalStudents: students.length,
            defaulterCount: defaulters,
            eligibleCount: eligible,
            eligibilityRate: students.length > 0 ? Math.round((eligible / students.length) * 100) : 0,
          };
        }).filter(m => m.totalStudents > 0);

        setDeptMetrics(metrics);
      } catch (err: any) {
        toast.error('Failed to load benchmarking data');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  const bestDept = useMemo(() => deptMetrics.reduce((best, d) => d.avgAttendance > (best?.avgAttendance || 0) ? d : best, deptMetrics[0]), [deptMetrics]);
  const worstDept = useMemo(() => deptMetrics.reduce((worst, d) => d.avgAttendance < (worst?.avgAttendance || 100) ? d : worst, deptMetrics[0]), [deptMetrics]);
  const overallAvg = useMemo(() => {
    if (deptMetrics.length === 0) return 0;
    return Math.round(deptMetrics.reduce((sum, d) => sum + d.avgAttendance, 0) / deptMetrics.length * 100) / 100;
  }, [deptMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">


      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 premium-glow">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Institution Avg</span>
          </div>
          <div className="text-3xl font-bold">{overallAvg}%</div>
        </div>
        {bestDept && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 premium-glow">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Best Department</span>
            </div>
            <div className="text-xl font-bold text-emerald-600">{bestDept.label}</div>
            <div className="text-sm text-emerald-500">{bestDept.avgAttendance}%</div>
          </div>
        )}
        {worstDept && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 premium-glow">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Needs Attention</span>
            </div>
            <div className="text-xl font-bold text-amber-600">{worstDept.label}</div>
            <div className="text-sm text-amber-500">{worstDept.avgAttendance}%</div>
          </div>
        )}
        <div className="p-4 rounded-xl border border-border bg-card premium-glow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Departments</span>
          </div>
          <div className="text-3xl font-bold">{deptMetrics.length}</div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-[1.5rem] border border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20 font-black tracking-tight text-[15px] flex items-center gap-2 text-foreground">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          Cross-Department Comparison
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Department</th>
                <th className="text-center px-4 py-3 font-semibold">Students</th>
                <th className="text-center px-4 py-3 font-semibold">Avg Attendance</th>
                <th className="text-center px-4 py-3 font-semibold">Eligible (≥75%)</th>
                <th className="text-center px-4 py-3 font-semibold">Defaulters</th>
                <th className="text-center px-4 py-3 font-semibold">Eligibility Rate</th>
              </tr>
            </thead>
            <tbody>
              {deptMetrics.sort((a, b) => b.avgAttendance - a.avgAttendance).map((d, i) => (
                <tr key={d.dept} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                      <span className="font-medium">{d.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{d.totalStudents}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${d.avgAttendance >= 85 ? 'bg-emerald-500' : d.avgAttendance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${d.avgAttendance}%` }} />
                      </div>
                      <span className="font-bold">{d.avgAttendance}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-medium">{d.eligibleCount}</td>
                  <td className="px-4 py-3 text-center text-red-500 font-medium">{d.defaulterCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      d.eligibilityRate >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                      d.eligibilityRate >= 60 ? 'bg-amber-500/10 text-amber-600' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {d.eligibilityRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
