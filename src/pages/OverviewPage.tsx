import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import StudentOverviewPage from './StudentOverviewPage'
import FacultyOverviewPage from './FacultyOverviewPage'
import { Users, UserCog } from 'lucide-react'

export default function OverviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Start with whatever is in the URL, or default to students
  const initialTab = searchParams.get('tab') === 'faculty' ? 'faculty' : 'students'
  const [activeTab, setActiveTab] = useState<'students' | 'faculty'>(initialTab)

  // Sync tab state to URL so users can bookmark or share it
  useEffect(() => {
    navigate(`?tab=${activeTab}`, { replace: true })
  }, [activeTab, navigate])

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex bg-muted/50 p-1 rounded-xl w-fit border border-border/50">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'students' 
              ? 'bg-background shadow-sm text-foreground ring-1 ring-border/50' 
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <Users className="h-4 w-4" />
          Students
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'faculty' 
              ? 'bg-background shadow-sm text-foreground ring-1 ring-border/50' 
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
        >
          <UserCog className="h-4 w-4" />
          Faculty
        </button>
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'students' ? <StudentOverviewPage /> : <FacultyOverviewPage />}
      </div>
    </div>
  )
}
