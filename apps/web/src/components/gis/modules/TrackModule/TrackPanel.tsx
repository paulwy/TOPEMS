// modules/TrackModule/TrackPanel.tsx
import React, { useState, useMemo } from "react";
import { Search, Calendar, MapPin } from "lucide-react";
import type { DevicePoint } from "../../../../api/gis";
import type { TrackRecord, TrackStatistics, TrackPoint } from "./types";
import TrackPlayer from "./TrackPlayer";

interface TrackPanelProps {
  devicePoints: DevicePoint[];
  onClose: () => void;
}

// Mock track data generator for demonstration
const generateMockTrack = (device: DevicePoint): TrackRecord => {
  const points: TrackPoint[] = [];
  const numPoints = 20 + Math.floor(Math.random() * 30);
  let lat = device.latitude;
  let lng = device.longitude;

  for (let i = 0; i < numPoints; i++) {
    lat += (Math.random() - 0.5) * 0.001;
    lng += (Math.random() - 0.5) * 0.001;
    const point: TrackPoint = {
      position: [lat, lng],
      timestamp: new Date(Date.now() - (numPoints - i) * 60000).toISOString(),
      speed: 20 + Math.random() * 40,
      heading: Math.random() * 360,
      battery_level: 100 - Math.floor((i / numPoints) * 100),
    };
    points.push(point);
  }

  return {
    id: `track-${device.id}`,
    device_id: device.id,
    device_name: device.name,
    points,
    start_time: points[0].timestamp,
    end_time: points[points.length - 1].timestamp,
    total_distance: Math.random() * 5000 + 1000,
  };
};

// Calculate statistics for a track
const calculateStatistics = (track: TrackRecord): TrackStatistics => {
  const speeds = track.points
    .filter((p) => p.speed !== undefined)
    .map((p) => p.speed as number);

  const distances: number[] = [];
  for (let i = 0; i < track.points.length - 1; i++) {
    const p1 = track.points[i].position;
    const p2 = track.points[i + 1].position;
    const R = 6371000;
    const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
    const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1[0] * Math.PI) / 180) *
        Math.cos((p2[0] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distances.push(R * c);
  }

  const totalDistance = distances.reduce((a, b) => a + b, 0);
  const avgSpeed =
    speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

  const startTime = new Date(track.start_time).getTime();
  const endTime = new Date(track.end_time).getTime();
  const duration = (endTime - startTime) / 1000;

  return {
    total_distance: totalDistance,
    avg_speed: avgSpeed,
    max_speed: maxSpeed,
    duration,
    point_count: track.points.length,
    start_time: track.start_time,
    end_time: track.end_time,
  };
};

const TrackPanel: React.FC<TrackPanelProps> = ({ devicePoints, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<DevicePoint | null>(
    null,
  );
  const [currentTrack, setCurrentTrack] = useState<TrackRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [statistics, setStatistics] = useState<TrackStatistics | null>(null);

  // Filter devices based on search
  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devicePoints;
    const query = searchQuery.toLowerCase();
    return devicePoints.filter(
      (device) =>
        device.name.toLowerCase().includes(query) ||
        device.device_type?.toLowerCase().includes(query) ||
        device.id.toLowerCase().includes(query),
    );
  }, [devicePoints, searchQuery]);

  // Handle device selection
  const handleDeviceSelect = (device: DevicePoint) => {
    setSelectedDevice(device);
    const track = generateMockTrack(device);
    setCurrentTrack(track);
    setStatistics(calculateStatistics(track));
    setIsPlaying(false);
  };

  // Handle play/pause
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTrack((prev) => (prev ? { ...prev } : null));
  };

  // Handle speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  // Handle seek
  const handleSeek = (index: number) => {
    // In a real implementation, this would seek to the specific point
    console.log("Seek to index:", index);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold text-gray-900">设备轨迹追踪</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Device List */}
        <div className="w-1/3 border-r flex flex-col">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索设备..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Device List */}
          <div className="flex-1 overflow-y-auto">
            {filteredDevices.map((device) => (
              <button
                key={device.id}
                onClick={() => handleDeviceSelect(device)}
                className={`w-full px-4 py-3 text-left border-b hover:bg-gray-50 transition-colors ${
                  selectedDevice?.id === device.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {device.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {device.device_type}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {filteredDevices.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                未找到设备
              </div>
            )}
          </div>
        </div>

        {/* Track Player */}
        <div className="flex-1 flex flex-col">
          {currentTrack ? (
            <div className="flex-1 p-4 overflow-y-auto">
              <TrackPlayer
                track={currentTrack}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onSpeedChange={handleSpeedChange}
                onSeek={handleSeek}
                statistics={statistics}
              />

              {/* Track Points List */}
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">轨迹点列表</h4>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">
                          #
                        </th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">
                          时间
                        </th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">
                          坐标
                        </th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">
                          速度
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentTrack.points.slice(0, 50).map((point, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {new Date(point.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">
                            {point.position[0].toFixed(5)},{" "}
                            {point.position[1].toFixed(5)}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {point.speed?.toFixed(1) || "-"} km/h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {currentTrack.points.length > 50 && (
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50">
                      显示前 50 个点，共 {currentTrack.points.length} 个点
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  从左侧列表选择设备以查看轨迹
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackPanel;
