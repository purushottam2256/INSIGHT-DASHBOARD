import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Shield, Check, ChevronUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

interface UpgradeState {
  academicYear: string;
  semester: string;
  yearCounts: Record<number, number>; // year -> student count
  totalStudents: number;
}

interface UpgradeSnapshot {
  type: 'semester' | 'year';
  timestamp: string;
  before: { academicYear: string; semester: string };
  studentYears?: Array<{ id: string; year: number; is_active: boolean }>;
}

type UpgradeStep = 'idle' | 'preview' | 'confirm' | 'executing' | 'done';

export default function SemesterUpgrader() {
  const { logAction } = useAuditLog();
  const [state, setState] = useState<UpgradeState>({
    academicYear: '',
    semester: '',
    yearCounts: {},
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [upgradeType, setUpgradeType] = useState<'semester' | 'year' | null>(null);
  const [step, setStep] = useState<UpgradeStep>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<UpgradeSnapshot | null>(null);
  const [rollbackConfirmText, setRollbackConfirmText] = useState('');

  // Fetch current state
  useEffect(() => {
    async function fetchState() {
      setLoading(true);
      try {
        // Get config
        const { data: config } = await supabase
          .from('app_config')
          .select('key, value')
          .in('key', ['academic_year', 'semester']);

        const academicYear = config?.find((c: any) => c.key === 'academic_year')?.value?.replace(/"/g, '') || '2024-2025';
        const semester = config?.find((c: any) => c.key === 'semester')?.value?.replace(/"/g, '') || '1';

        // Get student counts by year
        const { data: students, error } = await supabase
          .from('students')
          .select('year')
          .eq('is_active', true);
        
        if (error) throw error;

        const yearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
        (students || []).forEach((s: any) => {
          if (yearCounts[s.year] !== undefined) yearCounts[s.year]++;
        });

        setState({
          academicYear,
          semester,
          yearCounts,
          totalStudents: (students || []).length,
        });

        // Load last snapshot
        try {
          const stored = localStorage.getItem('insight_upgrade_snapshot');
          if (stored) setLastSnapshot(JSON.parse(stored));
        } catch {}
      } catch (err: any) {
        toast.error('Failed to load data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchState();
  }, []);

  // Execute semester upgrade
  const executeSemesterUpgrade = async () => {
    setExecuting(true);
    try {
      const newSemester = state.semester === '1' ? '2' : '1';
      
      // Save snapshot
      const snapshot: UpgradeSnapshot = {
        type: 'semester',
        timestamp: new Date().toISOString(),
        before: { academicYear: state.academicYear, semester: state.semester },
      };
      localStorage.setItem('insight_upgrade_snapshot', JSON.stringify(snapshot));
      setLastSnapshot(snapshot);

      // Update semester config
      const { error } = await supabase
        .from('app_config')
        .update({ value: JSON.stringify(newSemester) })
        .eq('key', 'semester');
      
      if (error) throw error;

      logAction('Semester Upgrade', 'semester', `Upgraded semester ${state.semester} → ${newSemester}`, {
        from: state.semester,
        to: newSemester,
        academicYear: state.academicYear,
      });

      setState((prev) => ({ ...prev, semester: newSemester }));
      setStep('done');
      toast.success(`Semester upgraded: ${state.semester} → ${newSemester}`);
    } catch (err: any) {
      toast.error('Semester upgrade failed: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  // Execute year upgrade
  const executeYearUpgrade = async () => {
    setExecuting(true);
    try {
      // Save snapshot with all student year data
      const { data: allStudents } = await supabase
        .from('students')
        .select('id, year, is_active')
        .eq('is_active', true);
      
      const snapshot: UpgradeSnapshot = {
        type: 'year',
        timestamp: new Date().toISOString(),
        before: { academicYear: state.academicYear, semester: state.semester },
        studentYears: (allStudents || []).map((s: any) => ({
          id: s.id,
          year: s.year,
          is_active: s.is_active,
        })),
      };
      localStorage.setItem('insight_upgrade_snapshot', JSON.stringify(snapshot));
      setLastSnapshot(snapshot);

      // 1. Deactivate 4th year students (graduated)
      await supabase
        .from('students')
        .update({ is_active: false })
        .eq('year', 4)
        .eq('is_active', true);

      // 2. Promote years 1→2, 2→3, 3→4 (must do in reverse to avoid conflicts)
      for (const fromYear of [3, 2, 1]) {
        await supabase
          .from('students')
          .update({ year: fromYear + 1 })
          .eq('year', fromYear)
          .eq('is_active', true);
      }

      // 3. Reset semester to 1
      await supabase
        .from('app_config')
        .update({ value: '"1"' })
        .eq('key', 'semester');

      // 4. Update academic year
      const [startYear] = state.academicYear.split('-').map(Number);
      const newAcademicYear = `${startYear + 1}-${startYear + 2}`;
      await supabase
        .from('app_config')
        .update({ value: JSON.stringify(newAcademicYear) })
        .eq('key', 'academic_year');

      logAction('Year Upgrade', 'semester', `Upgraded academic year ${state.academicYear} → ${newAcademicYear}. ${state.yearCounts[4]} students graduated.`, {
        fromYear: state.academicYear,
        toYear: newAcademicYear,
        graduated: state.yearCounts[4],
      });

      // Refresh state
      setState((prev) => ({
        ...prev,
        academicYear: newAcademicYear,
        semester: '1',
        yearCounts: {
          1: 0, // New intake - empty
          2: prev.yearCounts[1],
          3: prev.yearCounts[2],
          4: prev.yearCounts[3],
        },
        totalStudents: prev.totalStudents - (prev.yearCounts[4] || 0),
      }));
      setStep('done');
      toast.success(`Year upgrade complete! ${state.yearCounts[4]} students graduated.`);
    } catch (err: any) {
      toast.error('Year upgrade failed: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  // Rollback
  const executeRollback = async () => {
    if (!lastSnapshot || rollbackConfirmText !== 'CONFIRM ROLLBACK') return;
    setExecuting(true);
    try {
      // Restore config
      await supabase
        .from('app_config')
        .update({ value: JSON.stringify(lastSnapshot.before.semester) })
        .eq('key', 'semester');
      await supabase
        .from('app_config')
        .update({ value: JSON.stringify(lastSnapshot.before.academicYear) })
        .eq('key', 'academic_year');

      // Restore student years if it was a year upgrade
      if (lastSnapshot.type === 'year' && lastSnapshot.studentYears) {
        for (const student of lastSnapshot.studentYears) {
          await supabase
            .from('students')
            .update({ year: student.year, is_active: student.is_active })
            .eq('id', student.id);
        }
      }

      logAction('Rollback', 'semester', `Rolled back ${lastSnapshot.type} upgrade from ${lastSnapshot.timestamp}`, {
        type: lastSnapshot.type,
        restoredTo: lastSnapshot.before,
      });

      localStorage.removeItem('insight_upgrade_snapshot');
      setLastSnapshot(null);
      setRollbackConfirmText('');
      toast.success('Rollback complete! State restored.');

      // Refresh page
      window.location.reload();
    } catch (err: any) {
      toast.error('Rollback failed: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Page Header with Warning */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-red-500">Semester & Year Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ⚠️ Dangerous operations zone — changes affect all students institution-wide
          </p>
        </div>
      </div>

      {/* Current State */}
      <div className="p-4 rounded-xl border border-border bg-card premium-glow">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Current State</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Academic Year</div>
            <div className="text-xl font-bold">{state.academicYear}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Semester</div>
            <div className="text-xl font-bold">{state.semester}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Active Students</div>
            <div className="text-xl font-bold">{state.totalStudents.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Two Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Semester Upgrade */}
        <div className={`rounded-xl red-zone p-5 transition-all ${upgradeType === 'semester' ? 'ring-2 ring-red-500/40' : ''}`}>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-lg">Semester Flip</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Semester {state.semester} → {state.semester === '1' ? '2' : '1'}
            </p>
            <p className="text-xs text-muted-foreground">
              Only changes the active semester config. No student data is modified.
            </p>
            {upgradeType !== 'semester' && step === 'idle' && (
              <button
                onClick={() => { setUpgradeType('semester'); setStep('preview'); setConfirmText(''); }}
                className="w-full mt-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                Begin Semester Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Year Upgrade */}
        <div className={`rounded-xl red-zone p-5 transition-all ${upgradeType === 'year' ? 'ring-2 ring-red-500/40' : ''}`}>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <ChevronUp className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-lg">Year Upgrade</h3>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>1st → 2nd Year: <strong>{state.yearCounts[1]}</strong> students</div>
              <div>2nd → 3rd Year: <strong>{state.yearCounts[2]}</strong> students</div>
              <div>3rd → 4th Year: <strong>{state.yearCounts[3]}</strong> students</div>
              <div className="text-red-500 font-medium">4th → Graduated: <strong>{state.yearCounts[4]}</strong> students</div>
            </div>
            {upgradeType !== 'year' && step === 'idle' && (
              <button
                onClick={() => { setUpgradeType('year'); setStep('preview'); setConfirmText(''); }}
                className="w-full mt-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                Begin Year Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Flow */}
      {step === 'preview' && upgradeType && (
        <div className="p-5 rounded-xl red-zone animate-slide-up">
          <div className="relative z-10 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 animate-bounce-subtle" />
              <div>
                <h3 className="font-bold text-lg text-red-500">
                  {upgradeType === 'semester' ? 'Semester Upgrade Confirmation' : 'Year Upgrade Confirmation'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {upgradeType === 'semester'
                    ? `This will change the active semester from ${state.semester} to ${state.semester === '1' ? '2' : '1'} for the entire institution.`
                    : `This will promote ALL students by one year, deactivate ${state.yearCounts[4]} 4th-year students (graduated), reset semester to 1, and update the academic year.`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-red-500">
                Type <strong>CONFIRM UPGRADE</strong> to proceed:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="CONFIRM UPGRADE"
                className="w-full px-4 py-3 rounded-lg border-2 border-red-500/30 bg-card text-center font-mono text-lg tracking-widest focus:border-red-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('idle'); setUpgradeType(null); setConfirmText(''); }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={() => upgradeType === 'semester' ? executeSemesterUpgrade() : executeYearUpgrade()}
                disabled={confirmText !== 'CONFIRM UPGRADE' || executing}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg text-sm font-bold disabled:opacity-40 hover:bg-red-600 transition-all animate-glow-pulse disabled:animate-none"
              >
                {executing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Executing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Execute {upgradeType === 'semester' ? 'Semester' : 'Year'} Upgrade
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {step === 'done' && (
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/20">
              <Check className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-600">Upgrade Complete!</h3>
              <p className="text-sm text-muted-foreground">
                {upgradeType === 'semester' ? 'Semester has been updated.' : 'Academic year has been advanced.'}
                A snapshot was saved for rollback if needed.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setStep('idle'); setUpgradeType(null); setConfirmText(''); }}
            className="mt-3 px-4 py-2 bg-card text-foreground rounded-lg text-sm border border-border hover:bg-muted"
          >
            Done
          </button>
        </div>
      )}

      {/* Rollback Section */}
      {lastSnapshot && step === 'idle' && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Rollback Available</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Last upgrade: <strong>{lastSnapshot.type === 'semester' ? 'Semester' : 'Year'} Upgrade</strong> on{' '}
            {new Date(lastSnapshot.timestamp).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Previous state: {lastSnapshot.before.academicYear}, Semester {lastSnapshot.before.semester}
          </p>
          <div className="flex gap-3 items-center pt-2">
            <input
              type="text"
              value={rollbackConfirmText}
              onChange={(e) => setRollbackConfirmText(e.target.value.toUpperCase())}
              placeholder='Type "CONFIRM ROLLBACK"'
              className="flex-1 px-3 py-2 rounded-lg border border-amber-500/30 bg-card text-sm"
            />
            <button
              onClick={executeRollback}
              disabled={rollbackConfirmText !== 'CONFIRM ROLLBACK' || executing}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-amber-600"
            >
              {executing ? 'Rolling back...' : 'Rollback'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
