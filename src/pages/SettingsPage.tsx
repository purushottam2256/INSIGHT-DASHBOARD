import { useState, useEffect } from 'react';
import { 
    User, Shield, Info, 
    Mail, Building2,
    Sun, Moon, Loader2, Bug,
    Lock, Key, ChevronRight, CheckCircle2, ChevronDown,
    Sparkles, Monitor, Smartphone, Server, Paintbrush, Fingerprint,
    Phone, Briefcase, CalendarDays, Droplets, GraduationCap, Award, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';
import { AdminManagementTab } from './AdminManagementTab';
import { IssuesTab } from './IssuesTab';

export function SettingsPage() {
    const { profile } = useDashboardData();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');
    
    // Profile State
    const [fullName, setFullName] = useState('');
    const [extendedProfile, setExtendedProfile] = useState<any>(null);
    
    // Avatar State
    const [avatarUrl, setAvatarUrl] = useState('');

    // Password State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [showAllFields, setShowAllFields] = useState(false);

    useEffect(() => {
        if (profile?.full_name) setFullName(profile.full_name);
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    }, [profile]);

    useEffect(() => {
        const fetchExtendedProfile = async () => {
            if (!profile?.id) return;
            try {
                const tableToQuery = ['hod', 'principal', 'management', 'developer'].includes(profile.role) ? 'admins' : 'profiles';
                const { data, error } = await supabase.from(tableToQuery).select('*').eq('id', profile.id).single();
                if (!error && data) {
                    setExtendedProfile(data);
                }
            } catch (err) {
                console.error('Failed to fetch extended profile', err);
            }
        };
        fetchExtendedProfile();
    }, [profile?.id, profile?.role]);

    // Handle Password Update
    const handleUpdatePassword = async () => {
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast.success('Password updated successfully');
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const isAdminRole = ['developer', 'principal'].includes(profile?.role || '');

    const settingsTabs = [
        { value: 'profile', label: 'My Profile', icon: User, desc: 'Personal details and avatar' },
        { value: 'appearance', label: 'Appearance', icon: Paintbrush, desc: 'Theme preferences' },
        { value: 'security', label: 'Security', icon: Fingerprint, desc: 'Password and authentication' },
        { value: 'issues', label: 'Issues & Support', icon: Bug, desc: 'Report bugs and requests' },
        ...(isAdminRole ? [{ value: 'admin', label: 'System Admins', icon: Shield, desc: 'Manage platform administrators' }] : []),
        { value: 'about', label: 'About', icon: Info, desc: 'App info and versions' },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-8 animate-fade-in relative min-h-[750px] w-full max-w-7xl mx-auto pb-10">
            {/* Sidebar Navigation */}
            <div className="md:w-72 shrink-0 space-y-2">
                <div className="px-5 py-6 mb-2 rounded-[2rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-3">
                        <Sparkles className="w-32 h-32 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Settings</h3>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Control your platform presence</p>
                </div>

                <div className="bg-card/50 backdrop-blur-xl rounded-[2rem] border border-border/50 p-3 shadow-sm flex flex-col gap-1">
                    {settingsTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.value;
                        return (
                            <button 
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value)}
                                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 text-left group relative outline-none ${
                                    isActive 
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]' 
                                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/20 shadow-inner' : 'bg-background group-hover:bg-card border border-border/40'}`}>
                                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-foreground'}`} />
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold tracking-wide transition-colors duration-300 ${isActive ? 'text-white' : ''}`}>{tab.label}</p>
                                    <p className={`text-[10px] uppercase tracking-wider font-semibold opacity-70 mt-0.5 ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>{tab.desc}</p>
                                </div>
                                <ChevronRight className={`h-4 w-4 transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0 text-white' : 'opacity-0 -translate-x-2'}`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="space-y-6"
                    >
                        {/* PROFILE CONTENT */}
                        {activeTab === 'profile' && (
                            <div className="rounded-[2.5rem] bg-card border border-border/50 shadow-sm relative overflow-hidden pb-8">
                                {/* Cover Photo Banner */}
                                <div className="h-40 w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent relative border-b border-border/40">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
                                </div>
                                
                                <div className="px-8 md:px-12 relative">
                                    <div className="flex flex-col md:flex-row gap-10 items-start relative -mt-20">
                                        {/* Avatar Column */}
                                        <div className="flex flex-col items-center gap-4 shrink-0">
                                            <div className="relative">
                                                <Avatar className="h-40 w-40 ring-4 ring-background shadow-2xl relative z-10">
                                                    <AvatarImage src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'User')}&background=random&color=fff`} className="object-cover" />
                                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-5xl font-black">
                                                        {profile?.full_name?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        </div>

                                        {/* Form Column */}
                                        <div className="flex-1 w-full pt-16 md:pt-28 space-y-8">
                                            
                                            <div>
                                                <h3 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
                                                    Personal Dossier
                                                </h3>
                                                <p className="text-sm text-muted-foreground mt-1">Review and modify your identity traces on the platform.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 p-6 bg-muted/30 rounded-3xl border border-border/40">
                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5 text-primary" /> Full Legal Name
                                                    </label>
                                                    <Input 
                                                        value={fullName} 
                                                        onChange={e => setFullName(e.target.value)} 
                                                        disabled
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium px-4" 
                                                    />
                                                </div>
                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Mail className="h-3.5 w-3.5 text-primary" /> Authenticated Email
                                                    </label>
                                                    <Input 
                                                        defaultValue={profile?.email || extendedProfile?.email || ''} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>
                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Building2 className="h-3.5 w-3.5 text-primary" /> Assigned Department
                                                    </label>
                                                    <Input 
                                                        defaultValue={profile?.dept || extendedProfile?.dept || 'Institution Wide'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>
                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-primary uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Shield className="h-3.5 w-3.5" /> Clearance Level
                                                    </label>
                                                    <Input 
                                                        defaultValue={profile?.role?.toUpperCase() || ''} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-primary/10 border-primary/20 text-primary font-bold text-base cursor-not-allowed tracking-wide" 
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Fingerprint className="h-3.5 w-3.5 text-primary" /> Username
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.username || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium px-4" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Phone className="h-3.5 w-3.5 text-primary" /> Contact Number
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.phone || extendedProfile?.mobile || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                {/* Toggle for extra fields */}
                                                <div className="md:col-span-2">
                                                    <button
                                                        onClick={() => setShowAllFields(!showAllFields)}
                                                        className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors py-2"
                                                    >
                                                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showAllFields ? 'rotate-180' : ''}`} />
                                                        {showAllFields ? 'Hide Details' : 'Show All Details'}
                                                    </button>
                                                </div>

                                                {showAllFields && (
                                                    <>
                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Fingerprint className="h-3.5 w-3.5 text-primary" /> Username
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.username || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium px-4" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5 text-primary" /> Gender
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.gender || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Briefcase className="h-3.5 w-3.5 text-primary" /> Designation
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.designation || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <GraduationCap className="h-3.5 w-3.5 text-primary" /> Qualification
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.qualification || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Award className="h-3.5 w-3.5 text-primary" /> Experience (Years)
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.experience_years?.toString() || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <CalendarDays className="h-3.5 w-3.5 text-primary" /> Date of Birth
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.date_of_birth || extendedProfile?.dob || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <Droplets className="h-3.5 w-3.5 text-primary" /> Blood Group
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.blood_group || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <CalendarDays className="h-3.5 w-3.5 text-primary" /> Joining Date
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.joining_date || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>

                                                <div className="space-y-2.5 md:col-span-2">
                                                    <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <MapPin className="h-3.5 w-3.5 text-primary" /> Address
                                                    </label>
                                                    <Input 
                                                        defaultValue={extendedProfile?.address || 'Empty'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-background border-border/60 opacity-60 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>
                                                    </>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECURITY CONTENT */}
                        {activeTab === 'security' && (
                            <div className="p-8 md:p-12 rounded-[2.5rem] bg-card border border-border/50 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                                
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-inner">
                                        <Lock className="h-8 w-8" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-extrabold text-foreground">Security Vault</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Fortify your account credentials.</p>
                                    </div>
                                </div>
                                
                                <div className="max-w-lg space-y-6 bg-muted/30 p-8 rounded-[2rem] border border-border/60 shadow-sm">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Key className="h-3.5 w-3.5 text-primary" /> New Encryption Key
                                        </label>
                                        <Input 
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Enter strong password (min of 6 chars)"
                                            className="rounded-2xl h-14 bg-background border-border/60 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all text-base font-medium px-5" 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-extrabold text-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <CheckCircle2 className={`h-3.5 w-3.5 transition-colors ${confirmPassword && password === confirmPassword ? 'text-emerald-500' : 'text-primary'}`} /> Verify Encryption Key
                                        </label>
                                        <Input 
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password strictly"
                                            className="rounded-2xl h-14 bg-background border-border/60 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all text-base font-medium px-5" 
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <Button 
                                            onClick={handleUpdatePassword} 
                                            disabled={updatingPassword || !password || !confirmPassword || password !== confirmPassword} 
                                            className={`rounded-2xl gap-2 w-full h-14 transition-all duration-300 text-base font-bold shadow-xl ${password && password === confirmPassword ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white hover:scale-[1.02]' : 'bg-primary hover:bg-primary/90 shadow-primary/20 text-primary-foreground'}`}
                                        >
                                            {updatingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                                            {updatingPassword ? 'Enforcing...' : 'Enforce New Key'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE CONTENT */}
                        {activeTab === 'appearance' && (
                            <div className="p-8 md:p-12 rounded-[2.5rem] bg-card border border-border/50 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                                
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="p-4 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
                                        <Paintbrush className="h-8 w-8" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-extrabold text-foreground">Visual Interface</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Calibrate the dashboard aesthetics to your environment.</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {[
                                        { name: 'Light', icon: Sun, desc: 'Maximum vividness', bg: 'bg-gradient-to-br from-white to-amber-50', border: 'border-amber-200/60 dark:border-border/60', textClass: 'text-slate-900', value: 'light' },
                                        { name: 'Dark', icon: Moon, desc: 'Deep focus immersion', bg: 'bg-gradient-to-br from-slate-900 to-slate-950', border: 'border-slate-800', textClass: 'text-white', value: 'dark' },
                                        { name: 'System', icon: Monitor, desc: 'Synchronized default', bg: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900', border: 'border-slate-300 dark:border-slate-700', textClass: 'text-foreground', value: 'system' }
                                    ].map(t => {
                                        const Icon = t.icon;
                                        const isActive = theme === t.value;
                                        return (
                                            <button 
                                                key={t.name} 
                                                onClick={() => setTheme(t.value as any)}
                                                className={`p-6 rounded-[2rem] border-2 ${t.bg} ${isActive ? 'border-primary shadow-2xl ring-4 ring-primary/20 scale-[1.02]' : t.border} transition-all duration-300 hover:shadow-lg hover:scale-[1.01] text-left group relative outline-none flex flex-col items-center text-center`}
                                            >
                                                {isActive && (
                                                    <motion.div layoutId="theme-active" className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary shadow-lg flex items-center justify-center border-2 border-background">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                    </motion.div>
                                                )}
                                                <div className={`w-16 h-16 rounded-3xl mb-4 flex items-center justify-center ${isActive ? 'bg-primary/20 text-primary shadow-inner' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'} transition-all duration-300 group-hover:-translate-y-1`}>
                                                    <Icon className={`h-8 w-8 ${isActive ? 'text-primary' : t.textClass}`} strokeWidth={1.5} />
                                                </div>
                                                <p className={`text-lg font-black tracking-wide ${t.textClass}`}>{t.name}</p>
                                                <p className={`text-xs mt-1.5 font-bold uppercase tracking-widest ${t.textClass ? 'opacity-60' : 'text-muted-foreground'}`}>
                                                    {t.desc}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* System Admins Component Hidden for now because it was removed */}
                        {activeTab === 'admin' && isAdminRole && (
                            <div className="p-0 rounded-[2.5rem] bg-card border border-border/50 shadow-sm relative overflow-hidden">
                                <AdminManagementTab profile={profile} />
                            </div>
                        )}

                        {/* ISSUES CONTENT */}
                        {activeTab === 'issues' && (
                            <div className="p-0 sm:p-4 rounded-[2.5rem] bg-card border border-border/50 shadow-sm relative overflow-hidden">
                                <IssuesTab isAdminRole={isAdminRole} />
                            </div>
                        )}

                        {/* ABOUT CONTENT */}
                        {activeTab === 'about' && (
                            <div className="p-8 md:p-16 rounded-[2.5rem] bg-card border border-border/50 shadow-sm relative overflow-hidden text-center group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary-color)_0%,transparent_100%)] opacity-[0.03] -z-10 group-hover:opacity-[0.06] transition-opacity duration-1000" />
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                                
                                <motion.div 
                                    initial={{ scale: 0.8, y: 20 }} 
                                    animate={{ scale: 1, y: 0 }} 
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-32 h-32 rounded-[2.5rem] overflow-hidden mx-auto mb-8 shadow-2xl shadow-primary/20 ring-4 ring-primary/10 bg-white"
                                >
                                    <img src={logo} alt="INSIGHT Logo" className="w-full h-full object-contain p-2" />
                                </motion.div>
                                
                                <h3 className="text-4xl font-black text-foreground tracking-tight flex items-center justify-center gap-3">
                                    INSIGHT <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-bold tracking-widest uppercase align-middle">v2.0</span>
                                </h3>
                                <p className="text-sm font-extrabold text-primary tracking-[0.25em] uppercase mt-3 mb-8">Digitalizing Education</p>
                                <p className="text-sm text-foreground mb-12 font-medium">Engineered exclusively for <span className="font-extrabold text-primary">MRCE</span></p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                                    {[
                                        { label: 'Core', value: 'React 18', icon: Monitor },
                                        { label: 'Build', value: 'Vite 5', icon: Server },
                                        { label: 'Cloud', value: 'Supabase', icon: Shield },
                                        { label: 'Mobile', value: 'React Native', icon: Smartphone },
                                    ].map((item, idx) => (
                                        <motion.div 
                                            key={item.label} 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex flex-col items-center justify-center p-6 rounded-3xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-all hover:scale-[1.03] shadow-sm group/stack"
                                        >
                                            <item.icon className="w-6 h-6 mb-3 text-muted-foreground group-hover/stack:text-primary transition-colors duration-300" strokeWidth={1.5} />
                                            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1">{item.label}</span>
                                            <span className="text-sm font-bold text-foreground">{item.value}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

