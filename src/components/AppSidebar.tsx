import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Map, Users, Settings, BarChart3, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
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

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar_collapsed", String(nextState));
    // Trigger window resize event so that Google Maps, Pannellum, etc. recalculate sizing
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 150);
  };

  return (
    <aside 
      className={cn(
        "hidden md:flex h-screen sticky top-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex border-b py-4", isCollapsed ? "flex-col items-center gap-3 px-2" : "flex-row items-center justify-between px-5")}>
        <div className="flex items-center gap-2 overflow-hidden">
          <Logo logoClassName="h-9 w-9 text-primary" iconOnly />
          {!isCollapsed && (
            <div className="animate-fade-in whitespace-nowrap">
              <div className="font-bold tracking-tight text-foreground leading-none">TourVista</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Made in India</div>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent shrink-0"
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = path === it.to || path.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                isCollapsed ? "justify-center px-0 h-10" : "gap-3",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              title={isCollapsed ? it.label : undefined}
            >
              <it.icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        {!isCollapsed && (
          <div className="px-2 py-2 text-xs animate-fade-in overflow-hidden">
            <div className="font-medium truncate">{user?.email}</div>
            <div className="text-muted-foreground">TourVista account</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full transition-all duration-200", isCollapsed ? "justify-center px-0 h-10" : "justify-start")}
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          title={isCollapsed ? "Sign out" : undefined}
        >
          <LogOut className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-2")} /> 
          {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Sign out</span>}
        </Button>
      </div>
    </aside>
  );
}
