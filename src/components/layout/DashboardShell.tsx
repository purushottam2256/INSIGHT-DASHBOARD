import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '@/components/CommandPalette';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAutoEscalation } from '@/hooks/useAutoEscalation';

interface DashboardShellProps {
    children?: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { profile } = useDashboardData();

    // Background auto-escalation (stale leaves, missing sessions)
    useAutoEscalation();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative font-sans">
            {/* Sidebar */}
            <Sidebar 
                isCollapsed={isSidebarCollapsed} 
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileMenuOpen={isMobileMenuOpen}
                closeMobileMenu={() => setIsMobileMenuOpen(false)}
                userName={profile?.full_name}
                userRole={profile?.role}
                userImage={profile?.avatar_url}
            />

            {/* Main Content Wrapper — offset by sidebar width */}
            <div className={cn(
                "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 relative",
                "md:ml-[250px]",
                isSidebarCollapsed && "md:ml-[72px]"
            )}>
                {/* === Animated Background Elements === */}
                
                {/* Floating orb 1 - top right, slow drift */}
                <div className="absolute top-[10%] right-[5%] w-[350px] h-[350px] rounded-full pointer-events-none z-0 animate-float-slow
                    bg-gradient-to-br from-primary/[0.04] via-orange-400/[0.02] to-transparent
                    dark:from-primary/[0.06] dark:via-orange-400/[0.03] dark:to-transparent
                    blur-3xl" />

                {/* Floating orb 2 - bottom left, opposite drift */}
                <div className="absolute bottom-[5%] left-[0%] w-[300px] h-[300px] rounded-full pointer-events-none z-0 animate-float-reverse
                    bg-gradient-to-tr from-amber-500/[0.03] via-orange-300/[0.02] to-transparent
                    dark:from-amber-500/[0.05] dark:via-orange-300/[0.03] dark:to-transparent
                    blur-3xl" />
                
                {/* Rotating ring */}
                <div className="absolute top-[45%] right-[8%] w-[200px] h-[200px] rounded-full pointer-events-none z-0 animate-spin-very-slow
                    border border-primary/[0.05] dark:border-primary/[0.07]" />
                <div className="absolute top-[45%] right-[8%] w-[140px] h-[140px] rounded-full pointer-events-none z-0 animate-spin-very-slow-reverse
                    border border-orange-400/[0.04] dark:border-orange-400/[0.06]
                    translate-x-[30px] translate-y-[30px]" />
                
                {/* Pulsing dots */}
                <div className="absolute top-[18%] right-[22%] w-2.5 h-2.5 rounded-full pointer-events-none z-0 animate-pulse-glow
                    bg-primary/10 dark:bg-primary/15" />
                <div className="absolute top-[65%] right-[12%] w-2 h-2 rounded-full pointer-events-none z-0 animate-pulse-glow
                    bg-amber-400/10 dark:bg-amber-400/15"
                    style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-[35%] left-[65%] w-3 h-3 rounded-full pointer-events-none z-0 animate-pulse-glow
                    bg-orange-500/[0.06] dark:bg-orange-500/[0.09]"
                    style={{ animationDelay: '3s' }} />

                {/* Diagonal gradient streaks */}
                <div className="absolute top-[15%] left-[25%] w-[1px] h-[200px] rotate-45 pointer-events-none z-0 animate-shimmer-line
                    bg-gradient-to-b from-transparent via-primary/[0.06] to-transparent
                    dark:via-primary/[0.09]" />
                <div className="absolute top-[55%] left-[55%] w-[1px] h-[150px] -rotate-[30deg] pointer-events-none z-0 animate-shimmer-line
                    bg-gradient-to-b from-transparent via-amber-500/[0.04] to-transparent
                    dark:via-amber-500/[0.07]"
                    style={{ animationDelay: '2s' }} />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.015] dark:opacity-[0.025]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, hsl(28, 90%, 48%) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />

                <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10 scrollbar-thin">
                    <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children || <Outlet />}
                    </div>
                </main>
            </div>

            {/* Command Palette (Ctrl+K) */}
            <CommandPalette />
        </div>
    );
};
