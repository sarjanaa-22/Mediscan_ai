import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ScanLine,
  Pill,
  FlaskConical,
  FileText,
  Settings,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Prescription Scanner", url: "/scanner", icon: ScanLine },
  { title: "Medicines", url: "/medicines", icon: Pill },
  { title: "Lab Analyzer", url: "/lab", icon: FlaskConical },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, profile, isGuest } = useAuth();
  const name = profile?.full_name || user?.email?.split("@")[0] || (isGuest ? "Guest user" : "User");
  const email = user?.email || (isGuest ? "Guest session" : "");
  const initials = (profile?.full_name || user?.email || "G")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">MediScan AI</span>
            <span className="text-[10px] text-muted-foreground">Clinical Decision Support</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/60 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 p-2">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isGuest ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
            {isGuest ? <ShieldCheck className="h-4 w-4" /> : initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{name}</span>
            <span className="text-[11px] text-muted-foreground truncate">{email}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
