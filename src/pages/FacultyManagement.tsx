import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus, Trash2, UserCog, Search, Edit2, Camera, KeyRound } from "lucide-react"
import { DEPARTMENTS } from "@/lib/constants"
import { toast } from "sonner"

interface FacultyProfile {
  id: string
  email: string
  full_name: string
  role: string
  dept: string
  mobile?: string
  faculty_id?: string
  avatar_url?: string
  is_invite?: boolean
  status?: string
}

const availableRoles = [
    { value: 'faculty', label: 'Faculty' },
    { value: 'class_incharge', label: 'Class Incharge' },
    { value: 'lab_incharge', label: 'Lab Incharge' },
]

export function FacultyManagement() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [facultyList, setFacultyList] = useState<FacultyProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [editingFaculty, setEditingFaculty] = useState<FacultyProfile | null>(null)
  const [editData, setEditData] = useState({ 
    full_name: "", role: "", dept: "", email: "", mobile: "", faculty_id: "", avatar_url: "", new_password: ""
  })
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

    // Fetch active profiles only (we dropped invitations)
    let pQuery = supabase
      .from('profiles')
      .select('*')
      .in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod'])
      
    if (isHod && profile?.dept) pQuery = pQuery.eq('dept', profile.dept)

    const { data: pData, error: pError } = await pQuery

    if (pError) {
      toast.error("Failed to load faculty list.")
    } else {
        const combined = (pData || []).map(p => ({ ...p, is_invite: false }));
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
        .from('profiles')
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
    }

    setLoading(true)
    try {
        // 1. Generate a temporary password
        const tempPassword = "Welcome@" + Math.floor(1000 + Math.random() * 9000);
        const finalDept = isHod && profile?.dept ? profile.dept : formData.dept;

        // 2. Direct Account Creation via Secure RPC
        // Bypasses the email confirmation delay that breaks Foreign Keys by inserting securely directly into auth.users.
        const { data: newUserData, error: provisionError } = await supabase.rpc('admin_create_profile', {
            p_email: formData.email.trim().toLowerCase(),
            p_password: tempPassword,
            p_full_name: formData.fullName.trim(),
            p_role: formData.role,
            p_dept: finalDept
        });

        if (provisionError) {
             console.error("Account provision failed:", provisionError);
             if (provisionError.message.includes('unique constraint')) {
                 toast.error("An account with this email already exists.");
             } else {
                 toast.error("Account creation failed: " + provisionError.message);
             }
             return;
        }

        const newUserId = newUserData?.id;
        if (!newUserId) throw new Error("Could not retrieve new user ID."); 

        // 4. (Optional) Insert Class Incharge context if applicable
        if (formData.role === 'class_incharge' && finalDept) {
             try {
                 await supabase.from('class_incharges').insert({
                     faculty_id: newUserId,
                     dept: finalDept,
                     year: parseInt(formData.year),
                     section: formData.section
                 });
             } catch (e) {
                 console.warn("Class incharge mapping failed", e);
             }
        }

        toast.success(
            <div className="flex flex-col gap-1">
                <span className="font-bold">Faculty Fully Registered!</span>
                <span className="text-[11px] opacity-90">Please share these credentials with them:</span>
                <span className="text-xs font-mono bg-black/20 p-1 rounded mt-1 text-white">
                    {formData.email.trim().toLowerCase()} <br/>
                    {tempPassword}
                </span>
            </div>,
            { duration: 15000 }
        );

        setFormData({ email: "", fullName: "", role: "faculty", dept: profile?.dept || '', year: "1", section: "A" });
        fetchFaculty();

    } catch (error: any) {
        toast.error("Error: " + error.message);
    } finally {
        setLoading(false);
    }
  }

  const startEdit = (fac: FacultyProfile) => {
    setEditingFaculty(fac)
    setEditData({ 
        full_name: fac.full_name, 
        role: fac.role, 
        dept: fac.dept, 
        email: fac.email,
        mobile: fac.mobile || "", 
        faculty_id: fac.faculty_id || "", 
        avatar_url: fac.avatar_url || "", 
        new_password: "" 
    })
  }

  const cancelEdit = () => {
    setEditingFaculty(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingFaculty) return

    setIsUploading(true)
    try {
      // 1. Delete old avatar if it exists
      if (editData.avatar_url) {
          try {
              // Extract the file path from the public URL
              // Example URL: https://[project].supabase.co/storage/v1/object/public/avatars/user_id-random.jpg
              const urlParts = editData.avatar_url.split('/avatars/');
              if (urlParts.length === 2) {
                  const oldPath = urlParts[1];
                  await supabase.storage.from('avatars').remove([oldPath]);
              }
          } catch (delErr) {
              console.warn("Failed to delete old avatar, proceeding anyway", delErr);
          }
      }

      // 2. Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${editingFaculty.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })
      
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      setEditData(prev => ({ ...prev, avatar_url: data.publicUrl }))
      toast.success("Image uploaded, remember to click Save")
    } catch (error: any) {
      toast.error("Upload failed: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdateFaculty = async () => {
    if (!editingFaculty || !editData.full_name.trim()) {
      toast.error("Name is required")
      return
    }
    setLoading(true)
    try {
      // 1. Update Password if requested
      if (editData.new_password) {
          const { error: pwError } = await supabase.rpc('admin_update_faculty_password', {
              p_user_id: editingFaculty.id,
              p_new_password: editData.new_password
          })
          if (pwError) throw new Error("Failed to reset password: " + pwError.message)
      }

      // 2. Update Profile columns
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name.trim(),
          role: editData.role,
          dept: editData.dept,
          mobile: editData.mobile || null,
          faculty_id: editData.faculty_id || null,
          avatar_url: editData.avatar_url || null,
        })
        .eq('id', editingFaculty.id)
      
      if (profileError) throw profileError
      
      toast.success("Faculty profile updated successfully")
      setEditingFaculty(null)
      fetchFaculty()
    } catch (error: any) {
      toast.error("Update failed: " + error.message)
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
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden h-fit">
                <CardHeader className="py-4 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                    <CardTitle className="text-[15px] font-black tracking-tight flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Plus className="h-4 w-4" />
                        </div>
                        Add Faculty
                    </CardTitle>
                    <CardDescription className="text-[11px] font-semibold uppercase tracking-widest mt-1">Direct System Registration</CardDescription>
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
                                <Select disabled={isHod} value={isHod ? profile?.dept || '' : formData.dept} onValueChange={(v) => setFormData({...formData, dept: v})}>
                                    <SelectTrigger className={`h-8 text-sm ${isHod ? 'opacity-80 bg-muted cursor-not-allowed' : ''}`}>
                                        <SelectValue placeholder={isHod ? profile?.dept : "Select department"} />
                                    </SelectTrigger>
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

                        {/* Role specific forms or info can go here if needed... */}

                        <Button type="submit" className="w-full h-8 text-sm" disabled={loading}>
                            {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                            Add Faculty
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            {/* Faculty Directory */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
                <CardHeader className="py-4 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search faculty directory..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 text-xs font-semibold rounded-xl bg-background/50 focus-visible:ring-1 focus-visible:ring-primary/50" />
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
                                        <div className="h-8 w-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                                            {fac.avatar_url ? (
                                                <img src={fac.avatar_url} alt={fac.full_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <UserCog className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col items-start">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm truncate">{fac.full_name}</p>
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

        {/* Edit Faculty Modal */}
        <Dialog open={!!editingFaculty} onOpenChange={(open) => !open && cancelEdit()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Faculty Profile</DialogTitle>
                    <DialogDescription>Update the details, profile picture, or reset password.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-20 w-20 rounded-full border border-border shadow-sm overflow-hidden bg-muted/30 flex items-center justify-center relative group">
                            {editData.avatar_url ? (
                                <img src={editData.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <UserCog className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div 
                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileUpload} />
                        <span className="text-[10px] text-muted-foreground">Click image to upload</span>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs">Full Name</Label>
                        <Input value={editData.full_name} onChange={(e) => setEditData(p => ({ ...p, full_name: e.target.value }))} className="h-8 text-sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs">Role</Label>
                            <Select value={editData.role} onValueChange={(v) => setEditData(p => ({ ...p, role: v }))}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {availableRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">Department</Label>
                            <Select value={editData.dept} onValueChange={(v) => setEditData(p => ({ ...p, dept: v }))} disabled={isHod}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs">Mobile Number</Label>
                            <Input value={editData.mobile} onChange={(e) => setEditData(p => ({ ...p, mobile: e.target.value }))} className="h-8 text-sm" placeholder="+91..." />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">Faculty ID</Label>
                            <Input value={editData.faculty_id} onChange={(e) => setEditData(p => ({ ...p, faculty_id: e.target.value }))} className="h-8 text-sm" />
                        </div>
                    </div>

                    <div className="rounded-lg border border-border/50 p-3 bg-muted/10 space-y-2.5 mt-2">
                        <div className="flex items-center gap-2">
                            <KeyRound className="h-3.5 w-3.5 text-primary" />
                            <Label className="text-xs font-semibold">Security</Label>
                        </div>
                        <Input 
                            type="text" 
                            placeholder="Type new password to reset..." 
                            value={editData.new_password} 
                            onChange={(e) => setEditData(p => ({ ...p, new_password: e.target.value }))} 
                            className="h-8 text-sm" 
                        />
                        <p className="text-[9px] text-muted-foreground leading-tight">Leave blank to keep the current password. If typing a new one, tell the faculty member.</p>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                    <Button variant="ghost" onClick={cancelEdit} disabled={loading} className="h-8 text-sm">Cancel</Button>
                    <Button onClick={handleUpdateFaculty} disabled={loading || isUploading} className="h-8 text-sm">
                        {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/>}
                        Save Profile
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
