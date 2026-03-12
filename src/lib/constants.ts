// Only 6 departments as per institution
export const DEPARTMENTS = [
  { value: "H&S", label: "H&S" },
  { value: "CSE", label: "CSE" },
  { value: "CSM", label: "CSM" },
  { value: "CSD", label: "CSD" },
  { value: "AIDS", label: "AIDS" },
  { value: "ECE", label: "ECE" },
];

export const YEARS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Roles that have cross-department and elevated access */
export const ELEVATED_ROLES = ['principal', 'management', 'developer', 'admin'] as const;

/** Keyword shortcuts for global search routing */
export const SEARCH_KEYWORDS: Record<string, { path: string; label: string }> = {
  'holiday': { path: '/calendar', label: 'Calendar & Holidays' },
  'holidays': { path: '/calendar', label: 'Calendar & Holidays' },
  'event': { path: '/calendar', label: 'Calendar & Events' },
  'events': { path: '/calendar', label: 'Calendar & Events' },
  'calendar': { path: '/calendar', label: 'Calendar' },
  'report': { path: '/reports', label: 'Reports & Export' },
  'reports': { path: '/reports', label: 'Reports & Export' },
  'export': { path: '/reports', label: 'Reports & Export' },
  'setting': { path: '/settings', label: 'Settings' },
  'settings': { path: '/settings', label: 'Settings' },
  'config': { path: '/settings', label: 'Settings' },
  'leave': { path: '/leaves', label: 'Leave Manager' },
  'leaves': { path: '/leaves', label: 'Leave Manager' },
  'attendance': { path: '/attendance-manager', label: 'Attendance Manager' },
  'register': { path: '/registration', label: 'Registration' },
  'registration': { path: '/registration', label: 'Registration' },
  'student': { path: '/registration', label: 'Registration' },
  'faculty': { path: '/registration', label: 'Faculty Management' },
  'timetable': { path: '/timetable', label: 'Timetable' },
  'schedule': { path: '/timetable', label: 'Timetable' },
  'compare': { path: '/compare', label: 'Compare Classes' },
  'fees': { path: '/project-fees', label: 'Project Fees' },
  'payment': { path: '/project-fees', label: 'Project Fees' },
  'project fees': { path: '/project-fees', label: 'Project Fees' },
  'section': { path: '/sections', label: 'Section Manager' },
  'sections': { path: '/sections', label: 'Section Manager' },
  'broadcast': { path: '/broadcast', label: 'Broadcast' },
  'help': { path: '/help', label: 'Help & Support' },
  'complaint': { path: '/complaints', label: 'Complaints & Suggestions' },
  'complaints': { path: '/complaints', label: 'Complaints & Suggestions' },
  'suggestion': { path: '/complaints', label: 'Complaints & Suggestions' },
  'overview': { path: '/student-overview', label: 'Student Overview' },
  'benchmark': { path: '/benchmarking', label: 'Benchmarking' },
  'audit': { path: '/audit-log', label: 'Audit Log' },
  'semester': { path: '/semester-upgrade', label: 'Semester Manager' },
};
