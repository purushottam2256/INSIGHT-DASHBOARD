import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Subject, useTimetable } from "@/hooks/useTimetable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, Library, Search, Filter, Edit2, X, Check } from "lucide-react"
import { DEPARTMENTS, YEARS } from "@/lib/constants"
import { toast } from "sonner"

export function SubjectManager() {
  const { profile } = useAuth()
  const { fetchSubjects, addSubject, updateSubject, deleteSubject } = useTimetable()
  
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Filters
  const [filterDept, setFilterDept] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [filterRegulation, setFilterRegulation] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    dept: "CSM",
    year: "1",
    semester: "1",
    credits: "3",
    regulation: "R22",
    is_lab: false,
    batch: "all",
  })

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Subject>>({})

  const isHod = profile?.role === 'hod'

  useEffect(() => {
    if (isHod && profile?.dept) {
        setFormData(prev => ({ ...prev, dept: profile.dept! }))
        setFilterDept(profile.dept!)
    }
  }, [profile, isHod])

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    setLoading(true)
    // Fetch all subjects (no server-side filter — we filter client-side for flexibility)
    const data = await fetchSubjects(isHod ? (profile?.dept || undefined) : undefined)
    setSubjects(data)
    setLoading(false)
  }

  // Client-side filtered + searched subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter(sub => {
      if (filterDept !== "all" && sub.dept !== filterDept) return false
      if (filterYear !== "all" && sub.year !== parseInt(filterYear)) return false
      if (filterRegulation !== "all" && sub.regulation !== filterRegulation) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!sub.name.toLowerCase().includes(q) && !sub.code.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [subjects, filterDept, filterYear, filterRegulation, searchQuery])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      setLoading(true)
      await deleteSubject(id)
      toast.success(`${name} deleted`)
      await loadSubjects()
    } catch (error: any) {
      toast.error("Error deleting subject: " + error.message)
      setLoading(false)
    }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
        await addSubject({
            name: formData.name,
            code: formData.code.toUpperCase(),
            dept: formData.dept,
            year: parseInt(formData.year),
            semester: parseInt(formData.semester),
            credits: parseInt(formData.credits),
            regulation: formData.regulation.toUpperCase(),
            is_lab: formData.is_lab,
            batch: formData.batch,
        })
        toast.success(`${formData.name} added`)
        setFormData(prev => ({ ...prev, name: "", code: "" }))
        await loadSubjects()
    } catch (error: any) {
        toast.error("Error adding subject: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  const handleEditClick = (sub: Subject) => {
    setEditingId(sub.id)
    setEditData(sub)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editData.name || !editData.code) {
      toast.error("Name and Code are required")
      return
    }
    setLoading(true)
    try {
      await updateSubject(editingId, {
        name: editData.name,
        code: editData.code.toUpperCase(),
        dept: editData.dept,
        year: editData.year,
        semester: editData.semester,
        credits: editData.credits,
        regulation: editData.regulation?.toUpperCase(),
        is_lab: editData.is_lab,
        batch: editData.batch
      })
      toast.success("Subject updated successfully")
      setEditingId(null)
      await loadSubjects()
    } catch (error: any) {
      toast.error("Error updating subject: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
            {/* Create Subject Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Library className="h-5 w-5 text-primary" />
                        Add New Subject
                    </CardTitle>
                    <CardDescription>Register a new subject in the curriculum.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddSubject} className="space-y-4">
                         <div className="grid gap-2">
                            <Label htmlFor="name">Subject Name <span className="text-red-500">*</span></Label>
                            <Input 
                                id="name" 
                                placeholder="e.g. Data Structures"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="code">Subject Code <span className="text-red-500">*</span></Label>
                            <Input 
                                id="code" 
                                placeholder="CS301"
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value})}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dept">Department</Label>
                                <Select disabled={isHod} value={formData.dept} onValueChange={(v) => setFormData({...formData, dept: v})}>
                                    <SelectTrigger className={isHod ? "opacity-90 bg-muted" : ""}>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {isHod && profile?.dept ? (
                                            <SelectItem value={profile.dept}>{profile.dept}</SelectItem>
                                        ) : (
                                            DEPARTMENTS.map(d => (
                                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="year">Year</Label>
                                <Select value={formData.year} onValueChange={(v) => {
                                    setFormData({...formData, year: v, semester: v === "1" ? "1" : (parseInt(v)*2 - 1).toString() })
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map(y => (
                                            <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="regulation">Regulation</Label>
                                <Input 
                                    id="regulation" 
                                    placeholder="R22"
                                    value={formData.regulation}
                                    onChange={(e) => setFormData({...formData, regulation: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="sem">Semester</Label>
                                <Select value={formData.semester} onValueChange={(v) => setFormData({...formData, semester: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Sem 1</SelectItem>
                                        <SelectItem value="2">Sem 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="credits">Credits <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="credits" 
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="e.g. 3"
                                    value={formData.credits}
                                    onChange={(e) => setFormData({...formData, credits: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Select value={formData.is_lab ? "lab" : "theory"} onValueChange={v => setFormData({...formData, is_lab: v === "lab"})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="theory">Theory</SelectItem>
                                        <SelectItem value="lab">Lab</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Batch</Label>
                                <Select value={formData.batch} onValueChange={v => setFormData({...formData, batch: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="B1">B1</SelectItem>
                                        <SelectItem value="B2">B2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add Subject
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            {/* Subject List with Filters */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Subject Catalog</CardTitle>
                    <CardDescription>Available subjects for your department.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Select value={filterDept} onValueChange={setFilterDept} disabled={isHod}>
                            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Depts</SelectItem>
                                {DEPARTMENTS.map(d => (
                                    <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Yrs</SelectItem>
                                {YEARS.map(y => (
                                    <SelectItem key={y.value} value={y.value}>Year {y.value}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterRegulation} onValueChange={setFilterRegulation}>
                            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue placeholder="Reg" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Reg</SelectItem>
                                {Array.from(new Set(subjects.map(s => s.regulation).filter(Boolean))).map(r => (
                                    <SelectItem key={r} value={r as string}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="relative flex-1 min-w-[120px]">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                                placeholder="Search..." 
                                className="h-7 pl-7 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Subject count */}
                    <p className="text-[10px] text-muted-foreground font-medium px-1">
                        {filteredSubjects.length} of {subjects.length} subjects
                    </p>

                    {/* Subject List */}
                    <div className="overflow-auto max-h-[450px] space-y-2">
                     {loading && subjects.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">Loading...</div>
                     ) : (
                        filteredSubjects.length > 0 ? (
                            filteredSubjects.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                    {editingId === sub.id ? (
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 mr-2">
                                            <Input
                                                placeholder="Name"
                                                className="h-8 text-xs font-semibold"
                                                value={editData.name || ''}
                                                onChange={e => setEditData({...editData, name: e.target.value})}
                                            />
                                            <Input
                                                placeholder="Code"
                                                className="h-8 text-xs font-mono"
                                                value={editData.code || ''}
                                                onChange={e => setEditData({...editData, code: e.target.value})}
                                            />
                                            <Select value={editData.dept || ''} onValueChange={v => setEditData({...editData, dept: v})} disabled={isHod}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Dept" /></SelectTrigger>
                                                <SelectContent>
                                                    {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Select value={editData.year?.toString() || ''} onValueChange={v => setEditData({...editData, year: parseInt(v), semester: (parseInt(v)*2-1) })}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
                                                <SelectContent>
                                                    {YEARS.map(y => <SelectItem key={y.value} value={y.value}>Yr {y.value}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Select value={editData.semester?.toString() || ''} onValueChange={v => setEditData({...editData, semester: parseInt(v)})}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sem" /></SelectTrigger>
                                                <SelectContent>
                                                    {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={s.toString()}>Sem {s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                step="0.5"
                                                className="h-8 text-xs"
                                                placeholder="Credits"
                                                value={editData.credits || ''}
                                                onChange={e => setEditData({...editData, credits: parseFloat(e.target.value)})}
                                            />
                                            <Select value={editData.is_lab ? "lab" : "theory"} onValueChange={v => setEditData({...editData, is_lab: v === "lab"})}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="theory">Theory</SelectItem>
                                                    <SelectItem value="lab">Lab</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select value={editData.batch || ''} onValueChange={v => setEditData({...editData, batch: v})}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    <SelectItem value="B1">B1</SelectItem>
                                                    <SelectItem value="B2">B2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{sub.name} <span className="text-muted-foreground font-mono ml-1">({sub.code})</span></span>
                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                {sub.dept} • Year {sub.year}-Sem {sub.semester} • {sub.credits} Credits {sub.regulation ? `• ${sub.regulation}` : ''}
                                                {sub.is_lab ? ' • 🔬 Lab' : ''}{sub.batch && sub.batch !== 'all' ? ` • ${sub.batch}` : ''}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex gap-1">
                                        {editingId === sub.id ? (
                                            <>
                                                <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-100" onClick={handleSaveEdit}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted" onClick={handleCancelEdit}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleEditClick(sub)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(sub.id, sub.name)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                {searchQuery || filterDept !== 'all' || filterYear !== 'all' 
                                    ? 'No subjects match your filters.' 
                                    : 'No subjects found.'}
                            </div>
                        )
                     )}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
