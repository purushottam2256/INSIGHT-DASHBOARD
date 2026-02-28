import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Subject, useTimetable } from "@/hooks/useTimetable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, Library } from "lucide-react"

export function SubjectManager() {
  const { profile } = useAuth()
  const { fetchSubjects, addSubject, deleteSubject } = useTimetable()
  
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    dept: "CSM",
    year: "1",
    semester: "1",
    credits: "3"
  })

  const isHod = profile?.role === 'hod'

  useEffect(() => {
    if (isHod && profile?.dept) {
        setFormData(prev => ({ ...prev, dept: profile.dept! }))
    }
  }, [profile, isHod])

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    setLoading(true)
    const data = await fetchSubjects(isHod ? (profile?.dept || undefined) : undefined)
    setSubjects(data)
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      setLoading(true)
      await deleteSubject(id)
      await loadSubjects()
    } catch (error: any) {
      alert("Error deleting subject: " + error.message)
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
            credits: parseInt(formData.credits)
        })
        setFormData(prev => ({ ...prev, name: "", code: "" }))
        await loadSubjects()
    } catch (error: any) {
        alert("Error adding subject: " + error.message)
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
                                            <>
                                                <SelectItem value="CSE">CSE</SelectItem>
                                                <SelectItem value="CSM">CSM</SelectItem>
                                                <SelectItem value="CSD">CSD</SelectItem>
                                                <SelectItem value="CSC">CSC</SelectItem>
                                                <SelectItem value="AIML">AIML</SelectItem>
                                                <SelectItem value="ECE">ECE</SelectItem>
                                                <SelectItem value="EEE">EEE</SelectItem>
                                                <SelectItem value="MECH">Mech</SelectItem>
                                                <SelectItem value="IT">IT</SelectItem>
                                                <SelectItem value="H&S">H&S</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="year">Year</Label>
                                <Select value={formData.year} onValueChange={(v) => setFormData({...formData, year: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1st Year</SelectItem>
                                        <SelectItem value="2">2nd Year</SelectItem>
                                        <SelectItem value="3">3rd Year</SelectItem>
                                        <SelectItem value="4">4th Year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                                <Label htmlFor="credits">Credits</Label>
                                <Select value={formData.credits} onValueChange={(v) => setFormData({...formData, credits: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Credit</SelectItem>
                                        <SelectItem value="2">2 Credits</SelectItem>
                                        <SelectItem value="3">3 Credits</SelectItem>
                                        <SelectItem value="4">4 Credits</SelectItem>
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
            
            {/* Subject List */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Subject Catalog</CardTitle>
                    <CardDescription>Available subjects for your department.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto max-h-[500px]">
                   <div className="space-y-4">
                     {loading && subjects.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">Loading...</div>
                     ) : (
                        subjects.length > 0 ? (
                            subjects.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">{sub.name} <span className="text-muted-foreground font-mono ml-1">({sub.code})</span></span>
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                            {sub.dept} • Year {sub.year}-Sem {sub.semester} • {sub.credits} Credits
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(sub.id, sub.name)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">No subjects found.</div>
                        )
                     )}
                   </div>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
