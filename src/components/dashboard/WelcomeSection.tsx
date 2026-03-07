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
                // If currently pending at HOD -> escalate to Principal
                if (leave.status === 'pending' || leave.status === 'pending_hod') {
                    dbStatus = 'pending_principal';
                    notifyMsg = 'Your leave request has been approved by HOD and forwarded to Principal.';
                } 
                // If currently pending at Principal -> fully approve
                else if (leave.status === 'pending_principal') {
                    dbStatus = 'approved';
                    notifyMsg = 'Your leave request has been fully approved. Have a good day!';
                }
            }

            const { error } = await supabase
                .from('leaves')
                .update({ status: dbStatus, updated_at: new Date().toISOString() })
                .eq('id', leave.id);
            
            if (error) throw error;

            // Remove from local state
            setLocalLeaves(prev => prev.filter(l => l.id !== leave.id));

            // Send FCM notification
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
    
    // Show only pending leaves to the respective roles, and hide approved ones from the card list
    const visiblePendingLeaves = localLeaves.filter(l => {
        return ['pending', 'pending_hod', 'pending_principal'].includes(l.status);
    });

    const canActOn = (status: string) => {
        if (status === 'pending' || status === 'pending_hod') return permissions.canApproveLeaveStage1;
        if (status === 'pending_principal') return permissions.canApproveLeaveStage2;
        return false;
    };

    // Smart features: Sunday / Holiday detection
    const isSunday = currentTime.getDay() === 0;
    const todayStr = format(currentTime, 'yyyy-MM-dd');
    const [todayEvents, setTodayEvents] = useState<{ title: string; type: string }[]>([]);

    useEffect(() => {
        const fetchTodayEvents = async () => {
            try {
                // Fetch from holidays table
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
        ? { text: '🌤️ Sunday — Enjoy your weekend!', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
        : todayHolidays.length > 0
            ? { text: `🎉 Holiday — ${todayHolidays[0].title}`, color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' }
            : todayExams.length > 0
                ? { text: `📝 Exam Day — ${todayExams[0].title}`, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
                : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Smart Hero Overview Card — spans 2 cols */}
            <Card className="lg:col-span-2 bg-card border border-border shadow-sm rounded-2xl overflow-hidden relative transition-all duration-300">
                <CardContent className="p-6 md:p-8 relative z-10 flex flex-col justify-between h-full">
                    <div>
                        {/* Dynamic Greeting */}
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                {getGreeting()} 👋
                            </h2>
                            <span className="text-xs text-muted-foreground font-medium">
                                {format(currentTime, 'EEEE, MMM d, yyyy')}
                            </span>
                        </div>

                        {/* Smart Banner */}
                        {smartBanner && (
                            <div className={`mt-3 px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center gap-2 ${smartBanner.color}`}>
                                {smartBanner.text}
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            {/* Stat 1 */}
                            <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 flex flex-col justify-center items-center gap-2">
                                <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-foreground leading-tight tracking-tight">{attendancePercent}%</h3>
                                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Attendance Rate</p>
                                </div>
                            </div>
                            
                            {/* Stat 2 */}
                            <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 flex flex-col justify-center items-center gap-2">
                                <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-foreground leading-tight tracking-tight">{isHoliday ? '—' : todayClassesCount}</h3>
                                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{isHoliday ? 'No Classes Today' : 'Classes Today'}</p>
                                </div>
                            </div>

                            {/* Stat 3 */}
                            <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 flex flex-col justify-center items-center gap-2">
                                <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight mt-1">{formattedTime}</h3>
                                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{isHoliday ? 'Day Off' : periodInfo.period}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Faculty Leave Permissions — right column */}
            <Card className="lg:col-span-1 bg-card border border-border shadow-sm rounded-2xl overflow-hidden flex flex-col transition-all duration-300">
                <CardHeader className="pb-2 border-b border-border/20 bg-secondary/30 dark:bg-secondary/20 shrink-0">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                            <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        Faculty Leave Requests
                        {visiblePendingLeaves.length > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary ml-auto">
                                {visiblePendingLeaves.length}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[180px] px-3 py-2">
                        {visiblePendingLeaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8">
                                <CheckCircle2 className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-xs">No pending leave requests</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {visiblePendingLeaves.map((leave) => {
                                    const userCanAct = canActOn(leave.status);
                                    
                                    return (
                                    <div key={leave.id} className="p-3 rounded-lg border border-border/30 bg-card/60 dark:bg-card/40 hover:border-primary/20 transition-all">
                                        <div className="flex items-start gap-2.5 mb-2">
                                            <Avatar className="h-7 w-7 shrink-0 border border-border/30">
                                                <AvatarImage src={leave.profiles?.avatar_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                                    {leave.profiles?.full_name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold text-foreground truncate">{leave.profiles?.full_name || 'Faculty'}</p>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${leave.status === 'pending_principal' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                        {leave.status === 'pending_principal' ? 'Awaiting Principal' : 'Awaiting HOD'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{leave.reason}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/20 text-primary">
                                                        {leave.leave_type === 'full_day' ? 'Full Day' : 'Half Day'}
                                                    </Badge>
                                                    <span className="text-[9px] text-muted-foreground">
                                                        {format(new Date(leave.start_date), 'MMM d')}
                                                        {leave.start_date !== leave.end_date && ` - ${format(new Date(leave.end_date), 'MMM d')}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons - Only show if user has permission for THIS status */}
                                        {userCanAct && (
                                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/40">
                                                <Button 
                                                    size="sm" 
                                                    className="flex-1 h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                                                    disabled={actionLoading === leave.id}
                                                    onClick={() => handleLeaveAction(leave, 'accepted')}
                                                >
                                                    {actionLoading === leave.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                                    {leave.status === 'pending_principal' ? 'Approve' : 'Forward to Principal'}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="flex-1 h-7 text-[10px] border-red-500/20 text-red-500 hover:bg-red-500/10 gap-1"
                                                    disabled={actionLoading === leave.id}
                                                    onClick={() => handleLeaveAction(leave, 'declined')}
                                                >
                                                    {actionLoading === leave.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
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
