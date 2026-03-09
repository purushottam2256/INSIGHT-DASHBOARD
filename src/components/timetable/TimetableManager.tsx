import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from "@/contexts/AuthContext"
import { SubjectFacultyMapping, useTimetable, ConflictResult, ClassMetadata } from "@/hooks/useTimetable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, ShieldAlert, FolderOpen, Wand2, Hand, ChevronLeft, ChevronRight, X, Printer, AlertTriangle, Users, GraduationCap, BookOpen, CheckCircle2, Save, CalendarIcon, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEPARTMENTS, YEARS, SECTIONS, ELEVATED_ROLES } from "@/lib/constants"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"

// ─── Custom Loaders ──────────────────────────────────────────
/** Mini timetable grid that pulses — used as main loader */
const GridPulseLoader = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) => {
  const s = size === "sm" ? 3 : size === "lg" ? 5 : 4
  const cellSize = size === "sm" ? "w-2 h-2" : size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5"
  return (
    <div className={cn("inline-flex flex-col gap-0.5", className)}>
      {Array.from({ length: s }).map((_, r) => (
        <div key={r} className="flex gap-0.5">
          {Array.from({ length: s }).map((_, c) => (
            <div key={c} className={cn(
              cellSize, "rounded-[2px] bg-primary/60",
              "animate-pulse"
            )} style={{ animationDelay: `${(r * s + c) * 80}ms`, animationDuration: '1.2s' }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Inline dot-bounce loader for buttons */
const DotLoader = ({ className = "" }: { className?: string }) => (
  <div className={cn("inline-flex items-center gap-1", className)}>
    {[0, 1, 2].map(i => (
      <span key={i} className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.6s' }} />
    ))}
  </div>
)

// ─── Constants ───────────────────────────────────────────────
const DAYS = [
  { id: 1, name: "MON" }, { id: 2, name: "TUE" }, { id: 3, name: "WED" },
  { id: 4, name: "THU" }, { id: 5, name: "FRI" }, { id: 6, name: "SAT" },
]
const PERIODS = [
  { id: 1, label: "I", time: "09:30-10:30" }, { id: 2, label: "II", time: "10:30-11:30" },
  { id: 3, label: "III", time: "11:40-12:40" }, { id: 4, label: "IV", time: "01:30-02:20" },
  { id: 5, label: "V", time: "02:20-03:10" }, { id: 6, label: "VI", time: "03:10-04:00" },
]
const SEMESTERS = [{ value: "1", label: "Sem I" }, { value: "2", label: "Sem II" }]
const REGULATIONS = ["R22", "R20", "R18"]
const currentAcademicYear = () => {
  const now = new Date()
  const y = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return `${y}-${y + 1}`
}

// ─── Types ───────────────────────────────────────────────────
interface CellData { subject_id: string; faculty_id: string; acronym: string; is_lab?: boolean }
type GridState = Record<string, CellData>

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function TimetableManager() {
  const { profile } = useAuth()
  const {
    fetchFaculty, fetchTimetableByClass, fetchSubjectsByClass,
    saveBulkTimetable, crossCheckValidation, fetchSavedClassTimetables,
    fetchClassIncharges, saveClassIncharges, autoGenerateTimetable, updateSubject
  } = useTimetable()

  // ─── Wizard Step ───────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ─── Step 1: Header Metadata ───────────────────────────────
  const [meta, setMeta] = useState<ClassMetadata>({
    dept: profile?.dept || "", year: 1, semester: 1, section: "A",
    regulation: "R22", academic_year: currentAcademicYear(), room: "", effect_date: "",
  })

  // ─── Data ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [allFacultyList, setAllFacultyList] = useState<any[]>([])
  const [deptFacultyList, setDeptFacultyList] = useState<any[]>([])

  // ─── Step 2: Subject-Faculty Mapping ───────────────────────
  const [mappings, setMappings] = useState<SubjectFacultyMapping[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())

  // ─── Step 3: Class Incharges ───────────────────────────────
  const [incharge1, setIncharge1] = useState("")
  const [incharge2, setIncharge2] = useState("")

  // ─── Step 4: Grid ──────────────────────────────────────────
  const [mode, setMode] = useState<"auto" | "manual" | null>(null)
  const [grid, setGrid] = useState<GridState>({})
  const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null)

  // ─── Step 5: Cross-check ───────────────────────────────────
  const [conflicts, setConflicts] = useState<ConflictResult[]>([])
  const [showCrossCheck, setShowCrossCheck] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // ─── Saved browser ─────────────────────────────────────────
  const [showSavedBrowser, setShowSavedBrowser] = useState(false)
  const [savedClasses, setSavedClasses] = useState<any[]>([])

  // ─── Smart Clashes checking ────────────────────────────────
  const [globalFacultyTimetables, setGlobalFacultyTimetables] = useState<any[]>([])

  // ─── Role checks ───────────────────────────────────────────
  const isHod = profile?.role === 'hod'
  const isElevated = ELEVATED_ROLES.includes(profile?.role as any)
  const canEdit = isElevated || isHod

  // HOD restriction
  useEffect(() => {
    if (profile?.role === 'hod' && profile?.dept) {
      setMeta(m => ({ ...m, dept: profile.dept! }))
    }
  }, [profile])

  // Load faculty on mount
  useEffect(() => {
    fetchFaculty().then(f => setAllFacultyList(f))
  }, [])

  useEffect(() => {
    setDeptFacultyList(meta.dept ? allFacultyList.filter((f: any) => f.dept === meta.dept) : allFacultyList)
  }, [meta.dept, allFacultyList])

  const filteredSections = useMemo(() => {
    return meta.dept === 'CSE' ? SECTIONS : SECTIONS.filter(s => ['A', 'B', 'C'].includes(s))
  }, [meta.dept])

  // ═══ Step 1 → Step 2: Load subjects ═══════════════════════
  const handleStep1Next = async () => {
    const activeDept = (profile?.role === 'hod' ? profile.dept : meta.dept) || meta.dept
    if (!activeDept || !meta.year || !meta.section) { toast.error('Fill all required fields'); return }
    setLoading(true)
    try {
      // Convert relative semester (1 = Sem I, 2 = Sem II) to absolute (1-8)
      const absoluteSemester = (meta.year - 1) * 2 + meta.semester
      // Guarantee meta syncs immediately for downstream rendering
      if (activeDept && activeDept !== meta.dept) setMeta(m => ({ ...m, dept: activeDept }))

      const subs = await fetchSubjectsByClass(activeDept!, meta.year, absoluteSemester)
      // Build initial mappings from loaded subjects
      const initial: SubjectFacultyMapping[] = subs.map(s => ({
        subject_id: s.id, code: s.code, acronym: s.acronym || s.code,
        name: s.name, credits: s.credits || 3, faculty_id: "",
        is_lab: s.is_lab || false, batch: s.batch || "all",
      }))
      setMappings(initial)
      // Select all subjects by default
      setSelectedSubjects(new Set(initial.map(s => s.subject_id)))

      // Load existing incharges
      const incharges = await fetchClassIncharges(activeDept!, meta.year, meta.section)
      if (incharges[0]) setIncharge1(incharges[0].faculty_id)
      if (incharges[1]) setIncharge2(incharges[1].faculty_id)

      // Check if existing timetable exists
      const existing = await fetchTimetableByClass(activeDept!, meta.year, meta.section)
      if (existing.length > 0) {
        // Pre-fill grid and mappings from existing data
        const newGrid: GridState = {}
        for (const e of existing) {
          newGrid[`${e.day_of_week}-${e.period}`] = {
            subject_id: e.subject_id, faculty_id: e.faculty_id,
            acronym: e.subject_acronym || e.subject_code || '?',
          }
        }
        setGrid(newGrid)
        // Update faculty in mappings from existing entries
        const facById = new Map(existing.map((e: any) => [e.subject_id, { fid: e.faculty_id, fname: e.faculty_name }]))
        setMappings(prev => prev.map(m => {
          const f = facById.get(m.subject_id)
          return f ? { ...m, faculty_id: f.fid, faculty_name: f.fname } : m
        }))
      }

      setStep(2)
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  // ═══ Step 2: Update mapping faculty ═══════════════════════
  const updateMappingFaculty = (idx: number, facultyId: string) => {
    setMappings(prev => {
      const next = [...prev]
      const fac = allFacultyList.find(f => f.id === facultyId)
      next[idx] = { ...next[idx], faculty_id: facultyId, faculty_name: fac?.full_name || "" }
      return next
    })
  }

  const updateMappingField = (idx: number, field: keyof SubjectFacultyMapping, value: any) => {
    setMappings(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const handleStep2Next = () => {
    // Only keep selected subjects
    const activeMappings = mappings.filter(m => selectedSubjects.has(m.subject_id))
    if (activeMappings.length === 0) {
      toast.error('Select at least one subject'); return
    }
    const unmapped = activeMappings.filter(m => !m.faculty_id)
    if (unmapped.length > 0) {
      toast.warning(`${unmapped.length} selected subjects still need faculty assigned`)
      return
    }
    // Replace mappings with only selected ones
    setMappings(activeMappings)
    setStep(3)
  }

  // ═══ Step 3 → Step 4: Choose mode ═════════════════════════
  const handleStep3Next = async () => {
    setLoading(true)
    try {
      // Pre-fetch all other timetables so we can do live clash detection
      const { data } = await supabase
        .from('master_timetables')
        .select('faculty_id, day_of_week, period, dept, year, section')
      
      const otherEntries = (data || []).filter(
        (e: any) => !(e.dept === meta.dept && e.year === meta.year && e.section === meta.section)
      )
      
      setGlobalFacultyTimetables(otherEntries)
      setStep(4)
    } catch (err: any) {
      toast.error("Failed to load global clash data")
    } finally {
      setLoading(false)
    }
  }

  // ═══ Step 4: Auto / Manual ════════════════════════════════
  const handleAutoGenerate = async () => {
    setLoading(true)
    try {
      const result = await autoGenerateTimetable(mappings, meta.dept, meta.year, meta.section)
      const newGrid: GridState = {}
      for (const e of result) {
        newGrid[`${e.day_of_week}-${e.period}`] = {
          subject_id: e.subject_id, faculty_id: e.faculty_id, acronym: e.acronym, is_lab: e.is_lab
        }
      }
      setGrid(newGrid)
      setMode("auto")
      toast.success(`Auto-generated ${result.length} slots! You can still manually adjust.`)
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const handleManualMode = () => {
    setMode("manual")
    if (Object.keys(grid).length === 0) setGrid({})
  }

  // ─── Cell click ────────────────────────────────────────────
  const handleCellClick = (day: number, period: number) => {
    if (!canEdit) return
    setEditingCell({ day, period })
  }

  const handleCellAssign = (acronym: string) => {
    if (!editingCell) return
    const m = mappings.find(x => x.acronym === acronym)
    if (!m) return

    // ─── Start Smart Clash & Overload Live Check ───
    if (m.faculty_id && globalFacultyTimetables.length > 0) {
      // Check for Clash
      const clash = globalFacultyTimetables.find(
        (t) => t.faculty_id === m.faculty_id && t.day_of_week === editingCell.day && t.period === editingCell.period
      )
      
      if (clash) {
        toast.error(`${m.faculty_name} is already booked for ${clash.year}-${clash.dept}-${clash.section} at this time.`, {
          duration: 5000,
        })
      }

      // Check for Overload (>5 classes)
      // Count current assignments in the grid
      const localDayCount = Object.values(grid).filter(cell => 
        cell.faculty_id === m.faculty_id && parseInt(Object.keys(grid).find(key => grid[key] === cell)!.split('-')[0]) === editingCell.day
      ).length
      
      // Add existing global assignments
      const globalDayCount = globalFacultyTimetables.filter(
        (t) => t.faculty_id === m.faculty_id && t.day_of_week === editingCell.day
      ).length

      if ((localDayCount + globalDayCount) >= 5) {
        toast.warning(`${m.faculty_name} is exceeding max recommended workload (>5 periods) today.`, {
          duration: 4000
        })
      }
    }
    // ─── End Live Check ───

    // Lab assignment logic: spans 3 periods (1-3 for morning, 4-6 for afternoon)
    let periodsToAssign = [editingCell.period]
    if (m.is_lab) {
      const isMorning = editingCell.period <= 3
      periodsToAssign = isMorning ? [1, 2, 3] : [4, 5, 6]
    }

    // Conflict check for all periods
    for (const p of periodsToAssign) {
      const k = `${editingCell.day}-${p}`
      const busy = Object.entries(grid).find(([gk, c]) => 
        gk !== k && 
        c.faculty_id === m.faculty_id && 
        gk.split('-')[0] === editingCell.day.toString() && 
        gk.split('-')[1] === p.toString()
      )
      if (busy) {
        toast.warning(`${m.faculty_name || 'Faculty'} is already assigned to period ${p} on this day`)
        return
      }
    }

    setGrid(prev => {
      const next = { ...prev }
      for (const p of periodsToAssign) {
        next[`${editingCell.day}-${p}`] = { 
          subject_id: m.subject_id, faculty_id: m.faculty_id || "", acronym: m.acronym, is_lab: m.is_lab 
        }
      }
      return next
    })
    setEditingCell(null)
  }

  const handleCellDelete = (day: number, period: number) => {
    const key = `${day}-${period}`
    setGrid(prev => { const n = { ...prev }; delete n[key]; return n })
    setEditingCell(null)
  }

  // ═══ Step 5: Cross-Check & Submit ═════════════════════════
  const handlePreSubmit = async () => {
    const entries = Object.entries(grid).map(([k, c]) => {
      const [d, p] = k.split('-').map(Number)
      return { day_of_week: d, period: p, subject_id: c.subject_id, faculty_id: c.faculty_id }
    })
    if (entries.length === 0) { toast.warning('No entries to save'); return }

    setLoading(true)
    try {
      const results = await crossCheckValidation(entries, meta.dept, meta.year, meta.section)
      setConflicts(results)
      setShowCrossCheck(true)
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const handleConfirmSubmit = async () => {
    const entries = Object.entries(grid).map(([k, c]) => {
      const [d, p] = k.split('-').map(Number)
      return { day_of_week: d, period: p, subject_id: c.subject_id, faculty_id: c.faculty_id }
    })
    setIsSaving(true)
    try {
      // Save incharges (always save to allow clearing previous ones)
      const inchargeIds = [incharge1, incharge2].filter(Boolean)
      await saveClassIncharges(meta.dept, meta.year, meta.section, inchargeIds)

      // Save subject acronyms and credits that might have been edited in Step 2
      const subjectUpdates = mappings.map(m => updateSubject(m.subject_id, { acronym: m.acronym, credits: m.credits }))
      await Promise.allSettled(subjectUpdates)

      // Save timetable (convert relative semester to absolute)
      const absSem = (meta.year - 1) * 2 + meta.semester
      await saveBulkTimetable(entries, { ...meta, semester: absSem, effect_date: meta.effect_date || new Date().toISOString().split('T')[0] })
      toast.success(`Timetable saved for ${meta.year}-${meta.dept}-${meta.section}! Faculty schedules updated.`)
      setShowCrossCheck(false)
    } catch (err: any) { toast.error('Save failed: ' + err.message) }
    finally { setIsSaving(false) }
  }

  // ═══ Saved browser ════════════════════════════════════════
  const handleOpenSaved = async () => {
    setLoading(true)
    const saved = await fetchSavedClassTimetables(isHod ? profile?.dept || undefined : undefined)
    setSavedClasses(saved); setShowSavedBrowser(true); setLoading(false)
  }

  const handleLoadSaved = async (info: any) => {
    setMeta(m => ({ ...m, dept: info.dept, year: info.year, section: info.section }))
    setShowSavedBrowser(false)
    // Wait for state to update then load
    setTimeout(() => handleStep1Next(), 100)
  }

  const handleCloneTimetable = async (sourceInfo: any) => {
    if (!meta.dept || !meta.year || !meta.section) {
      toast.error('Please fill the current class metadata (Step 1) before cloning.')
      setShowSavedBrowser(false)
      return
    }

    setLoading(true)
    try {
      // 1. Fetch source timetable
      const sourceData = await fetchTimetableByClass(sourceInfo.dept, sourceInfo.year, sourceInfo.section)
      if (!sourceData || sourceData.length === 0) {
        toast.error('Source timetable is empty.')
        return
      }

      // 2. Pre-fetch subjects for the CURRENT class (since we might be cloning into a different year/sem)
      const absoluteSemester = (meta.year - 1) * 2 + meta.semester
      const currentClassSubjects = await fetchSubjectsByClass(meta.dept, meta.year, absoluteSemester)
      
      // Build mappings for the current class just like Step 1 does
      const newMappings: SubjectFacultyMapping[] = currentClassSubjects.map(s => ({
         subject_id: s.id, code: s.code, acronym: s.acronym || s.code,
         name: s.name, credits: s.credits || 3, faculty_id: "",
         faculty_name: "", is_lab: s.is_lab || false, batch: s.batch || "all",
      }))

      // Try to match source subjects to current subjects by acronym or code, 
      // to bring over the faculty assignments
      const newGrid: GridState = {}
      for (const e of sourceData) {
        // Find matching subject in CURRENT class's curriculum
        // We match by acronym first, then code
         const match = newMappings.find(m => 
           m.acronym === e.subject_acronym || m.code === e.subject_code
         )
         
         if (match) {
           newGrid[`${e.day_of_week}-${e.period}`] = {
             subject_id: match.subject_id,
             faculty_id: e.faculty_id, // Clone the faculty assignment
             acronym: match.acronym,
             is_lab: match.is_lab
           }
           // Update mapping with the cloned faculty
           match.faculty_id = e.faculty_id
           match.faculty_name = e.faculty_name
         }
      }

      setMappings(newMappings)
      setSelectedSubjects(new Set(newMappings.map(s => s.subject_id)))
      setGrid(newGrid)
      
      toast.success(`Cloned ${Object.keys(newGrid).length} assignments from ${sourceInfo.year}-${sourceInfo.dept}-${sourceInfo.section}.`)
      setShowSavedBrowser(false)
      
      // Pre-fetch global clashes and skip straight to manual mode (Step 4)
      const { data } = await supabase
        .from('master_timetables')
        .select('faculty_id, day_of_week, period, dept, year, section')
      
      const otherEntries = (data || []).filter(
        (e: any) => !(e.dept === meta.dept && e.year === meta.year && e.section === meta.section)
      )
      setGlobalFacultyTimetables(otherEntries)
      
      setMode('manual')
      setStep(4)

    } catch (err: any) {
      toast.error('Failed to clone timetable: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ═══ Print ════════════════════════════════════════════════
  const handlePrint = () => window.print()

  // ═══ Helper: cell display ═════════════════════════════════
  const getCellDisplay = (day: number, period: number) => {
    const cell = grid[`${day}-${period}`]
    if (!cell) return null
    const fac = allFacultyList.find(f => f.id === cell.faculty_id)
    return { acronym: cell.acronym || '???', faculty: fac?.full_name || 'Unassigned', is_lab: cell.is_lab }
  }

  // ═══ RENDER ═══════════════════════════════════════════════
  if (!canEdit) {
    return (
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
        <CardContent className="py-16 text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground mt-1">Only HODs, Admins, Principal, and Management can manage timetables.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Step Indicator ── */}
      <div className="flex items-center gap-2 print:hidden overflow-x-auto pb-2">
        {["Header Info", "Subjects & Faculty", "Class Incharge", "Timetable Grid", "Submit"].map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
            <button
              onClick={() => { if (i + 1 < step) setStep(i + 1) }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                step === i + 1 ? "bg-primary text-primary-foreground shadow-md" :
                  step > i + 1 ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20" :
                    "bg-muted text-muted-foreground"
              )}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-current/30">{i + 1}</span>
              {s}
            </button>
          </React.Fragment>
        ))}

        {/* Right-side buttons */}
        <div className="ml-auto flex gap-2 shrink-0 print:hidden">
          <Button variant="outline" size="sm" onClick={handleOpenSaved} disabled={loading}>
            <FolderOpen className="h-4 w-4 mr-1" /> Saved
          </Button>
        </div>
      </div>

      {/* ═══ STEP 1: Header Metadata ═══ */}
      {step === 1 && (
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Class Information</CardTitle>
            <CardDescription>Fill in the class details to begin timetable creation.{isHod && <span className="text-orange-600 font-semibold ml-1">(HOD: {profile?.dept} only)</span>}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label className="text-xs mb-1 block">Department *</Label>
                {isHod ? (
                  <Input value={profile?.dept || ''} disabled className="opacity-90 bg-muted cursor-not-allowed font-semibold h-10" />
                ) : (
                  <Select value={meta.dept} onValueChange={v => setMeta(m => ({ ...m, dept: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Dept" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div><Label className="text-xs mb-1 block">Year *</Label>
                <Select value={meta.year.toString()} onValueChange={v => setMeta(m => ({ ...m, year: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs mb-1 block">Semester *</Label>
                <Select value={meta.semester.toString()} onValueChange={v => setMeta(m => ({ ...m, semester: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEMESTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs mb-1 block">Section *</Label>
                <Select value={meta.section} onValueChange={v => setMeta(m => ({ ...m, section: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{filteredSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs mb-1 block">Regulation</Label>
                <Select value={meta.regulation} onValueChange={v => setMeta(m => ({ ...m, regulation: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGULATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs mb-1 block">Academic Year</Label>
                <Input value={meta.academic_year} onChange={e => setMeta(m => ({ ...m, academic_year: e.target.value }))} placeholder="2025-2026" />
              </div>
              <div><Label className="text-xs mb-1 block">LH (Room)</Label>
                <Input value={meta.room} onChange={e => setMeta(m => ({ ...m, room: e.target.value }))} placeholder="B1-301" />
              </div>
              <div><Label className="text-xs mb-1 block">With Effect From</Label>
                <Input type="date" value={meta.effect_date} onChange={e => setMeta(m => ({ ...m, effect_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={handleStep1Next} disabled={loading || !(isHod ? profile?.dept : meta.dept) || !meta.section}>
                {loading ? <DotLoader className="mr-2" /> : null}
                Next: Subjects & Faculty <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 2: Subject-Faculty Mapping ═══ */}
      {step === 2 && (
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Subject & Faculty Mapping</CardTitle>
            <CardDescription>
              Showing {mappings.length} subjects for {meta.year}-{meta.dept} Sem {meta.semester}.
              Select the subjects you need, then assign a faculty to each.
              <span className="ml-2 text-xs font-semibold text-primary">
                ({selectedSubjects.size} of {mappings.length} selected)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No subjects found for this class</p>
                <p className="text-sm mt-1">Add subjects in the Subject Catalog for {meta.dept}, Year {meta.year}, Sem {meta.semester}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="p-2 text-center w-10">
                        <input type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
                          checked={selectedSubjects.size === mappings.length && mappings.length > 0}
                          onChange={e => {
                            if (e.target.checked) setSelectedSubjects(new Set(mappings.map(m => m.subject_id)))
                            else setSelectedSubjects(new Set())
                          }}
                        />
                      </th>
                      <th className="p-2 text-left text-xs text-muted-foreground font-bold uppercase">Sub/Lab Code</th>
                      <th className="p-2 text-left text-xs text-muted-foreground font-bold uppercase">Acronym</th>
                      <th className="p-2 text-center text-xs text-muted-foreground font-bold uppercase w-20">Credits</th>
                      <th className="p-2 text-left text-xs text-muted-foreground font-bold uppercase">Subject/Lab Name</th>
                      <th className="p-2 text-left text-xs text-muted-foreground font-bold uppercase w-64">Faculty Name</th>
                      <th className="p-2 text-center text-xs text-muted-foreground font-bold uppercase w-24">Type</th>
                      <th className="p-2 text-center text-xs text-muted-foreground font-bold uppercase w-24">Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, i) => (
                      <tr key={m.subject_id} className={cn(
                        "border-b border-border/50 transition-colors",
                        selectedSubjects.has(m.subject_id) ? "hover:bg-muted/30" : "opacity-40 bg-muted/10"
                      )}>
                        <td className="p-2 text-center">
                          <input type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 accent-orange-500 cursor-pointer"
                            checked={selectedSubjects.has(m.subject_id)}
                            onChange={e => {
                              setSelectedSubjects(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(m.subject_id)
                                else next.delete(m.subject_id)
                                return next
                              })
                            }}
                          />
                        </td>
                        <td className="p-2 font-bold text-primary text-xs">{m.code}</td>
                        <td className="p-2">
                          <Input value={m.acronym} onChange={e => updateMappingField(i, 'acronym', e.target.value.toUpperCase())}
                            className="h-8 w-24 text-xs font-bold uppercase" />
                        </td>
                        <td className="p-2 text-center">
                          <Input type="number" value={m.credits} onChange={e => updateMappingField(i, 'credits', parseInt(e.target.value) || 0)}
                            className="h-8 w-16 text-xs text-center mx-auto" min={1} max={6} />
                        </td>
                        <td className="p-2 text-xs">{m.name}</td>
                        <td className="p-2">
                          <Select value={m.faculty_id} onValueChange={v => updateMappingFaculty(i, v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                            <SelectContent>
                              {(isElevated ? allFacultyList : deptFacultyList).map(f => (
                                <SelectItem key={f.id} value={f.id} className="text-xs">{f.full_name} ({f.dept})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-center">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold",
                            m.is_lab ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          )}>
                            {m.is_lab ? "Lab" : "Theory"}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                            {m.batch === 'all' ? 'All' : m.batch}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={handleStep2Next} disabled={selectedSubjects.size === 0}>
                Next: Class Incharge <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 3: Class Incharge ═══ */}
      {step === 3 && (
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Class Incharge</CardTitle>
            <CardDescription>Assign up to 2 class incharges for {meta.year}-{meta.dept}-{meta.section}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <Label className="text-xs mb-1 block">Class Incharge 1</Label>
                <div className="flex gap-2">
                  <Select value={incharge1} onValueChange={setIncharge1}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                    <SelectContent>
                      {deptFacultyList.map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {incharge1 && (
                    <Button variant="outline" size="icon" onClick={() => setIncharge1("")} title="Clear Incharge 1" className="shrink-0 text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Class Incharge 2 (Optional)</Label>
                <div className="flex gap-2">
                  <Select value={incharge2} onValueChange={setIncharge2}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                    <SelectContent>
                      {deptFacultyList.filter(f => f.id !== incharge1).map(f => <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {incharge2 && (
                    <Button variant="outline" size="icon" onClick={() => setIncharge2("")} title="Clear Incharge 2" className="shrink-0 text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={handleStep3Next}>Next: Build Timetable <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ STEP 4: Timetable Grid ═══ */}
      {step === 4 && (
        <>
          {/* Mode selector (if no mode chosen yet) */}
          {!mode && (
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
              <CardContent className="py-12">
                <h3 className="text-lg font-bold text-center mb-2">How would you like to build the timetable?</h3>
                <p className="text-sm text-muted-foreground text-center mb-8">Choose automatic for AI-assisted scheduling, or manual for full control.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                  <button onClick={handleAutoGenerate} disabled={loading}
                    className="flex-1 p-6 rounded-2xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all group text-center">
                    {loading ? <GridPulseLoader size="lg" className="mx-auto mb-3" /> : <Wand2 className="h-10 w-10 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />}
                    <h4 className="font-bold text-foreground">Automatic</h4>
                    <p className="text-xs text-muted-foreground mt-1">Smart algorithm places subjects optimally</p>
                  </button>
                  <button onClick={handleManualMode}
                    className="flex-1 p-6 rounded-2xl border-2 border-border hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all group text-center">
                    <Hand className="h-10 w-10 mx-auto mb-3 text-orange-500 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-foreground">Manual</h4>
                    <p className="text-xs text-muted-foreground mt-1">Place each subject where you want</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          {mode && (
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden" id="printable-timetable">
              {/* Print header */}
              <div className="hidden print:block p-6 text-center border-b">
                <h2 className="text-base font-bold uppercase tracking-wide">CLASS TIMETABLE</h2>
                <p className="text-xs mt-1">Department: {meta.dept} | Degree/Branch: B.Tech / {meta.dept} | Year/Sem: {meta.year}/{meta.semester} | Sec: '{meta.section}'</p>
                <p className="text-xs">Academic Year: {meta.academic_year} | LH: {meta.room} | Regulation: {meta.regulation} | With effect from: {meta.effect_date || new Date().toLocaleDateString()}</p>
              </div>

              <CardContent className="p-4 overflow-x-auto">
                {/* Screen header */}
                <div className="mb-4 flex items-center justify-between print:hidden">
                  <div>
                    <h3 className="font-bold text-foreground">
                      {meta.year}-{meta.dept}-{meta.section} | Sem {meta.semester} | {meta.regulation}
                    </h3>
                    <p className="text-xs text-muted-foreground">AY: {meta.academic_year} | Room: {meta.room || '—'} | Mode: {mode === 'auto' ? 'Auto-generated' : 'Manual'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs bg-background/50 hover:bg-background">
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setMode(null)} className="text-xs">
                      Change Mode
                    </Button>
                  </div>
                </div>

                <table className="w-full text-sm border-collapse min-w-[850px] print-bw-table">
                  <thead>
                    <tr>
                      <th className="border border-border p-2 bg-muted/30 w-[80px] text-center font-semibold text-[10px] text-muted-foreground uppercase">DAY/<br />TIME</th>
                      {PERIODS.map(p => (
                        <React.Fragment key={p.id}>
                          <th className="border border-border p-2 bg-muted/30 font-semibold text-center">
                            <div className="text-[9px] text-muted-foreground">{p.time}</div>
                            <div className="text-sm font-bold">{p.label}</div>
                          </th>
                          {p.id === 3 && (
                            <th className="border border-border p-2 bg-muted/40 text-[8px] text-muted-foreground/70 uppercase w-[40px] font-bold">
                              12:40<br />to<br />1:30
                            </th>
                          )}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIdx) => (
                      <tr key={day.id}>
                        <td className="border border-border p-2 font-bold bg-muted/10 text-center text-sm">{day.name}</td>
                        {PERIODS.map(period => {
                          const display = getCellDisplay(day.id, period.id)
                          const isActive = editingCell?.day === day.id && editingCell?.period === period.id

                          // Handle merged visualization for Lab subjects (spans 3 periods)
                          if (display?.is_lab) {
                            // Only render the td on the first period of the block
                            if (period.id === 2 || period.id === 3 || period.id === 5 || period.id === 6) {
                              return null
                            }
                          }

                          return (
                            <React.Fragment key={`${day.id}-${period.id}`}>
                              <td
                                colSpan={display?.is_lab ? 3 : 1}
                                className={cn(
                                  "border border-border p-1 min-h-[60px] cursor-pointer relative group transition-colors",
                                  display?.is_lab ? "w-[39%]" : "w-[13%]",
                                  display ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40",
                                  isActive && "ring-2 ring-primary ring-inset bg-primary/10"
                                )}
                                onClick={() => handleCellClick(day.id, period.id)}
                              >
                                {display ? (
                                  <div className="flex flex-col items-center justify-center text-center p-0.5 min-h-[50px] w-full">
                                    <span className="font-bold text-primary text-sm leading-tight flex items-center justify-center gap-1">
                                      {display.acronym}
                                    </span>
                                    <span className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate max-w-[95%] text-center">
                                      {display.faculty.split(' ').pop()}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="h-[50px] flex items-center justify-center text-muted-foreground/20 group-hover:text-muted-foreground/40 text-center w-full">
                                    <span className="text-lg">+</span>
                                  </div>
                                )}
                              </td>
                              {period.id === 3 && (dayIdx === 0 ? (
                                <td className="border border-border bg-muted/5 text-center relative" rowSpan={6}>
                                  <span className="transform -rotate-90 origin-center whitespace-nowrap text-lg font-black text-muted-foreground/15 tracking-[0.3em] absolute inset-0 flex items-center justify-center select-none">LUNCH</span>
                                </td>
                              ) : null)}
                            </React.Fragment>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cell edit bar (inline slot picker) */}
                {editingCell && (
                  <div className="mt-3 p-3 bg-muted/20 rounded-xl border border-border print:hidden animate-in fade-in-50 slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground">
                        {DAYS.find(d => d.id === editingCell.day)?.name} — Period {PERIODS.find(p => p.id === editingCell.period)?.label}
                      </span>
                      <div className="flex gap-1">
                        {grid[`${editingCell.day}-${editingCell.period}`] && (
                          <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => handleCellDelete(editingCell.day, editingCell.period)}>
                            <Trash2 className="h-3 w-3 mr-1" />Remove
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingCell(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {mappings.filter(m => m.faculty_id).map(m => {
                        // Check exact clash for this specific cell's day+period
                        const hasClash = globalFacultyTimetables.some(
                          t => t.faculty_id === m.faculty_id && t.day_of_week === editingCell.day && t.period === editingCell.period
                        )
                        const isSelected = grid[`${editingCell.day}-${editingCell.period}`]?.subject_id === m.subject_id

                        return (
                          <button key={m.subject_id} onClick={() => handleCellAssign(m.acronym)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : hasClash
                                  ? "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
                                  : "bg-background hover:bg-primary/10 hover:border-primary/40 border-border text-foreground"
                            )}>
                            {hasClash && !isSelected && <AlertTriangle className="h-3 w-3 text-red-500" strokeWidth={2.5} />}
                            {m.acronym}
                            <span className="font-normal text-[9px] ml-1 opacity-60">{(m.faculty_name || '').split(' ').pop()}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Submit row */}
                <div className="flex justify-between items-center mt-4 print:hidden">
                  <Button variant="outline" onClick={() => { setStep(3); setMode(null) }}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handlePreSubmit} disabled={loading || Object.keys(grid).length === 0} className="bg-green-600 hover:bg-green-700">
                    <ShieldAlert className="h-4 w-4 mr-2" /> Cross-Check & Submit
                  </Button>
                </div>
              </CardContent>

              {/* Subject mapping table (for print & reference) */}
              {mappings.filter(m => m.faculty_id).length > 0 && (
                <div className="px-4 pb-4 print:mt-6 print:px-0">
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2 print:text-black print:mb-4">
                    <span className="w-1 h-4 bg-primary rounded-full print:hidden" /> Subject & Faculty Mapping
                  </h3>
                  <table className="w-full text-xs border-collapse print-bw-table">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-1.5 text-left font-bold text-muted-foreground print:text-black">Sub Code</th>
                        <th className="p-1.5 text-left font-bold text-muted-foreground print:text-black">Acronym</th>
                        <th className="p-1.5 text-left font-bold text-muted-foreground print:text-black">Subject Name</th>
                        <th className="p-1.5 text-left font-bold text-muted-foreground print:text-black">Faculty Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.filter(m => m.faculty_id).map(m => (
                        <tr key={m.subject_id} className="border-b border-border/40">
                          <td className="p-1.5 font-bold text-primary print:text-black">{m.code}</td>
                          <td className="p-1.5 font-bold print:text-black">{m.acronym}</td>
                          <td className="p-1.5 print:text-black">{m.name}</td>
                          <td className="p-1.5 text-muted-foreground print:text-black">{m.faculty_name || allFacultyList.find(f => f.id === m.faculty_id)?.full_name || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Class Incharge line */}
                  <div>
                    {(incharge1 || incharge2) && (
                      <p className="mt-3 text-xs text-muted-foreground print:text-black">
                        <strong>Class I/C:</strong>{' '}
                        {[incharge1, incharge2].filter(Boolean).filter(id => id !== 'none').map(id => allFacultyList.find(f => f.id === id)?.full_name).filter(Boolean).join(' & ')}
                      </p>
                    )}
                  </div>

                  {/* Formal Signatures (Print Only) */}
                  <div className="hidden print:flex justify-between items-end mt-16 px-4">
                    <div className="text-center font-bold text-sm">
                      <div className="mb-2 text-xs font-normal">
                        {[incharge1, incharge2].filter(Boolean).filter(id => id !== 'none').map(id => allFacultyList.find(f => f.id === id)?.full_name).filter(Boolean).join(' / ')}
                      </div>
                      <div className="border-t border-black pt-1 px-6">Class Incharge</div>
                    </div>
                    <div className="text-center font-bold text-sm">
                      <div className="border-t border-black pt-1 px-8">HOD</div>
                    </div>
                    <div className="text-center font-bold text-sm">
                      <div className="border-t border-black pt-1 px-8">Principal</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ═══ Step 5 placeholder (cross-check triggered from step 4) ═══ */}

      {/* ─── Cross-Check Dialog ─── */}
      <Dialog open={showCrossCheck} onOpenChange={setShowCrossCheck}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldAlert className="h-5 w-5 text-primary" /> Cross-Check Validation
            </DialogTitle>
            <DialogDescription>Verifying {Object.keys(grid).length} slots for {meta.year}-{meta.dept}-{meta.section}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {conflicts.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">All Clear!</p>
                  <p className="text-sm text-green-600 dark:text-green-500">No faculty clashes or conflicts detected. Ready to submit.</p>
                </div>
              </div>
            ) : conflicts.map((c, i) => (
              <div key={i} className={cn(
                "flex items-start gap-3 p-3 rounded-xl border",
                c.severity === 'error' ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              )}>
                {c.severity === 'error' ? <X className="h-5 w-5 text-red-600 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold text-sm">{DAYS.find(d => d.id === c.day)?.name} — Period {PERIODS.find(p => p.id === c.period)?.label}</p>
                  <p className="text-sm text-muted-foreground">{c.message}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-2">
            <Button variant="outline" onClick={() => setShowCrossCheck(false)}>Go Back & Fix</Button>
            <Button onClick={handleConfirmSubmit} disabled={isSaving}
              className={conflicts.some(c => c.severity === 'error') ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}>
              {isSaving ? <DotLoader className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {conflicts.some(c => c.severity === 'error') ? "Submit Anyway" : "Submit Timetable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Saved Timetables Browser ─── */}
      <Dialog open={showSavedBrowser} onOpenChange={setShowSavedBrowser}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" /> Saved Timetables</DialogTitle>
            <DialogDescription>Click a class to load its timetable for editing.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {savedClasses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No saved timetables found.</p>
            ) : savedClasses.map((info, i) => (
              <div key={i} className="flex gap-2">
                <button onClick={() => handleLoadSaved(info)}
                  className="flex-1 flex items-center justify-between p-3 rounded-xl border border-border hover:bg-primary/5 hover:border-primary/30 transition-colors text-left group">
                  <div>
                    <span className="font-bold group-hover:text-primary transition-colors">{info.year}-{info.dept}-{info.section}</span>
                    <span className="text-xs text-muted-foreground ml-2">({info.entry_count} slots)</span>
                  </div>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <Button variant="outline" size="icon" className="h-auto w-12 shrink-0 border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary" 
                  title={`Clone for current class (${meta.year}-${meta.dept}-${meta.section})`}
                  onClick={() => handleCloneTimetable(info)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
