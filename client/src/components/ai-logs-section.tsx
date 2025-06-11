
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AILog {
  id: number;
  uploadId: number;
  timestamp: string;
  model: string;
  prompt: string;
  rawResponse: string;
  parsedResponse: any;
  confidence: number;
  processingTime: number;
  success: boolean;
  error: string | null;
  createdAt: string;
}

export function AILogsSection() {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const { data: aiLogs, isLoading } = useQuery({
    queryKey: ["ai-logs"],
    queryFn: () => apiRequest<AILog[]>("/api/admin/ai-logs"),
  });

  const toggleExpanded = (logId: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  if (isLoading) {
    return <div>Loading AI logs...</div>;
  }

  if (!aiLogs || aiLogs.length === 0) {
    return <div className="text-center py-8 text-gray-500">No AI logs found</div>;
  }

  return (
    <div className="space-y-4">
      {aiLogs.map((log) => (
        <Collapsible key={log.id}>
          <div className="border rounded-lg p-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                <div className="flex items-center space-x-4">
                  {expandedLogs.has(log.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Upload #{log.uploadId}</span>
                      <Badge variant={log.success ? "default" : "destructive"}>
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                      <Badge variant="outline">{log.model}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(log.timestamp))} ago • 
                      {log.processingTime}ms • 
                      Confidence: {log.confidence ? (log.confidence * 100).toFixed(1) + '%' : 'N/A'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(log.id)}
                >
                  Details
                </Button>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4">
              <div className="grid gap-4">
                {log.error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">Error</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">{log.error}</p>
                  </div>
                )}

                {log.prompt && (
                  <div>
                    <h4 className="font-medium mb-2">Prompt</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{log.prompt}</pre>
                    </div>
                  </div>
                )}

                {log.rawResponse && (
                  <div>
                    <h4 className="font-medium mb-2">Raw AI Response</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{log.rawResponse}</pre>
                    </div>
                  </div>
                )}

                {log.parsedResponse && (
                  <div>
                    <h4 className="font-medium mb-2">Parsed Response</h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(log.parsedResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
