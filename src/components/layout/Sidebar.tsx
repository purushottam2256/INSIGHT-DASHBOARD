import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  GitCompareArrows,
  HelpCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
  CalendarRange,
  Shield,
  BarChart3,
  Megaphone,
  AlertTriangle,
  UserSearch,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import { usePermissions, getRoleInfo } from "@/hooks/usePermissions";

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
  userName?: string;
  userRole?: string;
  userImage?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  requiredPermission?: string;
  danger?: boolean;
  hiddenForRoles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function Sidebar({
  isCollapsed,
  toggleSidebar,
  isMobileMenuOpen,
  closeMobileMenu,
  userName,
  userImage,
}: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const permissions = usePermissions();
  const roleInfo = getRoleInfo(permissions.userRole);

  // ── Navigation groups ──
  const navGroups: NavGroup[] = [
    {
      label: "Core",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Registration", href: "/registration", icon: GraduationCap, hiddenForRoles: ['principal'] },
        { name: "Timetable", href: "/timetable", icon: Clock, hiddenForRoles: ['principal'] },
        { name: "Monthly Overview", href: "/attendance-manager", icon: CalendarCheck },
        { name: "Leave Manager", href: "/leaves", icon: CalendarDays },
      ],
    },
    {
      label: "Analytics",
      items: [
        { name: "Compare", href: "/compare", icon: GitCompareArrows },
        { name: "Reports", href: "/reports", icon: FileSpreadsheet, requiredPermission: "canViewReports" },
        { name: "Project Fees", href: "/project-fees", icon: IndianRupee, requiredPermission: "canViewProjectFees" },
        { name: "Benchmarking", href: "/benchmarking", icon: BarChart3, requiredPermission: "canViewBenchmarking" },
      ],
    },
    {
      label: "Management",
      items: [
        { name: "Overview", href: "/overview", icon: UserSearch, requiredPermission: "canViewReports" },
        { name: "Calendar", href: "/calendar", icon: CalendarRange, requiredPermission: "canEditCalendar" },
        { name: "Broadcast", href: "/broadcast", icon: Megaphone, requiredPermission: "canAdminBroadcast" },
      ],
    },
    {
      label: "System",
      items: [
        { name: "Audit Log", href: "/audit-log", icon: Shield, requiredPermission: "canViewAuditLog" },
        { name: "Semester Manager", href: "/semester-upgrade", icon: AlertTriangle, requiredPermission: "canUpgradeSemester", danger: true },
        { name: "Settings", href: "/settings", icon: Settings },
        { name: "Help", href: "/help", icon: HelpCircle },
      ],
    },
  ];

  // Filter by permission + role
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.hiddenForRoles?.includes(permissions.userRole || '')) return false;
        if (!item.requiredPermission) return true;
        return (permissions as any)[item.requiredPermission] === true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const SidebarContent = (
    <div className="flex flex-col h-full bg-sidebar/90 backdrop-blur-3xl border-r border-border/40 dark:border-white/5 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 relative overflow-hidden z-20">
      {/* ── Ambient Sidebar Orbs ── */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-primary/20 blur-[100px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-[40%] -right-32 w-80 h-80 bg-orange-500/15 blur-[100px] pointer-events-none -z-10 rounded-full mix-blend-screen" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/20 blur-[100px] pointer-events-none -z-10 rounded-full" />

      {/* ── Brand Section ── */}
      <div
        className={cn(
          "shrink-0 border-b border-border/40 dark:border-white/[0.06] transition-all duration-300 relative bg-gradient-to-b from-primary/5 to-transparent",
          isCollapsed ? "px-2 py-4" : "px-6 py-6",
        )}
      >
        <Link to="/dashboard" onClick={closeMobileMenu} className="flex items-center gap-4 cursor-pointer group/brand outline-none">
          <div className="relative flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-[1.2rem] bg-gradient-to-br from-primary/50 to-amber-500/50 blur-xl opacity-0 group-hover/brand:opacity-40 transition-opacity duration-700" />
            <div className="relative p-1.5 rounded-[1.2rem] bg-white dark:bg-card shadow-xl shadow-primary/10 border border-border/50 group-hover/brand:scale-105 transition-transform duration-500">
                <img src={logo} alt="INSIGHT Logo" className="w-[36px] h-[36px] object-contain" />
            </div>
          </div>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <h2 className="text-2xl font-black tracking-tight leading-none text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
              INSIGHT
            </h2>
            <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase mt-1 flex items-center gap-1.5 bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              Empowering Education
            </p>
          </div>
        </Link>
      </div>

      {/* ── User Profile Card + Collapse Toggle ── */}
      <div
        className={cn(
          "border-b border-border/40 dark:border-white/[0.06] transition-all duration-300 relative",
          isCollapsed ? "px-2 py-3" : "px-4 py-5",
        )}
      >
        {/* Profile Card / Link */}
        <Link
          to="/settings"
          onClick={closeMobileMenu}
          className={cn(
            "flex flex-1 items-center gap-3 w-full hover:bg-secondary/60 dark:hover:bg-white/[0.03] transition-all duration-300 rounded-[1.25rem] group relative outline-none",
            isCollapsed ? "justify-center p-2" : "px-3 py-2.5",
          )}
        >
          <div className="relative shrink-0">
              <Avatar className={cn(
                "border-[3px] shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/20",
                isCollapsed ? "h-11 w-11 border-primary/20" : "h-11 w-11 border-background",
              )}>
                <AvatarImage src={userImage} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-black">
                  {userName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Online Indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full shadow-sm" />
          </div>

          <div
            className={cn(
              "flex flex-col overflow-hidden transition-all duration-300",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
            )}
          >
            <span className="text-sm font-extrabold truncate text-foreground group-hover:text-primary transition-colors">
              {userName || "Loading..."}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "text-[9px] uppercase tracking-wider font-black truncate px-2 py-0.5 rounded-full border shadow-sm",
                roleInfo.color?.includes('primary') ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
              )}>
                {roleInfo.label}
              </span>
            </div>
          </div>
          
          {!isCollapsed && (
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          )}
        </Link>
      </div>

      {/* ── Navigation (Grouped + Filtered) ── */}
      <ScrollArea className="flex-1 py-4 px-3">
        <nav className="space-y-6 pb-6">
          {filteredGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Group label */}
              {!isCollapsed && (
                <p className="text-[10px] font-extrabold text-muted-foreground/60 uppercase tracking-[0.2em] px-3 mb-2 ml-1">
                  {group.label}
                </p>
              )}
              {isCollapsed && <div className="h-px bg-border/50 mx-4 mb-3" />}
              
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeMobileMenu}
                      title={isCollapsed ? item.name : undefined}
                      className="block outline-none group relative"
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="sidebar-active-indicator"
                                className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-primary z-10 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            />
                        )}
                        <div
                          className={cn(
                            "flex items-center gap-3.5 transition-all duration-300 cursor-pointer relative overflow-hidden",
                            isCollapsed ? "py-3 justify-center mx-1 rounded-2xl" : "px-4 py-3 rounded-2xl ml-2 mr-1",
                            isActive
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                            item.danger && !isActive && "text-red-400 hover:text-red-500 hover:bg-red-500/10",
                            isActive && item.danger && "bg-red-500/10 text-red-500 shadow-sm shadow-red-500/10"
                          )}
                        >
                          <div
                            className={cn(
                              "relative flex items-center justify-center transition-transform duration-300",
                              isActive ? "scale-110" : "group-hover:scale-110",
                            )}
                          >
                            {isActive && !isCollapsed && (
                                <div className={cn(
                                    "absolute inset-0 blur-md opacity-40 -z-10",
                                    item.danger ? "bg-red-500" : "bg-primary"
                                )} />
                            )}
                            <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]", item.danger && "text-red-500")} strokeWidth={isActive ? 2.5 : 2} />
                          </div>
                          {!isCollapsed && (
                              <span className={cn(
                                  "text-[13px] tracking-wide transition-all duration-300",
                                  isActive ? "font-bold" : "font-medium"
                              )}>
                                  {item.name}
                              </span>
                          )}
                        </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* ── Footer Elements ── */}
      <div className="mt-auto flex flex-col pt-2 pb-4 px-4 border-t border-border/40 dark:border-white/[0.06] bg-gradient-to-t from-background/50 to-transparent">
        
        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "hidden md:flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer mb-2",
            "text-muted-foreground hover:text-foreground hover:bg-secondary/60 text-[11px] font-bold uppercase tracking-widest",
            isCollapsed && "justify-center px-0",
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={() => signOut()}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer overflow-hidden relative",
            "text-foreground/70 hover:text-red-500",
            isCollapsed && "justify-center px-0",
          )}
        >
          <div className="absolute inset-0 bg-red-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl" />
          <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 relative z-10" />
          <span
            className={cn(
              "font-extrabold text-[13px] transition-all duration-300 relative z-10",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
            )}
          >
            Authenticate Out
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:block fixed inset-y-0 left-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]",
          isCollapsed ? "w-[88px]" : "w-[280px]",
        )}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={closeMobileMenu}
            />
            <motion.aside 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] shadow-2xl shadow-black/20"
            >
                {SidebarContent}
            </motion.aside>
            </div>
        )}
      </AnimatePresence>
    </>
  );
}
