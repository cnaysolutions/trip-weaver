import { Link, useNavigate } from "react-router-dom";
import { Compass, LogOut, User, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface HeaderProps {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Unable to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || "";
    if (name.includes("@")) {
      return name.charAt(0).toUpperCase();
    }
    return name
      .split(" ")
      .map((n: string) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center shadow-soft group-hover:shadow-medium transition-shadow duration-300">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
            <span className="font-display text-xl font-semibold text-foreground tracking-tight">
              Best Holiday Plan
            </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            {/* Theme Toggle */}
            {onToggleTheme && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleTheme}
                className="h-9 w-9"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}

            {!loading && !user && (
              <>
                <Link
                  to="/#how-it-works"
                  className="hidden md:block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  How It Works
                </Link>
                <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button variant="premium" size="sm" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </>
            )}

            {!loading && user && (
              <>
                <Link
                  to="/trips"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  My Trips
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt="Profile" />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">
                        {user.user_metadata?.full_name || "Traveler"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/trips")}>
                      <User className="mr-2 h-4 w-4" />
                      My Trips
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
