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
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser. Please use a modern browser with HTTPS.');
      }

      // Check camera permissions first
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission status:', permissions.state);
        
        if (permissions.state === 'denied') {
          throw new Error('Camera access denied. Please enable camera permissions in your browser settings.');
        }
      } catch (permError) {
        console.log('Permission query not supported, proceeding with direct access');
      }

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

      console.log('Setting stream state with media stream:', !!mediaStream);
      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Configure video element properties
        video.srcObject = mediaStream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Wait for video to be ready with proper event handling
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video setup timeout'));
          }, 5000);
          
          const onMetadataLoaded = () => {
            console.log('Video metadata loaded:', {
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState
            });
            
            // Only resolve if we have valid dimensions
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              clearTimeout(timeout);
              cleanup();
              resolve();
            }
          };
          
          const onCanPlay = () => {
            console.log('Video can play');
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              clearTimeout(timeout);
              cleanup();
              resolve();
            }
          };
          
          const onError = (event: Event) => {
            console.error('Video error during setup:', event);
            clearTimeout(timeout);
            cleanup();
            reject(new Error('Video setup failed'));
          };
          
          const cleanup = () => {
            video.removeEventListener('loadedmetadata', onMetadataLoaded);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
          };
          
          // Set up event listeners
          video.addEventListener('loadedmetadata', onMetadataLoaded);
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('error', onError);
          
          // Set up ongoing event listeners for state tracking
          video.onplay = () => {
            console.log('Video play event fired');
            setIsPlaying(true);
          };

          video.onplaying = () => {
            console.log('Video is actually playing');
            setIsPlaying(true);
          };
          
          // Check if metadata is already available
          if (video.readyState >= 1 && video.videoWidth > 0) {
            onMetadataLoaded();
          } else {
            // Try to load metadata by playing
            video.play().catch(playError => {
              console.warn('Auto-play failed, will require user interaction:', playError);
              // Don't reject here, metadata might still load
            });
          }
        });
        
        console.log('Video setup completed successfully');
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