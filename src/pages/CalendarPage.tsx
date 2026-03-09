import { useState, useMemo, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, X, Calendar as CalIcon,
    PartyPopper, GraduationCap, CalendarDays, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SectionLoader } from '@/components/ui/LoadingState';

interface CalendarEvent {
    id: string;
    date: string;
    title: string;
    type: 'holiday' | 'exam' | 'event';
    description?: string;
}

const typeConfig = {
    holiday: { icon: PartyPopper, color: 'bg-red-500', bgGlow: 'bg-red-500/10', textColor: 'text-red-500', label: '🎉 Holiday' },
    exam: { icon: GraduationCap, color: 'bg-amber-500', bgGlow: 'bg-amber-500/10', textColor: 'text-amber-500', label: '📝 Exam' },
    event: { icon: CalendarDays, color: 'bg-primary', bgGlow: 'bg-primary/10', textColor: 'text-primary', label: '📅 Event' },
};

export function CalendarPage() {
    const { role } = useUserRole();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [addLoading, setAddLoading] = useState(false);

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState<'holiday' | 'exam' | 'event'>('event');
    const [newDescription, setNewDescription] = useState('');

    const canEdit = ['hod', 'principal', 'management', 'admin', 'developer'].includes(role || '');

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            // 1. Fetch user-created events from Supabase (holidays table)
            const { data, error } = await supabase
                .from('holidays')
                .select('*')
                .gte('date', start)
                .lte('date', end)
                .order('date');

            const dbEvents = !error ? ((data || []).map((e: any) => ({
                id: e.id,
                date: e.date,
                title: e.name,
                type: 'holiday' as const,
                description: e.description,
            })) as CalendarEvent[]) : [];

            // 2. Auto-fetch Indian public holidays from free API (date.nager.at — no key needed)
            let holidayEvents: CalendarEvent[] = [];
            try {
                const year = currentMonth.getFullYear();
                const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
                if (res.ok) {
                    const holidays = await res.json();
                    holidayEvents = holidays
                        .filter((h: any) => h.date >= start && h.date <= end)
                        .map((h: any) => ({
                            id: `pub-${h.date}`,
                            date: h.date,
                            title: `🇮🇳 ${h.localName || h.name}`,
                            type: 'holiday' as const,
                            description: h.name !== h.localName ? h.name : undefined,
                        }));
                }
            } catch {
                // Silently fail — holidays are optional
            }

            // 3. Merge: DB events take priority, then API holidays
            const seen = new Set(dbEvents.map(e => e.date + e.title));
            const merged = [
                ...dbEvents,
                ...holidayEvents.filter(h => !seen.has(h.date + h.title)),
            ];

            setEvents(merged);
            setLoading(false);
        };
        fetchEvents();
    }, [currentMonth]);

    const days = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Pad the beginning to start on Monday
        const startDay = monthStart.getDay();
        const paddingBefore = startDay === 0 ? 6 : startDay - 1;
        const paddedDays: (Date | null)[] = Array(paddingBefore).fill(null);
        paddedDays.push(...allDays);

        // Pad end to fill last row
        while (paddedDays.length % 7 !== 0) {
            paddedDays.push(null);
        }

        return paddedDays;
    }, [currentMonth]);

    const getEventsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return events.filter(e => e.date === dateStr);
    };

    const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    const handleAdd = async () => {
        if (!newTitle.trim() || !selectedDate) return;
        setAddLoading(true);
        try {
            const { error } = await supabase
                .from('holidays')
                .insert({
                    date: format(selectedDate, 'yyyy-MM-dd'),
                    name: newTitle.trim(),
                    description: newDescription.trim() || null,
                });
            if (error) throw error;

            // Re-trigger the full fetch (DB + API) by toggling the month state
            setCurrentMonth(new Date(currentMonth));
            setNewTitle('');
            setNewDescription('');
            setShowAddForm(false);
            toast.success('Event added');

            // Optional: Notify all active faculty about this new event
            try {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, push_token')
                    .not('push_token', 'is', null)
                    .in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']);
                
                if (profiles && profiles.length > 0) {
                    const titleTypeStr = newType === 'exam' ? 'New Exam Scheduled' : newType === 'holiday' ? 'New Holiday Declared' : 'New Calendar Event';
                    const eventBody = `${newTitle.trim()} on ${format(selectedDate, 'MMMM d')}. ${newDescription.trim() ? newDescription.trim() : ''}`;

                    // 1. Batch insert into the notifications table
                    const notificationsData = profiles.map(p => ({
                        user_id: p.id,
                        type: newType, // 'holiday', 'exam', or 'event'
                        priority: 'normal',
                        title: titleTypeStr,
                        body: eventBody,
                        data: { categoryId: 'CALENDAR', type: newType }
                    }));

                    const { error: insertError } = await supabase.from('notifications').insert(notificationsData);
                    if (insertError) {
                        console.error("Calendar DB Insert Error (Notifications):", insertError);
                        // Fallback to 'system' if the enum fails
                        if (insertError.message.includes('invalid input value for enum')) {
                            const fallbackData = notificationsData.map(n => ({...n, type: 'system'}));
                            try {
                                await supabase.from('notifications').insert(fallbackData);
                            } catch (e: any) {
                                console.error("Fallback insert failed:", e);
                            }
                        }
                    }

                    // 2. Trigger FCM edge functions individually
                    let sent = 0;
                    for (const profile of profiles) {
                        if (!profile.push_token) continue;
                        supabase.functions.invoke('send-push', {
                            body: {
                                token: profile.push_token,
                                title: titleTypeStr,
                                body: eventBody,
                                data: { categoryId: 'CALENDAR', type: newType }
                            }
                        }).catch(e => console.error("Calendar push failed", e));
                        sent++;
                    }
                    console.log(`Pushed calendar event to ${sent} devices`);
                }
            } catch (pushErr) {
                console.warn("Failed to dispatch calendar notifications", pushErr);
            }

        } catch (err: any) {
            toast.error('Error: ' + err.message);
        } finally {
            setAddLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (!error) setEvents(prev => prev.filter(e => e.id !== id));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-foreground to-muted-foreground transition-all duration-300 bg-clip-text text-transparent">Calendar</h1>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-1">Manage Academic Schedule</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Calendar Grid */}
                <Card className="lg:col-span-3 border border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="pb-4 pt-6 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-[10px] bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20">
                                    <CalIcon className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-xl font-black tracking-tight text-foreground">
                                    {format(currentMonth, 'MMMM yyyy')}
                                </CardTitle>
                            </div>
                            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/50 backdrop-blur-sm border border-border/40">
                                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-card">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="h-8 text-xs font-bold px-3 hover:bg-white dark:hover:bg-card">Today</Button>
                                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-card">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                <div key={d} className={`text-center text-[11px] font-black uppercase tracking-widest py-2 ${d === 'Sun' ? 'text-orange-500' : 'text-muted-foreground'}`}>{d}</div>
                            ))}
                        </div>

                        {/* Day cells */}
                        {loading ? (
                            <SectionLoader text="Loading Events..." />
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day, i) => {
                                    if (!day) return <div key={`pad-${i}`} className="min-h-[100px] rounded-2xl bg-muted/5 dark:bg-muted/10 border border-transparent" />;

                                    const dayEvents = getEventsForDate(day);
                                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                                    const today = isToday(day);
                                    const isSunday = day.getDay() === 0;
                                    const hasHoliday = dayEvents.some(e => e.type === 'holiday');
                                    const hasExam = dayEvents.some(e => e.type === 'exam');
                                    const hasEvent = dayEvents.some(e => e.type === 'event');

                                    // Full-day background based on event type priority
                                    const dayBg = hasHoliday
                                        ? 'bg-red-500/5 dark:bg-red-500/10 hover:border-red-500/30'
                                        : hasExam
                                        ? 'bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500/30'
                                        : hasEvent
                                        ? 'bg-primary/5 hover:border-primary/30'
                                        : isSunday
                                        ? 'bg-orange-500/[0.03] dark:bg-orange-500/[0.05] hover:border-orange-500/30'
                                        : 'bg-background/40 hover:bg-card';

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(day)}
                                            className={cn(
                                                "min-h-[100px] p-2 rounded-2xl text-left transition-all duration-300 border relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md",
                                                isSelected
                                                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md"
                                                    : `border-border/40 ${dayBg}`,
                                                !isSameMonth(day, currentMonth) && "opacity-30 hover:opacity-100"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-xs font-black inline-flex items-center justify-center w-7 h-7 rounded-full mb-1 transition-colors",
                                                today ? 'bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20' : 
                                                isSunday ? 'text-orange-500' : 
                                                hasHoliday ? 'text-red-500' : 
                                                'text-foreground group-hover:text-primary'
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <div className="space-y-1 w-full mt-1 relative z-10">
                                                    {dayEvents.slice(0, 3).map(e => (
                                                        <div key={e.id} className={cn("text-[9px] font-bold px-1.5 py-1 rounded-lg text-white truncate shadow-sm", typeConfig[e.type].color)}>
                                                            {e.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className="text-[9px] text-muted-foreground font-bold px-1">+{dayEvents.length - 3} more</span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar: Selected date details + Add event */}
                <div className="space-y-6">
                    {/* Selected date panel */}
                    <Card className="border border-border/50 bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[1.5rem] overflow-hidden">
                        <CardHeader className="pb-3 pt-5 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                            <CardTitle className="text-[15px] font-black tracking-tight text-foreground">
                                {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Date Details'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 lg:p-5">
                            {selectedDate ? (
                                <>
                                    {selectedDateEvents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-6 bg-muted/10 rounded-2xl border border-dashed border-border/40 text-center">
                                            <CalIcon className="h-8 w-8 mb-3 opacity-20" />
                                            <p className="text-xs font-semibold tracking-tight text-muted-foreground">No events on this day</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedDateEvents.map(e => {
                                                const cfg = typeConfig[e.type];
                                                return (
                                                    <div key={e.id} className={cn("flex items-start gap-3 p-3 rounded-2xl border bg-card/60 hover:bg-card transition-colors relative overflow-hidden group", cfg.bgGlow, "border-border/40")}>
                                                        <div className={cn("w-1.5 h-12 rounded-full shrink-0", cfg.color)} />
                                                        <div className="flex-1 min-w-0 py-0.5">
                                                            <p className={cn("text-[10px] font-bold uppercase tracking-widest", cfg.textColor)}>{cfg.label}</p>
                                                            <p className="text-sm font-black text-foreground mt-0.5 tracking-tight group-hover:text-primary transition-colors">{e.title}</p>
                                                            {e.description && <p className="text-[11px] font-medium text-muted-foreground/80 mt-1">{e.description}</p>}
                                                        </div>
                                                        {canEdit && (
                                                            <button onClick={() => handleDelete(e.id)} className="text-muted-foreground/40 hover:text-red-500 transition-colors p-1 hover:bg-red-500/10 rounded-lg absolute top-2 right-2">
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {canEdit && (
                                        <Button
                                            onClick={() => setShowAddForm(!showAddForm)}
                                            className="w-full mt-4 h-10 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2 rounded-xl transition-all shadow-md group border border-transparent"
                                        >
                                            <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                            Add Event
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/5 rounded-2xl border border-dashed border-border/30">
                                    <p className="text-xs font-semibold text-muted-foreground/70">Click a date on the calendar<br/>to view details</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add event form */}
                    {showAddForm && selectedDate && canEdit && (
                        <Card className="border border-primary/30 ring-4 ring-primary/5 bg-card/95 backdrop-blur-2xl shadow-xl rounded-[1.5rem] animate-in fade-in zoom-in-95 duration-200">
                            <CardContent className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
                                    <Input
                                        placeholder="E.g., Midterm Exams..."
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        className="text-xs font-semibold h-10 rounded-xl bg-background/50 focus-visible:ring-1 focus-visible:ring-primary/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</label>
                                    <Select value={newType} onValueChange={v => setNewType(v as any)}>
                                        <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-background/50 focus:ring-1 focus:ring-primary/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/40 backdrop-blur-2xl shadow-xl">
                                            <SelectItem value="holiday" className="font-semibold text-xs">🎉 Holiday</SelectItem>
                                            <SelectItem value="exam" className="font-semibold text-xs">📝 Exam</SelectItem>
                                            <SelectItem value="event" className="font-semibold text-xs">📅 Event</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notes</label>
                                    <Input
                                        placeholder="Optional details..."
                                        value={newDescription}
                                        onChange={e => setNewDescription(e.target.value)}
                                        className="text-xs font-semibold h-10 rounded-xl bg-background/50 focus-visible:ring-1 focus-visible:ring-primary/50"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button onClick={handleAdd} disabled={addLoading || !newTitle.trim()} className="flex-1 h-10 text-xs font-bold gap-2 rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all">
                                        {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        Save Event
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowAddForm(false)} className="h-10 text-xs font-bold rounded-xl bg-background/50 hover:bg-background border-border/50">Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Legend */}
                    <div className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm space-y-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Legend</p>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(typeConfig).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <div className={cn("w-3.5 h-3.5 rounded-md shadow-sm shrink-0", cfg.color)} />
                                    <span className="text-xs font-bold text-foreground capitalize tracking-tight">{key}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
