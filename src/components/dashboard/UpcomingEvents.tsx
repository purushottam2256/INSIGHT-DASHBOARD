import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ArrowRight, Clock as ClockIcon, PartyPopper, GraduationCap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AcademicEvent } from '@/types/dashboard';
import { format, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface UpcomingEventsProps {
    events: AcademicEvent[];
}

const typeConfig = {
    holiday: { icon: PartyPopper, label: 'Holiday', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
    exam: { icon: GraduationCap, label: 'Exam', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    event: { icon: Star, label: 'Event', color: 'bg-primary/10 text-primary border-primary/20' },
};

const UpcomingEvents = ({ events }: UpcomingEventsProps) => {
  const navigate = useNavigate();

  return (
    <Card className="h-full border-border/50 shadow-xl flex flex-col overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl ring-1 ring-border/30 transition-all hover:shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-secondary/30 dark:bg-secondary/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/15 text-primary ring-1 ring-primary/20">
                    <Calendar className="h-3.5 w-3.5" />
                </div>
                Holidays & Events
            </CardTitle>
             <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')} className="text-xs h-7 gap-1 text-muted-foreground hover:text-primary">
                View All <ArrowRight size={12} />
            </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[300px] px-4 pb-4 pt-3">
                <div className="space-y-2.5">
                    {events.map((event, index) => {
                        const eventDate = new Date(event.date);
                        const config = typeConfig[event.type] || typeConfig.event;
                        const Icon = config.icon;
                        const dateLabel = isToday(eventDate) ? 'Today' : isTomorrow(eventDate) ? 'Tomorrow' : format(eventDate, 'MMM d');
                        
                        return (
                            <div key={index} className="flex gap-3 p-3 rounded-xl border border-border/30 bg-card/60 dark:bg-card/40 hover:bg-card/80 dark:hover:bg-card/60 hover:border-primary/20 transition-all group cursor-pointer">
                                {/* Date Box */}
                                <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-muted/50 dark:bg-muted/30 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                    <span className="text-[9px] font-bold uppercase leading-none">{format(eventDate, 'MMM')}</span>
                                    <span className="text-base font-bold leading-none mt-0.5">{format(eventDate, 'd')}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="text-xs font-semibold truncate text-foreground group-hover:text-primary transition-colors">{event.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className={`text-[8px] h-4 px-1.5 ${config.color}`}>
                                            <Icon className="h-2.5 w-2.5 mr-0.5" />
                                            {config.label}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <ClockIcon size={9} /> {dateLabel}
                                        </span>
                                    </div>
                                    {event.description && (
                                        <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-1">{event.description}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="text-center text-muted-foreground py-10 text-sm flex flex-col items-center">
                            <Calendar className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-xs">No upcoming holidays or events</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
  );
};

export default UpcomingEvents;
