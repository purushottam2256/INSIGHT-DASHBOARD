import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Trash2, Edit2, ShieldAlert, Code2, Briefcase, GraduationCap, Network, User, UserPlus, Shield, Mail, Phone, CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { DEPARTMENTS } from "@/lib/constants"
import { UserProfile } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AdminProfile {
    id: string
    username: string
    email: string
    full_name: string
    role: string
    dept: string | null
    is_active: boolean
    avatar_url: string | null
    phone: string | null
    designation: string | null
    joining_date: string | null
    gender: string | null
    qualification: string | null
    experience_years: number | null
    address: string | null
    date_of_birth: string | null
    blood_group: string | null
}

export function AdminManagementTab({ profile }: { profile: UserProfile | null }) {
    const [loading, setLoading] = useState(false)
    const [admins, setAdmins] = useState<AdminProfile[]>([])
    
    const [showDialog, setShowDialog] = useState(false)
    const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const [formData, setFormData] = useState({
        full_name: "", email: "", username: "", role: "management", dept: "none", password: "",
        avatar_url: "", phone: "", designation: "", joining_date: "", gender: "Male",
        qualification: "", experience_years: "", address: "", date_of_birth: "", blood_group: ""
    })

    const isDeveloper = profile?.role === 'developer'

    useEffect(() => {
        fetchAdmins()
    }, [])

    const fetchAdmins = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .order('role', { ascending: true })
            if (error) throw error
            setAdmins(data || [])
        } catch (error: any) {
            toast.error("Failed to load admins: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenCreate = () => {
        setEditingAdmin(null)
        setFormData({
            full_name: "", email: "", username: "", role: "management", dept: "none", password: "",
            avatar_url: "", phone: "", designation: "", joining_date: "", gender: "Male",
            qualification: "", experience_years: "", address: "", date_of_birth: "", blood_group: ""
        })
        setShowDialog(true)
    }

    const handleOpenEdit = (admin: AdminProfile) => {
        setEditingAdmin(admin)
        setFormData({
            full_name: admin.full_name, email: admin.email, username: admin.username,
            role: admin.role, dept: admin.dept || "none", password: "",
            avatar_url: admin.avatar_url || "", phone: admin.phone || "",
            designation: admin.designation || "", joining_date: admin.joining_date || "",
            gender: admin.gender || "Male", qualification: admin.qualification || "",
            experience_years: admin.experience_years?.toString() || "", address: admin.address || "",
            date_of_birth: admin.date_of_birth || "", blood_group: admin.blood_group || ""
        })
        setShowDialog(true)
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB')
            return
        }
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = error => reject(error)
            })
            setFormData(prev => ({ ...prev, avatar_url: base64 }))
        } catch (err) {
            toast.error('Failed to read image')
        }
    }

    const handleDelete = async (admin: AdminProfile) => {
        if (!confirm(`Are you sure you want to completely delete ${admin.full_name}?`)) return
        
        try {
            const { error } = await supabase.rpc('admin_delete_system_admin', {
                p_user_id: admin.id
            })
            if (error) throw error
            toast.success("Admin deleted successfully")
            fetchAdmins()
        } catch (error: any) {
            toast.error("Delete failed: " + error.message)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.email.trim() || !formData.full_name.trim() || !formData.username.trim()) {
            toast.error("Please fill all required fields")
            return
        }

        if (!editingAdmin && (!formData.password || formData.password.length < 6)) {
            toast.error("Password must be at least 6 characters")
            return
        }

        setIsSaving(true)
        const finalDept = formData.dept === 'none' ? null : formData.dept

        try {
            const rpcPayload = {
                p_full_name: formData.full_name.trim(),
                p_role: formData.role,
                p_username: formData.username.trim(),
                p_dept: finalDept,
                p_avatar_url: formData.avatar_url || null,
                p_phone: formData.phone || null,
                p_designation: formData.designation || null,
                p_joining_date: formData.joining_date || null,
                p_gender: formData.gender || null,
                p_qualification: formData.qualification || null,
                p_experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
                p_address: formData.address || null,
                p_date_of_birth: formData.date_of_birth || null,
                p_blood_group: formData.blood_group || null
            }

            if (editingAdmin) {
                const { error } = await supabase.rpc('admin_update_system_admin', {
                    p_user_id: editingAdmin.id,
                    p_password: formData.password ? formData.password : null,
                    ...rpcPayload
                })
                if (error) throw error
                toast.success("Admin updated successfully")
            } else {
                const { error } = await supabase.rpc('admin_create_system_admin', {
                    p_email: formData.email.trim().toLowerCase(),
                    p_password: formData.password,
                    ...rpcPayload
                })
                if (error) throw error
                toast.success("Admin created successfully")
            }

            setShowDialog(false)
            fetchAdmins()
        } catch (error: any) {
            toast.error("Operation failed: " + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    const getRoleStyling = (role: string) => {
        switch (role) {
            case 'developer': 
                return { 
                    badge: 'bg-indigo-100/80 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
                    icon: <Code2 className="h-3.5 w-3.5 mr-1" />
                };
            case 'management': 
                return { 
                    badge: 'bg-amber-100/80 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
                    icon: <Briefcase className="h-3.5 w-3.5 mr-1" />
                };
            case 'principal': 
                return { 
                    badge: 'bg-rose-100/80 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
                    icon: <GraduationCap className="h-3.5 w-3.5 mr-1" />
                };
            case 'hod': 
                return { 
                    badge: 'bg-sky-100/80 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
                    icon: <Network className="h-3.5 w-3.5 mr-1" />
                };
            default: 
                return { 
                    badge: 'bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30',
                    icon: <User className="h-3.5 w-3.5 mr-1" />
                };
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Hero Banner Area */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/20 shadow-sm p-8 group">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-3">
                    <Shield className="w-80 h-80 text-primary" strokeWidth={1} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
                            <Shield className="h-3.5 w-3.5" />
                            Security Protocol
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                            Administrator Management
                        </h2>
                        <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed">
                            Control platform access across the institution. These accounts possess elevated, root-level permissions bypassing standard role-level securities constraints. Handle with strict care.
                        </p>
                    </div>
                    
                    <Button 
                        onClick={handleOpenCreate} 
                        size="lg" 
                        className="shadow-md hover:shadow-xl transition-all hover:scale-[1.03] duration-300 bg-primary shrink-0 self-start md:self-auto group/btn"
                    >
                        <UserPlus className="h-5 w-5 mr-2 transition-transform duration-300 group-hover/btn:rotate-12" /> 
                        Provision New Admin
                    </Button>
                </div>
            </div>

            {/* Admin Grid / List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold tracking-tight px-2">Active Administrators ({admins.length})</h3>
                
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center border border-border/50 border-dashed rounded-3xl bg-muted/20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground font-medium">Decrypting security records...</p>
                    </div>
                ) : admins.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {admins.map((admin, idx) => {
                            const { badge, icon } = getRoleStyling(admin.role)
                            return (
                                <div 
                                    key={admin.id} 
                                    className="group bg-card hover:bg-muted/30 border border-border/60 hover:border-primary/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95"
                                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase shadow-sm border ${badge}`}>
                                            {icon}
                                            {admin.role.replace('_', ' ')}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary bg-background shadow-xs hover:bg-primary/10" onClick={() => handleOpenEdit(admin)}>
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive bg-background shadow-xs hover:bg-destructive/10" onClick={() => handleDelete(admin)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-5">
                                        <Avatar className="h-14 w-14 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all shadow-sm">
                                            <AvatarImage src={admin.avatar_url || undefined} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-lg font-bold">
                                                {admin.full_name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <h4 className="font-semibold text-foreground truncate text-base group-hover:text-primary transition-colors">{admin.full_name}</h4>
                                            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">@{admin.username}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2.5 text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl">
                                        <div className="flex items-center gap-2 truncate">
                                            <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                            <span className="truncate">{admin.email}</span>
                                        </div>
                                        {admin.dept && (
                                            <div className="flex items-center gap-2 truncate">
                                                <Network className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                <span className="font-medium text-foreground">{admin.dept}</span> Department
                                            </div>
                                        )}
                                        {admin.phone && (
                                            <div className="flex items-center gap-2 truncate">
                                                <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                <span>{admin.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center border border-border/50 border-dashed rounded-3xl bg-muted/10">
                        <ShieldAlert className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <h3 className="text-lg font-semibold text-foreground">No Administrators Found</h3>
                        <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                            The system currently has no dedicated administrative accounts. Click 'Provision New Admin' to secure the platform.
                        </p>
                    </div>
                )}
            </div>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-border/50 rounded-[28px] shadow-2xl">
                    <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 border-b border-border/50 relative overflow-hidden">
                        <div className="absolute right-[-10%] top-[-20%] opacity-5">
                            <Shield className="w-64 h-64" />
                        </div>
                        <DialogHeader className="relative z-10">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {editingAdmin ? 'Update Administrator' : 'Provision Administrator'}
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                {editingAdmin 
                                    ? "Modify the security clearance and details of this system administrator."
                                    : "Create a new privileged account with root dashboard access."}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
                        
                        {/* Core Identity Section */}
                        <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-6 transition-all hover:bg-muted/40">
                            <div className="flex flex-col items-center gap-3 shrink-0">
                                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Portrait</Label>
                                <div className="relative group hover:opacity-90 cursor-pointer" onClick={() => document.getElementById('admin-avatar-upload')?.click()}>
                                    <Avatar className="h-24 w-24 ring-4 ring-background shadow-md group-hover:ring-primary/20 transition-all duration-300">
                                        <AvatarImage src={formData.avatar_url || undefined} className="object-cover" />
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-3xl font-bold">
                                            {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Edit2 className="h-5 w-5 text-white mb-1" />
                                        <span className="text-[10px] text-white font-medium">Change</span>
                                    </div>
                                    <input 
                                        id="admin-avatar-upload"
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label className="text-xs font-semibold">Legal Full Name <span className="text-destructive">*</span></Label>
                                    <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required className="h-10 bg-background" placeholder="e.g. Dr. John Carter" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">System Username <span className="text-destructive">*</span></Label>
                                    <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required className="h-10 font-mono text-sm bg-background" placeholder="e.g. john_c" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Email Address <span className="text-destructive">*</span></Label>
                                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="h-10 bg-background" disabled={!!editingAdmin} placeholder="Will be used for login" />
                                </div>
                            </div>
                        </div>

                        {/* Security Clearance Section */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-foreground mb-4 pb-2 border-b border-border/50">
                                <Shield className="h-4 w-4 text-primary" /> Security & Access
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Clearance Level <span className="text-destructive">*</span></Label>
                                    <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                                        <SelectTrigger className="h-10 text-sm font-medium"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="management">Management Board</SelectItem>
                                            <SelectItem value="principal">Principal</SelectItem>
                                            <SelectItem value="hod">Head of Dept (HOD)</SelectItem>
                                            {isDeveloper && <SelectItem value="developer">Developer</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Governed Department</Label>
                                    <Select value={formData.dept} onValueChange={v => setFormData({...formData, dept: v})}>
                                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Institution Wide (None)</SelectItem>
                                            {DEPARTMENTS.map(d => (
                                                <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Authentication Password {editingAdmin && <span className="font-normal text-muted-foreground">(Optional)</span>}</Label>
                                    <Input 
                                        type="text"
                                        placeholder={editingAdmin ? "Unchanged" : "Min 6 chars"} 
                                        value={formData.password} 
                                        onChange={e => setFormData({...formData, password: e.target.value})} 
                                        className="h-10 bg-background" 
                                        required={!editingAdmin}
                                    />
                                </div>
                            </div>
                            
                            {!isDeveloper && formData.role === 'developer' && (
                                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm mt-5 shadow-sm border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                                    <ShieldAlert className="h-5 w-5 shrink-0" />
                                    <p className="font-medium">Clearance Warning: You must hold the <b>Developer</b> rank to assign the Developer role to others.</p>
                                </div>
                            )}
                        </div>

                        {/* Extended Details Section */}
                        <div>
                            <h4 className="text-sm font-bold flex items-center gap-2 text-foreground mb-4 pb-2 border-b border-border/50">
                                <CalendarDays className="h-4 w-4 text-primary" /> Professional & Personal Details
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2 col-span-1 lg:col-span-2">
                                    <Label className="text-xs font-semibold">Designation / Title</Label>
                                    <Input value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="h-9 text-sm" placeholder="e.g. Dean of Academics" />
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label className="text-xs font-semibold">Highest Qualification</Label>
                                    <Input value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} className="h-9 text-sm" placeholder="e.g. Ph.D in Computer Science" />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Phone Number</Label>
                                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-9 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Joining Date</Label>
                                    <Input type="date" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} className="h-9 text-sm text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Experience (Yrs)</Label>
                                    <Input type="number" min="0" value={formData.experience_years} onChange={e => setFormData({...formData, experience_years: e.target.value})} className="h-9 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Blood Group</Label>
                                    <Select value={formData.blood_group} onValueChange={v => setFormData({...formData, blood_group: v})}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Not Specified</SelectItem>
                                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                                                <SelectItem key={b} value={b}>{b}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2 lg:col-span-1">
                                    <Label className="text-xs font-semibold">Gender</Label>
                                    <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-1 sm:col-span-1 lg:col-span-3">
                                    <Label className="text-xs font-semibold">Residential Address</Label>
                                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="h-9 text-sm flex-1" placeholder="Full address" />
                                </div>
                            </div>
                        </div>

                    </form>

                    <div className="p-6 border-t border-border/50 bg-muted/20 flex items-center justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setShowDialog(false)} disabled={isSaving} className="hover:bg-muted/50 rounded-xl">Discard</Button>
                        <Button type="button" onClick={handleSubmit} disabled={isSaving} className="rounded-xl shadow-md px-6 bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingAdmin ? "Save Changes" : "Provision Target"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: hsl(var(--border));
                    border-radius: 20px;
                }
            `}} />
        </div>
    )
}

