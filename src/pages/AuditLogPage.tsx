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
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
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
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search actions, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {entries.length} entries
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground rounded-xl border border-border bg-card">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No audit entries yet</p>
            <p className="text-sm mt-1">Actions will be logged as you use the dashboard</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors premium-glow"
            >
              <div className={`px-2 py-1 rounded-md text-xs font-bold ${categoryColors[entry.category] || categoryColors.other}`}>
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
