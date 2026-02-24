import { Routes, Route, Navigate } from "react-router-dom"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { ThemeProvider } from "@/components/theme-provider"
import DashboardHome from "@/pages/DashboardHome"
import { Login } from "@/pages/Login"
import { StudentRegistration } from "@/pages/StudentRegistration"
import { FacultyManagement } from "@/pages/FacultyManagement"
import { Unauthorized } from "@/pages/Unauthorized"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

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
                    <Routes>
                      <Route path="/dashboard" element={<DashboardHome />} />
                      {/* Registration (combines students + faculty) */}
                      <Route path="/registration" element={<StudentRegistration />} />
                      <Route path="/students" element={<Navigate to="/registration" replace />} />
                      <Route path="/faculty" element={<FacultyManagement />} />
                      {/* Placeholder routes for upcoming tabs */}
                      <Route path="/timetable" element={
                        <div className="space-y-4">
                          <h1 className="text-3xl font-bold text-primary tracking-tight">Timetable Manager</h1>
                          <p className="text-muted-foreground">Coming in Phase 3 — Drag-and-drop timetable management with OCR upload.</p>
                        </div>
                      } />
                      <Route path="/attendance-detail" element={
                        <div className="space-y-4">
                          <h1 className="text-3xl font-bold text-primary tracking-tight">Attendance Details</h1>
                          <p className="text-muted-foreground">Coming in Phase 4 — Detailed per-class attendance with date navigation and bunk file generator.</p>
                        </div>
                      } />
                      <Route path="/leaves" element={
                        <div className="space-y-4">
                          <h1 className="text-3xl font-bold text-primary tracking-tight">Leave Manager</h1>
                          <p className="text-muted-foreground">Coming in Phase 4 — Faculty leave management with substitute assignment.</p>
                        </div>
                      } />
                      <Route path="/compare" element={
                        <div className="space-y-4">
                          <h1 className="text-3xl font-bold text-primary tracking-tight">Compare</h1>
                          <p className="text-muted-foreground">Coming in Phase 5 — Class comparison charts and trend analysis.</p>
                        </div>
                      } />
                      <Route path="/settings" element={
                        <div className="space-y-4">
                          <h1 className="text-3xl font-bold text-primary tracking-tight">Settings</h1>
                          <p className="text-muted-foreground">Coming in Phase 5 — Profile, department, calendar, and app configuration.</p>
                        </div>
                      } />
                      <Route path="/help" element={
                        <div className="space-y-4">
                          <h1 className="text-3xl font-bold text-primary tracking-tight">Help & Support</h1>
                          <p className="text-muted-foreground">Coming in Phase 5 — Guides, FAQ, and support contact.</p>
                        </div>
                      } />
                    </Routes>
                  </DashboardShell>
              </ProtectedRoute>
            }
          />
        </Routes>
    </ThemeProvider>
  )
}

export default App
