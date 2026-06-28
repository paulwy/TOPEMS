import type {
  PageSchema,
  CreatePageRequest,
  UpdatePageRequest,
  ListParams,
  PaginatedResponse,
} from './types';

const generateId = () => Math.random().toString(36).substring(2, 11);

let mockPages: PageSchema[] = [
  {
    id: 'page-1',
    name: '数据仪表盘',
    description: '核心业务数据展示仪表盘',
    version: '1.0.0',
    status: 'published',
    components: [
      {
        id: 'page-comp-1',
        type: 'card',
        label: '销售概览',
        props: {
          title: '销售概览',
        },
        children: [
          {
            id: 'page-comp-2',
            type: 'chart',
            props: {
              chartType: 'line',
              height: 300,
            },
          },
        ],
      },
    ],
    layout: {
      type: 'grid',
      columns: 2,
      gap: 16,
    },
    createdBy: 'admin',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-25T14:30:00Z',
  },
  {
    id: 'page-2',
    name: '客户管理页面',
    description: '客户信息管理列表页',
    version: '1.1.0',
    status: 'draft',
    components: [
      {
        id: 'page-comp-3',
        type: 'table',
        props: {
          columns: [
            { key: 'name', title: '客户名称' },
            { key: 'contact', title: '联系人' },
            { key: 'phone', title: '电话' },
            { key: 'status', title: '状态' },
          ],
        },
      },
    ],
    layout: {
      type: 'flex',
      gap: 16,
    },
    createdBy: 'admin',
    createdAt: '2024-02-05T09:00:00Z',
    updatedAt: '2024-02-18T11:20:00Z',
  },
  {
    id: 'page-3',
    name: '产品详情页',
    description: '产品信息详情展示页',
    version: '2.0.0',
    status: 'published',
    components: [],
    layout: {
      type: 'grid',
      columns: 1,
      gap: 16,
    },
    createdBy: 'product',
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2024-03-12T16:45:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const pageApi = {
  async list(params?: ListParams): Promise<PaginatedResponse<PageSchema>> {
    await delay(300);
    let filtered = [...mockPages];

    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          (p.description || '').toLowerCase().includes(keyword)
      );
    }

    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter((p) => p.status === params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
    };
  },

  async get(id: string): Promise<PageSchema | null> {
    await delay(200);
    const page = mockPages.find((p) => p.id === id);
    return page || null;
  },

  async create(data: CreatePageRequest): Promise<PageSchema> {
    await delay(300);
    const now = new Date().toISOString();
    const newPage: PageSchema = {
      id: generateId(),
      name: data.name,
      description: data.description,
      version: '1.0.0',
      components: data.components || [],
      layout: {
        type: 'flex',
        gap: 16,
      },
      status: 'draft',
      createdBy: 'current-user',
      createdAt: now,
      updatedAt: now,
    };
    mockPages.unshift(newPage);
    return newPage;
  },

  async update(id: string, data: UpdatePageRequest): Promise<PageSchema> {
    await delay(300);
    const index = mockPages.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Page not found');

    mockPages[index] = {
      ...mockPages[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return mockPages[index];
  },

  async delete(id: string): Promise<void> {
    await delay(200);
    mockPages = mockPages.filter((p) => p.id !== id);
  },

  async publish(id: string): Promise<PageSchema> {
    await delay(300);
    const index = mockPages.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Page not found');

    mockPages[index] = {
      ...mockPages[index],
      status: 'published',
      updatedAt: new Date().toISOString(),
    };
    return mockPages[index];
  },

  async preview(id: string): Promise<PageSchema> {
    await delay(200);
    const page = mockPages.find((p) => p.id === id);
    if (!page) throw new Error('Page not found');
    return page;
  },

  async copy(id: string, name?: string): Promise<PageSchema> {
    await delay(300);
    const page = mockPages.find((p) => p.id === id);
    if (!page) throw new Error('Page not found');

    const now = new Date().toISOString();
    const newPage: PageSchema = {
      ...page,
      id: generateId(),
      name: name || `${page.name} - 副本`,
      version: '1.0.0',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    mockPages.unshift(newPage);
    return newPage;
  },
};
