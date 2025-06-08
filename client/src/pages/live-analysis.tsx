import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, VideoOff, Loader2, Camera, ArrowLeft, X, Zap, ShoppingBag, DollarSign, Info } from "lucide-react";
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

  // Debug stream state changes
  useEffect(() => {
    console.log('Stream state changed:', {
      hasStream: !!stream,
      streamId: stream?.id,
      tracks: stream?.getTracks().length
    });
  }, [stream]);
  
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
    console.log('Starting frame capture');
    
    intervalRef.current = setInterval(() => {
      analyzeCurrentFrame();
    }, 3000); // Analyze every 3 seconds
  };

  const stopFrameCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Frame capture stopped');
    }
  };

  const startLiveAnalysis = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Start camera and get direct access to stream
      await startCamera();
      
      // Give camera hook time to update and check video element directly
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      const video = videoRef.current;
      
      // Wait for video to have an active stream
      let streamCheckAttempts = 0;
      while (streamCheckAttempts < 10 && !video.srcObject) {
        await new Promise(resolve => setTimeout(resolve, 500));
        streamCheckAttempts++;
        console.log(`Checking for video stream: attempt ${streamCheckAttempts}`);
      }

      if (!video.srcObject) {
        throw new Error('Video stream not assigned - camera access may have failed');
      }

      console.log('Video stream confirmed, proceeding with WebSocket connection');

      // Create WebSocket connection to the correct path
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/live`;
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          throw new Error('WebSocket connection timeout');
        }
      }, 10000);
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected for live analysis');
        setConnectionStatus('connected');
        setIsActive(true);
        
        toast({
          title: "Live Analysis Ready",
          description: "Tap the scan button to analyze products",
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'analysis_result') {
            setLastAnalysis(data.analysis);
            setAnalysisCount(prev => prev + 1);
            setIsAnalyzing(false);
          } else if (data.type === 'error') {
            console.error('Analysis error:', data.message);
            setIsAnalyzing(false);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
          setIsAnalyzing(false);
        }
      };
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setConnectionStatus('disconnected');
      };
      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error details:', {
          error: error,
          readyState: ws.readyState,
          url: wsUrl
        });
        setConnectionStatus('disconnected');
        
        // Try to continue with basic analysis functionality
        if (videoRef.current && stream) {
          console.log('WebSocket failed, continuing with basic camera functionality');
          setIsActive(true);
          toast({
            title: "Limited Mode",
            description: "Camera active but live analysis unavailable",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Connection Error",
            description: "Failed to connect to analysis service",
            variant: "destructive",
          });
        }
      };
      
    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('Live analysis error:', error);
      
      // Extract detailed error information
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else if (typeof error === 'object' && error !== null) {
        console.error('Non-Error object:', error);
        errorMessage = JSON.stringify(error);
      }
      
      toast({
        title: "Setup Error",
        description: cameraError || errorMessage || "Failed to start live analysis",
        variant: "destructive",
      });
    }
  };

  const analyzeCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current || isAnalyzing) {
      return;
    }

    const video = videoRef.current;
    
    // Check if video has stream and is not paused
    if (!video.srcObject || video.paused || video.ended) {
      console.log('Video not ready for analysis - no stream or paused');
      return;
    }

    // Allow analysis even if dimensions are 0 - some browsers don't report them correctly
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    setIsAnalyzing(true);
    console.log('Capturing frame for analysis', { videoWidth, videoHeight, readyState: video.readyState });
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setIsAnalyzing(false);
        return;
      }

      // Set canvas dimensions
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 and send via WebSocket
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'analyze_frame',
          imageData,
          sessionId: getSessionId()
        }));
      } else {
        console.log('WebSocket not ready');
        setIsAnalyzing(false);
      }
      
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

  // Ensure video element gets the stream when available
  useEffect(() => {
    if (videoRef.current && stream && isActive) {
      console.log('Assigning stream to video element');
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      // Force play
      video.play().then(() => {
        console.log('Video playing with stream');
      }).catch(err => {
        console.error('Video play error:', err);
      });
    }
  }, [stream, isActive, videoRef.current]);

  // Remove automatic frame capture - now manual only
  // useEffect(() => {
  //   if (isPlaying && connectionStatus === 'connected') {
  //     startFrameCapture();
  //   }
  // }, [isPlaying, connectionStatus]);

  useEffect(() => {
    return () => {
      stopLiveAnalysis();
    };
  }, []);

  // Mobile-first immersive UI when active
  if (isActive) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Top Status Bar - Mobile Style */}
        <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/70 to-transparent p-4 safe-area-inset-top">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Button
                onClick={stopLiveAnalysis}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2 h-auto w-auto rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">LIVE</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {analysisCount} scans
              </Badge>
              {connectionStatus === 'connected' && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* Full Screen Video */}
        <div className="flex-1 relative">
          <video
            ref={(el) => {
              if (videoRef) {
                videoRef.current = el;
              }
              // Ensure the video gets the stream immediately when element is ready
              if (el && stream) {
                el.srcObject = stream;
                el.play().catch(console.log);
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ backgroundColor: '#000' }}
          />

          {/* Analysis Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3">
                <Zap className="w-5 h-5 animate-pulse" />
                <span className="font-medium">Analyzing product...</span>
              </div>
            </div>
          )}

          {/* Center Focus Ring with Scan Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-l-2 border-t-2 border-white rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-r-2 border-t-2 border-white rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-2 border-b-2 border-white rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-2 border-b-2 border-white rounded-br-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!isAnalyzing ? (
                  <Button
                    onClick={analyzeCurrentFrame}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16 p-0 pointer-events-auto"
                    disabled={!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN}
                  >
                    <Zap className="w-8 h-8" />
                  </Button>
                ) : (
                  <div className="text-white/80 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm font-medium">Analyzing...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analysis Results Overlay */}
          {lastAnalysis && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">Analysis Result</span>
                </div>
                <p className="text-sm">{lastAnalysis}</p>
              </div>
            </div>
          )}

          {/* Error State Overlay */}
          {cameraError && (
            <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center text-white text-center p-8">
              <div>
                <VideoOff className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
                <p className="text-red-200 mb-4">{cameraError}</p>
                <Button onClick={startLiveAnalysis} variant="secondary">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Analysis Results - Slide Up Panel */}
        {lastAnalysis && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 max-h-96 overflow-y-auto safe-area-inset-bottom">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-5 h-5 text-green-400" />
                <span className="font-semibold">Product Analysis</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {lastAnalysis}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Instruction Text */}
        {!lastAnalysis && (
          <div className="absolute bottom-8 left-4 right-4 text-center safe-area-inset-bottom">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-3">
              <p className="text-white/90 text-sm">
                Point camera at any product for instant market analysis
              </p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Landing/Setup Screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Live Analysis</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time product identification and market insights
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {cameraError && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <VideoOff className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Camera Access Required</p>
                <p className="text-sm text-red-700 dark:text-red-300">{cameraError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Setup Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            {/* Preview Area */}
            <div className="aspect-video bg-black relative">
              {cameraLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Preparing camera...</p>
                  </div>
                </div>
              ) : stream ? (
                <video
                  ref={(el) => {
                    if (videoRef) {
                      videoRef.current = el;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm opacity-75">Camera preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Ready to Analyze</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Start live analysis to identify products and get instant market insights
                </p>
              </div>

              <Button
                onClick={startLiveAnalysis}
                disabled={cameraLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                size="lg"
              >
                {cameraLoading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5 mr-2" />
                )}
                Start Live Analysis
              </Button>

              {/* Features */}
              <div className="space-y-3 pt-4 border-t dark:border-gray-700">
                <div className="flex items-center gap-3 text-sm">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Real-time product identification</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span>Instant market pricing analysis</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Info className="w-4 h-4 text-purple-600" />
                  <span>Detailed product insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}