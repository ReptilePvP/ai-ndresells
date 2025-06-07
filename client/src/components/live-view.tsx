import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, VideoOff, Mic, MicOff, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LiveViewProps {
  onAnalysis?: (analysis: any) => void;
}

export function LiveView({ onAnalysis }: LiveViewProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [currentInstructions, setCurrentInstructions] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const startLiveView = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: audioEnabled
      });
      
      setVideoStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Connect to Gemini Live API
      await connectToGeminiLive(stream);
      
      setIsActive(true);
      setIsConnecting(false);
      
      toast({
        title: "Live View Started",
        description: "Point your camera at a product and ask Gemini to analyze it",
      });
      
    } catch (err) {
      setIsConnecting(false);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start live view';
      setError(errorMsg);
      console.error('Live view error:', err);
    }
  };

  const connectToGeminiLive = async (stream: MediaStream) => {
    try {
      // Connect to our backend WebSocket endpoint that handles Gemini Live API
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        console.log('Connected to Gemini Live API');
        setIsListening(true);
        
        // Send initial setup message
        websocketRef.current?.send(JSON.stringify({
          type: 'setup',
          config: {
            model: 'gemini-2.5-flash-exp',
            systemPrompt: `You are an expert product analyst. When the user shows you a product through their camera, analyze it and provide:
1. Product name and brand
2. Brief description
3. Estimated retail price
4. Estimated resell value
5. Key features that affect value

Be conversational and guide the user to position the product better if needed. Ask them to show different angles or provide more details if helpful.`
          }
        }));
      };
      
      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleGeminiResponse(data);
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection to AI service failed');
      };
      
      websocketRef.current.onclose = () => {
        setIsListening(false);
      };

      // Start sending video frames
      startVideoStreaming(stream);
      
    } catch (error) {
      console.error('Failed to connect to Gemini Live:', error);
      throw new Error('Failed to connect to AI service');
    }
  };

  const startVideoStreaming = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Create a canvas to capture frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const captureFrame = () => {
      if (!videoRef.current || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Send frame to Gemini Live API every 2 seconds to avoid overwhelming
      canvas.toBlob((blob) => {
        if (blob && websocketRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              websocketRef.current?.send(JSON.stringify({
                type: 'video_frame',
                data: reader.result.split(',')[1] // Remove data:image/jpeg;base64, prefix
              }));
            }
          };
          reader.readAsDataURL(blob);
        }
      }, 'image/jpeg', 0.7);
    };

    // Capture frames every 2 seconds
    const frameInterval = setInterval(() => {
      if (isActive) {
        captureFrame();
      } else {
        clearInterval(frameInterval);
      }
    }, 2000);
  };

  const handleGeminiResponse = (data: any) => {
    switch (data.type) {
      case 'text_response':
        setCurrentInstructions(data.text);
        break;
      case 'analysis_complete':
        if (onAnalysis) {
          onAnalysis(data.analysis);
        }
        toast({
          title: "Analysis Complete",
          description: "Product analysis has been generated",
        });
        break;
      case 'error':
        setError(data.message);
        break;
    }
  };

  const stopLiveView = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsActive(false);
    setIsListening(false);
    setCurrentInstructions("");
    setError(null);
    
    toast({
      title: "Live View Stopped",
      description: "Camera and AI analysis have been disconnected",
    });
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (videoStream) {
      const audioTrack = videoStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
      }
    }
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/40 dark:to-green-900/40 rounded-xl flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Live Product Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get real-time AI analysis by pointing your camera at products. 
                Gemini will guide you through the process and provide instant insights.
              </p>
            </div>
            <Button 
              onClick={startLiveView}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              <Video className="mr-2 h-5 w-5" />
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
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold">Connecting to Live View</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Starting camera and connecting to AI service...
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
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live View Active</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAudio}
                className={audioEnabled ? "" : "bg-red-100 dark:bg-red-900/20"}
              >
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={stopLiveView}>
                <VideoOff className="h-4 w-4" />
              </Button>
            </div>
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
            
            {/* AI Status Overlay */}
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                {isListening ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>AI is watching and listening...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span>Connecting to AI...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Instructions */}
            {currentInstructions && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm">
                  <strong>Gemini says:</strong> {currentInstructions}
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

            {/* Center crosshair */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-20 h-20 border-2 border-white/50 rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Point your camera at a product and speak to Gemini for real-time analysis
          </div>
        </div>
      </CardContent>
    </Card>
  );
}