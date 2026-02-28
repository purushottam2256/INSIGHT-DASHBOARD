import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Command, X, LayoutDashboard, GraduationCap, Clock,
  CalendarCheck, CalendarDays, GitCompareArrows, FileSpreadsheet,
  Shield, BarChart3, Layers, AlertTriangle, Settings,
  HelpCircle, ArrowRight, Moon, Sun, Monitor,
} from 'lucide-react';
import { useSearch, SearchResultItem } from '@/hooks/useSearch';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface ActionItem {
  id: string;
  label: string;
  icon: any;
  action: () => void;
  category: 'navigate' | 'action' | 'theme';
  keywords?: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { results, loading } = useSearch(query.startsWith('>') ? '' : query);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const goTo = (path: string) => { navigate(path); setIsOpen(false); };

  // Navigation actions
  const navActions: ActionItem[] = useMemo(() => [
    { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => goTo('/dashboard'), category: 'navigate', keywords: 'home overview' },
    { id: 'nav-registration', label: 'Registration', icon: GraduationCap, action: () => goTo('/registration'), category: 'navigate', keywords: 'students faculty' },
    { id: 'nav-timetable', label: 'Timetable', icon: Clock, action: () => goTo('/timetable'), category: 'navigate', keywords: 'schedule classes' },
    { id: 'nav-attendance', label: 'Attendance', icon: CalendarCheck, action: () => goTo('/attendance-manager'), category: 'navigate', keywords: 'mark track' },
    { id: 'nav-leaves', label: 'Leave Manager', icon: CalendarDays, action: () => goTo('/leaves'), category: 'navigate', keywords: 'approve request' },
    { id: 'nav-compare', label: 'Compare', icon: GitCompareArrows, action: () => goTo('/compare'), category: 'navigate', keywords: 'analytics trends' },
    { id: 'nav-reports', label: 'Reports', icon: FileSpreadsheet, action: () => goTo('/reports'), category: 'navigate', keywords: 'generate export' },
    { id: 'nav-compliance', label: 'Compliance', icon: Shield, action: () => goTo('/compliance'), category: 'navigate', keywords: 'condonation eligibility naac nba' },
    { id: 'nav-benchmarking', label: 'Benchmarking', icon: BarChart3, action: () => goTo('/benchmarking'), category: 'navigate', keywords: 'department performance' },
    { id: 'nav-sections', label: 'Section Manager', icon: Layers, action: () => goTo('/sections'), category: 'navigate', keywords: 'merge split' },
    { id: 'nav-audit', label: 'Audit Log', icon: Shield, action: () => goTo('/audit-log'), category: 'navigate', keywords: 'trail accountability' },
    { id: 'nav-semester', label: 'Semester Upgrade', icon: AlertTriangle, action: () => goTo('/semester-upgrade'), category: 'navigate', keywords: 'year promote' },
    { id: 'nav-calendar', label: 'Calendar', icon: CalendarDays, action: () => goTo('/calendar'), category: 'navigate', keywords: 'events holidays' },
    { id: 'nav-settings', label: 'Settings', icon: Settings, action: () => goTo('/settings'), category: 'navigate', keywords: 'preferences config' },
    { id: 'nav-help', label: 'Help', icon: HelpCircle, action: () => goTo('/help'), category: 'navigate', keywords: 'support faq' },
  ], []);

  const themeActions: ActionItem[] = useMemo(() => [
    { id: 'theme-light', label: 'Light Mode', icon: Sun, action: () => { setTheme('light'); setIsOpen(false); }, category: 'theme', keywords: 'appearance bright' },
    { id: 'theme-dark', label: 'Dark Mode', icon: Moon, action: () => { setTheme('dark'); setIsOpen(false); }, category: 'theme', keywords: 'appearance night' },
    { id: 'theme-system', label: 'System Theme', icon: Monitor, action: () => { setTheme('system'); setIsOpen(false); }, category: 'theme', keywords: 'appearance auto' },
  ], [setTheme]);

  const allActions = [...navActions, ...themeActions];

  // Filter actions by query
  const isActionMode = query.startsWith('>');
  const searchTerm = isActionMode ? query.slice(1).trim().toLowerCase() : query.toLowerCase();

  const filteredActions = useMemo(() => {
    if (!searchTerm && !isActionMode) return [];
    return allActions.filter(
      (a) =>
        a.label.toLowerCase().includes(searchTerm) ||
        (a.keywords && a.keywords.includes(searchTerm))
    );
  }, [searchTerm, isActionMode, allActions]);

  // Flatten search results
  const searchItems: Array<SearchResultItem & { sectionLabel?: string }> = useMemo(() => {
    if (isActionMode) return [];
    const items: Array<SearchResultItem & { sectionLabel?: string }> = [];
    if (results.students.length > 0) {
      items.push({ ...results.students[0], sectionLabel: 'Students' });
      items.push(...results.students.slice(1));
    }
    if (results.faculty.length > 0) {
      items.push({ ...results.faculty[0], sectionLabel: 'Faculty' });
      items.push(...results.faculty.slice(1));
    }
    if (results.subjects.length > 0) {
      items.push({ ...results.subjects[0], sectionLabel: 'Subjects' });
      items.push(...results.subjects.slice(1));
    }
    return items;
  }, [results, isActionMode]);

  const totalItems = filteredActions.length + searchItems.length;

  // Keyboard navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredActions.length) {
        filteredActions[selectedIndex]?.action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      {/* Palette */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl animate-scale-in">
        <div className="mx-4 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search students, faculty, subjects... or type > for actions"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-mono">ESC</kbd>
              <button onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin py-1">
            {/* Action results */}
            {filteredActions.length > 0 && (
              <div className="px-2 py-1">
                <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider px-2 py-1">
                  {isActionMode ? 'Commands' : 'Quick Navigation'}
                </p>
                {filteredActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                        selectedIndex === i ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 font-medium">{action.label}</span>
                      <ArrowRight className="h-3 w-3 opacity-40" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search results */}
            {searchItems.length > 0 && (
              <div className="px-2 py-1">
                {searchItems.map((item, i) => {
                  const idx = filteredActions.length + i;
                  return (
                    <div key={item.id + i}>
                      {item.sectionLabel && (
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider px-2 py-1 mt-1">
                          {item.sectionLabel}
                        </p>
                      )}
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedIndex === idx ? "bg-primary/10" : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                          item.type === 'student' ? 'bg-blue-500/10 text-blue-500' :
                          item.type === 'faculty' ? 'bg-purple-500/10 text-purple-500' :
                          item.type === 'subject' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {item.type[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                        {item.meta && (
                          <span className="text-[10px] text-muted-foreground/60 shrink-0">{item.meta}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {totalItems === 0 && query.length >= 2 && !loading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            )}

            {/* Hint */}
            {!query && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground/50 space-y-1">
                <p>Start typing to search, or type <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground text-xs font-mono">&gt;</kbd> for commands</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground/50">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
            <div className="ml-auto flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>K to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
