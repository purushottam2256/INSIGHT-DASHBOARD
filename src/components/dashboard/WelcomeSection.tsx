import { Sparkles, Clock, Activity, CheckCircle2, XCircle, Loader2, Calendar, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LeaveRequest } from '@/types/dashboard';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface WelcomeSectionProps {
    userName: string;
    leaveRequests: LeaveRequest[];
    todayClassesCount: number;
    attendancePercent: number;
    activeODCount: number;
}

const WelcomeSection = ({ 
    userName, 
    leaveRequests, 
    todayClassesCount, 
    attendancePercent, 
    activeODCount 
}: WelcomeSectionProps) => {
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

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getCurrentPeriod = () => {
        const hour = currentTime.getHours();
        const min = currentTime.getMinutes();
        const t = hour * 60 + min;
        if (t < 540) return { period: 'Before Classes', color: 'text-white/50' };
        if (t < 600) return { period: 'Period 1', color: 'text-white' };
        if (t < 660) return { period: 'Period 2', color: 'text-white' };
        if (t < 720) return { period: 'Period 3', color: 'text-white' };
        if (t < 780) return { period: 'Lunch Break', color: 'text-amber-200' };
        if (t < 840) return { period: 'Period 4', color: 'text-white' };
        if (t < 900) return { period: 'Period 5', color: 'text-white' };
        if (t < 960) return { period: 'Period 6', color: 'text-white' };
        if (t < 1020) return { period: 'Period 7', color: 'text-white' };
        return { period: 'After Hours', color: 'text-white/50' };
    };

    const handleLeaveAction = async (leaveId: string, action: 'accepted' | 'declined') => {
        setActionLoading(leaveId);
        try {
            const { error } = await supabase
                .from('leaves')
                .update({ status: action, updated_at: new Date().toISOString() })
                .eq('id', leaveId);
            
            if (error) throw error;

            // Remove from local state
            setLocalLeaves(prev => prev.filter(l => l.id !== leaveId));

            // The DB trigger handle_leave_status_update will auto-send notification via FCM
        } catch (err: any) {
            console.error('Leave action error:', err);
            alert('Failed to update leave: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const firstName = userName?.split(' ')[0] || 'Faculty';
    const periodInfo = getCurrentPeriod();
    const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const pendingLeaves = localLeaves.filter(l => l.status === 'pending');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Welcome Card — spans 2 cols */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-primary via-primary/90 to-orange-500/80 text-white border-0 shadow-2xl shadow-primary/20 overflow-hidden relative">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.04] rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.03] rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
                <div className="absolute top-[20%] right-[15%] w-1.5 h-32 bg-white/[0.06] rotate-12 rounded-full" />
                <div className="absolute bottom-[15%] right-[40%] w-20 h-20 border border-white/[0.08] rounded-full" />
                
                <CardContent className="p-6 md:p-8 relative z-10 flex flex-col justify-between min-h-[180px]">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-3.5 w-3.5 text-white/50" />
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">{getGreeting()}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            {firstName}!
                        </h2>
                        <p className="text-sm text-white/55 mt-2 max-w-lg leading-relaxed">
                            {todayClassesCount > 0 
                                ? `Managing ${todayClassesCount} class${todayClassesCount > 1 ? 'es' : ''} today with ${attendancePercent}% attendance rate.`
                                : 'No classes today. Focus on pending approvals and analytics.'
                            }
                        </p>
                    </div>

                    {/* Bottom stats row */}
                    <div className="flex items-center gap-3 mt-5 flex-wrap">
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-white/60" />
                            <span className="text-sm font-bold text-white tabular-nums">{formattedTime}</span>
                        </div>
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 flex items-center gap-2">
                            <Activity className={`h-3.5 w-3.5 ${periodInfo.color}`} />
                            <span className={`text-sm font-semibold ${periodInfo.color}`}>{periodInfo.period}</span>
                        </div>
                        <div className="px-3 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-white/60" />
                            <span className="text-xs font-medium text-white/70">{formattedDate}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Faculty Leave Permissions — right column */}
            <Card className="lg:col-span-1 border-border/50 bg-card/80 dark:bg-card/60 backdrop-blur-xl ring-1 ring-border/30 shadow-xl overflow-hidden flex flex-col">
                <CardHeader className="pb-2 border-b border-border/20 bg-secondary/30 dark:bg-secondary/20 shrink-0">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                            <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        Faculty Leave Requests
                        {pendingLeaves.length > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary ml-auto">
                                {pendingLeaves.length}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[180px] px-3 py-2">
                        {pendingLeaves.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8">
                                <CheckCircle2 className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-xs">No pending leave requests</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pendingLeaves.map((leave) => (
                                    <div key={leave.id} className="p-3 rounded-lg border border-border/30 bg-card/60 dark:bg-card/40 hover:border-primary/20 transition-all">
                                        <div className="flex items-start gap-2.5 mb-2">
                                            <Avatar className="h-7 w-7 shrink-0 border border-border/30">
                                                <AvatarImage src={leave.profiles?.avatar_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                                    {leave.profiles?.full_name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate">{leave.profiles?.full_name || 'Faculty'}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{leave.reason}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
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
                                        {/* Action Buttons */}
                                        <div className="flex gap-1.5">
                                            <Button 
                                                size="sm" 
                                                className="flex-1 h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                                                disabled={actionLoading === leave.id}
                                                onClick={() => handleLeaveAction(leave.id, 'accepted')}
                                            >
                                                {actionLoading === leave.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                                Accept
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="flex-1 h-7 text-[10px] border-red-500/20 text-red-500 hover:bg-red-500/10 gap-1"
                                                disabled={actionLoading === leave.id}
                                                onClick={() => handleLeaveAction(leave.id, 'declined')}
                                            >
                                                {actionLoading === leave.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default WelcomeSection;
