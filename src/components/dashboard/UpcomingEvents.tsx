import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ArrowRight, Clock as ClockIcon, PartyPopper, GraduationCap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AcademicEvent } from '@/types/dashboard';
import { format, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface UpcomingEventsProps {
    events: AcademicEvent[];
}

const typeConfig = {
    holiday: { icon: PartyPopper, label: 'Holiday', color: 'bg-red-500 text-white shadow-md shadow-red-500/20' },
    exam: { icon: GraduationCap, label: 'Exam', color: 'bg-amber-500 text-white shadow-md shadow-amber-500/20' },
    event: { icon: Star, label: 'Event', color: 'bg-primary text-white shadow-md shadow-primary/20' },
};

const UpcomingEvents = ({ events }: UpcomingEventsProps) => {
  const navigate = useNavigate();

  return (
    <Card className="h-full bg-card/60 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20">
            <div className="flex items-center gap-3">
                 <div className="p-2 rounded-[10px] bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20">
                     <Calendar className="h-4 w-4" />
                 </div>
                 <div>
                     <CardTitle className="text-[15px] font-black tracking-tight text-foreground">
                         Holidays & Events
                     </CardTitle>
                 </div>
            </div>
             <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')} className="text-[11px] h-8 font-bold gap-1 text-muted-foreground hover:text-primary bg-background/50 hover:bg-primary/10 border border-border/40 rounded-xl transition-all shadow-sm">
                View All <ArrowRight size={12} />
            </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[300px] px-5 pb-5 pt-4 scrollbar-thin scrollbar-thumb-border/50 hover:scrollbar-thumb-border scrollbar-track-transparent">
                <div className="space-y-3">
                    {events.map((event, index) => {
                        const eventDate = new Date(event.date);
                        const config = typeConfig[event.type] || typeConfig.event;
                        const Icon = config.icon;
                        const dateLabel = isToday(eventDate) ? 'Today' : isTomorrow(eventDate) ? 'Tomorrow' : format(eventDate, 'MMM d');
                        
                        return (
                            <div key={index} className="flex gap-4 p-3.5 rounded-2xl border border-border/40 bg-background/40 hover:bg-card hover:border-border/80 transition-all group cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden">
                                {/* Subtle Hover Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                {/* Date Box */}
                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-secondary/80 border border-border/50 text-muted-foreground group-hover:bg-primary group-hover:text-white group-hover:border-primary/50 transition-colors shrink-0 shadow-inner relative z-10">
                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">{format(eventDate, 'MMM')}</span>
                                    <span className="text-xl font-black leading-none mt-1">{format(eventDate, 'd')}</span>
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                                    <h4 className="text-[13px] font-bold truncate text-foreground group-hover:text-primary transition-colors tracking-tight">{event.title}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Badge variant="secondary" className={cn("text-[8px] font-bold h-[18px] px-2 uppercase tracking-widest border-none transition-all", config.color)}>
                                            <Icon className="h-2.5 w-2.5 mr-1" strokeWidth={3} />
                                            {config.label}
                                        </Badge>
                                        <span className="text-[10px] font-semibold text-muted-foreground/80 flex items-center gap-1">
                                            <ClockIcon size={10} /> {dateLabel}
                                        </span>
                                    </div>
                                    {event.description && (
                                        <p className="text-[10px] font-medium text-muted-foreground/60 mt-1.5 line-clamp-1 group-hover:text-muted-foreground/80 transition-colors">{event.description}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="text-center text-muted-foreground/70 py-12 text-sm flex flex-col items-center bg-muted/10 rounded-2xl border border-dashed border-border/40">
                            <Calendar className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-semibold tracking-tight text-xs">No upcoming holidays or events</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
  );
};

export default UpcomingEvents;
