import { useState, useEffect } from 'react';

interface CameraSupport {
  isSupported: boolean;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
}

export function useCamera(): CameraSupport {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkCameraSupport();
  }, []);

  const checkCameraSupport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        setError('Camera not supported in this browser');
        return;
      }

      setIsSupported(true);

      // Check current permission status
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permission.state === 'granted') {
          setHasPermission(true);
        } else if (permission.state === 'denied') {
          setHasPermission(false);
          setError('Camera permission denied');
        }
      }
    } catch (err) {
      console.error('Error checking camera support:', err);
      setError('Unable to check camera support');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Camera not supported');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      return true;
    } catch (err) {
      console.error('Error requesting camera permission:', err);
      setHasPermission(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please enable camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported on this device.');
        } else {
          setError('Unable to access camera. Please try again.');
        }
      } else {
        setError('Unknown camera error occurred.');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    hasPermission,
    isLoading,
    error,
    requestPermission,
  };
}