import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentRegistration } from "./StudentRegistration";
import { FacultyManagement } from "./FacultyManagement";
import { Users, UserCog } from "lucide-react";
import { useSearchParams } from 'react-router-dom';

export function RegistrationPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('students');
  const highlightTerm = searchParams.get('highlight') || '';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'faculty') setActiveTab('faculty');
    else if (tab === 'students') setActiveTab('students');
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {highlightTerm && (
        <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary font-medium inline-flex items-center gap-2 animate-fade-in">
          🔍 Searching for: <span className="font-bold">{decodeURIComponent(highlightTerm)}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[320px]">
          <TabsTrigger value="students" className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            Students
          </TabsTrigger>
          <TabsTrigger value="faculty" className="flex items-center gap-2 text-xs">
            <UserCog className="h-3.5 w-3.5" />
            Faculty
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4 border-none p-0 outline-none">
          <StudentRegistration />
        </TabsContent>
        <TabsContent value="faculty" className="mt-4 border-none p-0 outline-none">
          <FacultyManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
