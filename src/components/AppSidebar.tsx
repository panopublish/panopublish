import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Map,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tours", label: "Tours", icon: Map },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onMobileClose }: AppSidebarProps = {}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user, impersonatorSession, stopImpersonation } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved !== null ? saved === "true" : true; // Default collapsed icon-only view like TourBuilder
  });

  // Automatically close mobile sidebar on navigation
  useEffect(() => {
    onMobileClose?.();
  }, [path]);

  useEffect(() => {
    if (path.includes("/connections")) {
      const touched = sessionStorage.getItem("connections_sidebar_touched");
      if (!touched && !isCollapsed) {
        setIsCollapsed(true);
      }
    }
  }, [path]);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    sessionStorage.setItem("connections_sidebar_touched", "true");
    localStorage.setItem("sidebar_collapsed", String(nextState));
    // Trigger window resize event so that Google Maps, Pannellum, etc. recalculate sizing
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 150);
  };

  return (
    <>
      {/* Desktop Persistent Sidebar - Completely unchanged */}
      <aside
        className={cn(
          "hidden md:flex h-screen sticky top-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out z-30 shrink-0",
          isCollapsed ? "w-14" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex border-b py-3",
            isCollapsed
              ? "flex-col items-center gap-2 px-1"
              : "flex-row items-center justify-between px-4",
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Logo logoClassName="h-8 w-8 text-primary shrink-0" iconOnly />
            {!isCollapsed && (
              <div className="animate-fade-in whitespace-nowrap">
                <div className="font-bold tracking-tight text-foreground leading-none text-sm">
                  PanoPublish
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                  Made in India
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent shrink-0 cursor-pointer"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1.5">
          {items.map((it) => {
            const active = path === it.to || path.startsWith(it.to + "/");
            return (
              <div key={it.to} className="relative group">
                <Link
                  to={it.to}
                  className={cn(
                    "flex items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200",
                    isCollapsed ? "justify-center px-0 h-9 w-9 mx-auto" : "gap-3",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <it.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && (
                    <span className="animate-fade-in whitespace-nowrap">{it.label}</span>
                  )}
                </Link>
                {isCollapsed && (
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                    {it.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-2 border-t space-y-1">
          {impersonatorSession && (
            <div className="mb-2">
              {!isCollapsed && (
                <div className="px-2 py-1 mb-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-bold uppercase tracking-wider text-center">
                  🎭 Impersonating
                </div>
              )}
              <Button
                variant="default"
                size="sm"
                className={cn(
                  "w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all duration-200 shadow-sm",
                  isCollapsed ? "justify-center px-0 h-9 w-9 mx-auto" : "justify-start text-xs h-8",
                )}
                onClick={stopImpersonation}
                title="Exit Impersonation & Return to Admin"
              >
                <ChevronLeft className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-1.5")} />
                {!isCollapsed && <span>Return to Admin</span>}
              </Button>
            </div>
          )}

          {!isCollapsed && (
            <div className="px-2 py-1 text-xs animate-fade-in overflow-hidden">
              <div className="font-medium truncate">{user?.email}</div>
              <div className="text-muted-foreground text-[10px]">
                {impersonatorSession ? "Target user session" : "PanoPublish account"}
              </div>
            </div>
          )}
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full transition-all duration-200 cursor-pointer",
                isCollapsed ? "justify-center px-0 h-9 w-9 mx-auto" : "justify-start text-xs h-8",
              )}
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Sign out</span>}
            </Button>
            {isCollapsed && (
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                Sign out ({user?.email})
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile-Only Slide-Over Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground border-r flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 z-50">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b">
              <div className="flex items-center gap-2.5">
                <Logo logoClassName="h-7 w-7 text-primary shrink-0" iconOnly />
                <div>
                  <div className="font-bold tracking-tight text-foreground leading-none text-sm">
                    PanoPublish
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                    Made in India
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={onMobileClose}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
              {items.map((it) => {
                const active = path === it.to || path.startsWith(it.to + "/");
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-bold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <it.icon className="h-4 w-4 shrink-0" />
                    <span>{it.label}</span>
                  </Link>
                );
              })}

              {/* Admin Console link if user is admin */}
              {(user?.email === "vista360gtp@gmail.com" || user?.email === "er.prashantyadav37@gmail.com") && (
                <Link
                  to="/admin"
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors mt-3 border border-blue-200/60 bg-blue-50/50 text-[#0277bd]",
                    path.startsWith("/admin") && "bg-[#0277bd] text-white shadow-sm font-bold border-[#0277bd]",
                  )}
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>Admin Console</span>
                </Link>
              )}
            </nav>

            {/* Drawer Footer */}
            <div className="p-3 border-t space-y-2 bg-sidebar/50">
              {impersonatorSession && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-medium space-y-1.5">
                  <div className="font-bold text-[10px] uppercase tracking-wider">🎭 Impersonating</div>
                  <Button
                    size="sm"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-7 rounded-lg cursor-pointer"
                    onClick={() => {
                      stopImpersonation();
                      onMobileClose?.();
                    }}
                  >
                    Return to Admin
                  </Button>
                </div>
              )}

              <div className="px-2 py-1 text-xs overflow-hidden">
                <div className="font-semibold text-slate-800 truncate">{user?.email}</div>
                <div className="text-muted-foreground text-[10px]">
                  {impersonatorSession ? "Target user session" : "PanoPublish account"}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-9 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                onClick={async () => {
                  onMobileClose?.();
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4 mr-2 shrink-0" />
                <span>Sign out</span>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
