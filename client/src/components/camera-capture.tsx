import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, RotateCcw, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  isAnalyzing?: boolean;
}

export function CameraCapture({ onCapture, isAnalyzing }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    setIsVideoLoading(true);
    setVideoError(null);
    
    try {
      // Check for camera support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Simple mobile-friendly constraints
      const constraints = {
        video: {
          facingMode: facingMode
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Simple event handling to avoid loops
        videoRef.current.onloadedmetadata = () => {
          setIsVideoLoading(false);
          videoRef.current?.play().catch(() => {
            // Silent catch - autoplay restrictions are normal
          });
        };
        
        // Fallback
        setTimeout(() => setIsVideoLoading(false), 2000);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setIsVideoLoading(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setVideoError('Camera permission denied. Please allow camera access.');
        } else if (error.name === 'NotFoundError') {
          setVideoError('No camera found on this device.');
        } else {
          setVideoError('Camera unavailable: ' + error.message);
        }
      } else {
        setVideoError('Camera access failed');
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoLoading(false);
    setVideoError(null);
  }, [stream]);

  const openCamera = async () => {
    // Check for basic camera support
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Camera Not Supported",
        description: "Your browser doesn't support camera access.",
        variant: "destructive",
      });
      return;
    }

    setIsOpen(true);
    setIsVideoLoading(true);
    await startCamera();
  };

  const closeCamera = () => {
    setIsOpen(false);
    stopCamera();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (stream) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Check for multiple cameras on mount
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      });
    }
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
        <div className="relative">
          {/* Camera controls header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Camera</h3>
            <div className="flex gap-2">
              {hasMultipleCameras && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  disabled={!stream || isVideoLoading}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={closeCamera}
              >
                <X className="h-4 w-4" />
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
            
            {/* Loading overlay */}
            {isVideoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
            
            {/* Error overlay */}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
                <div className="text-center text-white">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{videoError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-white border-white hover:bg-white hover:text-red-900"
                    onClick={startCamera}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}
            
            {/* Capture overlay - only show when video is ready */}
            {!isVideoLoading && !videoError && stream && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Grid lines for better composition */}
                <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white/20"></div>
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white/20"></div>
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/20"></div>
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/20"></div>
                </div>
                
                {/* Center focus indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-16 h-16 border-2 border-white rounded-lg"></div>
                </div>
              </div>
            )}
          </div>

          {/* Capture button */}
          <div className="flex justify-center mt-4">
            <Button
              onClick={capturePhoto}
              disabled={!stream || isAnalyzing || isVideoLoading || !!videoError}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <Zap className="mr-2 h-5 w-5" />
              {isVideoLoading ? "Loading Camera..." : "Capture & Analyze"}
            </Button>
          </div>

          {/* Help text */}
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
            Position the product in the center frame for best results
          </p>
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}