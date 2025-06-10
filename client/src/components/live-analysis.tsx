import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Camera, Loader2, Eye, Scan, VideoOff, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LiveAnalysisProps {
  onClose: () => void;
}

export function LiveAnalysis({ onClose }: LiveAnalysisProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const { toast } = useToast();

  // Auto-start connection when component mounts
  useEffect(() => {
    startLiveAnalysis();
    return () => {
      cleanup();
    };
  }, []);

  const startLiveAnalysis = async () => {
    setIsConnecting(true);
    
    try {
      // Start WebSocket connection
      await connectWebSocket();
      
      // Start camera
      await setupCamera();
      
      // Enter fullscreen mode
      if (containerRef.current) {
        try {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.log('Fullscreen not supported or denied');
        }
      }
      
    } catch (error) {
      console.error('Failed to start live analysis:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to start live analysis",
        variant: "destructive",
      });
      setIsConnecting(false);
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
        reject(new Error('Connection timeout'));
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
            systemPrompt: 'You are an expert product analyst. Identify products in the camera view and provide concise pricing insights for resellers. Be brief and actionable.'
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
          } else if (data.type === 'setup_complete') {
            console.log('Gemini setup complete');
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
        setIsConnected(false);
        reject(error);
      };
    });
  };

  const setupCamera = async () => {
    try {
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Video load failed'));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });
        
        await videoRef.current.play();
        setHasCamera(true);
        setIsConnecting(false);
        
        toast({
          title: "Live Analysis Ready",
          description: "Camera connected, AI analysis active",
        });
        
        // Start continuous analysis
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(captureAndAnalyze, 4000);
      }
    } catch (error) {
      console.error('Camera setup failed:', error);
      setCameraError(error instanceof Error ? error.message : 'Camera access failed');
      setIsConnecting(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const captureAndAnalyze = () => {
    if (!wsRef.current || !videoRef.current || !canvasRef.current || isAnalyzing) {
      return;
    }
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready for analysis');
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
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      
      wsRef.current.send(JSON.stringify({
        type: 'analyze_frame',
        imageData: imageData
      }));
      
      console.log('Frame sent for analysis');
    } catch (error) {
      console.error('Capture error:', error);
      setIsAnalyzing(false);
    }
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
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
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

  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <VideoOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-4">Camera Access Required</h2>
            <p className="text-gray-600 mb-6">{cameraError}</p>
            <div className="space-y-2">
              <Button onClick={setupCamera} className="w-full">
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
          {isConnecting && (
            <Badge className="bg-blue-600 text-white">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Connecting...
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
        {hasCamera ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted={isMuted}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Setting up camera...</p>
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

      {/* Manual Analyze Button */}
      {hasCamera && (
        <div className="absolute bottom-20 right-4 z-10">
          <Button
            onClick={captureAndAnalyze}
            disabled={isAnalyzing || !isConnected}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 p-0"
          >
            {isAnalyzing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Scan className="h-6 w-6" />
            )}
          </Button>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}