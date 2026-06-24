// modules/EvidenceModule/AudioCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, Square, Pause, Play, X, Check } from 'lucide-react';
import { Box, IconButton, Typography, Paper } from '@mui/material';
import { Button } from '@mui/material';
import { logger } from '@/utils/logger';

interface AudioCaptureProps {
  onCapture: (file: File, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // seconds
  maxFileSize?: number; // bytes
}

const AudioCapture: React.FC<AudioCaptureProps> = ({
  onCapture,
  onCancel,
  maxDuration = 300, // 5 minutes default
  maxFileSize = 50 * 1024 * 1024, // 50MB
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setRecordedBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);
      setError(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setError('无法访问麦克风，请确保已授予麦克风权限');
      logger.error('Audio capture error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDuration]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    setIsPaused(!isPaused);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, maxDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  // Save recording
  const saveRecording = useCallback(() => {
    if (recordedBlob) {
      if (recordedBlob.size > maxFileSize) {
        setError(`文件大小超过限制 (${maxFileSize / 1024 / 1024}MB)`);
        return;
      }
      const file = new File([recordedBlob], `recording-${Date.now()}.webm`, {
        type: recordedBlob.type,
      });
      onCapture(file, duration);
    }
  }, [recordedBlob, maxFileSize, duration, onCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'text.primary',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 16,
          borderBottom: 1,
          borderColor: 'grey.700',
        }}
      >
        <Typography sx={{ color: 'white', fontWeight: 500 }}>录音取证</Typography>
        <IconButton
          onClick={onCancel}
          sx={{ borderRadius: 4, '&:hover': { bgcolor: 'grey.800' } }}
        >
          <X
            size={20}
            style={{ color: 'text.disabled' }}
          />
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 24,
        }}
      >
        {error && (
          <Paper
            sx={{
              mb: 16,
              p: 12,
              bgcolor: 'rgba(239,68,68,0.2)',
              border: 1,
              borderColor: 'error.main',
              borderRadius: 8,
            }}
          >
            <Typography sx={{ color: 'error.light', fontSize: '0.875rem' }}>{error}</Typography>
          </Paper>
        )}

        {/* Timer Display */}
        <Typography
          sx={{
            fontSize: '3.75rem',
            fontFamily: 'monospace',
            color: 'white',
            mb: 32,
          }}
        >
          {formatTime(duration)}
        </Typography>

        {/* Max Duration Hint */}
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 32 }}>
          最长 {formatTime(maxDuration)}
        </Typography>

        {/* Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isRecording && !recordedBlob && (
            <IconButton
              onClick={startRecording}
              sx={{
                p: 16,
                bgcolor: 'error.main',
                borderRadius: '9999px',
                color: 'white',
                '&:hover': { bgcolor: 'error.dark' },
              }}
            >
              <Mic size={32} />
            </IconButton>
          )}

          {isRecording && (
            <>
              <IconButton
                onClick={togglePause}
                sx={{
                  p: 12,
                  bgcolor: 'grey.700',
                  borderRadius: '9999px',
                  color: 'white',
                  '&:hover': { bgcolor: 'text.secondary' },
                }}
              >
                {isPaused ? <Play size={24} /> : <Pause size={24} />}
              </IconButton>
              <IconButton
                onClick={stopRecording}
                sx={{
                  p: 16,
                  bgcolor: 'error.main',
                  borderRadius: '9999px',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' },
                }}
              >
                <Square size={32} />
              </IconButton>
            </>
          )}
        </Box>

        {/* Audio Preview */}
        {audioUrl && !isRecording && (
          <Box sx={{ mt: 32, width: '100%', maxWidth: 400 }}>
            <audio
              src={audioUrl}
              controls
              style={{ width: '100%' }}
            />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
                mt: 16,
              }}
            >
              <Button
                onClick={() => {
                  setRecordedBlob(null);
                  setAudioUrl(null);
                  setDuration(0);
                }}
                sx={{
                  px: 16,
                  py: 8,
                  bgcolor: 'grey.700',
                  borderRadius: 8,
                  color: 'white',
                  '&:hover': { bgcolor: 'text.secondary' },
                }}
              >
                重新录制
              </Button>
              <Button
                onClick={saveRecording}
                startIcon={<Check size={16} />}
                sx={{
                  px: 16,
                  py: 8,
                  bgcolor: 'success.dark',
                  borderRadius: 8,
                  color: 'white',
                  '&:hover': { bgcolor: 'success.dark' },
                }}
              >
                保存
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AudioCapture;
