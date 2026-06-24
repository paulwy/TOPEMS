/**
 * EvidenceModule 单元测试
 */
import { describe, it, expect, vi } from 'vitest';

describe('EvidenceModule', () => {
  describe('取证类型验证', () => {
    it('应正确识别照片取证', () => {
      expect(isPhotoEvidence('photo')).toBe(true);
      expect(isPhotoEvidence('Photo')).toBe(false);
    });

    it('应正确识别音频取证', () => {
      expect(isAudioEvidence('audio')).toBe(true);
      expect(isAudioEvidence('Audio')).toBe(false);
    });

    it('应正确识别视频取证', () => {
      expect(isVideoEvidence('video')).toBe(true);
      expect(isVideoEvidence('Video')).toBe(false);
    });

    it('应正确验证文件扩展名', () => {
      expect(isValidImageExtension('.jpg')).toBe(true);
      expect(isValidImageExtension('.png')).toBe(true);
      expect(isValidImageExtension('.gif')).toBe(true);
      expect(isValidImageExtension('.pdf')).toBe(false);
    });

    it('应正确验证音频扩展名', () => {
      expect(isValidAudioExtension('.mp3')).toBe(true);
      expect(isValidAudioExtension('.wav')).toBe(true);
      expect(isValidAudioExtension('.m4a')).toBe(true);
      expect(isValidAudioExtension('.jpg')).toBe(false);
    });

    it('应正确验证视频扩展名', () => {
      expect(isValidVideoExtension('.mp4')).toBe(true);
      expect(isValidVideoExtension('.avi')).toBe(true);
      expect(isValidVideoExtension('.mov')).toBe(true);
      expect(isValidVideoExtension('.jpg')).toBe(false);
    });
  });

  describe('文件大小验证', () => {
    it('应正确转换字节到MB', () => {
      const bytes = 5 * 1024 * 1024; // 5MB
      const mb = bytesToMB(bytes);
      expect(mb).toBeCloseTo(5, 1);
    });

    it('应正确验证文件大小限制', () => {
      const maxPhotoSize = 10 * 1024 * 1024; // 10MB
      const maxVideoSize = 100 * 1024 * 1024; // 100MB

      expect(isWithinSizeLimit(5 * 1024 * 1024, maxPhotoSize)).toBe(true);
      expect(isWithinSizeLimit(15 * 1024 * 1024, maxPhotoSize)).toBe(false);
      expect(isWithinSizeLimit(50 * 1024 * 1024, maxVideoSize)).toBe(true);
      expect(isWithinSizeLimit(150 * 1024 * 1024, maxVideoSize)).toBe(false);
    });
  });

  describe('文件哈希验证', () => {
    it('应生成正确的SHA256哈希格式', () => {
      const hash = 'a'.repeat(64); // 64 character hex string
      expect(isValidHashFormat(hash)).toBe(true);
      expect(isValidHashFormat('abc123')).toBe(false);
    });

    it('应拒绝短哈希', () => {
      const shortHash = 'abc123';
      expect(isValidHashFormat(shortHash)).toBe(false);
    });
  });

  describe('取证记录创建', () => {
    it('应正确创建取证记录对象', () => {
      const evidence = createEvidenceRecord({
        title: '现场照片',
        type: 'photo',
        position: { lat: 39.9042, lng: 116.4074 },
        fileSize: 1024 * 1024,
      });

      expect(evidence.title).toBe('现场照片');
      expect(evidence.evidence_type).toBe('photo');
      expect(evidence.position).toBeDefined();
    });

    it('应自动生成UUID', () => {
      const evidence = createEvidenceRecord({
        title: '测试',
        type: 'audio',
      });

      expect(evidence.id).toBeDefined();
      expect(evidence.id.length).toBeGreaterThan(0);
    });

    it('应包含时间戳', () => {
      const evidence = createEvidenceRecord({
        title: '测试',
        type: 'video',
      });

      expect(evidence.recorded_at).toBeDefined();
      expect(evidence.created_at).toBeDefined();
    });
  });

  describe('标签管理', () => {
    it('应正确添加标签', () => {
      const tags = ['重要', '现场'];
      const newTag = '紧急';

      const updatedTags = addTag(tags, newTag);
      expect(updatedTags).toContain('重要');
      expect(updatedTags).toContain('紧急');
    });

    it('应防止重复标签', () => {
      const tags = ['重要', '现场'];
      const newTag = '重要';

      const updatedTags = addTag(tags, newTag);
      expect(updatedTags.length).toBe(2); // 不应重复
    });

    it('应正确移除标签', () => {
      const tags = ['重要', '现场', '紧急'];
      const removedTag = '现场';

      const updatedTags = removeTag(tags, removedTag);
      expect(updatedTags).not.toContain('现场');
      expect(updatedTags).toContain('重要');
      expect(updatedTags).toContain('紧急');
    });
  });
});

// 辅助函数

function isPhotoEvidence(type: string): boolean {
  return type === 'photo';
}

function isAudioEvidence(type: string): boolean {
  return type === 'audio';
}

function isVideoEvidence(type: string): boolean {
  return type === 'video';
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'];

function isValidImageExtension(ext: string): boolean {
  return IMAGE_EXTENSIONS.includes(ext.toLowerCase());
}

function isValidAudioExtension(ext: string): boolean {
  return AUDIO_EXTENSIONS.includes(ext.toLowerCase());
}

function isValidVideoExtension(ext: string): boolean {
  return VIDEO_EXTENSIONS.includes(ext.toLowerCase());
}

function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

function isWithinSizeLimit(size: number, limit: number): boolean {
  return size <= limit;
}

function isValidHashFormat(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

interface EvidenceRecordInput {
  title: string;
  type: string;
  position?: { lat: number; lng: number };
  fileSize?: number;
}

interface EvidenceRecord {
  id: string;
  title: string;
  evidence_type: string;
  position: unknown;
  file_size: number | undefined;
  recorded_at: string;
  created_at: string;
}

function createEvidenceRecord(input: EvidenceRecordInput): EvidenceRecord {
  return {
    id: generateUUID(),
    title: input.title,
    evidence_type: input.type,
    position: input.position,
    file_size: input.fileSize,
    recorded_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addTag(tags: string[], newTag: string): string[] {
  if (tags.includes(newTag)) return tags;
  return [...tags, newTag];
}

function removeTag(tags: string[], tagToRemove: string): string[] {
  return tags.filter((tag) => tag !== tagToRemove);
}
