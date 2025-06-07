import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, VideoOff, Loader2, Camera, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export function LiveAnalysisPage() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
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
    setConnectionStatus('connecting');
    
    try {
      // Get camera stream with fallback options
      let stream;
      try {
        // Try rear camera first (mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      } catch (err) {
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      }
      
      setVideoStream(stream);
      
      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          if (!videoRef.current) return reject(new Error('Video element not found'));
          
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            videoRef.current?.play().then(() => {
              console.log('Video play() called successfully');
              setVideoPlaying(true);
              resolve(void 0);
            }).catch(reject);
          };
          
          videoRef.current.onplaying = () => {
            console.log('Video is now playing');
            setVideoPlaying(true);
          };
          
          videoRef.current.oncanplay = () => {
            console.log('Video can start playing');
          };
          
          videoRef.current.onerror = (e) => {
            console.error('Video error:', e);
            reject(new Error('Video playback failed'));
          };
          
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('Video setup timeout')), 10000);
        });
        
        console.log('Video stream started successfully:', {
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          readyState: videoRef.current.readyState,
          srcObject: !!videoRef.current.srcObject,
          streamActive: stream.active,
          tracks: stream.getTracks().map(track => ({
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState
          }))
        });
      }
      
      // Connect to WebSocket for live analysis
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connected for live analysis");
        setIsConnecting(false);
        setIsActive(true);
        setConnectionStatus('connected');
        
        // Send setup configuration for Gemini Live
        const setupConfig = {
          type: 'setup',
          config: {
            model: 'models/gemini-2.0-flash-exp',
            responseModalities: ['TEXT'],
            systemPrompt: `You are an expert product analyst for resale market evaluation. When analyzing products:

1. IDENTIFY the product name, brand, and model when visible
2. ASSESS the condition and any visible defects
3. PROVIDE quick market insights for resale value
4. RESPOND with concise, actionable information

Focus on real-time identification and pricing guidance for resellers.`
          }
        };
        
        ws.send(JSON.stringify(setupConfig));
        
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
        setError("Connection to analysis service failed");
        setIsConnecting(false);
        setConnectionStatus('disconnected');
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsActive(false);
        setConnectionStatus('disconnected');
      };
      
    } catch (err) {
      setIsConnecting(false);
      setConnectionStatus('disconnected');
      let errorMsg = 'Failed to start live analysis';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera is being used by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMsg = 'Camera constraints not supported. Trying with basic settings...';
        } else {
          errorMsg = err.message;
        }
      }
      
      setError(errorMsg);
      console.error('Live analysis error:', err);
      
      toast({
        title: "Camera Error",
        description: errorMsg,
        variant: "destructive",
      });
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
    setVideoPlaying(false);
    setConnectionStatus('disconnected');
    
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Product Analysis</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time AI-powered product identification</p>
          </div>
        </div>

        {/* Status Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'connecting' ? 'secondary' : 'outline'}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                    'bg-gray-400'
                  }`}></div>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 
                   'Disconnected'}
                </Badge>
                {analysisCount > 0 && (
                  <Badge variant="outline">
                    {analysisCount} scans completed
                  </Badge>
                )}
              </div>
              {isActive && (
                <Button variant="destructive" size="sm" onClick={stopLiveAnalysis}>
                  <VideoOff className="h-4 w-4 mr-2" />
                  Stop Analysis
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {!isActive && !isConnecting && !error && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Start Live Analysis</CardTitle>
              <p className="text-gray-600 dark:text-gray-400">
                Use your camera to get real-time AI analysis of products. Point your camera at any item to identify it and get instant market insights.
              </p>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={startLiveAnalysis}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Eye className="mr-2 h-5 w-5" />
                Start Live Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {isConnecting && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Starting Live Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connecting to camera and AI analysis service...
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="max-w-2xl mx-auto border-red-200 dark:border-red-800">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center mx-auto mb-4">
                <VideoOff className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Camera Access Required</h3>
              <p className="text-red-600 dark:text-red-400 mb-6">
                {error}
              </p>
              <Button 
                onClick={() => {
                  setError(null);
                  startLiveAnalysis();
                }}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Feed */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    Live Camera Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    {/* Debug background pattern - only show when video isn't playing */}
                    {!videoPlaying && (
                      <div className="absolute inset-0 opacity-60 z-5">
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20"></div>
                        <div className="absolute inset-4 border-2 border-dashed border-gray-400 dark:border-gray-500 rounded flex items-center justify-center">
                          <div className="text-center">
                            <Eye className="w-8 h-8 text-gray-500 dark:text-gray-400 mx-auto mb-2" />
                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                              {videoStream ? 'Loading camera feed...' : 'Camera connecting...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="relative z-10 w-full h-full object-cover"
                      style={{ minHeight: '400px' }}
                    />
                    
                    {/* Analysis Status Overlay */}
                    <div className="absolute top-4 left-4 right-4 z-20">
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
                      <div className="absolute bottom-4 left-4 right-4 z-20">
                        <div className="bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm">
                          <strong>Detected:</strong> {lastAnalysis}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Panel */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Point your camera at products for instant AI identification. Results will appear here.
                    </p>
                  </div>
                  
                  {lastAnalysis && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Latest Detection</h4>
                      <p className="text-blue-800 dark:text-blue-200">{lastAnalysis}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}