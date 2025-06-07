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
    
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const finalConfig = { ...config, ...customConfig };
      
      // Progressive fallback configurations
      const streamConfigs = [
        // High quality with specified facing mode
        {
          video: {
            facingMode: finalConfig.facingMode || 'environment',
            width: { ideal: finalConfig.width || 1920, max: 1920 },
            height: { ideal: finalConfig.height || 1080, max: 1080 }
          }
        },
        // Standard quality with facing mode
        {
          video: {
            facingMode: finalConfig.facingMode || 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        // Any camera with quality
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

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        
        // Set up video event listeners for better debugging
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded:', {
            width: videoRef.current?.videoWidth,
            height: videoRef.current?.videoHeight
          });
        };

        videoRef.current.oncanplay = () => {
          console.log('Video can play');
        };

        videoRef.current.onplay = () => {
          console.log('Video play event fired');
          setIsPlaying(true);
        };

        videoRef.current.onplaying = () => {
          console.log('Video is actually playing');
          setIsPlaying(true);
        };

        // Force video to play and display
        try {
          await videoRef.current.play();
          console.log('Video play() method called successfully');
        } catch (playError) {
          console.warn('Auto-play failed, will require user interaction:', playError);
        }
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
    playVideo
  };
}