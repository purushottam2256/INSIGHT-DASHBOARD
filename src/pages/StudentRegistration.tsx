import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bluetooth, Loader2, Search, Upload, Download, Trash2, Edit2, X, ChevronDown, ChevronUp, Info, Filter } from "lucide-react"
import { DEPARTMENTS } from "@/lib/constants"
import { toast } from "sonner"

export interface Student {
  id: string
  full_name: string
  roll_no: string
  email: string
  mobile: string
  parent_mobile: string
  gender: string
  blood_group: string
  dob: string
  batch: number
  dept: string
  year: number
  section: string
  bluetooth_uuid: string | null
}

const emptyForm = {
    full_name: "",
    roll_no: "",
    email: "",
    mobile: "",
    parent_mobile: "",
    gender: "Male",
    blood_group: "",
    dob: "",
    batch: "1",
    dept: "",
    year: "1",
    section: "A",
    bluetooth_uuid: ""
}

// H&S dept only manages Year 1, other depts manage Year 2-4
function getAllowedYears(dept: string | undefined, role: string | undefined): number[] {
    if (role !== 'hod' || !dept) return [1, 2, 3, 4]
    if (dept === 'H&S') return [1]
    return [2, 3, 4]
}

export function StudentRegistration() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  // Filters
  const [filterDept, setFilterDept] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [filterSection, setFilterSection] = useState("")
  
  const [formData, setFormData] = useState(emptyForm)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isHod = profile?.role === 'hod'
  const allowedYears = getAllowedYears(profile?.dept || undefined, profile?.role || undefined)

  // Enforce dept from user profile and year defaults
  useEffect(() => {
    if (profile?.dept) {
      const defaultYear = profile.dept === 'H&S' ? '1' : isHod ? '2' : '1'
      setFormData(prev => ({ ...prev, dept: profile.dept!, year: defaultYear }))
      if (isHod) setFilterDept(profile.dept!)
    }
  }, [profile, isHod])
  
  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    setLoading(true)
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('roll_no', { ascending: true })
    
    if (error) {
        toast.error("Failed to load students: " + error.message)
    } else {
        setStudents(data || [])
    }
    setLoading(false)
  }

  // Student list with filters
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = !searchQuery || 
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.roll_no.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDept = !filterDept || s.dept === filterDept
      const matchesYear = !filterYear || s.year === parseInt(filterYear)
      const matchesSection = !filterSection || s.section === filterSection
      
      // HOD sees only their dept + allowed years
      if (isHod && profile?.dept) {
        if (s.dept !== profile.dept) return false
        if (!allowedYears.includes(s.year)) return false
      }
      
      return matchesSearch && matchesDept && matchesYear && matchesSection
    })
  }, [students, searchQuery, filterDept, filterYear, filterSection, isHod, profile, allowedYears])

  // Unique sections for filter
  const availableSections = useMemo(() => {
    const secs = new Set(filteredStudents.map(s => s.section))
    return [...secs].sort()
  }, [filteredStudents])

  const handleScan = async () => {
    if (!navigator.bluetooth) {
        toast.error("Web Bluetooth is not available. Please use Google Chrome on HTTPS.")
        return
    }
    
    setScanning(true)
    try {
        const device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['battery_service']
        })
        if (device) {
            setFormData(prev => ({ ...prev, bluetooth_uuid: device.id }))
            toast.success("Device linked: " + device.name)
        }
    } catch (error: any) {
        if (error.name === 'NotFoundError') {
            toast.error("No Bluetooth devices found. You can type the UUID manually.")
        } else {
            toast.error("Bluetooth failed: " + error.message)
        }
    } finally {
        setScanning(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim() || !formData.roll_no.trim()) {
      toast.error("Full Name and Roll Number are required")
      return
    }

    if (!formData.mobile.match(/^\d{10}$/)) {
      toast.error("Mobile number must be exactly 10 digits")
      return
    }
    
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!formData.bluetooth_uuid.trim().match(uuidPattern)) {
      toast.error("BLE UUID must be a valid 128-bit format (e.g. 00000000-0000-0000-0000-000000000000)")
      return
    }

    setLoading(true)
    try {
        const payload = {
            full_name: formData.full_name.trim(),
            roll_no: formData.roll_no.trim().toUpperCase(),
            email: formData.email.trim() || null,
            mobile: formData.mobile.trim(),
            parent_mobile: formData.parent_mobile.trim() || null,
            gender: formData.gender || 'Not Specified',
            blood_group: formData.blood_group || null,
            dob: formData.dob || null,
            batch: parseInt(formData.batch) || 1,
            dept: formData.dept,
            year: parseInt(formData.year),
            section: formData.section.toUpperCase(),
            bluetooth_uuid: formData.bluetooth_uuid.trim()
        }

        if (editingId) {
            const { error } = await supabase.from('students').update(payload).eq('id', editingId)
            if (error) throw error
            toast.success("Student updated successfully")
        } else {
            const { error } = await supabase.from('students').insert([payload])
            if (error) throw error
            toast.success("Student registered successfully")
        }

        resetForm()
        fetchStudents()
    } catch (error: any) {
        toast.error("Failed: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  const resetForm = () => {
      const defaultYear = isHod && profile?.dept === 'H&S' ? '1' : isHod ? '2' : '1'
      setFormData(isHod ? { ...emptyForm, dept: profile!.dept!, year: defaultYear } : emptyForm)
      setEditingId(null)
      setShowForm(false)
  }

  const handleEdit = (student: Student) => {
      setEditingId(student.id)
      setFormData({
          full_name: student.full_name,
          roll_no: student.roll_no,
          email: student.email || '',
          mobile: student.mobile || '',
          parent_mobile: student.parent_mobile || '',
          gender: student.gender || 'Male',
          blood_group: student.blood_group || '',
          dob: student.dob || '',
          batch: student.batch?.toString() || '1',
          dept: student.dept,
          year: student.year?.toString() || '1',
          section: student.section,
          bluetooth_uuid: student.bluetooth_uuid || ''
      })
      setShowForm(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, roll_no: string) => {
      if (!confirm(`Delete student ${roll_no}? This cannot be undone.`)) return
      try {
          const { error } = await supabase.from('students').delete().eq('id', id)
          if (error) throw error
          toast.success(`Student ${roll_no} deleted`)
          fetchStudents()
      } catch (error: any) {
          toast.error("Delete failed: " + error.message)
      }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
          try {
              setLoading(true)
              const csvText = event.target?.result as string
              const rows = csvText.split('\n').filter(row => row.trim().length > 0)
              
              if (rows.length < 2) throw new Error("CSV file is empty or has no data rows")
              
              const headers = rows[0].split(',').map(h => h.trim().toLowerCase())
              const requiredHeaders = ['full_name', 'roll_no', 'dept', 'year', 'section', 'mobile', 'bluetooth_uuid']
              const missing = requiredHeaders.filter(h => !headers.includes(h))
              if (missing.length > 0) throw new Error(`Missing headers: ${missing.join(', ')}`)

              const newStudents = []
              let skipped = 0
              for (let i = 1; i < rows.length; i++) {
                  const values = rows[i].split(',').map(v => v.trim())
                  const obj: any = {}
                  headers.forEach((h, idx) => { obj[h] = values[idx] })
                  
                  // HOD dept lock
                  if (isHod && obj.dept && obj.dept !== profile?.dept) { skipped++; continue }
                  // HOD year lock
                  const yr = parseInt(obj.year) || 1
                  if (isHod && !allowedYears.includes(yr)) { skipped++; continue }
                  
                  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (!obj.mobile?.match(/^\d{10}$/)) { skipped++; continue }
                  if (!obj.bluetooth_uuid?.trim().match(uuidPattern)) { skipped++; continue }

                  newStudents.push({
                      full_name: obj.full_name,
                      roll_no: obj.roll_no?.toUpperCase(),
                      email: obj.email || null,
                      mobile: obj.mobile,
                      parent_mobile: obj.parent_mobile || null,
                      gender: obj.gender || 'Not Specified',
                      blood_group: obj.blood_group || null,
                      dob: obj.dob || null,
                      batch: parseInt(obj.batch) || 1,
                      dept: obj.dept || (profile?.dept || 'CSE'),
                      year: yr,
                      section: obj.section?.toUpperCase() || 'A',
                      bluetooth_uuid: obj.bluetooth_uuid.trim()
                  })
              }
              
              if (newStudents.length > 0) {
                  const { error } = await supabase.from('students').insert(newStudents)
                  if (error) throw error
                  toast.success(`Imported ${newStudents.length} students` + (skipped > 0 ? ` (${skipped} skipped)` : ''))
                  fetchStudents()
              } else {
                  toast.error("No valid students found to import")
              }
          } catch (error: any) {
              toast.error("Import failed: " + error.message)
          } finally {
              setLoading(false)
              if (fileInputRef.current) fileInputRef.current.value = ''
          }
      }
      reader.readAsText(file)
  }

  const downloadTemplate = () => {
      const headers = "full_name,roll_no,email,mobile,parent_mobile,gender,blood_group,dob,batch,dept,year,section,bluetooth_uuid\n"
      const sample = "John Doe,21MH1A0501,,9876543210,,Male,,,,CSE,3,A,123e4567-e89b-12d3-a456-426614174000\n"
      const blob = new Blob([headers + sample], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'student_import_template.csv'
      a.click()
  }

  return (
    <div className="space-y-4">
        {/* Quick Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredStudents.length}</span> students
                {isHod && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">{profile?.dept} • Year {allowedYears.join(',')}</span>}
            </div>
            <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Import CSV
                </Button>
                <Button size="sm" onClick={() => setShowForm(!showForm)} className="text-xs gap-1.5 bg-primary text-primary-foreground">
                    {showForm ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showForm ? 'Hide Form' : editingId ? 'Editing...' : 'Add Student'}
                </Button>
            </div>
        </div>

        {/* Registration Form — Collapsible */}
        {showForm && (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px] animate-slide-up">
            <Card className={`border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden transition-all ${editingId ? 'ring-2 ring-primary border-primary/50' : ''}`}>
                <CardHeader className={`py-4 border-b border-border/30 ${editingId ? 'bg-primary/5' : 'bg-secondary/50 dark:bg-secondary/20'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-[15px] font-black tracking-tight text-foreground">{editingId ? "Edit Student" : "New Student"}</CardTitle>
                            <CardDescription className="text-[11px] font-semibold uppercase tracking-widest mt-1">Fields marked * are required. Others optional.</CardDescription>
                        </div>
                        {editingId && (
                            <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs h-7 font-bold hover:bg-destructive/10 hover:text-destructive">
                                <X className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Row 1: Name + Roll */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
                                <Input placeholder="Student Name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Roll Number <span className="text-red-500">*</span></Label>
                                <Input placeholder="21MH1A0501" value={formData.roll_no} onChange={(e) => setFormData({...formData, roll_no: e.target.value.toUpperCase()})} required className="h-8 text-sm" />
                            </div>
                        </div>

                        {/* Row 2: Dept + Year + Section + Batch */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Dept <span className="text-red-500">*</span></Label>
                                <Select disabled={isHod} value={formData.dept} onValueChange={(v) => setFormData({...formData, dept: v})}>
                                    <SelectTrigger className={`h-8 text-sm ${isHod ? 'opacity-80 bg-muted' : ''}`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {isHod && profile?.dept ? (
                                            <SelectItem value={profile.dept}>{profile.dept}</SelectItem>
                                        ) : (
                                            DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>)
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Year <span className="text-red-500">*</span></Label>
                                <Select value={formData.year} onValueChange={(v) => setFormData({...formData, year: v})}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {allowedYears.map(y => (
                                            <SelectItem key={y} value={String(y)}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Section <span className="text-red-500">*</span></Label>
                                <Input placeholder="A" value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value.toUpperCase()})} required className="h-8 text-sm" maxLength={2} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Batch</Label>
                                <Select value={formData.batch} onValueChange={(v) => setFormData({...formData, batch: v})}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">B1</SelectItem>
                                        <SelectItem value="2">B2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 3: Gender — only essential personal field */}
                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Gender</Label>
                                <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Email</Label>
                                <Input type="email" placeholder="Optional" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Mobile <span className="text-red-500">*</span></Label>
                                <Input placeholder="10 Digits" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})} required pattern="^\d{10}$" maxLength={10} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Parent Mobile</Label>
                                <Input placeholder="Optional" value={formData.parent_mobile} onChange={(e) => setFormData({...formData, parent_mobile: e.target.value})} className="h-8 text-sm" />
                            </div>
                        </div>

                        {/* Row 4: Optional extras collapsed */}
                        <details className="group">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                                <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                More fields (DOB, Blood Group)
                            </summary>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                                    <Input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Blood Group</Label>
                                    <Select value={formData.blood_group} onValueChange={(v) => setFormData({...formData, blood_group: v})}>
                                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Not Set" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="O+">O+</SelectItem><SelectItem value="A+">A+</SelectItem>
                                            <SelectItem value="B+">B+</SelectItem><SelectItem value="AB+">AB+</SelectItem>
                                            <SelectItem value="O-">O-</SelectItem><SelectItem value="A-">A-</SelectItem>
                                            <SelectItem value="B-">B-</SelectItem><SelectItem value="AB-">AB-</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </details>

                        <Button type="submit" disabled={loading} className="w-full h-9 text-sm bg-gradient-to-r from-primary to-amber-500 text-white">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingId ? "Update Student" : "Register Student"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* BLE Beacon — Compact */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
                <CardHeader className="py-4 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                    <CardTitle className="text-[15px] font-black tracking-tight flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                            <Bluetooth className="h-4 w-4" />
                        </div>
                        BLE Beacon
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-col items-center border-2 border-dashed border-border/50 rounded-xl p-4 space-y-3 bg-muted/5">
                        <div className={`rounded-full p-3 ${formData.bluetooth_uuid ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500/20' : 'bg-muted/50'}`}>
                            <Bluetooth className={`h-6 w-6 ${formData.bluetooth_uuid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                        </div>
                        <p className="text-xs text-center text-muted-foreground max-w-[200px] break-all">
                            {formData.bluetooth_uuid || "No device linked"}
                        </p>
                        <Button 
                            variant={formData.bluetooth_uuid ? "secondary" : "default"} 
                            onClick={handleScan} disabled={scanning} size="sm"
                            className={`w-full text-xs ${!formData.bluetooth_uuid && 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                            {scanning ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Scanning...</> : 'Scan Nearby'}
                        </Button>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">UUID <span className="text-red-500">*</span></Label>
                        <Input placeholder="e.g. 00000000-0000-0000-0000-000000000000" value={formData.bluetooth_uuid} onChange={(e) => setFormData({...formData, bluetooth_uuid: e.target.value.toLowerCase()})} required pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$" maxLength={36} className="bg-muted/30 h-8 text-sm" />
                    </div>
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <Info className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">BLE Scanner works only in <strong>Google Chrome</strong> on HTTPS.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
        )}

        {/* Student List with Filters */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
            <CardHeader className="py-4 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                            placeholder="Search name or roll no..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm bg-muted/30"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                        {!isHod && (
                            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-card text-xs">
                                <option value="">All Depts</option>
                                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                            </select>
                        )}
                        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-card text-xs">
                            <option value="">All Years</option>
                            {(isHod ? allowedYears : [1,2,3,4]).map(y => <option key={y} value={y}>Y{y}</option>)}
                        </select>
                        <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="h-8 px-2 rounded-md border border-border bg-card text-xs">
                            <option value="">All Sections</option>
                            {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {(filterDept || filterYear || filterSection) && (
                            <button onClick={() => { setFilterDept(''); setFilterYear(''); setFilterSection('') }} className="text-[10px] text-primary hover:underline">Clear</button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="text-[10px] text-muted-foreground uppercase bg-muted/30 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2.5 text-left font-semibold">Roll No</th>
                                <th className="px-4 py-2.5 text-left font-semibold">Name</th>
                                <th className="px-4 py-2.5 text-left font-semibold">Class</th>
                                <th className="px-4 py-2.5 text-left font-semibold">BLE</th>
                                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></td></tr>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.slice(0, 100).map((s) => (
                                    <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-xs font-medium">{s.roll_no}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-medium text-sm">{s.full_name}</div>
                                            {s.email && <div className="text-[10px] text-muted-foreground">{s.email}</div>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                                {s.dept} • Y{s.year}-{s.section}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bluetooth_uuid ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground bg-muted'}`}>
                                                {s.bluetooth_uuid ? '✓' : '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s.id, s.roll_no)}>
                                                <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                        No students found{searchQuery && ` for "${searchQuery}"`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredStudents.length > 100 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/30 bg-muted/10">
                        Showing first 100 of {filteredStudents.length} students. Use filters to narrow down.
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  )
}
