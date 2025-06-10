import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnalysisCard } from "@/components/analysis-card";
import { AnalysisWithUpload } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function History() {
  const [filter, setFilter] = useState<'all' | 'accurate' | 'inaccurate'>('all');
  const [clearTimeframe, setClearTimeframe] = useState<string>('all');
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const clearHistoryMutation = useMutation({
    mutationFn: async (timeframe: string) => {
      const response = await fetch('/api/history/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe }),
      });
      if (!response.ok) throw new Error('Failed to clear history');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      toast({
        title: "History Cleared",
        description: `Successfully cleared ${data.deletedCount} analysis(es)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear history",
        variant: "destructive",
      });
    },
  });

  const filteredAnalyses = analyses.filter(analysis => {
    if (filter === 'all') return true;
    if (filter === 'accurate') return analysis.feedback?.isAccurate === true;
    if (filter === 'inaccurate') return analysis.feedback?.isAccurate === false;
    return true;
  });

  const handleClearHistory = () => {
    clearHistoryMutation.mutate(clearTimeframe);
  };

  const getTimeframeDescription = (timeframe: string) => {
    switch (timeframe) {
      case 'all': return 'all history';
      case '24h': return 'last 24 hours';
      case '7d': return 'last 7 days';
      case '30d': return 'last 30 days';
      default: return 'selected timeframe';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200/60 dark:bg-gray-700/60 rounded w-1/3 mx-auto"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
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
              <i className="fas fa-history text-white text-2xl"></i>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent animate-slide-in-up">
            Analysis History
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            Track and manage your product analysis history with smart filtering options
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-3 animate-slide-in-left">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <i className="fas fa-clock text-blue-500 mr-2"></i>
              {filteredAnalyses.length} Analysis Found
            </h2>
          </div>
        
          <div className="flex flex-col sm:flex-row gap-4 animate-slide-in-right">
            {/* Clear History Section */}
            {isAuthenticated && analyses.length > 0 && (
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-3 flex items-center gap-2">
                <Select value={clearTimeframe} onValueChange={setClearTimeframe}>
                  <SelectTrigger className="w-32 bg-white/80 dark:bg-gray-700/80 border-white/50">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={clearHistoryMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 shadow-lg"
                    >
                      <i className="fas fa-trash mr-2"></i>
                      Clear
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Analysis History</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to clear {getTimeframeDescription(clearTimeframe)}? 
                        This action cannot be undone and will permanently delete your analysis data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleClearHistory}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {clearHistoryMutation.isPending ? "Clearing..." : "Clear History"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            
            {/* Filter Buttons */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-2 flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                All ({analyses.length})
              </button>
              <button
                onClick={() => setFilter('accurate')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === 'accurate'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                Accurate ({analyses.filter(a => a.feedback?.isAccurate === true).length})
              </button>
              <button
                onClick={() => setFilter('inaccurate')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === 'inaccurate'
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                Inaccurate ({analyses.filter(a => a.feedback?.isAccurate === false).length})
              </button>
            </div>
          </div>
        </div>

        {filteredAnalyses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredAnalyses.map((analysis, index) => (
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
                <i className="fas fa-search text-gray-500 dark:text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {filter === 'all' ? 'No analyses yet' : `No ${filter} analyses`}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {filter === 'all' 
                  ? 'Start by uploading your first product image to analyze'
                  : `No analysis with ${filter} feedback found`
                }
              </p>
              {filter === 'all' && (
                <a 
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Start Analyzing
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}