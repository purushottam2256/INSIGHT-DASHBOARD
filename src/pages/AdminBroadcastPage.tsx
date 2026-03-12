import { useState, useEffect, useMemo } from 'react';
import {
  Megaphone, Send, Clock, Trash2, Search, CheckCheck,
  Bell, Eye, Copy, RefreshCw, Users, Building2,
  ChevronDown, ChevronUp, FileText, Sparkles, Download,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuditLog } from '@/hooks/useAuditLog';
import { DEPARTMENTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Types ───────────────────────────────────────────────────────────────
interface BroadcastRecord {
  id: string;
  title: string;
  body: string;
  priority: 'normal' | 'high' | 'urgent';
  type: string;
  created_at: string;
  data: {
    isBroadcast?: boolean;
    senderId?: string;
    senderRole?: string;
    audience?: string;
    category?: string;
  } | null;
}

interface DeliveryStats {
  total: number;
  read: number;
  pushSent: number;
}

// ── Constants ───────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  normal: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600', dot: 'bg-blue-500', label: 'Normal' },
  high:   { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600', dot: 'bg-amber-500', label: 'Important' },
  urgent: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600', dot: 'bg-red-500', label: 'Urgent' },
};

const CATEGORIES = [
  { value: 'general', label: 'General', icon: '📢' },
  { value: 'attendance', label: 'Attendance', icon: '✅' },
  { value: 'exam', label: 'Examinations', icon: '📝' },
  { value: 'event', label: 'Events', icon: '🎉' },
  { value: 'holiday', label: 'Holidays', icon: '🏖️' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'deadline', label: 'Deadline', icon: '⏰' },
  { value: 'system', label: 'System', icon: '⚙️' },
];

const TEMPLATES = [
  { label: 'Attendance Reminder', cat: 'attendance', pri: 'high' as const, title: 'Attendance Submission Reminder', msg: 'Kindly ensure that all attendance records for the current week are submitted by end of day today. Late submissions will be flagged in the compliance report.' },
  { label: 'Faculty Meeting', cat: 'meeting', pri: 'normal' as const, title: 'Faculty Meeting Notice', msg: 'A mandatory faculty meeting has been scheduled. Please ensure your attendance. Agenda will be shared via email.' },
  { label: 'Exam Schedule', cat: 'exam', pri: 'high' as const, title: 'Upcoming Examination Schedule', msg: 'The internal examination schedule has been finalized. Please review the assigned invigilation duties and report any conflicts within 24 hours.' },
  { label: 'Holiday Notice', cat: 'holiday', pri: 'normal' as const, title: 'Holiday Announcement', msg: 'The institution will remain closed on the mentioned date. All classes and lab sessions stand cancelled.' },
  { label: 'Submission Deadline', cat: 'deadline', pri: 'urgent' as const, title: 'Urgent: Submission Deadline Today', msg: 'This is a final reminder that the deadline for submission is today. Ensure all required documents are uploaded before EOD. No extensions will be granted.' },
  { label: 'Event Invitation', cat: 'event', pri: 'normal' as const, title: 'Upcoming Campus Event', msg: 'You are invited to attend the campus event. Your participation and support will contribute to the success of this initiative.' },
  { label: 'System Maintenance', cat: 'system', pri: 'high' as const, title: 'Scheduled System Maintenance', msg: 'The Insight dashboard and Attend-Me app will undergo scheduled maintenance. Please save your work beforehand.' },
  { label: 'Low Attendance Alert', cat: 'attendance', pri: 'urgent' as const, title: 'Low Attendance Detected', msg: 'Multiple students in your classes have attendance below the 75% threshold. Please review the student roster and take necessary action.' },
];

// ── Component ───────────────────────────────────────────────────────────
export default function AdminBroadcastPage() {
  const permissions = usePermissions();
  const { logAction } = useAuditLog();
  const isHod = permissions.userRole === 'hod';
  const hodDept = permissions.userDept;

  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [deliveryMap, setDeliveryMap] = useState<Record<string, DeliveryStats>>({});
  const [historyLoading, setHistoryLoading] = useState(true);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [category, setCategory] = useState('general');
  const [audience, setAudience] = useState(isHod && hodDept ? hodDept : 'all');
  const [sending, setSending] = useState(false);

  // Faculty picker
  const [facultyList, setFacultyList] = useState<{id: string; full_name: string; dept: string}[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [facultySearch, setFacultySearch] = useState('');

  // Filters  
  const [historySearch, setHistorySearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────
  useEffect(() => { loadHistory(); loadFaculty(); }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) { setHistoryLoading(false); return; }

      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, priority, type, created_at, data')
        .eq('data->>isBroadcast', 'true')
        .eq('data->>senderId', uid)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Deduplicate (same broadcast → multiple rows per recipient)
      const seen = new Map<string, BroadcastRecord>();
      for (const n of (data || [])) {
        const key = `${n.title}||${n.created_at}`;
        if (!seen.has(key)) seen.set(key, { id: n.id, title: n.title, body: n.body, priority: n.priority as any, type: n.type, created_at: n.created_at, data: n.data });
      }
      const unique = Array.from(seen.values());
      setBroadcasts(unique);

      // Delivery stats for visible broadcasts
      const statsMap: Record<string, DeliveryStats> = {};
      for (const b of unique.slice(0, 20)) {
        const { data: stats } = await supabase
          .from('notifications')
          .select('is_read, fcm_sent')
          .eq('title', b.title)
          .eq('data->>isBroadcast', 'true')
          .gte('created_at', new Date(new Date(b.created_at).getTime() - 60000).toISOString())
          .lte('created_at', new Date(new Date(b.created_at).getTime() + 60000).toISOString());

        if (stats) statsMap[b.id] = { total: stats.length, read: stats.filter(s => s.is_read).length, pushSent: stats.filter(s => s.fcm_sent).length };
      }
      setDeliveryMap(statsMap);
    } catch {
      // Fallback to localStorage legacy data
      try {
        const stored = JSON.parse(localStorage.getItem('insight_broadcasts') || '[]');
        setBroadcasts(stored.map((b: any) => ({ id: b.id, title: b.title, body: b.message || b.body, priority: b.priority, type: 'broadcast', created_at: b.timestamp || b.created_at, data: { audience: b.audience, senderRole: b.sentByRole } })));
      } catch { setBroadcasts([]); }
    } finally { setHistoryLoading(false); }
  };

  const loadFaculty = async () => {
    let query = supabase.from('profiles').select('id, full_name, dept').in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']).order('full_name');
    if (isHod && hodDept) query = query.eq('dept', hodDept);
    const { data } = await query;
    setFacultyList(data || []);
  };

  // ── Send broadcast ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return; }
    if (audience === 'specific_faculty' && !selectedFacultyId) { toast.error('Select a faculty member'); return; }

    setSending(true);
    try {
      let query = supabase.from('profiles').select('id, push_token, full_name');
      if (audience === 'specific_faculty') query = query.eq('id', selectedFacultyId);
      else if (audience === 'hods') query = query.eq('role', 'hod');
      else if (audience === 'faculty') query = query.in('role', ['faculty', 'class_incharge', 'lab_incharge']);
      else if (audience !== 'all') query = query.eq('dept', audience).in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']);
      else query = query.in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']);

      const { data: targets, error: targetErr } = await query;
      if (targetErr) throw targetErr;
      if (!targets?.length) { toast.error('No faculty found for this audience.'); setSending(false); return; }

      const selectedFac = audience === 'specific_faculty' ? facultyList.find(f => f.id === selectedFacultyId) : null;
      const audienceLabel = audience === 'specific_faculty' && selectedFac ? `Faculty: ${selectedFac.full_name}` : audience;

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      const catIcon = CATEGORIES.find(c => c.value === category)?.icon || '📢';

      const rows = targets.map(p => ({
        user_id: p.id, type: 'broadcast' as const, priority, title: title.trim(), body: message.trim(),
        data: { isBroadcast: true, senderId: uid, senderRole: permissions.userRole, audience: audienceLabel, category },
      }));

      const { error: insErr } = await supabase.from('notifications').insert(rows);
      if (insErr) {
        if (insErr.message.includes('invalid input value for enum')) {
          await supabase.from('notifications').insert(rows.map(r => ({ ...r, type: 'system' as const }))).throwOnError();
        } else throw insErr;
      }

      // Fire push notifications
      let pushCount = 0;
      for (const t of targets) {
        if (t.push_token) {
          supabase.functions.invoke('send-push', {
            body: { token: t.push_token, title: `${catIcon} ${title.trim()}`, body: message.trim(), data: { categoryId: 'BROADCAST', priority, category } },
          }).catch(() => {});
          pushCount++;
        }
      }

      logAction('Broadcast Sent', 'broadcast', `Sent "${title}" to ${audienceLabel}`, { priority, audience: audienceLabel, category, pushSentCount: pushCount, totalRecipients: targets.length });
      toast.success(`Broadcast delivered to ${targets.length} recipients! (${pushCount} push)`);
      resetCompose();
      loadHistory();
    } catch (e: any) {
      toast.error('Failed: ' + e.message);
    } finally { setSending(false); }
  };

  const resetCompose = () => {
    setTitle(''); setMessage(''); setPriority('normal'); setCategory('general');
    setAudience(isHod && hodDept ? hodDept : 'all');
    setShowCompose(false); setSelectedFacultyId(''); setFacultySearch('');
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title); setMessage(t.msg); setPriority(t.pri); setCategory(t.cat);
  };

  const handleDelete = async (b: BroadcastRecord) => {
    try {
      await supabase.from('notifications').delete().eq('title', b.title).eq('data->>isBroadcast', 'true')
        .gte('created_at', new Date(new Date(b.created_at).getTime() - 60000).toISOString())
        .lte('created_at', new Date(new Date(b.created_at).getTime() + 60000).toISOString());
      setBroadcasts(prev => prev.filter(x => x.id !== b.id));
      toast.success('Broadcast deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const duplicateBroadcast = (b: BroadcastRecord) => {
    setTitle(b.title); setMessage(b.body); setPriority(b.priority); setCategory(b.data?.category || 'general');
    setShowCompose(true); toast.info('Loaded into composer — edit and resend');
  };

  const exportCSV = () => {
    const rows = [['Title', 'Category', 'Priority', 'Audience', 'Recipients', 'Read', 'Date'].join(','),
      ...filtered.map(b => [`"${b.title}"`, b.data?.category || 'general', b.priority, b.data?.audience || '—', deliveryMap[b.id]?.total || 0, deliveryMap[b.id]?.read || 0, new Date(b.created_at).toLocaleDateString()].join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    a.download = `broadcasts_${new Date().toISOString().split('T')[0]}.csv`; a.click(); toast.success('Exported');
  };

  const filtered = useMemo(() => broadcasts.filter(b => {
    if (!historySearch) return true;
    return b.title.toLowerCase().includes(historySearch.toLowerCase()) || b.body.toLowerCase().includes(historySearch.toLowerCase());
  }), [broadcasts, historySearch]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in max-w-4xl mx-auto">

      {/* ─── Compose Toggle ──────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-[0.97]"
        >
          {showCompose ? <ChevronUp className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {showCompose ? 'Close' : 'New Broadcast'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={loadHistory} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-30" title="Export CSV">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Compose Panel ───────────────────────────────────────── */}
      {showCompose && (
        <div className="border border-primary/20 rounded-2xl bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 bg-gradient-to-r from-primary/8 to-transparent border-b border-border/30 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Compose Broadcast</h3>
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{message.length}/1000</span>
          </div>

          <div className="p-5 space-y-4">
            {/* Quick Templates */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Quick Templates
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => applyTemplate(t)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-secondary/60 hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20">
                    {CATEGORIES.find(c => c.value === t.cat)?.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Subject line..." maxLength={120}
              className="w-full px-4 py-3 rounded-xl border border-border/40 bg-secondary/20 text-sm font-semibold placeholder:font-normal focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-card outline-none transition-all"
            />

            {/* Message Body */}
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement..." rows={4} maxLength={1000}
              className="w-full px-4 py-3 rounded-xl border border-border/40 bg-secondary/20 text-sm resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-card outline-none transition-all"
            />

            {/* Options Row — Category, Priority, Audience */}
            <div className="grid grid-cols-3 gap-3">
              <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2.5 rounded-xl border border-border/40 bg-secondary/20 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
              <select value={priority} onChange={e => setPriority(e.target.value as any)} className="px-3 py-2.5 rounded-xl border border-border/40 bg-secondary/20 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="normal">🔵 Normal</option>
                <option value="high">🟠 Important</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
              <select
                value={audience} onChange={e => { setAudience(e.target.value); setSelectedFacultyId(''); setFacultySearch(''); }}
                className="px-3 py-2.5 rounded-xl border border-border/40 bg-secondary/20 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none">
                {isHod && hodDept ? (
                  <><option value={hodDept}>{hodDept.toUpperCase()} Dept</option><option value="specific_faculty">👤 Faculty</option></>
                ) : (
                  <>
                    <option value="all">🌐 All</option>
                    <option value="hods">🎓 HODs Only</option>
                    <option value="faculty">👥 Faculty Only</option>
                    <option value="specific_faculty">👤 Specific Faculty</option>
                    {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>🏛️ {d.label}</option>)}
                  </>
                )}
              </select>
            </div>

            {/* Faculty Picker — only if specific faculty is selected */}
            {audience === 'specific_faculty' && (
              <div className="rounded-xl bg-secondary/20 border border-border/30 p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input value={facultySearch} onChange={(e) => setFacultySearch(e.target.value)} placeholder="Search faculty..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border/40 bg-card text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-lg divide-y divide-border/20">
                  {facultyList.filter(f => !facultySearch.trim() || f.full_name.toLowerCase().includes(facultySearch.toLowerCase())).map(f => (
                    <button key={f.id} onClick={() => setSelectedFacultyId(f.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-all ${selectedFacultyId === f.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${selectedFacultyId === f.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        {f.full_name.charAt(0)}
                      </div>
                      <span className="truncate">{f.full_name}</span>
                      <span className="text-[9px] text-muted-foreground ml-auto">{f.dept}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Send / Cancel */}
            <div className="flex gap-3 pt-1">
              <button onClick={resetCompose} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-primary/90 transition-all active:scale-[0.97] shadow-md shadow-primary/20">
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Search ───────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search broadcasts..."
          className="w-full pl-11 pr-4 h-10 rounded-xl border border-border/40 bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all"
        />
        {filtered.length !== broadcasts.length && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{filtered.length} results</span>
        )}
      </div>

      {/* ─── Broadcast Timeline ──────────────────────────────────── */}
      <div className="space-y-2">
        {historyLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border-2 border-dashed border-border/30 bg-secondary/5">
            <Megaphone className="h-10 w-10 mx-auto mb-3 text-primary/15" />
            <p className="font-bold text-foreground/70">{broadcasts.length === 0 ? 'No broadcasts yet' : 'No matching broadcasts'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {broadcasts.length === 0 ? 'Click "New Broadcast" to send your first announcement' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          filtered.map((b) => {
            const p = PRIORITY_CONFIG[b.priority] || PRIORITY_CONFIG.normal;
            const cat = CATEGORIES.find(c => c.value === (b.data?.category || 'general'));
            const stats = deliveryMap[b.id];
            const isExpanded = expandedId === b.id;
            const readPct = stats && stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0;
            const timeAgo = getTimeAgo(b.created_at);

            return (
              <div key={b.id} className={`group rounded-xl border bg-card transition-all hover:shadow-sm ${p.border}`}>
                {/* Clickable to expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                >
                  {/* Left — priority + icon */}
                  <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${p.dot} ring-2 ring-offset-1 ring-offset-card ${p.dot.replace('bg-', 'ring-')}/30`} />
                    <span className="text-base leading-none">{cat?.icon || '📢'}</span>
                  </div>

                  {/* Center — content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.bg} ${p.text}`}>{p.label}</span>
                      <span className="text-[9px] text-muted-foreground/60">•</span>
                      <span className="text-[9px] text-muted-foreground/60 flex items-center gap-0.5">
                        <Building2 className="h-2.5 w-2.5" />
                        {b.data?.audience === 'all' ? 'All' : b.data?.audience || '—'}
                      </span>
                      {stats && (
                        <>
                          <span className="text-[9px] text-muted-foreground/60">•</span>
                          <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                            <CheckCheck className="h-2.5 w-2.5" /> {readPct}% read
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm leading-snug">{b.title}</h4>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.body}</p>
                    )}
                    <span className="text-[10px] text-muted-foreground/40 mt-1 inline-block">{timeAgo}</span>
                  </div>

                  {/* Right — expand indicator */}
                  <div className="pt-1 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/20 space-y-3 animate-fade-in">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{b.body}</p>

                    {/* Delivery stats */}
                    {stats && (
                      <div className="flex items-center gap-5 text-[11px] py-2 px-3 rounded-lg bg-secondary/30">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> <strong>{stats.total}</strong> recipients
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <Eye className="h-3.5 w-3.5" /> <strong>{stats.read}</strong> read
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <Bell className="h-3.5 w-3.5" /> <strong>{stats.pushSent}</strong> push
                        </span>
                        <div className="flex-1 max-w-[100px]">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${readPct}%` }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                      <Clock className="h-3 w-3" />
                      {new Date(b.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      <span>• by {b.data?.senderRole || '—'}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); duplicateBroadcast(b); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary transition-all">
                        <Copy className="h-3 w-3" /> Resend
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(b); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-secondary hover:bg-destructive/10 hover:text-destructive transition-all">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────
function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
