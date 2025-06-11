import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

interface AnalysisThinkingProcessProps {
  thinkingProcess: string;
  confidence: number;
}

export function AnalysisThinkingProcess({ thinkingProcess, confidence }: AnalysisThinkingProcessProps) {
  // Format the thinking process for better readability
  const formattedProcess = thinkingProcess
    .split('\n')
    .map((line, index) => {
      // Add indentation for nested steps
      if (line.startsWith('  ')) {
        return <div key={index} className="ml-4 text-sm text-gray-600 dark:text-gray-400">{line}</div>;
      }
      // Make main steps more prominent
      if (line.startsWith('-')) {
        return <div key={index} className="font-medium text-gray-800 dark:text-gray-200">{line}</div>;
      }
      return <div key={index} className="text-gray-700 dark:text-gray-300">{line}</div>;
    });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Brain className="mr-2 h-4 w-4" />
          AI Thinking Process
        </CardTitle>
        <Badge variant={confidence > 0.7 ? "default" : "secondary"}>
          {Math.round(confidence * 100)}% Confidence
        </Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          <div className="space-y-2">
            {formattedProcess}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 