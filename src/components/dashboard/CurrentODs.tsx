
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCheck, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ODStudent } from '@/types/dashboard';

interface CurrentODsProps {
    students: ODStudent[];
}

const CurrentODs = ({ students }: CurrentODsProps) => {
    return (
        <Card className="h-full border-border/50 shadow-xl flex flex-col overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl ring-1 ring-border/30 transition-all hover:shadow-2xl hover:bg-card/90 dark:hover:bg-card/70">
            <CardHeader className="pb-3 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <div className="p-2 rounded-xl bg-primary/10 dark:bg-primary/15 text-primary backdrop-blur-sm ring-1 ring-primary/20">
                        <UserCheck className="h-4 w-4" />
                    </div>
                    Current On-Duty (OD)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[350px] pr-4 pl-4 pt-4">
                    {students.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                            No active OD students
                        </div>
                    ) : (
                        <div className="space-y-3 pb-4">
                            {students.map((student) => (
                                <div key={student.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 dark:bg-secondary/20 border border-border/30 hover:border-primary/30 transition-all hover:shadow-md group">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-border/30 ring-1 ring-border/20">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                {student.students?.full_name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{student.students?.full_name || 'Unknown Student'}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-mono bg-muted px-1 rounded text-muted-foreground">{student.students?.roll_no}</span>
                                                <span>•</span>
                                                <span>{student.reason}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] gap-1 bg-accent text-accent-foreground hover:bg-accent/80 border-primary/15">
                                        <Clock size={10} />
                                        {student.start_time && student.end_time 
                                            ? `${student.start_time.slice(0,5)} - ${student.end_time.slice(0,5)}`
                                            : 'Full Day'
                                        }
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default CurrentODs;
