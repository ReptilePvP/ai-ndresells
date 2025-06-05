import { Analysis } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ResultsPanelProps {
  analysis: Analysis;
  isLoading?: boolean;
}

export function ResultsPanel({ analysis, isLoading }: ResultsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feedbackMutation = useMutation({
    mutationFn: async (isAccurate: boolean) => {
      const response = await apiRequest("POST", "/api/feedback", {
        analysisId: analysis.id,
        isAccurate,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse">
            <i className="fas fa-brain text-white text-xl"></i>
          </div>
          <h3 className="text-xl font-semibold mb-2">Analyzing Your Product...</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Our AI is examining the image and gathering market data</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <i className="fas fa-chart-line text-emerald-500 mr-3"></i>
          Analysis Results
        </h2>
        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium">
          <i className="fas fa-check-circle mr-1"></i>
          Analyzed
        </span>
      </div>
      
      <div className="space-y-6">
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Product Name</h3>
          <p className="text-lg">{analysis.productName}</p>
        </div>
        
        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {analysis.description}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center mb-2">
              <i className="fas fa-tag text-emerald-600 mr-2"></i>
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">New Price</h4>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analysis.averageSalePrice}</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Current retail price</p>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center mb-2">
              <i className="fas fa-recycle text-amber-600 mr-2"></i>
              <h4 className="font-semibold text-amber-900 dark:text-amber-100">Resell Price</h4>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{analysis.resellPrice}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Used market value</p>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <i className="fas fa-thumbs-up text-blue-500 mr-2"></i>
            How accurate is this analysis?
          </h4>
          <div className="flex space-x-3">
            <Button
              onClick={() => feedbackMutation.mutate(true)}
              disabled={feedbackMutation.isPending}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <i className="fas fa-check mr-2"></i>
              Accurate
            </Button>
            <Button
              onClick={() => feedbackMutation.mutate(false)}
              disabled={feedbackMutation.isPending}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              <i className="fas fa-times mr-2"></i>
              Not Accurate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
