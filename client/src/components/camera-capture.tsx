import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Zap, VideoOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  isAnalyzing?: boolean;
}

export function CameraCapture({ onCapture, isAnalyzing }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  // Use the robust camera hook
  const { 
    videoRef, 
    stream, 
    error, 
    isLoading, 
    isPlaying, 
    startCamera, 
    stopCamera, 
    playVideo 
  } = useCamera({
    facingMode: 'environment',
    width: 1280,
    height: 720
  });

  const openCamera = async () => {
    setIsOpen(true);
    await startCamera();
  };

  const closeCamera = () => {
    setIsOpen(false);
    stopCamera();
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

    if (!context) {
      toast({
        title: "Capture Error",
        description: "Unable to process image. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and create file
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
      } else {
        toast({
          title: "Capture Failed",
          description: "Unable to capture photo. Please try again.",
          variant: "destructive"
        });
      }
    }, 'image/jpeg', 0.9);
  };

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

          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {/* Error State */}
            {error && (
              <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 flex items-center justify-center z-10">
                <div className="text-center">
                  <VideoOff className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
                  <Button 
                    onClick={() => startCamera()} 
                    size="sm"
                  >
                    Retry Camera
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !error && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                  <span className="text-gray-300 text-sm">Starting camera...</span>
                </div>
              </div>
            )}

            {/* Video Not Playing State */}
            {stream && !isPlaying && !error && !isLoading && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-gray-300 text-sm block mb-2">Camera ready</span>
                  <Button 
                    onClick={playVideo}
                    size="sm"
                  >
                    Start Video
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
            />
          </div>

          <Button
            onClick={capturePhoto}
            disabled={!stream || !isPlaying || isAnalyzing || isLoading || !!error}
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