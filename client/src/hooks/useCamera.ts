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
        throw new Error('Camera API not available in this browser.');
      }

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      console.log('Requesting camera access...');
      
      // Try to get camera stream with simple fallback
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
      } catch (err) {
        console.warn('Environment camera failed, trying any camera:', err);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      console.log('Camera stream obtained successfully');
      setStream(mediaStream);
      
      // Wait a moment for React to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set up video element
      if (videoRef.current) {
        const video = videoRef.current;
        console.log('Setting up video element...');
        
        video.srcObject = mediaStream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Event handlers
        const handlePlay = () => {
          console.log('Video started playing');
          setIsPlaying(true);
        };
        
        const handleLoadedData = () => {
          console.log('Video data loaded, attempting to play...');
          video.play().catch(err => console.warn('Play failed:', err));
        };
        
        video.addEventListener('play', handlePlay);
        video.addEventListener('playing', handlePlay);
        video.addEventListener('loadeddata', handleLoadedData);
        
        // Try to play immediately
        try {
          await video.play();
          console.log('Video playing immediately');
          setIsPlaying(true);
        } catch (playErr) {
          console.warn('Immediate play failed, waiting for user interaction:', playErr);
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
        const video = videoRef.current;
        
        // Ensure stream is connected
        if (video.srcObject !== stream) {
          video.srcObject = stream;
        }
        
        await video.play();
        setIsPlaying(true);
        console.log('Manual play successful');
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

  // Effect to connect stream to video element when both are available
  useEffect(() => {
    if (stream && videoRef.current && !isPlaying) {
      const video = videoRef.current;
      console.log('Connecting stream to video element via useEffect');
      
      video.srcObject = stream;
      video.play().then(() => {
        console.log('Video playing from useEffect');
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Play from useEffect failed:', err);
      });
    }
  }, [stream, isPlaying]);

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