import { useState } from 'react';

export default function SimpleAnalyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysis(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const upload = await uploadResponse.json();
      
      const analyzeResponse = await fetch(`/api/analyze/${upload.id}`, {
        method: 'POST',
      });

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed');
      }

      const result = await analyzeResponse.json();
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Product Analysis Platform</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Product Image</h2>
        
        <div className="mb-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {selectedFile && (
          <div className="mb-4">
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Selected product"
              className="max-w-xs h-auto rounded-lg shadow-md"
            />
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Product'}
        </button>
      </div>

      {analysis && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700">Product Name</h3>
              <p className="text-gray-600">{analysis.productName}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700">Average Sale Price</h3>
              <p className="text-gray-600">{analysis.averageSalePrice}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700">Resell Price</h3>
              <p className="text-gray-600">{analysis.resellPrice}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700">Confidence</h3>
              <p className="text-gray-600">{Math.round(analysis.confidence * 100)}%</p>
            </div>
          </div>
          
          {analysis.description && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700">Description</h3>
              <p className="text-gray-600">{analysis.description}</p>
            </div>
          )}
          
          {analysis.marketSummary && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700">Market Summary</h3>
              <p className="text-gray-600">{analysis.marketSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}