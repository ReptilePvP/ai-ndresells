import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, VideoOff, Loader2, Eye, X, Target, CheckCircle, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SimpleLiveAnalysis() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const connectWebSocket = () => {
    setIsConnecting(true);
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/live-api`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        setIsConnecting(false);
        toast({
          title: "Connection Timeout",
          description: "Unable to connect to analysis service",
          variant: "destructive",
        });
      }
    }, 10000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      
      // Send setup message
      ws.send(JSON.stringify({
        type: 'setup',
        config: {
          model: 'models/gemini-2.0-flash-exp',
          responseModalities: ['TEXT'],
          systemPrompt: 'You are an expert product analyst. Identify products and provide pricing insights.'
        }
      }));
      
      toast({
        title: "Connected",
        description: "Live analysis service ready",
      });
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
          console.log('Setup complete');
        }
      } catch (error) {
        console.error('Message parse error:', error);
      }
    };
    
    ws.onclose = () => {
      clearTimeout(timeout);
      console.log('WebSocket closed');
      setIsConnected(false);
      setIsConnecting(false);
    };
    
    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Check your internet connection",
        variant: "destructive",
      });
    };
  };

  const setupCamera = async () => {
    try {
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        await videoRef.current.play();
        setHasCamera(true);
        
        toast({
          title: "Camera Ready",
          description: "Video feed active",
        });
        
        // Start periodic analysis
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(captureAndAnalyze, 3000);
      }
    } catch (error) {
      console.error('Camera setup failed:', error);
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

  const disconnect = () => {
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
    
    setIsConnected(false);
    setHasCamera(false);
    setLastAnalysis("");
    setAnalysisCount(0);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  if (!isConnected && !isConnecting) {
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
                Connect to start real-time AI analysis of products through your camera
              </p>
            </div>
            <Button 
              onClick={connectWebSocket}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Eye className="mr-2 h-5 w-5" />
              Connect to Live Analysis
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
              <h3 className="text-lg font-semibold">Connecting...</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Establishing connection to analysis service
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
              {hasCamera && (
                <Badge variant="outline">
                  <Camera className="h-3 w-3 mr-1" />
                  Camera Active
                </Badge>
              )}
              <span className="text-sm text-gray-500">
                {analysisCount} scans completed
              </span>
            </div>
            <Button 
              onClick={disconnect}
              variant="outline" 
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Camera Setup */}
      {!hasCamera && (
        <Card>
          <CardContent className="p-6 text-center">
            <Camera className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Setup Camera</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Allow camera access to start analyzing products
            </p>
            <Button onClick={setupCamera} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Enable Camera
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Video Feed */}
      {hasCamera && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full aspect-video rounded-lg bg-black"
                autoPlay
                playsInline
                muted
              />
              
              {isAnalyzing && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-blue-600 animate-pulse">
                    <Scan className="h-3 w-3 mr-1" />
                    Analyzing...
                  </Badge>
                </div>
              )}
              
              <div className="absolute bottom-4 left-4 right-4">
                <Button 
                  onClick={captureAndAnalyze}
                  disabled={isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Scan className="mr-2 h-4 w-4" />
                      Analyze Product
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {lastAnalysis && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">Latest Analysis</h4>
            <p className="text-gray-700 dark:text-gray-300">{lastAnalysis}</p>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}