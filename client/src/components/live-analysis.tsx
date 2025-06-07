import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoOff, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LiveAnalysisProps {
  onAnalysis?: (analysis: any) => void;
}

export function LiveAnalysis({ onAnalysis }: LiveAnalysisProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>("");
  const [analysisCount, setAnalysisCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const getSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(7);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const startLiveAnalysis = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      setVideoStream(stream);
      
      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      // Connect to WebSocket for live analysis
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connected for live analysis");
        setIsConnecting(false);
        setIsActive(true);
        
        // Start periodic frame capture and analysis
        intervalRef.current = setInterval(analyzeCurrentFrame, 3000);
        
        toast({
          title: "Live Analysis Started",
          description: "Real-time product identification active",
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.type === 'analysis') {
            setLastAnalysis(response.productName || "Analyzing...");
            setAnalysisCount(prev => prev + 1);
            setIsAnalyzing(false);
            
            if (onAnalysis) {
              onAnalysis(response);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket response:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError("Connection to analysis service failed");
        setIsConnecting(false);
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsActive(false);
      };
      
    } catch (err) {
      setIsConnecting(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start live analysis';
      setError(errorMsg);
      console.error('Live analysis error:', err);
    }
  };

  const analyzeCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current || !videoStream || !wsRef.current || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Capture current frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Convert to base64 and send via WebSocket
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      wsRef.current.send(JSON.stringify({
        type: 'analyze_frame',
        imageData,
        sessionId: getSessionId()
      }));
      
    } catch (error) {
      console.error('Frame capture error:', error);
      setIsAnalyzing(false);
    }
  };

  const stopLiveAnalysis = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    
    setIsActive(false);
    setIsAnalyzing(false);
    setLastAnalysis("");
    setAnalysisCount(0);
    setError(null);
    
    toast({
      title: "Live Analysis Stopped",
      description: "Real-time analysis disconnected",
    });
  };

  useEffect(() => {
    return () => {
      stopLiveAnalysis();
    };
  }, []);

  if (!isActive && !isConnecting) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 rounded-xl flex items-center justify-center mx-auto">
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Live Product Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get real-time AI analysis as you point your camera at products. 
                Uses advanced WebSocket streaming for instant results.
              </p>
            </div>
            <Button 
              onClick={startLiveAnalysis}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Eye className="mr-2 h-5 w-5" />
              Start Live Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold">Starting Live Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connecting to camera and AI analysis service...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Analysis Active</span>
              <span className="text-xs text-gray-500">({analysisCount} scans)</span>
            </div>
            <Button variant="outline" size="sm" onClick={stopLiveAnalysis}>
              <VideoOff className="h-4 w-4" />
            </Button>
          </div>

          {/* Video preview */}
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Analysis Status Overlay */}
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live Analysis Ready</span>
                  </div>
                )}
              </div>
            </div>

            {/* Last Analysis Result */}
            {lastAnalysis && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-purple-600/90 text-white px-3 py-2 rounded-lg text-sm">
                  <strong>Detected:</strong> {lastAnalysis}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Point your camera at products for instant AI identification • Analyzes every 3 seconds
          </div>
        </div>
        
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}