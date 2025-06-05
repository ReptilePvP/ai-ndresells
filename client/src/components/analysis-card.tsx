import { AnalysisWithUpload } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface AnalysisCardProps {
  analysis: AnalysisWithUpload;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const timeAgo = formatDistanceToNow(new Date(analysis.analyzedAt), { addSuffix: true });
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{timeAgo}</span>
        {analysis.feedback && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            analysis.feedback.isAccurate
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          }`}>
            {analysis.feedback.isAccurate ? "✓ Accurate" : "✗ Inaccurate"}
          </span>
        )}
      </div>
      
      <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        <img 
          src={`/api/image/${analysis.upload.filename}`}
          alt={analysis.productName}
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="text-gray-400 dark:text-gray-500 hidden">
          <i className="fas fa-image text-2xl mb-1"></i>
          <p className="text-sm">Image unavailable</p>
        </div>
      </div>
      
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
        {analysis.productName}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        New: {analysis.averageSalePrice} • Used: {analysis.resellPrice}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Confidence: {analysis.confidence ? Math.round(analysis.confidence * 100) : 85}%
        </span>
        <button className="text-blue-500 hover:text-blue-700 text-sm transition-colors">
          <i className="fas fa-external-link-alt"></i>
        </button>
      </div>
    </div>
  );
}
