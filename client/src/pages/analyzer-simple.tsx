import { useState } from "react";

export default function Analyzer() {
  const [message, setMessage] = useState("ND Resells - AI Product Analysis");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {message}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Upload product images to get instant pricing analysis and market insights
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12">
              <div className="text-center">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Upload Product Image
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Drag and drop an image or click to browse
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}