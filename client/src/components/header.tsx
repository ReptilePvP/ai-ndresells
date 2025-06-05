import { Link, useLocation } from "wouter";
import { ThemeToggle } from "./theme-provider";

export function Header() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

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
            
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center">
              <i className="fas fa-user text-white text-sm"></i>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
