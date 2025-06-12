import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import Analyzer from "@/pages/analyzer";
import Dashboard from "@/pages/dashboard";
import History from "@/pages/history";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import AdminDiagnostics from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Analyzer} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/history" component={History} />
      <Route path="/saved" component={Saved} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={AdminDiagnostics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-900 text-gray-100 transition-colors duration-300">
            <Header />
            <main className="pb-16 md:pb-0">
              <Router />
            </main>
            <MobileNav />
            <Toaster />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;