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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <i className="fas fa-history text-blue-500 mr-3"></i>
          Analysis History
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Clear History Section */}
          {isAuthenticated && analyses.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={clearTimeframe} onValueChange={setClearTimeframe}>
                <SelectTrigger className="w-32">
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
                  >
                    <i className="fas fa-trash mr-2"></i>
                    Clear History
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
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All ({analyses.length})
            </button>
            <button
              onClick={() => setFilter('accurate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'accurate'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Accurate ({analyses.filter(a => a.feedback?.isAccurate === true).length})
            </button>
            <button
              onClick={() => setFilter('inaccurate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'inaccurate'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
              className="animate-scale-fade-in animate-stagger"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <AnalysisCard analysis={analysis} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-search text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {filter === 'all' ? 'No Analysis Found' : `No ${filter} Analysis Found`}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {filter === 'all' 
              ? 'Start by uploading your first product image to analyze'
              : `No analysis with ${filter} feedback found`
            }
          </p>
          {filter === 'all' && (
            <button 
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Start Analyzing
            </button>
          )}
        </div>
      )}
    </div>
  );
}