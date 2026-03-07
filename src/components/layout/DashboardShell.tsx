import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '@/components/CommandPalette';
import ZenBackground from '@/components/ZenBackground';
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
            {/* Global Ambient Orbs (Premium Glassmorphism Effect) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 print:hidden">
                <div className="absolute -top-[10%] -left-[5%] w-[500px] h-[500px] rounded-full bg-primary/15 dark:bg-primary/10 blur-[100px]" />
                <div className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-orange-500/15 dark:bg-orange-500/10 blur-[120px]" />
                <div className="absolute -bottom-[10%] left-[20%] w-[700px] h-[700px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[130px]" />
            </div>

            {/* Sidebar */}
            <div className="print:hidden">
                <Sidebar 
                    isCollapsed={isSidebarCollapsed} 
                    toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    isMobileMenuOpen={isMobileMenuOpen}
                    closeMobileMenu={() => setIsMobileMenuOpen(false)}
                    userName={profile?.full_name}
                    userRole={profile?.role}
                    userImage={profile?.avatar_url}
                />
            </div>

            {/* Main Content Wrapper — offset by sidebar width */}
            <div className={cn(
                "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 relative bg-background",
                "md:ml-[250px]",
                isSidebarCollapsed && "md:ml-[72px]",
                "print:ml-0 print:h-auto print:overflow-visible"
            )}>
                {/* === Zen Background (Interactive Cursor Tracking) === */}
                <div className="print:hidden">
                    <ZenBackground />
                </div>

                <div className="print:hidden">
                    <Header 
                        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        userName={profile?.full_name}
                    />
                </div>
                
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10 scrollbar-thin relative backdrop-blur-[1px] print:p-0 print:m-0 print:overflow-visible">
                    <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 print:max-w-none print:animate-none">
                        {children || <Outlet />}
                    </div>
                </main>
            </div>

            {/* Command Palette (Ctrl+K) */}
            <CommandPalette />
        </div>
    );
};
