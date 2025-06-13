import { useState } from 'react';
import { Switch, Route, Link, useLocation } from "wouter";
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

function SimpleNav() {
  const [location] = useLocation();
  
  const navItems = [
    { path: '/', label: 'Analyzer', icon: '🔍' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/history', label: 'History', icon: '📜' },
    { path: '/saved', label: 'Saved', icon: '⭐' },
    { path: '/profile', label: 'Profile', icon: '👤' },
    { path: '/live', label: 'Live', icon: '📹' },
    { path: '/admin', label: 'Admin', icon: '⚙️' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-bold text-gray-900">Product Analysis</h1>
          <div className="hidden md:flex space-x-4">
            {navItems.map(item => (
              <Link key={item.path} href={item.path}>
                <a className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location === item.path 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                  {item.icon} {item.label}
                </a>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileNavBar() {
  const [location] = useLocation();
  
  const navItems = [
    { path: '/', label: 'Analyzer', icon: '🔍' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/history', label: 'History', icon: '📜' },
    { path: '/saved', label: 'Saved', icon: '⭐' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="grid grid-cols-4 h-16">
        {navItems.map(item => (
          <Link key={item.path} href={item.path}>
            <a className={`flex flex-col items-center justify-center h-full text-xs ${
              location === item.path 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600'
            }`}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}

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
        <SimpleNav />
        <main className="pb-20 md:pb-4">
          <Router />
        </main>
        <MobileNavBar />
      </div>
    </QueryClientProvider>
  );
}

export default App;