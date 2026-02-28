import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Subject, TimetableEntry, useTimetable } from "@/hooks/useTimetable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Calendar as CalendarIcon, Save, Trash2, Plus, FileSpreadsheet } from "lucide-react"
import { createWorker } from 'tesseract.js'
import { DEPARTMENTS, YEARS } from "@/lib/constants"
import { toast } from 'sonner'

const DAYS = [
    { id: 1, name: "MON" },
    { id: 2, name: "TUE" },
    { id: 3, name: "WED" },
    { id: 4, name: "THU" },
    { id: 5, name: "FRI" },
    { id: 6, name: "SAT" },
]

const PERIODS = [
    { id: 1, label: "I", time: "09:30 - 10:30" },
    { id: 2, label: "II", time: "10:30 - 11:30" },
    { id: 3, label: "III", time: "11:40 - 12:40" },
    { id: 4, label: "IV", time: "01:30 - 02:20" },
    { id: 5, label: "V", time: "02:20 - 03:10" },
    { id: 6, label: "VI", time: "03:10 - 04:00" },
]

export function TimetableManager() {
  const { profile } = useAuth()
  const { fetchFaculty, fetchTimetable, saveTimetableEntry, deleteTimetableEntry, fetchSubjects } = useTimetable()
  
  const [loading, setLoading] = useState(false)
  const [facultyList, setFacultyList] = useState<any[]>([])
  const [selectedFaculty, setSelectedFaculty] = useState<string>("")
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeCell, setActiveCell] = useState<{ day: number, period: number, entry?: TimetableEntry } | null>(null)
  
  const [formData, setFormData] = useState({
    subject_id: "",
    dept: "CSM",
    year: "1",
    section: "A"
  })

  // OCR State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrReviewData, setOcrReviewData] = useState<any[]>([])
  const [showOcrDialog, setShowOcrDialog] = useState(false)

  const isHod = profile?.role === 'hod'

  useEffect(() => {
    loadInitialData()
  }, [profile])

  const loadInitialData = async () => {
    setLoading(true)
    const [facs, subs] = await Promise.all([
        fetchFaculty(isHod ? (profile?.dept || undefined) : undefined),
        fetchSubjects(isHod ? (profile?.dept || undefined) : undefined)
    ])
    setFacultyList(facs)
    setSubjects(subs)
    setLoading(false)
  }

  useEffect(() => {
    if (selectedFaculty) {
        loadTimetable(selectedFaculty)
    } else {
        setTimetable([])
    }
  }, [selectedFaculty])

  const loadTimetable = async (facId: string) => {
    setLoading(true)
    const data = await fetchTimetable(facId)
    setTimetable(data)
    setLoading(false)
  }

  const handleCellClick = (day: number, period: number) => {
    if (!selectedFaculty) return

    const entry = timetable.find(t => t.day_of_week === day && t.period === period)
    setActiveCell({ day, period, entry })
    
    if (entry) {
        setFormData({
            subject_id: entry.subject_id,
            dept: entry.dept,
            year: entry.year.toString(),
            section: entry.section
        })
    } else {
        setFormData({
            subject_id: "",
            dept: isHod ? profile?.dept! : "CSM",
            year: "1",
            section: "A"
        })
    }
    
    setIsDialogOpen(true)
  }

  const handleSaveEntry = async () => {
    if (!selectedFaculty || !activeCell || !formData.subject_id) return
    
    try {
        setLoading(true)
        await saveTimetableEntry({
            faculty_id: selectedFaculty,
            day_of_week: activeCell.day,
            period: activeCell.period,
            subject_id: formData.subject_id,
            dept: formData.dept,
            year: parseInt(formData.year),
            section: formData.section
        })
        await loadTimetable(selectedFaculty)
        setIsDialogOpen(false)
    } catch (error: any) {
        toast.error('Failed to save schedule: ' + error.message)
    } finally {
        setLoading(false)
    }
  }

  const handleDeleteEntry = async () => {
     if (!selectedFaculty || !activeCell) return

     try {
        setLoading(true)
        await deleteTimetableEntry(selectedFaculty, activeCell.day, activeCell.period)
        await loadTimetable(selectedFaculty)
        setIsDialogOpen(false)
     } catch(error: any) {
         toast.error('Failed to delete schedule: ' + error.message)
     } finally {
         setLoading(false)
     }
  }

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      try {
          setOcrLoading(true)
          setOcrProgress(0)
          
          const worker = await createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    setOcrProgress(Math.round(m.progress * 100))
                }
            }
          })
          
          const { data: { text } } = await worker.recognize(file)
          await worker.terminate()
          
          parseOcrText(text)
      } catch (error: any) {
          toast.error('OCR Failed: ' + error.message)
      } finally {
          setOcrLoading(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
      }
  }

  const parseOcrText = async (text: string) => {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l)
      
      let targetDept = "CSM"
      let targetYear = 1
      let targetSec = "A"

      // Regex matching for Class details
      const yrMatch = text.match(/IV|III|II|I/i)
      if (yrMatch) {
          if (yrMatch[0].toUpperCase() === 'IV') targetYear = 4
          else if (yrMatch[0].toUpperCase() === 'III') targetYear = 3
          else if (yrMatch[0].toUpperCase() === 'II') targetYear = 2
          else if (yrMatch[0].toUpperCase() === 'I') targetYear = 1
      }
      const secMatch = text.match(/'([A-F])'|"([A-F])"|Sec:\s*([A-F])|SEC\s*([A-F])/i)
      if (secMatch) {
          targetSec = (secMatch[1] || secMatch[2] || secMatch[3] || secMatch[4] || 'A').toUpperCase()
      }
      if (text.toLowerCase().includes('ai & ml') || text.toLowerCase().includes('aiml')) targetDept = "AIML"
      
      // Parse Acronym to Faculty Mapping
      const acronymMap: Record<string, any> = {}
      let mappingStarted = false
      
      for (const line of lines) {
          if (line.toLowerCase().includes('acronym') || line.toLowerCase().includes('subject name')) {
              mappingStarted = true
              continue
          }
          if (mappingStarted) {
              const parts = line.split(' ')
              const acronym = parts[0]
              if (acronym && acronym.length >= 2 && acronym.length <= 5 && acronym === acronym.toUpperCase()) {
                  let matchedFaculty = null
                  const restOfLine = line.toLowerCase()
                  for (const f of facultyList) {
                      const fname = f.full_name.toLowerCase()
                      const lastNames = fname.split(' ').filter((n:string) => n.length > 2)
                      if (lastNames.some((ln:string) => restOfLine.includes(ln))) {
                          matchedFaculty = f
                          break
                      }
                  }
                  let matchedSubject = subjects.find(s => s.code === acronym || s.code.includes(acronym))
                  if (matchedFaculty && matchedSubject) {
                      acronymMap[acronym] = { faculty: matchedFaculty, subject: matchedSubject }
                  }
              }
          }
      }

      // Parse the Grid
      const extractedSlots = []
      for (const line of lines) {
           const tokens = line.split(/\s+/)
           const dayCode = tokens[0].toUpperCase()
           const dayObj = DAYS.find(d => d.name.toUpperCase().startsWith(dayCode))
           
           if (dayObj) {
               let pIdx = 1
               for (let i = 1; i < tokens.length; i++) {
                   const token = tokens[i].toUpperCase()
                   if (acronymMap[token]) {
                        extractedSlots.push({
                            day_of_week: dayObj.id,
                            period: pIdx,
                            subject_id: acronymMap[token].subject.id,
                            subject_code: token,
                            faculty_id: acronymMap[token].faculty.id,
                            faculty_name: acronymMap[token].faculty.full_name,
                            dept: targetDept,
                            year: targetYear,
                            section: targetSec
                        })
                        pIdx++
                        if (pIdx > 6) break
                   } else if (token === 'PROJECT' || token === 'LAB') {
                        pIdx++ // skip unsupported periods safely
                   } else if (token.length >= 2 && token === token.toUpperCase()) {
                        pIdx++ // unknown code slot taken
                   }
               }
           }
      }

      if (extractedSlots.length === 0) {
          toast.warning('OCR Scan Complete, but no recognizable class schedule matrices were found. Check the image clarity.')
          return
      }

      setOcrReviewData(extractedSlots)
      setShowOcrDialog(true)
  }

  const handleOcrConfirm = async () => {
       try {
           setLoading(true)
           for (const slot of ocrReviewData) {
               try {
                   await saveTimetableEntry({
                       faculty_id: slot.faculty_id,
                       day_of_week: slot.day_of_week,
                       period: slot.period,
                       subject_id: slot.subject_id,
                       dept: slot.dept,
                       year: slot.year,
                       section: slot.section
                   })
               } catch (e: any) {
                   // Skipping conflicting OCR insertion
               }
           }
           setShowOcrDialog(false)
           if (selectedFaculty) loadTimetable(selectedFaculty)
       } catch (error:any) {
           toast.error('Bulk Save Error: ' + error.message)
       } finally {
           setLoading(false)
       }
  }

  const getEntryForCell = (day: number, period: number) => {
      return timetable.find(t => t.day_of_week === day && t.period === period)
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Timetable Grid</CardTitle>
                <CardDescription>Select a faculty member to manage their weekly schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="w-full md:w-[300px]">
                        <Label className="mb-2 block">Faculty Member</Label>
                        <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Faculty" />
                            </SelectTrigger>
                            <SelectContent>
                                {facultyList.map(f => (
                                    <SelectItem key={f.id} value={f.id}>{f.full_name} ({f.dept})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-end gap-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleOcrUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        <Button 
                            variant="default" 
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={ocrLoading || loading}
                            title="Auto-fill timetable from a Class Image!"
                        >
                            {ocrLoading ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> OCR Engine ({ocrProgress}%)</>
                            ) : (
                                <><FileSpreadsheet className="h-4 w-4 mr-2" /> Class Timetable OCR</>
                            )}
                        </Button>
                        {loading && !ocrLoading && <div className="flex items-center text-muted-foreground ml-4 mb-2"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...</div>}
                    </div>
                </div>

                {selectedFaculty ? (
                    <div className="overflow-x-auto pb-4">
                        <table className="w-full text-sm border-collapse min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="border p-3 bg-muted/30 w-[120px] text-center font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                        DAY / <br/>TIME
                                    </th>
                                    {PERIODS.map(p => (
                                        <React.Fragment key={p.id}>
                                            <th className="border p-3 bg-muted/30 font-semibold text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{p.time}</span>
                                                    <span className="text-sm">{p.label}</span>
                                                </div>
                                            </th>
                                            {p.id === 3 && (
                                                 <th className="border p-2 bg-muted/40 font-bold text-center text-[10px] tracking-widest text-muted-foreground/80 uppercase px-2 w-[50px]">
                                                    12:40 <br/>1:30
                                                 </th>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map((day, idx) => (
                                    <tr key={day.id}>
                                        <td className="border p-3 font-medium bg-muted/10 text-center text-sm">{day.name}</td>
                                        {PERIODS.map(period => {
                                            const entry = getEntryForCell(day.id, period.id)
                                            return (
                                                <React.Fragment key={`${day.id}-${period.id}`}>
                                                    <td 
                                                        className={`border p-2 min-h-[80px] w-[14%] cursor-pointer transition-colors ${entry ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50 text-center'}`}
                                                        onClick={() => handleCellClick(day.id, period.id)}
                                                    >
                                                        {entry ? (() => {
                                                            const subjectObj = subjects.find(s => s.id === entry.subject_id)
                                                            return (
                                                            <div className="flex flex-col items-center justify-center p-1 text-xs">
                                                                <span className="font-bold text-primary truncate max-w-full" title={subjectObj?.name}>{subjectObj?.code || "Subject"}</span>
                                                                <span className="text-muted-foreground mt-1 text-[10px] font-medium px-1.5 py-0.5 bg-background rounded-md">
                                                                    {entry.year}-{entry.dept}-{entry.section}
                                                                </span>
                                                            </div>
                                                        )})() : (
                                                            <div className="h-12 w-full flex items-center justify-center text-muted-foreground/30">
                                                                <Plus className="h-5 w-5 opacity-0 hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    {period.id === 3 && (
                                                        idx === 0 ? (
                                                             <td className="border bg-muted/5 text-center font-black tracking-[0.3em] text-muted-foreground/30 relative" rowSpan={6}>
                                                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                                                     <span className="transform -rotate-90 origin-center whitespace-nowrap text-xl">LUNCH</span>
                                                                </div>
                                                             </td>
                                                        ) : null
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium text-foreground">No Faculty Selected</h3>
                        <p className="text-sm text-muted-foreground mt-1">Please select a faculty member from the dropdown above to view or edit their timetable.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{activeCell?.entry ? "Edit Class Slot" : "Assign Class Slot"}</DialogTitle>
                    <DialogDescription>
                        {DAYS.find(d => d.id === activeCell?.day)?.name} • Period {activeCell?.period}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Subject</Label>
                        <Select value={formData.subject_id} onValueChange={(v) => setFormData({...formData, subject_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                            <SelectContent>
                                {subjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label>Department</Label>
                            <Select disabled={isHod} value={formData.dept} onValueChange={(v) => setFormData({...formData, dept: v})}>
                                <SelectTrigger className={isHod ? "opacity-90 bg-muted" : ""}><SelectValue placeholder="Select" /></SelectTrigger>
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
                        <div className="grid gap-2">
                            <Label>Year</Label>
                            <Select value={formData.year} onValueChange={(v) => setFormData({...formData, year: v})}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    {YEARS.map(y => (
                                        <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>Section</Label>
                        <Input 
                            value={formData.section} 
                            onChange={(e) => setFormData({...formData, section: e.target.value.toUpperCase()})}
                            placeholder="e.g. A"
                        />
                    </div>
                </div>
                <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
                    {activeCell?.entry ? (
                         <Button type="button" variant="destructive" onClick={handleDeleteEntry} disabled={loading}>
                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </Button>
                    ) : (
                        <div /> // Spacer
                    )}
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={handleSaveEntry} disabled={loading || !formData.subject_id}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Slot
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* OCR Review Dialog */}
        <Dialog open={showOcrDialog} onOpenChange={setShowOcrDialog}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">Intelligent OCR Review</DialogTitle>
                    <DialogDescription>
                        We successfully extracted the timetable matrix from the image. Please review the automatically mapped sessions below.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="font-semibold text-primary mb-4">Extracted {ocrReviewData.length} valid class assignments</p>
                    <div className="rounded-md border p-4 bg-muted/20 columns-1 sm:columns-2 gap-4">
                        {ocrReviewData.map((d, i) => {
                            const p = PERIODS.find(x=>x.id===d.period)
                            return (
                            <div key={i} className="mb-3 p-3 bg-background rounded-xl border shadow-sm text-sm break-inside-avoid">
                                <div className="font-bold text-orange-600 mb-1">{DAYS.find(x => x.id === d.day_of_week)?.name} — Period {p?.label} ({p?.time})</div>
                                <div className="text-muted-foreground">Class: <span className="font-bold text-foreground">{d.year}-{d.dept}-{d.section}</span></div>
                                <div className="text-muted-foreground">Subject: <span className="font-bold text-foreground">{d.subject_code}</span></div>
                                <div className="text-muted-foreground">Mapped Faculty: <span className="font-bold text-foreground">{d.faculty_name}</span></div>
                            </div>
                        )})}
                    </div>
                </div>
                <DialogFooter className="sticky bottom-0 bg-background pt-2">
                    <Button variant="outline" onClick={() => setShowOcrDialog(false)}>Cancel Processing</Button>
                    <Button onClick={handleOcrConfirm}>Attach to Respective Faculties</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
