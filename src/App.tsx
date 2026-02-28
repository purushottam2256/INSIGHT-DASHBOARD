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
import { Loader2 } from "lucide-react"

// Lazy-loaded new pages
const CompliancePage = lazy(() => import("@/pages/CompliancePage"))
const BenchmarkingPage = lazy(() => import("@/pages/BenchmarkingPage"))
const SectionManager = lazy(() => import("@/pages/SectionManager"))
const AuditLogPage = lazy(() => import("@/pages/AuditLogPage"))
const SemesterUpgrader = lazy(() => import("@/pages/SemesterUpgrader"))
const AdminBroadcastPage = lazy(() => import("@/pages/AdminBroadcastPage"))

const PageLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

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
                        {/* Registration (combines students + faculty) */}
                        <Route path="/registration" element={<RegistrationPage />} />
                        <Route path="/students" element={<Navigate to="/registration" replace />} />
                        <Route path="/faculty" element={<Navigate to="/registration" replace />} />
                        {/* Timetable */}
                        <Route path="/timetable" element={<TimetablePage />} />
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
                        {/* Management */}
                        <Route path="/sections" element={<SectionManager />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/audit-log" element={<AuditLogPage />} />
                        <Route path="/broadcast" element={
                          <ProtectedRoute allowedRoles={['principal', 'management', 'developer', 'admin']}>
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
