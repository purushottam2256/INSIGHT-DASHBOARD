import { Routes, Route, Navigate } from "react-router-dom"
import { lazy, Suspense } from "react"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { ThemeProvider } from "@/components/theme-provider"
import DashboardHome from "@/pages/DashboardHome"
import { Login } from "@/pages/Login"
import { RegistrationPage } from "@/pages/RegistrationPage"
import { TimetablePage } from "@/pages/TimetablePage"
import { AttendanceManager } from "@/pages/AttendanceManager"
import { LeaveManager } from "@/pages/LeaveManager"
import { ComparePage } from "@/pages/ComparePage"
import { SettingsPage } from "@/pages/SettingsPage"
import { HelpPage } from "@/pages/HelpPage"
import { Unauthorized } from "@/pages/Unauthorized"
import { ReportsPage } from "@/pages/ReportsPage"
import { CalendarPage } from "@/pages/CalendarPage"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { FullPageLoader } from "@/components/ui/LoadingState"

// Lazy-loaded pages
const CompliancePage = lazy(() => import("@/pages/CompliancePage"))
const BenchmarkingPage = lazy(() => import("@/pages/BenchmarkingPage"))
const AuditLogPage = lazy(() => import("@/pages/AuditLogPage"))
const SemesterUpgrader = lazy(() => import("@/pages/SemesterUpgrader"))
const AdminBroadcastPage = lazy(() => import("@/pages/AdminBroadcastPage"))
const OverviewPage = lazy(() => import("@/pages/OverviewPage"))

const PageLoader = () => <FullPageLoader text="Loading Application" />

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="insight-ui-theme">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route
            path="/*"
            element={
              <ProtectedRoute allowedRoles={['hod', 'principal', 'management', 'developer', 'admin']}>
                  <DashboardShell>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/dashboard" element={<DashboardHome />} />
                        {/* Registration — hidden from principal via sidebar, but route still works */}
                        <Route path="/registration" element={
                          <ProtectedRoute allowedRoles={['hod', 'management', 'developer', 'admin']}>
                            <RegistrationPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/students" element={<Navigate to="/registration" replace />} />
                        <Route path="/faculty" element={<Navigate to="/registration" replace />} />
                        {/* Timetable — hidden from principal */}
                        <Route path="/timetable" element={
                          <ProtectedRoute allowedRoles={['hod', 'management', 'developer', 'admin']}>
                            <TimetablePage />
                          </ProtectedRoute>
                        } />
                        {/* Attendance */}
                        <Route path="/attendance-manager" element={<AttendanceManager />} />
                        <Route path="/attendance-detail" element={<Navigate to="/attendance-manager" replace />} />
                        {/* Leave Manager */}
                        <Route path="/leaves" element={<LeaveManager />} />
                        <Route path="/leave-manager" element={<Navigate to="/leaves" replace />} />
                        {/* Analytics */}
                        <Route path="/compare" element={<ComparePage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/compliance" element={<CompliancePage />} />
                        <Route path="/benchmarking" element={
                          <ProtectedRoute allowedRoles={['principal', 'management', 'developer', 'admin']}>
                            <BenchmarkingPage />
                          </ProtectedRoute>
                        } />
                        {/* Unified Overview */}
                        <Route path="/overview" element={<OverviewPage />} />
                        <Route path="/student-overview" element={<Navigate to="/overview?tab=students" replace />} />
                        <Route path="/faculty-overview" element={<Navigate to="/overview?tab=faculty" replace />} />
                        {/* Management */}
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/audit-log" element={<AuditLogPage />} />
                        <Route path="/broadcast" element={
                          <ProtectedRoute allowedRoles={['hod', 'principal', 'management', 'developer', 'admin']}>
                            <AdminBroadcastPage />
                          </ProtectedRoute>
                        } />
                        {/* System (restricted) */}
                        <Route path="/semester-upgrade" element={
                          <ProtectedRoute allowedRoles={['principal', 'management', 'developer', 'admin']}>
                            <SemesterUpgrader />
                          </ProtectedRoute>
                        } />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/help" element={<HelpPage />} />
                      </Routes>
                    </Suspense>
                  </DashboardShell>
              </ProtectedRoute>
            }
          />
        </Routes>
    </ThemeProvider>
  )
}

export default App
