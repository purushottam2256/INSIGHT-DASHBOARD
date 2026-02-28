import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface DetailedLeave {
    id: string
    user_id: string
    leave_type: string
    reason: string
    start_date: string
    end_date: string
    status: 'pending' | 'pending_hod' | 'pending_principal' | 'approved' | 'rejected'
    created_at: string
    approved_by_hod?: string
    hod_approved_at?: string
    approved_by_principal?: string
    principal_approved_at?: string
    profiles?: {
        full_name: string
        dept: string
    }
}

/**
 * Two-stage leave approval hook, backward-compatible with DB that may
 * still use "pending" status and lack the new columns.
 */
export function useLeaves() {
    const [loading, setLoading] = useState(false)

    /**
     * Fetch leaves. Maps status filter keys to actual DB values.
     * "pending_hod" filter → fetches BOTH 'pending' and 'pending_hod' from DB
     * because old leaves use 'pending' and new ones use 'pending_hod'.
     */
    const fetchLeaves = useCallback(async (
        deptFilter?: string,
        statusFilter: string = 'pending_hod',
    ) => {
        setLoading(true)

        try {
            let query = supabase
                .from('leaves')
                .select('*')
                .order('created_at', { ascending: false })

            // Smart filter: HOD tab shows BOTH old 'pending' and new 'pending_hod'
            if (statusFilter === 'pending_hod') {
                query = query.in('status', ['pending', 'pending_hod'])
            } else if (statusFilter === 'approved') {
                query = query.in('status', ['approved', 'accepted'])
            } else if (statusFilter === 'rejected') {
                query = query.in('status', ['rejected', 'declined'])
            } else if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data: rawLeaves, error: leavesError } = await query

            if (leavesError || !rawLeaves) {
                console.error("Error fetching leaves:", leavesError)
                setLoading(false)
                return []
            }

            let results: DetailedLeave[] = []

            if (rawLeaves.length > 0) {
                const userIds = [...new Set(rawLeaves.map(l => l.user_id))]
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, full_name, dept')
                    .in('id', userIds)

                results = rawLeaves.map(leave => {
                    const prof = profs?.find(p => p.id === leave.user_id)
                    return {
                        ...leave,
                        profiles: {
                            full_name: prof?.full_name || 'Unknown Faculty',
                            dept: prof?.dept || 'Unknown'
                        }
                    }
                }) as DetailedLeave[]
            }

            // Client-side dept filter
            if (deptFilter && deptFilter !== 'All') {
                results = results.filter(
                    r => r.profiles?.dept?.toLowerCase() === deptFilter.toLowerCase()
                )
            }

            setLoading(false)
            return results
        } catch (err) {
            console.error("fetchLeaves error:", err)
            setLoading(false)
            return []
        }
    }, [])

    /**
     * Stage 1: HOD approves → status changes to pending_principal.
     * Works whether current status is 'pending' or 'pending_hod'.
     * Gracefully handles missing columns by only updating status if
     * the extra columns don't exist yet.
     */
    const approveLeaveStage1 = async (leaveId: string, hodUserId: string) => {
        setLoading(true)
        // Try with new columns first
        const { error } = await supabase
            .from('leaves')
            .update({
                status: 'pending_principal',
                approved_by_hod: hodUserId,
                hod_approved_at: new Date().toISOString()
            })
            .in('status', ['pending', 'pending_hod'])
            .eq('id', leaveId)

        if (error) {
            // Fallback: just update status if new columns don't exist
            console.warn('Full update failed, trying status-only:', error.message)
            const { error: fallbackError } = await supabase
                .from('leaves')
                .update({ status: 'pending_principal' })
                .in('status', ['pending', 'pending_hod'])
                .eq('id', leaveId)

            setLoading(false)
            if (fallbackError) throw fallbackError
            return
        }

        setLoading(false)
    }

    /**
     * Stage 2: Principal approves → status changes to approved.
     * Optionally records who approved.
     */
    const approveLeaveStage2 = async (leaveId: string, principalUserId: string) => {
        setLoading(true)
        const { error } = await supabase
            .from('leaves')
            .update({
                status: 'approved',
                approved_by_principal: principalUserId,
                principal_approved_at: new Date().toISOString()
            })
            .eq('id', leaveId)

        if (error) {
            // Fallback: just update status
            const { error: fallbackError } = await supabase
                .from('leaves')
                .update({ status: 'approved' })
                .eq('id', leaveId)

            setLoading(false)
            if (fallbackError) throw fallbackError
            return
        }

        setLoading(false)
    }

    /** Reject at any stage — always works */
    const rejectLeave = async (leaveId: string) => {
        setLoading(true)
        const { error } = await supabase
            .from('leaves')
            .update({ status: 'rejected' })
            .eq('id', leaveId)

        setLoading(false)
        if (error) throw error
    }

    const fetchAffectedTimetable = async (facultyId: string) => {
        const { data, error } = await supabase
            .from('master_timetables')
            .select(`
                id, day_of_week, period, subject_id, dept, year, section,
                subjects(name, code)
            `)
            .eq('faculty_id', facultyId)

        if (error) throw error
        return (data || []).map((d: any) => ({
            ...d,
            subject_name: d.subjects?.name || d.subjects?.code
        }))
    }

    const assignSubstitute = async (
        _originalFacultyId: string,
        substituteFacultyId: string,
        date: string,
        period: number,
        subjectId: string,
        classDetails: { dept: string, year: number, section: string }
    ) => {
        setLoading(true)
        let slotId = "p1"
        if (period === 4 || period === 5 || period === 6) slotId = "p4"

        const { error } = await supabase
            .from('attendance_sessions')
            .insert([{
                date,
                slot_id: slotId,
                start_time: new Date().toISOString(),
                faculty_id: substituteFacultyId,
                subject_id: subjectId,
                target_dept: classDetails.dept,
                target_year: classDetails.year,
                target_section: classDetails.section,
                batch: null,
                total_students: 0,
                is_substitute: true,
                substitute_faculty_id: substituteFacultyId
            }])

        setLoading(false)
        if (error) throw error
    }

    return {
        loading,
        fetchLeaves,
        approveLeaveStage1,
        approveLeaveStage2,
        rejectLeave,
        fetchAffectedTimetable,
        assignSubstitute
    }
}
