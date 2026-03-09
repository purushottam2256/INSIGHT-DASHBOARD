import { Clock, Activity, CheckCircle2, XCircle, Loader2, Calendar, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LeaveRequest } from '@/types/dashboard';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/fcm';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';

interface WelcomeSectionProps {
    leaveRequests: LeaveRequest[];
    todayClassesCount: number;
    attendancePercent: number;
}

const WelcomeSection = ({ 
    leaveRequests, 
    todayClassesCount, 
    attendancePercent, 
}: WelcomeSectionProps) => {
    const permissions = usePermissions();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [localLeaves, setLocalLeaves] = useState(leaveRequests);

    useEffect(() => {
        setLocalLeaves(leaveRequests);
    }, [leaveRequests]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getCurrentPeriod = () => {
        const hour = currentTime.getHours();
        const min = currentTime.getMinutes();
        const t = hour * 60 + min;
        if (t < 540) return { period: 'Before Classes', color: 'text-white/50' };
        if (t < 600) return { period: 'Period 1', color: 'text-primary' };
        if (t < 660) return { period: 'Period 2', color: 'text-primary' };
        if (t < 720) return { period: 'Period 3', color: 'text-primary' };
        if (t < 780) return { period: 'Lunch Break', color: 'text-amber-500' };
        if (t < 840) return { period: 'Period 4', color: 'text-primary' };
        if (t < 900) return { period: 'Period 5', color: 'text-primary' };
        if (t < 960) return { period: 'Period 6', color: 'text-primary' };
        if (t < 1020) return { period: 'Period 7', color: 'text-primary' };
        return { period: 'After Hours', color: 'text-white/50' };
    };

    const handleLeaveAction = async (leave: LeaveRequest, action: 'accepted' | 'declined') => {
        setActionLoading(leave.id);
        try {
            let dbStatus = '';
            let notifyMsg = '';
            
            if (action === 'declined') {
                dbStatus = 'rejected';
                notifyMsg = 'Your leave request has been declined. Please contact your HOD for details.';
            } else {
                if (leave.status === 'pending' || leave.status === 'pending_hod') {
                    dbStatus = 'pending_principal';
                    notifyMsg = 'Your leave request has been approved by HOD and forwarded to Principal.';
                } else if (leave.status === 'pending_principal') {
                    dbStatus = 'approved';
                    notifyMsg = 'Your leave request has been fully approved. Have a good day!';
                }
            }

            const { error } = await supabase
                .from('leaves')
                .update({ status: dbStatus, updated_at: new Date().toISOString() })
                .eq('id', leave.id);
            
            if (error) throw error;

            setLocalLeaves(prev => prev.filter(l => l.id !== leave.id));

            try {
                await sendNotification([leave.user_id], {
                    title: `Leave Request Update`,
                    body: notifyMsg,
                    type: 'management_update',
                    priority: 'high',
                    data: { leave_id: leave.id, status: dbStatus },
                });
            } catch (fcmErr) {
                console.warn('FCM send failed:', fcmErr);
            }

            toast.success(`Leave ${dbStatus === 'pending_principal' ? 'forwarded to Principal' : dbStatus}`);
        } catch (err: any) {
            console.error('Leave action error:', err);
            toast.error('Failed to update leave: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const periodInfo = getCurrentPeriod();
    const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const visiblePendingLeaves = localLeaves.filter(l => {
        return ['pending', 'pending_hod', 'pending_principal'].includes(l.status);
    });

    const canActOn = (status: string) => {
        if (status === 'pending' || status === 'pending_hod') return permissions.canApproveLeaveStage1;
        if (status === 'pending_principal') return permissions.canApproveLeaveStage2;
        return false;
    };

    const isSunday = currentTime.getDay() === 0;
    const todayStr = format(currentTime, 'yyyy-MM-dd');
    const [todayEvents, setTodayEvents] = useState<{ title: string; type: string }[]>([]);

    useEffect(() => {
        const fetchTodayEvents = async () => {
            try {
                const { data: dbEvents } = await supabase
                    .from('holidays')
                    .select('name, description')
                    .eq('date', todayStr);

                const events: { title: string; type: string }[] = [];
                if (dbEvents) events.push(...dbEvents.map((e: any) => ({ title: e.name, type: 'holiday' })));
                setTodayEvents(events);
            } catch {
                // Silently fail
            }
        };
        fetchTodayEvents();
    }, [todayStr]);

    const getGreeting = () => {
        const h = currentTime.getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const todayHolidays = todayEvents.filter(e => e.type === 'holiday');
    const todayExams = todayEvents.filter(e => e.type === 'exam');
    const isHoliday = isSunday || todayHolidays.length > 0;
    const smartBanner = isSunday
        ? { text: '🌤️ Sunday — Enjoy your weekend!', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-amber-500/10' }
        : todayHolidays.length > 0
            ? { text: `🎉 Holiday — ${todayHolidays[0].title}`, color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-red-500/10' }
            : todayExams.length > 0
                ? { text: `📝 Exam Day — ${todayExams[0].title}`, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-blue-500/10' }
                : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Smart Hero Overview Card — spans 2 cols */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-3xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full">
                    <div>
                        {/* Dynamic Greeting */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-3xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                                {getGreeting()}
                            </h2>
                            <div className="px-4 py-1.5 rounded-full bg-secondary/80 border border-border/40 backdrop-blur-md shadow-inner text-sm font-semibold text-muted-foreground">
                                {format(currentTime, 'EEEE, MMM d, yyyy')}
                            </div>
                        </div>

                        {/* Smart Banner */}
                        {smartBanner && (
                            <div className={`mt-4 px-5 py-3 rounded-2xl border shadow-sm text-sm font-bold flex items-center gap-2 ${smartBanner.color} backdrop-blur-md`}>
                                {smartBanner.text}
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
                            {/* Stat 1 */}
                            <div className="p-5 rounded-2xl border border-border/40 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm flex flex-col justify-center items-center gap-3 relative overflow-hidden group/stat">
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-inner">
                                    <Activity className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-3xl font-black text-foreground leading-tight tracking-tight drop-shadow-sm">{attendancePercent}%</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Attendance Rate</p>
                                </div>
                            </div>
                            
                            {/* Stat 2 */}
                            <div className="p-5 rounded-2xl border border-border/40 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm flex flex-col justify-center items-center gap-3 relative overflow-hidden group/stat">
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-orange-400 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                                <div className="p-3 rounded-xl bg-primary/10 text-primary shadow-inner">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-3xl font-black text-foreground leading-tight tracking-tight drop-shadow-sm">{isHoliday ? '—' : todayClassesCount}</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{isHoliday ? 'No Classes Today' : 'Classes Today'}</p>
                                </div>
                            </div>

                            {/* Stat 3 */}
                            <div className="p-5 rounded-2xl border border-border/40 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm flex flex-col justify-center items-center gap-3 relative overflow-hidden group/stat">
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover/stat:opacity-100 transition-opacity" />
                                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 shadow-inner">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-foreground leading-tight tracking-tight drop-shadow-sm mt-1">{formattedTime}</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{isHoliday ? 'Day Off' : periodInfo.period}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Faculty Leave Permissions — right column */}
            <Card className="lg:col-span-1 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-3xl overflow-hidden flex flex-col">
                <CardHeader className="pb-3 pt-5 border-b border-border/30 bg-secondary/50 dark:bg-secondary/20 shrink-0 backdrop-blur-md">
                    <CardTitle className="text-[15px] font-black tracking-tight flex items-center gap-2.5 text-foreground">
                        <div className="p-[7px] rounded-[10px] bg-gradient-to-br from-primary to-orange-500 text-white shadow-md shadow-primary/20">
                            <UserCheck className="h-4 w-4" />
                        </div>
                        Faculty Leave Requests
                        {visiblePendingLeaves.length > 0 && (
                            <Badge variant="secondary" className="px-2 py-0.5 text-[11px] font-bold bg-primary/15 text-primary ml-auto rounded-full ring-1 ring-primary/20">
                                {visiblePendingLeaves.length} pending
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[210px] px-4 py-3">
                        {visiblePendingLeaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground text-sm opacity-60">
                                <div className="p-4 rounded-full bg-secondary mb-3 ring-1 ring-border/50">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500/70" />
                                </div>
                                <p className="font-semibold tracking-tight">No pending leave requests</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {visiblePendingLeaves.map((leave) => {
                                    const userCanAct = canActOn(leave.status);
                                    
                                    return (
                                    <div key={leave.id} className="p-3.5 rounded-[1.2rem] border border-border/50 bg-white/50 dark:bg-black/20 backdrop-blur-md hover:border-primary/40 hover:shadow-md transition-all duration-300 relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 rounded-[1.2rem] pointer-events-none transition-opacity" />
                                        
                                        <div className="flex items-start gap-3 mb-3 relative z-10">
                                            <Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-xs">
                                                <AvatarImage src={leave.profiles?.avatar_url} />
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary text-xs font-black">
                                                    {leave.profiles?.full_name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">{leave.profiles?.full_name || 'Faculty'}</p>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${leave.status === 'pending_principal' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                        {leave.status === 'pending_principal' ? 'Principal' : 'HOD'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5 pr-2">{leave.reason}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 rounded border bg-transparent font-bold ${leave.leave_type === 'full_day' ? 'text-primary border-primary/30' : 'text-amber-500 border-amber-500/30'}`}>
                                                        {leave.leave_type === 'full_day' ? 'Full Day' : 'Half Day'}
                                                    </Badge>
                                                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(leave.start_date), 'MMM d')}
                                                        {leave.start_date !== leave.end_date && ` - ${format(new Date(leave.end_date), 'MMM d')}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        {userCanAct && (
                                            <div className="flex gap-2 pt-3 border-t border-border/50 relative z-10">
                                                <Button 
                                                    size="sm" 
                                                    className="flex-1 h-8 rounded-xl text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20 border-none group/btn"
                                                    disabled={actionLoading === leave.id}
                                                    onClick={() => handleLeaveAction(leave, 'accepted')}
                                                >
                                                    {actionLoading === leave.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover/btn:scale-110" />}
                                                    {leave.status === 'pending_principal' ? 'Approve' : 'Forward to Principal'}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="flex-1 h-8 rounded-xl text-[11px] font-bold border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 group/btn2 bg-transparent"
                                                    disabled={actionLoading === leave.id}
                                                    onClick={() => handleLeaveAction(leave, 'declined')}
                                                >
                                                    {actionLoading === leave.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover/btn2:scale-110" />}
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default WelcomeSection;
