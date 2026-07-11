import type {
  FormSchema,
  CreateFormRequest,
  UpdateFormRequest,
  ListParams,
  PaginatedResponse,
} from './types';

const generateId = () => Math.random().toString(36).substring(2, 11);

let mockForms: FormSchema[] = [
  {
    id: 'form-1',
    name: '员工入职申请表',
    description: '用于新员工入职申请的表单',
    version: '1.0.0',
    status: 'published',
    components: [
      {
        id: 'comp-1',
        type: 'input',
        label: '姓名',
        name: 'name',
        placeholder: '请输入姓名',
        required: true,
      },
      {
        id: 'comp-2',
        type: 'input',
        label: '邮箱',
        name: 'email',
        placeholder: '请输入邮箱',
        required: true,
      },
      {
        id: 'comp-3',
        type: 'select',
        label: '部门',
        name: 'department',
        placeholder: '请选择部门',
        required: true,
        props: {
          options: [
            { label: '技术部', value: 'tech' },
            { label: '产品部', value: 'product' },
            { label: '市场部', value: 'marketing' },
            { label: '人力资源部', value: 'hr' },
          ],
        },
      },
      {
        id: 'comp-4',
        type: 'date-picker',
        label: '入职日期',
        name: 'joinDate',
        required: true,
      },
    ],
    layout: 'vertical',
    labelWidth: 100,
    size: 'medium',
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: 'form-2',
    name: '请假申请表',
    description: '员工请假申请用表',
    version: '1.2.0',
    status: 'draft',
    components: [
      {
        id: 'comp-5',
        type: 'select',
        label: '请假类型',
        name: 'leaveType',
        required: true,
        props: {
          options: [
            { label: '年假', value: 'annual' },
            { label: '事假', value: 'personal' },
            { label: '病假', value: 'sick' },
            { label: '婚假', value: 'marriage' },
          ],
        },
      },
      {
        id: 'comp-6',
        type: 'date-picker',
        label: '开始日期',
        name: 'startDate',
        required: true,
      },
      {
        id: 'comp-7',
        type: 'date-picker',
        label: '结束日期',
        name: 'endDate',
        required: true,
      },
      {
        id: 'comp-8',
        type: 'textarea',
        label: '请假原因',
        name: 'reason',
        placeholder: '请详细说明请假原因',
        required: true,
      },
    ],
    layout: 'vertical',
    labelWidth: 100,
    size: 'medium',
    createdBy: 'admin',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-02-15T11:20:00Z',
  },
  {
    id: 'form-3',
    name: '费用报销单',
    description: '日常费用报销申请',
    version: '2.0.0',
    status: 'published',
    components: [],
    layout: 'vertical',
    labelWidth: 120,
    size: 'medium',
    createdBy: 'finance',
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2024-03-10T16:45:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const formApi = {
  async list(params?: ListParams): Promise<PaginatedResponse<FormSchema>> {
    await delay(300);
    let filtered = [...mockForms];

    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(keyword) ||
          (f.description || '').toLowerCase().includes(keyword)
      );
    }

    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter((f) => f.status === params.status);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const totalPages = Math.ceil(filtered.length / pageSize);
    return {
      items: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      page_size: pageSize,
      totalPages,
      total_pages: totalPages,
    };
  },

  async get(id: string): Promise<FormSchema | null> {
    await delay(200);
    const form = mockForms.find((f) => f.id === id);
    return form || null;
  },

  async create(data: CreateFormRequest): Promise<FormSchema> {
    await delay(300);
    const now = new Date().toISOString();
    const newForm: FormSchema = {
      id: generateId(),
      name: data.name,
      description: data.description,
      version: '1.0.0',
      components: data.components || [],
      layout: 'vertical',
      labelWidth: 100,
      size: 'medium',
      status: 'draft',
      createdBy: 'current-user',
      createdAt: now,
      updatedAt: now,
    };
    mockForms.unshift(newForm);
    return newForm;
  },

  async update(id: string, data: UpdateFormRequest): Promise<FormSchema> {
    await delay(300);
    const index = mockForms.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('Form not found');

    mockForms[index] = {
      ...mockForms[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return mockForms[index];
  },

  async delete(id: string): Promise<void> {
    await delay(200);
    mockForms = mockForms.filter((f) => f.id !== id);
  },

  async publish(id: string): Promise<FormSchema> {
    await delay(300);
    const index = mockForms.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('Form not found');

    mockForms[index] = {
      ...mockForms[index],
      status: 'published',
      updatedAt: new Date().toISOString(),
    };
    return mockForms[index];
  },

  async preview(id: string): Promise<FormSchema> {
    await delay(200);
    const form = mockForms.find((f) => f.id === id);
    if (!form) throw new Error('Form not found');
    return form;
  },

  async copy(id: string, name?: string): Promise<FormSchema> {
    await delay(300);
    const form = mockForms.find((f) => f.id === id);
    if (!form) throw new Error('Form not found');

    const now = new Date().toISOString();
    const newForm: FormSchema = {
      ...form,
      id: generateId(),
      name: name || `${form.name} - 副本`,
      version: '1.0.0',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    mockForms.unshift(newForm);
    return newForm;
  },
};
