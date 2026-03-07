import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTimetable } from '@/hooks/useTimetable'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEPARTMENTS } from '@/lib/constants'
import { Loader2, Search, CalendarDays, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FacultyProfile {
  id: string
  full_name: string
  dept: string
}

const DAYS = [
  { id: 1, name: "MON" }, { id: 2, name: "TUE" }, { id: 3, name: "WED" },
  { id: 4, name: "THU" }, { id: 5, name: "FRI" }, { id: 6, name: "SAT" },
]

export function FacultyScheduleView() {
  const { fetchTimetable } = useTimetable()
  
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([])
  const [selectedDept, setSelectedDept] = useState("All")
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('')
  const [schedule, setSchedule] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch all faculty for the dropdown
  useEffect(() => {
    const loadFaculty = async () => {
      let query = supabase.from('profiles').select('id, full_name, dept').in('role', ['faculty', 'class_incharge', 'hod']).order('full_name')
      if (selectedDept !== 'All') {
        query = query.eq('dept', selectedDept)
      }
      const { data } = await query
      if (data) {
        setFacultyList(data)
        // Auto-select first if none selected
        if (data.length > 0 && !selectedFacultyId) {
          setSelectedFacultyId(data[0].id)
        } else if (data.length === 0) {
          setSelectedFacultyId('')
        }
      }
    }
    loadFaculty()
  }, [selectedDept])

  // Fetch the schedule when a faculty is selected
  useEffect(() => {
    if (!selectedFacultyId) {
      setSchedule([])
      return
    }
    
    const loadSchedule = async () => {
      setIsLoading(true)
      const data = await fetchTimetable(selectedFacultyId)
      setSchedule(data)
      setIsLoading(false)
    }
    
    loadSchedule()
  }, [selectedFacultyId, fetchTimetable])

  const selectedFaculty = facultyList.find(f => f.id === selectedFacultyId)

  // Organize schedule into a 6x6 grid [day][period(1-6)]
  const getGridContent = (dayIndex: number, period: number) => {
    // dayIndex 0=Mon, 1=Tue... in DB day_of_week is 1=Mon, 2=Tue...
    const cellData = schedule.find(s => s.day_of_week === (dayIndex + 1) && s.period === period)
    return cellData || null
  }

  const PERIODS = [1, 2, 3, 4, 5, 6]

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      
      {/* Header Controls */}
      <Card className="border-border/40 shadow-sm bg-card/40 print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filter Department</label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-[2] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Faculty</label>
              <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId} disabled={facultyList.length === 0}>
                <SelectTrigger className="bg-background">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={facultyList.length === 0 ? "No faculty found" : "Search & Select Faculty..."} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {facultyList.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.full_name} <span className="text-muted-foreground ml-2 text-xs">({f.dept})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Display */}
      {selectedFaculty ? (
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/40 pb-4 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{selectedFaculty.full_name}'s Weekly Schedule</CardTitle>
                  <CardDescription>
                    {selectedFaculty.dept} Department • {schedule.length} Total Classes per week
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs">
                <Printer className="h-4 w-4 mr-1" /> Print Schedule
              </Button>
            </div>
          </CardHeader>
          {/* Print-only A4 header */}
          <div className="hidden print:block p-6 text-center border-b">
            <h2 className="text-base font-bold uppercase tracking-wide">FACULTY WEEKLY SCHEDULE</h2>
            <p className="text-sm mt-1 font-semibold">{selectedFaculty.full_name}</p>
            <p className="text-xs mt-0.5">Department: {selectedFaculty.dept} • Total Classes: {schedule.length} per week</p>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Loading schedule...</p>
              </div>
            ) : schedule.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
                <p>No classes scheduled for this faculty member yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-sm border-collapse min-w-[800px] print:min-w-0 print-bw-table">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="border-r border-b border-border/40 p-3 text-left w-24 font-semibold text-muted-foreground">Day / Period</th>
                      {PERIODS.map(p => (
                        <th key={p} className="border-b border-border/40 p-3 text-center font-semibold text-muted-foreground w-1/6">
                          P{p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Only show Monday to Saturday (0 to 5) */}
                    {DAYS.slice(0, 6).map((day: any, dIdx: number) => (
                      <tr key={day.id} className="hover:bg-muted/5 transition-colors">
                        <td className="border-r border-b border-border/40 p-3 font-medium text-foreground bg-muted/10">
                          {day.name}
                        </td>
                        {PERIODS.map(pIdx => {
                          const cell = getGridContent(dIdx, pIdx)
                          return (
                            <td key={pIdx} className="border-b border-border/40 p-2 text-center relative h-16">
                              {cell ? (
                                <div className="h-full w-full rounded-md border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors p-1.5 flex flex-col items-center justify-center">
                                  <div className="font-bold text-orange-700 dark:text-orange-400 text-xs">
                                    {cell.subject_acronym}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                    {cell.year}-{cell.dept}-{cell.section}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full w-full rounded-md border border-dashed border-border/60 bg-muted/10 flex items-center justify-center">
                                  <span className="text-[10px] text-muted-foreground/40 font-medium">Free</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="h-[400px] rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center text-muted-foreground bg-card/30">
          <Search className="h-8 w-8 mb-4 opacity-40" />
          <p>Please select a faculty member to view their schedule</p>
        </div>
      )}
    </div>
  )
}
