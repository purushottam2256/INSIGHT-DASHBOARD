import { useState, useEffect } from 'react';
import { Megaphone, Send, Clock, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuditLog } from '@/hooks/useAuditLog';
import { DEPARTMENTS } from '@/lib/constants';
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
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  // Load broadcasts from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('insight_broadcasts') || '[]');
      setBroadcasts(stored);
    } catch {
      setBroadcasts([]);
    }
  }, []);

  const saveBroadcasts = (items: Broadcast[]) => {
    setBroadcasts(items);
    localStorage.setItem('insight_broadcasts', JSON.stringify(items));
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);

    const newBroadcast: Broadcast = {
      id: crypto.randomUUID(),
      title: title.trim(),
      message: message.trim(),
      priority,
      audience,
      sentBy: permissions.userRole || 'admin',
      sentByRole: permissions.userRole || 'admin',
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updated = [newBroadcast, ...broadcasts];
    saveBroadcasts(updated);

    logAction('Broadcast Sent', 'broadcast', `Sent "${title}" to ${audience}`, {
      priority,
      audience,
      title,
    });

    toast.success('Broadcast sent successfully!');
    setTitle('');
    setMessage('');
    setPriority('normal');
    setAudience('all');
    setShowCompose(false);
    setSending(false);
  };

  const handleDelete = (id: string) => {
    saveBroadcasts(broadcasts.filter((b) => b.id !== id));
    toast.success('Broadcast deleted');
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
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
              >
                <option value="all">All (HODs + Faculty)</option>
                <option value="hods">HODs Only</option>
                <option value="faculty">Faculty Only</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label} Dept Only</option>
                ))}
              </select>
            </div>
          </div>

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
