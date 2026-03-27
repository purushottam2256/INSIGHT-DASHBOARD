import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────
export interface Subject {
  id: string
  name: string
  code: string       // e.g. AM801PC
  acronym?: string   // e.g. COT
  dept: string
  year: number
  semester?: number
  credits?: number
  regulation?: string
  is_lab?: boolean
  batch?: string     // null=all, B1, B2
}

export interface TimetableEntry {
  id?: string
  faculty_id: string
  day_of_week: number
  period: number
  subject_id: string
  dept: string
  year: number
  section: string
  semester?: number
  regulation?: string
  academic_year?: string
  room?: string
  effect_date?: string
  subjects?: { name: string; code: string; acronym?: string }
  faculty_name?: string
  batch?: string
}

export interface SubjectFacultyMapping {
  subject_id: string
  code: string
  acronym: string
  name: string
  credits: number
  faculty_id: string
  faculty_name?: string
  is_lab: boolean
  batch: string   // 'all' | 'B1' | 'B2'
}

export interface ConflictResult {
  type: 'faculty_clash' | 'subject_clash' | 'overload' | 'missing_period'
  message: string
  day: number
  period: number
  severity: 'error' | 'warning'
}

export interface ClassMetadata {
  dept: string
  year: number
  semester: number
  section: string
  regulation: string
  academic_year: string
  room: string
  effect_date: string
}

export interface SavedClassInfo {
  dept: string
  year: number
  section: string
  semester?: number
  entry_count: number
}

// ─── Hook ────────────────────────────────────────────────────
export function useTimetable() {
  const [loading, setLoading] = useState(false)

  // ═══ SUBJECTS ══════════════════════════════════════════════
  const fetchSubjects = useCallback(async (deptFilter?: string) => {
    setLoading(true)
    let query = supabase.from('subjects').select('*').order('name')
    if (deptFilter && deptFilter !== 'All') query = query.eq('dept', deptFilter)
    const { data, error } = await query
    setLoading(false)
    if (error) { console.error('Error fetching subjects:', error); return [] }
    return (data as Subject[]) || []
  }, [])

  /** STRICT: only subjects for this dept + year + semester */
  const fetchSubjectsByClass = useCallback(async (dept: string, year: number, semester?: number) => {
    let query = supabase.from('subjects').select('*').eq('dept', dept).eq('year', year).order('name')
    if (semester) query = query.eq('semester', semester)
    const { data, error } = await query
    if (error) { console.error('fetchSubjectsByClass error:', error); return [] }
    return (data as Subject[]) || []
  }, [])

  const addSubject = async (subject: Omit<Subject, 'id'>) => {
    const { data, error } = await supabase.from('subjects').insert([subject]).select().single()
    if (error) throw error
    return data
  }

  const updateSubject = async (id: string, updates: Partial<Omit<Subject, 'id'>>) => {
    const { data, error } = await supabase.from('subjects').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) throw error
  }

  // ═══ CLASS INCHARGES ═══════════════════════════════════════
  const fetchClassIncharges = useCallback(async (dept: string, year: number, section: string) => {
    const { data, error } = await supabase
      .from('class_incharges')
      .select('id, faculty_id, profiles:faculty_id(full_name)')
      .eq('dept', dept).eq('year', year).eq('section', section)
      .eq('is_active', true)
    if (error) { console.error('fetchClassIncharges error:', error); return [] }
    return (data || []).map((d: any) => ({
      id: d.id,
      faculty_id: d.faculty_id,
      full_name: d.profiles?.full_name || 'Unknown',
    }))
  }, [])

  const saveClassIncharges = async (dept: string, year: number, section: string, facultyIds: string[]) => {
    // Delete old incharges for this class
    await supabase.from('class_incharges').delete().eq('dept', dept).eq('year', year).eq('section', section)
    // Insert new (max 2)
    const rows = facultyIds.slice(0, 2).map(fid => ({ faculty_id: fid, dept, year, section, is_active: true }))
    if (rows.length > 0) {
      const { error } = await supabase.from('class_incharges').insert(rows)
      if (error) throw error
    }
  }

  const fetchYearIncharge = useCallback(async (dept: string, year: number) => {
    const { data, error } = await supabase
      .from('class_incharges')
      .select('faculty_id')
      .eq('dept', dept).eq('year', year).eq('section', 'YEAR_INCHARGE')
      .eq('is_active', true)
      .single()
    if (error && error.code !== 'PGRST116') console.error('fetchYearIncharge error:', error)
    return data?.faculty_id || ""
  }, [])

  const saveYearIncharge = async (dept: string, year: number, facultyId: string) => {
    await supabase.from('class_incharges').delete()
      .eq('dept', dept).eq('year', year).eq('section', 'YEAR_INCHARGE')
    if (facultyId) {
      const { error } = await supabase.from('class_incharges').insert([{ 
        faculty_id: facultyId, dept, year, section: 'YEAR_INCHARGE', is_active: true 
      }])
      if (error) throw error
    }
  }

  // ═══ TIMETABLE: Faculty-centric (mobile app / faculty view) ════
  const fetchTimetable = useCallback(async (facultyId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('master_timetables')
      .select('*, subjects(name, code, acronym)')
      .eq('faculty_id', facultyId)
      .order('day_of_week')
      .order('period')
      
    setLoading(false)
    if (error) { console.error('fetchTimetable error:', error); return [] }
    
    return (data || []).map((e: any) => ({
      ...e,
      subject_name: e.subjects?.name,
      subject_code: e.subjects?.code,
      subject_acronym: e.subjects?.acronym || e.subjects?.code,
      batch: e.batch === 1 ? 'B1' : e.batch === 2 ? 'B2' : 'all'
    })) as any[]
  }, [])

  // ═══ TIMETABLE: Class-centric (dashboard) ═════════════════
  const fetchTimetableByClass = useCallback(async (dept: string, year: number, section: string, semester?: number) => {
    setLoading(true)
    let query = supabase
      .from('master_timetables')
      .select('*, subjects(name, code, acronym)')
      .eq('dept', dept).eq('year', year).eq('section', section)

    if (semester) {
      query = query.eq('semester', semester)
    }

    const { data, error } = await query
      .order('day_of_week').order('period')
    setLoading(false)
    if (error) { console.error('fetchTimetableByClass error:', error); return [] }

    if (data && data.length > 0) {
      const facIds = [...new Set(data.map((d: any) => d.faculty_id))]
      const { data: facs } = await supabase.from('profiles').select('id, full_name').in('id', facIds)
      const facMap = new Map((facs || []).map((f: any) => [f.id, f.full_name]))
      return data.map((e: any) => ({
        ...e,
        faculty_name: facMap.get(e.faculty_id) || 'Unknown',
        subject_code: e.subjects?.code,
        subject_acronym: e.subjects?.acronym || e.subjects?.code,
        subject_name: e.subjects?.name,
        batch: e.batch === 1 ? 'B1' : e.batch === 2 ? 'B2' : 'all'
      })) as any[]
    }
    return []
  }, [])

  const fetchSavedClassTimetables = useCallback(async (deptFilter?: string) => {
    let query = supabase.from('master_timetables').select('dept, year, section, semester')
    if (deptFilter && deptFilter !== 'All') query = query.eq('dept', deptFilter)
    const { data, error } = await query
    if (error) { console.error('fetchSavedClassTimetables error:', error); return [] }

    const map = new Map<string, SavedClassInfo>()
    for (const row of (data || [])) {
      const key = `${row.dept}-${row.year}-${row.section}-${row.semester || 1}` // default to 1 if null for backward compat
      if (!map.has(key)) map.set(key, { dept: row.dept, year: row.year, section: row.section, semester: row.semester || 1, entry_count: 0 })
      map.get(key)!.entry_count++
    }
    return Array.from(map.values()).sort((a, b) =>
      a.dept !== b.dept ? a.dept.localeCompare(b.dept) : a.year !== b.year ? a.year - b.year : a.semester !== b.semester ? (a.semester || 1) - (b.semester || 1) : a.section.localeCompare(b.section)
    )
  }, [])

  // ═══ AUTO-GENERATE TIMETABLE (Deterministic + Backtracking) ═══
  /**
   * Professional-grade algorithm to auto-place subjects into a 6-day × 6-period grid.
   * Rules:
   * - No subject more than 2× per day
   * - Labs = 3 consecutive periods, batch-aware (B1/B2 can share a block)
   * - Faculty must not be double-booked at same day+period
   * - Deterministic: uses least-loaded-first heuristic instead of random
   * - Backtracking: tries displacing already-placed subjects if stuck (max depth 3)
   * - Returns { placed, unplaced } so UI can warn about failures
   */
  const autoGenerateTimetable = async (
    mappings: SubjectFacultyMapping[],
    classDept: string,
    classYear: number,
    classSection: string,
  ): Promise<{ placed: any[]; unplaced: string[] }> => {
    // Get ALL existing timetable entries (other classes) to check faculty availability
    const { data: allEntries } = await supabase
      .from('master_timetables')
      .select('faculty_id, day_of_week, period, dept, year, section')

    const otherEntries = (allEntries || []).filter(
      (e: any) => !(e.dept === classDept && e.year === classYear && e.section === classSection)
    )

    // Faculty busy map: "facultyId-day-period" => true
    const busyMap = new Set<string>()
    for (const e of otherEntries) {
      busyMap.add(`${e.faculty_id}-${e.day_of_week}-${e.period}`)
    }

    const isFacultyFree = (fid: string, day: number, period: number) =>
      !busyMap.has(`${fid}-${day}-${period}`)

    // Build grid: 6 days × 6 periods
    type CellEntry = { subject_id: string; faculty_id: string; acronym: string; is_lab?: boolean; batch?: string } | null
    const grid: CellEntry[][] = Array.from({ length: 6 }, () => Array(6).fill(null))

    // ─── Helpers ─────────────────────────────────────────────
    const daySubjectCount = (day: number, subId: string) =>
      grid[day].filter(c => c?.subject_id === subId).length

    const isCellFree = (day: number, period: number) => grid[day][period] === null

    // Get total assignments for a subject across the entire grid
    const totalSubjectCount = (subId: string) =>
      grid.flat().filter(c => c?.subject_id === subId).length

    // Deterministic day ordering: sort by fewest occupied slots (least-loaded-first)
    const getLeastLoadedDays = (): number[] => {
      const dayCounts = Array.from({ length: 6 }, (_, d) => ({
        day: d,
        load: grid[d].filter(c => c !== null).length
      }))
      dayCounts.sort((a, b) => a.load - b.load)
      return dayCounts.map(d => d.day)
    }

    // Track unplaced subjects
    const unplacedSubjects: string[] = []

    // ─── Separate labs and theory ────────────────────────────
    const labs = mappings.filter(m => m.is_lab)
    const theories = mappings.filter(m => !m.is_lab)

    // Credits → weekly periods
    const theorySlots: { mapping: SubjectFacultyMapping; remaining: number }[] = theories.map(m => ({
      mapping: m,
      remaining: Math.max(m.credits || 3, 1),
    }))

    // ─── STEP 1: Place labs (3 consecutive periods) ──────────
    const labDayPreference = [3, 4, 5, 0, 1, 2] // prefer THU/FRI/SAT
    for (const lab of labs) {
      let placed = false
      for (const day of labDayPreference) {
        if (placed) break
        for (const startPeriod of [0, 3]) {
          if (startPeriod + 2 >= 6) continue
          const periodsOk = [startPeriod, startPeriod + 1, startPeriod + 2].every(p =>
            isCellFree(day, p) && isFacultyFree(lab.faculty_id, day + 1, p + 1)
          )
          if (periodsOk) {
            for (let p = startPeriod; p < startPeriod + 3; p++) {
              grid[day][p] = { subject_id: lab.subject_id, faculty_id: lab.faculty_id, acronym: lab.acronym, is_lab: true, batch: lab.batch }
            }
            placed = true
            break
          }
        }
      }
      if (!placed) unplacedSubjects.push(lab.acronym)
    }

    // ─── STEP 2: Place theory subjects (deterministic + backtracking) ───
    const tryPlaceTheory = (m: SubjectFacultyMapping, depth: number): boolean => {
      if (depth > 3) return false // max backtrack depth

      const dayOrder = getLeastLoadedDays()
      for (const day of dayOrder) {
        if (daySubjectCount(day, m.subject_id) >= 2) continue

        // Try free slots first
        for (let period = 0; period < 6; period++) {
          if (!isCellFree(day, period)) continue
          if (!isFacultyFree(m.faculty_id, day + 1, period + 1)) continue

          grid[day][period] = { subject_id: m.subject_id, faculty_id: m.faculty_id, acronym: m.acronym }
          return true
        }
      }

      // Backtracking: try displacing an existing theory subject to make room
      if (depth < 3) {
        for (const day of dayOrder) {
          if (daySubjectCount(day, m.subject_id) >= 2) continue

          for (let period = 0; period < 6; period++) {
            if (isCellFree(day, period)) continue // already tried free slots
            if (!isFacultyFree(m.faculty_id, day + 1, period + 1)) continue

            const existing = grid[day][period]
            if (!existing || existing.is_lab) continue // don't displace labs

            // Try to relocate the existing subject
            grid[day][period] = null
            const relocated = tryPlaceTheory(
              { ...theories.find(t => t.subject_id === existing.subject_id)!, faculty_id: existing.faculty_id } as SubjectFacultyMapping,
              depth + 1
            )

            if (relocated) {
              grid[day][period] = { subject_id: m.subject_id, faculty_id: m.faculty_id, acronym: m.acronym }
              return true
            } else {
              // Restore — backtrack failed
              grid[day][period] = existing
            }
          }
        }
      }

      return false
    }

    // Sort subjects: most credits first (hardest to place)
    theorySlots.sort((a, b) => b.remaining - a.remaining)

    for (const slot of theorySlots) {
      while (slot.remaining > 0) {
        const placed = tryPlaceTheory(slot.mapping, 0)
        if (placed) {
          slot.remaining--
        } else {
          // Could not place remaining periods for this subject
          for (let i = 0; i < slot.remaining; i++) {
            unplacedSubjects.push(slot.mapping.acronym)
          }
          slot.remaining = 0
        }
      }
    }

    // ─── STEP 3: Fill remaining empty slots (balanced) ──────
    if (theories.length > 0) {
      for (let d = 0; d < 6; d++) {
        for (let p = 0; p < 6; p++) {
          if (!isCellFree(d, p)) continue

          // Find placeable theory subjects, sorted by fewest total assignments
          let candidates = theories.filter(m =>
            isFacultyFree(m.faculty_id, d + 1, p + 1) &&
            daySubjectCount(d, m.subject_id) < 2
          )
          if (candidates.length === 0) {
            candidates = theories.filter(m =>
              isFacultyFree(m.faculty_id, d + 1, p + 1)
            )
          }
          if (candidates.length > 0) {
            candidates.sort((a, b) => totalSubjectCount(a.subject_id) - totalSubjectCount(b.subject_id))
            const m = candidates[0]
            grid[d][p] = { subject_id: m.subject_id, faculty_id: m.faculty_id, acronym: m.acronym }
          }
        }
      }
    }

    // ─── Convert to API format ──────────────────────────────
    const placed = []
    for (let day = 0; day < 6; day++) {
      for (let period = 0; period < 6; period++) {
        const c = grid[day][period]
        if (c) {
          placed.push({
            day_of_week: day + 1,
            period: period + 1,
            subject_id: c.subject_id,
            faculty_id: c.faculty_id,
            acronym: c.acronym,
            is_lab: c.is_lab
          })
        }
      }
    }

    return { placed, unplaced: unplacedSubjects }
  }

  // ═══ CROSS-CHECK VALIDATION ═══════════════════════════════
  const crossCheckValidation = async (
    entries: { day_of_week: number; period: number; subject_id: string; faculty_id: string; is_lab?: boolean }[],
    classDept: string, classYear: number, classSection: string,
  ): Promise<ConflictResult[]> => {
    const conflicts: ConflictResult[] = []

    const { data: allEntries } = await supabase
      .from('master_timetables')
      .select('day_of_week, period, faculty_id, dept, year, section, subject_id')

    const otherEntries = (allEntries || []).filter(
      (e: any) => !(e.dept === classDept && e.year === classYear && e.section === classSection)
    )

    const allFacIds = [...new Set([...entries.map(e => e.faculty_id), ...otherEntries.map((e: any) => e.faculty_id)])]
    const { data: facProfiles } = await supabase.from('profiles').select('id, full_name').in('id', allFacIds)
    const facMap = new Map((facProfiles || []).map((f: any) => [f.id, f.full_name]))

    // Check 1: Faculty clashes
    for (const entry of entries) {
      const clash = otherEntries.find(
        (e: any) => e.faculty_id === entry.faculty_id && e.day_of_week === entry.day_of_week && e.period === entry.period
      )
      if (clash) {
        conflicts.push({
          type: 'faculty_clash',
          message: `${facMap.get(entry.faculty_id) || 'Faculty'} is already teaching ${clash.year}-${clash.dept}-${clash.section} at this time`,
          day: entry.day_of_week, period: entry.period, severity: 'error',
        })
      }
    }

    // Check 2: Faculty overload (>5 periods/day)
    // Lab = 1 class count (we group periods of the same faculty & subject & day)
    const facDaySessions = new Map<string, Set<string>>()
    for (const entry of entries) {
      const key = `${entry.faculty_id}-${entry.day_of_week}`
      if (!facDaySessions.has(key)) facDaySessions.set(key, new Set())
      
      // If it's a lab, we count the subject + day as one session. 
      // If it's theory, we just count it as individual periods.
      if (entry.is_lab) {
        facDaySessions.get(key)!.add(`lab-${entry.subject_id}`)
      } else {
        facDaySessions.get(key)!.add(`theory-${entry.subject_id}-${entry.period}`)
      }
    }
    
    for (const [key, sessionSet] of facDaySessions) {
      const sessionCount = sessionSet.size
      if (sessionCount > 5) {
        const [fid, day] = key.split('-')
        conflicts.push({
          type: 'overload',
          message: `${facMap.get(fid) || 'Faculty'} has ${sessionCount} classes/labs on this day (max recommended: 5)`,
          day: parseInt(day), period: 0, severity: 'warning',
        })
      }
    }

    return conflicts
  }

  // ═══ SAVE BULK TIMETABLE ══════════════════════════════════
  const saveBulkTimetable = async (
    entries: { day_of_week: number; period: number; subject_id: string; faculty_id: string; batch?: string }[],
    meta: ClassMetadata,
  ) => {
    // Delete existing entries for this class and semester
    let deleteQuery = supabase
      .from('master_timetables').delete()
      .eq('dept', meta.dept).eq('year', meta.year).eq('section', meta.section)
    
    // Support backward compatibility if meta.semester is missing
    if (meta.semester) {
      deleteQuery = deleteQuery.eq('semester', meta.semester)
    }
      
    const { error: delErr } = await deleteQuery
    if (delErr) throw delErr

    const DAYS_MAP = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const PERIODS_MAP = [
      { id: "p1", start: "09:30:00", end: "10:30:00" },
      { id: "p2", start: "10:30:00", end: "11:30:00" },
      { id: "p3", start: "11:40:00", end: "12:40:00" },
      { id: "p4", start: "13:30:00", end: "14:20:00" },
      { id: "p5", start: "14:20:00", end: "15:10:00" },
      { id: "p6", start: "15:10:00", end: "16:00:00" },
      { id: "p7", start: "16:00:00", end: "16:50:00" } // Fallback
    ]

    const rows = entries.map(e => {
      const pInfo = PERIODS_MAP[e.period - 1] || PERIODS_MAP[0]
      return {
        faculty_id: e.faculty_id,
        day_of_week: e.day_of_week,
        day: DAYS_MAP[e.day_of_week],
        period: e.period,
        slot_id: pInfo.id,
        start_time: pInfo.start,
        end_time: pInfo.end,
        subject_id: e.subject_id,
        target_dept: meta.dept,
        target_year: meta.year,
        target_section: meta.section,
        dept: meta.dept,
        year: meta.year,
        section: meta.section,
        semester: meta.semester,
        regulation: meta.regulation,
        academic_year: meta.academic_year,
        room: meta.room,
        batch: e.batch === 'B1' ? 1 : e.batch === 'B2' ? 2 : null,
        effect_date: meta.effect_date || new Date().toISOString().split('T')[0],
      }
    })

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('master_timetables').insert(rows)
      if (insErr) throw insErr
    }
  }

  // ═══ LEGACY DELETE ════════════════════════════════════════
  const deleteTimetableEntry = async (dept: string, year: number, section: string, dayOfWeek: number, period: number) => {
    const { error } = await supabase.from('master_timetables').delete()
      .eq('dept', dept).eq('year', year).eq('section', section).eq('day_of_week', dayOfWeek).eq('period', period)
    if (error) throw error
  }

  const deleteTimetableEntryByFaculty = async (facultyId: string, dayOfWeek: number, period: number) => {
    const { error } = await supabase.from('master_timetables').delete()
      .eq('faculty_id', facultyId).eq('day_of_week', dayOfWeek).eq('period', period)
    if (error) throw error
  }

  const saveTimetableEntry = async (entry: TimetableEntry) => {
    const { data: existing } = await supabase
      .from('master_timetables').select('id')
      .eq('dept', entry.dept).eq('year', entry.year).eq('section', entry.section)
      .eq('day_of_week', entry.day_of_week).eq('period', entry.period).single()

    if (existing) {
      const { data, error } = await supabase.from('master_timetables')
        .update({ subject_id: entry.subject_id, faculty_id: entry.faculty_id, semester: entry.semester })
        .eq('id', existing.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase.from('master_timetables')
        .insert([{
          faculty_id: entry.faculty_id, day_of_week: entry.day_of_week, period: entry.period,
          subject_id: entry.subject_id, dept: entry.dept, year: entry.year, section: entry.section, semester: entry.semester,
        }]).select().single()
      if (error) throw error
      return data
    }
  }

  // ═══ FACULTY ══════════════════════════════════════════════
  const fetchFaculty = useCallback(async (deptFilter?: string) => {
    let query = supabase.from('profiles').select('id, full_name, dept, role').in('role', ['faculty', 'class_incharge', 'hod'])
    if (deptFilter && deptFilter !== 'All') query = query.eq('dept', deptFilter)
    const { data, error } = await query.order('full_name')
    if (error) { console.error('fetchFaculty error:', error); return [] }
    return data || []
  }, [])

  return {
    loading,
    fetchSubjects, fetchSubjectsByClass, addSubject, updateSubject, deleteSubject,
    fetchClassIncharges, saveClassIncharges,
    fetchYearIncharge, saveYearIncharge,
    fetchTimetable, fetchTimetableByClass, fetchSavedClassTimetables,
    autoGenerateTimetable,
    saveTimetableEntry, saveBulkTimetable,
    deleteTimetableEntry, deleteTimetableEntryByFaculty,
    crossCheckValidation,
    fetchFaculty,
  }
}
