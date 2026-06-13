// modules/EvidenceModule/EvidencePanel.tsx
import React, { useState, useCallback } from "react";
import { Camera, Mic, Video, List, Grid, Search, X, Tag } from "lucide-react";
import type { EvidenceRecord, EvidenceType } from "./types";
import PhotoCapture from "./PhotoCapture";
import AudioCapture from "./AudioCapture";
import VideoCapture from "./VideoCapture";

interface EvidencePanelProps {
  position: [number, number]; // [lat, lng]
  onCapture: (record: EvidenceRecord) => void;
  onClose: () => void;
  existingRecords?: EvidenceRecord[];
}

type ViewMode = "list" | "grid";
type CaptureMode = "photo" | "audio" | "video" | null;

const EvidencePanel: React.FC<EvidencePanelProps> = ({
  position,
  onCapture,
  onClose,
  existingRecords = [],
}) => {
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [records, setRecords] = useState<EvidenceRecord[]>(existingRecords);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<EvidenceType | "all">("all");

  // Handle capture
  const handlePhotoCapture = useCallback(
    (file: File, thumbnail?: string) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `照片_${new Date().toLocaleString()}`,
        evidence_type: "photo",
        position,
        file_url: URL.createObjectURL(file),
        thumbnail_url: thumbnail,
        file_size: file.size,
        recorded_by: "current-user",
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture],
  );

  const handleAudioCapture = useCallback(
    (file: File, duration: number) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `录音_${new Date().toLocaleString()}`,
        evidence_type: "audio",
        position,
        file_url: URL.createObjectURL(file),
        duration,
        file_size: file.size,
        recorded_by: "current-user",
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture],
  );

  const handleVideoCapture = useCallback(
    (file: File, thumbnail?: string, duration?: number) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `录像_${new Date().toLocaleString()}`,
        evidence_type: "video",
        position,
        file_url: URL.createObjectURL(file),
        thumbnail_url: thumbnail,
        duration,
        file_size: file.size,
        recorded_by: "current-user",
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture],
  );

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === "all" || record.evidence_type === filterType;
    return matchesSearch && matchesType;
  });

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Render capture mode
  if (captureMode === "photo") {
    return (
      <div className="h-full">
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </div>
    );
  }

  if (captureMode === "audio") {
    return (
      <div className="h-full">
        <AudioCapture
          onCapture={handleAudioCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </div>
    );
  }

  if (captureMode === "video") {
    return (
      <div className="h-full">
        <VideoCapture
          onCapture={handleVideoCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </div>
    );
  }

  // Main panel
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold text-gray-900">取证记录</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Capture Buttons */}
      <div className="p-4 border-b bg-gray-50">
        <div className="text-sm text-gray-500 mb-3">采集取证</div>
        <div className="flex gap-3">
          <button
            onClick={() => setCaptureMode("photo")}
            className="flex-1 flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <div className="p-3 bg-blue-100 rounded-full">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">拍照</span>
          </button>
          <button
            onClick={() => setCaptureMode("audio")}
            className="flex-1 flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
          >
            <div className="p-3 bg-green-100 rounded-full">
              <Mic className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">录音</span>
          </button>
          <button
            onClick={() => setCaptureMode("video")}
            className="flex-1 flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
          >
            <div className="p-3 bg-purple-100 rounded-full">
              <Video className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">录像</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索取证记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "photo", "audio", "video"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filterType === type
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type === "all"
                ? "全部"
                : type === "photo"
                  ? "照片"
                  : type === "audio"
                    ? "录音"
                    : "录像"}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="px-4 py-2 border-b flex justify-end">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow" : ""}`}
          >
            <Grid className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow" : ""}`}
          >
            <List className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Records List/Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Tag className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无取证记录</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                {record.thumbnail_url ? (
                  <img
                    src={record.thumbnail_url}
                    alt={record.title}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                    {record.evidence_type === "photo" && (
                      <Camera className="w-8 h-8 text-gray-400" />
                    )}
                    {record.evidence_type === "audio" && (
                      <Mic className="w-8 h-8 text-gray-400" />
                    )}
                    {record.evidence_type === "video" && (
                      <Video className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                )}
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {record.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {record.evidence_type === "photo"
                      ? "照片"
                      : record.evidence_type === "audio"
                        ? "录音"
                        : "录像"}
                    {record.duration && ` · ${formatDuration(record.duration)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                {record.thumbnail_url ? (
                  <img
                    src={record.thumbnail_url}
                    alt={record.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                    {record.evidence_type === "photo" && (
                      <Camera className="w-5 h-5 text-gray-400" />
                    )}
                    {record.evidence_type === "audio" && (
                      <Mic className="w-5 h-5 text-gray-400" />
                    )}
                    {record.evidence_type === "video" && (
                      <Video className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {record.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(record.recorded_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{formatFileSize(record.file_size)}</div>
                  {record.duration && (
                    <div>{formatDuration(record.duration)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidencePanel;
