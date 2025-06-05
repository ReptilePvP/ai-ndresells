import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";
import { ResultsPanel } from "@/components/results-panel";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Analysis } from "@shared/schema";

export default function Analyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const { toast } = useToast();

  // Get or create session ID
  const getSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(7);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('sessionId', getSessionId());

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: (upload) => {
      // Start analysis immediately after upload
      analyzeMutation.mutate(upload.id);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (uploadId: number) => {
      const response = await fetch(`/api/analyze/${uploadId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      return response.json();
    },
    onSuccess: (analysisResult) => {
      setAnalysis(analysisResult);
      toast({
        title: "Analysis complete",
        description: "Your product has been analyzed successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAnalysis(null);
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const isLoading = uploadMutation.isPending || analyzeMutation.isPending;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <i className="fas fa-cloud-upload-alt text-blue-500 mr-3"></i>
              Upload Product Image
            </h2>
            
            <UploadZone onFileSelect={handleFileSelect} isLoading={isLoading} />
            
            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile || isLoading}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
              size="lg"
            >
              <i className="fas fa-magic mr-2"></i>
              {isLoading ? "Analyzing..." : "Analyze Product"}
            </Button>
          </div>
          
          {/* Quick Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
              <i className="fas fa-lightbulb mr-2"></i>
              Tips for Best Results
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start">
                <i className="fas fa-check-circle text-emerald-500 mr-2 mt-0.5 text-xs"></i>
                Use well-lit, clear photos
              </li>
              <li className="flex items-start">
                <i className="fas fa-check-circle text-emerald-500 mr-2 mt-0.5 text-xs"></i>
                Show the entire product
              </li>
              <li className="flex items-start">
                <i className="fas fa-check-circle text-emerald-500 mr-2 mt-0.5 text-xs"></i>
                Include brand labels if visible
              </li>
            </ul>
          </div>
        </div>
        
        {/* Results Section */}
        <div className="space-y-6">
          {(isLoading || analysis) ? (
            <ResultsPanel analysis={analysis!} isLoading={isLoading} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-line text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Ready to Analyze
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload an image to get started with AI-powered product analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
