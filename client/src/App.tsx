import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { UserSettingsProvider } from "@/hooks/useUserSettings";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import Analyzer from "@/pages/analyzer";
import Dashboard from "@/pages/dashboard";
import History from "@/pages/history";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import AdminDiagnostics from "@/pages/admin";
import LiveAnalysis from "@/pages/live-analysis";
import Landing from "@/pages/landing";

import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Analyzer} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/live" component={LiveAnalysis} />
          <Route path="/history" component={History} />
          <Route path="/saved" component={Saved} />
          <Route path="/profile" component={Profile} />
          <Route path="/admin" component={AdminDiagnostics} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <QueryClientProvider client={queryClient}>
          <UserSettingsProvider>
            <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
              <Header />
              <main className="pb-16 md:pb-0">
                <Router />
              </main>
              <MobileNav />
              <Toaster />
            </div>
          </UserSettingsProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;