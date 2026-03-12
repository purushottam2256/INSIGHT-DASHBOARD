import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DEPARTMENTS } from '@/lib/constants'
import {
  Search, Users, TrendingUp, BarChart3, Calendar, Award, Loader2,
  GraduationCap, Phone, Mail, Droplets, Bluetooth, User, Camera,
  UserCheck, Shield,
} from 'lucide-react'
import { toast } from 'sonner'

interface StudentDetail {
  id: string; full_name: string; roll_no: string; email: string; mobile: string;
  parent_mobile: string; dept: string; year: number; section: string; gender: string;
  blood_group: string; bluetooth_uuid: string; dob: string; batch: number;
  photo_url: string | null;
}

interface AttendanceStat {
  total_sessions: number; present_sessions: number; absent_sessions: number; od_sessions: number; attendance_percentage: number;
}

const StudentOverviewPage = () => {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState<StudentDetail[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)
  const [stats, setStats] = useState<AttendanceStat | null>(null)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState(profile?.dept || '')
  const [filterYear, setFilterYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isElevated = ['principal', 'management', 'developer', 'admin'].includes(profile?.role || '')
  const canEdit = isElevated || profile?.role === 'hod'

  useEffect(() => {
    fetchStudents()
    const id = searchParams.get('id')
    if (id) loadStudentById(id)
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    let query = supabase.from('students').select('*').eq('is_active', true).order('roll_no')
    if (!isElevated && profile?.dept) query = query.eq('dept', profile.dept)
    const { data, error } = await query
    if (error) toast.error(error.message)
    else setStudents(data || [])
    setLoading(false)
  }

  const loadStudentById = async (id: string) => {
    const { data } = await supabase.from('students').select('*').eq('id', id).single()
    if (data) { setSelectedStudent(data); loadStats(data.id) }
  }

  const loadStats = async (studentId: string) => {
    const { data } = await supabase.from('view_student_aggregates').select('*').eq('student_id', studentId).single()
    setStats(data)
  }

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedStudent || !canEdit || !e.target.files?.length) return
    const file = e.target.files[0]
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `students/${selectedStudent.id}.${ext}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const photoUrl = urlData.publicUrl + '?t=' + Date.now()

      const { error: updateError } = await supabase.from('students').update({ photo_url: photoUrl }).eq('id', selectedStudent.id)
      if (updateError) throw updateError

      setSelectedStudent({ ...selectedStudent, photo_url: photoUrl })
      toast.success('Photo updated!')
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const filtered = useMemo(() => students.filter(s => {
    const matchSearch = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.roll_no.toLowerCase().includes(search.toLowerCase())
    const matchDept = !filterDept || s.dept === filterDept
    const matchYear = !filterYear || s.year === parseInt(filterYear)
    return matchSearch && matchDept && matchYear
  }), [students, search, filterDept, filterYear])

  const selectStudent = (s: StudentDetail) => { setSelectedStudent(s); loadStats(s.id) }

  const getAttendanceColor = (pct: number) => pct >= 75 ? 'text-emerald-500' : pct >= 65 ? 'text-amber-500' : 'text-red-500'
  const getAttendanceBg = (pct: number) => pct >= 75 ? 'from-emerald-500/10 to-emerald-500/5' : pct >= 65 ? 'from-amber-500/10 to-amber-500/5' : 'from-red-500/10 to-red-500/5'
  const getAttendanceRing = (pct: number) => pct >= 75 ? 'ring-emerald-500/20' : pct >= 65 ? 'ring-amber-500/20' : 'ring-red-500/20'

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        {/* Student List Panel */}
        <div className="border border-border/40 rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/40 space-y-3 bg-gradient-to-b from-secondary/30 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Student Directory</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{filtered.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input placeholder="Search name or roll..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 h-9 rounded-xl border border-border/50 bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
            </div>
            <div className="flex gap-2">
              {isElevated && (
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="h-8 px-2.5 rounded-lg border border-border/50 bg-card text-xs flex-1 font-medium">
                  <option value="">All Depts</option>
                  {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                </select>
              )}
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="h-8 px-2.5 rounded-lg border border-border/50 bg-card text-xs flex-1 font-medium">
                <option value="">All Years</option>
                {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length > 0 ? filtered.slice(0, 200).map(s => (
              <button key={s.id} onClick={() => selectStudent(s)} className={`w-full text-left px-4 py-3 hover:bg-primary/5 transition-all duration-200 border-b border-border/20 group ${selectedStudent?.id === s.id ? 'bg-primary/8 border-l-3 border-l-primary' : ''}`}>
                <div className="flex items-center gap-3">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${selectedStudent?.id === s.id ? 'bg-primary text-white' : 'bg-secondary/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                      {s.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{s.full_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{s.roll_no}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">{s.dept}-Y{s.year}-{s.section}</span>
                    </div>
                  </div>
                </div>
              </button>
            )) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No students found
              </div>
            )}
          </div>
        </div>

        {/* Student Details Panel */}
        <div className="space-y-4">
          {selectedStudent ? (
            <>
              {/* Profile Card with Photo */}
              <div className="border border-border/40 rounded-2xl bg-card shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
                <div className="flex items-start gap-5">
                  {/* Photo Section */}
                  <div className="relative group shrink-0">
                    {selectedStudent.photo_url ? (
                      <img
                        src={selectedStudent.photo_url}
                        alt={selectedStudent.full_name}
                        className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-2 ring-primary/20"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/20">
                        {selectedStudent.full_name.charAt(0)}
                      </div>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black tracking-tight">{selectedStudent.full_name}</h2>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">{selectedStudent.roll_no}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs">
                        {selectedStudent.dept.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-secondary text-foreground font-bold text-xs">
                        Year {selectedStudent.year} • Section {selectedStudent.section}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-secondary text-muted-foreground font-medium text-xs">
                        Batch {selectedStudent.batch}
                      </span>
                      {stats && (
                        <span className={`px-3 py-1 rounded-xl font-bold text-xs ring-1 ${
                          stats.attendance_percentage >= 75
                            ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 ring-amber-500/20'
                        }`}>
                          {stats.attendance_percentage >= 75 ? '✅ Eligible' : '⚠️ Low Attendance'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Grid — Personal + Contact + Academic */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  {[
                    { icon: Phone, label: 'Mobile', value: selectedStudent.mobile || '—' },
                    { icon: Phone, label: 'Parent Mobile', value: selectedStudent.parent_mobile || '—' },
                    { icon: Mail, label: 'Email', value: selectedStudent.email || '—' },
                    { icon: User, label: 'Gender', value: selectedStudent.gender || '—' },
                    { icon: Calendar, label: 'Date of Birth', value: selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                    { icon: Droplets, label: 'Blood Group', value: selectedStudent.blood_group || '—' },
                    { icon: GraduationCap, label: 'Batch', value: selectedStudent.batch ? `B${selectedStudent.batch}` : '—' },
                    { icon: Bluetooth, label: 'BLE Device', value: selectedStudent.bluetooth_uuid ? '✓ Linked' : '✗ Not set' },
                  ].map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-secondary/30 border border-border/30 space-y-1 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <f.icon className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{f.label}</p>
                      </div>
                      <p className="text-sm font-semibold truncate">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Overall', value: `${stats.attendance_percentage}%`, icon: TrendingUp, color: getAttendanceColor(stats.attendance_percentage), bg: getAttendanceBg(stats.attendance_percentage), ring: getAttendanceRing(stats.attendance_percentage) },
                    { label: 'Present', value: stats.present_sessions + stats.od_sessions, icon: Award, color: 'text-emerald-500', bg: 'from-emerald-500/10 to-emerald-500/5', ring: 'ring-emerald-500/20' },
                    { label: 'Absent', value: stats.absent_sessions, icon: Calendar, color: 'text-red-500', bg: 'from-red-500/10 to-red-500/5', ring: 'ring-red-500/20' },
                    { label: 'Total', value: stats.total_sessions, icon: BarChart3, color: 'text-blue-500', bg: 'from-blue-500/10 to-blue-500/5', ring: 'ring-blue-500/20' },
                  ].map((c, i) => (
                    <div key={i} className={`border border-border/40 rounded-2xl bg-gradient-to-br ${c.bg} p-5 shadow-sm relative overflow-hidden ring-1 ${c.ring}`}>
                      <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-lg" />
                      <c.icon className={`h-5 w-5 ${c.color} mb-3 opacity-80`} />
                      <p className={`text-3xl font-black tracking-tight ${c.color}`}>{c.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">{c.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Attendance Breakdown */}
              {stats && (
                <div className="border border-border/40 rounded-2xl bg-card shadow-sm p-5">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Attendance Breakdown
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Present', val: stats.present_sessions, total: stats.total_sessions, color: 'bg-emerald-500', track: 'bg-emerald-500/10' },
                      { label: 'On Duty', val: stats.od_sessions, total: stats.total_sessions, color: 'bg-blue-500', track: 'bg-blue-500/10' },
                      { label: 'Absent', val: stats.absent_sessions, total: stats.total_sessions, color: 'bg-red-500', track: 'bg-red-500/10' },
                    ].map((bar, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground font-medium">{bar.label}</span>
                          <span className="font-bold tabular-nums">{bar.val} / {bar.total}</span>
                        </div>
                        <div className={`h-2.5 rounded-full ${bar.track} overflow-hidden`}>
                          <div className={`h-full rounded-full ${bar.color} transition-all duration-700 ease-out`} style={{ width: `${bar.total > 0 ? (bar.val / bar.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Eligibility Badge — No detained reference */}
                  <div className="mt-5 p-3 rounded-xl text-center text-xs font-bold">
                    {stats.attendance_percentage >= 75 ? (
                      <div className="bg-emerald-500/10 text-emerald-600 rounded-xl p-3 ring-1 ring-emerald-500/20 flex items-center justify-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Eligible — Above 75% attendance threshold
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 text-amber-600 rounded-xl p-3 ring-1 ring-amber-500/20 flex items-center justify-center gap-2">
                        <Shield className="h-4 w-4" />
                        Attention Required — {75 - stats.attendance_percentage}% below threshold
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-center text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl bg-secondary/10">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-primary/30" />
              </div>
              <p className="text-lg font-bold text-foreground">Select a Student</p>
              <p className="text-sm mt-1">Click on any student from the directory to view their profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentOverviewPage
