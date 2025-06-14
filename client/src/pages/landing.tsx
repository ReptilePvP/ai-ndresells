import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            AI-Powered Product Analysis
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Upload product images and get instant market insights, pricing analysis, and resell recommendations powered by advanced AI.
          </p>
          
          <div className="mb-12">
            <Button 
              onClick={handleLogin}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Sign in to Get Started
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="fas fa-camera text-emerald-600 dark:text-emerald-400 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Upload & Analyze
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Simply upload product images and get detailed AI-powered analysis in seconds.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="fas fa-chart-line text-cyan-600 dark:text-cyan-400 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Market Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get real-time pricing data and market trends from multiple sources.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="fas fa-dollar-sign text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Resell Recommendations
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Receive intelligent pricing suggestions to maximize your profit margins.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Start Analyzing?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Join thousands of resellers and e-commerce professionals who trust our AI-powered analysis.
            </p>
            <Button 
              onClick={handleLogin}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
            >
              Sign In Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}