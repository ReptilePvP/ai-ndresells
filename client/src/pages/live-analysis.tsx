import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, VideoOff, Loader2, Camera, ArrowLeft, X, Zap, ShoppingBag, DollarSign, Info, Target, Scan, Activity, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";
import { Link } from "wouter";

export function LiveAnalysisPage() {
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Use the camera hook for clean camera management
  const { 
    videoRef, 
    stream, 
    error: cameraError, 
    isLoading: cameraLoading, 
    isPlaying, 
    startCamera, 
    stopCamera, 
    playVideo,
    requestPermissions
  } = useCamera({
    facingMode: 'environment',
    width: 1920,
    height: 1080
  });

  // Debug stream state changes and ensure video element gets the stream
  useEffect(() => {
    console.log('Stream state changed:', {
      hasStream: !!stream,
      streamId: stream?.id,
      tracks: stream?.getTracks().length,
      videoElement: !!videoRef.current,
      videoSrcObject: videoRef.current?.srcObject
    });
    
    // Ensure video element gets the stream when available
    if (videoRef.current && stream) {
      console.log('Assigning stream to video element');
      videoRef.current.srcObject = stream;
      
      // Force video to load and play
      videoRef.current.load();
      videoRef.current.play().then(() => {
        console.log('Video is now playing');
      }).catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [stream, videoRef]);

  // Cleanup WebSocket connection when component unmounts
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      stopCamera();
    };
  }, [stopCamera]);

  const startLiveAnalysis = async () => {
    try {
      setConnectionStatus('connecting');
      
      console.log('Starting live analysis - requesting camera access...');
      console.log('Initial state:', {
        hasVideoRef: !!videoRef.current,
        hasStream: !!stream,
        isPlaying,
        cameraError,
        cameraLoading
      });
      
      // Start camera and wait for it to be ready
      await startCamera();
      
      console.log('Camera start completed, checking state:', {
        hasVideoRef: !!videoRef.current,
        hasStream: !!stream,
        isPlaying,
        streamActive: stream?.active,
        streamTracks: stream?.getTracks().length
      });
      
      // Give the camera hook a moment to set up the video element
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Checking video element after delay:', {
        hasVideoRef: !!videoRef.current,
        hasStream: !!stream,
        streamActive: stream?.active
      });
      
      // If we don't have the video element at this point, it's a real issue
      if (!videoRef.current) {
        console.error('Video element is null after camera start');
        throw new Error('Video element not available - DOM may not be ready');
      }

      // If we don't have a stream, that's also a problem
      if (!stream) {
        console.error('Camera stream is null after camera start');
        throw new Error('Camera stream not available - check permissions');
      }

      const video = videoRef.current;
      
      // Ensure the stream is properly connected
      if (!video.srcObject) {
        console.log('Manually connecting stream to video element');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        
        // Wait for the video to load
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000);
          
          const onLoadedMetadata = () => {
            console.log('Video metadata loaded successfully');
            clearTimeout(timeout);
            resolve(void 0);
          };
          
          if (video.readyState >= 1) {
            // Already loaded
            clearTimeout(timeout);
            resolve(void 0);
          } else {
            video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          }
        });
        
        // Try to play the video
        try {
          await video.play();
          console.log('Video playing successfully');
        } catch (playError) {
          console.warn('Video autoplay blocked, manual play needed:', playError);
          setNeedsManualPlay(true);
        }
      }
      
      console.log('Video setup complete:', {
        hasStream: !!video.srcObject,
        readyState: video.readyState,
        paused: video.paused,
        needsManualPlay
      });

      console.log('Video setup complete, establishing WebSocket connection...');

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
          description: "Point your camera at products for instant AI identification",
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
          } else if (data.type === 'rate_limited') {
            toast({
              title: "Rate Limited",
              description: data.message,
              variant: "destructive",
            });
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
      };
      
    } catch (error: any) {
      console.error('Failed to start live analysis:', error);
      setConnectionStatus('disconnected');
      
      // Stop camera if it was started
      stopCamera();
      
      let errorMessage = "Failed to start live analysis";
      
      if (error.message?.includes('Video element not available')) {
        errorMessage = "Camera setup failed. Please refresh the page and try again.";
      } else if (error.message?.includes('Camera stream not connected')) {
        errorMessage = "Camera access denied. Please allow camera permissions and try again.";
      } else if (error.message?.includes('WebSocket connection timeout')) {
        errorMessage = "Connection timed out. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopLiveAnalysis = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopCamera();
    setIsActive(false);
    setConnectionStatus('disconnected');
    setLastAnalysis("");
    setAnalysisCount(0);
    setNeedsManualPlay(false);
  };

  const handleManualPlay = async () => {
    if (videoRef.current && stream) {
      try {
        console.log('Manual play button clicked');
        const video = videoRef.current;
        
        if (!video.srcObject) {
          video.srcObject = stream;
        }
        
        await video.play();
        setNeedsManualPlay(false);
        console.log('Manual play successful');
        
        toast({
          title: "Camera Ready",
          description: "Video stream is now active",
        });
      } catch (error) {
        console.error('Manual play failed:', error);
        toast({
          title: "Play Failed",
          description: "Unable to start video playback",
          variant: "destructive",
        });
      }
    }
  };

  const analyzeCurrentFrame = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Not Connected",
        description: "Please start live analysis first",
        variant: "destructive",
      });
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Camera Error",
        description: "Video stream not available",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64 image data
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send image data through WebSocket
      wsRef.current.send(JSON.stringify({
        type: 'analyze_frame',
        image: imageData
      }));
      
    } catch (error) {
      console.error('Frame capture error:', error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "Failed to capture frame for analysis",
        variant: "destructive",
      });
    }
  };

  // Handle camera errors
  if (cameraError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-900/20 dark:to-orange-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          
          <Card className="max-w-md mx-auto border-red-200 dark:border-red-800">
            <CardContent className="p-8 text-center">
              <VideoOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">Camera Access Required</h2>
              <p className="text-red-700 dark:text-red-300 mb-6">{cameraError}</p>
              <Button 
                onClick={requestPermissions}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Camera className="mr-2 h-4 w-4" />
                Grant Camera Access
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Setup/Landing Screen
  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-400/20 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-purple-400/20 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-green-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '3s' }}></div>
        </div>

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm border-gray-300 hover:bg-white text-gray-900 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>

          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <div className="mb-12 animate-fade-in">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 animate-scale-fade-in shadow-2xl">
                  <Scan className="h-16 w-16 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-4 border-blue-400/30 rounded-full animate-ping"></div>
                </div>
              </div>
              
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent animate-slide-in-up">
                Live Product Analysis
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
                Point your camera at any product for instant AI identification and real-time market insights
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-left">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Instant Recognition</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">AI identifies products in real-time as you point your camera</p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Live Pricing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get current market prices and resell estimates instantly</p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Market Analysis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Real-time market trends and demand analysis</p>
                </CardContent>
              </Card>
            </div>

            {/* Connection Status and Start Button */}
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3">
                <Badge 
                  variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'connecting' ? 'secondary' : 'outline'}
                  className="px-4 py-2 text-sm"
                >
                  {connectionStatus === 'connected' && <CheckCircle className="h-4 w-4 mr-2" />}
                  {connectionStatus === 'connecting' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {connectionStatus === 'disconnected' && <Target className="h-4 w-4 mr-2" />}
                  {connectionStatus === 'connected' ? 'Ready to Scan' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Ready to Start'}
                </Badge>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={startLiveAnalysis}
                  disabled={connectionStatus === 'connecting' || cameraLoading}
                  size="lg"
                  className="px-12 py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 animate-bounce-in"
                >
                  {connectionStatus === 'connecting' || cameraLoading ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Starting Camera...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-3 h-6 w-6" />
                      Start Live Analysis
                    </>
                  )}
                </Button>
                
                {/* Debug camera test button */}
                <Button
                  onClick={async () => {
                    console.log('Testing camera access...');
                    try {
                      await startCamera();
                      console.log('Camera test result:', {
                        hasVideoRef: !!videoRef.current,
                        hasStream: !!stream,
                        isPlaying,
                        streamActive: stream?.active
                      });
                      toast({
                        title: "Camera Test",
                        description: `Camera access: ${stream ? 'Success' : 'Failed'}`,
                      });
                    } catch (error) {
                      console.error('Camera test failed:', error);
                      toast({
                        title: "Camera Test Failed",
                        description: error instanceof Error ? error.message : "Unknown error",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Test Camera
                </Button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Make sure to allow camera access when prompted. Best results with good lighting and clear product visibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Analysis Interface
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Video Feed */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Overlay UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40">
          
          {/* Top Header */}
          <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={stopLiveAnalysis}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                >
                  <X className="h-4 w-4 mr-2" />
                  Exit
                </Button>
                
                <Badge 
                  variant="secondary"
                  className="bg-green-600/90 text-white border-0"
                >
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  Live
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-black/50 text-white border-white/30">
                  <Target className="h-3 w-3 mr-1" />
                  {analysisCount} scanned
                </Badge>
              </div>
            </div>
          </div>

          {/* Center Scan Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              {/* Scanning Reticle */}
              <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative pointer-events-auto">
                {/* Corner brackets */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-2xl"></div>
                
                {/* Center scan button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {!isAnalyzing ? (
                    <Button
                      onClick={analyzeCurrentFrame}
                      className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl border-4 border-white/50 transform hover:scale-110 transition-all duration-200"
                      disabled={!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN}
                    >
                      <Scan className="w-10 h-10" />
                    </Button>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-purple-600 border-4 border-white/50 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Scan instructions */}
              <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-white/90 text-sm font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  {isAnalyzing ? 'Analyzing...' : 'Tap to scan product'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Analysis Results */}
          {lastAnalysis && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Product Detected</h3>
                      <p className="text-sm text-white/80 leading-relaxed">{lastAnalysis}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Manual play button when autoplay is blocked */}
          {needsManualPlay && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
              <div className="bg-black/80 backdrop-blur-sm rounded-xl p-6 text-center text-white animate-fade-in border border-white/20">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Camera Ready</h3>
                <p className="text-sm text-white/80 mb-4">Tap to start video playback</p>
                <Button 
                  onClick={handleManualPlay}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Start Video
                </Button>
              </div>
            </div>
          )}

          {/* Instructions overlay for first use */}
          {analysisCount === 0 && !lastAnalysis && !needsManualPlay && (
            <div className="absolute top-1/2 left-6 right-6 transform -translate-y-1/2 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 text-center text-white/90 animate-fade-in">
                <Info className="h-5 w-5 mx-auto mb-2" />
                <p className="text-sm">Point your camera at any product and tap the scan button for instant AI analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default LiveAnalysisPage;