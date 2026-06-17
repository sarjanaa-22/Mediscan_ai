import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User as UserIcon, Settings, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function ProfileMenu() {
  const { user, profile, isGuest, signOut } = useAuth();
  const navigate = useNavigate();

  const name = profile?.full_name || user?.email?.split("@")[0] || (isGuest ? "Guest" : "User");
  const email = user?.email || (isGuest ? "Not signed in" : "");
  const initials = (profile?.full_name || user?.email || "G")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-9 px-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isGuest ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
            {isGuest ? "G" : initials}
          </div>
          <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-xs text-muted-foreground truncate font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isGuest ? (
          <DropdownMenuItem asChild>
            <Link to="/auth"><LogIn className="h-4 w-4" /> Sign in</Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/settings"><UserIcon className="h-4 w-4" /> Profile</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings"><Settings className="h-4 w-4" /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> {isGuest ? "Exit guest mode" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
