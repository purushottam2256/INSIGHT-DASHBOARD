import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEPARTMENTS } from '@/lib/constants'
import {
  Search, UserCog, Clock, Loader2, Calendar, Mail, Building2,
  Phone, BarChart3, BookOpen, Users, TrendingUp, Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'

interface FacultyDetail {
  id: string; full_name: string; email: string; dept: string; role: string;
  mobile: string | null; avatar_url: string | null;
}

interface TimetableEntry { day_of_week: number; period: number; subjects: { name: string; code: string } | null; dept: string; year: number; section: string; }

interface AttendancePerf {
  total_sessions: number;
  total_present: number;
  avg_rate: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const FacultyOverviewPage = () => {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [faculty, setFaculty] = useState<FacultyDetail[]>([])
  const [selected, setSelected] = useState<FacultyDetail | null>(null)
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [perfStats, setPerfStats] = useState<AttendancePerf | null>(null)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState(profile?.dept || '')
  const [loading, setLoading] = useState(true)

  const isElevated = ['principal', 'management', 'developer', 'admin'].includes(profile?.role || '')

  useEffect(() => {
    fetchFaculty()
    const id = searchParams.get('id')
    if (id) loadFacultyById(id)
  }, [])

  const fetchFaculty = async () => {
    setLoading(true)
    let query = supabase.from('profiles').select('id, full_name, email, dept, role, mobile, avatar_url').in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']).order('full_name')
    if (!isElevated && profile?.dept) query = query.eq('dept', profile.dept)
    const { data, error } = await query
    if (error) toast.error(error.message)
    else setFaculty(data || [])
    setLoading(false)
  }

  const loadFacultyById = async (id: string) => {
    const { data } = await supabase.from('profiles').select('id, full_name, email, dept, role, mobile, avatar_url').eq('id', id).single()
    if (data) { setSelected(data); loadTimetable(data.id); loadPerformance(data.id) }
  }

  const loadTimetable = async (facultyId: string) => {
    const { data } = await supabase.from('master_timetables').select('day_of_week, period, dept, year, section, subjects(name, code)').eq('faculty_id', facultyId)
    setTimetable((data as any) || [])
  }

  const loadPerformance = async (facultyId: string) => {
    try {
      // Count total sessions taken by this faculty
      const { count: totalSessions } = await supabase
        .from('attendance_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('faculty_id', facultyId)

      // Count total present+od marks across sessions
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('faculty_id', facultyId)

      let totalPresent = 0
      let totalStudents = 0

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        // Get total attendance logs
        const { count: totalLogs } = await supabase
          .from('attendance_logs')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)

        const { count: presentLogs } = await supabase
          .from('attendance_logs')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .in('status', ['present', 'od'])

        totalStudents = totalLogs || 0
        totalPresent = presentLogs || 0
      }

      setPerfStats({
        total_sessions: totalSessions || 0,
        total_present: totalPresent,
        avg_rate: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
      })
    } catch {
      setPerfStats(null)
    }
  }

  const filtered = useMemo(() => faculty.filter(f => {
    const matchSearch = !search || f.full_name?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase())
    const matchDept = !filterDept || f.dept === filterDept
    return matchSearch && matchDept
  }), [faculty, search, filterDept])

  const selectFaculty = (f: FacultyDetail) => { setSelected(f); loadTimetable(f.id); loadPerformance(f.id) }

  const getEntry = (day: number, period: number) => timetable.find(t => t.day_of_week === day && t.period === period)

  const getRoleBadge = (role: string) => {
    const m: Record<string, { bg: string; label: string }> = {
      hod: { bg: 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20', label: 'HOD' },
      faculty: { bg: 'bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20', label: 'Faculty' },
      class_incharge: { bg: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20', label: 'Class Incharge' },
      lab_incharge: { bg: 'bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20', label: 'Lab Incharge' },
    }
    return m[role] || { bg: 'bg-muted text-muted-foreground', label: role }
  }

  // Computed stats
  const workingDays = new Set(timetable.map(t => t.day_of_week)).size
  const uniqueClasses = new Set(timetable.map(t => `${t.dept}-${t.year}-${t.section}`)).size
  const avgDailyLoad = workingDays > 0 ? (timetable.length / workingDays).toFixed(1) : '0'

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        {/* Faculty List Panel */}
        <div className="border border-border/40 rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/40 space-y-3 bg-gradient-to-b from-secondary/30 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Faculty Directory</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{filtered.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 h-9 rounded-xl border border-border/50 bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
            </div>
            {isElevated && (
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full h-8 px-2.5 rounded-lg border border-border/50 bg-card text-xs font-medium">
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
              </select>
            )}
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length > 0 ? filtered.map(f => {
              const badge = getRoleBadge(f.role)
              return (
                <button key={f.id} onClick={() => selectFaculty(f)} className={`w-full text-left px-4 py-3 hover:bg-primary/5 transition-all duration-200 border-b border-border/20 group ${selected?.id === f.id ? 'bg-primary/8 border-l-3 border-l-primary' : ''}`}>
                  <div className="flex items-center gap-3">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${selected?.id === f.id ? 'bg-primary text-white' : 'bg-secondary/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                        {f.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{f.full_name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${badge.bg}`}>{badge.label}</span>
                        <span className="text-[10px] text-muted-foreground">{f.dept}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            }) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <UserCog className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No faculty found
              </div>
            )}
          </div>
        </div>

        {/* Faculty Details Panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              {/* Profile Card with Photo */}
              <div className="border border-border/40 rounded-2xl bg-card shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
                <div className="flex items-start gap-5">
                  {/* Photo */}
                  {selected.avatar_url ? (
                    <img
                      src={selected.avatar_url}
                      alt={selected.full_name}
                      className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-2 ring-primary/20 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/20 shrink-0">
                      {selected.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black tracking-tight">{selected.full_name}</h2>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {selected.email}
                    </div>
                    {selected.mobile && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {selected.mobile}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold ${getRoleBadge(selected.role).bg}`}>
                        {getRoleBadge(selected.role).label}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {selected.dept}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid — Schedule + Performance */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
                  {[
                    { label: 'Weekly Classes', value: timetable.length, icon: Clock, color: 'text-blue-500', bg: 'from-blue-500/10 to-blue-500/5', ring: 'ring-blue-500/20' },
                    { label: 'Working Days', value: workingDays, icon: Calendar, color: 'text-emerald-500', bg: 'from-emerald-500/10 to-emerald-500/5', ring: 'ring-emerald-500/20' },
                    { label: 'Classes Taught', value: uniqueClasses, icon: Users, color: 'text-amber-500', bg: 'from-amber-500/10 to-amber-500/5', ring: 'ring-amber-500/20' },
                    { label: 'Avg Daily Load', value: avgDailyLoad, icon: Briefcase, color: 'text-purple-500', bg: 'from-purple-500/10 to-purple-500/5', ring: 'ring-purple-500/20' },
                    { label: 'Sessions Done', value: perfStats?.total_sessions || 0, icon: BookOpen, color: 'text-primary', bg: 'from-primary/10 to-primary/5', ring: 'ring-primary/20' },
                    { label: 'Avg Attendance', value: perfStats ? `${perfStats.avg_rate}%` : '—', icon: TrendingUp, color: perfStats && perfStats.avg_rate >= 75 ? 'text-emerald-500' : 'text-amber-500', bg: perfStats && perfStats.avg_rate >= 75 ? 'from-emerald-500/10 to-emerald-500/5' : 'from-amber-500/10 to-amber-500/5', ring: perfStats && perfStats.avg_rate >= 75 ? 'ring-emerald-500/20' : 'ring-amber-500/20' },
                  ].map((c, i) => (
                    <div key={i} className={`border border-border/40 rounded-2xl bg-gradient-to-br ${c.bg} p-3 text-center ring-1 ${c.ring} relative overflow-hidden`}>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/10 rounded-full blur-lg" />
                      <c.icon className={`h-4 w-4 ${c.color} mx-auto mb-1.5 opacity-80`} />
                      <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Bar (if we have data) */}
              {perfStats && perfStats.total_sessions > 0 && (
                <div className="border border-border/40 rounded-2xl bg-card shadow-sm p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Teaching Performance
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Avg Class Attendance Rate</span>
                        <span className="font-bold tabular-nums">{perfStats.avg_rate}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${perfStats.avg_rate >= 75 ? 'bg-emerald-500' : perfStats.avg_rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${perfStats.avg_rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                      <div className="p-3 rounded-xl bg-secondary/30 text-center">
                        <p className="text-lg font-black text-foreground">{perfStats.total_sessions}</p>
                        <p className="text-muted-foreground font-bold uppercase text-[9px] tracking-wider">Sessions Conducted</p>
                      </div>
                      <div className="p-3 rounded-xl bg-secondary/30 text-center">
                        <p className="text-lg font-black text-emerald-600">{perfStats.total_present}</p>
                        <p className="text-muted-foreground font-bold uppercase text-[9px] tracking-wider">Total Present</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timetable Grid */}
              <div className="border border-border/40 rounded-2xl bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border/40 bg-gradient-to-r from-secondary/30 to-transparent flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold">Weekly Schedule</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/20">
                        <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Day</th>
                        {[1,2,3,4,5,6].map(p => <th key={p} className="px-3 py-2.5 text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px]">P{p}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {DAYS.map((day, di) => (
                        <tr key={day} className="hover:bg-muted/5 transition-colors">
                          <td className="px-4 py-3 font-bold text-sm">{day}</td>
                          {[1,2,3,4,5,6].map(p => {
                            const entry = getEntry(di + 1, p)
                            return (
                              <td key={p} className="px-2 py-2 text-center">
                                {entry ? (
                                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-2 py-1.5 hover:bg-primary/10 transition-colors">
                                    <div className="font-bold text-primary text-[10px]">{(entry.subjects as any)?.code || '—'}</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">{entry.dept}-{entry.year}{entry.section}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/20">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-center text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl bg-secondary/10">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-4">
                <UserCog className="h-10 w-10 text-primary/30" />
              </div>
              <p className="text-lg font-bold text-foreground">Select a Faculty Member</p>
              <p className="text-sm mt-1">Click on any faculty from the directory to view their profile and schedule</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FacultyOverviewPage
