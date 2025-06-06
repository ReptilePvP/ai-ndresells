import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, RotateCcw, Zap, AlertCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  isAnalyzing?: boolean;
}

export function CameraCapture({ onCapture, isAnalyzing }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { isSupported, hasPermission, isLoading: permissionLoading, error: permissionError, requestPermission } = useCamera();

  const startCamera = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const openCamera = async () => {
    if (!isSupported) {
      toast({
        title: "Camera Not Supported",
        description: "Your device doesn't support camera access.",
        variant: "destructive",
      });
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        return;
      }
    }

    setIsOpen(true);
    startCamera();
  };

  const closeCamera = () => {
    setIsOpen(false);
    stopCamera();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Add camera flash effect
    const flashDiv = document.createElement('div');
    flashDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: white;
      z-index: 9999;
      opacity: 0.8;
      pointer-events: none;
    `;
    document.body.appendChild(flashDiv);
    setTimeout(() => document.body.removeChild(flashDiv), 100);

    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

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

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isOpen && stream) {
      stopCamera();
      startCamera();
    }
  }, [facingMode, isOpen, stopCamera, startCamera, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen) {
    // Show error state if camera is not supported
    if (!isSupported) {
      return (
        <Button
          variant="outline"
          className="w-full text-gray-500 cursor-not-allowed"
          disabled
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Camera Not Available
        </Button>
      );
    }

    // Show permission request state
    if (permissionError) {
      return (
        <div className="space-y-2">
          <Button
            onClick={requestPermission}
            variant="outline"
            className="w-full"
            disabled={permissionLoading || isAnalyzing}
          >
            <Settings className="mr-2 h-4 w-4" />
            {permissionLoading ? "Requesting..." : "Enable Camera"}
          </Button>
          <p className="text-xs text-red-600 dark:text-red-400 text-center">
            {permissionError}
          </p>
        </div>
      );
    }

    return (
      <Button
        onClick={openCamera}
        variant="outline"
        className="w-full"
        disabled={isAnalyzing || permissionLoading}
      >
        <Camera className="mr-2 h-4 w-4" />
        {permissionLoading ? "Loading..." : "Take Photo"}
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
                  disabled={!stream}
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
            
            {/* Capture overlay */}
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
          </div>

          {/* Capture button */}
          <div className="flex justify-center mt-4">
            <Button
              onClick={capturePhoto}
              disabled={!stream || isAnalyzing}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="mr-2 h-5 w-5" />
              Capture & Analyze
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