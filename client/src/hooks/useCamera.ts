import { useEffect, useRef, useState } from "react";

interface CameraConfig {
  video?: MediaTrackConstraints | boolean;
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export function useCamera(config?: CameraConfig) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const startCamera = async (customConfig?: CameraConfig) => {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    
    try {
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser. Please use a modern browser with HTTPS.');
      }

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const finalConfig = { ...config, ...customConfig };
      
      // Simplified progressive fallback configurations
      const streamConfigs = [
        // Primary config with rear camera
        {
          video: {
            facingMode: finalConfig.facingMode || 'environment',
            width: { ideal: finalConfig.width || 1280 },
            height: { ideal: finalConfig.height || 720 }
          }
        },
        // Fallback with any camera
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        // Basic fallback
        {
          video: true
        }
      ];

      let mediaStream: MediaStream | null = null;
      
      for (let i = 0; i < streamConfigs.length; i++) {
        try {
          console.log(`Attempting camera config ${i + 1}:`, streamConfigs[i]);
          mediaStream = await navigator.mediaDevices.getUserMedia(streamConfigs[i]);
          console.log(`Camera stream obtained with config ${i + 1}`);
          break;
        } catch (err) {
          console.warn(`Camera config ${i + 1} failed:`, err);
          if (i === streamConfigs.length - 1) {
            throw err;
          }
        }
      }

      if (!mediaStream) {
        throw new Error('Failed to obtain camera stream');
      }

      // Set stream state first
      setStream(mediaStream);
      
      // Set up video element if available
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Reset video element
        video.srcObject = null;
        
        // Configure video element properties
        video.srcObject = mediaStream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Enhanced compatibility attributes
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        // Force immediate play attempt
        try {
          await video.play();
          setIsPlaying(true);
          console.log('Video playing successfully');
        } catch (playError) {
          console.warn('Initial play failed, will try after metadata loads:', playError);
          
          // Wait for metadata and try again
          const handleMetadata = () => {
            console.log('Video metadata loaded, trying to play again');
            video.play().then(() => {
              setIsPlaying(true);
              console.log('Video playing after metadata load');
            }).catch(err => {
              console.warn('Play after metadata failed:', err);
              // Don't throw error, user interaction might be needed
            });
          };
          
          if (video.readyState >= 1) {
            handleMetadata();
          } else {
            video.addEventListener('loadedmetadata', handleMetadata, { once: true });
          }
        }
        
        // Set up play state tracking
        video.onplay = () => {
          console.log('Video play event fired');
          setIsPlaying(true);
        };

        video.onplaying = () => {
          console.log('Video is actually playing');
          setIsPlaying(true);
        };

        video.onpause = () => {
          console.log('Video paused');
          setIsPlaying(false);
        };
      }
      
    } catch (err: any) {
      let errorMessage = 'Failed to access camera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints not supported.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Camera error:', err);
    } finally {
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
    console.log('Camera stopped');
  };

  const playVideo = async () => {
    if (videoRef.current && stream) {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
        return true;
      } catch (error) {
        console.error('Manual play failed:', error);
        return false;
      }
    }
    return false;
  };

  const requestPermissions = async () => {
    try {
      // Force fresh permission request
      const testStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      testStream.getTracks().forEach(track => track.stop());
      console.log('Camera permissions granted successfully');
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return { 
    videoRef, 
    stream, 
    error, 
    isLoading, 
    isPlaying,
    startCamera, 
    stopCamera,
    playVideo,
    requestPermissions
  };
}