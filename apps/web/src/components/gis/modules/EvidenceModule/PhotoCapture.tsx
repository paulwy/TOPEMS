// modules/EvidenceModule/PhotoCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, SwitchCamera, Sun, X, Check } from 'lucide-react';
import { Box, IconButton, Typography } from '@mui/material';
import { Button } from '@/components/ui/Button';
import { logger } from '@/utils/logger';

interface PhotoCaptureProps {
  onCapture: (file: File, thumbnail?: string) => void;
  onCancel: () => void;
  maxFileSize?: number;
  compressionQuality?: number;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onCapture,
  onCancel,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  compressionQuality = 0.8,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError(null);
      } catch (err) {
        setError('无法访问摄像头，请确保已授予摄像头权限');
        logger.error('Camera error:', err);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Switch camera
  const switchCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, [stream]);

  // Toggle flash
  const toggleFlash = useCallback(() => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track && 'getCapabilities' in track) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          track.applyConstraints({ advanced: [{ torch: !flashOn } as any] });
          setFlashOn(!flashOn);
        }
      }
    }
  }, [stream, flashOn]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Convert to blob with compression
    canvas.toBlob(
      (blob) => {
        if (blob) {
          if (blob.size > maxFileSize) {
            setError(`文件大小超过限制 (${maxFileSize / 1024 / 1024}MB)`);
            setIsCapturing(false);
            return;
          }

          // Create thumbnail
          const thumbnailCanvas = document.createElement('canvas');
          const thumbCtx = thumbnailCanvas.getContext('2d');
          if (thumbCtx) {
            thumbnailCanvas.width = 200;
            thumbnailCanvas.height = 200 * (video.videoHeight / video.videoWidth);
            thumbCtx.drawImage(video, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            const thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.5);
            onCapture(new File([blob], 'photo.jpg', { type: 'image/jpeg' }), thumbnail);
          } else {
            onCapture(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
          }
        }
        setIsCapturing(false);
      },
      'image/jpeg',
      compressionQuality
    );
  }, [maxFileSize, compressionQuality, onCapture]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'black',
      }}
    >
      {/* Video Preview */}
      <Box sx={{ position: 'relative', flex: 1 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Hidden canvas for capture */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* Error Message */}
        {error && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.8)',
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'white', p: 16 }}>
              <Typography sx={{ color: '#f87171', mb: 8 }}>{error}</Typography>
              <Button
                onClick={onCancel}
                sx={{
                  px: 16,
                  py: 8,
                  bgcolor: '#374151',
                  borderRadius: 8,
                  color: 'white',
                  '&:hover': { bgcolor: '#4b5563' },
                }}
              >
                关闭
              </Button>
            </Box>
          </Box>
        )}

        {/* Camera Controls Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <IconButton
            onClick={onCancel}
            sx={{
              borderRadius: '9999px',
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <X size={24} />
          </IconButton>
          <Box sx={{ display: 'flex', gap: 8 }}>
            <IconButton
              onClick={toggleFlash}
              sx={{
                borderRadius: '9999px',
                bgcolor: flashOn ? '#eab308' : 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': { bgcolor: flashOn ? '#eab308' : 'rgba(0,0,0,0.7)' },
              }}
            >
              <Sun size={24} />
            </IconButton>
            <IconButton
              onClick={switchCamera}
              sx={{
                borderRadius: '9999px',
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
              }}
            >
              <SwitchCamera size={24} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Capture Button */}
      <Box
        sx={{
          p: 24,
          bgcolor: 'black',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <IconButton
          onClick={capturePhoto}
          disabled={isCapturing}
          sx={{
            p: 16,
            borderRadius: '9999px',
            bgcolor: isCapturing ? '#4b5563' : 'white',
            color: isCapturing ? '#9ca3af' : '#1f2937',
            '&:hover': { bgcolor: isCapturing ? '#4b5563' : '#e5e7eb' },
            '&:active': { transform: 'scale(0.95)' },
            '&.Mui-disabled': { bgcolor: '#4b5563', color: '#9ca3af' },
          }}
        >
          <Camera size={32} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default PhotoCapture;
