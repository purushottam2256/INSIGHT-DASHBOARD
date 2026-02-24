import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
    LayoutDashboard, 
    GraduationCap, 
    CalendarCheck, 
    Settings,
    LogOut,
    PanelLeftClose,
    CalendarDays,
    GitCompareArrows,
    HelpCircle,
    Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    isMobileMenuOpen: boolean;
    closeMobileMenu: () => void;
    userName?: string;
    userRole?: string;
    userImage?: string;
}

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Registration", href: "/registration", icon: GraduationCap },
    { name: "Timetable", href: "/timetable", icon: Clock },
    { name: "Attendance", href: "/attendance-detail", icon: CalendarCheck },
    { name: "Leave Manager", href: "/leaves", icon: CalendarDays },
    { name: "Compare", href: "/compare", icon: GitCompareArrows },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Help", href: "/help", icon: HelpCircle },
];

export default function Sidebar({
    isCollapsed,
    toggleSidebar,
    isMobileMenuOpen,
    closeMobileMenu,
    userName,
    userRole,
    userImage
}: SidebarProps) {
    const location = useLocation();
    const { signOut } = useAuth();

    const SidebarContent = (
        <div className="flex flex-col h-full bg-gradient-to-b from-orange-600 via-orange-500 to-orange-600 dark:from-orange-700 dark:via-orange-600 dark:to-orange-700 transition-all duration-300">
            {/* Logo / Brand */}
            <div className={cn("shrink-0 border-b border-white/10 transition-all duration-300", isCollapsed ? "px-2 py-4" : "px-5 py-5")}>
                <div className="flex items-center gap-3">
                    {/* Logo Icon — always visible */}
                    <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20 shadow-lg shadow-orange-900/20">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    {/* Brand Text — hidden when collapsed */}
                    <div className={cn("overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                        <h2 className="text-lg font-extrabold tracking-tight text-white leading-none">INSIGHT</h2>
                        <p className="text-[9px] text-white/60 font-medium tracking-[0.08em] mt-0.5">Empowering Education</p>
                    </div>
                </div>
            </div>

            {/* User Profile */}
            <div className={cn("border-b border-white/10 transition-all duration-300", isCollapsed ? "px-2 py-3 flex justify-center" : "px-5 py-4")}>
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    <Avatar className={cn(
                        "border-2 border-white/30 shadow-lg shadow-orange-900/20 transition-all duration-300",
                        isCollapsed ? "h-8 w-8" : "h-12 w-12"
                    )}>
                        <AvatarImage src={userImage} />
                        <AvatarFallback className="bg-white/15 text-white font-bold text-sm">{userName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className={cn("flex flex-col overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                        <span className="text-sm font-bold truncate text-white">{userName || 'Loading...'}</span>
                        <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold truncate">{userRole || 'User'}</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-2">
                <nav className="space-y-0.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href || 
                            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                        return (
                            <Link key={item.name} to={item.href} onClick={closeMobileMenu}>
                                <div className={cn(
                                    "flex items-center gap-3 py-2.5 transition-all duration-200 group cursor-pointer relative",
                                    isCollapsed ? "px-3 justify-center" : "px-5 pr-0",
                                    isActive 
                                        ? "bg-background dark:bg-background text-foreground" 
                                        : "text-white/70 hover:text-white hover:bg-white/10"
                                )}
                                style={isActive && !isCollapsed ? {
                                    borderTopLeftRadius: '12px',
                                    borderBottomLeftRadius: '12px',
                                    marginLeft: '12px',
                                    paddingLeft: '16px',
                                } : isActive && isCollapsed ? {
                                    borderRadius: '12px',
                                    margin: '0 8px',
                                    padding: '10px',
                                } : undefined}
                                >
                                    {/* Outward curves for active tab */}
                                    {isActive && !isCollapsed && (
                                        <>
                                            <div className="absolute -top-[16px] right-0 w-4 h-4 bg-background dark:bg-background" style={{
                                                borderBottomRightRadius: '16px',
                                                boxShadow: '8px 8px 0 8px var(--background)',
                                                background: 'transparent',
                                            }}>
                                                <div className="w-full h-full" style={{
                                                    background: 'linear-gradient(to bottom, var(--tw-gradient-from, rgb(234 88 12)) , var(--tw-gradient-to, rgb(249 115 22)))',
                                                    borderBottomRightRadius: '16px',
                                                }} />
                                            </div>
                                            <div className="absolute -bottom-[16px] right-0 w-4 h-4 bg-background dark:bg-background" style={{
                                                borderTopRightRadius: '16px',
                                                boxShadow: '8px -8px 0 8px var(--background)',
                                                background: 'transparent',
                                            }}>
                                                <div className="w-full h-full" style={{
                                                    background: 'linear-gradient(to top, var(--tw-gradient-from, rgb(234 88 12)) , var(--tw-gradient-to, rgb(249 115 22)))',
                                                    borderTopRightRadius: '16px',
                                                }} />
                                            </div>
                                        </>
                                    )}
                                    <Icon className={cn(
                                        "h-[18px] w-[18px] shrink-0 transition-colors relative z-10",
                                        isActive ? "text-primary" : "group-hover:text-white"
                                    )} />
                                    <span className={cn(
                                        "font-semibold text-[13px] relative z-10 transition-all duration-300",
                                        isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                                    )}>
                                        {item.name}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* Footer / Logout */}
            <div className="border-t border-white/10 mt-auto">
                <div 
                    onClick={() => signOut()}
                    className={cn(
                        "flex items-center gap-3 px-5 py-3 transition-all duration-200 group cursor-pointer",
                        "text-white/60 hover:bg-white/10 hover:text-white",
                        isCollapsed && "justify-center px-3"
                    )}
                >
                    <LogOut className="h-[18px] w-[18px] shrink-0" />
                    <span className={cn("font-medium text-[13px] transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                        Log Out
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden md:block fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[72px]" : "w-[240px]"
            )}>
                {SidebarContent}
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeMobileMenu} />
                    <aside className="absolute inset-y-0 left-0 w-3/4 max-w-[280px] shadow-2xl shadow-orange-900/30 transition-transform duration-300 ease-in-out transform translate-x-0">
                        {SidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}
