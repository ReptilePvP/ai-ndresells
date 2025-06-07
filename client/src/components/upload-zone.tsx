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
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
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
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraStream) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFile(file);
        stopCamera();
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
          <div className="space-y-3">
            {/* Upload options - Camera or File */}
            {!showOptions ? (
              <Button 
                type="button" 
                onClick={() => setShowOptions(true)}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 w-full"
              >
                {isLoading ? "Analyzing..." : "Choose Product Image"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-sm">Take Photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-2 h-auto py-4"
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
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">Or</span>
              </div>
            </div>
            
            <Link href="/live">
              <Button
                variant="outline"
                className="w-full h-20 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-dashed border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200"
              >
                <div className="flex flex-col items-center gap-2">
                  <Eye className="h-6 w-6 text-purple-600" />
                  <span className="font-medium">Live Analysis</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Real-time camera analysis</span>
                </div>
              </Button>
            </Link>
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

      {preview && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Preview</h3>
            <button
              onClick={clearPreview}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="w-full h-48 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
