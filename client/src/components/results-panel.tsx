import { Analysis } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ResultsPanelProps {
  analysis: Analysis;
  isLoading?: boolean;
}

export function ResultsPanel({ analysis, isLoading }: ResultsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if feedback already exists for this analysis
  const { data: existingFeedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ["/api/feedback", analysis?.id],
    queryFn: async () => {
      if (!analysis?.id) return null;
      const response = await fetch(`/api/feedback/${analysis.id}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch feedback');
      return response.json();
    },
    enabled: !!analysis?.id,
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/feedback", analysis.id] });
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-slide-in-right overflow-hidden">
      <div className="flex items-center justify-between mb-6 animate-scale-fade-in animate-stagger animate-stagger-1">
        <h2 className="text-2xl font-bold flex items-center">
          <i className="fas fa-chart-line text-emerald-500 mr-3"></i>
          Analysis Complete!
        </h2>
        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium animate-bounce-in animate-stagger-2">
          <i className="fas fa-check-circle mr-1"></i>
          Analyzed
        </span>
      </div>
      
      <div className="space-y-6">
        <div className="border-l-4 border-blue-500 pl-4 animate-slide-in-left animate-stagger animate-stagger-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Product Name</h3>
          <p className="text-lg font-medium">{analysis.productName}</p>
        </div>
        
        <div className="border-l-4 border-purple-500 pl-4 animate-slide-in-left animate-stagger animate-stagger-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {analysis.description}
          </p>
        </div>

        {/* Image Comparison Section */}
        <div className="border-l-4 border-indigo-500 pl-4 animate-scale-fade-in animate-stagger animate-stagger-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <i className="fas fa-images mr-2"></i>
            Visual Comparison
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* User's Uploaded Image */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 text-center">Your Upload</h4>
              <img
                src={`/api/image/${analysis.uploadId}`}
                alt="Your uploaded product"
                className="w-full h-48 object-contain rounded-lg"
                onError={(e) => {
                  console.error('User image failed to load:', analysis.uploadId);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                Original submission
              </p>
            </div>

            {/* Gemini's Reference Match */}
            {analysis.referenceImageUrl ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 text-center flex items-center justify-center">
                  <i className="fas fa-search mr-2 text-blue-500"></i>
                  AI Match Found
                </h4>
                <img
                  src={`/api/image/${analysis.referenceImageUrl}`}
                  alt="AI reference match"
                  className="w-full h-48 object-contain rounded-lg"
                  onLoad={() => console.log('Reference image loaded:', analysis.referenceImageUrl)}
                  onError={(e) => {
                    console.error('Reference image failed to load:', analysis.referenceImageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                  Marketplace reference
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-search-plus text-gray-400 text-3xl mb-3"></i>
                  <h4 className="font-medium text-gray-500 dark:text-gray-400 mb-2">No Reference Found</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Analysis based on AI recognition only
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Comparison Insights */}
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start">
              <i className="fas fa-lightbulb text-blue-500 mr-2 mt-0.5"></i>
              <span>
                {analysis.referenceImageUrl 
                  ? "AI found a visual match in marketplace data to verify pricing accuracy"
                  : "Analysis based on product recognition and market data without visual reference"
                }
              </span>
            </p>
          </div>
        </div>

        
        <div className="grid md:grid-cols-2 gap-4 animate-stagger animate-stagger-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 animate-slide-in-left">
            <div className="flex items-center mb-2">
              <i className="fas fa-tag text-emerald-600 mr-2"></i>
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Retail Price</h4>
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{analysis.averageSalePrice}</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Market-verified pricing</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 animate-slide-in-right">
            <div className="flex items-center mb-2">
              <i className="fas fa-chart-line text-blue-600 mr-2"></i>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Resell Value</h4>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analysis.resellPrice}</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {analysis.marketSummary?.includes('StockX') ? 'StockX authenticated data' : 'Market-based estimate'}
            </p>
          </div>
        </div>

        {/* Market Data Sources */}
        {analysis.marketSummary && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 animate-scale-fade-in animate-stagger animate-stagger-4">
            <div className="flex items-start gap-2">
              <i className="fas fa-database text-gray-600 dark:text-gray-400 mt-0.5"></i>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Data Sources</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {analysis.marketSummary}
                </p>
                {analysis.marketSummary.includes('StockX') && (
                  <div className="mt-2 inline-flex items-center px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-xs font-medium">
                    <i className="fas fa-shield-alt mr-1"></i>
                    StockX Authenticated
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 animate-scale-fade-in animate-stagger animate-stagger-4">
          <h4 className="font-semibold mb-3 flex items-center">
            <i className="fas fa-thumbs-up text-blue-500 mr-2"></i>
            How accurate is this analysis?
          </h4>
          
          {existingFeedback ? (
            <div className="text-center animate-bounce-in">
              <div className={`inline-flex items-center px-4 py-2 rounded-lg font-medium ${
                existingFeedback.isAccurate 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}>
                <i className={`fas ${existingFeedback.isAccurate ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
                Feedback submitted: {existingFeedback.isAccurate ? 'Accurate' : 'Not Accurate'}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Thank you for your feedback!
              </p>
            </div>
          ) : (
            <div className="flex space-x-3">
              <Button
                onClick={() => feedbackMutation.mutate(true)}
                disabled={feedbackMutation.isPending || feedbackLoading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white animate-slide-in-left animate-stagger animate-stagger-1"
              >
                <i className="fas fa-check mr-2"></i>
                {feedbackMutation.isPending ? 'Submitting...' : 'Accurate'}
              </Button>
              <Button
                onClick={() => feedbackMutation.mutate(false)}
                disabled={feedbackMutation.isPending || feedbackLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white animate-slide-in-right animate-stagger animate-stagger-2"
              >
                <i className="fas fa-times mr-2"></i>
                {feedbackMutation.isPending ? 'Submitting...' : 'Not Accurate'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
