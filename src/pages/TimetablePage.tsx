import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubjectManager } from "@/components/timetable/SubjectManager"
import { TimetableManager } from "@/components/timetable/TimetableManager"
import { CalendarDays, Library } from "lucide-react"

export function TimetablePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Schedule & Subjects</h1>
        <p className="text-muted-foreground">Manage curriculum subjects and faculty timetables.</p>
      </div>

      <Tabs defaultValue="timetable" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="timetable" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Timetable Manager
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Subject Catalog
          </TabsTrigger>
        </TabsList>
        <TabsContent value="timetable" className="animate-in fade-in-50 duration-500">
          <TimetableManager />
        </TabsContent>
        <TabsContent value="subjects" className="animate-in fade-in-50 duration-500">
          <SubjectManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
