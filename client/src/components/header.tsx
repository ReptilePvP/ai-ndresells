import { Link, useLocation } from "wouter";
import { ThemeToggle } from "./theme-provider";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthDialog } from "./auth-dialog";
import { useAuth, useLogout } from "@/hooks/useAuth";

export function Header() {
  const [location] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const logoutMutation = useLogout();

  const isActive = (path: string) => location === path;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-search text-white text-sm"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Product Analyzer
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Identify & Price Any Product</p>
              </div>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-6">
              <Link href="/">
                <button className={`font-medium transition-colors ${
                  isActive("/") 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}>
                  Analyzer
                </button>
              </Link>
              <Link href="/dashboard">
                <button className={`font-medium transition-colors ${
                  isActive("/dashboard") 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}>
                  Dashboard
                </button>
              </Link>
              <Link href="/history">
                <button className={`font-medium transition-colors ${
                  isActive("/history") 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}>
                  History
                </button>
              </Link>
            </nav>
            
            <ThemeToggle />
            
            <div className="relative" ref={menuRef}>
              {isLoading ? (
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              ) : isAuthenticated ? (
                <>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg hover:from-emerald-500 hover:to-cyan-500 transition-colors cursor-pointer"
                  >
                    <i className="fas fa-user text-white text-sm"></i>
                    <span className="text-white text-sm max-w-20 truncate">
                      {user?.firstName || user?.username || 'User'}
                    </span>
                    {isAdmin && (
                      <Badge variant="destructive" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user?.firstName || user?.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>
                      {isAdmin && (
                        <Link href="/admin">
                          <button 
                            onClick={() => setShowUserMenu(false)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <i className="fas fa-cog mr-2"></i>
                            Admin Panel
                          </button>
                        </Link>
                      )}
                      <button 
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <i className="fas fa-sign-out-alt mr-2"></i>
                        {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => setShowAuthDialog(true)}
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-white"
                >
                  <i className="fas fa-user mr-2"></i>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog} 
      />
    </header>
  );
}
