import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubjectManager } from "@/components/timetable/SubjectManager"
import { TimetableManager } from "@/components/timetable/TimetableManager"
import { FacultyScheduleView } from "@/components/timetable/FacultyScheduleView"
import { CalendarDays, Library, Users } from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"

export function TimetablePage() {
  const { userRole } = usePermissions()
  const canEdit = ['hod', 'admin', 'management', 'developer', 'principal'].includes(userRole || '')

  return (
    <div className="space-y-6">
      <Tabs defaultValue="timetable" className="w-full">
        <TabsList className="mb-4 print:hidden">
          <TabsTrigger value="timetable" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Schedule Hub
          </TabsTrigger>
          {canEdit && (
            <>
              <TabsTrigger value="subjects" className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                Subject Catalog
              </TabsTrigger>
              <TabsTrigger value="faculty" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Faculty Schedules
              </TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="timetable" className="animate-in fade-in-50 duration-500">
          <TimetableManager />
        </TabsContent>
        {canEdit && (
          <>
            <TabsContent value="subjects" className="animate-in fade-in-50 duration-500">
              <SubjectManager />
            </TabsContent>
            <TabsContent value="faculty" className="animate-in fade-in-50 duration-500">
              <FacultyScheduleView />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
