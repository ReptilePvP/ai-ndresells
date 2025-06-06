import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Zap, AlertCircle } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          videoRef.current?.play();
        };
      }
    } catch (err) {
      setIsLoading(false);
      const errorMsg = err instanceof Error ? err.message : 'Camera access failed';
      setError(errorMsg);
      console.error('Camera error:', err);
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
    setError(null);
    setIsLoading(false);
  };

  const openCamera = () => {
    setIsOpen(true);
    startCamera();
  };

  const closeCamera = () => {
    setIsOpen(false);
    stopCamera();
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

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

          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
                <div className="text-center text-white">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={startCamera}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            {stream && !isLoading && !error && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white/20"></div>
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white/20"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/20"></div>
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/20"></div>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-16 h-16 border-2 border-white rounded-lg"></div>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={capturePhoto}
            disabled={!stream || isAnalyzing || isLoading || !!error}
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