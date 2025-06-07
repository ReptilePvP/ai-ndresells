import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, VideoOff, Loader2, Camera, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";
import { Link } from "wouter";

export function LiveAnalysisPage() {
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Use the camera hook for clean camera management
  const { 
    videoRef, 
    stream, 
    error: cameraError, 
    isLoading: cameraLoading, 
    isPlaying, 
    startCamera, 
    stopCamera, 
    playVideo 
  } = useCamera({
    facingMode: 'environment',
    width: 1920,
    height: 1080
  });
  
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

  const startFrameCapture = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    console.log('Starting frame capture');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Start capturing frames every 2 seconds for live analysis
    intervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && connectionStatus === 'connected') {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log('Capturing frame for analysis');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'video_frame',
            data: frameData.split(',')[1],
            timestamp: Date.now()
          }));
        }
      }
    }, 2000);
  };

  const stopFrameCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Frame capture stopped');
    }
  };

  const startLiveAnalysis = async () => {
    setConnectionStatus('connecting');
    
    try {
      // Start camera
      await startCamera();
      
      // Set up WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connected for live analysis");
        setConnectionStatus('connected');
        setIsActive(true);
        
        // Start frame capture once video is playing
        if (isPlaying) {
          startFrameCapture();
        }
        
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
            
            if (response.productName && response.productName !== "No product detected") {
              toast({
                title: "Product Detected",
                description: response.productName,
              });
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket response:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
        toast({
          title: "Connection Error",
          description: "Failed to connect to analysis service",
          variant: "destructive"
        });
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsActive(false);
        setConnectionStatus('disconnected');
      };
      
    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('Live analysis error:', error);
      
      toast({
        title: "Setup Error",
        description: cameraError || "Failed to start live analysis",
        variant: "destructive",
      });
    }
  };

  const analyzeCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current || !stream || !wsRef.current || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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
    // Stop frame capture
    stopFrameCapture();
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop camera
    stopCamera();
    
    setIsActive(false);
    setIsAnalyzing(false);
    setLastAnalysis("");
    setAnalysisCount(0);
    setConnectionStatus('disconnected');
    
    toast({
      title: "Live Analysis Stopped",
      description: "Real-time analysis disconnected",
    });
  };

  // Start frame capture when video starts playing
  useEffect(() => {
    if (isPlaying && connectionStatus === 'connected') {
      startFrameCapture();
    }
  }, [isPlaying, connectionStatus]);

  useEffect(() => {
    return () => {
      stopLiveAnalysis();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live Analysis</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time product identification through camera</p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus === 'connected' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />}
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </Badge>
            
            {analysisCount > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {analysisCount} analysis{analysisCount !== 1 ? 'es' : ''} completed
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isActive ? (
              <Button 
                onClick={startLiveAnalysis} 
                disabled={cameraLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {cameraLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                Start Live Analysis
              </Button>
            ) : (
              <Button onClick={stopLiveAnalysis} variant="destructive">
                <VideoOff className="h-4 w-4 mr-2" />
                Stop Analysis
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Camera Feed
                  {isPlaying && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Live Analysis Ready
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  {/* Error State */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <div className="text-center">
                        <VideoOff className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-600 dark:text-red-400 text-sm">{cameraError}</p>
                        <Button 
                          onClick={() => startCamera()} 
                          size="sm" 
                          className="mt-2"
                        >
                          Retry Camera
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {cameraLoading && !cameraError && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                        <span className="text-gray-300 text-sm">Connecting to camera...</span>
                      </div>
                    </div>
                  )}

                  {/* Video Not Playing State */}
                  {stream && !isPlaying && !cameraError && !cameraLoading && (
                    <div className="absolute inset-0 bg-gray-800 z-5 flex items-center justify-center">
                      <div className="text-center">
                        <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-gray-300 text-sm block mb-2">Camera ready</span>
                        <Button 
                          onClick={playVideo}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Start Video Feed
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="relative z-10 w-full h-full object-cover"
                    style={{ minHeight: '400px' }}
                  />
                  
                  {/* Hidden canvas for frame capture */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                    width="640"
                    height="480"
                  />
                  
                  {/* Analysis Status Overlay */}
                  {isActive && (
                    <div className="absolute top-4 left-4 right-4 z-20">
                      <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analyzing frame...
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span>Live analysis active</span>
                            <Button 
                              onClick={analyzeCurrentFrame}
                              size="sm"
                              disabled={isAnalyzing}
                              className="text-xs h-6"
                            >
                              Analyze Now
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Results */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                {lastAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Latest Detection</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {lastAnalysis}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Total Analyses: {analysisCount}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Point your camera at products for instant AI identification. Results will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}