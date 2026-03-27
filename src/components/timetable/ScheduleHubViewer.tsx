import React, { useEffect, useState } from 'react'
import { Printer, CalendarX, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTimetable } from "@/hooks/useTimetable"

interface ScheduleHubViewerProps {
  dept: string
  year: number
  section: string
  semester: number
  regulation: string
  academic_year: string
  room: string
  effect_date: string
}

const DAYS = [
  { id: 1, name: 'MON' }, { id: 2, name: 'TUE' }, { id: 3, name: 'WED' },
  { id: 4, name: 'THU' }, { id: 5, name: 'FRI' }, { id: 6, name: 'SAT' }
]

const PERIODS = [
  { id: 1, label: '1', time: '09:30 - 10:30' },
  { id: 2, label: '2', time: '10:30 - 11:30' },
  { id: 3, label: '3', time: '11:40 - 12:40' },
  { id: 4, label: '4', time: '01:30 - 02:20' },
  { id: 5, label: '5', time: '02:20 - 03:10' },
  { id: 6, label: '6', time: '03:10 - 04:00' },
]

export function ScheduleHubViewer({ dept, year, section, semester, regulation, academic_year, room, effect_date }: ScheduleHubViewerProps) {
  const { fetchTimetableByClass } = useTimetable()
  const [loading, setLoading] = useState(false)
  
  // Minimal representation for rendering cells
  type ReadonlyCell = { acronym: string; is_lab?: boolean; batch?: string; subject_name?: string; faculty_name?: string }
  const [grid, setGrid] = useState<Record<string, ReadonlyCell[]>>({})
  const [hasData, setHasData] = useState(false)
  const [uniqueSubjects, setUniqueSubjects] = useState<any[]>([])

  useEffect(() => {
    if (!dept || !year || !section || !semester) return
    loadData()
  }, [dept, year, section, semester])

  const loadData = async () => {
    setLoading(true)
    const absoluteSemester = (year - 1) * 2 + semester
    const entries = await fetchTimetableByClass(dept, year, section, absoluteSemester)
    
    if (entries && entries.length > 0) {
      const newGrid: Record<string, ReadonlyCell[]> = {}
      const mappedSubjects = new Map<string, any>()

      for (const e of entries) {
        const key = `${e.day_of_week}-${e.period}`
        if (!newGrid[key]) newGrid[key] = []
        newGrid[key].push({
          acronym: e.subject_acronym || e.subject_code || '?',
          is_lab: e.subjects?.is_lab,
          batch: e.batch,
          subject_name: e.subject_name || e.subject_code,
          faculty_name: e.faculty_name
        })

        if (!mappedSubjects.has(e.subject_id)) {
          mappedSubjects.set(e.subject_id, {
            code: e.subject_code,
            acronym: e.subject_acronym || e.subject_code,
            name: e.subject_name,
            faculty_name: e.faculty_name,
            is_lab: e.subjects?.is_lab
          })
        }
      }
      setGrid(newGrid)
      setUniqueSubjects(Array.from(mappedSubjects.values()))
      setHasData(true)
    } else {
      setGrid({})
      setUniqueSubjects([])
      setHasData(false)
    }
    setLoading(false)
  }

  const getCellDisplay = (day: number, period: number): ReadonlyCell[] | null => {
    return grid[`${day}-${period}`] || null
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary opacity-50" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading schedule...</p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="py-16 flex flex-col items-center justify-center border-t border-border border-dashed mt-6">
        <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
          <CalendarX className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-lg text-foreground">No Schedule Published</p>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
          There is currently no timetable published for Year {year} {dept} - Section {section} (Semester {semester}).
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t border-border animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div>
          <h3 className="font-bold text-foreground">
            {year}-{dept}-{section} | Sem {semester} | {regulation}
          </h3>
          <p className="text-xs text-muted-foreground">AY: {academic_year} | Room: {room || '—'} | Published Timetable</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs bg-background/50 hover:bg-background">
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="hidden print:block p-6 text-center border-b mb-6 border-black">
        <h2 className="text-base font-bold uppercase tracking-wide">CLASS TIMETABLE</h2>
        <p className="text-xs mt-1">Department: {dept} | Degree/Branch: B.Tech / {dept} | Year/Sem: {year}/{semester} | Sec: '{section}'</p>
        <p className="text-xs">Academic Year: {academic_year} | LH: {room} | Regulation: {regulation} | With effect from: {effect_date || new Date().toLocaleDateString()}</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <table className="w-full text-sm border-collapse min-w-[850px] print-bw-table shadow-sm bg-card/40">
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

                  // Handle merged visualization for Lab subjects (spans 3 periods)
                  if (display && display.some(c => c.is_lab)) {
                    if (period.id === 2 || period.id === 3 || period.id === 5 || period.id === 6) return null
                  }

                  return (
                    <React.Fragment key={`${day.id}-${period.id}`}>
                      <td
                        colSpan={display && display.some(c => c.is_lab) ? 3 : 1}
                        className={cn(
                          "border border-border p-1 min-h-[60px] relative transition-colors bg-card",
                          display && display.some(c => c.is_lab) ? "w-[39%]" : "w-[13%]"
                        )}
                      >
                        {display && display.length > 0 ? (
                          <div className={cn("flex flex-col w-full h-full min-h-[50px] overflow-hidden", display.length > 1 ? "divide-y divide-border/40" : "")}>
                            {display.map((c, idx) => (
                              <div key={idx} className="flex-1 flex flex-col items-center justify-center text-center p-0.5 min-h-[50px] w-full">
                                <span className={cn("font-bold text-primary text-sm leading-tight flex items-center justify-center gap-1", c.is_lab && "text-base")}>
                                  {c.acronym}
                                </span>
                                {c.batch && c.batch !== 'all' && (
                                  <span className={cn(
                                    "inline-block px-1.5 py-0.5 mt-0.5 rounded text-[9px] font-bold",
                                    c.batch === 'B1' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  )}>
                                    Batch {c.batch}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-[50px] w-full" />
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
      </div>

      {true && ( // Always show the mapping table to match the image requirements
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
          {uniqueSubjects.map(s => (
            <div key={s.acronym} className="flex border-b border-border/50 py-1.5">
              <span className="font-bold w-16 text-primary">{s.acronym}</span>
              <span className="flex-1 px-2 border-l border-r border-border/50 truncate">
                {s.name} <span className="text-muted-foreground/60">({s.code})</span>
              </span>
              <span className="w-40 pl-2 text-right truncate">{(s.faculty_name || '').split(' ').slice(-2).join(' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
