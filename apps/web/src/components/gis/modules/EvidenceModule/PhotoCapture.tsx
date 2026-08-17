// modules/EvidenceModule/PhotoCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, SwitchCamera, Sun, X } from 'lucide-react';
import { Box, IconButton, Typography, Button } from '@mui/material';
import { logger } from '@/utils/logger';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

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
      } catch (err: unknown) {
        setError(i18n.t('gis.photo_capture.k0'));
        logger.error('Camera error:', err);
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
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
        const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
          torch?: boolean;
        };
        if (capabilities.torch) {
          track.applyConstraints({
            advanced: [{ torch: !flashOn } as MediaTrackConstraintSet & { torch?: boolean }],
          });
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
            setError(`${i18n.t('components.photo_capture.k0')}${maxFileSize / 1024 / 1024}MB)`);
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
        bgcolor: 'common.black',
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
              bgcolor: 'action.active',
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
                color: 'common.white',
                p: 16,
              }}
            >
              <Typography sx={{ color: 'error.light', mb: 8 }}>{error}</Typography>
              <Button
                onClick={onCancel}
                sx={{
                  px: 16,
                  py: 8,
                  bgcolor: 'grey.700',
                  borderRadius: 8,
                  color: 'common.white',
                  '&:hover': { bgcolor: 'text.secondary' },
                }}
              >
                {i18n.t('components.photo_capture.k0')}
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
              borderRadius: 'full',
              bgcolor: 'action.active',
              color: 'common.white',
              '&:hover': { bgcolor: 'action.active' },
            }}
            aria-label={i18n.t('gis.photo_capture.k1')}
          >
            <X size={24} />
          </IconButton>
          <Box sx={{ display: 'flex', gap: 8 }}>
            <IconButton
              onClick={toggleFlash}
              sx={{
                borderRadius: 'full',
                bgcolor: flashOn ? 'warning.main' : 'colors.cyber.glass.divider',
                color: 'common.white',
                '&:hover': {
                  bgcolor: flashOn ? 'warning.main' : designTokens.colors.cyber.metal.bottomShadow,
                },
              }}
              aria-label={i18n.t('gis.photo_capture.k2')}
            >
              <Sun size={24} />
            </IconButton>
            <IconButton
              onClick={switchCamera}
              sx={{
                borderRadius: 'full',
                bgcolor: 'action.active',
                color: 'common.white',
                '&:hover': { bgcolor: 'action.active' },
              }}
              aria-label={i18n.t('gis.photo_capture.k3')}
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
          bgcolor: 'common.black',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <IconButton
          onClick={capturePhoto}
          disabled={isCapturing}
          sx={{
            p: 16,
            borderRadius: 'full',
            bgcolor: isCapturing ? 'text.secondary' : 'var(--color-primary-foreground, #ffffff)',
            color: isCapturing ? 'text.disabled' : 'grey.800',
            '&:hover': { bgcolor: isCapturing ? 'text.secondary' : 'grey.200' },
            '&:active': { transform: 'scale(0.95)' },
            '&.Mui-disabled': { bgcolor: 'text.secondary', color: 'text.disabled' },
          }}
          aria-label={i18n.t('gis.photo_capture.k4')}
        >
          <Camera size={32} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default PhotoCapture;
