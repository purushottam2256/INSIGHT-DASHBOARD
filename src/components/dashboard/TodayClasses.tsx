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
    if (percentage >= 85) return "text-emerald-500 from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 bg-emerald-500"; 
    if (percentage >= 75) return "text-amber-500 from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700 bg-amber-500"; 
    return "text-red-500 from-red-400 to-red-600 dark:from-red-500 dark:to-red-700 bg-red-500"; 
  };

  return (
        <Card className="col-span-1 lg:col-span-2 h-full bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300">
            <CardHeader className="pb-4 pt-5 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
                <div className="flex flex-col gap-4">
                    {/* Title + Filters Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                             <div className="p-2 rounded-[10px] bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20">
                                 <Users className="h-4 w-4" />
                             </div>
                             <div>
                                 <h3 className="text-[17px] font-black tracking-tight text-foreground">
                                     Today's Classes
                                 </h3>
                                 <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">Live Surveillance</p>
                             </div>
                        </div>
                    
                        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                            {/* Department Filter */}
                            <Select value={dept} onValueChange={(v) => { setDept(v); setSection('all-sections'); }}>
                                <SelectTrigger className="w-[100px] h-[30px] text-[11px] font-bold border-border/40 bg-background/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-foreground backdrop-blur-md shadow-sm rounded-lg ring-inset focus:ring-1 focus:ring-primary/40 focus:border-primary/40">
                                    <SelectValue placeholder="Dept" />
                                </SelectTrigger>
                                <SelectContent className="backdrop-blur-2xl bg-popover/90 dark:bg-popover/80 border-border/40 rounded-xl shadow-xl">
                                    <SelectItem value="all-dept" className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">All Depts</SelectItem>
                                    {filteredDepartments.map(d => (
                                        <SelectItem key={d.value} value={d.value} className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">{d.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Year Filter */}
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[85px] h-[30px] text-[11px] font-bold border-border/40 bg-background/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-foreground backdrop-blur-md shadow-sm rounded-lg ring-inset focus:ring-1 focus:ring-primary/40 focus:border-primary/40">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent className="backdrop-blur-2xl bg-popover/90 dark:bg-popover/80 border-border/40 rounded-xl shadow-xl">
                                    <SelectItem value="all-years" className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">All Years</SelectItem>
                                    {YEARS.map(y => (
                                        <SelectItem key={y.value} value={y.value} className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">{y.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Section Filter */}
                            <Select value={section} onValueChange={setSection}>
                                <SelectTrigger className="w-[85px] h-[30px] text-[11px] font-bold border-border/40 bg-background/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-foreground backdrop-blur-md shadow-sm rounded-lg ring-inset focus:ring-1 focus:ring-primary/40 focus:border-primary/40">
                                    <SelectValue placeholder="Section" />
                                </SelectTrigger>
                                <SelectContent className="backdrop-blur-2xl bg-popover/90 dark:bg-popover/80 border-border/40 rounded-xl shadow-xl">
                                    <SelectItem value="all-sections" className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">All Sec</SelectItem>
                                    {availableSections.map(s => (
                                        <SelectItem key={s} value={s} className="text-xs font-semibold focus:bg-primary/10 focus:text-primary">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-5 lg:p-6 overflow-hidden flex flex-col">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 auto-rows-max overflow-y-auto pr-2 pb-2 h-[450px] scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border scrollbar-track-transparent">
                    {filteredClasses.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground/60 rounded-2xl border border-dashed border-border/40 bg-muted/10">
                            <Clock className="mb-4 h-12 w-12 opacity-20" />
                            <p className="text-sm font-semibold tracking-tight">No classes found for selected filters.</p>
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

                            const colors = getAttendanceColor(percentage);
                            const textClass = colors.split(' ')[0]; // Returns text-xxx-xxx
                            const bgClass = colors.split(' ')[colors.split(' ').length - 1]; // Returns bg-xxx-xxx

                            return (
                                <div key={index} className="group relative">
                                    {/* Ongoing Ambient Glow */}
                                    {session.status === 'Ongoing' && (
                                         <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-orange-500/30 rounded-3xl blur-md opacity-70 animate-pulse pointer-events-none" />
                                    )}
                                    <Card className={cn(
                                        "h-full relative overflow-hidden flex flex-col border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 rounded-2xl",
                                        session.status === 'Ongoing' && "border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.1)]",
                                        session.status === 'Completed' && "opacity-80 hover:opacity-100" // Completed slightly greyed out
                                    )}>
                                        <CardContent className="p-4 sm:p-5 flex flex-col h-full justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="space-y-1">
                                                        <h4 className="font-bold text-[15px] leading-none text-foreground group-hover:text-primary transition-colors tracking-tight flex items-center gap-1.5">
                                                            {session.target_dept}-{session.target_year}{session.target_section}
                                                            <span className="text-muted-foreground/50 font-normal text-xs px-1.5 py-0.5 rounded-md bg-secondary border border-border/30">
                                                                 {session.slot_id?.toUpperCase() || `P${index + 1}`}
                                                            </span>
                                                        </h4>
                                                        <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest line-clamp-1">
                                                            {(session as any).profiles?.full_name || 'Faculty'}
                                                        </p>
                                                    </div>
                                                    <Badge variant={session.status === 'Ongoing' ? "default" : "secondary"} className={cn(
                                                        "capitalize text-[10px] font-bold px-2 py-0.5 transition-all shadow-none",
                                                        session.status === 'Ongoing' && "bg-gradient-to-r from-primary to-orange-500 text-white shadow-md shadow-primary/20",
                                                        session.status === 'Completed' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                                                        session.status === 'Upcoming' && "bg-muted/50 text-muted-foreground border border-border/50",
                                                    )}>
                                                        {session.status}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-2 bg-secondary/40 p-2 rounded-lg border border-border/30">
                                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    <span className="text-[11px] font-semibold text-foreground line-clamp-1">
                                                        {session.subjects?.name || 'Subject'} <span className="text-muted-foreground/70 tracking-widest font-mono text-[10px]">({session.subjects?.code})</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-5 space-y-4">
                                                {/* Stats */}
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="px-2 py-1.5 rounded-lg bg-green-500/10 dark:bg-green-500/5 flex flex-col items-center border border-green-500/10">
                                                        <span className="text-[9px] font-bold text-green-600/70 dark:text-green-400/70 uppercase">Present</span>
                                                        <span className="text-sm font-black text-green-600 dark:text-green-400">{session.present_count}</span>
                                                    </div>
                                                    <div className="px-2 py-1.5 rounded-lg bg-red-500/10 dark:bg-red-500/5 flex flex-col items-center border border-red-500/10">
                                                        <span className="text-[9px] font-bold text-red-600/70 dark:text-red-400/70 uppercase">Absent</span>
                                                        <span className="text-sm font-black text-red-600 dark:text-red-400">{session.absent_count}</span>
                                                    </div>
                                                    <div className="px-2 py-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/5 flex flex-col items-center border border-amber-500/10">
                                                        <span className="text-[9px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase">OD</span>
                                                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{session.od_count}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Line */}
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs items-center">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance</span>
                                                        <span className={cn("text-xs font-black", textClass)}>{percentage}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-secondary dark:bg-muted/30 rounded-full overflow-hidden shadow-inner relative">
                                                        {/* Base track */}
                                                        <div className="absolute inset-0 bg-secondary/50" />
                                                        {/* Filled percentage */}
                                                        <div 
                                                            className={cn("h-full rounded-full transition-all duration-1000 ease-out relative z-10 shadow-sm", bgClass)}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground pt-3 border-t border-border/30">
                                                    <span className="flex items-center gap-1.5">
                                                        <Users className="h-3 w-3" /> {session.total_students}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Clock className="h-3 w-3" /> {startTimeDisplay}{endTimeDisplay && ` - ${endTimeDisplay}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ClassAttendance;
