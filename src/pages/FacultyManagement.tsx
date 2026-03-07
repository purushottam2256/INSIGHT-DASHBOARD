import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, UserCog, Search, Shield, Edit2, X, Check } from "lucide-react"
import { DEPARTMENTS } from "@/lib/constants"
import { toast } from "sonner"

interface FacultyProfile {
  id: string
  email: string
  full_name: string
  role: string
  dept: string
  is_invite?: boolean
  status?: string
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ full_name: "", role: "", dept: "", is_invite: false })
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "faculty",
    dept: "",
    year: "1",
    section: "A"
  })

  // List of sections (A-D) and years (1-4)
  const YEARS = ["1", "2", "3", "4"]
  const SECTIONS = ["A", "B", "C", "D"]

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

    // Fetch active profiles
    let pQuery = supabase
      .from('profiles')
      .select('*')
      .in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod'])
      
    if (isHod && profile?.dept) pQuery = pQuery.eq('dept', profile.dept)

    const { data: pData, error: pError } = await pQuery

    // Fetch pending invitations
    let iQuery = supabase
      .from('faculty_invitations')
      .select('*')
      .eq('status', 'pending')

    if (isHod && profile?.dept) iQuery = iQuery.eq('dept', profile.dept)

    const { data: iData, error: iError } = await iQuery

    if (pError || iError) {
      toast.error("Failed to load faculty list.")
    } else {
        const combined = [
            ...(pData || []).map(p => ({ ...p, is_invite: false })),
            ...(iData || []).map(i => ({ ...i, is_invite: true }))
        ]
        
        combined.sort((a, b) => a.full_name.localeCompare(b.full_name))
        setFacultyList(combined as FacultyProfile[])
    }

    setLoading(false)
  }

  const filteredFaculty = facultyList.filter(f => 
    !searchQuery || 
    f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (fac: FacultyProfile) => {
    if (!confirm(`Remove ${fac.full_name} from the system?`)) return
    try {
      const { error } = await supabase
        .from(fac.is_invite ? 'faculty_invitations' : 'profiles')
        .delete()
        .eq('id', fac.id)
      
      if (error) throw error
      toast.success(`${fac.full_name} removed`)
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
        // 1. Insert into faculty_invitations
        const { data: inviteData, error: inviteError } = await supabase.from('faculty_invitations').insert([{
            email: formData.email.trim().toLowerCase(),
            full_name: formData.fullName.trim(),
            role: formData.role,
            dept: formData.dept,
            year: formData.role === 'class_incharge' ? parseInt(formData.year) : null,
            section: formData.role === 'class_incharge' ? formData.section : null,
            invited_by: profile?.id
        }]).select().single()

        if (inviteError) {
            if (inviteError.message?.includes('duplicate') || inviteError.code === '23505') {
                toast.error("An invitation or profile with this email already exists.")
                return
            }
            throw inviteError
        }

        // 2. Send Magic Link via Supabase Auth
        // Redirects to the Welcome page where new faculty set their password
        const { error: authError } = await supabase.auth.signInWithOtp({
            email: formData.email.trim().toLowerCase(),
            options: {
                shouldCreateUser: true,
                emailRedirectTo: window.location.origin + '/welcome'
            }
        })

        if (authError) {
            // Rollback invite if email fails
            await supabase.from('faculty_invitations').delete().eq('id', inviteData.id)
            throw new Error("Failed to send invitation email: " + authError.message)
        }

        toast.success(`Registration invitation sent to ${formData.fullName}`)
        setFormData({ email: "", fullName: "", role: "faculty", dept: profile?.dept || '', year: "1", section: "A" })
        fetchFaculty()

    } catch (error: any) {
        toast.error("Error: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  const startEdit = (fac: FacultyProfile) => {
    setEditingId(fac.id)
    setEditData({ full_name: fac.full_name, role: fac.role, dept: fac.dept, is_invite: fac.is_invite || false })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditData({ full_name: "", role: "", dept: "", is_invite: false })
  }

  const handleUpdateFaculty = async () => {
    if (!editingId || !editData.full_name.trim()) {
      toast.error("Name is required")
      return
    }
    try {
      const { error } = await supabase
        .from(editData.is_invite ? 'faculty_invitations' : 'profiles')
        .update({
          full_name: editData.full_name.trim(),
          role: editData.role,
          dept: editData.dept,
        })
        .eq('id', editingId)
      if (error) throw error
      toast.success("Faculty updated")
      setEditingId(null)
      fetchFaculty()
    } catch (error: any) {
      toast.error("Update failed: " + error.message)
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
                    <CardDescription className="text-xs">Add faculty directly to the system.</CardDescription>
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

                        {formData.role === 'class_incharge' && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                <div className="space-y-1">
                                    <Label className="text-xs text-emerald-700 dark:text-emerald-400">Class Year</Label>
                                    <Select value={formData.year} onValueChange={(v) => setFormData({...formData, year: v})}>
                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {YEARS.map(y => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-emerald-700 dark:text-emerald-400">Section</Label>
                                    <Select value={formData.section} onValueChange={(v) => setFormData({...formData, section: v})}>
                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {isHod && (
                            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                <Shield className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                    As HOD, you can add faculty, class incharge, and lab incharge for your department only. To add an HOD, contact Principal.
                                </p>
                            </div>
                        )}

                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex gap-2 items-start mt-2">
                            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                <strong className="text-foreground">Automated Invitations:</strong> Adding a faculty member here will send them a formal registration email. When they securely log in via the provided link, their profile and role will be automatically claimed.
                            </p>
                        </div>

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
                                    {editingId === fac.id ? (
                                        /* Inline Edit Mode */
                                        <div className="flex-1 space-y-2">
                                            <div className="grid grid-cols-3 gap-2">
                                                <Input
                                                    value={editData.full_name}
                                                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                                    placeholder="Full Name"
                                                    className="h-7 text-xs"
                                                />
                                                <select
                                                    value={editData.role}
                                                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                                    className="h-7 px-2 rounded-md border border-border bg-card text-xs"
                                                >
                                                    {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </select>
                                                <select
                                                    value={editData.dept}
                                                    onChange={(e) => setEditData({ ...editData, dept: e.target.value })}
                                                    disabled={isHod}
                                                    className={`h-7 px-2 rounded-md border border-border bg-card text-xs ${isHod ? 'opacity-60' : ''}`}
                                                >
                                                    {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Button size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={handleUpdateFaculty}>
                                                    <Check className="h-3 w-3" /> Save
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={cancelEdit}>
                                                    <X className="h-3 w-3" /> Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Display Mode */
                                        <>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <UserCog className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="min-w-0 flex-1 flex flex-col items-start">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm truncate">{fac.full_name}</p>
                                                        {fac.is_invite && (
                                                            <span className="px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] font-bold uppercase tracking-wider">
                                                                Pending Invite
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5 transform origin-left scale-95">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRoleBadge(fac.role)}`}>
                                                            {fac.role?.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{fac.dept}</span>
                                                        {fac.email && <span className="text-[10px] text-muted-foreground hidden sm:inline">• {fac.email}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => startEdit(fac)}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(fac)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
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
