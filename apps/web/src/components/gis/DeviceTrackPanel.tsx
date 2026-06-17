import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  Activity,
  Gauge,
  Battery,
  Navigation,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { DevicePoint, DeviceLocationRecord } from "../../api/gis";
import { gisApi } from "../../api/gis";
import "leaflet/dist/leaflet.css";

interface DeviceTrackPanelProps {
  devicePoints: DevicePoint[];
  onClose: () => void;
}

const MAX_TRACK_POINTS = 500;

const DeviceTrackPanel: React.FC<DeviceTrackPanelProps> = ({
  devicePoints,
  onClose,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [trackData, setTrackData] = useState<DeviceLocationRecord[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statistics, setStatistics] = useState<{
    total_distance: number;
    avg_speed: number;
    max_speed: number;
    track_points: number;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [timeRange, setTimeRange] = useState({
    start: "",
    end: "",
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchTrackData();
    }
  }, [selectedDevice, timeRange]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (
      isPlaying &&
      trackData.length > 0 &&
      currentIndex < trackData.length - 1
    ) {
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    } else if (currentIndex >= trackData.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentIndex, trackData.length]);

  const fetchTrackData = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      const params: any = { device_id: selectedDevice };
      if (timeRange.start) params.start_time = timeRange.start;
      if (timeRange.end) params.end_time = timeRange.end;
      params.page_size = MAX_TRACK_POINTS;

      const response = await gisApi.getDeviceTrack(params);
      if (response.success && response.data) {
        const data = response.data.data || [];
        const limitedData = data.slice(0, MAX_TRACK_POINTS);
        setTrackData(limitedData);
        setCurrentIndex(0);
        setIsPlaying(false);

        const statsResponse =
          await gisApi.getDeviceTrackStatistics(selectedDevice);
        if (statsResponse.success && statsResponse.data) {
          setStatistics(statsResponse.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch track data:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (currentIndex >= trackData.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters.toFixed(2)} 米`;
    }
    return `${(meters / 1000).toFixed(2)} 公里`;
  };

  const formatSpeed = (kmh: number): string => {
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const deviceWithTracks = devicePoints;

  if (trackData.length > 0) {
    const trackCoords = trackData.map(
      (point) => [point.latitude, point.longitude] as [number, number],
    );
    const currentPoint = trackData[currentIndex];

    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <h3 className="font-semibold flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            设备轨迹追踪
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">
                选择设备
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择设备</option>
                {deviceWithTracks.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.device_type})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-500 mb-1">
                开始时间
              </label>
              <input
                type="datetime-local"
                value={timeRange.start}
                onChange={(e) =>
                  setTimeRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-500 mb-1">
                结束时间
              </label>
              <input
                type="datetime-local"
                value={timeRange.end}
                onChange={(e) =>
                  setTimeRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <button
            onClick={() => setTimeRange({ start: "", end: "" })}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            清除时间筛选
          </button>

          <button
            onClick={fetchTrackData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            刷新数据
          </button>

          <button
            onClick={togglePlayback}
            disabled={trackData.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isPlaying
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isPlaying ? "暂停" : "播放轨迹"}
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              轨迹点: <span className="font-medium">{currentIndex + 1}</span> /{" "}
              {trackData.length}
            </span>
            <input
              type="range"
              min={0}
              max={trackData.length - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isPlaying}
            />
          </div>

          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg"
          >
            <span className="text-sm font-medium text-gray-700">轨迹统计</span>
            {showStatistics ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showStatistics && statistics && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Navigation className="w-4 h-4" />
                  <span className="text-xs">总距离</span>
                </div>
                <div className="text-lg font-semibold text-blue-800">
                  {formatDistance(statistics.total_distance)}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Gauge className="w-4 h-4" />
                  <span className="text-xs">平均速度</span>
                </div>
                <div className="text-lg font-semibold text-green-800">
                  {formatSpeed(statistics.avg_speed)}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">最大速度</span>
                </div>
                <div className="text-lg font-semibold text-orange-800">
                  {formatSpeed(statistics.max_speed)}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">轨迹点数</span>
                </div>
                <div className="text-lg font-semibold text-purple-800">
                  {statistics.track_points}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">开始时间</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {formatTime(statistics.start_time)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">结束时间</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {formatTime(statistics.end_time)}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              当前位置详情
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">时间:</span>
                <span className="ml-2 text-gray-700">
                  {formatTime(currentPoint.timestamp)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">坐标:</span>
                <span className="ml-2 text-gray-700 font-mono text-xs">
                  {currentPoint.latitude.toFixed(6)},{" "}
                  {currentPoint.longitude.toFixed(6)}
                </span>
              </div>
              {currentPoint.accuracy !== undefined && (
                <div>
                  <span className="text-gray-500">精度:</span>
                  <span className="ml-2 text-gray-700">
                    {currentPoint.accuracy} m
                  </span>
                </div>
              )}
              {currentPoint.speed !== undefined && (
                <div>
                  <span className="text-gray-500">速度:</span>
                  <span className="ml-2 text-gray-700">
                    {formatSpeed(currentPoint.speed)}
                  </span>
                </div>
              )}
              {currentPoint.heading !== undefined && (
                <div>
                  <span className="text-gray-500">方向:</span>
                  <span className="ml-2 text-gray-700">
                    {currentPoint.heading}°
                  </span>
                </div>
              )}
              {currentPoint.battery_level !== undefined && (
                <div>
                  <span className="text-gray-500">电量:</span>
                  <span className="ml-2 text-gray-700">
                    <Battery
                      className={`w-4 h-4 inline ${
                        currentPoint.battery_level > 50
                          ? "text-green-500"
                          : currentPoint.battery_level > 20
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    />
                    {currentPoint.battery_level}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
            <MapContainer
              center={[currentPoint.latitude, currentPoint.longitude]}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline
                positions={trackCoords.slice(0, currentIndex + 1)}
                color="#3B82F6"
                weight={3}
                opacity={0.8}
              />
              <Polyline
                positions={trackCoords.slice(currentIndex + 1)}
                color="#94A3B8"
                weight={2}
                opacity={0.4}
                dashArray="5,5"
              />
              {trackCoords.length > 1 && (
                <Marker
                  position={trackCoords[0]}
                  icon={
                    new (window as any).L.Icon({
                      iconUrl:
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322C55E'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                      iconSize: [24, 24],
                      iconAnchor: [12, 24],
                    })
                  }
                >
                  <Popup>起点</Popup>
                </Marker>
              )}
              <Marker
                position={[currentPoint.latitude, currentPoint.longitude]}
                icon={
                  new (window as any).L.Icon({
                    iconUrl:
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EF4444'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                  })
                }
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium">当前位置</div>
                    <div>{formatTime(currentPoint.timestamp)}</div>
                  </div>
                </Popup>
              </Marker>
              {trackCoords.length > 1 &&
                trackCoords[trackCoords.length - 1] !==
                  trackCoords[currentIndex] && (
                  <Marker
                    position={trackCoords[trackCoords.length - 1]}
                    icon={
                      new (window as any).L.Icon({
                        iconUrl:
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                        iconSize: [24, 24],
                        iconAnchor: [12, 24],
                      })
                    }
                  >
                    <Popup>终点</Popup>
                  </Marker>
                )}
            </MapContainer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <h3 className="font-semibold flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          设备轨迹追踪
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Navigation className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">请选择一个设备查看轨迹</p>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">请选择设备</option>
            {deviceWithTracks.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.device_type})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DeviceTrackPanel;
