import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Moon, Sun, User, LogOut, Settings, Camera, BarChart3 } from "lucide-react";

export function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const isActive = (path: string) => location === path;

  const handleLogout = async () => {
    try {
      // await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/">
            <a className="mr-6 flex items-center space-x-2">
              <Camera className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">
                Product Analysis
              </span>
            </a>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/">
              <a className={`transition-colors hover:text-foreground/80 ${
                isActive("/") ? "text-foreground" : "text-foreground/60"
              }`}>
                Analyzer
              </a>
            </Link>
            <Link href="/dashboard">
              <a className={`transition-colors hover:text-foreground/80 ${
                isActive("/dashboard") ? "text-foreground" : "text-foreground/60"
              }`}>
                Dashboard
              </a>
            </Link>
            <Link href="/live">
              <a className={`transition-colors hover:text-foreground/80 ${
                isActive("/live") ? "text-foreground" : "text-foreground/60"
              }`}>
                Live Analysis
              </a>
            </Link>
            <Link href="/history">
              <a className={`transition-colors hover:text-foreground/80 ${
                isActive("/history") ? "text-foreground" : "text-foreground/60"
              }`}>
                History
              </a>
            </Link>
            <Link href="/saved">
              <a className={`transition-colors hover:text-foreground/80 ${
                isActive("/saved") ? "text-foreground" : "text-foreground/60"
              }`}>
                Saved
              </a>
            </Link>
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link href="/" className="md:hidden">
              <Button variant="ghost" className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0">
                <Camera className="h-6 w-6 mr-2" />
                <span className="font-bold">Product Analysis</span>
              </Button>
            </Link>
          </div>

          <nav className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('Theme toggle disabled')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user?.username && (
                        <p className="font-medium">{user.username}</p>
                      )}
                      {user?.email && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Admin</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/profile">
                <Button variant="default" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}