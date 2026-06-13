// modules/TrackModule/TrackPlayer.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, SkipBack, SkipForward } from "lucide-react";
import type { TrackRecord, TrackStatistics } from "./types";

interface TrackPlayerProps {
  track: TrackRecord | null;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
  statistics: TrackStatistics | null;
}

const TrackPlayer: React.FC<TrackPlayerProps> = ({
  track,
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onSeek,
  statistics,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const speedOptions = [0.5, 1, 2, 4];

  // Calculate current position based on currentIndex
  const currentPosition = track?.points[currentIndex]?.position;

  // Handle playback
  useEffect(() => {
    if (isPlaying && track && currentIndex < track.points.length - 1) {
      const interval = 100 / playbackSpeed;
      intervalRef.current = setTimeout(() => {
        setCurrentIndex((prev) => {
          if (prev >= track.points.length - 1) {
            onPause();
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    }
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, track, currentIndex, onPause]);

  // Handle progress bar click
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!track || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const index = Math.floor(percent * track.points.length);
      setCurrentIndex(index);
      onSeek(index);
    },
    [track, onSeek],
  );

  // Reset on track change
  useEffect(() => {
    setCurrentIndex(0);
  }, [track?.id]);

  if (!track) {
    return (
      <div className="flex items-center justify-center h-16 bg-gray-50 rounded-lg">
        <span className="text-gray-500 text-sm">请选择设备轨迹</span>
      </div>
    );
  }

  const progress =
    track.points.length > 1
      ? (currentIndex / (track.points.length - 1)) * 100
      : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Track Info */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{track.device_name}</h3>
        <p className="text-sm text-gray-500">
          {new Date(track.start_time).toLocaleString()} -{" "}
          {new Date(track.end_time).toLocaleString()}
        </p>
      </div>

      {/* Progress Bar */}
      <div
        ref={progressRef}
        className="h-2 bg-gray-200 rounded-full cursor-pointer mb-4"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIndex(0)}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="跳到开始"
          >
            <SkipBack className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full text-white"
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onStop}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="停止"
          >
            <Square className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setCurrentIndex(track.points.length - 1)}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="跳到结尾"
          >
            <SkipForward className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">速度:</span>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={`px-2 py-1 text-sm rounded ${
                playbackSpeed === speed
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500">总距离</div>
            <div className="font-medium text-gray-900">
              {statistics.total_distance < 1000
                ? `${statistics.total_distance.toFixed(0)} 米`
                : `${(statistics.total_distance / 1000).toFixed(2)} 公里`}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">平均速度</div>
            <div className="font-medium text-gray-900">
              {statistics.avg_speed.toFixed(1)} km/h
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">最大速度</div>
            <div className="font-medium text-gray-900">
              {statistics.max_speed.toFixed(1)} km/h
            </div>
          </div>
        </div>
      )}

      {/* Current Position */}
      {currentPosition && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-500">当前位置</div>
          <div className="font-mono text-sm text-gray-700">
            {currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackPlayer;
