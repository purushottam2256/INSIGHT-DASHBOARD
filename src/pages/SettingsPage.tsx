import { useState, useEffect, useCallback } from 'react';
import { 
    User, Bell, Shield, Calendar, Palette, Info, 
    Save, Camera, Mail, Building2,
    Sun, Moon, BellRing, Plus, Trash2, Loader2,
    CalendarDays, PartyPopper, GraduationCap, Send
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { sendNotificationToAll, sendNotificationToDept } from '@/lib/fcm';
import { format } from 'date-fns';

interface CalendarEvent {
    id: string;
    date: string;
    type: 'holiday' | 'exam' | 'event';
    title: string;
    description: string | null;
    created_at: string;
}

export function SettingsPage() {
    const { profile } = useDashboardData();
    const { role, dept } = useUserRole();
    const [activeTab, setActiveTab] = useState('profile');

    const settingsTabs = [
        { value: 'profile', label: 'Profile', icon: User },
        { value: 'notifications', label: 'Notifications', icon: Bell },
        { value: 'holidays', label: 'Holidays & Events', icon: CalendarDays },
        { value: 'appearance', label: 'Appearance', icon: Palette },
        { value: 'about', label: 'About', icon: Info },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full flex flex-wrap justify-start bg-card border border-border/50 rounded-2xl p-1.5 h-auto gap-1">
                    {settingsTabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <TabsTrigger 
                                key={tab.value} 
                                value={tab.value} 
                                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {/* === Profile Tab === */}
                <TabsContent value="profile" className="mt-6 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
                        <div className="relative group">
                            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary text-2xl font-bold">
                                    {profile?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="text-center sm:text-left flex-1">
                            <h3 className="text-xl font-bold text-foreground">{profile?.full_name || 'User'}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center sm:justify-start mt-1">
                                <Mail className="h-3.5 w-3.5" />
                                {profile?.email || 'Loading...'}
                            </p>
                            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                    {profile?.role || 'User'}
                                </span>
                                {profile?.dept && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent text-accent-foreground border border-border/30">
                                        <Building2 className="h-2.5 w-2.5 inline mr-1" />
                                        {profile.dept}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-6 space-y-5">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                                <Input defaultValue={profile?.full_name || ''} className="rounded-xl bg-secondary/30 border-border/40 focus:border-primary/40" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Email</label>
                                <Input defaultValue={profile?.email || ''} disabled className="rounded-xl bg-secondary/30 border-border/40 opacity-60" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Department</label>
                                <Input defaultValue={profile?.dept || ''} disabled className="rounded-xl bg-secondary/30 border-border/40 opacity-60" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Role</label>
                                <Input defaultValue={profile?.role || ''} disabled className="rounded-xl bg-secondary/30 border-border/40 opacity-60" />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button className="rounded-xl gap-2">
                                <Save className="h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* === Notifications Tab === */}
                <TabsContent value="notifications" className="mt-6 space-y-4">
                    <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5">Notification Preferences</h3>
                        {[
                            { icon: BellRing, title: 'Leave Request Updates', desc: 'Get notified when leave requests are approved or declined', default: true },
                            { icon: Bell, title: 'Attendance Alerts', desc: 'Daily attendance summary and low attendance warnings', default: true },
                            { icon: Calendar, title: 'Event Reminders', desc: 'Upcoming academic events and holidays', default: false },
                            { icon: Shield, title: 'Security Alerts', desc: 'Login notifications and password changes', default: true },
                        ].map((item, i) => (
                            <NotificationToggle key={i} {...item} />
                        ))}
                    </div>
                </TabsContent>

                {/* === Holidays & Events Tab === */}
                <TabsContent value="holidays" className="mt-6 space-y-4">
                    <HolidaysEventsSection role={role} dept={dept} />
                </TabsContent>

                {/* === Appearance Tab === */}
                <TabsContent value="appearance" className="mt-6 space-y-4">
                    <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5">Display Settings</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { name: 'Light', icon: Sun, bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-200' },
                                { name: 'Dark', icon: Moon, bg: 'bg-gradient-to-br from-gray-900 to-gray-800', border: 'border-gray-700', textClass: 'text-white' },
                            ].map(theme => {
                                const Icon = theme.icon;
                                return (
                                    <button key={theme.name} className={`p-5 rounded-xl border-2 ${theme.bg} ${theme.border} transition-all duration-200 hover:shadow-md text-left group`}>
                                        <Icon className={`h-8 w-8 mb-3 ${theme.textClass || 'text-foreground'}`} />
                                        <p className={`font-semibold ${theme.textClass || 'text-foreground'}`}>{theme.name}</p>
                                        <p className={`text-xs mt-1 ${theme.textClass ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                            {theme.name === 'Light' ? 'Warm and bright' : 'Easy on the eyes'}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>

                {/* === About Tab === */}
                <TabsContent value="about" className="mt-6 space-y-4">
                    <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-foreground">INSIGHT Dashboard</h3>
                        <p className="text-sm text-muted-foreground mt-1">Empowering Education</p>
                        <div className="mt-6 space-y-3 text-left max-w-sm mx-auto">
                            {[
                                { label: 'Version', value: 'v2.0.0 (Phase 5)' },
                                { label: 'Framework', value: 'React + Vite' },
                                { label: 'Database', value: 'Supabase PostgreSQL' },
                                { label: 'License', value: 'MIT' },
                            ].map(item => (
                                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/30">
                                    <span className="text-xs text-muted-foreground">{item.label}</span>
                                    <span className="text-xs font-medium text-foreground">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// === Holidays & Events CRUD Section ===
function HolidaysEventsSection({ role, dept }: { role: string | null; dept: string | null }) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [notifyOnSave, setNotifyOnSave] = useState(true);
    
    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formType, setFormType] = useState<'holiday' | 'exam' | 'event'>('holiday');
    const [formDesc, setFormDesc] = useState('');

    const canSendAll = ['management', 'principal', 'developer', 'admin'].includes(role || '');

    const typeConfig = {
        holiday: { icon: PartyPopper, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Holiday' },
        exam: { icon: GraduationCap, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Exam' },
        event: { icon: CalendarDays, color: 'bg-primary/10 text-primary border-primary/20', label: 'Event' },
    };

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(50);

        if (!error) setEvents(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleAdd = async () => {
        if (!formTitle.trim() || !formDate) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('holidays')
                .insert([{
                    title: formTitle.trim(),
                    date: formDate,
                    type: formType,
                    description: formDesc.trim() || null,
                }]);

            if (error) throw error;

            // Send FCM notification
            if (notifyOnSave) {
                const msgBody = `📅 ${formType === 'holiday' ? 'Holiday' : formType === 'exam' ? 'Exam' : 'Event'}: ${formTitle.trim()} on ${format(new Date(formDate), 'MMM d, yyyy')}`;
                try {
                    if (canSendAll) {
                        await sendNotificationToAll({
                            title: `New ${formType.charAt(0).toUpperCase() + formType.slice(1)} Added`,
                            body: msgBody,
                            type: 'management_update',
                            priority: 'normal',
                        });
                    } else if (dept) {
                        await sendNotificationToDept(dept, {
                            title: `New ${formType.charAt(0).toUpperCase() + formType.slice(1)} Added`,
                            body: msgBody,
                            type: 'management_update',
                            priority: 'normal',
                        });
                    }
                } catch (fcmErr) {
                    console.warn('FCM send failed:', fcmErr);
                }
            }

            // Reset form
            setFormTitle('');
            setFormDate('');
            setFormDesc('');
            setShowForm(false);
            fetchEvents();
        } catch (err: any) {
            alert('Failed to add event: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this event?')) return;
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (!error) setEvents(prev => prev.filter(e => e.id !== id));
    };

    return (
        <>
            {/* Add Event Card */}
            <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Holidays & Events
                    </h3>
                    <Button
                        variant={showForm ? 'secondary' : 'default'}
                        size="sm"
                        className="rounded-xl gap-1.5 text-xs"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? 'Cancel' : <><Plus className="h-3.5 w-3.5" /> Add Event</>}
                    </Button>
                </div>

                {/* Add Form */}
                {showForm && (
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/30 mb-4 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Title</label>
                                <Input
                                    placeholder="e.g. Republic Day"
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    className="rounded-xl bg-card border-border/40 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Date</label>
                                <Input
                                    type="date"
                                    value={formDate}
                                    onChange={e => setFormDate(e.target.value)}
                                    className="rounded-xl bg-card border-border/40 text-sm"
                                />
                            </div>
                        </div>

                        {/* Type Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Type</label>
                            <div className="flex gap-2">
                                {(['holiday', 'exam', 'event'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFormType(t)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                                            formType === t
                                                ? typeConfig[t].color + ' shadow-sm'
                                                : 'border-border/40 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                            <Input
                                placeholder="Brief description..."
                                value={formDesc}
                                onChange={e => setFormDesc(e.target.value)}
                                className="rounded-xl bg-card border-border/40 text-sm"
                            />
                        </div>

                        {/* Notify Toggle */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                <button
                                    onClick={() => setNotifyOnSave(!notifyOnSave)}
                                    className={`w-8 h-4.5 rounded-full relative transition-all ${
                                        notifyOnSave ? 'bg-gradient-to-r from-primary to-amber-500' : 'bg-muted'
                                    }`}
                                >
                                    <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${
                                        notifyOnSave ? 'left-[16px]' : 'left-0.5'
                                    }`} />
                                </button>
                                <Send className="h-3 w-3" />
                                Notify all faculty via FCM
                            </label>

                            <Button
                                onClick={handleAdd}
                                disabled={saving || !formTitle.trim() || !formDate}
                                size="sm"
                                className="rounded-xl gap-1.5"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                {saving ? 'Saving...' : 'Add'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Events List */}
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No upcoming events</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add holidays, exams, or events above</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {events.map(event => {
                            const config = typeConfig[event.type as keyof typeof typeConfig] || typeConfig.event;
                            return (
                                <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-colors group">
                                    <div className="w-12 text-center shrink-0">
                                        <p className="text-xs font-bold text-foreground">
                                            {format(new Date(event.date), 'd')}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase">
                                            {format(new Date(event.date), 'MMM')}
                                        </p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                                        {event.description && (
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{event.description}</p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${config.color} shrink-0`}>
                                        {event.type}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

// Notification Toggle Component
function NotificationToggle({ icon: Icon, title, desc, default: defaultOn }: {
    icon: any;
    title: string;
    desc: string;
    default: boolean;
}) {
    const [enabled, setEnabled] = useState(defaultOn);
    
    return (
        <div className="flex items-center justify-between py-4 border-b border-border/30 last:border-b-0">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
            </div>
            <button
                onClick={() => setEnabled(!enabled)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                    enabled 
                        ? 'bg-gradient-to-r from-primary to-amber-500 shadow-sm shadow-primary/20' 
                        : 'bg-muted'
                }`}
            >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                    enabled ? 'left-[22px]' : 'left-0.5'
                }`} />
            </button>
        </div>
    );
}
