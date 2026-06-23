// modules/EvidenceModule/VideoCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Video,
  Square,
  Pause,
  Play,
  SwitchCamera,
  X,
  Check,
} from "lucide-react";
import { Box, IconButton, Typography } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { logger } from "@/utils/logger";

interface VideoCaptureProps {
  onCapture: (file: File, thumbnail?: string, duration?: number) => void;
  onCancel: () => void;
  maxDuration?: number; // seconds
  maxFileSize?: number; // bytes
}

const VideoCapture: React.FC<VideoCaptureProps> = ({
  onCapture,
  onCancel,
  maxDuration = 300, // 5 minutes default
  maxFileSize = 100 * 1024 * 1024, // 100MB
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      setError("无法访问摄像头，请确保已授予摄像头和麦克风权限");
      logger.error("Camera error:", err);
    }
  }, [facingMode]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4",
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
        setPreviewUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setError("无法开始录制，请重试");
      logger.error("Recording error:", err);
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

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  // Save recording
  const saveRecording = useCallback(() => {
    if (recordedBlob) {
      if (recordedBlob.size > maxFileSize) {
        setError(`文件大小超过限制 (${maxFileSize / 1024 / 1024}MB)`);
        return;
      }

      // Generate thumbnail
      let thumbnail: string | undefined;
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = videoRef.current.videoWidth || 1920;
          canvas.height = videoRef.current.videoHeight || 1080;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          thumbnail = canvas.toDataURL("image/jpeg", 0.5);
        }
      }

      const file = new File([recordedBlob], `video-${Date.now()}.webm`, {
        type: recordedBlob.type,
      });
      onCapture(file, thumbnail, duration);
    }
  }, [recordedBlob, maxFileSize, duration, onCapture]);

  // Initialize camera when facing mode changes
  useEffect(() => {
    if (!isRecording && !recordedBlob) {
      initCamera();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, initCamera, isRecording, recordedBlob]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "black",
      }}
    >
      {/* Video Preview */}
      <Box sx={{ position: "relative", flex: 1 }}>
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* Recording indicator */}
            {isRecording && (
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  bgcolor: "#ef4444",
                  px: 12,
                  py: 4,
                  borderRadius: "9999px",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    bgcolor: "white",
                    borderRadius: "9999px",
                    animation: "pulse 1.5s infinite",
                  }}
                />
                <Typography
                  sx={{ color: "white", fontSize: "0.875rem", fontWeight: 500 }}
                >
                  录制中
                </Typography>
              </Box>
            )}

            {/* Timer */}
            <Box
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                bgcolor: "rgba(0,0,0,0.5)",
                px: 12,
                py: 4,
                borderRadius: "9999px",
                color: "white",
                fontFamily: "monospace",
              }}
            >
              {formatTime(duration)} / {formatTime(maxDuration)}
            </Box>

            {/* Camera Controls */}
            <Box
              sx={{
                position: "absolute",
                bottom: 80,
                left: 16,
                right: 16,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <IconButton
                onClick={switchCamera}
                disabled={isRecording}
                sx={{
                  borderRadius: "9999px",
                  bgcolor: isRecording
                    ? "rgba(31,41,55,0.5)"
                    : "rgba(0,0,0,0.5)",
                  color: isRecording ? "#6b7280" : "white",
                  "&:hover": {
                    bgcolor: isRecording
                      ? "rgba(31,41,55,0.5)"
                      : "rgba(0,0,0,0.7)",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "rgba(31,41,55,0.5)",
                    color: "#6b7280",
                  },
                }}
              >
                <SwitchCamera size={24} />
              </IconButton>
            </Box>
          </>
        )}

        {/* Hidden canvas for thumbnail */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Error Message */}
        {error && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.8)",
            }}
          >
            <Box sx={{ textAlign: "center", color: "white", p: 16 }}>
              <Typography sx={{ color: "#f87171", mb: 8 }}>{error}</Typography>
              <Button
                onClick={onCancel}
                sx={{
                  px: 16,
                  py: 8,
                  bgcolor: "#374151",
                  borderRadius: 8,
                  color: "white",
                  "&:hover": { bgcolor: "#4b5563" },
                }}
              >
                关闭
              </Button>
            </Box>
          </Box>
        )}

        {/* Close Button */}
        {!isRecording && (
          <Box sx={{ position: "absolute", top: 16, left: 16 }}>
            <IconButton
              onClick={onCancel}
              sx={{
                borderRadius: "9999px",
                bgcolor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
            >
              <X size={24} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Controls */}
      <Box
        sx={{
          p: 24,
          bgcolor: "black",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {!isRecording && !recordedBlob && (
          <IconButton
            onClick={startRecording}
            sx={{
              p: 16,
              bgcolor: "#ef4444",
              borderRadius: "9999px",
              color: "white",
              "&:hover": { bgcolor: "#dc2626" },
            }}
          >
            <Video size={32} />
          </IconButton>
        )}

        {isRecording && (
          <>
            <IconButton
              onClick={togglePause}
              sx={{
                p: 12,
                bgcolor: "#374151",
                borderRadius: "9999px",
                color: "white",
                mx: 8,
                "&:hover": { bgcolor: "#4b5563" },
              }}
            >
              {isPaused ? <Play size={24} /> : <Pause size={24} />}
            </IconButton>
            <IconButton
              onClick={stopRecording}
              sx={{
                p: 16,
                bgcolor: "#ef4444",
                borderRadius: "9999px",
                color: "white",
                mx: 8,
                "&:hover": { bgcolor: "#dc2626" },
              }}
            >
              <Square size={32} />
            </IconButton>
          </>
        )}

        {recordedBlob && !isRecording && (
          <Box sx={{ display: "flex", gap: 16 }}>
            <Button
              onClick={() => {
                setRecordedBlob(null);
                setPreviewUrl(null);
                setDuration(0);
                initCamera();
              }}
              sx={{
                px: 16,
                py: 8,
                bgcolor: "#374151",
                borderRadius: 8,
                color: "white",
                "&:hover": { bgcolor: "#4b5563" },
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
                bgcolor: "#22c55e",
                borderRadius: 8,
                color: "white",
                "&:hover": { bgcolor: "#16a34a" },
              }}
            >
              保存
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default VideoCapture;
