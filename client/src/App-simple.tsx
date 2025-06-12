import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";

function SimpleApp() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              ND Resells - AI Product Analysis
            </h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 mb-4">
                Application is loading successfully!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded">
                  <h3 className="font-semibold mb-2">Database Status</h3>
                  <p className="text-green-600">Connected</p>
                </div>
                <div className="p-4 border rounded">
                  <h3 className="font-semibold mb-2">API Status</h3>
                  <p className="text-green-600">Running</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default SimpleApp;