import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useLeaves } from "@/hooks/useLeaves"
import { usePermissions } from "@/hooks/usePermissions"
import { useAuditLog } from "@/hooks/useAuditLog"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Check, CalendarDays, ArrowRight, RefreshCw, Shield, ChevronRight } from "lucide-react"
import { format, parseISO, eachDayOfInterval } from "date-fns"
import { useTimetable } from "@/hooks/useTimetable"
import { DEPARTMENTS } from "@/lib/constants"
import { toast } from 'sonner'

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

    const loadLeaves = async () => {
        const data = await fetchLeaves(deptFilter || "All", statusFilter)
        setLeaves(data)
    }

    useEffect(() => { loadLeaves() }, [statusFilter, deptFilter])

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
            if (permissions.canApproveLeaveStage1 && !permissions.canApproveLeaveStage2) {
                return handleHodApprove(leave)
            }
            // Admin/Principal can do both stages — go to sub dialog
            return handleOpenPrincipalApprove(leave)
        }
        if (leave.status === 'pending_principal') {
            return handleOpenPrincipalApprove(leave)
        }
    }

    /** Can the current user act on this leave? */
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
            return permissions.canApproveLeaveStage2 ? 'Approve & Cover' : 'Forward to Principal'
        }
        return 'Approve & Cover'
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">


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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-4 border-b">
                <div className="flex gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending_hod">⏳ Awaiting HOD</SelectItem>
                            <SelectItem value="pending_principal">🔵 Awaiting Principal</SelectItem>
                            <SelectItem value="approved">✅ Approved</SelectItem>
                            <SelectItem value="rejected">❌ Declined</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select disabled={permissions.isDeptScoped} value={deptFilter || "All"} onValueChange={setDeptFilter}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Departments</SelectItem>
                            {DEPARTMENTS.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={loadLeaves} variant="outline" size="sm" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />} Reload
                </Button>
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

                                {actionable && (
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
        </div>
    )
}
