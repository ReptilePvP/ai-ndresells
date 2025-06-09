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

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
          <i className="fas fa-bookmark text-blue-500 mr-3"></i>
          Saved Analyses
        </h1>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {savedAnalyses.length} saved item{savedAnalyses.length !== 1 ? 's' : ''}
        </div>
      </div>

      {savedAnalyses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedAnalyses.map((analysis, index) => (
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
            <i className="fas fa-bookmark text-blue-500 text-2xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Saved Analyses
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You haven't saved any product analyses yet. Start analyzing products and save the ones you want to reference later.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg transition-all duration-300"
          >
            Start Analyzing Products
          </button>
        </div>
      )}
    </div>
  );
}