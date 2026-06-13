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
      console.error("Camera error:", err);
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
      console.error("Recording error:", err);
    }
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
    <div className="flex flex-col h-full bg-black">
      {/* Video Preview */}
      <div className="relative flex-1">
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">录制中</span>
              </div>
            )}

            {/* Timer */}
            <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-white font-mono">
              {formatTime(duration)} / {formatTime(maxDuration)}
            </div>

            {/* Camera Controls */}
            <div className="absolute bottom-20 left-4 right-4 flex justify-between">
              <button
                onClick={switchCamera}
                disabled={isRecording}
                className={`p-2 rounded-full ${
                  isRecording
                    ? "bg-gray-800/50 text-gray-500"
                    : "bg-black/50 text-white hover:bg-black/70"
                }`}
              >
                <SwitchCamera className="w-6 h-6" />
              </button>
            </div>
          </>
        )}

        {/* Hidden canvas for thumbnail */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white p-4">
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {/* Close Button */}
        {!isRecording && (
          <div className="absolute top-4 left-4">
            <button
              onClick={onCancel}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black flex justify-center">
        {!isRecording && !recordedBlob && (
          <button
            onClick={startRecording}
            className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
          >
            <Video className="w-8 h-8" />
          </button>
        )}

        {isRecording && (
          <>
            <button
              onClick={togglePause}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white mx-2"
            >
              {isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={stopRecording}
              className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white mx-2"
            >
              <Square className="w-8 h-8" />
            </button>
          </>
        )}

        {recordedBlob && !isRecording && (
          <div className="flex gap-4">
            <button
              onClick={() => {
                setRecordedBlob(null);
                setPreviewUrl(null);
                setDuration(0);
                initCamera();
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              重新录制
            </button>
            <button
              onClick={saveRecording}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              保存
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCapture;
