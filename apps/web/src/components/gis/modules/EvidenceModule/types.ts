// modules/EvidenceModule/types.ts
export type EvidenceType = 'photo' | 'audio' | 'video';

export interface EvidenceRecord {
  id: string;
  title: string;
  evidence_type: EvidenceType;
  position: [number, number];
  file_url: string;
  thumbnail_url?: string;
  duration?: number; // 音视频时长，秒
  filesize?: number; // 字节
  recorded_by: string;
  recorded_at: string;
  tags?: string[];
  description?: string;
}

export interface EvidenceCaptureConfig {
  maxDuration?: number; // 最大录制时长，秒
  maxFileSize?: number; // 最大文件大小，字节
  compressionQuality?: number; // 压缩质量 0-1
  format?: 'mp4' | 'webm'; // 视频格式
}
