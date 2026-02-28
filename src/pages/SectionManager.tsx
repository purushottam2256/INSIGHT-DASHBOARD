import { useState, useEffect, useMemo } from 'react';
import { Users, CalendarDays, Clock, Plus, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuditLog } from '@/hooks/useAuditLog';
import { DEPARTMENTS } from '@/lib/constants';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SectionInfo {
  dept: string;
  year: number;
  section: string;
  studentCount: number;
}

interface CombinedSession {
  id: string;
  date: string;
  period: string;
  sections: string[];  // e.g. ['A', 'B']
  dept: string;
  year: number;
  faculty_name?: string;
  subject_name?: string;
  created_at: string;
}

export default function SectionManager() {
  const permissions = usePermissions();
  const { logAction } = useAuditLog();
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [_loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(permissions.userDept || '');
  const [selectedYear, setSelectedYear] = useState('');

  // Combine Form
  const [showForm, setShowForm] = useState(false);
  const [combineDate, setCombineDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [combinePeriod, setCombinePeriod] = useState('');
  const [combSections, setCombSections] = useState<string[]>([]);
  const [combinedSessions, setCombinedSessions] = useState<CombinedSession[]>([]);

  const activeDept = permissions.isDeptScoped ? permissions.userDept || '' : selectedDept;

  // Fetch sections for the department
  useEffect(() => {
    async function fetchSections() {
      setLoading(true);
      if (!activeDept) { setLoading(false); return; }

      try {
        const { data, error } = await supabase
          .from('students')
          .select('dept, year, section')
          .eq('dept', activeDept)
          .eq('is_active', true);

        if (error) throw error;

        const grouped: Record<string, SectionInfo> = {};
        (data || []).forEach((s: any) => {
          const key = `${s.dept}-${s.year}-${s.section}`;
          if (!grouped[key]) {
            grouped[key] = { dept: s.dept, year: s.year, section: s.section, studentCount: 0 };
          }
          grouped[key].studentCount++;
        });
        setSections(Object.values(grouped).sort((a, b) => a.year - b.year || a.section.localeCompare(b.section)));
      } catch (err: any) {
        toast.error('Failed to load sections: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSections();
    loadCombinedSessions();
  }, [activeDept]);

  // Load existing combined sessions from localStorage
  const loadCombinedSessions = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('insight_combined_sessions') || '[]');
      setCombinedSessions(stored);
    } catch { setCombinedSessions([]); }
  };

  const saveCombinedSessions = (items: CombinedSession[]) => {
    setCombinedSessions(items);
    localStorage.setItem('insight_combined_sessions', JSON.stringify(items));
  };

  // Filter sections by year
  const filteredSections = useMemo(() => {
    return selectedYear
      ? sections.filter((s) => s.year === parseInt(selectedYear))
      : sections;
  }, [sections, selectedYear]);

  // Toggle section for combining
  const toggleSection = (sec: string) => {
    setCombSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  // Create combined session
  const handleCombine = () => {
    if (combSections.length < 2) {
      toast.error('Select at least 2 sections to combine');
      return;
    }
    if (!combineDate || !combinePeriod || !selectedYear) {
      toast.error('Please fill in date, period, and year');
      return;
    }

    const newSession: CombinedSession = {
      id: crypto.randomUUID(),
      date: combineDate,
      period: combinePeriod,
      sections: combSections.sort(),
      dept: activeDept,
      year: parseInt(selectedYear),
      created_at: new Date().toISOString(),
    };

    // Check for duplicates
    const isDuplicate = combinedSessions.some(
      (s) => s.date === newSession.date && s.period === newSession.period &&
        s.dept === newSession.dept && s.year === newSession.year
    );
    if (isDuplicate) {
      toast.error('A combined session already exists for this date/period/class');
      return;
    }

    saveCombinedSessions([newSession, ...combinedSessions]);

    logAction('Section Combined', 'section', `Combined ${activeDept} Y${selectedYear} sections ${combSections.join('+')} for ${combineDate} P${combinePeriod}`, {
      dept: activeDept, year: selectedYear, sections: combSections, date: combineDate, period: combinePeriod,
    });

    toast.success(`Sections ${combSections.join(' + ')} combined for ${format(new Date(combineDate), 'MMM d, yyyy')} Period ${combinePeriod}`);
    setCombSections([]);
    setCombinePeriod('');
    setShowForm(false);
  };

  // Remove a combined session
  const removeCombined = (id: string) => {
    const session = combinedSessions.find((s) => s.id === id);
    saveCombinedSessions(combinedSessions.filter((s) => s.id !== id));
    if (session) {
      logAction('Section Combine Removed', 'section', `Removed combined session: ${session.sections.join('+')} on ${session.date}`, { id });
    }
    toast.success('Combined session removed');
  };

  // Filter combined sessions for current dept
  const activeCombined = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return combinedSessions.filter(
      (s) => s.dept === activeDept && s.date >= today
    );
  }, [combinedSessions, activeDept]);

  const pastCombined = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return combinedSessions.filter(
      (s) => s.dept === activeDept && s.date < today
    );
  }, [combinedSessions, activeDept]);

  // Total students in selected sections
  const selectedStudentCount = useMemo(() => {
    return filteredSections
      .filter((s) => combSections.includes(s.section))
      .reduce((sum, s) => sum + s.studentCount, 0);
  }, [filteredSections, combSections]);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Combine Sections
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm flex items-start gap-3">
        <Users className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-blue-600">How it works:</span> When student attendance is low,
          you can temporarily assign one faculty to teach multiple sections together for a specific class.
          This creates a <strong>one-time combined session</strong> — sections remain separate in the system.
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {!permissions.isDeptScoped && (
          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setCombSections([]); }}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        )}
        <select
          value={selectedYear}
          onChange={(e) => { setSelectedYear(e.target.value); setCombSections([]); }}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">All Years</option>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</option>
          ))}
        </select>
        <button onClick={loadCombinedSessions} className="px-3 py-2 rounded-lg border border-border bg-card text-sm hover:bg-muted/50 transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Combine Form */}
      {showForm && selectedYear && (
        <div className="p-5 rounded-xl border border-primary/20 bg-card space-y-4 animate-slide-up glass-card">
          <h3 className="font-semibold text-lg">Create Temporary Combined Session</h3>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[160px]">
              <label className="text-sm font-medium mb-1 block">Date</label>
              <input
                type="date"
                value={combineDate}
                onChange={(e) => setCombineDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-sm font-medium mb-1 block">Period</label>
              <select
                value={combinePeriod}
                onChange={(e) => setCombinePeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                  <option key={p} value={String(p)}>Period {p}</option>
                ))}
                <option value="all">All Periods (Full Day)</option>
              </select>
            </div>
          </div>

          {/* Section Grid — pick which to combine */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select sections to combine ({combSections.length} selected
              {selectedStudentCount > 0 && ` • ${selectedStudentCount} total students`})
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {filteredSections.map((s) => {
                const isSelected = combSections.includes(s.section);
                return (
                  <button
                    key={`${s.year}-${s.section}`}
                    onClick={() => toggleSection(s.section)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="text-sm font-bold">{s.section}</div>
                    <div className="text-[10px] text-muted-foreground">{s.studentCount} students</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowForm(false); setCombSections([]); }} className="px-4 py-2 rounded-lg bg-muted text-sm">
              Cancel
            </button>
            <button
              onClick={handleCombine}
              disabled={combSections.length < 2 || !combinePeriod}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <Users className="h-4 w-4" />
              Combine {combSections.length >= 2 ? combSections.join(' + ') : 'Sections'}
            </button>
          </div>
        </div>
      )}

      {showForm && !selectedYear && (
        <div className="p-6 text-center text-muted-foreground rounded-xl border border-border bg-card">
          Please select a year first to see available sections.
        </div>
      )}

      {/* Active Combined Sessions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Upcoming Combined Sessions ({activeCombined.length})
        </h3>
        {activeCombined.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground rounded-xl border border-dashed border-border">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No upcoming combined sessions</p>
          </div>
        ) : (
          activeCombined.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card premium-glow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-primary font-bold">
                    {format(new Date(session.date), 'MMM')}
                  </span>
                  <span className="text-lg font-bold text-primary leading-none">
                    {format(new Date(session.date), 'd')}
                  </span>
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <span className="text-primary">{session.sections.join(' + ')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border">
                      {session.dept} Y{session.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>
                      {session.period === 'all' ? 'All Periods (Full Day)' : `Period ${session.period}`}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(session.date), 'EEEE, MMM d yyyy')}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeCombined(session.id)}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove combined session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Past Combined Sessions */}
      {pastCombined.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground font-medium hover:text-foreground transition-colors">
            Past Combined Sessions ({pastCombined.length})
          </summary>
          <div className="mt-2 space-y-2">
            {pastCombined.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-medium">{session.sections.join(' + ')}</span>
                    <span className="text-muted-foreground ml-2">
                      {session.dept} Y{session.year} • {session.period === 'all' ? 'Full Day' : `P${session.period}`} •
                      {format(new Date(session.date), ' MMM d')}
                    </span>
                  </div>
                </div>
                <button onClick={() => removeCombined(session.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
