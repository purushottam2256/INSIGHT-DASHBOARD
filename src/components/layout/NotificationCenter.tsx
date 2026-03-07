import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Bell, BellRing, Send, Check, CheckCheck, X, Loader2,
    Users, Building2, User, Trash2, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

type Tab = 'inbox' | 'send';
type RecipientMode = 'all' | 'dept' | 'select';

interface FacultyItem { id: string; full_name: string; email: string; dept: string; role: string; }

export function NotificationCenter() {
    const {
        notifications, loading, unreadCount,
        fetchNotifications, markAsRead, markAllAsRead,
        deleteNotification, deleteMultiple,
        send, getFacultyList, canSendToAll, userDept,
    } = useNotifications();

    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('inbox');
    const [sendTitle, setSendTitle] = useState('');
    const [sendBody, setSendBody] = useState('');
    const [recipientMode, setRecipientMode] = useState<RecipientMode>('dept');
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [faculty, setFaculty] = useState<FacultyItem[]>([]);
    const [sending, setSending] = useState(false);
    const [page, setPage] = useState(1);
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => { if (open) fetchNotifications(); }, [open]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setMultiSelect(false);
                setSelectedIds(new Set());
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSend = async () => {
        if (!sendTitle.trim() || !sendBody.trim()) return;
        setSending(true);
        try {
            const target = recipientMode === 'all' ? 'all' : recipientMode === 'dept' ? 'dept' : selectedRecipients;
            await send(target, sendTitle, sendBody);
            setSendTitle(''); setSendBody(''); setSelectedRecipients([]);
        } catch (e) { console.error(e); }
        setSending(false);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        await deleteMultiple(Array.from(selectedIds));
        setSelectedIds(new Set());
        setMultiSelect(false);
    };

    // Group notifications by date
    const groupedNotifications = useMemo(() => {
        const groups: { label: string; date: string; items: Notification[] }[] = [];
        const sorted = [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const paginated = sorted.slice(0, page * ITEMS_PER_PAGE);

        paginated.forEach(n => {
            const d = new Date(n.created_at);
            const dateKey = format(d, 'yyyy-MM-dd');
            let label = format(d, 'MMM dd, yyyy');
            if (isToday(d)) label = 'Today';
            else if (isYesterday(d)) label = 'Yesterday';

            const existing = groups.find(g => g.date === dateKey);
            if (existing) existing.items.push(n);
            else groups.push({ label, date: dateKey, items: [n] });
        });
        return groups;
    }, [notifications, page]);

    const hasMore = notifications.length > page * ITEMS_PER_PAGE;

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'urgent': return 'bg-red-500';
            case 'high': return 'bg-orange-500';
            case 'normal': return 'bg-blue-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <button onClick={() => setOpen(!open)} className="relative p-2 rounded-xl hover:bg-white/20 transition-colors">
                {unreadCount > 0 ? <BellRing className="h-5 w-5 text-white animate-bounce" /> : <Bell className="h-5 w-5 text-white/80" />}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[400px] max-h-[520px] rounded-2xl bg-card shadow-2xl border border-border/60 z-50 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setTab('inbox')} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${tab === 'inbox' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>
                                Inbox {unreadCount > 0 && <span className="ml-1 text-[10px]">({unreadCount})</span>}
                            </button>
                            <button onClick={() => setTab('send')} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${tab === 'send' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}>
                                <Send className="inline h-3 w-3 mr-1" />Send
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            {tab === 'inbox' && (
                                <>
                                    <button onClick={() => { setMultiSelect(!multiSelect); setSelectedIds(new Set()) }} className={`p-1.5 rounded-lg transition-colors ${multiSelect ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`} title="Multi-select">
                                        <CheckSquare className="h-4 w-4" />
                                    </button>
                                    {multiSelect && selectedIds.size > 0 && (
                                        <button onClick={handleDeleteSelected} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors" title="Delete selected">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button onClick={markAllAsRead} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Mark all read">
                                        <CheckCheck className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                            <button onClick={() => { setOpen(false); setMultiSelect(false); setSelectedIds(new Set()) }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Multi-select bar */}
                    {multiSelect && selectedIds.size > 0 && (
                        <div className="px-4 py-2 bg-primary/5 border-b border-border/30 flex items-center justify-between">
                            <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
                            <button onClick={handleDeleteSelected} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
                                <Trash2 className="h-3 w-3" /> Delete
                            </button>
                        </div>
                    )}

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        {tab === 'inbox' ? (
                            loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                            ) : groupedNotifications.length > 0 ? (
                                <div>
                                    {groupedNotifications.map(group => (
                                        <div key={group.date}>
                                            {/* Date Header */}
                                            <div className="sticky top-0 px-4 py-1.5 bg-muted/50 backdrop-blur-sm border-b border-border/20 z-10">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                                            </div>
                                            {/* Items */}
                                            {group.items.map(n => (
                                                <div key={n.id} className={`px-4 py-3 border-b border-border/20 hover:bg-muted/20 transition-colors flex items-start gap-2 ${!n.is_read ? 'bg-primary/[0.02]' : ''}`}>
                                                    {multiSelect && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(n.id)}
                                                            onChange={() => toggleSelect(n.id)}
                                                            className="mt-1 rounded border-border"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0" onClick={() => !multiSelect && markAsRead(n.id)}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(n.priority)} ${!n.is_read ? 'animate-pulse' : 'opacity-40'}`} />
                                                            <span className={`text-xs font-semibold truncate ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</span>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 ml-3.5">{n.body}</p>
                                                        <div className="flex items-center gap-2 mt-1 ml-3.5">
                                                            <span className="text-[9px] text-muted-foreground/60">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                                                            {n.is_read && <Check className="h-2.5 w-2.5 text-muted-foreground/40" />}
                                                        </div>
                                                    </div>
                                                    {!multiSelect && (
                                                        <button onClick={() => deleteNotification(n.id)} className="mt-1 p-1 text-muted-foreground/40 hover:text-red-500 transition-colors rounded">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <button onClick={() => setPage(p => p + 1)} className="w-full py-3 text-xs text-primary font-medium hover:bg-muted/30 transition-colors">
                                            Load earlier notifications
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-12 text-muted-foreground">
                                    <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                    <p className="text-sm">No notifications</p>
                                </div>
                            )
                        ) : (
                            /* Send Tab */
                            <div className="p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    {canSendToAll && (
                                        <button onClick={() => setRecipientMode('all')} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${recipientMode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'}`}>
                                            <Users className="h-3 w-3" /> All
                                        </button>
                                    )}
                                    <button onClick={() => setRecipientMode('dept')} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${recipientMode === 'dept' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'}`}>
                                        <Building2 className="h-3 w-3" /> {userDept || 'Department'}
                                    </button>
                                    <button onClick={async () => { setRecipientMode('select'); if (faculty.length === 0) setFaculty(await getFacultyList()) }} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${recipientMode === 'select' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'}`}>
                                        <User className="h-3 w-3" /> Select
                                    </button>
                                </div>

                                {recipientMode === 'select' && (
                                    <div className="max-h-28 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/20">
                                        {faculty.map(f => (
                                            <label key={f.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/20 cursor-pointer">
                                                <input type="checkbox" checked={selectedRecipients.includes(f.id)} onChange={() => setSelectedRecipients(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])} className="rounded" />
                                                <span className="font-medium truncate">{f.full_name}</span>
                                                <span className="text-muted-foreground/60 ml-auto text-[10px]">{f.dept}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                <Input placeholder="Title" value={sendTitle} onChange={e => setSendTitle(e.target.value)} className="h-8 text-sm" />
                                <textarea placeholder="Message body..." value={sendBody} onChange={e => setSendBody(e.target.value)} className="w-full h-20 rounded-lg border border-border px-3 py-2 text-sm resize-none" />
                                <Button onClick={handleSend} disabled={sending || !sendTitle.trim() || !sendBody.trim()} className="w-full h-8 text-xs font-medium">
                                    {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                                    Send Notification
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
