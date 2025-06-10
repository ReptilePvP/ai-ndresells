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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200/60 dark:bg-gray-700/60 rounded w-1/3 mx-auto"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-purple-400/20 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-green-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Hero Header */}
        <div className="mb-12 text-center animate-fade-in">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 animate-scale-fade-in shadow-2xl">
              <i className="fas fa-chart-line text-white text-2xl"></i>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent animate-slide-in-up">
            Analytics Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            Track your product analysis performance and market insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-left">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-search text-white text-lg"></i>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Analyses
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.totalAnalyses || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-bullseye text-white text-lg"></i>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Accuracy Rate
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats?.accuracyRate || 0}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-dollar-sign text-white text-lg"></i>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Value
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${stats?.totalValue?.toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-bookmark text-white text-lg"></i>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Saved Items
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {savedAnalyses?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-2 mb-8 animate-slide-in-up">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'recent'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <i className="fas fa-clock mr-2"></i>
              Recent Analyses
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${
                  activeTab === 'saved'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <i className="fas fa-bookmark mr-2"></i>
                Saved Analyses
              </button>
            )}
          </nav>
        </div>

        {/* Analysis Grid */}
        {displayAnalyses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayAnalyses.map((analysis, index) => (
              <div
                key={analysis.id}
                className="animate-slide-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <AnalysisCard analysis={analysis} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className={`fas ${activeTab === 'recent' ? 'fa-clock' : 'fa-bookmark'} text-gray-500 dark:text-gray-400 text-2xl`}></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {activeTab === 'recent' ? 'No analyses yet' : 'No saved analyses'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {activeTab === 'recent' 
                  ? 'Start analyzing products to see your results here'
                  : 'Save your favorite analyses to access them quickly'
                }
              </p>
              <a
                href="/analyzer"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <i className="fas fa-plus mr-2"></i>
                Start Analysis
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}