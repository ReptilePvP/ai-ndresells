import { Link, useLocation } from "wouter";

export function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex justify-around">
        <Link href="/">
          <button className={`flex flex-col items-center py-2 px-3 transition-colors ${
            isActive("/") ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
          }`}>
            <i className="fas fa-search text-lg mb-1"></i>
            <span className="text-xs">Analyze</span>
          </button>
        </Link>
        <Link href="/dashboard">
          <button className={`flex flex-col items-center py-2 px-3 transition-colors ${
            isActive("/dashboard") ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
          }`}>
            <i className="fas fa-chart-bar text-lg mb-1"></i>
            <span className="text-xs">Dashboard</span>
          </button>
        </Link>
        <Link href="/history">
          <button className={`flex flex-col items-center py-2 px-3 transition-colors ${
            isActive("/history") ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
          }`}>
            <i className="fas fa-history text-lg mb-1"></i>
            <span className="text-xs">History</span>
          </button>
        </Link>
        <button className="flex flex-col items-center py-2 px-3 text-gray-600 dark:text-gray-400">
          <i className="fas fa-user text-lg mb-1"></i>
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </nav>
  );
}
