export interface DashboardProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'faculty' | 'hod' | 'principal' | 'management' | 'admin';
  dept?: string;
  avatar_url?: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  reason: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: 'pending' | 'accepted' | 'declined';
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface ODStudent {
  id: string; // permission id
  student_id: string;
  type: 'od';
  reason: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  students?: {
    full_name: string;
    roll_no: string;
  };
}

// Add batch to ClassSession
export interface ClassSession {
  id: string;
  subject_id: string;
  date: string;
  start_time: string; // timestamptz
  end_time?: string; // timestamptz
  target_dept: string;
  target_year: number;
  target_section: string;
  batch?: number | null; // Added batch (1, 2, or null for all)
  total_students: number;
  present_count: number;
  absent_count: number;
  od_count: number;
  status?: 'Completed' | 'Ongoing' | 'Upcoming'; // Derived
  subjects?: {
    name: string;
    code: string;
  };
  profiles?: {
    full_name: string;
  };
  room?: string; 
  slot_id?: string;
  faculty_id?: string;
}

// ... existing interfaces ...

export type Timeframe = 'day' | 'week' | 'month' | 'semester';

export interface AttendanceFilter {
    date?: Date;
    year?: string | null;
    section?: string | null;
    period?: string | null;
    dept?: string | null;
    batch?: string | null; // Added batch filter ('1', '2', 'all')
    timeframe?: Timeframe; // Added timeframe
}

export interface AttendanceStat {
    date: string; // label (e.g., "Mon", "Jan 1", "Period 1")
    present: number;
    absent: number;
    od: number;
    total: number;
    // Optional: full date for sorting if needed
    fullDate?: string; 
    period?: string | number; // Added for period-wise aggregation
}

export interface AcademicEvent {
  id: string;
  date: string;
  title: string;
  type: 'holiday' | 'exam' | 'event';
  description?: string;
}
