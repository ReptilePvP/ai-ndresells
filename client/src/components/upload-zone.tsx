import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import cameraIconPath from "@assets/image.jpg";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  onAnalysis?: (analysis: any) => void;
}

export function UploadZone({ onFileSelect, isLoading, onAnalysis }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    console.log('Handling file:', file);
    
    if (!file || !file.type) {
      toast({
        title: "Invalid file",
        description: "Please select a valid file",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, or WEBP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreview(result);
        console.log('Preview created successfully');
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      toast({
        title: "Preview error",
        description: "Failed to generate image preview",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);

    onFileSelect(file);
    setShowOptions(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: error instanceof Error ? error.message : "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) {
      toast({
        title: "Capture Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast({
        title: "Capture Error",
        description: "Failed to initialize canvas. Please try again.",
        variant: "destructive",
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFile(file);
        stopCamera();
      } else {
        toast({
          title: "Capture Error",
          description: "Failed to capture photo. Please try again.",
          variant: "destructive",
        });
      }
    }, 'image/jpeg', 0.8);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setShowOptions(false);
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400"
        }`}
      >
        <div className="space-y-4">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Uploaded product"
                className="w-full h-64 object-contain bg-gray-50 dark:bg-gray-700 rounded-xl"
              />
              <button
                onClick={clearPreview}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className={`w-20 h-20 mx-auto rounded-xl flex items-center justify-center transition-all duration-300 ${
                isDragOver 
                  ? "bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/40 dark:to-green-900/40 scale-105" 
                  : "bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 hover:scale-105"
              }`}>
                <img 
                  src={cameraIconPath} 
                  alt="Upload Camera Icon" 
                  className="w-12 h-12 object-contain opacity-80"
                />
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-4 transition-colors"
              >
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Drop your product image here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  AI will analyze and price your product instantly
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Supports JPG, PNG, WEBP up to 10MB
                </p>
              </div>
            </>
          )}
          <div className="space-y-3">
            {/* Upload options - Camera or File */}
            {!preview && !showOptions ? (
              <Button 
                type="button" 
                onClick={() => setShowOptions(true)}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 w-full animate-scale-fade-in transition-all duration-300 hover:scale-105"
              >
                {isLoading ? "Analyzing..." : "Choose Product Image"}
              </Button>
            ) : !preview ? (
              <div className="space-y-3 animate-slide-in-left">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-2 h-auto py-4 animate-slide-in-left animate-stagger animate-stagger-1 transition-all duration-300 hover:scale-105"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-sm">Take Photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-2 h-auto py-4 animate-slide-in-right animate-stagger animate-stagger-2 transition-all duration-300 hover:scale-105"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">Upload File</span>
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOptions(false)}
                  className="w-full animate-scale-fade-in animate-stagger animate-stagger-3"
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            
            {preview && (
              <div className="space-y-3 animate-slide-in-up">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowOptions(true)}
                  disabled={isLoading}
                  className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Different Image
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Camera Interface */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <h3 className="text-lg font-semibold">Take Photo</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopCamera}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex justify-center">
                <Button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 text-black"
                >
                  <Camera className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />


    </div>
  );
}
