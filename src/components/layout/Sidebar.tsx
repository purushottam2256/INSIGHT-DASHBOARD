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
  Layers,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  requiredPermission?: string; // key from usePermissions
  danger?: boolean; // red-zone items
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

  // ── Permission-filtered navigation groups ──
  const navGroups: NavGroup[] = [
    {
      label: "Core",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Registration", href: "/registration", icon: GraduationCap },
        { name: "Timetable", href: "/timetable", icon: Clock },
        { name: "Attendance", href: "/attendance-manager", icon: CalendarCheck },
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
        { name: "Sections", href: "/sections", icon: Layers, requiredPermission: "canMergeSplitSections" },
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

  // Filter items by permission
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.requiredPermission) return true;
        return (permissions as any)[item.requiredPermission] === true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const SidebarContent = (
    <div className="flex flex-col h-full sidebar-glass transition-all duration-500 relative overflow-hidden">
      {/* Animated gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 sidebar-shimmer-line" />

      {/* Subtle mesh background overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, hsl(28, 90%, 48%) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(33, 95%, 55%) 0%, transparent 50%)",
        }}
      />

      {/* ── Brand Section ── */}
      <div
        className={cn(
          "shrink-0 border-b border-border/40 dark:border-white/[0.06] transition-all duration-300 relative",
          isCollapsed ? "px-2 py-4" : "px-5 py-5",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 relative z-10 transition-transform duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <h2 className="text-lg font-extrabold tracking-tight leading-none sidebar-brand-text">
              INSIGHT
            </h2>
            <p className="text-[9px] text-muted-foreground/70 font-medium tracking-[0.12em] mt-0.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-primary/60" />
              Empowering Education
            </p>
          </div>
        </div>
      </div>

      {/* ── User Profile Card ── */}
      <div
        className={cn(
          "border-b border-border/40 dark:border-white/[0.06] transition-all duration-300",
          isCollapsed ? "px-2 py-3 flex justify-center" : "px-4 py-4",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 transition-all duration-300",
            !isCollapsed && "sidebar-user-card rounded-xl px-3 py-2.5",
            isCollapsed && "justify-center",
          )}
        >
          <div className="relative group">
            <div
              className={cn(
                "absolute inset-0 rounded-full bg-gradient-to-br from-primary to-amber-500 blur-md transition-all duration-500",
                isCollapsed ? "opacity-0" : "opacity-20 group-hover:opacity-40",
              )}
            />
            <Avatar
              className={cn(
                "ring-2 ring-primary/30 transition-all duration-300 relative z-10",
                isCollapsed ? "h-8 w-8" : "h-11 w-11",
                "group-hover:ring-primary/50",
              )}
            >
              <AvatarImage src={userImage} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-amber-500/20 text-primary font-bold text-sm">
                {userName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
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
        </div>
      </div>

      {/* ── Navigation (Grouped + Filtered) ── */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-4 px-2">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              {!isCollapsed && (
                <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              {isCollapsed && <div className="h-px bg-border/30 mx-2 mb-1.5" />}
              
              <div className="space-y-0.5">
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
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-xl transition-all duration-200 group cursor-pointer relative",
                          isCollapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2.5",
                          isActive
                            ? "sidebar-nav-active"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50 dark:hover:bg-white/[0.04]",
                          item.danger && !isActive && "text-red-500/70 hover:text-red-500 hover:bg-red-500/5",
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gradient-to-b from-primary to-amber-500 shadow-[0_0_8px_hsl(28,90%,48%,0.5)] sidebar-active-glow" />
                        )}
                        <div
                          className={cn(
                            "relative flex items-center justify-center transition-all duration-200",
                            isActive && !item.danger && "text-primary",
                            isActive && item.danger && "text-red-500",
                            !isActive && "group-hover:scale-110",
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0 relative z-10" />
                          {isActive && (
                            <div className={cn(
                              "absolute inset-0 rounded-lg blur-sm scale-150",
                              item.danger ? "bg-red-500/10" : "bg-primary/10"
                            )} />
                          )}
                        </div>
                        <span
                          className={cn(
                            "font-medium text-[13px] relative z-10 transition-all duration-300 whitespace-nowrap",
                            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
                            isActive && "font-semibold text-foreground",
                          )}
                        >
                          {item.name}
                        </span>
                        {isActive && !isCollapsed && (
                          <div className={cn(
                            "ml-auto w-1.5 h-1.5 rounded-full shadow-lg",
                            item.danger
                              ? "bg-red-500 shadow-red-500/60"
                              : "bg-primary shadow-[0_0_6px_hsl(28,90%,48%,0.6)]"
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

      {/* ── Collapse Toggle ── */}
      <div className="border-t border-border/40 dark:border-white/[0.06] px-2 py-2 hidden md:block">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer",
            "text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 dark:hover:bg-white/[0.04]",
            isCollapsed && "justify-center",
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
              <span className="font-medium text-[13px]">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* ── Footer / Logout ── */}
      <div className="border-t border-border/40 dark:border-white/[0.06]">
        <button
          onClick={() => signOut()}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 transition-all duration-200 group cursor-pointer",
            "text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive",
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
