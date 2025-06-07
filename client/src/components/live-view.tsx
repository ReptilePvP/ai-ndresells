import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, VideoOff, Eye, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LiveViewProps {
  onAnalysis?: (analysis: any) => void;
}

export function LiveView({ onAnalysis }: LiveViewProps) {
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
  const { toast } = useToast();

  // Get session ID for uploads
  const getSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(7);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const analyzeCurrentFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !videoStream || isAnalyzing) {
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

      // Convert canvas to base64 and send for direct analysis
      const imageData = canvas.toDataURL('image/jpeg', 0.7);

      try {
        // Send frame directly for live analysis
        const analysisResponse = await fetch('/api/analyze-live', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageData,
            sessionId: getSessionId()
          })
        });

        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();
          setLastAnalysis(analysis.productName || "Analyzing...");
          setAnalysisCount(prev => prev + 1);
          
          if (onAnalysis) {
            onAnalysis(analysis);
          }
        }
      } catch (error) {
        console.error('Live analysis error:', error);
      }
    } catch (error) {
      console.error('Frame capture error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoStream, isAnalyzing, onAnalysis]);

  const startLiveView = async () => {
    console.log("Starting live view...");
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      console.log("Camera stream obtained:", stream);
      setVideoStream(stream);
      
      if (videoRef.current) {
        console.log("Setting video srcObject");
        const video = videoRef.current;
        video.srcObject = stream;
        
        // Force video to play
        video.play().catch(err => console.log("Play error:", err));
        
        const activateVideo = () => {
          console.log("Activating video - readyState:", video.readyState);
          setIsConnecting(false);
          setIsActive(true);
          
          // Start periodic analysis every 3 seconds
          intervalRef.current = setInterval(analyzeCurrentFrame, 3000);
          
          toast({
            title: "Live View Started",
            description: "AI is now analyzing your camera feed in real-time",
          });
        };

        // Immediate activation since stream is ready
        setTimeout(() => {
          console.log("Force activation after 1 second");
          activateVideo();
        }, 1000);
      }
    } catch (err) {
      setIsConnecting(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start live view';
      setError(errorMsg);
      console.error('Live view error:', err);
    }
  };

  const stopLiveView = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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
      title: "Live View Stopped",
      description: "Real-time analysis has been disconnected",
    });
  };

  useEffect(() => {
    return () => {
      stopLiveView();
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
                Get continuous AI analysis as you point your camera at products. 
                Perfect for quick product identification and real-time pricing insights.
              </p>
            </div>
            <Button 
              onClick={startLiveView}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Eye className="mr-2 h-5 w-5" />
              Start Live View
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
              <h3 className="text-lg font-semibold">Starting Live View</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Initializing camera and AI analysis...
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
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Analysis Active</span>
              <span className="text-xs text-gray-500">({analysisCount} scans)</span>
            </div>
            <Button variant="outline" size="sm" onClick={stopLiveView}>
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
                    <span>Watching for products</span>
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

            {/* Error Overlay */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
                <div className="text-center text-white">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={stopLiveView}
                  >
                    Stop Live View
                  </Button>
                </div>
              </div>
            )}

            {/* Scanning Frame */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-32 h-32 border-2 border-purple-400/50 rounded-lg animate-pulse">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Point your camera at products for continuous AI analysis • Auto-scans every 3 seconds
          </div>
        </div>
        
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}