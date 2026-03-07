import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClassSession } from '@/types/dashboard';
import { format } from 'date-fns';
import { DEPARTMENTS, YEARS, SECTIONS } from "@/lib/constants";
import { useUserRole } from "@/hooks/useUserRole";

interface ClassAttendanceProps {
  classes: ClassSession[];
  onFilterChange?: (filters: any) => void;
}


const ClassAttendance = ({ classes, onFilterChange }: ClassAttendanceProps) => {
    const [year, setYear] = React.useState<string>("all-years");
    const [section, setSection] = React.useState<string>("all-sections");
    const [dept, setDept] = React.useState<string>("all-dept");
    const { role, dept: userDept } = useUserRole();

    // HOD Limitation
    React.useEffect(() => {
        if (role === 'hod' && userDept) {
            setDept(userDept);
        }
    }, [role, userDept]);

    const filteredDepartments = React.useMemo(() => {
        if (role === 'hod' && userDept) {
            return DEPARTMENTS.filter(d => d.value === userDept);
        }
        return DEPARTMENTS;
    }, [role, userDept]);

    // Section logic: CSE gets A-F, other depts get A-C only
    const getSectionsForDept = (deptValue: string) => {
        const isFullAccess = deptValue === 'CSE' || ['management', 'principal', 'admin', 'developer'].includes(role || '');
        return isFullAccess ? SECTIONS.slice(0, 6) : SECTIONS.slice(0, 3);
    };

    // Sync filters with parent
    React.useEffect(() => {
        if (onFilterChange) {
            onFilterChange({
                date: new Date(),
                year: year === "all-years" ? null : year,
                section: section === "all-sections" ? null : section,
                dept: dept === "all-dept" ? null : dept,
            });
        }
    }, [year, section, dept]);

    // Available sections based on selected dept
    const availableSections = React.useMemo(() => {
        if (dept === 'all-dept') return SECTIONS.slice(0, 6);
        return getSectionsForDept(dept);
    }, [dept, role]);

    // Local Filtering
    const filteredClasses = classes.filter(session => {
        const matchYear = year === "all-years" || session.target_year?.toString() === year;
        const matchSection = section === "all-sections" || session.target_section === section;
        const matchDept = dept === "all-dept" || session.target_dept === dept;
        return matchYear && matchSection && matchDept;
    });


  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return "text-green-600 dark:text-green-500"; 
    if (percentage >= 75) return "text-amber-600 dark:text-amber-500"; 
    return "text-red-600 dark:text-red-500"; 
  };

  return (
        <Card className="h-full bg-card border border-border shadow-sm flex flex-col overflow-hidden rounded-2xl transition-all duration-300">
            <CardHeader className="pb-4 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                <div className="flex flex-col gap-3">
                    {/* Title + Filters Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-primary/10 dark:bg-primary/15 text-primary ring-1 ring-primary/20">
                                <Users className="h-4 w-4" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight text-foreground">Classes</h3>
                        </div>
                    
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Department Filter */}
                            <Select value={dept} onValueChange={(v) => { setDept(v); setSection('all-sections'); }}>
                                <SelectTrigger className="w-[100px] h-8 text-xs bg-secondary/50 dark:bg-secondary/30 border-border/50 text-foreground">
                                    <SelectValue placeholder="Dept" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                                    <SelectItem value="all-dept">All Depts</SelectItem>
                                    {filteredDepartments.map(d => (
                                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Year Filter */}
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[85px] h-8 text-xs bg-secondary/50 dark:bg-secondary/30 border-border/50 text-foreground">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                                    <SelectItem value="all-years">All Years</SelectItem>
                                    {YEARS.map(y => (
                                        <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Section Filter */}
                            <Select value={section} onValueChange={setSection}>
                                <SelectTrigger className="w-[85px] h-8 text-xs bg-secondary/50 dark:bg-secondary/30 border-border/50 text-foreground">
                                    <SelectValue placeholder="Section" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                                    <SelectItem value="all-sections">All Sec</SelectItem>
                                    {availableSections.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClasses.length === 0 ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 dark:bg-muted/10 rounded-xl border border-dashed border-border/40">
                            <Clock className="mb-2 h-8 w-8 opacity-20" />
                            <p className="text-sm">No classes found for selected filters.</p>
                        </div>
                    ) : (
                        filteredClasses.map((session, index) => {
                            const presentWithOd = session.present_count + session.od_count;
                            const percentage = session.total_students > 0 
                                ? Math.round((presentWithOd / session.total_students) * 100) 
                                : 0;
                            
                            const startTimeDisplay = session.start_time ? format(new Date(session.start_time), 'h:mm a') : 'TBD';
                            const endTimeDisplay = session.end_time 
                                ? format(new Date(session.end_time), 'h:mm a') 
                                : '';

                            return (
                                <Card key={index} className={cn(
                                    "h-full border border-border/30 bg-card/60 dark:bg-card/40 hover:bg-card/80 dark:hover:bg-card/60 hover:border-primary/30 transition-all group shadow-sm",
                                    session.status === 'Ongoing' && "ring-1 ring-primary/30 border-primary/20"
                                )}>
                                    <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                            <div>
                                                {/* Class heading: CSE-3A • P2 */}
                                                <h4 className="font-bold text-sm leading-none mb-1 text-foreground group-hover:text-primary transition-colors">
                                                    {session.target_dept}-{session.target_year}{session.target_section} <span className="text-muted-foreground font-normal">•</span> {session.slot_id?.toUpperCase() || `P${index + 1}`}
                                                </h4>
                                                {/* Faculty name */}
                                                <p className="text-[11px] text-muted-foreground">
                                                    {(session as any).profiles?.full_name || 'Faculty'}
                                                </p>
                                                {/* Subject name below */}
                                                <div className="flex items-center gap-1 mt-1">
                                                    <BookOpen className="h-3 w-3 text-muted-foreground/50" />
                                                    <span className="text-[10px] text-muted-foreground/70">
                                                        {session.subjects?.name || 'Subject'} ({session.subjects?.code})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant={session.status === 'Ongoing' ? "default" : "secondary"} className={cn(
                                                    "capitalize text-[9px] px-1.5 py-0.5",
                                                    session.status === 'Ongoing' && "bg-primary animate-pulse shadow-lg shadow-primary/20",
                                                    session.status === 'Completed' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                                                    session.status === 'Upcoming' && "bg-muted text-muted-foreground",
                                                )}>
                                                    {session.status}
                                                </Badge>
                                            </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                                            <div className="p-1.5 rounded bg-muted/40 dark:bg-muted/20 flex flex-col items-center">
                                                <span className="text-[9px] text-muted-foreground">Present</span>
                                                <span className="text-sm font-bold text-foreground">{session.present_count}</span>
                                            </div>
                                            <div className="p-1.5 rounded bg-muted/40 dark:bg-muted/20 flex flex-col items-center">
                                                <span className="text-[9px] text-muted-foreground">Absent</span>
                                                <span className="text-sm font-bold text-red-500">{session.absent_count}</span>
                                            </div>
                                            <div className="p-1.5 rounded bg-muted/40 dark:bg-muted/20 flex flex-col items-center">
                                                <span className="text-[9px] text-muted-foreground">OD</span>
                                                <span className="text-sm font-bold text-amber-500">{session.od_count}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Progress */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-[10px] text-muted-foreground">Attendance</span>
                                                <span className={cn("text-[10px] font-bold", getAttendanceColor(percentage))}>{percentage}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full rounded-full transition-all duration-500", 
                                                        percentage >= 85 ? "bg-green-500" :
                                                        percentage >= 75 ? "bg-amber-500" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1.5 border-t border-border/20">
                                            <span className="flex items-center gap-1">
                                                <Users size={10} /> {session.total_students} students
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} /> {startTimeDisplay}{endTimeDisplay && ` - ${endTimeDisplay}`}
                                            </span>
                                        </div>
                                    </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ClassAttendance;
