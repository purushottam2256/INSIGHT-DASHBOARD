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
      subject_acronym: e.subjects?.acronym || e.subjects?.code
    })) as any[]
  }, [])

  // ═══ TIMETABLE: Class-centric (dashboard) ═════════════════
  const fetchTimetableByClass = useCallback(async (dept: string, year: number, section: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('master_timetables')
      .select('*, subjects(name, code, acronym)')
      .eq('dept', dept).eq('year', year).eq('section', section)
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
      })) as any[]
    }
    return []
  }, [])

  const fetchSavedClassTimetables = useCallback(async (deptFilter?: string) => {
    let query = supabase.from('master_timetables').select('dept, year, section')
    if (deptFilter && deptFilter !== 'All') query = query.eq('dept', deptFilter)
    const { data, error } = await query
    if (error) { console.error('fetchSavedClassTimetables error:', error); return [] }

    const map = new Map<string, SavedClassInfo>()
    for (const row of (data || [])) {
      const key = `${row.dept}-${row.year}-${row.section}`
      if (!map.has(key)) map.set(key, { dept: row.dept, year: row.year, section: row.section, entry_count: 0 })
      map.get(key)!.entry_count++
    }
    return Array.from(map.values()).sort((a, b) =>
      a.dept !== b.dept ? a.dept.localeCompare(b.dept) : a.year !== b.year ? a.year - b.year : a.section.localeCompare(b.section)
    )
  }, [])

  // ═══ AUTO-GENERATE TIMETABLE ══════════════════════════════
  /**
   * Algorithm to auto-place subjects into a 6-day × 6-period grid.
   * Rules:
   * - No subject more than 2× per day
   * - Labs = 3 consecutive periods, batch-aware (B1/B2 alternate)
   * - Faculty must not be double-booked at same day+period
   * - Balanced distribution across the week
   */
  const autoGenerateTimetable = async (
    mappings: SubjectFacultyMapping[],
    classDept: string,
    classYear: number,
    classSection: string,
  ) => {
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
    type CellEntry = { subject_id: string; faculty_id: string; acronym: string; is_lab?: boolean } | null
    const grid: CellEntry[][] = Array.from({ length: 6 }, () => Array(6).fill(null))

    // Count subject appearances per day
    const daySubjectCount = (day: number, subId: string) =>
      grid[day].filter(c => c?.subject_id === subId).length

    // Check if grid cell is free
    const isCellFree = (day: number, period: number) => grid[day][period] === null

    // Separate labs and theory
    const labs = mappings.filter(m => m.is_lab)
    const theories = mappings.filter(m => !m.is_lab)

    // Calculate how many periods each theory subject needs per week
    // credits roughly maps to periods/week (3 credits = 3 periods, 4 credits = 4 periods)
    const theorySlots: { mapping: SubjectFacultyMapping; remaining: number }[] = theories.map(m => ({
      mapping: m,
      remaining: Math.max(m.credits || 3, 1),
    }))

    // ─── STEP 1: Place labs (3 consecutive periods) ──────────
    // Typically THU/FRI/SAT (days 3,4,5 = 0-indexed) for labs
    const labDays = [3, 4, 5, 0, 1, 2] // prefer THU,FRI,SAT first
    for (const lab of labs) {
      let placed = false
      for (const day of labDays) {
        if (placed) break
        // Try morning slots (periods 0,1,2) or afternoon (3,4,5)
        for (const startPeriod of [0, 3]) {
          if (startPeriod + 2 >= 6) continue
          // Check 3 consecutive free
          const periodsOk = [startPeriod, startPeriod + 1, startPeriod + 2].every(p =>
            isCellFree(day, p) && isFacultyFree(lab.faculty_id, day + 1, p + 1)
          )
          if (periodsOk) {
            for (let p = startPeriod; p < startPeriod + 3; p++) {
              grid[day][p] = { subject_id: lab.subject_id, faculty_id: lab.faculty_id, acronym: lab.acronym, is_lab: true }
            }
            placed = true
            break
          }
        }
      }
    }

    // ─── STEP 2: Place theory subjects ───────────────────────
    // Distribute evenly: iterate day-by-day, period-by-period  
    let attempts = 0
    const maxAttempts = 500
    while (theorySlots.some(s => s.remaining > 0) && attempts < maxAttempts) {
      attempts++
      // Pick the subject with most remaining periods
      theorySlots.sort((a, b) => b.remaining - a.remaining)
      const slot = theorySlots.find(s => s.remaining > 0)
      if (!slot) break

      const m = slot.mapping
      let placed = false

      // Try each day (shuffled to distribute evenly)
      const dayOrder = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5)
      for (const day of dayOrder) {
        if (placed) break
        // Max 2 per day
        if (daySubjectCount(day, m.subject_id) >= 2) continue

        for (let period = 0; period < 6; period++) {
          if (!isCellFree(day, period)) continue
          if (!isFacultyFree(m.faculty_id, day + 1, period + 1)) continue

          grid[day][period] = { subject_id: m.subject_id, faculty_id: m.faculty_id, acronym: m.acronym }
          slot.remaining--
          placed = true
          break
        }
      }

      // If we couldn't place it, reduce remaining to avoid infinite loop
      if (!placed) slot.remaining = 0
    }

    // ─── STEP 3: Fill remaining empty slots ────────────────────
    // If there are still empty slots, keep distributing theory subjects
    if (theories.length > 0) {
      const emptySlots: { day: number, period: number }[] = []
      for (let d = 0; d < 6; d++) {
        for (let p = 0; p < 6; p++) {
          if (isCellFree(d, p)) emptySlots.push({ day: d, period: p })
        }
      }

      for (const slot of emptySlots) {
        // Find theory subjects that are available and haven't exceeded 2 periods/day
        let validTheories = theories.filter(m =>
          isFacultyFree(m.faculty_id, slot.day + 1, slot.period + 1) &&
          daySubjectCount(slot.day, m.subject_id) < 2
        )

        // If none strictly valid, relax the 2 periods/day constraint
        if (validTheories.length === 0) {
          validTheories = theories.filter(m =>
            isFacultyFree(m.faculty_id, slot.day + 1, slot.period + 1)
          )
        }

        if (validTheories.length > 0) {
          // Sort to pick subjects with fewer total assignments to balance it out
          validTheories.sort((a, b) => {
            const sumA = grid.flat().filter(c => c?.subject_id === a.subject_id).length
            const sumB = grid.flat().filter(c => c?.subject_id === b.subject_id).length
            return sumA - sumB
          })
          
          const m = validTheories[0]
          grid[slot.day][slot.period] = { subject_id: m.subject_id, faculty_id: m.faculty_id, acronym: m.acronym }
        }
      }
    }

    // Convert internal grid to API return format
    const results = []
    for (let day = 0; day < 6; day++) {
      for (let period = 0; period < 6; period++) {
        const c = grid[day][period]
        if (c) {
          // day+1 to match 1-indexed days, period+1 for 1-indexed periods
          results.push({
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

    return results
  }

  // ═══ CROSS-CHECK VALIDATION ═══════════════════════════════
  const crossCheckValidation = async (
    entries: { day_of_week: number; period: number; subject_id: string; faculty_id: string }[],
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
    const facDayCounts = new Map<string, number>()
    for (const entry of entries) {
      const key = `${entry.faculty_id}-${entry.day_of_week}`
      facDayCounts.set(key, (facDayCounts.get(key) || 0) + 1)
    }
    for (const [key, count] of facDayCounts) {
      if (count > 5) {
        const [fid, day] = key.split('-')
        conflicts.push({
          type: 'overload',
          message: `${facMap.get(fid) || 'Faculty'} has ${count} periods on this day (max recommended: 5)`,
          day: parseInt(day), period: 0, severity: 'warning',
        })
      }
    }

    return conflicts
  }

  // ═══ SAVE BULK TIMETABLE ══════════════════════════════════
  const saveBulkTimetable = async (
    entries: { day_of_week: number; period: number; subject_id: string; faculty_id: string }[],
    meta: ClassMetadata,
  ) => {
    // Delete existing entries for this class
    const { error: delErr } = await supabase
      .from('master_timetables').delete()
      .eq('dept', meta.dept).eq('year', meta.year).eq('section', meta.section)
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
    fetchTimetable, fetchTimetableByClass, fetchSavedClassTimetables,
    autoGenerateTimetable,
    saveTimetableEntry, saveBulkTimetable,
    deleteTimetableEntry, deleteTimetableEntryByFaculty,
    crossCheckValidation,
    fetchFaculty,
  }
}
