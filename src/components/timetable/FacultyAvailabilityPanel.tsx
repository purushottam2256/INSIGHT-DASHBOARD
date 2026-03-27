import React, { useState } from 'react'
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface FacultyAvailabilityPanelProps {
  mappings: any[]
  grid: Record<string, any[]>
  globalFacultyTimetables: any[]
}

const DAYS = [1, 2, 3, 4, 5, 6]
const PERIODS = [1, 2, 3, 4, 5, 6]

export function FacultyAvailabilityPanel({ mappings, grid, globalFacultyTimetables }: FacultyAvailabilityPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  // Only consider unique active faculty
  const activeFacultyIds = Array.from(new Set(mappings.filter(m => m.faculty_id).map(m => m.faculty_id)))
  const facultyList = activeFacultyIds.map(fid => {
    const mapping = mappings.find(m => m.faculty_id === fid)
    return {
      id: fid,
      name: mapping?.faculty_name || 'Unknown Faculty'
    }
  })

  // Helper to check if a faculty is busy at a specific day/period
  const isBusy = (fid: string, day: number, period: number) => {
    // Check current local grid
    const localCells = grid[`${day}-${period}`] || []
    const isLocalBusy = localCells.some(c => c.faculty_id === fid)
    
    // Check global assignments
    const isGlobalBusy = globalFacultyTimetables.some(
      t => t.faculty_id === fid && t.day_of_week === day && t.period === period
    )

    return isLocalBusy || isGlobalBusy
  }

  // Count total busy periods for summary
  const getBusyCount = (fid: string) => {
    let count = 0
    for (const d of DAYS) {
      for (const p of PERIODS) {
        if (isBusy(fid, d, p)) count++
      }
    }
    return count
  }

  return (
    <div className="w-full lg:w-[320px] shrink-0 print:hidden space-y-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-sm">Faculty Availability</h3>
      </div>
      <p className="text-xs text-muted-foreground px-1 mb-4">
        Live schedule preview for {facultyList.length} faculty members.
      </p>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 pb-4">
        {facultyList.map(f => {
          const isExpanded = expanded === f.id
          const busyCount = getBusyCount(f.id)
          const totalPeriods = 36 // 6 days * 6 periods
          
          return (
            <Card key={f.id} className={cn("overflow-hidden transition-all duration-300 border-border/50", isExpanded ? "shadow-md ring-1 ring-primary/20" : "hover:border-primary/30")}>
              <div 
                className={cn("p-3 flex items-center justify-between cursor-pointer select-none", isExpanded ? "bg-muted/30" : "hover:bg-muted/10")}
                onClick={() => setExpanded(isExpanded ? null : f.id)}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-bold truncate" title={f.name}>{f.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", busyCount > 25 ? "bg-red-500" : busyCount > 15 ? "bg-orange-500" : "bg-green-500")} 
                        style={{ width: `${(busyCount / totalPeriods) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold">{busyCount}/{totalPeriods} booked</span>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
              
              {isExpanded && (
                <div className="p-3 bg-card border-t border-border/50 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                    <div /> {/* Top left corner empty */}
                    <div className="grid grid-cols-6 gap-0.5">
                      {PERIODS.map(p => (
                        <div key={p} className="text-[8px] font-bold text-center text-muted-foreground">{p}</div>
                      ))}
                    </div>
                    
                    {DAYS.map(day => (
                      <React.Fragment key={day}>
                        <div className="text-[9px] font-bold text-muted-foreground flex items-center">{['M','T','W','T','F','S'][day-1]}</div>
                        <div className="grid grid-cols-6 gap-0.5">
                          {PERIODS.map(period => {
                            const busy = isBusy(f.id, day, period)
                            return (
                              <div 
                                key={period}
                                title={`${['Mon','Tue','Wed','Thu','Fri','Sat'][day-1]} P${period}: ${busy ? 'Busy' : 'Free'}`}
                                className={cn(
                                  "h-4 rounded-[2px] w-full transition-colors",
                                  busy ? "bg-red-500/20 border border-red-500/30" : "bg-green-500/20 border border-green-500/30"
                                )}
                              />
                            )
                          })}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-3 text-center mb-1 flex items-center justify-center gap-3">
                     <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/40" /> Free</span>
                     <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/40" /> Busy</span>
                  </p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
