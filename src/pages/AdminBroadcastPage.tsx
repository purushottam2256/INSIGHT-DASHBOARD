import { useState, useEffect } from 'react';
import { Megaphone, Send, Clock, Trash2, Search, User } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuditLog } from '@/hooks/useAuditLog';
import { DEPARTMENTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  priority: 'normal' | 'important' | 'urgent';
  audience: 'all' | 'hods' | 'faculty' | string; // dept name for targeted
  sentBy: string;
  sentByRole: string;
  timestamp: string;
  read: boolean;
}

const PRIORITY_STYLES = {
  normal: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600', label: 'Normal' },
  important: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600', label: 'Important' },
  urgent: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600', label: 'Urgent' },
};

const TEMPLATES = [
  { label: 'Attendance Reminder', title: 'Attendance Submission Reminder', message: 'Kindly ensure that all attendance records for the current week are submitted by end of day today. Late submissions will be flagged in the compliance report.' },
  { label: 'Faculty Meeting', title: 'Faculty Meeting Notice', message: 'A mandatory faculty meeting has been scheduled. Please ensure your attendance. Agenda will be shared via email.' },
  { label: 'Exam Schedule', title: 'Upcoming Examination Schedule', message: 'The internal examination schedule has been finalized. Please review the assigned invigilation duties and report any conflicts within 24 hours.' },
  { label: 'Holiday Notice', title: 'Holiday Announcement', message: 'The institution will remain closed on the mentioned date. All classes and lab sessions stand cancelled.' },
];

export default function AdminBroadcastPage() {
  const permissions = usePermissions();
  const { logAction } = useAuditLog();
  const isHod = permissions.userRole === 'hod';
  const hodDept = permissions.userDept;
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [audience, setAudience] = useState(isHod && hodDept ? hodDept : 'all');
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [facultyList, setFacultyList] = useState<{id: string; full_name: string; dept: string}[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [facultySearch, setFacultySearch] = useState('');

  // Load broadcasts from localStorage + faculty list
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('insight_broadcasts') || '[]');
      setBroadcasts(stored);
    } catch {
      setBroadcasts([]);
    }
    // Load faculty
    const loadFaculty = async () => {
      let query = supabase.from('profiles').select('id, full_name, dept').in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']).order('full_name');
      if (isHod && hodDept) query = query.eq('dept', hodDept);
      const { data } = await query;
      setFacultyList(data || []);
    };
    loadFaculty();
  }, []);

  const saveBroadcasts = (items: Broadcast[]) => {
    setBroadcasts(items);
    localStorage.setItem('insight_broadcasts', JSON.stringify(items));
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (audience === 'specific_faculty' && !selectedFacultyId) {
      toast.error('Please select a faculty member');
      return;
    }
    
    setSending(true);
    let targetProfiles: any[] = [];

    try {
        // Query targets based on audience
        let query = supabase.from('profiles').select('id, push_token, full_name');
        
        if (audience === 'specific_faculty') {
            query = query.eq('id', selectedFacultyId);
        } else if (audience === 'hods') {
            query = query.eq('role', 'hod');
        } else if (audience === 'faculty') {
            query = query.in('role', ['faculty', 'class_incharge', 'lab_incharge']);
        } else if (audience !== 'all') { // It's a specific department
            query = query.eq('dept', audience).in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']);
        } else {
            // all
            query = query.in('role', ['faculty', 'class_incharge', 'lab_incharge', 'hod']);
        }

        const { data: targets, error: targetError } = await query;
        if (targetError) throw targetError;
        targetProfiles = targets || [];

        if (targetProfiles.length === 0) {
            toast.error("No valid faculty found for this audience.");
            setSending(false);
            return;
        }

        const selectedFaculty = audience === 'specific_faculty' ? facultyList.find(f => f.id === selectedFacultyId) : null;
        const audienceLabel = audience === 'specific_faculty' && selectedFaculty ? `Faculty: ${selectedFaculty.full_name}` : audience;

        const { data: authData } = await supabase.auth.getUser();
        const currentUserId = authData.user?.id || null;

        // 1. Save to `notifications` table
        const notificationsData = targetProfiles.map(p => ({
            user_id: p.id,
            type: 'broadcast', // Assuming 'broadcast' is a valid ENUM type. Adjust if DB differs.
            priority: priority,
            title: title.trim(),
            body: message.trim(),
            data: { 
                isBroadcast: true, 
                senderId: currentUserId, 
                senderRole: permissions.userRole,
                audience: audienceLabel
            }
        }));

        const { error: insertError } = await supabase.from('notifications').insert(notificationsData);
        if (insertError) {
             console.error("DB Insert Error (Notifications):", insertError);
             // If Enum fails, fallback to standard 'system' type
             if (insertError.message.includes('invalid input value for enum')) {
                 const fallbackData = notificationsData.map(n => ({...n, type: 'system'}));
                 await supabase.from('notifications').insert(fallbackData).throwOnError();
             } else {
                 throw insertError;
             }
        }

        // 2. Local History Saving for Admin UI Consistency
        const newBroadcast: Broadcast = {
          id: crypto.randomUUID(),
          title: title.trim(),
          message: message.trim(),
          priority,
          audience: audienceLabel,
          sentBy: permissions.userRole || 'admin',
          sentByRole: permissions.userRole || 'admin',
          timestamp: new Date().toISOString(),
          read: false,
        };
        const updated = [newBroadcast, ...broadcasts];
        saveBroadcasts(updated);

        // 3. Send Push Notifications via Edge Function!
        let sentCount = 0;
        for (const target of targetProfiles) {
            if (target.push_token) {
                 // Non-blocking fire and forget for max speed, or await inside try catch
                 supabase.functions.invoke('send-push', {
                     body: {
                         token: target.push_token,
                         title: `Broadcast: ${title.trim()}`,
                         body: message.trim(),
                         data: { categoryId: 'BROADCAST', priority }
                     }
                 }).catch(e => console.error("Push delivery failed for user", target.id, e));
                 sentCount++;
            }
        }

        logAction('Broadcast Sent', 'broadcast', `Sent "${title}" to ${audience}`, {
          priority,
          audience,
          title,
          pushSentCount: sentCount
        });

        toast.success(`Broadcast sent! Push notifications triggered for ${sentCount}/${targetProfiles.length} users.`);
        setTitle('');
        setMessage('');
        setPriority('normal');
        setAudience('all');
        setShowCompose(false);

    } catch (e: any) {
        toast.error("Failed to send broadcast: " + e.message);
        console.error("Broadcast Logic Error:", e);
    } finally {
        setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    saveBroadcasts(broadcasts.filter((b) => b.id !== id));
    toast.success('Broadcast removed from local memory');
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setMessage(t.message);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Send className="h-4 w-4" />
          New Broadcast
        </button>
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="p-5 rounded-xl border border-primary/20 bg-card space-y-4 animate-slide-up glass-card">
          <h3 className="font-semibold text-lg">Compose Broadcast</h3>

          {/* Templates */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick Templates:</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(t)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/80 transition-colors border border-border"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Broadcast title..."
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
              >
                <option value="normal">🔵 Normal</option>
                <option value="important">🟠 Important</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Audience</label>
              <select
                value={audience}
                onChange={(e) => { setAudience(e.target.value); setSelectedFacultyId(''); setFacultySearch(''); }}
                className={`w-full px-3 py-2 rounded-lg border border-border bg-card text-sm`}
              >
                {isHod && hodDept ? (
                  <>
                    <option value={hodDept}>{hodDept.toUpperCase()} Dept (All)</option>
                    <option value="specific_faculty">Specific Faculty</option>
                  </>
                ) : (
                  <>
                    <option value="all">All (HODs + Faculty)</option>
                    <option value="hods">HODs Only</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="specific_faculty">Specific Faculty</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label} Dept Only</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Faculty Picker — shown when 'specific_faculty' audience is selected */}
          {audience === 'specific_faculty' && (
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                <User className="h-4 w-4 text-primary" />
                Select Faculty Member
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border/50">
                {facultyList
                  .filter(f => !facultySearch.trim() || f.full_name.toLowerCase().includes(facultySearch.toLowerCase()))
                  .map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFacultyId(f.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                        selectedFacultyId === f.id ? 'bg-primary/10 font-semibold text-primary' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        selectedFacultyId === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {f.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{f.full_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{f.dept}</div>
                      </div>
                    </button>
                  ))}
                {facultyList.filter(f => !facultySearch.trim() || f.full_name.toLowerCase().includes(facultySearch.toLowerCase())).length === 0 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground text-center">No matching faculty found.</div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCompose(false)}
              className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !message.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </div>
      )}

      {/* Broadcast History */}
      <div className="space-y-3">
        {broadcasts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground rounded-xl border border-border bg-card">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No broadcasts yet</p>
            <p className="text-sm mt-1">Send your first announcement to HODs and faculty</p>
          </div>
        ) : (
          broadcasts.map((b) => {
            const pStyle = PRIORITY_STYLES[b.priority];
            return (
              <div key={b.id} className="p-4 rounded-xl border border-border bg-card premium-glow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pStyle.bg} ${pStyle.text} border ${pStyle.border}`}>
                        {pStyle.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 px-1.5 py-0.5 rounded bg-muted">
                        {b.audience === 'all' ? 'All' : b.audience === 'hods' ? 'HODs' : b.audience === 'faculty' ? 'Faculty' : b.audience}
                      </span>
                    </div>
                    <h4 className="font-semibold">{b.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{b.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(b.timestamp).toLocaleString()}
                      </span>
                      <span>by {b.sentByRole}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
