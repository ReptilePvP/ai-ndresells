import { useQuery } from "@tanstack/react-query";
import { AnalysisCard } from "@/components/analysis-card";
import { AnalysisWithUpload } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  
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

  const recentAnalyses = analyses.slice(0, 6);

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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-search text-blue-600 dark:text-blue-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.totalAnalyses || 0}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Analyses</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-check-circle text-emerald-600 dark:text-emerald-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.accuracyRate || 0}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy Rate</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-dollar-sign text-amber-600 dark:text-amber-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ${(stats?.totalValue || 0).toLocaleString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Value Analyzed</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-clock text-purple-600 dark:text-purple-400"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">1.8s</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Analysis Time</p>
        </div>
      </div>

      {/* Recent Analysis */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold flex items-center">
            <i className="fas fa-history text-blue-500 mr-3"></i>
            Recent Analysis
          </h2>
          {analyses.length > 6 && (
            <button className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
              View All History
            </button>
          )}
        </div>
        
        {recentAnalyses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentAnalyses.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-history text-gray-400 text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Analysis Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start by uploading your first product image to analyze
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Start Analyzing
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
