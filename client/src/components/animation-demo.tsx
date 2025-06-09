import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Zap, Check, X } from "lucide-react";

export function AnimationDemo() {
  const [showResults, setShowResults] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const triggerAnimation = () => {
    setShowResults(false);
    setAnimationKey(prev => prev + 1);
    setTimeout(() => {
      setShowResults(true);
    }, 100);
  };

  const resetAnimation = () => {
    setShowResults(false);
    setAnimationKey(prev => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Animation Demo</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Experience the smooth slide-in animations used throughout the analysis platform
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={triggerAnimation}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Animation
          </Button>
          <Button 
            onClick={resetAnimation}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>

      {showResults && (
        <div key={animationKey} className="space-y-6">
          {/* Main Results Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-slide-in-right overflow-hidden">
            <div className="flex items-center justify-between mb-6 animate-scale-fade-in animate-stagger animate-stagger-1">
              <h2 className="text-2xl font-bold flex items-center">
                <Zap className="text-emerald-500 mr-3 w-6 h-6" />
                Analysis Complete!
              </h2>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium animate-bounce-in animate-stagger-2">
                <Check className="w-3 h-3 inline mr-1" />
                Analyzed
              </span>
            </div>
            
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4 animate-slide-in-left animate-stagger animate-stagger-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Product Name</h3>
                <p className="text-lg font-medium">Apple iPhone 14 Pro Max</p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4 animate-slide-in-left animate-stagger animate-stagger-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Premium smartphone with advanced camera system, A16 Bionic chip, and ProMotion display technology.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 animate-stagger animate-stagger-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 animate-slide-in-left">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-tag text-emerald-600 mr-2"></i>
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Average New Price</h4>
                  </div>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">$1,099</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Estimated market value when new</p>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800 animate-slide-in-right">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-coins text-blue-600 mr-2"></i>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Estimated Resell Value</h4>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">$750-850</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Your potential earnings</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 animate-scale-fade-in animate-stagger animate-stagger-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <i className="fas fa-thumbs-up text-blue-500 mr-2"></i>
                  How accurate is this analysis?
                </h4>
                
                <div className="flex space-x-3">
                  <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white animate-slide-in-left animate-stagger animate-stagger-1">
                    <Check className="w-4 h-4 mr-2" />
                    Accurate
                  </Button>
                  <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white animate-slide-in-right animate-stagger animate-stagger-2">
                    <X className="w-4 h-4 mr-2" />
                    Not Accurate
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-300 hover:scale-105 animate-scale-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center justify-between mb-3 animate-slide-in-left animate-stagger animate-stagger-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 animate-bounce-in animate-stagger-2">
                    ✓ Accurate
                  </span>
                </div>
                
                <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
                  <i className="fas fa-mobile-alt text-3xl text-gray-400"></i>
                </div>
                
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 leading-tight">
                  Sample Product {i}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  New: $899 • Used: $650-750
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Confidence: 92%
                  </span>
                  <button className="text-blue-500 hover:text-blue-700 text-sm transition-colors">
                    <i className="fas fa-external-link-alt"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live Analysis Result Overlay Demo */}
          <div className="relative bg-gray-900 rounded-xl p-8 h-48 flex items-end animate-scale-fade-in">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-xl"></div>
            <div className="relative w-full animate-slide-in-right">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white animate-scale-fade-in">
                <div className="flex items-center gap-2 mb-2 animate-slide-in-left animate-stagger animate-stagger-1">
                  <Zap className="w-4 h-4 text-blue-400 animate-bounce-in" />
                  <span className="text-sm font-medium">Live Analysis Complete!</span>
                </div>
                <p className="text-sm animate-slide-in-left animate-stagger animate-stagger-2">
                  Detected: Apple iPhone 14 Pro Max - Estimated value: $750-850
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showResults && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Click "Start Animation" to see the slide-in effects</p>
        </div>
      )}
    </div>
  );
}