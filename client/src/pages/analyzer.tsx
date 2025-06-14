import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";
import { ResultsPanel } from "@/components/results-panel";
import { CameraCapture } from "@/components/camera-capture";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { Analysis } from "@shared/schema";
import { FallbackDialog } from "@/components/fallback-dialog";

export default function Analyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showQuickCamera, setShowQuickCamera] = useState(false);
  const { toast } = useToast();
    const [currentUploadId, setCurrentUploadId] = useState<number | null>(null);
    const [fallbackDialog, setFallbackDialog] = useState({
        open: false,
        uploadId: null as number | null,
        failedProvider: ""
    });

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
          setCurrentUploadId(upload.id);
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
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          sessionId: getSessionId(),
        }),
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
    onError: (error: any) => {
        console.error("Analysis error:", error);

        // Check if this is a fallback suggestion error
        if (error.status === 422 && error.data?.suggestFallback) {
            setFallbackDialog({
                open: true,
                uploadId: currentUploadId,
                failedProvider: error.data.failedProvider
            });
            return;
        }
      toast({
        title: "Analysis failed",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    },
  });

    const fallbackMutation = useMutation({
        mutationFn: async ({ uploadId, originalProvider }: { uploadId: number; originalProvider: string }) => {
            const response = await fetch(`/api/analyze/${uploadId}/fallback`, {
                method: 'POST',
                body: JSON.stringify({ originalProvider }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Fallback analysis failed');
            }

            return response.json();
        },
        onSuccess: (analysis) => {
            setAnalysis(analysis);
            setFallbackDialog({ open: false, uploadId: null, failedProvider: "" });
            toast({
                title: "Analysis complete",
                description: "Your product has been analyzed successfully using Gemini AI.",
            });
        },
        onError: (error: any) => {
            console.error("Fallback analysis error:", error);
            setFallbackDialog({ open: false, uploadId: null, failedProvider: "" });
            toast({
                title: "Fallback analysis failed",
                description: error.message || "Failed to analyze with Gemini. Please try again.",
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

  const isLoading = uploadMutation.isPending || analyzeMutation.isPending || fallbackMutation.isPending;

  // When analysis is in progress, show full-screen progress
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <ResultsPanel analysis={analysis!} isLoading={isLoading} />
          </div>
        </div>
      </div>
    );
  }

  // When analysis is complete, show results in full-screen layout
  if (analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Back to Upload Button */}
            <div className="mb-6">
              <Button
                onClick={() => {
                  setAnalysis(null);
                  setSelectedFile(null);
                }}
                variant="outline"
                className="bg-white/80 backdrop-blur-sm border-gray-300 hover:bg-white"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                New Analysis
              </Button>
            </div>

            <ResultsPanel analysis={analysis} isLoading={false} />
          </div>
        </div>
      </div>
    );
  }

  // Default upload interface
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
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 animate-scale-fade-in shadow-2xl">
              <i className="fas fa-search-dollar text-white text-3xl"></i>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent animate-slide-in-up">
            AI Product Analysis
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            Upload any product image for instant AI-powered price analysis and market insights
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 animate-slide-in-left hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 flex items-center bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent animate-scale-fade-in">
                <i className="fas fa-camera text-blue-500 mr-3"></i>
                Upload & Analyze
              </h2>

              <UploadZone 
                onFileSelect={handleFileSelect} 
                isLoading={isLoading}
                onAnalysis={(analysisData) => {
                  setAnalysis(analysisData);
                }}
              />

              <Button
                onClick={handleAnalyze}
                disabled={!selectedFile || isLoading}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                size="lg"
              >
                <i className="fas fa-search-dollar mr-2"></i>
                {isLoading ? "Analyzing Product..." : "Get Price Analysis"}
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/50 animate-slide-in-left animate-stagger-1">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-3">
                  <i className="fas fa-eye text-white text-sm"></i>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">Visual Recognition</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">AI identifies products from images with high accuracy</p>
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/50 animate-slide-in-left animate-stagger-2">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mb-3">
                  <i className="fas fa-dollar-sign text-white text-sm"></i>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">Market Pricing</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Real-time pricing from multiple marketplaces</p>
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/50 animate-slide-in-left animate-stagger-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
                  <i className="fas fa-chart-line text-white text-sm"></i>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">Trend Analysis</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Market trends and demand insights</p>
              </div>

              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/50 animate-slide-in-left animate-stagger-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-3">
                  <i className="fas fa-bookmark text-white text-sm"></i>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">Save Results</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Save and track your analysis history</p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6 animate-slide-in-right">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 text-center animate-scale-fade-in hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in">
                <i className="fas fa-chart-line text-gray-500 dark:text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Ready to Analyze
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Upload a product image to get started with AI-powered analysis and real-time market pricing
              </p>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Pro Tips:</p>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <i className="fas fa-check-circle text-green-500"></i>
                    <span>Clear, well-lit images work best</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <i className="fas fa-check-circle text-green-500"></i>
                    <span>Include brand names and labels</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <i className="fas fa-check-circle text-green-500"></i>
                    <span>Show the entire product</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Button for Quick Camera Access */}
        <div className="fixed bottom-6 right-6 z-50">
          {!showQuickCamera ? (
            <Button
              onClick={() => setShowQuickCamera(true)}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 text-white transform hover:scale-110"
              size="sm"
              disabled={isLoading}
            >
              <Camera className="h-8 w-8" />
            </Button>
          ) : (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/50 dark:border-gray-700/50 p-6 w-80 max-w-[calc(100vw-3rem)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick Camera</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickCamera(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ×
                </Button>
              </div>
              <CameraCapture 
                onCapture={(file) => {
                  handleFileSelect(file);
                  setShowQuickCamera(false);
                  setTimeout(() => {
                    uploadMutation.mutate(file);
                  }, 100);
                }} 
                isAnalyzing={isLoading} 
              />
            </div>
          )}
        </div>
          <FallbackDialog
              open={fallbackDialog.open}
              onOpenChange={(open) => setFallbackDialog(prev => ({ ...prev, open }))}
              failedProvider={fallbackDialog.failedProvider}
              onConfirm={() => {
                  if (fallbackDialog.uploadId) {
                      fallbackMutation.mutate({
                          uploadId: fallbackDialog.uploadId,
                          originalProvider: fallbackDialog.failedProvider
                      });
                  }
              }}
              onCancel={() => {
                  setFallbackDialog({ open: false, uploadId: null, failedProvider: "" });
              }}
          />
      </div>
    </div>
  );
}