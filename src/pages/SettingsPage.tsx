import { useState, useEffect, useRef } from 'react';
import { 
    User, Shield, Palette, Info, 
    Save, Camera, Mail, Building2,
    Sun, Moon, Loader2,
    Lock, Key, ChevronRight, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import collegeLogo from '@/assets/collage-logo.png';



export function SettingsPage() {
    const { profile } = useDashboardData();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');
    
    // Profile State
    const [fullName, setFullName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    
    // Avatar State
    const [avatarUrl, setAvatarUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Password State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);

    useEffect(() => {
        if (profile?.full_name) setFullName(profile.full_name);
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    }, [profile]);

    // Handle Profile Update
    const handleSaveProfile = async () => {
        if (!profile?.id) return;
        setSavingProfile(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName.trim() })
                .eq('id', profile.id);

            if (error) throw error;
            toast.success('Profile updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    // Handle Avatar Upload (Base64)
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast.error('Image must be less than 2MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            });

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: base64 })
                .eq('id', profile.id);

            if (error) throw error;
            setAvatarUrl(base64);
            toast.success('Profile picture updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile picture');
        } finally {
            setUploadingAvatar(false);
        }
    };

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

    const settingsTabs = [
        { value: 'profile', label: 'My Profile', icon: User, desc: 'Personal details and avatar' },
        { value: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme preferences' },
        { value: 'security', label: 'Security', icon: Shield, desc: 'Password and authentication' },
        { value: 'about', label: 'About', icon: Info, desc: 'App info and versions' },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-6 animate-fade-in relative min-h-[700px] w-full">
            {/* Sidebar Navigation */}
            <div className="md:w-64 shrink-0 space-y-1 bg-card rounded-3xl border border-border/50 p-3 h-fit shadow-sm">
                <div className="px-3 py-4 border-b border-border/50 mb-3">
                    <h3 className="text-base font-bold text-foreground">Settings</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage your account</p>
                </div>
                {settingsTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;
                    return (
                        <button 
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 text-left group relative outline-none ${
                                isActive 
                                    ? 'bg-primary/10 text-primary shadow-sm' 
                                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                            }`}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="active-tab-indicator" 
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full" 
                                />
                            )}
                            <div className={`p-2 rounded-xl transition-colors duration-300 ${isActive ? 'bg-primary/20 shadow-inner' : 'bg-transparent group-hover:bg-secondary'}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-primary' : ''}`}>{tab.label}</p>
                            </div>
                            <ChevronRight className={`h-4 w-4 transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                        </button>
                    );
                })}
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
                            <div className="p-6 md:p-8 rounded-[2rem] bg-card border border-border/50 shadow-sm relative overflow-hidden">
                                {/* Decorative background blur */}
                                <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                                
                                <h3 className="text-xl font-bold text-foreground mb-8">Profile Details</h3>
                                
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                                    {/* Avatar Column */}
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <Avatar className="h-32 w-32 ring-4 ring-primary/10 shadow-2xl transition-all duration-500 group-hover:ring-primary/40 group-hover:shadow-primary/20">
                                                <AvatarImage src={avatarUrl} className="object-cover" />
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary text-4xl font-black">
                                                    {profile?.full_name?.charAt(0) || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                                <Camera className="h-6 w-6 mb-1" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                                            </div>

                                            <button 
                                                disabled={uploadingAvatar}
                                                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100 z-10"
                                            >
                                                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleAvatarChange} 
                                                accept="image/*" 
                                                className="hidden" 
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Avatar</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">JPEG, PNG (Max 2MB)</p>
                                        </div>
                                    </div>

                                    {/* Form Column */}
                                    <div className="flex-1 w-full space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
                                                <Input 
                                                    value={fullName} 
                                                    onChange={e => setFullName(e.target.value)} 
                                                    className="rounded-2xl h-12 bg-secondary/30 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/50 shadow-sm transition-all text-base px-4" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        defaultValue={profile?.email || ''} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-secondary/30 border-border/50 opacity-60 pl-11 text-base cursor-not-allowed" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Department</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        defaultValue={profile?.dept || 'N/A'} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-secondary/30 border-border/50 opacity-60 pl-11 text-base cursor-not-allowed font-medium" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Role Designation</label>
                                                <div className="relative">
                                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                                    <Input 
                                                        defaultValue={profile?.role?.toUpperCase() || ''} 
                                                        disabled 
                                                        className="rounded-2xl h-12 bg-primary/5 border-primary/20 text-primary font-bold pl-11 text-base cursor-not-allowed" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-end pt-6">
                                            <Button 
                                                onClick={handleSaveProfile} 
                                                disabled={savingProfile || fullName.trim() === profile?.full_name} 
                                                className="rounded-2xl gap-2 h-12 px-8 shadow-auto bg-gradient-to-r from-primary to-primary/80 hover:scale-105 active:scale-95 transition-all text-base font-bold text-white relative overflow-hidden group"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                                                {savingProfile ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : <Save className="h-5 w-5 relative z-10" />}
                                                <span className="relative z-10">{savingProfile ? 'Saving...' : 'Save Changes'}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECURITY CONTENT */}
                        {activeTab === 'security' && (
                            <div className="p-6 md:p-8 rounded-[2rem] bg-card border border-border/50 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/5 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                                <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    Security & Password
                                </h3>
                                <p className="text-sm text-muted-foreground mb-8">Ensure your account is using a long, random password to stay secure.</p>
                                
                                <div className="max-w-md space-y-5 bg-secondary/20 p-6 rounded-3xl border border-border/40">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">New Password</label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                type="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="Min. 6 characters"
                                                className="rounded-2xl h-12 bg-card border-border/50 pl-11 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all text-base" 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${confirmPassword && password === confirmPassword ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                            <Input 
                                                type="password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter new password"
                                                className="rounded-2xl h-12 bg-card border-border/50 pl-11 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all text-base" 
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Button 
                                            onClick={handleUpdatePassword} 
                                            disabled={updatingPassword || !password || !confirmPassword || password !== confirmPassword} 
                                            className="rounded-2xl gap-2 w-full h-12 shadow-md hover:shadow-lg transition-all text-base font-bold"
                                        >
                                            {updatingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                                            {updatingPassword ? 'Updating...' : 'Update Password'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE CONTENT */}
                        {activeTab === 'appearance' && (
                            <div className="p-6 md:p-8 rounded-[2rem] bg-card border border-border/50 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                                <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                        <Palette className="h-5 w-5" />
                                    </div>
                                    Appearance
                                </h3>
                                <p className="text-sm text-muted-foreground mb-8">Customize the look and feel of your Insight Dashboard.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
                                    {[
                                        { name: 'Light', icon: Sun, bg: 'bg-gradient-to-br from-white to-amber-50/50', border: 'border-amber-200/60 dark:border-border/50', value: 'light' },
                                        { name: 'Dark', icon: Moon, bg: 'bg-gradient-to-br from-gray-900 to-gray-800', border: 'border-gray-700', textClass: 'text-white', value: 'dark' },
                                    ].map(t => {
                                        const Icon = t.icon;
                                        const isActive = theme === t.value || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches === (t.value === 'dark'));
                                        return (
                                            <button 
                                                key={t.name} 
                                                onClick={() => setTheme(t.value as any)}
                                                className={`p-6 rounded-[2rem] border-2 ${t.bg} ${isActive ? 'border-primary shadow-xl ring-4 ring-primary/20 scale-[1.03]' : t.border} transition-all duration-300 hover:shadow-lg hover:scale-[1.01] text-left group relative outline-none`}
                                            >
                                                {isActive && (
                                                    <motion.div layoutId="theme-active" className="absolute top-5 right-5 w-5 h-5 rounded-full bg-primary shadow-lg flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                    </motion.div>
                                                )}
                                                <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center ${isActive ? 'bg-primary/20 text-primary shadow-inner' : 'bg-black/5 dark:bg-white/5'} transition-colors duration-300 group-hover:rotate-12`}>
                                                    <Icon className={`h-7 w-7 ${isActive ? 'text-primary' : (t.textClass || 'text-foreground')}`} />
                                                </div>
                                                <p className={`text-xl font-black ${t.textClass || 'text-foreground'}`}>{t.name} Mode</p>
                                                <p className={`text-sm mt-2 font-medium leading-relaxed ${t.textClass ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                                    {t.name === 'Light' ? 'Clean, bright, and highly legible for well-lit environments.' : 'Sleek, modern, and easy on the eyes for extended focus.'}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}


                        {/* ABOUT CONTENT */}
                        {activeTab === 'about' && (
                            <div className="p-6 md:p-12 rounded-[2rem] bg-card border border-border/50 shadow-sm relative overflow-hidden text-center group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-amber-500/5 -z-10 transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
                                
                                <motion.div 
                                    initial={{ scale: 0.8, rotate: -5 }} 
                                    animate={{ scale: 1, rotate: 0 }} 
                                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                    className="w-28 h-28 rounded-[2rem] overflow-hidden mx-auto mb-8 shadow-2xl shadow-primary/30 ring-4 ring-primary/10"
                                >
                                    <img src={collegeLogo} alt="INSIGHT Logo" className="w-full h-full object-cover" />
                                </motion.div>
                                
                                <h3 className="text-3xl font-black text-foreground tracking-tight">INSIGHT</h3>
                                <p className="text-sm font-bold text-primary tracking-[0.2em] uppercase mt-2 mb-6">Empowering Education</p>
                                <p className="text-xs text-muted-foreground mb-10">Built for <span className="font-bold text-foreground">MRCE</span> — Malla Reddy College of Engineering</p>
                                
                                <div className="max-w-md mx-auto space-y-3">
                                    {[
                                        { label: 'Version', value: 'v1.0.0' },
                                        { label: 'Framework', value: 'React + Vite + Tailwind' },
                                        { label: 'Database', value: 'Supabase PostgreSQL' },
                                        { label: 'Mobile App', value: 'Attend-Me (React Native)' },
                                    ].map(item => (
                                        <div key={item.label} className="flex justify-between items-center p-4 rounded-2xl bg-secondary/40 border border-border/40 hover:bg-secondary/70 transition-all hover:scale-[1.01] shadow-sm">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                                            <span className="text-sm font-black text-foreground">{item.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-10 text-sm text-muted-foreground">Made with <span className="text-red-500">❤️</span> by <span className="font-bold text-foreground">PJ</span></p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
