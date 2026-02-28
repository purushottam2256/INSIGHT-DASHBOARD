import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, UserCog, Search, Shield } from "lucide-react"
import { DEPARTMENTS } from "@/lib/constants"
import { toast } from "sonner"

interface FacultyProfile {
  id: string
  email: string
  full_name: string
  role: string
  dept: string
}

// HOD can assign these roles (NOT hod, principal, admin, management, developer)
const HOD_ALLOWED_ROLES = [
    { value: 'faculty', label: 'Faculty' },
    { value: 'class_incharge', label: 'Class Incharge' },
    { value: 'lab_incharge', label: 'Lab Incharge' },
]

// Admin/Principal/Management can assign all roles
const ALL_ROLES = [
    ...HOD_ALLOWED_ROLES,
    { value: 'hod', label: 'HOD' },
    { value: 'principal', label: 'Principal' },
    { value: 'management', label: 'Management' },
]

export function FacultyManagement() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "faculty",
    dept: "CSE"
  })

  const isHod = profile?.role === 'hod'
  const availableRoles = isHod ? HOD_ALLOWED_ROLES : ALL_ROLES

  useEffect(() => {
    if (isHod && profile?.dept) {
        setFormData(prev => ({ ...prev, dept: profile.dept! }))
    }
  }, [profile, isHod])

  useEffect(() => {
    if (profile) fetchFaculty()
  }, [profile])

  const fetchFaculty = async () => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('*')
      .in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod'])
      
    if (isHod && profile?.dept) {
        query = query.eq('dept', profile.dept)
    }

    const { data, error } = await query.order('full_name')

    if (!error && data) setFacultyList(data as FacultyProfile[])
    setLoading(false)
  }

  const filteredFaculty = facultyList.filter(f => 
    !searchQuery || 
    f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the faculty list?`)) return
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      toast.success(`${name} removed`)
      fetchFaculty()
    } catch (error: any) {
      toast.error("Error: " + error.message)
    }
  }

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email.trim() || !formData.fullName.trim()) {
      toast.error("Email and Name are required")
      return
    }

    // Prevent HOD from adding HOD role
    if (isHod && formData.role === 'hod') {
      toast.error("HODs cannot assign HOD role. Contact Principal or Admin.")
      return
    }

    setLoading(true)
    try {
        // In production, this calls an Edge Function to create auth user.
        // For now, simulate invite flow.
        await new Promise(resolve => setTimeout(resolve, 1000))
        toast.success("Faculty invite sent to " + formData.email)
        setFormData({ email: "", fullName: "", role: "faculty", dept: (isHod ? profile!.dept! : "CSE") })
        fetchFaculty()
    } catch (error: any) {
        toast.error("Error: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      hod: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      faculty: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      class_incharge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      lab_incharge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      principal: 'bg-red-500/10 text-red-600 border-red-500/20',
      management: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    }
    return styles[role] || 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-4">
        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span><span className="font-semibold text-foreground">{facultyList.length}</span> faculty members</span>
            {isHod && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">{profile?.dept} Dept Only</span>}
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            {/* Add Faculty Form */}
            <Card className="border-border/40 shadow-sm h-fit">
                <CardHeader className="py-3 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Plus className="h-3.5 w-3.5" /> Add Faculty
                    </CardTitle>
                    <CardDescription className="text-xs">Send a platform invitation.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <form onSubmit={handleCreateFaculty} className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
                            <Input type="email" placeholder="faculty@mrce.in" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
                            <Input placeholder="Dr. Smith" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required className="h-8 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Role</Label>
                                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {availableRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Department</Label>
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
                        </div>

                        {isHod && (
                            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                <Shield className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                    As HOD, you can add faculty, class incharge, and lab incharge for your department only. To add an HOD, contact Principal.
                                </p>
                            </div>
                        )}

                        <Button type="submit" className="w-full h-8 text-sm" disabled={loading}>
                            {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                            Add Faculty
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            {/* Faculty Directory */}
            <Card className="border-border/40 shadow-sm">
                <CardHeader className="py-3 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input placeholder="Search faculty..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm bg-muted/30" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-border/30">
                        {loading && facultyList.length === 0 ? (
                            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                        ) : filteredFaculty.length > 0 ? (
                            filteredFaculty.map((fac) => (
                                <div key={fac.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <UserCog className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{fac.full_name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRoleBadge(fac.role)}`}>
                                                    {fac.role?.replace('_', ' ')}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">{fac.dept}</span>
                                                {fac.email && <span className="text-[10px] text-muted-foreground hidden sm:inline">• {fac.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(fac.id, fac.full_name)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                {searchQuery ? `No faculty matching "${searchQuery}"` : 'No faculty found'}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
