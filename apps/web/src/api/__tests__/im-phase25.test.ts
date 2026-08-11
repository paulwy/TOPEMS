import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import imApi from '../im';
import {
  imDocMessageApi,
  type DocumentPreview,
  type DocumentPage,
  type DocumentSearchResult,
  type DocumentOutline,
  type DocumentAnnotation,
  type DocumentVersion,
  type DocumentPermissionSet,
  type DocumentMetadata,
  type DocumentReadReceipt,
  type DocumentActivity,
  type WatermarkConfig,
  type CreateAnnotationRequest,
  type ExportDocumentRequest,
  type SignDocumentRequest,
  type ShareDocumentLinkRequest,
  type UpdateDocumentPermissionsRequest,
  type DocumentStats,
} from '../im/docMessage';

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

describe('IM Document Message API Tests', () => {
  const mockPreview: DocumentPreview = {
    id: 'prev-001',
    document_id: 'doc-001',
    document_type: 'pdf',
    page_count: 12,
    current_page: 1,
    preview_url: 'https://cdn.example.com/preview/doc-001',
    preview_html: '<html>...</html>',
    file_size: 2048000,
    file_name: 'report.pdf',
    mime_type: 'application/pdf',
    thumbnail_url: 'https://cdn.example.com/thumbs/doc-001.png',
    metadata: {
      id: 'doc-001',
      file_name: 'report.pdf',
      file_size: 2048000,
      document_type: 'pdf',
      page_count: 12,
      word_count: 3500,
      author: '张三',
      tags: ['报告', 'Q4'],
      description: 'Q4 季度报告',
    },
    expires_at: '2026-12-31T23:59:59Z',
  };

  const mockPage: DocumentPage = {
    page_number: 1,
    content: 'Page 1 content...',
    width: 612,
    height: 792,
    has_text: true,
  };

  const mockSearchResult: DocumentSearchResult = {
    query: '季度报告',
    total_matches: 5,
    matches: [
      { page_number: 1, snippet: 'Q4 季度报告摘要...', offset: 10, length: 4 },
      { page_number: 3, snippet: '本季度报告显示...', offset: 5, length: 4 },
    ],
  };

  const mockOutline: DocumentOutline[] = [
    {
      level: 1,
      title: '第一章 概述',
      page_number: 1,
      children: [
        {
          level: 2,
          title: '1.1 背景',
          page_number: 2,
          children: [{ level: 3, title: '1.1.1 市场环境', page_number: 3 }],
        },
      ],
    },
  ];

  const mockAnnotation: DocumentAnnotation = {
    id: 'ann-001',
    document_id: 'doc-001',
    page_number: 3,
    annotation_type: 'highlight',
    content: '重要数据',
    position: { x: 100, y: 200, width: 300, height: 20 },
    color: '#FFD700',
    author_id: 'user-001',
    author_name: '张三',
    resolved: false,
    created_at: '2026-08-11T10:00:00Z',
    updated_at: '2026-08-11T10:00:00Z',
  };

  const mockVersion: DocumentVersion = {
    id: 'ver-001',
    document_id: 'doc-001',
    version_number: 2,
    file_size: 2097152,
    change_summary: '更新了第三章数据',
    created_by: 'user-001',
    created_by_name: '张三',
    created_at: '2026-08-11T10:00:00Z',
    is_current: true,
  };

  const mockPermissions: DocumentPermissionSet = {
    can_view: true,
    can_comment: true,
    can_edit: false,
    can_manage: false,
    can_download: true,
    can_print: true,
    can_export: false,
    can_share: false,
  };

  const mockMetadata: DocumentMetadata = {
    id: 'doc-001',
    file_name: 'report.pdf',
    file_size: 2048000,
    document_type: 'pdf',
    page_count: 12,
    word_count: 3500,
    author: '张三',
    created_at: '2026-08-01T00:00:00Z',
    modified_at: '2026-08-10T00:00:00Z',
    created_by_chat_id: 'chat-001',
    created_by_message_id: 'msg-001',
    tags: ['报告', 'Q4'],
    description: 'Q4 季度报告',
  };

  const mockReadReceipt: DocumentReadReceipt = {
    user_id: 'user-001',
    user_name: '张三',
    first_read_at: '2026-08-11T10:00:00Z',
    last_read_at: '2026-08-11T14:30:00Z',
    read_count: 3,
    last_page_read: 8,
  };

  const mockActivity: DocumentActivity = {
    id: 'act-001',
    document_id: 'doc-001',
    activity_type: 'view',
    actor_id: 'user-001',
    actor_name: '张三',
    details: { page: 5 },
    created_at: '2026-08-11T10:00:00Z',
  };

  const mockWatermark: WatermarkConfig = {
    enabled: true,
    text: '机密文件',
    position: 'diagonal',
    opacity: 0.3,
    color: '#FF0000',
    font_size: 24,
  };

  const mockStats: DocumentStats = {
    document_id: 'doc-001',
    view_count: 15,
    unique_viewers: 10,
    download_count: 3,
    share_count: 2,
    comment_count: 5,
    export_count: 1,
    last_viewed_at: '2026-08-11T14:30:00Z',
    last_activity_at: '2026-08-11T14:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.im.get.mockReset();
    apiClient.im.post.mockReset();
    apiClient.im.put.mockReset();
    apiClient.im.delete.mockReset();
  });

  describe('文档预览引擎', () => {
    it('应调用 GET /im/documents/:id/preview 获取文档预览', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockPreview });
      const result = await imDocMessageApi.getDocumentPreview('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/preview', {
        params: undefined,
      });
      expect(result.data?.file_name).toBe('report.pdf');
      expect(result.data?.page_count).toBe(12);
    });

    it('应调用 GET /im/documents/:id/preview 带查询参数', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockPreview });
      const result = await imDocMessageApi.getDocumentPreview('doc-001', { page: 2, width: 800 });
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/preview', {
        params: { page: 2, width: 800 },
      });
      expect(result.data?.current_page).toBe(1);
    });

    it('应调用 GET /im/documents/:id/pages 获取文档分页', async () => {
      apiClient.im.get.mockResolvedValue({ data: [mockPage] });
      const result = await imDocMessageApi.getDocumentPages('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/pages', {
        params: undefined,
      });
      expect(result.data).toHaveLength(1);
    });

    it('应调用 GET /im/documents/:id/pages/:page/render 渲染指定页', async () => {
      apiClient.im.get.mockResolvedValue({
        data: {
          rendered_url: 'https://cdn.example.com/rendered.png',
          width: 612,
          height: 792,
          file_size: 102400,
        },
      });
      const result = await imDocMessageApi.renderDocumentPage('doc-001', 3);
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/pages/3/render', {
        params: undefined,
      });
      expect(result.data?.rendered_url).toContain('rendered');
    });

    it('应调用 GET /im/documents/:id/search 在文档内搜索', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockSearchResult });
      const result = await imDocMessageApi.searchInDocument('doc-001', '季度报告');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/search', {
        params: { query: '季度报告' },
      });
      expect(result.data?.total_matches).toBe(5);
    });

    it('应调用 GET /im/documents/:id/outline 获取文档目录', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockOutline });
      const result = await imDocMessageApi.getDocumentOutline('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/outline');
      expect(result.data).toHaveLength(1);
    });

    it('应调用 GET /im/documents/:id/thumbnails 获取缩略图', async () => {
      apiClient.im.get.mockResolvedValue({
        data: [{ page_number: 1, thumbnail_url: 'https://cdn.example.com/thumbs/1.png' }],
      });
      const result = await imDocMessageApi.getDocumentThumbnails('doc-001', { size: 'small' });
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/thumbnails', {
        params: { size: 'small' },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('文档批注与协作', () => {
    it('应调用 GET /im/documents/:id/annotations 列出批注', async () => {
      apiClient.im.get.mockResolvedValue({
        data: { items: [mockAnnotation], total: 1, page: 1, page_size: 20 },
      });
      const result = await imDocMessageApi.listDocumentAnnotations('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/annotations', {
        params: undefined,
      });
      expect(result.data?.items).toHaveLength(1);
    });

    it('应调用 POST /im/documents/:id/annotations 添加批注', async () => {
      const req: CreateAnnotationRequest = {
        page_number: 3,
        annotation_type: 'highlight',
        content: '重要数据',
        position: { x: 100, y: 200, width: 300, height: 20 },
        color: '#FFD700',
      };
      apiClient.im.post.mockResolvedValue({ data: mockAnnotation });
      const result = await imDocMessageApi.addDocumentAnnotation('doc-001', req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/documents/doc-001/annotations', req);
      expect(result.data?.annotation_type).toBe('highlight');
    });

    it('应调用 POST /im/documents/:id/annotations/:id/resolve 解决批注', async () => {
      apiClient.im.post.mockResolvedValue({ data: { ...mockAnnotation, resolved: true } });
      const result = await imDocMessageApi.resolveDocumentAnnotation('doc-001', 'ann-001');
      expect(apiClient.im.post).toHaveBeenCalledWith(
        '/im/documents/doc-001/annotations/ann-001/resolve'
      );
      expect(result.data?.resolved).toBe(true);
    });

    it('应调用 DELETE /im/documents/:id/annotations/:id 删除批注', async () => {
      apiClient.im.delete.mockResolvedValue({ data: null });
      const result = await imDocMessageApi.deleteDocumentAnnotation('doc-001', 'ann-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith('/im/documents/doc-001/annotations/ann-001');
      expect(result.data).toBeNull();
    });

    it('应调用 GET /im/documents/:id/activity 获取活动日志', async () => {
      apiClient.im.get.mockResolvedValue({
        data: { items: [mockActivity], total: 1, page: 1, page_size: 20 },
      });
      const result = await imDocMessageApi.getDocumentActivity('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/activity', {
        params: undefined,
      });
      expect(result.data?.items).toHaveLength(1);
    });
  });

  describe('文档操作', () => {
    it('应调用 POST /im/documents/:id/export 导出文档', async () => {
      const req: ExportDocumentRequest = { format: 'pdf', include_annotations: true };
      apiClient.im.post.mockResolvedValue({
        data: {
          export_url: 'https://cdn.example.com/export.pdf',
          file_name: 'report.pdf',
          file_size: 2048000,
        },
      });
      const result = await imDocMessageApi.exportDocument('doc-001', req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/documents/doc-001/export', req);
      expect(result.data?.export_url).toContain('export');
    });

    it('应调用 GET /im/documents/:id/print 生成打印版本', async () => {
      apiClient.im.get.mockResolvedValue({ data: { print_url: 'https://cdn.example.com/print' } });
      const result = await imDocMessageApi.printDocument('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/print', {
        params: undefined,
      });
      expect(result.data?.print_url).toContain('print');
    });

    it('应调用 POST /im/documents/:id/sign 电子签名', async () => {
      const req: SignDocumentRequest = {
        signature_type: 'typed',
        signature_data: '张三',
        signer_name: '张三',
        signer_id: 'user-001',
      };
      const mockSignResult: DocumentAnnotation = {
        ...mockAnnotation,
        annotation_type: 'signature',
        content: '张三',
      };
      apiClient.im.post.mockResolvedValue({ data: mockSignResult });
      const result = await imDocMessageApi.signDocument('doc-001', req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/documents/doc-001/sign', req);
      expect(result.data?.annotation_type).toBe('signature');
    });

    it('应调用 POST /im/documents/:id/share 分享文档链接', async () => {
      const req: ShareDocumentLinkRequest = {
        permission: 'view',
        expires_at: '2026-12-31T23:59:59Z',
        password: 'secure123',
        allow_download: false,
      };
      apiClient.im.post.mockResolvedValue({
        data: { share_url: 'https://example.com/share/abc123', password: 'secure123' },
      });
      const result = await imDocMessageApi.shareDocumentLink('doc-001', req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/documents/doc-001/share', req);
      expect(result.data?.share_url).toContain('share');
    });

    it('应调用 GET /im/documents/:id/versions/:vid 获取指定版本', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockVersion });
      const result = await imDocMessageApi.getDocumentVersion('doc-001', 'ver-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/versions/ver-001');
      expect(result.data?.version_number).toBe(2);
    });
  });

  describe('文档安全与权限', () => {
    it('应调用 GET /im/documents/:id/permissions 获取权限', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockPermissions });
      const result = await imDocMessageApi.getDocumentPermissions('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/permissions');
      expect(result.data?.can_view).toBe(true);
      expect(result.data?.can_edit).toBe(false);
    });

    it('应调用 PUT /im/documents/:id/permissions 更新权限', async () => {
      const req: UpdateDocumentPermissionsRequest = {
        permission: 'comment',
        allow_download: true,
        require_watermark: true,
        watermark_text: '机密',
      };
      apiClient.im.put.mockResolvedValue({ data: { ...mockPermissions, can_comment: true } });
      const result = await imDocMessageApi.updateDocumentPermissions('doc-001', req);
      expect(apiClient.im.put).toHaveBeenCalledWith('/im/documents/doc-001/permissions', req);
      expect(result.data?.can_comment).toBe(true);
    });

    it('应调用 GET /im/documents/:id/watermark 获取水印', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockWatermark });
      const result = await imDocMessageApi.getDocumentWatermark('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/watermark');
      expect(result.data?.text).toBe('机密文件');
    });

    it('应调用 PUT /im/documents/:id/watermark 设置水印', async () => {
      apiClient.im.put.mockResolvedValue({ data: mockWatermark });
      const result = await imDocMessageApi.setDocumentWatermark('doc-001', mockWatermark);
      expect(apiClient.im.put).toHaveBeenCalledWith(
        '/im/documents/doc-001/watermark',
        mockWatermark
      );
      expect(result.data?.enabled).toBe(true);
    });

    it('应调用 POST /im/documents/:id/check-sensitivity 检测敏感信息', async () => {
      apiClient.im.post.mockResolvedValue({
        data: {
          has_sensitive_data: true,
          sensitive_types: ['身份证号', '银行卡号'],
          details: [{ type: '身份证号', page: 2, snippet: '110101********1234' }],
        },
      });
      const result = await imDocMessageApi.checkDocumentSensitivity('doc-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/documents/doc-001/check-sensitivity');
      expect(result.data?.has_sensitive_data).toBe(true);
      expect(result.data?.sensitive_types).toHaveLength(2);
    });
  });

  describe('文档元数据与统计', () => {
    it('应调用 GET /im/documents/:id/metadata 获取元数据', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockMetadata });
      const result = await imDocMessageApi.getDocumentMetadata('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/metadata');
      expect(result.data?.file_name).toBe('report.pdf');
      expect(result.data?.document_type).toBe('pdf');
    });

    it('应调用 PUT /im/documents/:id/metadata 更新元数据', async () => {
      const updates = { tags: ['报告', 'Q4', '已审阅'], description: 'Q4 季度报告（已审阅）' };
      apiClient.im.put.mockResolvedValue({ data: { ...mockMetadata, ...updates } });
      const result = await imDocMessageApi.updateDocumentMetadata('doc-001', updates);
      expect(apiClient.im.put).toHaveBeenCalledWith('/im/documents/doc-001/metadata', updates);
      expect(result.data?.tags).toContain('已审阅');
    });

    it('应调用 GET /im/documents/:id/read-receipts 获取已读记录', async () => {
      apiClient.im.get.mockResolvedValue({
        data: { items: [mockReadReceipt], total: 1, page: 1, page_size: 20 },
      });
      const result = await imDocMessageApi.getDocumentReadReceipts('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/read-receipts', {
        params: undefined,
      });
      expect(result.data?.items).toHaveLength(1);
    });

    it('应调用 GET /im/documents/:id/stats 获取文档统计', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockStats });
      const result = await imDocMessageApi.getDocumentStats('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/stats');
      expect(result.data?.view_count).toBe(15);
      expect(result.data?.unique_viewers).toBe(10);
    });

    it('应调用 GET /im/documents/:id/versions 列出历史版本', async () => {
      apiClient.im.get.mockResolvedValue({
        data: { items: [mockVersion], total: 1, page: 1, page_size: 20 },
      });
      const result = await imDocMessageApi.listDocumentVersions('doc-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/documents/doc-001/versions', {
        params: undefined,
      });
      expect(result.data?.items).toHaveLength(1);
    });
  });

  describe('imApi 聚合集成', () => {
    it('docMessage 子域应存在于 imApi 中', () => {
      expect(imApi.docMessage).toBeDefined();
      expect(imApi.docMessage).toBe(imDocMessageApi);
    });

    it('顶层快捷方法应正确映射', () => {
      expect(imApi.getDocumentPreview).toBe(imDocMessageApi.getDocumentPreview);
      expect(imApi.getDocumentPages).toBe(imDocMessageApi.getDocumentPages);
      expect(imApi.searchInDocument).toBe(imDocMessageApi.searchInDocument);
      expect(imApi.addDocumentAnnotation).toBe(imDocMessageApi.addDocumentAnnotation);
      expect(imApi.exportDocument).toBe(imDocMessageApi.exportDocument);
      expect(imApi.signDocument).toBe(imDocMessageApi.signDocument);
      expect(imApi.getDocumentPermissions).toBe(imDocMessageApi.getDocumentPermissions);
      expect(imApi.getDocumentMetadata).toBe(imDocMessageApi.getDocumentMetadata);
      expect(imApi.getDocumentStats).toBe(imDocMessageApi.getDocumentStats);
      expect(imApi.listDocumentVersions).toBe(imDocMessageApi.listDocumentVersions);
    });
  });
});
