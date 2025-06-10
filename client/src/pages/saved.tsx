import { useQuery } from "@tanstack/react-query";
import { AnalysisCard } from "@/components/analysis-card";
import { AnalysisWithUpload } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Saved() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: savedAnalyses = [], isLoading } = useQuery<AnalysisWithUpload[]>({
    queryKey: ["/api/saved"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch("/api/saved");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch saved analyses");
      }
      return response.json();
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view your saved analyses.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || isLoading) {
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

  if (!isAuthenticated) {
    return null; // Will redirect
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
            <div className="w-20 h-20 bg-gradient-to-r from-orange-600 to-red-600 rounded-full mx-auto flex items-center justify-center mb-6 animate-scale-fade-in shadow-2xl">
              <i className="fas fa-bookmark text-white text-2xl"></i>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 border-4 border-orange-400/30 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent animate-slide-in-up">
            Saved Analyses
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            Your collection of saved product analyses for quick reference and comparison
          </p>
        </div>

        {/* Stats Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-4 animate-slide-in-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-star text-white text-lg"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {savedAnalyses.length} Saved Analysis{savedAnalyses.length !== 1 ? 'es' : ''}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quick access to your favorite analyses
                </p>
              </div>
            </div>
          </div>
        </div>

        {savedAnalyses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedAnalyses.map((analysis, index) => (
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
              <div className="w-20 h-20 bg-gradient-to-r from-orange-300 to-red-400 dark:from-orange-600 dark:to-red-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-bookmark text-orange-600 dark:text-orange-400 text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                No Saved Analyses
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                You haven't saved any product analyses yet. Start analyzing products and bookmark your favorites for quick access.
              </p>
              <a 
                href="/"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <i className="fas fa-plus mr-2"></i>
                Start Analyzing Products
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}