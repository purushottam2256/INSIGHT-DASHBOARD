import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useAttendanceManager, ClassSessionData } from "@/hooks/useAttendanceManager"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, AlertCircle, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { format, addMonths, subMonths } from "date-fns"
import { ReportsGenerator } from "@/components/attendance/ReportsGenerator"
import { DEPARTMENTS } from "@/lib/constants"

export function AttendanceManager() {
    const { profile } = useAuth()
    const { fetchMonthlySessions, fetchClassRoster, loading } = useAttendanceManager()
    
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        dept: profile?.role === 'hod' ? (profile?.dept || "CSM") : "CSM",
        year: "1",
        section: "A",
        period: "all"
    })
    
    const [sessions, setSessions] = useState<ClassSessionData[]>([])
    const [roster, setRoster] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    
    // Auto-sync dept filter when profile loads (fixes "CSE" default before auth finishes)
    useEffect(() => {
        if (profile?.role === 'hod' && profile?.dept) {
            setFilters(prev => ({ ...prev, dept: profile.dept || "CSM" }))
        }
    }, [profile?.role, profile?.dept])
    
    const isHod = profile?.role === 'hod'

    const handleSearchClass = async () => {
        const [loadedSessions, loadedRoster] = await Promise.all([
            fetchMonthlySessions(filters.month, filters.dept, parseInt(filters.year), filters.section),
            fetchClassRoster(filters.dept, parseInt(filters.year), filters.section),
        ])
        setSessions(loadedSessions)
        setRoster(loadedRoster)
    }

    // Auto-load on initial mount if Hod
    useEffect(() => {
        handleSearchClass()
    }, [filters.month, filters.dept, filters.year, filters.section])
    
    // Auto-swap Year if not H&S
    useEffect(() => {
        if (filters.dept !== 'H&S' && filters.year === "1") {
            setFilters(prev => ({ ...prev, year: "2" }))
        }
    }, [filters.dept])

    const filteredRoster = roster.filter(s => 
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.roll_no.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredSessions = sessions.filter(s => {
        if (filters.period === "all") return true;
        return (s as any).slot_id?.toLowerCase() === filters.period.toLowerCase();
    })

    // Get unique dates that have sessions in the month
    const uniqueDates = Array.from(new Set(filteredSessions.map(s => s.date))).sort()

    // Data prep for Excel Export
    const generateExcelData = () => {
        const data: any[] = []
        filteredRoster.forEach(student => {
             const row: any = {
                 'Roll No': student.roll_no,
                 'Student Name': student.full_name,
                 'Batch': student.batch
             }
             let overallP = 0, overallA = 0, overallOD = 0, overallL = 0;
             uniqueDates.forEach((dateStr) => {
                 const daySessions = filteredSessions.filter(s => s.date === dateStr)
                 let dayP = 0, dayA = 0, dayOD = 0, dayL = 0;
                 daySessions.forEach(sess => {
                     let status: any = sess.attendance_data?.[student.id] || sess.attendance_data?.[student.roll_no] || '-'
                     if (typeof status === 'string' && status !== '-') {
                         status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
                     }
                     if (status === 'Present' || status === 'Late') dayP++
                     else if (status === 'Absent') dayA++
                     else if (status === 'OD') dayOD++
                     else if (status === 'Leave') dayL++
                 })
                 
                 overallP += dayP; overallA += dayA; overallOD += dayOD; overallL += dayL;
                 
                 let cellVal = '-';
                 if (dayP > 0) cellVal = 'P'
                 else if (dayOD > 0) cellVal = `OD: ${dayOD}`
                 else if (dayL > 0) cellVal = `L: ${dayL}`
                 else if (dayA > 0) cellVal = 'A'
                 
                 row[format(new Date(dateStr), 'MMM d')] = cellVal
             })
             row['Tot. P'] = overallP
             row['Tot. A'] = overallA
             row['Tot. OD'] = overallOD
             row['Tot. L'] = overallL
             row['Attendance %'] = (overallP + overallA + overallOD) > 0 
                ? Math.round(((overallP + overallOD) / (overallP + overallA + overallOD)) * 100) + '%'
                : '-'
             data.push(row)
        })
        return data
    }

    const handlePrevMonth = () => setFilters(f => ({ ...f, month: format(subMonths(new Date(`${f.month}-01`), 1), 'yyyy-MM') }))
    const handleNextMonth = () => setFilters(f => ({ ...f, month: format(addMonths(new Date(`${f.month}-01`), 1), 'yyyy-MM') }))

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Monthly Overview</h1>
                </div>
                
                {/* Sleek Month Strip */}
                <div className="flex items-center gap-1 bg-background border shadow-sm rounded-lg p-1">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth} disabled={loading} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <Button variant="ghost" className="h-8 px-3 font-medium min-w-[140px] flex items-center justify-center gap-2 pointer-events-none">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {format(new Date(`${filters.month}-01`), 'MMMM yyyy')}
                    </Button>

                    <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={loading} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Compact Filters */}
            <div className="bg-muted/30 border rounded-lg p-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                     <Label className="text-xs text-muted-foreground whitespace-nowrap">Department:</Label>
                    <Select disabled={isHod} value={filters.dept} onValueChange={(v) => setFilters({...filters, dept: v})}>
                        <SelectTrigger className={`h-8 w-28 text-xs ${isHod ? "opacity-90 bg-muted" : ""}`}><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                            {isHod && profile?.dept ? (
                                <SelectItem value={profile.dept}>{profile.dept}</SelectItem>
                            ) : (
                                <>
                                    {DEPARTMENTS.map(d => (
                                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                    ))}
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Year:</Label>
                    <Select value={filters.year} onValueChange={(v) => setFilters({...filters, year: v})}>
                        <SelectTrigger className="h-8 w-16 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
                        <SelectContent>
                            {filters.dept === 'H&S' && <SelectItem value="1">1</SelectItem>}
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Section:</Label>
                    <Input 
                        className="h-8 w-12 text-xs text-center"
                        value={filters.section} 
                        onChange={(e) => setFilters({...filters, section: e.target.value.toUpperCase()})}
                        placeholder="A"
                        maxLength={1}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Period:</Label>
                    <Select value={filters.period} onValueChange={(v) => setFilters({...filters, period: v})}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="All Periods" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Periods</SelectItem>
                            <SelectItem value="p1">P1 (Forenoon)</SelectItem>
                            <SelectItem value="p4">P4 (Afternoon)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground mr-1" />}
            </div>

            {sessions.length > 0 && roster.length > 0 ? (
                <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 bg-secondary/50 dark:bg-secondary/20 pb-4">
                        <div>
                            <CardTitle className="text-[15px] font-black tracking-tight text-foreground">Attendance Record</CardTitle>
                            <CardDescription className="text-[11px] font-semibold uppercase tracking-widest mt-1">
                                {filters.year} Year • {filters.dept} • Section {filters.section} — {format(new Date(`${filters.month}-01`), 'MMMM yyyy')}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or roll no..."
                                    className="pl-9 h-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <ReportsGenerator 
                                data={generateExcelData()} 
                                filename={`Attendance_${filters.dept}_${filters.year}${filters.section}_${filters.month}`} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-muted/40">
                                    <th className="border-b p-4 text-left font-semibold text-muted-foreground w-16">#</th>
                                    <th className="border-b p-4 text-left font-semibold text-muted-foreground w-40">Roll No</th>
                                    <th className="border-b p-4 text-left font-semibold text-muted-foreground min-w-[200px]">Student Name</th>
                                    
                                    {uniqueDates.map(dateStr => (
                                        <th key={dateStr} className="border-b border-l p-3 text-center min-w-[60px] text-xs">
                                            {format(new Date(dateStr), 'MMM d')}
                                        </th>
                                    ))}
                                    
                                    <th className="border-b border-l p-3 text-center min-w-[70px] text-emerald-600 bg-emerald-500/5">Tot. P</th>
                                    <th className="border-b p-3 text-center min-w-[70px] text-red-600 bg-red-500/5">Tot. A</th>
                                    <th className="border-b p-3 text-center min-w-[70px] text-yellow-600 bg-yellow-500/5">Tot. OD</th>
                                    <th className="border-b p-3 text-center min-w-[70px] text-orange-600 bg-orange-500/5">Tot. L</th>
                                    <th className="border-b p-3 text-center min-w-[80px] font-bold">Overall %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredRoster.map((student, idx) => {
                                    let overallP = 0, overallA = 0, overallOD = 0, overallL = 0;
                                    
                                    return (
                                    <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="p-4 text-muted-foreground text-xs">{idx + 1}</td>
                                        <td className="p-4 font-mono font-medium">{student.roll_no}</td>
                                        <td className="p-4 font-medium">{student.full_name}</td>
                                        
                                        {uniqueDates.map(dateStr => {
                                            const daySessions = filteredSessions.filter(s => s.date === dateStr)
                                            let dayP = 0, dayA = 0, dayOD = 0, dayL = 0;
                                            daySessions.forEach(sess => {
                                                let status: any = sess.attendance_data?.[student.id] || sess.attendance_data?.[student.roll_no] || '-'
                                                if (typeof status === 'string' && status !== '-') {
                                                    status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
                                                }
                                                if (status === 'Present' || status === 'Late') dayP++
                                                else if (status === 'Absent') dayA++
                                                else if (status === 'OD') dayOD++
                                                else if (status === 'Leave') dayL++
                                            })
                                            
                                            overallP += dayP; overallA += dayA; overallOD += dayOD; overallL += dayL;
                                            
                                            let content: any = <span className="text-muted-foreground/30 font-bold">-</span>
                                            if (dayP > 0) content = <span className="text-emerald-600 font-bold">P</span>
                                            else if (dayOD > 0) content = <span className="text-yellow-600 font-bold px-1.5 py-0.5 bg-yellow-500/10 rounded">OD: {dayOD}</span>
                                            else if (dayL > 0) content = <span className="text-orange-600 font-bold px-1.5 py-0.5 bg-orange-500/10 rounded">L: {dayL}</span>
                                            else if (dayA > 0) content = <span className="text-red-600 font-bold">A</span>
                                            
                                            return (
                                                <td key={dateStr} className="border-l p-3 text-center bg-background/50">
                                                    {content}
                                                </td>
                                            )
                                        })}
                                        
                                        <td className="border-l p-3 text-center font-bold text-emerald-600 bg-emerald-500/5">{overallP > 0 ? overallP : '-'}</td>
                                        <td className="border-l p-3 text-center font-bold text-red-600 bg-red-500/5">{overallA > 0 ? overallA : '-'}</td>
                                        <td className="border-l p-3 text-center font-bold text-yellow-600 bg-yellow-500/5">{overallOD > 0 ? overallOD : '-'}</td>
                                        <td className="border-l p-3 text-center font-bold text-orange-600 bg-orange-500/5">{overallL > 0 ? overallL : '-'}</td>
                                        {(() => {
                                            const totalCounted = overallP + overallA + overallOD;
                                            const pct = totalCounted > 0 ? Math.round(((overallP + overallOD) / totalCounted) * 100) : -1;
                                            return (
                                                <td className={`border-l p-3 text-center font-extrabold ${
                                                    pct < 0 ? '' : pct >= 75 ? 'text-emerald-600 bg-emerald-500/5' : pct >= 65 ? 'text-amber-600 bg-amber-500/5' : 'text-red-600 bg-red-500/5'
                                                }`}>
                                                    {pct >= 0 ? `${pct}%` : '-'}
                                                </td>
                                            );
                                        })()}
                                    </tr>
                                )})}
                                {/* Class Summary Footer */}
                                <tr className="bg-muted/40 font-bold border-t-2 border-primary/30">
                                    <td className="p-4 text-xs text-muted-foreground" colSpan={3}>CLASS AVERAGE</td>
                                    {uniqueDates.map(dateStr => {
                                        const daySessions = filteredSessions.filter(s => s.date === dateStr)
                                        let dayTotal = 0, dayP = 0;
                                        filteredRoster.forEach(student => {
                                            daySessions.forEach(sess => {
                                                let status: any = sess.attendance_data?.[student.id] || sess.attendance_data?.[student.roll_no] || '-'
                                                if (typeof status === 'string' && status !== '-') {
                                                    status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
                                                }
                                                if (status !== '-') dayTotal++
                                                if (status === 'Present' || status === 'Late' || status === 'OD') dayP++
                                            })
                                        })
                                        const pct = dayTotal > 0 ? Math.round((dayP / dayTotal) * 100) : -1;
                                        return (
                                            <td key={dateStr} className={`border-l p-3 text-center text-xs font-bold ${
                                                pct < 0 ? 'text-muted-foreground/30' : pct >= 75 ? 'text-emerald-600' : pct >= 65 ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                                {pct >= 0 ? `${pct}%` : '-'}
                                            </td>
                                        )
                                    })}
                                    <td className="border-l p-3" colSpan={5} />
                                </tr>
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            ) : roster.length > 0 && !loading && sessions.length === 0 ? (
                 <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden border-dashed">
                     <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                         <div className="p-4 rounded-full bg-muted/30 mb-4 ring-8 ring-muted/10">
                             <AlertCircle className="h-10 w-10 text-muted-foreground" />
                         </div>
                         <h3 className="text-lg font-black tracking-tight">No Sessions Found</h3>
                         <p className="text-sm font-medium text-muted-foreground mt-2 max-w-sm leading-relaxed">There are no attendance sessions logged for this class in {format(new Date(`${filters.month}-01`), 'MMMM yyyy')}.</p>
                     </CardContent>
                 </Card>
            ) : null}
            
        </div>
    )
}
