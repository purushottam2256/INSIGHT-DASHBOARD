import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Subject {
  id: string
  name: string
  code: string
  dept: string
  year: number
  semester?: number
  credits?: number
}

export interface TimetableEntry {
  id?: string
  faculty_id: string
  day_of_week: number // 1 (Mon) - 6 (Sat)
  period: number // 1 - 7
  subject_id: string
  dept: string
  year: number
  section: string
  subjects?: { name: string; code: string }
}

export function useTimetable() {
  const [loading, setLoading] = useState(false)

  // Subjects Management
  const fetchSubjects = useCallback(async (deptFilter?: string) => {
    setLoading(true)
    let query = supabase.from('subjects').select('*').order('name')
    if (deptFilter && deptFilter !== 'All') {
      query = query.eq('dept', deptFilter)
    }
    const { data, error } = await query
    setLoading(false)
    if (error) {
      console.error('Error fetching subjects:', error)
      return []
    }
    return (data as Subject[]) || []
  }, [])

  const addSubject = async (subject: Omit<Subject, 'id'>) => {
    const { data, error } = await supabase.from('subjects').insert([subject]).select().single()
    if (error) throw error
    return data
  }

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) throw error
  }

  // Timetable Management
  const fetchTimetable = useCallback(async (facultyId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('master_timetables')
      .select('*')
      .eq('faculty_id', facultyId)
    
    setLoading(false)
    if (error) {
      console.error('Error fetching timetable:', error)
      return []
    }
    return (data as unknown as TimetableEntry[]) || []
  }, [])

  const saveTimetableEntry = async (entry: TimetableEntry) => {
    // 1. Check if the class is already booked by another faculty
    const { data: conflict } = await supabase
      .from('master_timetables')
      .select('faculty_id')
      .eq('day_of_week', entry.day_of_week)
      .eq('period', entry.period)
      .eq('year', entry.year)
      .eq('dept', entry.dept)
      .eq('section', entry.section)

    if (conflict && conflict.length > 0) {
      const conflictingId = conflict[0].faculty_id
      if (conflictingId !== entry.faculty_id) {
        const { data: fac } = await supabase.from('profiles').select('full_name').eq('id', conflictingId).single()
        throw new Error(`Time Conflict! This class is already assigned to ${fac?.full_name || 'another faculty'} during this period.`)
      }
    }

    // 2. Check if slot already exists for current faculty
    const { data: existing } = await supabase
      .from('master_timetables')
      .select('id')
      .eq('faculty_id', entry.faculty_id)
      .eq('day_of_week', entry.day_of_week)
      .eq('period', entry.period)
      .single()

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('master_timetables')
        .update({
          subject_id: entry.subject_id,
          dept: entry.dept,
          year: entry.year,
          section: entry.section
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      // Insert
      const { data, error } = await supabase
        .from('master_timetables')
        .insert([{
          faculty_id: entry.faculty_id,
          day_of_week: entry.day_of_week,
          period: entry.period,
          subject_id: entry.subject_id,
          dept: entry.dept,
          year: entry.year,
          section: entry.section
        }])
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  const deleteTimetableEntry = async (facultyId: string, dayOfWeek: number, period: number) => {
     const { error } = await supabase
      .from('master_timetables')
      .delete()
      .eq('faculty_id', facultyId)
      .eq('day_of_week', dayOfWeek)
      .eq('period', period)
    if (error) throw error
  }

  // Utilities
  const fetchFaculty = useCallback(async (deptFilter?: string) => {
    let query = supabase.from('profiles').select('id, full_name, dept, role').in('role', ['faculty', 'class_incharge', 'hod'])
    if (deptFilter && deptFilter !== 'All') {
      query = query.eq('dept', deptFilter)
    }
    const { data, error } = await query.order('full_name')
    if (error) {
      console.error('Error fetching faculty:', error)
      return []
    }
    return data || []
  }, [])

  return {
    loading,
    fetchSubjects,
    addSubject,
    deleteSubject,
    fetchTimetable,
    saveTimetableEntry,
    deleteTimetableEntry,
    fetchFaculty
  }
}
