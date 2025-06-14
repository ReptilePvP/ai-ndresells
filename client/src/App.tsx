import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import Analyzer from "@/pages/analyzer";
import Dashboard from "@/pages/dashboard";
import History from "@/pages/history";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import AdminDiagnostics from "@/pages/admin";
import LiveAnalysis from "@/pages/live-analysis";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Analyzer} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/live" component={LiveAnalysis} />
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
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50">
        <main>
          <Router />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;