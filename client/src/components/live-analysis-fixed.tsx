import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Camera, Loader2, Eye, Scan, VideoOff, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";

interface LiveAnalysisProps {
  onClose: () => void;
}

export function LiveAnalysisFixed({ onClose }: LiveAnalysisProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const { toast } = useToast();
  
  // Use the proper camera hook
  const {
    videoRef,
    stream,
    error: cameraError,
    isLoading: isCameraLoading,
    isPlaying: isCameraPlaying,
    startCamera,
    stopCamera
  } = useCamera({
    facingMode: 'environment',
    width: 1280,
    height: 720
  });

  // Auto-start when component mounts
  useEffect(() => {
    initializeLiveAnalysis();
    return cleanup;
  }, []);

  const initializeLiveAnalysis = async () => {
    try {
      // Start WebSocket connection first
      await connectWebSocket();
      
      // Then start camera
      await startCamera();
      
      // Enter fullscreen mode
      if (containerRef.current) {
        try {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.log('Fullscreen not supported');
        }
      }
    } catch (error) {
      console.error('Failed to initialize live analysis:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to start live analysis",
        variant: "destructive",
      });
    }
  };

  const connectWebSocket = () => {
    return new Promise<void>((resolve, reject) => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/live`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Send setup message
        ws.send(JSON.stringify({
          type: 'setup',
          config: {
            model: 'models/gemini-2.0-flash-exp',
            responseModalities: ['TEXT'],
            systemPrompt: 'You are an expert product analyst. Identify products and provide concise pricing insights for resellers.'
          }
        }));
        
        resolve();
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received:', data);
          
          if (data.type === 'analysis_result') {
            setLastAnalysis(data.analysis || 'Analysis complete');
            setAnalysisCount(prev => prev + 1);
            setIsAnalyzing(false);
          }
        } catch (error) {
          console.error('Message parse error:', error);
        }
      };
      
      ws.onclose = () => {
        clearTimeout(timeout);
        console.log('WebSocket closed');
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  };

  // Show ready message when camera is connected
  useEffect(() => {
    if (isCameraPlaying && !isCameraLoading) {
      toast({
        title: "Camera Ready",
        description: "Point camera at product and tap Analyze",
      });
    }
  }, [isCameraPlaying, isCameraLoading, toast]);

  // Debug camera state changes
  useEffect(() => {
    console.log('Live Analysis state update:', {
      stream: !!stream,
      streamActive: stream?.active,
      isCameraLoading,
      isCameraPlaying,
      isConnected,
      cameraError
    });
  }, [stream, isCameraLoading, isCameraPlaying, isConnected, cameraError]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing || !stream) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Resize to reduce payload size while maintaining quality
      const maxWidth = 800;
      const scale = Math.min(maxWidth / video.videoWidth, maxWidth / video.videoHeight);
      
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.4);
      
      console.log('Sending frame for direct analysis...');
      
      // Use direct API call instead of WebSocket for more reliable analysis
      const analysisResponse = await fetch('/api/analyze-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData,
          sessionId: generateSessionId()
        })
      });

      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        console.log('Analysis received:', analysis);
        
        // Format the analysis result
        const analysisText = analysis.productName || analysis.analysis || "Product analyzed";
        setLastAnalysis(analysisText);
        setAnalysisCount(prev => prev + 1);
        
        toast({
          title: "Analysis Complete",
          description: "Product identified successfully",
        });
      } else {
        throw new Error('Analysis failed');
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to generate session ID
  const generateSessionId = () => {
    return Math.random().toString(36).substring(7);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    stopCamera();
    
    if (isFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle camera error state
  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <VideoOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-4 text-white">Camera Access Required</h2>
            <p className="text-gray-300 mb-6">{cameraError}</p>
            
            {cameraError.includes('permission') && (
              <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-medium text-blue-300 mb-2">How to enable camera:</h3>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Click the camera icon in your browser's address bar</li>
                  <li>• Select "Allow" for camera access</li>
                  <li>• Refresh the page if needed</li>
                </ul>
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  startCamera().catch(console.error);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={handleClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
        <div className="flex items-center gap-2">
          {isConnected && (
            <Badge className="bg-green-600 text-white">
              <Eye className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
          {isCameraLoading && (
            <Badge className="bg-blue-600 text-white">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Starting Camera...
            </Badge>
          )}
          {isAnalyzing && (
            <Badge className="bg-purple-600 text-white animate-pulse">
              <Scan className="h-3 w-3 mr-1" />
              Analyzing...
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleFullscreen}
            variant="secondary"
            size="sm"
            className="bg-black/50 hover:bg-black/70 text-white border-none"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            onClick={handleClose}
            variant="secondary"
            size="sm"
            className="bg-black/50 hover:bg-black/70 text-white border-none"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video Feed */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          onClick={async () => {
            if (videoRef.current && stream && !isCameraPlaying) {
              try {
                await videoRef.current.play();
              } catch (err) {
                console.error('Manual play failed:', err);
              }
            }
          }}
        />
        
        {/* Camera Scanning Overlay */}
        {isCameraPlaying && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets - larger and more prominent */}
            <div className="absolute top-16 left-16 w-12 h-12 border-l-4 border-t-4 border-green-400"></div>
            <div className="absolute top-16 right-16 w-12 h-12 border-r-4 border-t-4 border-green-400"></div>
            <div className="absolute bottom-24 left-16 w-12 h-12 border-l-4 border-b-4 border-green-400"></div>
            <div className="absolute bottom-24 right-16 w-12 h-12 border-r-4 border-b-4 border-green-400"></div>
            
            {/* Center target circle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-20 rounded-full border-2 border-green-400 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              </div>
            </div>
            
            {/* Ready to Scan indicator */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 rounded-full px-4 py-2">
              <div className="flex items-center space-x-2 text-white text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Ready to Scan</span>
              </div>
            </div>
            
            {/* Point camera instruction at bottom */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 rounded-full px-6 py-3">
              <div className="flex items-center space-x-2 text-white text-sm">
                <Camera className="w-4 h-4 text-green-400" />
                <span>Point camera to identify</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Overlay when not playing */}
        {(!isCameraPlaying || isCameraLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-4">
                {isCameraLoading ? "Setting up camera..." : stream ? "Camera Ready" : "Camera not ready"}
              </p>
              
              {stream && !isCameraPlaying && (
                <Button
                  onClick={async () => {
                    if (videoRef.current && stream) {
                      try {
                        console.log('Attempting manual video play...');
                        await videoRef.current.play();
                        console.log('Manual video play successful');
                      } catch (err) {
                        console.error('Manual play failed:', err);
                        toast({
                          title: "Camera Activation Failed",
                          description: "Please try refreshing the page",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Eye className="mr-2 h-5 w-5" />
                  Start Camera Feed
                </Button>
              )}
              
              {!stream && !isCameraLoading && (
                <Button
                  onClick={() => {
                    startCamera().catch(console.error);
                  }}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Enable Camera
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info Panel */}
      {lastAnalysis && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-black/80 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-white">AI Analysis #{analysisCount}</h4>
                <Badge variant="outline" className="text-white border-gray-400">
                  Live
                </Badge>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">{lastAnalysis}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analyze Button - Bottom Center */}
      {isCameraPlaying && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            onClick={captureAndAnalyze}
            disabled={isAnalyzing || !isCameraPlaying}
            size="lg"
            className="bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-4 shadow-2xl border-2 border-white pointer-events-auto"
          >
            {isAnalyzing ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-semibold">Analyzing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span className="font-semibold">Analyze</span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}