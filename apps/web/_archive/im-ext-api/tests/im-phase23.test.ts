import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import imApi from '../im';
import {
  imDeviceApi,
  type DeviceInfo,
  type RegisterDeviceRequest,
  type DeviceLocation,
  type DeviceStats,
  type DeviceType,
  type DeviceStatus,
  type DevicePlatform,
} from '../im/device';
import {
  imTranslationApi,
  type Translation,
  type TranslateMessageRequest,
  type TranslateTextRequest,
  type TranslationPreferences,
  type TranslationStats,
  type TranslationLanguage,
} from '../im/translation';
import {
  imRichMediaApi,
  type RichMedia,
  type UploadMediaRequest,
  type UploadMediaResponse,
  type CreateMediaMessageRequest,
  type MediaStats,
  type RichMediaType,
  type MediaStatus,
  type MediaQuality,
} from '../im/richMedia';

const { createDomainMock } = vi.hoisted(() => ({
  createDomainMock: () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('../client', () => {
  const mockClient = {
    im: createDomainMock(),
    crm: createDomainMock(),
    hrm: createDomainMock(),
    scm: createDomainMock(),
    wms: createDomainMock(),
    mes: createDomainMock(),
    finance: createDomainMock(),
    quality: createDomainMock(),
    pdm: createDomainMock(),
    pm: createDomainMock(),
    project: createDomainMock(),
    monitor: createDomainMock(),
    tenant: createDomainMock(),
    mobile: createDomainMock(),
    addressbook: createDomainMock(),
    feedback: createDomainMock(),
    file: createDomainMock(),
    doc: createDomainMock(),
    template: createDomainMock(),
    unified: createDomainMock(),
    masterData: createDomainMock(),
    ai: createDomainMock(),
    iam: createDomainMock(),
    erp: createDomainMock(),
    messages: createDomainMock(),
    notifications: createDomainMock(),
    portal: createDomainMock(),
    billing: createDomainMock(),
    analytics: createDomainMock(),
    search: createDomainMock(),
  };
  return {
    apiClient: mockClient,
    default: mockClient,
  };
});

describe('IM Device API Tests', () => {
  const mockDevice: DeviceInfo = {
    id: 'device-001',
    user_id: 'user-001',
    device_name: 'iPhone 15 Pro',
    device_type: 'mobile' as DeviceType,
    platform: 'ios' as DevicePlatform,
    os_version: '17.0',
    app_version: '2.0.0',
    model: 'iPhone15,3',
    manufacturer: 'Apple',
    status: 'online' as DeviceStatus,
    is_primary: true,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-15T10:00:00Z',
  };

  const mockDeviceStats: DeviceStats = {
    total_devices: 5,
    online_devices: 3,
    offline_devices: 2,
    by_type: { mobile: 3, desktop: 1, tablet: 1, web: 0, iot: 0 },
    by_platform: { ios: 2, android: 1, windows: 1, macos: 1, linux: 0, web: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应调用 POST /im/devices 注册设备', async () => {
    const req: RegisterDeviceRequest = {
      device_name: 'MacBook Pro',
      device_type: 'desktop',
      platform: 'macos',
      os_version: '14.0',
      app_version: '2.0.0',
    };
    apiClient.im.post.mockResolvedValue({ data: mockDevice });
    const result = await imDeviceApi.registerDevice(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/devices', req);
    expect(result.data?.device_name).toBe('iPhone 15 Pro');
  });

  it('应调用 GET /im/devices 获取设备列表', async () => {
    apiClient.im.get.mockResolvedValue({ data: { items: [mockDevice], total: 1 } });
    const result = await imDeviceApi.listMyDevices();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/devices', { params: undefined });
    expect(result.data?.items).toHaveLength(1);
  });

  it('应调用 GET /im/devices/:id 获取单个设备', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockDevice });
    const result = await imDeviceApi.getDevice('device-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/devices/device-001');
    expect(result.data?.id).toBe('device-001');
  });

  it('应调用 PUT /im/devices/:id 更新设备', async () => {
    const updateData = { device_name: 'Updated Device' };
    apiClient.im.put.mockResolvedValue({ data: { ...mockDevice, device_name: 'Updated Device' } });
    const result = await imDeviceApi.updateDevice('device-001', updateData);
    expect(apiClient.im.put).toHaveBeenCalledWith('/im/devices/device-001', updateData);
    expect(result.data?.device_name).toBe('Updated Device');
  });

  it('应调用 DELETE /im/devices/:id 删除设备', async () => {
    apiClient.im.delete.mockResolvedValue({ data: null });
    const result = await imDeviceApi.deleteDevice('device-001');
    expect(apiClient.im.delete).toHaveBeenCalledWith('/im/devices/device-001');
    expect(result.data).toBeNull();
  });

  it('应调用 PUT /im/devices/:id/primary 设置主设备', async () => {
    apiClient.im.put.mockResolvedValue({ data: { ...mockDevice, is_primary: true } });
    const result = await imDeviceApi.setPrimaryDevice('device-001');
    expect(apiClient.im.put).toHaveBeenCalledWith('/im/devices/device-001/primary');
    expect(result.data?.is_primary).toBe(true);
  });

  it('应调用 GET /im/devices/:id/location 获取设备位置', async () => {
    const mockLocation: DeviceLocation = {
      latitude: 39.9042,
      longitude: 116.4074,
      city: '北京',
      timestamp: '2026-08-15T10:00:00Z',
    };
    apiClient.im.get.mockResolvedValue({ data: mockLocation });
    const result = await imDeviceApi.getDeviceLocation('device-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/devices/device-001/location');
    expect(result.data?.city).toBe('北京');
  });

  it('应调用 PUT /im/devices/:id/location 更新设备位置', async () => {
    const locData: DeviceLocation = {
      latitude: 31.2304,
      longitude: 121.4737,
      city: '上海',
      timestamp: '2026-08-15T10:00:00Z',
    };
    apiClient.im.put.mockResolvedValue({ data: locData });
    const result = await imDeviceApi.updateDeviceLocation('device-001', locData);
    expect(apiClient.im.put).toHaveBeenCalledWith('/im/devices/device-001/location', locData);
    expect(result.data?.city).toBe('上海');
  });

  it('应调用 GET /im/devices/stats 获取设备统计', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockDeviceStats });
    const result = await imDeviceApi.getDeviceStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/devices/stats');
    expect(result.data?.total_devices).toBe(5);
    expect(result.data?.online_devices).toBe(3);
  });

  it('应调用 GET /im/users/:id/devices 获取用户设备列表', async () => {
    apiClient.im.get.mockResolvedValue({ data: { items: [mockDevice], total: 1 } });
    const result = await imDeviceApi.listUserDevices('user-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/users/user-001/devices');
    expect(result.data?.items).toHaveLength(1);
  });

  it('应调用 POST /im/devices/:id/sync-contacts 同步通讯录', async () => {
    apiClient.im.post.mockResolvedValue({ data: { synced_count: 150 } });
    const result = await imDeviceApi.syncDeviceContacts('device-001');
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/devices/device-001/sync-contacts');
    expect(result.data?.synced_count).toBe(150);
  });

  it('应调用 GET /im/devices/:id/sessions 获取设备会话', async () => {
    const mockSessions = [
      {
        id: 'session-001',
        session_id: 'sess-001',
        started_at: '2026-08-15T08:00:00Z',
        last_activity: '2026-08-15T10:00:00Z',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      },
    ];
    apiClient.im.get.mockResolvedValue({ data: mockSessions });
    const result = await imDeviceApi.listDeviceSessions('device-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/devices/device-001/sessions');
    expect(result.data).toHaveLength(1);
  });
});

describe('IM Translation API Tests', () => {
  const mockTranslation: Translation = {
    id: 'trans-001',
    message_id: 'msg-001',
    chat_id: 'chat-001',
    original_content: 'Hello, how are you?',
    original_language: 'en',
    translated_content: '你好，你好吗？',
    translated_language: 'zh',
    translator: 'google',
    confidence: 0.95,
    status: 'completed',
    created_by: 'user-002',
    created_at: '2026-08-15T10:00:00Z',
  };

  const mockTranslationStats: TranslationStats = {
    total_translations: 1200,
    today_translations: 45,
    by_language: { en: 500, zh: 400, ja: 300 },
    by_translator: { google: 800, deepl: 400 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应调用 POST /im/translations 翻译消息', async () => {
    const req: TranslateMessageRequest = {
      message_id: 'msg-001',
      chat_id: 'chat-001',
      target_language: 'zh',
    };
    apiClient.im.post.mockResolvedValue({ data: mockTranslation });
    const result = await imTranslationApi.translateMessage(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/translations', req);
    expect(result.data?.translated_content).toBe('你好，你好吗？');
  });

  it('应调用 POST /im/translations/text 翻译文本', async () => {
    const req: TranslateTextRequest = {
      text: 'Hello',
      target_language: 'zh',
    };
    apiClient.im.post.mockResolvedValue({
      data: {
        translated_content: '你好',
        source_language: 'en' as TranslationLanguage,
        confidence: 0.98,
      },
    });
    const result = await imTranslationApi.translateText(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/translations/text', req);
    expect(result.data?.translated_content).toBe('你好');
  });

  it('应调用 POST /im/translations/batch 批量翻译', async () => {
    const batchReq = {
      messages: [
        { message_id: 'msg-001', chat_id: 'chat-001', content: 'Hello' },
        { message_id: 'msg-002', chat_id: 'chat-001', content: 'World' },
      ],
      target_language: 'zh' as TranslationLanguage,
    };
    apiClient.im.post.mockResolvedValue({
      data: { translations: [mockTranslation], failed_count: 0 },
    });
    const result = await imTranslationApi.batchTranslate(batchReq);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/translations/batch', batchReq);
    expect(result.data?.failed_count).toBe(0);
  });

  it('应调用 GET /im/translations/:id 获取翻译记录', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockTranslation });
    const result = await imTranslationApi.getTranslation('trans-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/translations/trans-001');
    expect(result.data?.id).toBe('trans-001');
  });

  it('应调用 GET /im/messages/:id/translations 获取消息的所有翻译', async () => {
    apiClient.im.get.mockResolvedValue({ data: [mockTranslation] });
    const result = await imTranslationApi.listMessageTranslations('msg-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/messages/msg-001/translations');
    expect(result.data).toHaveLength(1);
  });

  it('应调用 DELETE /im/translations/:id 删除翻译', async () => {
    apiClient.im.delete.mockResolvedValue({ data: null });
    const result = await imTranslationApi.deleteTranslation('trans-001');
    expect(apiClient.im.delete).toHaveBeenCalledWith('/im/translations/trans-001');
    expect(result.data).toBeNull();
  });

  it('应调用 GET /im/translation-preferences 获取翻译偏好', async () => {
    const prefs: TranslationPreferences = {
      auto_translate: true,
      default_language: 'zh',
      source_languages: ['en', 'ja'],
      excluded_chats: [],
      show_original: true,
    };
    apiClient.im.get.mockResolvedValue({ data: prefs });
    const result = await imTranslationApi.getTranslationPreferences();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/translation-preferences');
    expect(result.data?.auto_translate).toBe(true);
  });

  it('应调用 PUT /im/translation-preferences 更新翻译偏好', async () => {
    const updateData = { auto_translate: false };
    const updatedPrefs: TranslationPreferences = {
      auto_translate: false,
      default_language: 'zh',
      source_languages: ['en'],
      excluded_chats: ['chat-002'],
      show_original: true,
    };
    apiClient.im.put.mockResolvedValue({ data: updatedPrefs });
    const result = await imTranslationApi.updateTranslationPreferences(updateData);
    expect(apiClient.im.put).toHaveBeenCalledWith('/im/translation-preferences', updateData);
    expect(result.data?.auto_translate).toBe(false);
  });

  it('应调用 POST /im/translations/detect 检测语言', async () => {
    apiClient.im.post.mockResolvedValue({
      data: { language: 'en' as TranslationLanguage, confidence: 0.99 },
    });
    const result = await imTranslationApi.detectLanguage('Hello world');
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/translations/detect', {
      text: 'Hello world',
    });
    expect(result.data?.language).toBe('en');
  });

  it('应调用 GET /im/translations/languages 获取可用语言', async () => {
    const languages = [
      { code: 'en' as TranslationLanguage, name: 'English', native_name: 'English' },
      { code: 'zh' as TranslationLanguage, name: 'Chinese', native_name: '中文' },
    ];
    apiClient.im.get.mockResolvedValue({ data: languages });
    const result = await imTranslationApi.getAvailableLanguages();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/translations/languages');
    expect(result.data).toHaveLength(2);
  });

  it('应调用 GET /im/translations/stats 获取翻译统计', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockTranslationStats });
    const result = await imTranslationApi.getTranslationStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/translations/stats');
    expect(result.data?.total_translations).toBe(1200);
    expect(result.data?.today_translations).toBe(45);
  });
});

describe('IM Rich Media API Tests', () => {
  const mockMedia: RichMedia = {
    id: 'media-001',
    chat_id: 'chat-001',
    media_type: 'image' as RichMediaType,
    url: 'https://cdn.example.com/media/001.jpg',
    thumbnail_url: 'https://cdn.example.com/media/001-thumb.jpg',
    file_name: 'photo.jpg',
    file_size: 1024000,
    mime_type: 'image/jpeg',
    width: 1920,
    height: 1080,
    status: 'ready' as MediaStatus,
    quality: 'high' as MediaQuality,
    uploaded_by: 'user-001',
    uploaded_by_name: '张三',
    created_at: '2026-08-15T10:00:00Z',
  };

  const mockUploadResponse: UploadMediaResponse = {
    media_id: 'media-001',
    upload_url: 'https://upload.example.com/media',
    expires_at: '2026-08-15T11:00:00Z',
    headers: { 'Content-Type': 'image/jpeg' },
  };

  const mockMediaStats: MediaStats = {
    total_media: 500,
    total_size: 1073741824,
    by_type: {
      image: 300,
      video: 100,
      audio: 50,
      file: 30,
      document: 15,
      location: 3,
      contact_card: 2,
    },
    today_uploads: 12,
    storage_used: 536870912,
    storage_limit: 1073741824,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应调用 POST /im/media/upload-request 请求上传', async () => {
    const req: UploadMediaRequest = {
      file_name: 'photo.jpg',
      file_size: 1024000,
      mime_type: 'image/jpeg',
      media_type: 'image',
    };
    apiClient.im.post.mockResolvedValue({ data: mockUploadResponse });
    const result = await imRichMediaApi.requestUpload(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/media/upload-request', req);
    expect(result.data?.media_id).toBe('media-001');
  });

  it('应调用 POST /im/media/:id/complete 完成上传', async () => {
    apiClient.im.post.mockResolvedValue({ data: mockMedia });
    const result = await imRichMediaApi.completeUpload('media-001', { width: 1920, height: 1080 });
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/media/media-001/complete', {
      width: 1920,
      height: 1080,
    });
    expect(result.data?.id).toBe('media-001');
  });

  it('应调用 GET /im/media 获取媒体列表', async () => {
    apiClient.im.get.mockResolvedValue({ data: { items: [mockMedia], total: 1 } });
    const result = await imRichMediaApi.listMedia();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media', { params: undefined });
    expect(result.data?.items).toHaveLength(1);
  });

  it('应调用 GET /im/media/:id 获取单个媒体', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockMedia });
    const result = await imRichMediaApi.getMedia('media-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media/media-001');
    expect(result.data?.file_name).toBe('photo.jpg');
  });

  it('应调用 DELETE /im/media/:id 删除媒体', async () => {
    apiClient.im.delete.mockResolvedValue({ data: null });
    const result = await imRichMediaApi.deleteMedia('media-001');
    expect(apiClient.im.delete).toHaveBeenCalledWith('/im/media/media-001');
    expect(result.data).toBeNull();
  });

  it('应调用 GET /im/media/:id/download 下载媒体', async () => {
    apiClient.im.get.mockResolvedValue({
      data: { download_url: 'https://cdn.example.com/download', filename: 'photo.jpg' },
    });
    const result = await imRichMediaApi.downloadMedia('media-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media/media-001/download');
    expect(result.data?.filename).toBe('photo.jpg');
  });

  it('应调用 POST /im/media/message 创建媒体消息', async () => {
    const req: CreateMediaMessageRequest = {
      chat_id: 'chat-001',
      media_ids: ['media-001'],
      caption: '请看这张图片',
    };
    apiClient.im.post.mockResolvedValue({
      data: { message_ids: ['msg-001'], media_ids: ['media-001'] },
    });
    const result = await imRichMediaApi.createMediaMessage(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/media/message', req);
    expect(result.data?.message_ids).toHaveLength(1);
  });

  it('应调用 POST /im/media/:id/transform 转换媒体', async () => {
    const transformData = {
      media_id: 'media-001',
      transformation: 'compress' as const,
      options: { quality: 0.8 },
      status: 'completed' as const,
    };
    apiClient.im.post.mockResolvedValue({
      data: { ...transformData, result_url: 'https://cdn.example.com/compressed.jpg' },
    });
    const result = await imRichMediaApi.transformMedia('media-001', transformData);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/media/media-001/transform', transformData);
    expect(result.data?.status).toBe('completed');
  });

  it('应调用 GET /im/media/:id/preview 获取媒体预览', async () => {
    apiClient.im.get.mockResolvedValue({
      data: {
        preview_url: 'https://cdn.example.com/preview.jpg',
        width: 800,
        height: 600,
        size: 102400,
      },
    });
    const result = await imRichMediaApi.getMediaPreview('media-001', 'medium');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media/media-001/preview', {
      params: { quality: 'medium' },
    });
    expect(result.data?.width).toBe(800);
  });

  it('应调用 POST /im/media/batch-delete 批量删除媒体', async () => {
    apiClient.im.post.mockResolvedValue({ data: { deleted_count: 3 } });
    const result = await imRichMediaApi.batchDeleteMedia(['media-001', 'media-002', 'media-003']);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/media/batch-delete', {
      media_ids: ['media-001', 'media-002', 'media-003'],
    });
    expect(result.data?.deleted_count).toBe(3);
  });

  it('应调用 GET /im/chats/:id/media 获取聊天媒体列表', async () => {
    apiClient.im.get.mockResolvedValue({ data: { items: [mockMedia], total: 1 } });
    const result = await imRichMediaApi.listChatMedia('chat-001', 'image');
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/chats/chat-001/media', {
      params: { media_type: 'image' },
    });
    expect(result.data?.items).toHaveLength(1);
  });

  it('应调用 GET /im/media/stats 获取媒体统计', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockMediaStats });
    const result = await imRichMediaApi.getMediaStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media/stats');
    expect(result.data?.total_media).toBe(500);
    expect(result.data?.today_uploads).toBe(12);
  });

  it('应调用 GET /im/media/storage 获取存储信息', async () => {
    apiClient.im.get.mockResolvedValue({
      data: {
        storage_used: 536870912,
        storage_limit: 1073741824,
        storage_percentage: 50,
        media_count: 500,
      },
    });
    const result = await imRichMediaApi.getStorageInfo();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media/storage');
    expect(result.data?.storage_used).toBe(536870912);
    expect(result.data?.storage_percentage).toBe(50);
  });

  it('应调用 POST /im/media/cleanup 清理过期媒体', async () => {
    apiClient.im.post.mockResolvedValue({ data: { cleaned_count: 10, freed_space: 104857600 } });
    const result = await imRichMediaApi.cleanupExpiredMedia();
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/media/cleanup');
    expect(result.data?.cleaned_count).toBe(10);
    expect(result.data?.freed_space).toBe(104857600);
  });
});

describe('IM Phase 23 - 聚合 API 快捷方法测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imApi.devices 子域应包含设备管理 API', () => {
    expect(imApi.devices).toBeDefined();
    expect(imApi.devices.registerDevice).toBeInstanceOf(Function);
    expect(imApi.devices.listMyDevices).toBeInstanceOf(Function);
    expect(imApi.devices.getDevice).toBeInstanceOf(Function);
  });

  it('imApi.translation 子域应包含翻译 API', () => {
    expect(imApi.translation).toBeDefined();
    expect(imApi.translation.translateMessage).toBeInstanceOf(Function);
    expect(imApi.translation.translateText).toBeInstanceOf(Function);
    expect(imApi.translation.getTranslation).toBeInstanceOf(Function);
  });

  it('imApi.media 子域应包含富媒体 API', () => {
    expect(imApi.media).toBeDefined();
    expect(imApi.media.requestUpload).toBeInstanceOf(Function);
    expect(imApi.media.listMedia).toBeInstanceOf(Function);
    expect(imApi.media.getMedia).toBeInstanceOf(Function);
  });

  it('顶层快捷方法 registerImDevice 应调用 imDeviceApi.registerDevice', async () => {
    const req: RegisterDeviceRequest = {
      device_name: 'Test Device',
      device_type: 'mobile',
      platform: 'ios',
      os_version: '17.0',
      app_version: '1.0',
    };
    apiClient.im.post.mockResolvedValue({ data: { id: 'device-001' } });
    const result = await imApi.registerImDevice(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/devices', req);
    expect(result.data?.id).toBe('device-001');
  });

  it('顶层快捷方法 translateMessage 应调用 imTranslationApi.translateMessage', async () => {
    const req: TranslateMessageRequest = {
      message_id: 'msg-001',
      chat_id: 'chat-001',
      target_language: 'zh',
    };
    apiClient.im.post.mockResolvedValue({ data: { id: 'trans-001' } });
    const result = await imApi.translateMessage(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/translations', req);
    expect(result.data?.id).toBe('trans-001');
  });

  it('顶层快捷方法 requestMediaUpload 应调用 imRichMediaApi.requestUpload', async () => {
    const req: UploadMediaRequest = {
      file_name: 'test.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      media_type: 'image',
    };
    apiClient.im.post.mockResolvedValue({ data: { media_id: 'media-001' } });
    const result = await imApi.requestMediaUpload(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/media/upload-request', req);
    expect(result.data?.media_id).toBe('media-001');
  });

  it('顶层快捷方法 listRichMedia 应调用 imRichMediaApi.listMedia', async () => {
    apiClient.im.get.mockResolvedValue({ data: { items: [], total: 0 } });
    const result = await imApi.listRichMedia();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media', { params: undefined });
    expect(result.data?.items).toEqual([]);
  });

  it('顶层快捷方法 detectTranslationLanguage 应调用 imTranslationApi.detectLanguage', async () => {
    apiClient.im.post.mockResolvedValue({ data: { language: 'en', confidence: 0.99 } });
    const result = await imApi.detectTranslationLanguage('Hello');
    expect(apiClient.im.post).toHaveBeenCalledWith('/im/translations/detect', { text: 'Hello' });
    expect(result.data?.language).toBe('en');
  });

  it('顶层快捷方法 getMediaStorageInfo 应调用 imRichMediaApi.getStorageInfo', async () => {
    apiClient.im.get.mockResolvedValue({
      data: { storage_used: 100, storage_limit: 200, storage_percentage: 50, media_count: 10 },
    });
    const result = await imApi.getMediaStorageInfo();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media/storage');
    expect(result.data?.storage_percentage).toBe(50);
  });

  it('顶层快捷方法 getDeviceStats 应调用 imDeviceApi.getDeviceStats', async () => {
    apiClient.im.get.mockResolvedValue({
      data: { total_devices: 3, online_devices: 2, offline_devices: 1 },
    });
    const result = await imApi.getDeviceStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/devices/stats');
    expect(result.data?.total_devices).toBe(3);
  });

  it('顶层快捷方法 getTranslationStats 应调用 imTranslationApi.getTranslationStats', async () => {
    apiClient.im.get.mockResolvedValue({
      data: { total_translations: 100, today_translations: 10 },
    });
    const result = await imApi.getTranslationStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/translations/stats');
    expect(result.data?.total_translations).toBe(100);
  });

  it('顶层快捷方法 getMediaStats 应调用 imRichMediaApi.getMediaStats', async () => {
    apiClient.im.get.mockResolvedValue({ data: { total_media: 50, today_uploads: 5 } });
    const result = await imApi.getMediaStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/im/media/stats');
    expect(result.data?.total_media).toBe(50);
  });
});
