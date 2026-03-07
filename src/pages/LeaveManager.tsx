import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useLeaves } from "@/hooks/useLeaves"
import { usePermissions } from "@/hooks/usePermissions"
import { useAuditLog } from "@/hooks/useAuditLog"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Check, CalendarDays, ArrowRight, RefreshCw, Shield, ChevronRight, Plus, Users, UserCheck, Search, Trash2 } from "lucide-react"
import { format, parseISO, eachDayOfInterval } from "date-fns"
import { useTimetable } from "@/hooks/useTimetable"
import { DEPARTMENTS } from "@/lib/constants"
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending_hod: { label: 'Awaiting HOD', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    pending: { label: 'Awaiting HOD', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    pending_principal: { label: 'Awaiting Principal', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    approved: { label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    accepted: { label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    rejected: { label: 'Declined', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    declined: { label: 'Declined', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
}

/** Is this a "pending at HOD" status? (backward-compat) */
const isHodPending = (s: string) => s === 'pending' || s === 'pending_hod'

const REASON_CATEGORIES = [
    { value: 'medical', label: 'Medical' },
    { value: 'personal', label: 'Personal' },
    { value: 'family', label: 'Family' },
    { value: 'academic', label: 'Academic' },
    { value: 'event', label: 'Event' },
    { value: 'other', label: 'Other' },
]

type LeaveTab = 'faculty' | 'student'

export function LeaveManager() {
    const { session } = useAuth()
    const permissions = usePermissions()
    const { logAction } = useAuditLog()
    const {
        fetchLeaves, approveLeaveStage1, approveLeaveStage2,
        rejectLeave, fetchAffectedTimetable, assignSubstitute, loading
    } = useLeaves()
    const { fetchFaculty } = useTimetable()

    // Default: HOD sees pending_hod, Principal sees pending_principal
    const getDefaultStatus = () => {
        if (permissions.canApproveLeaveStage2 && !permissions.canApproveLeaveStage1) return 'pending_principal'
        return 'pending_hod'
    }

    const [leaves, setLeaves] = useState<any[]>([])
    const [statusFilter, setStatusFilter] = useState(getDefaultStatus())
    const [deptFilter, setDeptFilter] = useState(
        permissions.isDeptScoped ? permissions.userDept || '' : "All"
    )

    // Sub Dialog State
    const [subDialogOpen, setSubDialogOpen] = useState(false)
    const [selectedLeave, setSelectedLeave] = useState<any | null>(null)
    const [missingClasses, setMissingClasses] = useState<any[]>([])
    const [subAssignments, setSubAssignments] = useState<Record<string, string>>({})
    const [facultyList, setFacultyList] = useState<any[]>([])

    // Fetch ALL leaves for summary stats (no status filter)
    const [allLeaves, setAllLeaves] = useState<any[]>([])
    
    const loadLeaves = async () => {
        const data = await fetchLeaves(deptFilter || "All", statusFilter)
        setLeaves(data)
    }
    
    const loadAllLeaves = async () => {
        const data = await fetchLeaves(deptFilter || "All", 'all')
        setAllLeaves(data)
    }

    useEffect(() => { loadLeaves() }, [statusFilter, deptFilter])
    useEffect(() => { loadAllLeaves() }, [deptFilter])
    
    // Summary stats computed from allLeaves
    const stats = useMemo(() => {
        const pending_hod = allLeaves.filter(l => l.status === 'pending' || l.status === 'pending_hod').length
        const pending_principal = allLeaves.filter(l => l.status === 'pending_principal').length
        const approved = allLeaves.filter(l => l.status === 'approved' || l.status === 'accepted').length
        const declined = allLeaves.filter(l => l.status === 'rejected' || l.status === 'declined').length
        return { pending_hod, pending_principal, approved, declined, total: allLeaves.length }
    }, [allLeaves])

    useEffect(() => {
        const loadFacs = async () => {
            const facs = await fetchFaculty(deptFilter === 'All' ? undefined : (deptFilter || undefined))
            setFacultyList(facs || [])
        }
        loadFacs()
    }, [deptFilter])

    const handleDecline = async (leave: any) => {
        try {
            await rejectLeave(leave.id)
            logAction('Leave Declined', 'leave', `Declined leave for ${leave.profiles?.full_name || 'Unknown'}`, {
                leaveId: leave.id,
                faculty: leave.profiles?.full_name,
                dates: `${leave.start_date} to ${leave.end_date}`,
            })
            toast.success('Leave request declined')
            loadLeaves()
        } catch (e: any) { toast.error('Error declining: ' + e.message) }
    }

    /** HOD Stage 1 approval — forward to principal */
    const handleHodApprove = async (leave: any) => {
        try {
            await approveLeaveStage1(leave.id, session?.user?.id || '')
            logAction('Leave HOD Approved', 'leave', `HOD approved, forwarded to Principal`, {
                leaveId: leave.id,
                faculty: leave.profiles?.full_name,
            })
            toast.success('Leave forwarded to Principal for final approval')
            loadLeaves()
        } catch (e: any) { toast.error('HOD approval failed: ' + e.message) }
    }

    /** Principal Stage 2 — open sub dialog and finalize */
    const handleOpenPrincipalApprove = async (leave: any) => {
        setSelectedLeave(leave)
        try {
            const start = parseISO(leave.start_date)
            const end = parseISO(leave.end_date)
            const dates = eachDayOfInterval({ start, end })
            const timetable = await fetchAffectedTimetable(leave.user_id)

            const derivedClasses: any[] = []
            dates.forEach(d => {
                const dayOfWeek = d.getDay()
                if (dayOfWeek === 0) return // Skip Sunday
                const slotsForDay = timetable.filter((t: any) => t.day_of_week === dayOfWeek)
                slotsForDay.forEach((slot: any) => {
                    derivedClasses.push({
                        id: `${slot.id}_${d.toISOString()}`,
                        date: format(d, 'yyyy-MM-dd'),
                        dateDisplay: format(d, 'EEE, MMM d'),
                        period: slot.period,
                        subjectId: slot.subject_id,
                        subjectName: slot.subject_name,
                        dept: slot.dept,
                        year: slot.year,
                        section: slot.section,
                    })
                })
            })

            setMissingClasses(derivedClasses.sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period))
            setSubAssignments({})
            setSubDialogOpen(true)
        } catch (e: any) { toast.error('Error loading classes: ' + e.message) }
    }

    const handleConfirmFinalApproval = async () => {
        if (!selectedLeave) return
        try {
            for (const cls of missingClasses) {
                const subId = subAssignments[cls.id]
                if (subId) {
                    await assignSubstitute(
                        selectedLeave.user_id, subId, cls.date, cls.period, cls.subjectId,
                        { dept: cls.dept, year: cls.year, section: cls.section }
                    )
                }
            }

            await approveLeaveStage2(selectedLeave.id, session?.user?.id || '')
            logAction('Leave Final Approved', 'leave', `Principal approved leave for ${selectedLeave.profiles?.full_name}`, {
                leaveId: selectedLeave.id,
                subsAssigned: Object.keys(subAssignments).length,
            })
            toast.success('Leave fully approved!')
            setSubDialogOpen(false)
            loadLeaves()
        } catch (e: any) { toast.error('Error finalizing: ' + e.message) }
    }

    /** Route action based on status + role */
    const handleAction = async (leave: any) => {
        if (isHodPending(leave.status)) {
            return handleHodApprove(leave)
        }
        if (leave.status === 'pending_principal') {
            return handleOpenPrincipalApprove(leave)
        }
    }

    /** Can the current user act on this leave? Only HOD for stage1, only Principal for stage2 */
    const canActOn = (leave: any) => {
        if (isHodPending(leave.status)) return permissions.canApproveLeaveStage1
        if (leave.status === 'pending_principal') return permissions.canApproveLeaveStage2
        return false
    }

    /** Get status display info */
    const getStatusInfo = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.pending

    /** Button label based on status + role */
    const getApproveLabel = (leave: any) => {
        if (isHodPending(leave.status)) {
            return 'Forward to Principal'
        }
        return 'Approve & Cover'
    }

    // ─── Tab state ───
    const [activeTab, setActiveTab] = useState<LeaveTab>('faculty')

    // ─── Student Leaves state ───
    const [studentLeaves, setStudentLeaves] = useState<any[]>([])
    const [studentLeaveFilter, setStudentLeaveFilter] = useState({ dept: permissions.isDeptScoped ? permissions.userDept || '' : 'All', year: 'All', section: 'All', status: 'All', category: 'All' })
    const [showAddStudentLeave, setShowAddStudentLeave] = useState(false)
    const [studentLeaveForm, setStudentLeaveForm] = useState({ student_id: '', reason_category: 'personal', reason_text: '', start_date: '', end_date: '' })
    const [studentsList, setStudentsList] = useState<any[]>([])
    const [studentLeaveLoading, setStudentLeaveLoading] = useState(false)
    const [studentLeaveSearch, setStudentLeaveSearch] = useState('')
    const [studentDialogSearch, setStudentDialogSearch] = useState('')

    // Fetch student leaves
    const loadStudentLeaves = async () => {
        setStudentLeaveLoading(true)
        let query = supabase.from('student_leaves').select('*, students(full_name, roll_no, dept, year, section)').order('created_at', { ascending: false })
        if (studentLeaveFilter.status !== 'All') query = query.eq('status', studentLeaveFilter.status)
        if (studentLeaveFilter.category !== 'All') query = query.eq('reason_category', studentLeaveFilter.category)
        const { data, error } = await query
        if (error) toast.error(error.message)
        else {
            let filtered = data || []
            if (studentLeaveFilter.dept !== 'All') filtered = filtered.filter((l: any) => l.students?.dept === studentLeaveFilter.dept)
            if (studentLeaveFilter.year !== 'All') filtered = filtered.filter((l: any) => l.students?.year === parseInt(studentLeaveFilter.year))
            if (studentLeaveFilter.section !== 'All') filtered = filtered.filter((l: any) => l.students?.section === studentLeaveFilter.section)
            setStudentLeaves(filtered)
        }
        setStudentLeaveLoading(false)
    }

    // Fetch students for dropdown
    const loadStudents = async () => {
        let query = supabase.from('students').select('id, full_name, roll_no, dept, year, section').eq('is_active', true).order('roll_no')
        if (permissions.isDeptScoped && permissions.userDept) query = query.eq('dept', permissions.userDept)
        const { data } = await query
        setStudentsList(data || [])
    }

    useEffect(() => { if (activeTab === 'student') { loadStudentLeaves(); loadStudents() } }, [activeTab, studentLeaveFilter])

    const handleAddStudentLeave = async () => {
        if (!studentLeaveForm.student_id || !studentLeaveForm.start_date || !studentLeaveForm.end_date) { toast.error('Please fill all required fields'); return }
        const { error } = await supabase.from('student_leaves').insert({
            student_id: studentLeaveForm.student_id,
            reason_category: studentLeaveForm.reason_category,
            reason_text: studentLeaveForm.reason_text,
            start_date: studentLeaveForm.start_date,
            end_date: studentLeaveForm.end_date,
            submitted_by: session?.user?.id,
            status: 'approved', // HOD directly approves
        })
        if (error) toast.error(error.message)
        else { toast.success('Student leave added'); setShowAddStudentLeave(false); setStudentLeaveForm({ student_id: '', reason_category: 'personal', reason_text: '', start_date: '', end_date: '' }); loadStudentLeaves() }
    }

    const handleStudentLeaveAction = async (id: string, action: 'approved' | 'rejected') => {
        const { error } = await supabase.from('student_leaves').update({ status: action, approved_by: session?.user?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
        if (error) toast.error(error.message)
        else { toast.success(`Leave ${action}`); loadStudentLeaves() }
    }

    const handleDeleteStudentLeave = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this student leave?')) return;
        const { error } = await supabase.from('student_leaves').delete().eq('id', id)
        if (error) toast.error(error.message)
        else { toast.success('Student leave deleted'); loadStudentLeaves() }
    }

    // Filter student leaves by search
    const filteredStudentLeaves = studentLeaves.filter((sl: any) => {
        if (!studentLeaveSearch.trim()) return true;
        const q = studentLeaveSearch.toLowerCase();
        return (sl.students?.full_name?.toLowerCase().includes(q) || sl.students?.roll_no?.toLowerCase().includes(q));
    });

    // Filter students in Add dialog by search
    const filteredStudentsList = studentsList.filter((s: any) => {
        if (!studentDialogSearch.trim()) return true;
        const q = studentDialogSearch.toLowerCase();
        return (s.full_name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">

            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
                <button onClick={() => setActiveTab('faculty')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'faculty' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    <UserCheck className="h-4 w-4" /> Faculty Leaves
                </button>
                <button onClick={() => setActiveTab('student')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'student' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Users className="h-4 w-4" /> Student Leaves
                </button>
            </div>

            {activeTab === 'faculty' ? (
            <>


            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button onClick={() => setStatusFilter('pending_hod')} className={`p-3 rounded-xl border text-center transition-all ${statusFilter === 'pending_hod' ? 'ring-2 ring-amber-500/40 border-amber-500/40' : 'hover:bg-muted/50'}`}>
                    <div className="text-2xl font-black text-amber-600">{stats.pending_hod}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Pending HOD</div>
                </button>
                <button onClick={() => setStatusFilter('pending_principal')} className={`p-3 rounded-xl border text-center transition-all ${statusFilter === 'pending_principal' ? 'ring-2 ring-blue-500/40 border-blue-500/40' : 'hover:bg-muted/50'}`}>
                    <div className="text-2xl font-black text-blue-600">{stats.pending_principal}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Pending Principal</div>
                </button>
                <button onClick={() => setStatusFilter('approved')} className={`p-3 rounded-xl border text-center transition-all ${statusFilter === 'approved' ? 'ring-2 ring-emerald-500/40 border-emerald-500/40' : 'hover:bg-muted/50'}`}>
                    <div className="text-2xl font-black text-emerald-600">{stats.approved}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Approved</div>
                </button>
                <button onClick={() => setStatusFilter('rejected')} className={`p-3 rounded-xl border text-center transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-red-500/40 border-red-500/40' : 'hover:bg-muted/50'}`}>
                    <div className="text-2xl font-black text-red-600">{stats.declined}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Declined</div>
                </button>
                <div className="p-3 rounded-xl border text-center flex flex-col justify-center">
                    <Select disabled={permissions.isDeptScoped} value={deptFilter || "All"} onValueChange={setDeptFilter}>
                        <SelectTrigger className="h-8 text-xs border-0 shadow-none p-0 justify-center font-bold"><SelectValue placeholder="Department" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Departments</SelectItem>
                            {DEPARTMENTS.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Department</div>
                </div>
                <button onClick={() => { loadLeaves(); loadAllLeaves() }} className="p-3 rounded-xl border text-center transition-all hover:bg-muted/50 flex flex-col items-center justify-center" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <RefreshCw className="h-5 w-5 text-primary" />}
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Reload</div>
                </button>
            </div>


            {/* Two-stage indicator */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border text-xs">
                <div className="flex items-center gap-1.5 font-medium text-amber-600">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold">1</span>
                    HOD Review
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <div className="flex items-center gap-1.5 font-medium text-blue-600">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold">2</span>
                    Principal Approval
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <div className="flex items-center gap-1.5 font-medium text-emerald-600">
                    <Shield className="h-3.5 w-3.5" />
                    Approved
                </div>
            </div>


            {/* Leave Cards */}
            {leaves.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed">
                    <CalendarDays className="h-8 w-8 mb-2 opacity-50" />
                    <p>No leave requests found for this filter.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {leaves.map((leave, i) => {
                        const statusInfo = getStatusInfo(leave.status)
                        const actionable = canActOn(leave)
                        return (
                            <Card key={i} className="flex flex-col md:flex-row justify-between border shadow-sm premium-glow">
                                <CardHeader className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {leave.profiles?.full_name || "Unknown Faculty"}
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border">
                                                    {leave.profiles?.dept || "N/A"}
                                                </span>
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-2">
                                                <CalendarDays className="h-4 w-4" />
                                                {format(new Date(leave.start_date), 'MMM d, yyyy')}
                                                <ArrowRight className="h-3 w-3" />
                                                {format(new Date(leave.end_date), 'MMM d, yyyy')}
                                            </CardDescription>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.bg} ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </div>
                                    </div>
                                    <p className="text-sm mt-3 pt-3 border-t">
                                        <span className="font-semibold mr-2">{leave.leave_type || 'Leave'}:</span>
                                        {leave.reason || 'No reason provided.'}
                                    </p>

                                    {/* Approval trail (shows if HOD already approved) */}
                                    {(leave.approved_by_hod || leave.status === 'pending_principal' || leave.status === 'approved') && (
                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                            <Check className="h-3 w-3 text-amber-500" />
                                            <span>HOD approved {leave.hod_approved_at ? format(new Date(leave.hod_approved_at), 'MMM d, h:mm a') : ''}</span>
                                            {leave.status === 'approved' && (
                                                <>
                                                    <ChevronRight className="h-3 w-3" />
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                    <span>Principal approved {leave.principal_approved_at ? format(new Date(leave.principal_approved_at), 'MMM d, h:mm a') : ''}</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </CardHeader>

                                {actionable ? (
                                    <CardFooter className="flex md:flex-col justify-end gap-3 p-6 bg-muted/20 border-l">
                                        <Button
                                            onClick={() => handleAction(leave)}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {getApproveLabel(leave)}
                                        </Button>
                                        <Button onClick={() => handleDecline(leave)} variant="destructive" className="w-full">
                                            Decline
                                        </Button>
                                    </CardFooter>
                                ) : (
                                    <CardFooter className="flex items-center justify-center p-6 bg-muted/10 border-l min-w-[160px]">
                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusInfo.bg} ${statusInfo.color} text-center`}>
                                            {statusInfo.label}
                                        </div>
                                    </CardFooter>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Cover Faculty Dialog (Stage 2) */}
            <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Approve Leave & Assign Cover Faculty</DialogTitle>
                        <DialogDescription>
                            Assign alternative faculty to cover classes during the leave period. You may skip classes if no cover is needed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        {missingClasses.length === 0 ? (
                            <div className="text-center p-6 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
                                <Check className="h-8 w-8 mx-auto mb-2" />
                                <p className="font-semibold">No Classes Affected</p>
                                <p className="text-sm mt-1">No timetable slots mapped for these dates.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {missingClasses.map((cls) => (
                                    <div key={cls.id} className="flex flex-col sm:flex-row items-center justify-between p-3 rounded-xl border gap-4 bg-muted/20">
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm mb-1">{cls.dateDisplay} • Period {cls.period}</div>
                                            <div className="text-xs text-muted-foreground flex gap-1.5 items-center">
                                                <span className="font-bold text-primary">{cls.subjectName || 'Subject'}</span>
                                                <span>•</span>
                                                <span>{cls.year}-{cls.dept}-{cls.section}</span>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-[220px]">
                                            <Select value={subAssignments[cls.id]} onValueChange={(val) => setSubAssignments({ ...subAssignments, [cls.id]: val })}>
                                                <SelectTrigger><SelectValue placeholder="Select Cover..." /></SelectTrigger>
                                                <SelectContent>
                                                    {facultyList.map(f => (
                                                        f.id !== selectedLeave?.user_id && (
                                                            <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>
                                                        )
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmFinalApproval} className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Confirm & Approve Leave
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </>
            ) : (
            /* ═══ STUDENT LEAVES TAB ═══ */
            <div className="space-y-4">
                {/* Search Bar + Filters */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by student name or roll number..."
                            value={studentLeaveSearch}
                            onChange={(e) => setStudentLeaveSearch(e.target.value)}
                            className="pl-9 h-10 rounded-xl"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Select value={studentLeaveFilter.dept} onValueChange={v => setStudentLeaveFilter(f => ({ ...f, dept: v }))} disabled={permissions.isDeptScoped}>
                            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Dept" /></SelectTrigger>
                            <SelectContent><SelectItem value="All">All Depts</SelectItem>{DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={studentLeaveFilter.year} onValueChange={v => setStudentLeaveFilter(f => ({ ...f, year: v }))}>
                            <SelectTrigger className="w-24 h-9 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent><SelectItem value="All">All</SelectItem>{[1,2,3,4].map(y => <SelectItem key={y} value={y.toString()}>Y{y}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={studentLeaveFilter.section} onValueChange={v => setStudentLeaveFilter(f => ({ ...f, section: v }))}>
                            <SelectTrigger className="w-24 h-9 text-xs"><SelectValue placeholder="Sec" /></SelectTrigger>
                            <SelectContent><SelectItem value="All">All</SelectItem>{['A','B','C','D','E'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={studentLeaveFilter.status} onValueChange={v => setStudentLeaveFilter(f => ({ ...f, status: v }))}>
                            <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent><SelectItem value="All">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                        </Select>
                        <Select value={studentLeaveFilter.category} onValueChange={v => setStudentLeaveFilter(f => ({ ...f, category: v }))}>
                            <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="Reason" /></SelectTrigger>
                            <SelectContent><SelectItem value="All">All</SelectItem>{REASON_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="ml-auto">
                            <Button size="sm" onClick={() => setShowAddStudentLeave(true)} className="gap-1">
                                <Plus className="h-4 w-4" /> Add Leave
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Student Leave Cards */}
                {studentLeaveLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : studentLeaves.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed">
                        <Users className="h-8 w-8 mb-2 opacity-50" />
                        <p>No student leave requests found.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredStudentLeaves.map((sl: any) => (
                            <Card key={sl.id} className="flex flex-col md:flex-row justify-between border shadow-sm">
                                <CardHeader className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                {sl.students?.full_name || 'Unknown'}
                                                <span className="text-xs font-mono text-muted-foreground">{sl.students?.roll_no}</span>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border">
                                                    {sl.students?.dept}-Y{sl.students?.year}-{sl.students?.section}
                                                </span>
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-2">
                                                <CalendarDays className="h-4 w-4" />
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                                                    {format(new Date(sl.start_date), 'MMM d, yyyy')}
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-primary" />
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                                                    {format(new Date(sl.end_date), 'MMM d, yyyy')}
                                                </span>
                                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-muted">{sl.total_days}d</span>
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                sl.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                                                sl.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-600' :
                                                'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                            }`}>
                                                {sl.status === 'approved' ? 'Approved' : sl.status === 'rejected' ? 'Rejected' : 'Pending'}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteStudentLeave(sl.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                                title="Delete leave"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm mt-2 pt-2 border-t">
                                        <span className="font-semibold capitalize mr-2 px-1.5 py-0.5 rounded bg-muted text-xs">{sl.reason_category}</span>
                                        {sl.reason_text || 'No details provided.'}
                                    </p>
                                </CardHeader>
                                {sl.status === 'pending' && (permissions.canApproveLeaveStage1 || permissions.canApproveLeaveStage2) && (
                                    <CardFooter className="flex md:flex-col justify-end gap-2 p-4 bg-muted/20 border-l">
                                        <Button size="sm" onClick={() => handleStudentLeaveAction(sl.id, 'approved')} className="bg-emerald-600 hover:bg-emerald-700 w-full">Approve</Button>
                                        <Button size="sm" onClick={() => handleStudentLeaveAction(sl.id, 'rejected')} variant="destructive" className="w-full">Reject</Button>
                                    </CardFooter>
                                )}
                            </Card>
                        ))}
                    </div>
                )}

                {/* Add Student Leave Dialog */}
                <Dialog open={showAddStudentLeave} onOpenChange={setShowAddStudentLeave}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add Student Leave Permission</DialogTitle>
                            <DialogDescription>Grant leave permission for a student within your department.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Student *</Label>
                                <div className="relative mb-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search student name or roll no..."
                                        value={studentDialogSearch}
                                        onChange={(e) => setStudentDialogSearch(e.target.value)}
                                        className="pl-9 h-9 text-sm rounded-lg"
                                    />
                                </div>
                                <Select value={studentLeaveForm.student_id} onValueChange={v => setStudentLeaveForm(f => ({ ...f, student_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Select Student..." /></SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {filteredStudentsList.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.roll_no}) — {s.dept}-Y{s.year}-{s.section}</SelectItem>
                                        ))}
                                        {filteredStudentsList.length === 0 && (
                                            <div className="px-4 py-3 text-xs text-muted-foreground text-center">No matching students found.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Start Date *</Label>
                                    <Input type="date" value={studentLeaveForm.start_date} onChange={e => setStudentLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">End Date *</Label>
                                    <Input type="date" value={studentLeaveForm.end_date} onChange={e => setStudentLeaveForm(f => ({ ...f, end_date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Reason Category</Label>
                                <Select value={studentLeaveForm.reason_category} onValueChange={v => setStudentLeaveForm(f => ({ ...f, reason_category: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{REASON_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Details / Reason</Label>
                                <Textarea placeholder="Optional details..." value={studentLeaveForm.reason_text} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStudentLeaveForm(f => ({ ...f, reason_text: e.target.value }))} rows={3} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddStudentLeave(false)}>Cancel</Button>
                            <Button onClick={handleAddStudentLeave} className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="h-4 w-4 mr-1" /> Grant Leave
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            )}

        </div>
    )
}
