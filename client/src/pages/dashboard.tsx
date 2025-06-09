import { useQuery } from "@tanstack/react-query";
import { AnalysisCard } from "@/components/analysis-card";
import { AnalysisWithUpload } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent');
  
  const getSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(7);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const { data: analyses = [], isLoading } = useQuery<AnalysisWithUpload[]>({
    queryKey: ["/api/analyses"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (!isAuthenticated) {
        params.append('sessionId', getSessionId());
      }
      const response = await fetch(`/api/analyses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analyses');
      return response.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (!isAuthenticated) {
        params.append('sessionId', getSessionId());
      }
      const response = await fetch(`/api/stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  const { data: savedAnalyses = [] } = useQuery<AnalysisWithUpload[]>({
    queryKey: ["/api/saved"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch("/api/saved");
      if (!response.ok) throw new Error('Failed to fetch saved analyses');
      return response.json();
    },
  });

  const recentAnalyses = analyses.slice(0, 6);
  const displayAnalyses = activeTab === 'recent' ? recentAnalyses : savedAnalyses.slice(0, 6);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center animate-scale-fade-in animate-stagger animate-stagger-1">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-in animate-stagger-2">
            <i className="fas fa-search text-blue-600 dark:text-blue-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.totalAnalyses || 0}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Analyses</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center animate-scale-fade-in animate-stagger animate-stagger-2">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-in animate-stagger-3">
            <i className="fas fa-check-circle text-emerald-600 dark:text-emerald-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.accuracyRate || 0}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy Rate</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center animate-scale-fade-in animate-stagger animate-stagger-3">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-in animate-stagger-4">
            <i className="fas fa-dollar-sign text-amber-600 dark:text-amber-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ${(stats?.totalValue || 0).toLocaleString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Value Analyzed</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center animate-scale-fade-in animate-stagger animate-stagger-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-in animate-stagger-4">
            <i className="fas fa-clock text-purple-600 dark:text-purple-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">1.8s</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Analysis Time</p>
        </div>
      </div>

      {/* Analysis Section */}
      <section className="animate-slide-in-left animate-stagger animate-stagger-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center animate-scale-fade-in">
            <i className="fas fa-chart-line text-blue-500 mr-2 sm:mr-3"></i>
            <span className="truncate">Your Analyses</span>
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'recent'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Recent ({recentAnalyses.length})
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'saved'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <i className="fas fa-bookmark mr-1"></i>
                Saved ({savedAnalyses.length})
              </button>
            )}
          </div>
        </div>
        
        {displayAnalyses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {displayAnalyses.map((analysis, index) => (
              <div
                key={analysis.id}
                className="animate-scale-fade-in animate-stagger"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <AnalysisCard analysis={analysis} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className={`fas ${activeTab === 'recent' ? 'fa-history' : 'fa-bookmark'} text-blue-500 text-2xl`}></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {activeTab === 'recent' ? 'No Analysis Yet' : 'No Saved Analyses'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {activeTab === 'recent' 
                ? 'Start by uploading your first product image to analyze'
                : 'Save analyses you want to reference later by clicking the bookmark icon'
              }
            </p>
            <button 
              onClick={() => window.location.href = activeTab === 'recent' ? '/' : '/history'}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg transition-all duration-300"
            >
              {activeTab === 'recent' ? 'Start Analyzing' : 'View All History'}
            </button>
          </div>
        )}
        
        {/* View More Link */}
        {((activeTab === 'recent' && analyses.length > 6) || 
          (activeTab === 'saved' && savedAnalyses.length > 6)) && (
          <div className="text-center mt-8">
            <button 
              onClick={() => window.location.href = activeTab === 'recent' ? '/history' : '/saved'}
              className="px-6 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              View All {activeTab === 'recent' ? 'History' : 'Saved'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
