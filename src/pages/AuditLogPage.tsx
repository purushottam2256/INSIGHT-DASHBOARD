import { useState, useMemo } from 'react';
import { Shield, Search, Download, Calendar, Clock } from 'lucide-react';
import { getLocalAuditLog } from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'all', label: 'All Actions' },
  { value: 'leave', label: 'Leave' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'report', label: 'Report' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'semester', label: 'Semester' },
  { value: 'section', label: 'Section' },
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'settings', label: 'Settings' },
];

const categoryColors: Record<string, string> = {
  leave: 'bg-blue-500/10 text-blue-500',
  attendance: 'bg-emerald-500/10 text-emerald-500',
  faculty: 'bg-purple-500/10 text-purple-500',
  report: 'bg-amber-500/10 text-amber-500',
  calendar: 'bg-pink-500/10 text-pink-500',
  semester: 'bg-red-500/10 text-red-500',
  section: 'bg-orange-500/10 text-orange-500',
  broadcast: 'bg-cyan-500/10 text-cyan-500',
  settings: 'bg-gray-500/10 text-gray-500',
  other: 'bg-muted text-muted-foreground',
};

export default function AuditLogPage() {
  const permissions = usePermissions();
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const entries = useMemo(
    () => getLocalAuditLog({
      category: category !== 'all' ? category : undefined,
      searchQuery: searchQuery || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      dept: permissions.isDeptScoped ? permissions.userDept || undefined : undefined,
    }),
    [category, searchQuery, dateFrom, dateTo, permissions.isDeptScoped, permissions.userDept]
  );

  const exportAuditLog = () => {
    if (entries.length === 0) { toast.error('No entries to export'); return; }
    const ws = XLSX.utils.json_to_sheet(
      entries.map((e) => ({
        'Timestamp': new Date(e.timestamp).toLocaleString(),
        'User': e.user_name,
        'Role': e.user_role,
        'Action': e.action,
        'Category': e.category,
        'Details': e.details,
        'Department': e.dept || '-',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
    XLSX.writeFile(wb, `Audit_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Audit log exported');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <button
          onClick={exportAuditLog}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 shadow-sm transition-all hover:shadow-md"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl bg-card border border-border/40 shadow-sm">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-secondary/30 text-sm font-medium"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border/50 bg-secondary/30 text-sm font-medium"
          />
          <span className="text-muted-foreground text-sm font-medium">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border/50 bg-secondary/30 text-sm font-medium"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search actions, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/50 bg-secondary/30 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground font-medium">
        Showing <span className="font-bold text-foreground">{entries.length}</span> entries
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground rounded-2xl border-2 border-dashed border-border/40 bg-secondary/10">
            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-10 w-10 text-primary/30" />
            </div>
            <p className="font-bold text-foreground text-lg">No audit entries yet</p>
            <p className="text-sm mt-1">Actions will be logged as you use the dashboard</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-card hover:bg-muted/20 transition-all shadow-sm hover:shadow-md"
            >
              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ${categoryColors[entry.category] || categoryColors.other}`}>
                {entry.category}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{entry.action}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{entry.details}</div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <span>by {entry.user_name}</span>
                  <span className="text-primary/60">{entry.user_role}</span>
                  {entry.dept && <span>{entry.dept}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
