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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${steps[currentStep].color} rounded-full mb-4 animate-pulse shadow-lg`}>
          <i className={`${steps[currentStep].icon} text-white text-2xl`}></i>
        </div>
        <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
          AI Analysis in Progress
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced product intelligence with Google Search verification
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full bg-gradient-to-r ${steps[currentStep].color} transition-all duration-300 ease-out shadow-sm`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Current Step */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-6">
        <div className="flex items-center mb-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${steps[currentStep].color} rounded-lg flex items-center justify-center mr-4 animate-pulse`}>
            <i className={`${steps[currentStep].icon} text-white`}></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {steps[currentStep].title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {steps[currentStep].description}
            </p>
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

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
              index < currentStep
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : index === currentStep
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              index < currentStep
                ? 'bg-green-500 text-white'
                : index === currentStep
                  ? `bg-gradient-to-r ${step.color} text-white animate-pulse`
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
            }`}>
              {index < currentStep ? (
                <i className="fas fa-check text-sm"></i>
              ) : (
                <i className={`${step.icon} text-sm`}></i>
              )}
            </div>
            <div className="flex-1">
              <div className={`font-medium text-sm ${
                index <= currentStep 
                  ? 'text-gray-900 dark:text-gray-100' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.title}
              </div>
              <div className={`text-xs ${
                index <= currentStep 
                  ? 'text-gray-600 dark:text-gray-300' 
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {step.description}
              </div>
            </div>
            {index === currentStep && (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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