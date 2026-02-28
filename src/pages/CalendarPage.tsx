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

interface CalendarEvent {
    id: string;
    date: string;
    title: string;
    type: 'holiday' | 'exam' | 'event';
    description?: string;
}

const typeConfig = {
    holiday: { icon: PartyPopper, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', label: '🎉 Holiday' },
    exam: { icon: GraduationCap, color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400', label: '📝 Exam' },
    event: { icon: CalendarDays, color: 'bg-primary', textColor: 'text-primary', label: '📅 Event' },
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

            // 1. Fetch user-created events from Supabase
            const { data, error } = await supabase
                .from('holidays')
                .select('*')
                .gte('date', start)
                .lte('date', end)
                .order('date');

            const dbEvents = !error ? ((data || []) as CalendarEvent[]) : [];

            // 2. Auto-fetch Indian public holidays from free API
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

            // 3. Merge: DB events take priority, add public holidays only if not duplicate
            const dbDates = new Set(dbEvents.map(e => e.date + e.title));
            const merged = [
                ...dbEvents,
                ...holidayEvents.filter(h => !dbDates.has(h.date + h.title)),
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
                    title: newTitle.trim(),
                    type: newType,
                    description: newDescription.trim() || null,
                });
            if (error) throw error;

            // Refresh
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
            const { data } = await supabase
                .from('holidays').select('*')
                .gte('date', start).lte('date', end).order('date');
            setEvents((data || []) as CalendarEvent[]);
            setNewTitle('');
            setNewDescription('');
            setShowAddForm(false);
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
        <div className="space-y-6">


            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {/* Calendar Grid */}
                <Card className="lg:col-span-3 border-border/40 shadow-lg bg-card/80 dark:bg-card/60 backdrop-blur-xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <CalIcon className="h-4 w-4 text-primary" />
                                {format(currentMonth, 'MMMM yyyy')}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="h-7 w-7 p-0">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="h-7 text-xs px-2">Today</Button>
                                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="h-7 w-7 p-0">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
                            ))}
                        </div>

                        {/* Day cells */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-0.5">
                                {days.map((day, i) => {
                                    if (!day) return <div key={`pad-${i}`} className="min-h-[80px] rounded-lg bg-muted/10" />;

                                    const dayEvents = getEventsForDate(day);
                                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                                    const today = isToday(day);

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(day)}
                                            className={`min-h-[80px] p-1.5 rounded-lg text-left transition-all duration-200 border
                                                ${isSelected
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                    : 'border-transparent hover:bg-accent/30 hover:border-border/30'
                                                }
                                                ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}
                                            `}
                                        >
                                            <span className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full
                                                ${today ? 'bg-primary text-white' : 'text-foreground'}
                                            `}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {dayEvents.slice(0, 2).map(e => (
                                                        <div key={e.id} className={`text-[9px] font-semibold px-1 py-0.5 rounded ${typeConfig[e.type].color} text-white truncate`}>
                                                            {e.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && (
                                                        <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 2} more</span>
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
                <div className="space-y-4">
                    {/* Selected date panel */}
                    <Card className="border-border/40 shadow-lg bg-card/80 dark:bg-card/60 backdrop-blur-xl">
                        <CardHeader className="pb-2 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                            <CardTitle className="text-sm font-bold">
                                {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a date'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3">
                            {selectedDate ? (
                                <>
                                    {selectedDateEvents.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-4 text-center">No events on this day</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedDateEvents.map(e => {
                                                const cfg = typeConfig[e.type];
                                                return (
                                                    <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg border border-border/30 bg-card/60">
                                                        <div className={`w-1 h-8 rounded-full ${cfg.color} shrink-0`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-bold ${cfg.textColor}`}>{cfg.label}</p>
                                                            <p className="text-xs font-semibold text-foreground">{e.title}</p>
                                                            {e.description && <p className="text-[10px] text-muted-foreground mt-0.5">{e.description}</p>}
                                                        </div>
                                                        {canEdit && (
                                                            <button onClick={() => handleDelete(e.id)} className="text-muted-foreground/50 hover:text-red-500 transition-colors">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {canEdit && (
                                        <Button
                                            size="sm"
                                            onClick={() => setShowAddForm(!showAddForm)}
                                            className="w-full mt-3 h-8 text-xs bg-gradient-to-r from-primary to-amber-500 text-white gap-1.5"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Event
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground py-6 text-center">Click a date on the calendar</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add event form */}
                    {showAddForm && selectedDate && canEdit && (
                        <Card className="border-primary/20 shadow-lg bg-card/80 backdrop-blur-xl animate-fade-in-scale">
                            <CardContent className="pt-4 space-y-3">
                                <Input
                                    placeholder="Event title"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    className="text-xs h-8"
                                />
                                <Select value={newType} onValueChange={v => setNewType(v as any)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="holiday">🎉 Holiday</SelectItem>
                                        <SelectItem value="exam">📝 Exam</SelectItem>
                                        <SelectItem value="event">📅 Event</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="Description (optional)"
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                    className="text-xs h-8"
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleAdd} disabled={addLoading || !newTitle.trim()} className="flex-1 h-8 text-xs gap-1">
                                        {addLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                        Save
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="h-8 text-xs">Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Legend */}
                    <div className="p-3 rounded-xl bg-card/80 dark:bg-card/60 border border-border/40 space-y-1.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Legend</p>
                        {Object.entries(typeConfig).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-sm ${cfg.color}`} />
                                <span className="text-[11px] font-medium text-foreground capitalize">{key}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
