import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AttendanceRecord {
    student_id: string
    roll_no: string
    name: string
    status: 'Present' | 'Absent' | 'OD' | 'Late' | 'Leave'
}

export interface ClassSessionData {
    id: string
    date: string
    start_time: string
    end_time?: string
    subject_id: string
    faculty_id: string
    target_year: number
    target_dept: string
    target_section: string
    subject_name?: string
    faculty_name?: string
    attendance_data: Record<string, 'Present' | 'Absent' | 'OD' | 'Late' | 'Leave'> // roll_no -> status
}

export function useAttendanceManager() {
    const [loading, setLoading] = useState(false)
    
    // Fetch all classes that occurred for a specific dept/year/section on a date
    const fetchClassSessions = useCallback(async (date: string, dept: string, year: number, section: string) => {
        setLoading(true)
        const { data: sessions, error } = await supabase
            .from('attendance_sessions')
            .select('*')
            .eq('date', date)
            .eq('target_dept', dept)
            .eq('target_year', year)
            .eq('target_section', section)
            .order('start_time', { ascending: true })
            
        if (error) {
            console.error("Error fetching class sessions:", error)
            setLoading(false)
            return []
        }
        
        if (!sessions || sessions.length === 0) {
            setLoading(false)
            return []
        }

        const sessionIds = sessions.map(s => s.id)
        const { data: logs, error: logsError } = await supabase
            .from('attendance_logs')
            .select('session_id, student_id, status')
            .in('session_id', sessionIds)

        setLoading(false)
        if (logsError) {
             console.error("Error fetching attendance logs:", logsError)
             return []
        }

        return sessions.map(session => {
            const sessionLogs = logs?.filter(log => log.session_id === session.id) || []
            const attendance_data: Record<string, string> = {}
            sessionLogs.forEach(log => {
                attendance_data[log.student_id] = log.status === 'present' || log.status === 'late' ? 'Present' :
                                                  log.status === 'absent' ? 'Absent' :
                                                  log.status === 'od' ? 'OD' :
                                                  log.status === 'leave' ? 'Leave' : '-'
            })
            return {
                ...session,
                attendance_data
            }
        }) as ClassSessionData[]
    }, [])

    // Fetch all classes that occurred within a given month (YYYY-MM)
    const fetchMonthlySessions = useCallback(async (monthStr: string, dept: string, year: number, section: string) => {
        setLoading(true)
        const [y, m] = monthStr.split('-')
        const startDate = `${monthStr}-01`
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
        const endDate = `${monthStr}-${lastDay}`

        const { data: sessions, error } = await supabase
            .from('attendance_sessions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .eq('target_dept', dept)
            .eq('target_year', year)
            .eq('target_section', section)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true })
            
        if (error) {
            console.error("Error fetching monthly sessions:", error)
            setLoading(false)
            return []
        }
        
        if (!sessions || sessions.length === 0) {
            setLoading(false)
            return []
        }

        // Fetch logs for these sessions
        const sessionIds = sessions.map(s => s.id)
        
        // Supabase has a URL length limit. For large months, we may need to chunk this, 
        // but for a single class over a month (~60-100 sessions max), it should be fine.
        const { data: logs, error: logsError } = await supabase
            .from('attendance_logs')
            .select('session_id, student_id, status')
            .in('session_id', sessionIds)

        setLoading(false)
        if (logsError) {
             console.error("Error fetching monthly attendance logs:", logsError)
             return []
        }

        // Reconstruct attendance_data mapping
        const sessionsWithData = sessions.map(session => {
            const sessionLogs = logs?.filter(log => log.session_id === session.id) || []
            const attendance_data: Record<string, string> = {}
            sessionLogs.forEach(log => {
                attendance_data[log.student_id] = log.status === 'present' || log.status === 'late' ? 'Present' :
                                                  log.status === 'absent' ? 'Absent' :
                                                  log.status === 'od' ? 'OD' :
                                                  log.status === 'leave' ? 'Leave' : '-'
            })
            return {
                ...session,
                attendance_data
            }
        })
        
        return sessionsWithData as ClassSessionData[]
    }, [])

    // Fetch the student roster for a specific class to build the Data Grid
    const fetchClassRoster = useCallback(async (dept: string, year: number, section: string) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('students')
            .select('id, roll_no, full_name, batch, is_le')
            .eq('dept', dept)
            .eq('year', year)
            .eq('section', section)
            .order('roll_no', { ascending: true })
            
        setLoading(false)
        if (error) {
            console.error("Error fetching student roster:", error)
            return []
        }
        return data || []
    }, [])

    // Manual Override / Update for a specific session
    const updateSessionAttendance = async (sessionId: string, newData: Record<string, string>) => {
        setLoading(true)
        
        let present = 0, absent = 0, od = 0
        Object.values(newData).forEach(status => {
            if (status === 'Present' || status === 'Late') present++
            else if (status === 'Absent' || status === 'Leave') absent++
            else if (status === 'OD') od++
        })
        
        const { error } = await supabase
            .from('attendance_sessions')
            .update({
                attendance_data: newData,
                present_count: present,
                absent_count: absent,
                od_count: od,
                total_students: present + absent + od
            })
            .eq('id', sessionId)
            
        setLoading(false)
        if (error) throw error
    }

    return {
        loading,
        fetchClassSessions,
        fetchMonthlySessions,
        fetchClassRoster,
        updateSessionAttendance
    }
}
