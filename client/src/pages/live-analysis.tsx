import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Eye, Scan, Activity, DollarSign } from "lucide-react";
import { SimpleLiveAnalysis } from "@/components/simple-live-analysis";
import { Link } from "wouter";

export function LiveAnalysisPage() {
  const [showAnalysis, setShowAnalysis] = useState(false);

  if (showAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button 
              onClick={() => setShowAnalysis(false)}
              variant="outline" 
              size="sm"
            >
              Return to Setup
            </Button>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <SimpleLiveAnalysis />
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

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-12">
          <Link href="/">
            <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm border-gray-300 hover:bg-white text-gray-900 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-12 animate-fade-in">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 animate-scale-fade-in shadow-2xl">
                <Scan className="h-16 w-16 text-white animate-pulse" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 border-4 border-blue-400/30 rounded-full animate-ping"></div>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent animate-slide-in-up">
              Live Product Analysis
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
              Point your camera at any product for instant AI identification and real-time market insights
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-left">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Instant Recognition</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI identifies products in real-time as you point your camera</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Live Pricing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get current market prices and resell estimates instantly</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Market Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Real-time market trends and demand analysis</p>
              </CardContent>
            </Card>
          </div>

          {/* Start Button */}
          <div className="space-y-6">
            <Button
              onClick={() => setShowAnalysis(true)}
              size="lg"
              className="px-12 py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 animate-bounce-in"
            >
              <Eye className="mr-3 h-6 w-6" />
              Start Live Analysis
            </Button>

            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Make sure to allow camera access when prompted. Best results with good lighting and clear product visibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}