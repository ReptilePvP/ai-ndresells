import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Zap, VideoOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  isAnalyzing?: boolean;
}

export function CameraCapture({ onCapture, isAnalyzing }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      console.log('Camera stream obtained');
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Wait for video to load and play
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Video playing');
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch((err) => {
                console.error('Play failed:', err);
                setIsLoading(false);
              });
          }
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(err.message || 'Camera access failed');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPlaying(false);
    setError(null);
    setIsLoading(false);
  };

  const openCamera = () => {
    setIsOpen(true);
    startCamera();
  };

  const closeCamera = () => {
    stopCamera();
    setIsOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      toast({
        title: "Camera Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        
        toast({
          title: "Photo Captured",
          description: "Analyzing your product...",
        });
        
        onCapture(file);
        closeCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  if (!isOpen) {
    return (
      <Button
        onClick={openCamera}
        variant="outline"
        className="w-full"
        disabled={isAnalyzing}
      >
        <Camera className="mr-2 h-4 w-4" />
        Take Photo
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Camera</h3>
            <Button variant="outline" size="sm" onClick={closeCamera}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-white mx-auto mb-2 animate-spin" />
                  <span className="text-white text-sm">Starting camera...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center z-20">
                <div className="text-center">
                  <VideoOff className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-300 text-sm mb-2">{error}</p>
                  <Button onClick={startCamera} size="sm" variant="secondary">
                    Retry Camera
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
              className="w-full h-full object-cover"
              style={{ 
                minHeight: '300px',
                backgroundColor: 'black'
              }}
            />
          </div>

          <Button
            onClick={capturePhoto}
            disabled={!isPlaying || isAnalyzing || isLoading || !!error}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Zap className="mr-2 h-5 w-5" />
            {isLoading ? "Loading..." : "Capture & Analyze"}
          </Button>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Position the product in the center frame for best results
          </p>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}