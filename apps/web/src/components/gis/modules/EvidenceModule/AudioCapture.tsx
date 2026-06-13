// modules/EvidenceModule/AudioCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Mic, Square, Pause, Play, X, Check } from "lucide-react";

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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
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
    } catch (err) {
      setError("无法访问麦克风，请确保已授予麦克风权限");
      console.error("Audio capture error:", err);
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
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-medium">录音取证</h3>
        <button onClick={onCancel} className="p-1 hover:bg-gray-800 rounded">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Timer Display */}
        <div className="text-6xl font-mono text-white mb-8">
          {formatTime(duration)}
        </div>

        {/* Max Duration Hint */}
        <div className="text-gray-500 text-sm mb-8">
          最长 {formatTime(maxDuration)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
            >
              <Mic className="w-8 h-8" />
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={togglePause}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
              >
                {isPaused ? (
                  <Play className="w-6 h-6" />
                ) : (
                  <Pause className="w-6 h-6" />
                )}
              </button>
              <button
                onClick={stopRecording}
                className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
              >
                <Square className="w-8 h-8" />
              </button>
            </>
          )}
        </div>

        {/* Audio Preview */}
        {audioUrl && !isRecording && (
          <div className="mt-8 w-full max-w-md">
            <audio src={audioUrl} controls className="w-full" />
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => {
                  setRecordedBlob(null);
                  setAudioUrl(null);
                  setDuration(0);
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioCapture;
