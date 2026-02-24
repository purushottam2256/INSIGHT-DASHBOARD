import React, { useMemo } from 'react';

import WelcomeSection from '@/components/dashboard/WelcomeSection';
import AttendanceAnalytics from '@/components/dashboard/AttendanceAnalytics';
import ClassAttendance from '@/components/dashboard/TodayClasses';
import UpcomingEvents from '@/components/dashboard/UpcomingEvents';
import Footer from '@/components/dashboard/Footer';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';

import { useDashboardData } from '@/hooks/useDashboardData';
import { Skeleton } from "@/components/ui/skeleton";

const DashboardHome = () => {
    const [analyticsFilters, setAnalyticsFilters] = React.useState<any>({
        date: new Date(),
        year: null,
        section: null,
        period: null,
        dept: null,
        timeframe: 'week',
    });

    const { 
        profile, 
        leaveRequests, 
        odStudents, 
        todayClasses, 
        upcomingEvents,
        stats,
        sessions,
        loading 
    } = useDashboardData(analyticsFilters);

    // Compute hero stats from real data
    const heroStats = useMemo(() => {
        const totalStudents = todayClasses.reduce((acc, c) => acc + (c.total_students || 0), 0);
        const presentStudents = todayClasses.reduce((acc, c) => acc + (c.present_count || 0) + (c.od_count || 0), 0);
        const attendancePercent = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;
        
        return {
            todayClassesCount: todayClasses.length,
            attendancePercent,
            activeODCount: odStudents.length,
        };
    }, [todayClasses, odStudents]);

    // Only show full page skeleton on initial load
    if (loading && !profile) {
        return (
            <div className="space-y-6">
                {/* Welcome Section Skeleton */}
                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                    <Skeleton className="flex-1 h-[200px] rounded-xl shimmer" />
                    <Skeleton className="w-full md:w-[400px] h-[200px] rounded-xl shimmer" />
                </div>

                {/* Dashboard Grid Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Skeleton className="h-[400px] w-full rounded-xl shimmer" />
                    </div>
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <Skeleton className="h-[250px] w-full rounded-xl shimmer" />
                        <Skeleton className="h-[200px] w-full rounded-xl shimmer" />
                    </div>
                </div>

                {/* Bottom Row Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Skeleton className="h-[350px] w-full rounded-xl shimmer" />
                    </div>
                    <Skeleton className="h-[350px] w-full rounded-xl shimmer" />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Hero Section */}
            <div className="animate-fade-in">
                <WelcomeSection 
                    userName={profile?.full_name || 'Faculty'} 
                    leaveRequests={leaveRequests}
                    todayClassesCount={heroStats.todayClassesCount}
                    attendancePercent={heroStats.attendancePercent}
                    activeODCount={heroStats.activeODCount}
                />
            </div>
            
            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* Trend Pulse — Full Width Left */}
                <div className="lg:col-span-2 animate-fade-in animate-fade-in-delay-1">
                    <AttendanceAnalytics 
                        stats={stats} 
                        sessions={sessions}
                        onFilterChange={setAnalyticsFilters}
                        loading={loading}
                    />
                </div>
                
                {/* Right Column: Today's Overview (Class-wise) */}
                <div className="lg:col-span-1 animate-fade-in animate-fade-in-delay-2">
                    <DashboardCharts 
                        todayClasses={todayClasses} 
                        type="attendance-donut" 
                        title="Today's Overview" 
                    />
                </div>
                
                {/* Bottom Row: Today's Classes + Events */}
                <div className="lg:col-span-2 animate-fade-in animate-fade-in-delay-3">
                    <ClassAttendance classes={todayClasses} />
                </div>
                <div className="lg:col-span-1 animate-fade-in animate-fade-in-delay-4">
                    <UpcomingEvents events={upcomingEvents} />
                </div>
            </div>
            
            <div className="animate-fade-in animate-fade-in-delay-4">
                <Footer />
            </div>
        </>
    );
};

export default DashboardHome;
