import { useState, useEffect, useRef } from 'react';
import {
    Bell, BellRing, Send, Check, CheckCheck, X, Loader2,
    Users, Building2, User, AlertCircle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'inbox' | 'send';
type RecipientMode = 'all' | 'dept' | 'individual';

interface FacultyItem {
    id: string;
    full_name: string;
    email: string;
    dept: string;
    role: string;
}

export function NotificationCenter() {
    const {
        notifications, loading, unreadCount,
        markAsRead, markAllAsRead, send,
        getFacultyList, canSendToAll, userDept,
    } = useNotifications();

    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('inbox');
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    // Send form state
    const [recipientMode, setRecipientMode] = useState<RecipientMode>('dept');
    const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
    const [facultyList, setFacultyList] = useState<FacultyItem[]>([]);
    const [facultySearch, setFacultySearch] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Load faculty list when switching to send tab
    useEffect(() => {
        if (tab === 'send' && facultyList.length === 0) {
            getFacultyList().then(setFacultyList);
        }
    }, [tab, getFacultyList, facultyList.length]);

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) return;
        setSending(true);
        setSendSuccess(false);
        try {
            let target: 'all' | 'dept' | string[];
            if (recipientMode === 'all') target = 'all';
            else if (recipientMode === 'dept') target = 'dept';
            else target = selectedFaculty;

            await send(target, title.trim(), body.trim(), priority);
            setSendSuccess(true);
            setTitle('');
            setBody('');
            setSelectedFaculty([]);
            setTimeout(() => setSendSuccess(false), 3000);
        } catch (err: any) {
            alert('Failed to send: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const filteredFaculty = facultyList.filter(f =>
        f.full_name.toLowerCase().includes(facultySearch.toLowerCase()) ||
        f.email.toLowerCase().includes(facultySearch.toLowerCase())
    );

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'urgent': return 'bg-red-500/15 text-red-500 border-red-500/20';
            case 'high': return 'bg-amber-500/15 text-amber-600 border-amber-500/20';
            default: return 'bg-primary/10 text-primary border-primary/20';
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-xl hover:bg-accent/80 transition-all duration-200 group"
            >
                {unreadCount > 0 ? (
                    <BellRing className="h-5 w-5 text-primary animate-pulse" />
                ) : (
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-[10px] font-bold text-white shadow-lg shadow-primary/30 animate-bounce-subtle">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-[420px] max-h-[600px] bg-card border-2 border-border rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 z-[100] flex flex-col overflow-hidden animate-fade-in-scale">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] text-primary hover:underline font-medium px-2 py-1"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent/80 transition-colors">
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-border/40">
                        {(['inbox', 'send'] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                                    tab === t
                                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t === 'inbox' ? 'Inbox' : 'Send Message'}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    {tab === 'inbox' ? (
                        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '460px' }}>
                            <div className="p-2">
                                {loading && (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    </div>
                                )}
                                {!loading && notifications.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                        <Bell className="h-10 w-10 mb-3 opacity-20" />
                                        <p className="text-sm font-medium">No notifications yet</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">You're all caught up!</p>
                                    </div>
                                )}
                                {!loading && notifications.map(notif => (
                                    <NotificationItem 
                                        key={notif.id} 
                                        notification={notif} 
                                        onRead={markAsRead}
                                        getPriorityColor={getPriorityColor}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '460px' }}>
                            <div className="p-4 space-y-4">
                                {sendSuccess && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm">
                                        <CheckCheck className="h-4 w-4 shrink-0" />
                                        Notification sent successfully!
                                    </div>
                                )}

                                {/* Recipients */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                        Send To
                                    </label>
                                    <div className="flex gap-1.5">
                                        {canSendToAll && (
                                            <button
                                                onClick={() => setRecipientMode('all')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                    recipientMode === 'all'
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                        : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30'
                                                }`}
                                            >
                                                <Users className="h-3 w-3" /> All Faculty
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setRecipientMode('dept')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                recipientMode === 'dept'
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30'
                                            }`}
                                        >
                                            <Building2 className="h-3 w-3" /> {userDept || 'Dept'}
                                        </button>
                                        <button
                                            onClick={() => setRecipientMode('individual')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                recipientMode === 'individual'
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30'
                                            }`}
                                        >
                                            <User className="h-3 w-3" /> Individual
                                        </button>
                                    </div>
                                </div>

                                {/* Individual faculty picker */}
                                {recipientMode === 'individual' && (
                                    <div>
                                        <Input
                                            placeholder="Search faculty..."
                                            value={facultySearch}
                                            onChange={(e) => setFacultySearch(e.target.value)}
                                            className="rounded-xl text-xs h-8 bg-secondary/30 border-border/40"
                                        />
                                        <div className="mt-2 max-h-32 overflow-y-auto space-y-1 rounded-xl border border-border/30 p-1">
                                            {filteredFaculty.slice(0, 10).map(f => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setSelectedFaculty(prev =>
                                                        prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]
                                                    )}
                                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                                        selectedFaculty.includes(f.id) 
                                                            ? 'bg-primary/10 text-primary' 
                                                            : 'hover:bg-accent/60 text-foreground'
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                        selectedFaculty.includes(f.id) ? 'bg-primary border-primary' : 'border-border/60'
                                                    }`}>
                                                        {selectedFaculty.includes(f.id) && <Check className="h-2.5 w-2.5 text-white" />}
                                                    </div>
                                                    <span className="truncate font-medium">{f.full_name}</span>
                                                    <span className="text-muted-foreground/60 ml-auto text-[10px]">{f.dept}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {selectedFaculty.length > 0 && (
                                            <p className="text-[10px] text-primary font-medium mt-1">{selectedFaculty.length} selected</p>
                                        )}
                                    </div>
                                )}

                                {/* Priority */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                        Priority
                                    </label>
                                    <div className="flex gap-1.5">
                                        {(['normal', 'high', 'urgent'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setPriority(p)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                                                    priority === p
                                                        ? getPriorityColor(p) + ' shadow-sm'
                                                        : 'border-border/60 text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Title & Body */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                                        Title
                                    </label>
                                    <Input
                                        placeholder="Notification title..."
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="rounded-xl text-sm bg-secondary/30 border-border/40"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                                        Message
                                    </label>
                                    <textarea
                                        placeholder="Write your message..."
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl text-sm bg-secondary/30 border border-border/40 px-3 py-2 resize-none focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                                    />
                                </div>

                                {/* Send Button */}
                                <Button
                                    onClick={handleSend}
                                    disabled={sending || !title.trim() || !body.trim() || (recipientMode === 'individual' && selectedFaculty.length === 0)}
                                    className="w-full rounded-xl gap-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white shadow-lg shadow-primary/20"
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    {sending ? 'Sending...' : 'Send Notification'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Individual notification row
function NotificationItem({ 
    notification, 
    onRead,
    getPriorityColor 
}: { 
    notification: Notification; 
    onRead: (id: string) => void;
    getPriorityColor: (p: string) => string;
}) {
    const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

    return (
        <button
            onClick={() => !notification.is_read && onRead(notification.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                notification.is_read
                    ? 'opacity-60 hover:opacity-80'
                    : 'bg-primary/5 hover:bg-primary/10 border border-primary/10'
            }`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                notification.is_read ? 'bg-muted' : 'bg-primary/15'
            }`}>
                {notification.priority === 'urgent' || notification.priority === 'high' ? (
                    <AlertCircle className={`h-4 w-4 ${notification.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                ) : (
                    <Bell className={`h-3.5 w-3.5 ${notification.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">{notification.title}</p>
                    {!notification.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo}
                    </span>
                    {notification.priority !== 'normal' && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase border ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
