import { AnalysisWithUpload } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AnalysisCardProps {
  analysis: AnalysisWithUpload;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const timeAgo = formatDistanceToNow(new Date(analysis.analyzedAt), { addSuffix: true });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Helper functions for guest save functionality
  const getGuestSavedAnalyses = (): number[] => {
    const saved = localStorage.getItem('guestSavedAnalyses');
    return saved ? JSON.parse(saved) : [];
  };

  const setGuestSavedAnalyses = (analysisIds: number[]) => {
    localStorage.setItem('guestSavedAnalyses', JSON.stringify(analysisIds));
  };

  const isGuestSaved = analysis ? getGuestSavedAnalyses().includes(analysis.id) : false;

  // Check if analysis is saved for authenticated users
  const { data: saveStatus, isLoading: saveStatusLoading } = useQuery({
    queryKey: ["/api/save/check", analysis?.id],
    queryFn: async () => {
      if (!analysis?.id || !isAuthenticated) return { isSaved: false };
      const response = await fetch(`/api/save/check/${analysis.id}`);
      if (!response.ok) return { isSaved: false };
      return response.json();
    },
    enabled: !!analysis?.id && isAuthenticated,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (saveStatus?.isSaved) {
        const response = await apiRequest("DELETE", `/api/save/${analysis.id}`);
        return response.json();
      } else {
        const response = await apiRequest("POST", `/api/save/${analysis.id}`);
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: saveStatus?.isSaved ? "Analysis removed" : "Analysis saved",
        description: saveStatus?.isSaved 
          ? "Analysis removed from your saved collection" 
          : "Analysis added to your saved collection",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/save/check", analysis.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save analysis",
        variant: "destructive",
      });
    },
  });
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-300 hover:scale-105 animate-scale-fade-in">
      <div className="flex items-center justify-between mb-3 animate-slide-in-left animate-stagger animate-stagger-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">{timeAgo}</span>
        {analysis.feedback && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium animate-bounce-in animate-stagger-2 ${
            analysis.feedback.isAccurate
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          }`}>
            {analysis.feedback.isAccurate ? "✓ Accurate" : "✗ Inaccurate"}
          </span>
        )}
      </div>
      
      <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        <img 
          src={`/api/image/${analysis.upload.filename}`}
          alt={analysis.productName}
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="text-gray-400 dark:text-gray-500 hidden">
          <i className="fas fa-image text-2xl mb-1"></i>
          <p className="text-sm">Image unavailable</p>
        </div>
      </div>
      
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 leading-tight">
        {analysis.productName}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        New: {analysis.averageSalePrice} • Used: {analysis.resellPrice}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Confidence: {analysis.confidence ? Math.round(analysis.confidence * 100) : 85}%
        </span>
        <div className="flex items-center space-x-2">
          {isAuthenticated && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || saveStatusLoading}
              className="p-1 h-6 w-6"
            >
              <i className={`${
                saveStatus?.isSaved ? 'fas fa-bookmark text-blue-500' : 'far fa-bookmark text-gray-400'
              } text-xs`}></i>
            </Button>
          )}
          <button className="text-blue-500 hover:text-blue-700 text-sm transition-colors">
            <i className="fas fa-external-link-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
