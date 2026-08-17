import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addressbookApi, announcementApi, assetApi } from '../erp/core';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    erp: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('V138 ERP - addressbookApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list contacts', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { contacts: [], total: 0 } });
    await addressbookApi.list({ page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith('/addressbook?page=1&pagesize=20');
  });

  it('should get contact by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'C-001' } });
    await addressbookApi.get('C-001');
    expect(mockClient.get).toHaveBeenCalledWith('/addressbook/C-001');
  });

  it('should search contacts by keyword', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { contacts: [], total: 0 } });
    await addressbookApi.search('张伟', 1, 10);
    expect(mockClient.get).toHaveBeenCalledWith(
      '/addressbook/search?keyword=%E5%BC%A0%E4%BC%9F&page=1&pagesize=10'
    );
  });

  it('should get department tree', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await addressbookApi.getDepartmentTree();
    expect(mockClient.get).toHaveBeenCalledWith('/addressbook/departments/tree');
  });

  it('should export contacts', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: 'csv' });
    await addressbookApi.export('csv');
    expect(mockClient.get).toHaveBeenCalledWith('/addressbook/export?format=csv');
  });
});

describe('V138 ERP - announcementApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list announcements', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await announcementApi.list({ page: 1, pageSize: 20, status: 'published' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/announcements?page=1&pagesize=20&status=published'
    );
  });

  it('should create announcement', async () => {
    const data = { title: '公告', content: '内容' };
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'A-001' } });
    await announcementApi.create(data);
    expect(mockClient.post).toHaveBeenCalledWith('/announcements', data);
  });

  it('should get announcement by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'A-001' } });
    await announcementApi.get('A-001');
    expect(mockClient.get).toHaveBeenCalledWith('/announcements/A-001');
  });

  it('should update announcement', async () => {
    const data = { title: '新标题' };
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'A-001' } });
    await announcementApi.update('A-001', data);
    expect(mockClient.put).toHaveBeenCalledWith('/announcements/A-001', data);
  });

  it('should delete announcement', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: 'ok' });
    await announcementApi.remove('A-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/announcements/A-001');
  });

  it('should publish announcement', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'A-001' } });
    await announcementApi.publish('A-001');
    expect(mockClient.post).toHaveBeenCalledWith('/announcements/A-001/publish', {});
  });

  it('should unpublish announcement', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'A-001' } });
    await announcementApi.unpublish('A-001');
    expect(mockClient.post).toHaveBeenCalledWith('/announcements/A-001/unpublish', {});
  });
});

describe('V138 ERP - assetApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list assets', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await assetApi.list({ page: 1, pageSize: 20, status: 'in_use', category: 'equipment' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/assets?page=1&pagesize=20&status=in_use&category=equipment'
    );
  });

  it('should get asset by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'AST-001' } });
    await assetApi.get('AST-001');
    expect(mockClient.get).toHaveBeenCalledWith('/assets/AST-001');
  });

  it('should create asset', async () => {
    const data = { asset_code: 'AST-001', asset_name: '设备A' };
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'AST-001' } });
    await assetApi.create(data);
    expect(mockClient.post).toHaveBeenCalledWith('/assets', data);
  });

  it('should update asset', async () => {
    const data = { asset_name: '设备A-升级版' };
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'AST-001' } });
    await assetApi.update('AST-001', data);
    expect(mockClient.put).toHaveBeenCalledWith('/assets/AST-001', data);
  });

  it('should delete asset', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: 'ok' });
    await assetApi.remove('AST-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/assets/AST-001');
  });
});
