import { useState, useEffect } from "react";

const AnalysisProgress = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      id: 0,
      title: "Processing Image",
      description: "Analyzing visual elements and extracting product details",
      icon: "fas fa-eye",
      duration: 2500,
      color: "from-blue-500 to-blue-600"
    },
    {
      id: 1,
      title: "Google Search",
      description: "Searching for exact product matches and specifications",
      icon: "fas fa-search",
      duration: 5000,
      color: "from-green-500 to-green-600"
    },
    {
      id: 2,
      title: "Market Data",
      description: "Gathering pricing from eBay and verified retailers",
      icon: "fas fa-chart-line",
      duration: 8000,
      color: "from-purple-500 to-purple-600"
    },
    {
      id: 3,
      title: "Price Analysis",
      description: "Calculating retail and resale value estimates",
      icon: "fas fa-calculator",
      duration: 3500,
      color: "from-orange-500 to-orange-600"
    },
    {
      id: 4,
      title: "Visual Comparison",
      description: "Finding reference images for comparison",
      icon: "fas fa-images",
      duration: 3000,
      color: "from-indigo-500 to-indigo-600"
    },
    {
      id: 5,
      title: "Final Analysis",
      description: "Compiling comprehensive market intelligence",
      icon: "fas fa-brain",
      duration: 2000,
      color: "from-pink-500 to-pink-600"
    }
  ];

  useEffect(() => {
    let stepIndex = 0;
    let stepStartTime = Date.now();
    
    const updateProgress = () => {
      if (stepIndex >= steps.length) return;
      
      const currentStepDuration = steps[stepIndex].duration;
      const elapsed = Date.now() - stepStartTime;
      const stepProgress = Math.min(elapsed / currentStepDuration, 1);
      
      // Calculate overall progress
      const completedSteps = stepIndex;
      const totalSteps = steps.length;
      const overallProgress = ((completedSteps + stepProgress) / totalSteps) * 100;
      
      setProgress(Math.min(overallProgress, 95)); // Keep at 95% until actual completion
      setCurrentStep(stepIndex);
      
      // Move to next step when current is complete
      if (stepProgress >= 1 && stepIndex < steps.length - 1) {
        stepIndex++;
        stepStartTime = Date.now();
      }
    };
    
    const progressInterval = setInterval(updateProgress, 150);
    
    // Auto-complete after reasonable time
    const autoComplete = setTimeout(() => {
      setProgress(100);
      setCurrentStep(steps.length - 1);
      clearInterval(progressInterval);
    }, 25000); // 25 seconds max
    
    return () => {
      clearInterval(progressInterval);
      clearTimeout(autoComplete);
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 rounded-2xl shadow-xl border border-blue-100 dark:border-blue-800/30 p-8 overflow-hidden relative">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500 to-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="relative mb-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r ${steps[currentStep].color} rounded-full shadow-2xl relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            <i className={`${steps[currentStep].icon} text-white text-3xl relative z-10 animate-bounce`}></i>
          </div>
          {/* Rotating Ring */}
          <div className="absolute inset-0 w-24 h-24 mx-auto">
            <div className="w-full h-full border-4 border-transparent border-t-blue-400 border-r-green-400 rounded-full animate-spin"></div>
          </div>
        </div>
        <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent animate-pulse">
          AI Analysis in Progress
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          Advanced product intelligence with Google Search verification
        </p>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-8 relative z-10">
        <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <span className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            Progress
          </span>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
            <div 
              className={`h-4 rounded-full bg-gradient-to-r ${steps[currentStep].color} transition-all duration-500 ease-out relative overflow-hidden`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          {/* Glow effect */}
          <div 
            className={`absolute top-0 h-4 rounded-full bg-gradient-to-r ${steps[currentStep].color} opacity-50 blur-sm transition-all duration-500`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Enhanced Current Step */}
      <div className="bg-gradient-to-br from-white/80 to-blue-50/80 dark:from-gray-800/80 dark:to-blue-900/20 backdrop-blur-sm rounded-xl p-6 mb-6 border border-blue-200/50 dark:border-blue-700/30 shadow-lg relative z-10">
        <div className="flex items-center mb-4">
          <div className="relative mr-4">
            <div className={`w-14 h-14 bg-gradient-to-r ${steps[currentStep].color} rounded-xl flex items-center justify-center shadow-xl relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              <i className={`${steps[currentStep].icon} text-white text-xl relative z-10`}></i>
            </div>
            {/* Pulsing ring effect */}
            <div className={`absolute inset-0 w-14 h-14 bg-gradient-to-r ${steps[currentStep].color} rounded-xl opacity-30 animate-ping`}></div>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
              {steps[currentStep].title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>
          {/* Status indicator */}
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
        
        {/* Step Progress */}
        <div className="flex space-x-2 mt-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                index < currentStep 
                  ? 'bg-green-500' 
                  : index === currentStep 
                    ? `bg-gradient-to-r ${step.color}` 
                    : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Steps List */}
      <div className="space-y-4 relative z-10">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center p-4 rounded-xl transition-all duration-500 transform relative overflow-hidden ${
              index < currentStep
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border border-green-300 dark:border-green-700 shadow-md scale-95'
                : index === currentStep
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 border border-blue-300 dark:border-blue-700 shadow-lg scale-100'
                  : 'bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-600 scale-95 opacity-60'
            }`}
          >
            {/* Background glow for active step */}
            {index === currentStep && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 to-indigo-200/20 dark:from-blue-800/20 dark:to-indigo-800/20 animate-pulse"></div>
            )}
            
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 relative z-10 transition-all duration-300 ${
              index < currentStep
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : index === currentStep
                  ? `bg-gradient-to-r ${step.color} text-white shadow-xl animate-pulse`
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
            }`}>
              {index < currentStep ? (
                <i className="fas fa-check text-sm animate-bounce"></i>
              ) : (
                <i className={`${step.icon} text-sm ${index === currentStep ? 'animate-pulse' : ''}`}></i>
              )}
            </div>
            
            <div className="flex-1 relative z-10">
              <div className={`font-semibold text-sm mb-1 ${
                index <= currentStep 
                  ? 'text-gray-900 dark:text-gray-100' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.title}
              </div>
              <div className={`text-xs leading-relaxed ${
                index <= currentStep 
                  ? 'text-gray-600 dark:text-gray-300' 
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {step.description}
              </div>
            </div>
            
            {index === currentStep && (
              <div className="flex items-center space-x-1 relative z-10">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
            
            {index < currentStep && (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center relative z-10">
                <i className="fas fa-check text-white text-xs"></i>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Technical Details */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">AI Model</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Gemini Pro</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Data Sources</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">3+ APIs</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Accuracy</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">95%+</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;