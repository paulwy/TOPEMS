// modules/EvidenceModule/PhotoCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, SwitchCamera, Sun, X, Check } from "lucide-react";

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
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
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
        setError("无法访问摄像头，请确保已授予摄像头权限");
        console.error("Camera error:", err);
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
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, [stream]);

  // Toggle flash
  const toggleFlash = useCallback(() => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track && "getCapabilities" in track) {
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
    const ctx = canvas.getContext("2d");

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
          const thumbnailCanvas = document.createElement("canvas");
          const thumbCtx = thumbnailCanvas.getContext("2d");
          if (thumbCtx) {
            thumbnailCanvas.width = 200;
            thumbnailCanvas.height =
              200 * (video.videoHeight / video.videoWidth);
            thumbCtx.drawImage(
              video,
              0,
              0,
              thumbnailCanvas.width,
              thumbnailCanvas.height,
            );
            const thumbnail = thumbnailCanvas.toDataURL("image/jpeg", 0.5);
            onCapture(
              new File([blob], "photo.jpg", { type: "image/jpeg" }),
              thumbnail,
            );
          } else {
            onCapture(new File([blob], "photo.jpg", { type: "image/jpeg" }));
          }
        }
        setIsCapturing(false);
      },
      "image/jpeg",
      compressionQuality,
    );
  }, [maxFileSize, compressionQuality, onCapture]);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Video Preview */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Hidden canvas for capture */}
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

        {/* Camera Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <button
            onClick={onCancel}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={toggleFlash}
              className={`p-2 rounded-full ${flashOn ? "bg-yellow-500" : "bg-black/50"} text-white hover:bg-black/70`}
            >
              <Sun className="w-6 h-6" />
            </button>
            <button
              onClick={switchCamera}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Capture Button */}
      <div className="p-6 bg-black flex justify-center">
        <button
          onClick={capturePhoto}
          disabled={isCapturing}
          className={`p-4 rounded-full transition-all ${
            isCapturing
              ? "bg-gray-600"
              : "bg-white hover:bg-gray-200 active:scale-95"
          }`}
        >
          <Camera
            className={`w-8 h-8 ${isCapturing ? "text-gray-400" : "text-gray-800"}`}
          />
        </button>
      </div>
    </div>
  );
};

export default PhotoCapture;
