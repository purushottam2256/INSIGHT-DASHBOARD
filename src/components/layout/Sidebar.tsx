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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
        { name: "Compliance", href: "/compliance", icon: Shield, requiredPermission: "canViewCompliance" },
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
    <div className="flex flex-col h-full bg-sidebar/80 backdrop-blur-2xl border-r border-white/10 dark:border-white/5 shadow-2xl transition-all duration-500 relative overflow-hidden z-20">
      {/* ── Ambient Sidebar Orbs ── */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[70px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 -right-24 w-64 h-64 bg-orange-500/15 blur-[80px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/20 blur-[70px] pointer-events-none -z-10" />

      {/* ── Brand Section ── */}
      <div
        className={cn(
          "shrink-0 border-b border-white/5 transition-all duration-300 relative",
          isCollapsed ? "px-2 py-4" : "px-5 py-5",
        )}
      >
        <Link to="/dashboard" onClick={closeMobileMenu} className="flex items-center gap-3.5 cursor-pointer group/brand">
          <div className="relative flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover/brand:opacity-100 transition-opacity duration-500" />
            <img src={logo} alt="INSIGHT Logo" className="w-[44px] h-[44px] relative z-10 transition-transform duration-300 group-hover/brand:scale-105 drop-shadow-md object-contain rounded-xl overflow-hidden" />
          </div>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <h2 className="text-xl font-black tracking-tight leading-none sidebar-brand-text font-display">
              INSIGHT
            </h2>
            <p className="text-[9px] text-muted-foreground/70 font-medium tracking-[0.12em] mt-0.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-primary/60" />
              Empowering Education
            </p>
          </div>
        </Link>
      </div>

      {/* ── User Profile Card + Collapse Toggle ── */}
      <div
        className={cn(
          "border-b border-border/40 dark:border-white/[0.06] transition-all duration-300",
          isCollapsed ? "px-2 py-3" : "px-4 py-4",
        )}
      >
        {/* Profile Card / Link */}
        <Link
          to="/settings"
          onClick={closeMobileMenu}
          className={cn(
            "flex flex-1 items-center gap-3 w-full hover:bg-foreground/5 transition-colors duration-200 rounded-xl",
            isCollapsed ? "justify-center p-2" : "px-3 py-2",
          )}
        >
          <Avatar className={cn(
            "border-2 border-background shadow-xs shrink-0 transition-all duration-300",
            isCollapsed ? "h-10 w-10 ring-2 ring-primary/20 ring-offset-1 ring-offset-background" : "h-[38px] w-[38px]",
          )}>
            <AvatarImage src={userImage} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {userName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "flex flex-col overflow-hidden transition-all duration-300",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
            )}
          >
            <span className="text-sm font-semibold truncate text-foreground">
              {userName || "Loading..."}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-bold truncate px-1.5 py-0.5 rounded-full",
                roleInfo.color || "text-primary/70"
              )}>
                {roleInfo.emoji} {roleInfo.label}
              </span>
            </div>
          </div>
        </Link>

        {/* Collapse Button — Right below profile */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "hidden md:flex items-center gap-2 w-full px-3 py-1.5 rounded-lg mt-2 transition-all duration-200 cursor-pointer",
            "text-muted-foreground hover:text-foreground hover:bg-foreground/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 text-[11px]",
            isCollapsed && "justify-center",
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* ── Navigation (Grouped + Filtered) ── */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-4 pl-3 py-2 pr-0">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              {!isCollapsed && (
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.15em] px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              {isCollapsed && <div className="h-px bg-white/10 mx-2 mb-1.5" />}
              
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
                      className="block"
                    >
                        <div
                          className={cn(
                            "flex items-center gap-3 transition-all duration-300 group cursor-pointer relative",
                            isCollapsed ? "py-2.5 justify-center mx-2 rounded-xl" : "pl-4 pr-3 py-2.5 rounded-xl mx-2",
                            isActive
                              ? "bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 text-primary font-bold shadow-sm backdrop-blur-sm"
                              : "text-sidebar-foreground/70 hover:text-primary hover:bg-sidebar-foreground/5",
                            item.danger && !isActive && "text-red-400 hover:text-red-500 hover:bg-red-500/10",
                          )}
                        >
                          <div
                            className={cn(
                              "relative flex items-center justify-center transition-all duration-200",
                              isActive && !item.danger && "text-primary",
                              isActive && item.danger && "text-red-500",
                              !isActive && "group-hover:scale-110",
                            )}
                          >
                            <Icon className={cn("shrink-0", isCollapsed ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]")} />
                          </div>
                          {!isCollapsed && <span className="text-[13px] tracking-wide">{item.name}</span>}
                          {isActive && !isCollapsed && (
                            <div className={cn(
                              "ml-auto w-1.5 h-1.5 rounded-full shadow-sm",
                              item.danger
                                ? "bg-red-500 shadow-red-500/40"
                                : "bg-primary shadow-primary/40"
                            )} />
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

      {/* ── Footer / Logout ── */}
      <div className="border-t border-border/40 dark:border-white/[0.06]">
        <button
          onClick={() => signOut()}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 transition-all duration-200 group cursor-pointer",
            "text-foreground/60 hover:bg-destructive/10 hover:text-destructive hover-glow",
            isCollapsed && "justify-center px-3",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span
            className={cn(
              "font-medium text-[13px] transition-all duration-300",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
            )}
          >
            Log Out
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
          "hidden md:block fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[250px]",
        )}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeMobileMenu}
          />
          <aside className="absolute inset-y-0 left-0 w-3/4 max-w-[280px] shadow-2xl shadow-black/20 transition-transform duration-300 ease-in-out transform translate-x-0">
            {SidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
