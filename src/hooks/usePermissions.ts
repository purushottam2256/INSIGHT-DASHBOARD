import { useUserRole } from './useUserRole';

/**
 * Granular RBAC permission system.
 * 
 * Access levels:
 * - Faculty / Class Incharge: NO dashboard access
 * - HOD: dept-scoped access
 * - Principal: all-dept access + final leave approval
 * - Management: all-dept access + system settings
 * - Admin/Developer: full access
 */

export type UserRole = 'faculty' | 'class_incharge' | 'lab_incharge' | 'hod' | 'principal' | 'management' | 'admin' | 'developer';

export interface Permissions {
  // Core access
  canAccessDashboard: boolean;
  
  // Attendance
  canMarkAttendance: boolean;
  
  // Leaves (two-stage)
  canApproveLeaveStage1: boolean;   // HOD approves dept leaves
  canApproveLeaveStage2: boolean;   // Principal gives final approval
  
  // Reports & Analytics
  canViewReports: boolean;
  canGenerateReports: boolean;
  canViewCondonation: boolean;
  canViewEligibility: boolean;
  canExportNAACNBA: boolean;
  
  // Calendar
  canEditCalendar: boolean;
  canEditCalendarAllDepts: boolean;
  
  // Faculty
  canManageFaculty: boolean;
  
  // Notifications
  canBroadcastDept: boolean;        // HOD sends to own dept
  canBroadcastAll: boolean;         // Principal/MGT sends to all
  canAdminBroadcast: boolean;       // Official broadcast system
  
  // Audit & Accountability
  canViewAuditLog: boolean;
  canViewCompliance: boolean;
  canViewBenchmarking: boolean;     // Principal/MGT only
  
  // Section Management
  canMergeSplitSections: boolean;   // HOD only (own dept)
  
  // Semester/Year Upgrade
  canUpgradeSemester: boolean;      // Principal/MGT only
  
  // System
  canAccessSettings: boolean;
  canBulkOperations: boolean;

  // Scope helpers
  isDeptScoped: boolean;            // true for HOD (sees only dept data)
  isAllScope: boolean;              // true for Principal/MGT/Admin
  userDept: string | null;
  userRole: UserRole | null;
}

const NO_ACCESS_ROLES: UserRole[] = ['faculty', 'class_incharge', 'lab_incharge'];
const ELEVATED_ROLES: UserRole[] = ['principal', 'management', 'admin', 'developer'];
const SYSTEM_ROLES: UserRole[] = ['management', 'admin', 'developer'];

export function usePermissions(): Permissions {
  const { role, dept } = useUserRole();
  const r = (role as UserRole) || 'faculty';

  const noAccess = NO_ACCESS_ROLES.includes(r);
  const isElevated = ELEVATED_ROLES.includes(r);
  const isSystem = SYSTEM_ROLES.includes(r);
  const isHod = r === 'hod';
  const isPrincipal = r === 'principal';
  const isAdmin = r === 'admin' || r === 'developer';

  return {
    // Core
    canAccessDashboard: !noAccess,
    
    // Attendance
    canMarkAttendance: isAdmin,
    
    // Leaves
    canApproveLeaveStage1: isHod,                             // HOD ONLY
    canApproveLeaveStage2: isPrincipal,                        // Principal ONLY
    
    // Reports
    canViewReports: isHod || isElevated,
    canGenerateReports: isHod || isElevated,
    canViewCondonation: isHod || isElevated,
    canViewEligibility: isHod || isElevated,
    canExportNAACNBA: isHod || isElevated,
    
    // Calendar
    canEditCalendar: isHod || isElevated,
    canEditCalendarAllDepts: isElevated,                       // HOD can only edit own dept
    
    // Faculty
    canManageFaculty: isHod || isElevated,
    
    // Notifications
    canBroadcastDept: isHod || isElevated,
    canBroadcastAll: isElevated,
    canAdminBroadcast: isHod || isPrincipal || isSystem,       // HOD + Principal + MGT
    
    // Audit
    canViewAuditLog: isHod || isElevated,
    canViewCompliance: isHod || isElevated,
    canViewBenchmarking: isPrincipal || isSystem,              // Principal/MGT only
    
    // Section Management
    canMergeSplitSections: isHod || isAdmin,                   // HOD (dept) + Admin
    
    // Semester
    canUpgradeSemester: isPrincipal || isSystem,               // Principal/MGT only
    
    // System
    canAccessSettings: isSystem,
    canBulkOperations: isHod || isElevated,
    
    // Scope
    isDeptScoped: isHod,
    isAllScope: isElevated,
    userDept: dept,
    userRole: r,
  };
}

/** Helper to get role display info */
export function getRoleInfo(role: string | null) {
  switch (role) {
    case 'hod':
      return { label: 'HOD', color: 'status-badge-hod', emoji: '🟠' };
    case 'principal':
      return { label: 'Principal', color: 'status-badge-principal', emoji: '🔵' };
    case 'management':
      return { label: 'Management', color: 'status-badge-management', emoji: '🟣' };
    case 'admin':
    case 'developer':
      return { label: 'Admin', color: 'status-badge-management', emoji: '⚙️' };
    default:
      return { label: role || 'User', color: '', emoji: '👤' };
  }
}
