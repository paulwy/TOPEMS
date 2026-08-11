import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import imApi from '../im';
import {
  imIntegrationApi,
  type IntegrationRecord,
  type CreateTicketFromMessageRequest,
  type CreateTaskFromMessageRequest,
  type IntegrationStats,
  type WebhookTriggerType,
  type IntegrationTarget,
  type IntegrationStatus,
} from '../im/integration';
import {
  imWhiteboardApi,
  type Whiteboard,
  type CreateWhiteboardRequest,
  type WhiteboardSnapshot,
  type WhiteboardStats,
  type WhiteboardToolType,
  type WhiteboardPermission,
  type ExportFormat as WhiteboardExportFormat,
} from '../im/whiteboard';
import {
  imTaskSyncApi,
  type SyncedTask,
  type PersonalTodo,
  type TaskReminder,
  type KanbanBoard,
  type TaskSyncStats,
  type TaskPriority,
  type TaskStatus,
  type ReminderType,
  type TodoStatus,
} from '../im/taskSync';

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
    qms: createDomainMock(),
    lims: createDomainMock(),
    ehs: createDomainMock(),
    pdm: createDomainMock(),
    pm: createDomainMock(),
    bi: createDomainMock(),
    erp: createDomainMock(),
    rd: createDomainMock(),
    gis: createDomainMock(),
    srm: createDomainMock(),
    search: createDomainMock(),
    ticket: createDomainMock(),
    tenant: createDomainMock(),
    addressbook: createDomainMock(),
    crmFinance: createDomainMock(),
    financialReport: createDomainMock(),
    voucherTemplate: createDomainMock(),
    template: createDomainMock(),
    integration: createDomainMock(),
    automation: createDomainMock(),
    externalErp: createDomainMock(),
    lowcode: createDomainMock(),
    consolidation: createDomainMock(),
    ai: createDomainMock(),
    doc: createDomainMock(),
    file: createDomainMock(),
    mail: createDomainMock(),
    email: createDomainMock(),
    notification: createDomainMock(),
    workflow: createDomainMock(),
    system: createDomainMock(),
    mobile: createDomainMock(),
    monitor: createDomainMock(),
    report: createDomainMock(),
    migration: createDomainMock(),
    finance: createDomainMock(),
    help: createDomainMock(),
    feedback: createDomainMock(),
    iam: createDomainMock(),
    admin: createDomainMock(),
  };
  return {
    apiClient: mockClient,
    default: mockClient,
  };
});

// ==================== Mock 响应数据 ====================

const mockIntegrationRecord: IntegrationRecord = {
  id: 'int-001',
  source_message_id: 'msg-001',
  source_chat_id: 'chat-001',
  source_sender_id: 'user-001',
  source_sender_name: '张三',
  target_type: 'ticket',
  target_id: 'tick-001',
  target_url: '/tickets/tick-001',
  status: 'success',
  action: 'create_ticket',
  payload: { message_id: 'msg-001' },
  result: { ticket_id: 'tick-001' },
  created_at: '2026-08-13T10:00:00Z',
  completed_at: '2026-08-13T10:00:01Z',
};

const mockIntegrationStats: IntegrationStats = {
  total_integrations_today: 47,
  total_integrations_week: 312,
  by_target: { ticket: 12, task: 20, calendar: 8, approval: 5, webhook: 2 },
  by_status: { pending: 1, success: 45, failed: 1, cancelled: 0 },
  success_rate: 0.98,
  avg_processing_time_ms: 230,
  top_integrators: [{ user_id: 'user-001', user_name: '张三', count: 15 }],
};

const mockWhiteboard: Whiteboard = {
  id: 'wb-001',
  conference_id: 'conf-001',
  conference_title: '产品评审',
  title: 'Q4 架构讨论',
  description: '第四季度技术架构讨论',
  status: 'active',
  created_by: 'user-001',
  created_by_name: '张三',
  created_by_avatar: '/avatars/user-001.png',
  width: 1920,
  height: 1080,
  current_snapshot_id: 'snap-001',
  snapshot_count: 3,
  collaborator_count: 5,
  view_count: 12,
  last_edited_at: '2026-08-13T11:00:00Z',
  created_at: '2026-08-13T10:00:00Z',
  updated_at: '2026-08-13T11:00:00Z',
};

const mockWhiteboardSnapshot: WhiteboardSnapshot = {
  id: 'snap-001',
  whiteboard_id: 'wb-001',
  whiteboard_title: 'Q4 架构方案',
  name: '草稿 v1',
  description: '第一轮讨论后的方案',
  created_by: 'user-001',
  created_by_name: '张三',
  tool_used_count: 128,
  object_count: 45,
  file_size_bytes: 204800,
  thumbnail_url: '/thumbnails/snap-001.png',
  created_at: '2026-08-13T10:30:00Z',
};

const mockWhiteboardStats: WhiteboardStats = {
  total_whiteboards_today: 8,
  total_whiteboards_active: 15,
  total_snapshots_today: 23,
  total_collaborations_today: 42,
  by_tool_type: {
    pen: 45,
    highlight: 20,
    rectangle: 15,
    ellipse: 10,
    line: 12,
    arrow: 8,
    text: 25,
    sticky_note: 18,
    eraser: 5,
    shapes: 15,
  },
  avg_session_duration_minutes: 35,
};

const mockSyncedTask: SyncedTask = {
  id: 'task-001',
  source_message_id: 'msg-001',
  source_chat_id: 'chat-001',
  source_sender_id: 'user-001',
  title: '完成周报',
  description: '整理 Q3 数据并撰写报告',
  status: 'in_progress',
  priority: 'high',
  assignee_id: 'user-002',
  assignee_name: '李四',
  project_id: 'proj-001',
  project_name: 'Q3 总结',
  due_date: '2026-08-20T18:00:00Z',
  completed_at: undefined,
  progress_percentage: 60,
  tags: ['report', 'quarterly'],
  subtasks: [
    { id: 'sub-001', title: '收集数据', completed: true },
    { id: 'sub-002', title: '撰写初稿', completed: false },
  ],
  comments_count: 5,
  attachments_count: 2,
  created_at: '2026-08-13T10:00:00Z',
  updated_at: '2026-08-13T11:00:00Z',
};

const mockPersonalTodo: PersonalTodo = {
  id: 'todo-001',
  title: '回复客户邮件',
  description: '回复客户关于合同的咨询',
  status: 'pending',
  priority: 'medium',
  due_date: '2026-08-14T18:00:00Z',
  message_id: 'msg-005',
  message_chat_id: 'chat-003',
  reminder_id: 'rem-001',
  tags: ['email', 'customer'],
  created_at: '2026-08-13T10:00:00Z',
  completed_at: undefined,
};

const mockTaskReminder: TaskReminder = {
  id: 'rem-001',
  message_id: 'msg-005',
  chat_id: 'chat-003',
  reminder_type: 'once',
  reminder_time: '2026-08-14T09:00:00Z',
  interval_minutes: undefined,
  is_enabled: true,
  is_triggered: false,
  last_triggered_at: undefined,
  next_trigger_at: '2026-08-14T09:00:00Z',
  created_at: '2026-08-13T10:00:00Z',
};

const mockKanbanBoard: KanbanBoard = {
  id: 'board-001',
  name: 'Q3 产品规划',
  description: '第三季度产品路线图',
  is_default: true,
  columns: [
    { id: 'col-todo', name: '待办', status_filter: 'todo', task_count: 5, color: '#gray' },
    {
      id: 'col-progress',
      name: '进行中',
      status_filter: 'in_progress',
      task_count: 3,
      color: '#blue',
    },
    { id: 'col-done', name: '已完成', status_filter: 'done', task_count: 12, color: '#green' },
  ],
  task_count: 20,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-13T12:00:00Z',
};

const mockTaskSyncStats: TaskSyncStats = {
  total_tasks_today: 15,
  total_tasks_completed_today: 8,
  completion_rate_today: 0.53,
  total_todos_today: 22,
  total_todos_completed_today: 14,
  active_reminders: 6,
  overdue_tasks: 2,
  by_priority: { low: 3, medium: 8, high: 3, urgent: 1 },
  by_status: { todo: 5, in_progress: 4, review: 2, done: 3, cancelled: 0, blocked: 1 },
  productive_hour: 10,
};

// ====================================================================
// Integration Tests
// ====================================================================

describe('IM Integration Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTicketFromMessage', () => {
    it('应调用 POST /integrations/ticket 创建工单', async () => {
      const req: CreateTicketFromMessageRequest = {
        message_id: 'msg-001',
        title: '登录问题',
        priority: 'high',
        assignee_id: 'user-001',
      };
      apiClient.im.post.mockResolvedValue({ data: mockIntegrationRecord });
      const result = await imIntegrationApi.createTicketFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/integrations/ticket', req);
      expect(result.data).toEqual(mockIntegrationRecord);
      expect(result.data?.target_type).toBe('ticket');
      expect(result.data?.status).toBe('success');
    });

    it('应支持附件和标签', async () => {
      const req: CreateTicketFromMessageRequest = {
        message_id: 'msg-002',
        title: 'Bug 反馈',
        labels: ['bug', 'critical'],
        attachments: [{ name: 'screenshot.png', url: '/files/screenshot.png', type: 'image/png' }],
      };
      await imIntegrationApi.createTicketFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/integrations/ticket', req);
    });
  });

  describe('createTaskFromMessage', () => {
    it('应调用 POST /integrations/task 创建任务', async () => {
      const req: CreateTaskFromMessageRequest = {
        message_id: 'msg-001',
        title: '完成周报',
        priority: 'medium',
        due_date: '2026-08-20T18:00:00Z',
      };
      await imIntegrationApi.createTaskFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/integrations/task', req);
    });
  });

  describe('createCalendarEventFromMessage', () => {
    it('应调用 POST /integrations/calendar 创建日程', async () => {
      const req = {
        message_id: 'msg-001',
        title: '产品评审',
        start_time: '2026-08-15T10:00:00Z',
        end_time: '2026-08-15T11:30:00Z',
        location: '会议室 A',
        attendees: ['user-001', 'user-002'],
      };
      await imIntegrationApi.createCalendarEventFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/integrations/calendar', req);
    });
  });

  describe('createApprovalFromMessage', () => {
    it('应调用 POST /integrations/approval 发起审批', async () => {
      const req = {
        message_id: 'msg-001',
        approval_type: 'leave_request',
        title: '请假申请',
        approver_id: 'manager-001',
        priority: 'urgent' as const,
      };
      await imIntegrationApi.createApprovalFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/integrations/approval', req);
    });
  });

  describe('triggerWebhookFromMessage', () => {
    it('应调用 POST /integrations/webhooks/trigger', async () => {
      const triggerType: WebhookTriggerType = 'message_received';
      const req = {
        message_id: 'msg-001',
        trigger_type: triggerType,
        webhook_id: 'wh-001',
        custom_payload: { source: 'test' },
      };
      await imIntegrationApi.triggerWebhookFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/integrations/webhooks/trigger', req);
    });
  });

  describe('listIntegrationHistory', () => {
    it('应调用 GET /integrations/history 带查询参数', async () => {
      const params = {
        target_type: 'ticket' as IntegrationTarget,
        status: 'success' as IntegrationStatus,
        from_date: '2026-08-01',
        page: 1,
        pagesize: 20,
      };
      await imIntegrationApi.listIntegrationHistory(params);
      expect(apiClient.im.get).toHaveBeenCalledWith('/integrations/history', { params });
    });

    it('应支持无参数调用', async () => {
      await imIntegrationApi.listIntegrationHistory();
      expect(apiClient.im.get).toHaveBeenCalledWith('/integrations/history', { params: undefined });
    });
  });

  describe('getIntegrationRecord', () => {
    it('应调用 GET /integrations/history/:id', async () => {
      await imIntegrationApi.getIntegrationRecord('int-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/integrations/history/int-001');
    });
  });

  describe('deleteIntegrationRecord', () => {
    it('应调用 DELETE /integrations/history/:id', async () => {
      await imIntegrationApi.deleteIntegrationRecord('int-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith('/integrations/history/int-001');
    });
  });

  describe('getIntegrationStats', () => {
    it('应调用 GET /integrations/stats 返回统计数据', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockIntegrationStats });
      const result = await imIntegrationApi.getIntegrationStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/integrations/stats');
      expect(result.data?.success_rate).toBe(0.98);
      expect(result.data?.total_integrations_today).toBe(47);
      expect(result.data?.by_target.ticket).toBe(12);
    });
  });
});

// ====================================================================
// Whiteboard Tests
// ====================================================================

describe('IM Whiteboard Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWhiteboards', () => {
    it('应调用 GET /whiteboards 带查询参数', async () => {
      const params = {
        conference_id: 'conf-001',
        status: 'active' as const,
        page: 1,
        pagesize: 10,
      };
      await imWhiteboardApi.listWhiteboards(params);
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards', { params });
    });

    it('应支持会议 ID 筛选', async () => {
      await imWhiteboardApi.listWhiteboards({ conference_id: 'conf-001' });
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards', {
        params: { conference_id: 'conf-001' },
      });
    });
  });

  describe('createWhiteboard', () => {
    it('应调用 POST /whiteboards 创建白板', async () => {
      const req: CreateWhiteboardRequest = {
        conference_id: 'conf-001',
        title: 'Q4 架构讨论',
        collaborator_ids: ['user-001', 'user-002'],
      };
      apiClient.im.post.mockResolvedValue({ data: mockWhiteboard });
      const result = await imWhiteboardApi.createWhiteboard(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards', req);
      expect(result.data?.title).toBe('Q4 架构讨论');
      expect(result.data?.status).toBe('active');
    });

    it('应包含可选参数', async () => {
      const req: CreateWhiteboardRequest = {
        conference_id: 'conf-001',
        title: '临时白板',
        description: '临时讨论使用',
        width: 1280,
        height: 720,
        is_private: true,
      };
      await imWhiteboardApi.createWhiteboard(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards', req);
    });
  });

  describe('getWhiteboard', () => {
    it('应调用 GET /whiteboards/:id', async () => {
      await imWhiteboardApi.getWhiteboard('wb-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/wb-001');
    });
  });

  describe('updateWhiteboard', () => {
    it('应调用 PUT /whiteboards/:id 更新白板', async () => {
      const data = { title: '更新后的标题', description: '新描述' };
      await imWhiteboardApi.updateWhiteboard('wb-001', data);
      expect(apiClient.im.put).toHaveBeenCalledWith('/whiteboards/wb-001', data);
    });
  });

  describe('deleteWhiteboard', () => {
    it('应调用 DELETE /whiteboards/:id', async () => {
      await imWhiteboardApi.deleteWhiteboard('wb-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith('/whiteboards/wb-001');
    });
  });

  describe('createSnapshot', () => {
    it('应调用 POST /whiteboards/:id/snapshot', async () => {
      const data = { name: '草稿 v1', description: '第一版' };
      apiClient.im.post.mockResolvedValue({ data: mockWhiteboardSnapshot });
      const result = await imWhiteboardApi.createSnapshot('wb-001', data);
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards/wb-001/snapshot', data);
      expect(result.data?.name).toBe('草稿 v1');
    });

    it('应支持无参数调用', async () => {
      await imWhiteboardApi.createSnapshot('wb-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards/wb-001/snapshot', {});
    });
  });

  describe('listWhiteboardSnapshots', () => {
    it('应调用 GET /whiteboards/:id/snapshots', async () => {
      await imWhiteboardApi.listWhiteboardSnapshots('wb-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/wb-001/snapshots', {
        params: undefined,
      });
    });

    it('应支持日期范围筛选', async () => {
      await imWhiteboardApi.listWhiteboardSnapshots('wb-001', {
        from_date: '2026-08-01',
        to_date: '2026-08-13',
      });
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/wb-001/snapshots', {
        params: { from_date: '2026-08-01', to_date: '2026-08-13' },
      });
    });
  });

  describe('getWhiteboardSnapshot', () => {
    it('应调用 GET /whiteboards/:id/snapshots/:sid', async () => {
      await imWhiteboardApi.getWhiteboardSnapshot('wb-001', 'snap-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/wb-001/snapshots/snap-001');
    });
  });

  describe('restoreWhiteboardSnapshot', () => {
    it('应调用 POST /whiteboards/:id/snapshots/:sid/restore', async () => {
      await imWhiteboardApi.restoreWhiteboardSnapshot('wb-001', 'snap-001');
      expect(apiClient.im.post).toHaveBeenCalledWith(
        '/whiteboards/wb-001/snapshots/snap-001/restore'
      );
    });
  });

  describe('listWhiteboardCollaborators', () => {
    it('应调用 GET /whiteboards/:id/collaborators', async () => {
      await imWhiteboardApi.listWhiteboardCollaborators('wb-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/wb-001/collaborators', {
        params: undefined,
      });
    });

    it('应支持权限筛选', async () => {
      await imWhiteboardApi.listWhiteboardCollaborators('wb-001', {
        permission: 'edit' as WhiteboardPermission,
        is_active: true,
      });
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/wb-001/collaborators', {
        params: { permission: 'edit', is_active: true },
      });
    });
  });

  describe('shareWhiteboard', () => {
    it('应调用 POST /whiteboards/:id/share', async () => {
      const req = {
        user_ids: ['user-001', 'user-002'],
        permission: 'edit' as WhiteboardPermission,
        message: '请查看白板',
        send_notification: true,
      };
      await imWhiteboardApi.shareWhiteboard('wb-001', req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards/wb-001/share', req);
    });
  });

  describe('removeWhiteboardCollaborator', () => {
    it('应调用 DELETE /whiteboards/:id/collaborators/:uid', async () => {
      await imWhiteboardApi.removeWhiteboardCollaborator('wb-001', 'user-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith(
        '/whiteboards/wb-001/collaborators/user-001'
      );
    });
  });

  describe('exportWhiteboard', () => {
    it('应调用 POST /whiteboards/:id/export 导出 PDF', async () => {
      const format: WhiteboardExportFormat = 'pdf';
      const req = { format, include_grid: true, scale: 2 };
      apiClient.im.post.mockResolvedValue({
        data: {
          url: 'https://files.example.com/export.pdf',
          file_size_bytes: 245760,
          format: 'pdf',
        },
      });
      const result = await imWhiteboardApi.exportWhiteboard('wb-001', req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards/wb-001/export', req);
      expect(result.data?.format).toBe('pdf');
    });

    it('应支持多种导出格式', async () => {
      const formats: WhiteboardExportFormat[] = ['png', 'pdf', 'svg', 'jpeg'];
      for (const format of formats) {
        await imWhiteboardApi.exportWhiteboard('wb-001', { format });
        expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards/wb-001/export', { format });
      }
    });
  });

  describe('getWhiteboardStats', () => {
    it('应调用 GET /whiteboards/stats', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockWhiteboardStats });
      const result = await imWhiteboardApi.getWhiteboardStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/stats');
      expect(result.data?.total_whiteboards_today).toBe(8);
      expect(result.data?.by_tool_type.pen).toBe(45);
    });
  });
});

// ====================================================================
// TaskSync Tests
// ====================================================================

describe('IM TaskSync Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTaskFromMessage', () => {
    it('应调用 POST /task-sync/tasks/from-message 创建任务', async () => {
      const req = {
        message_id: 'msg-001',
        title: '完成周报',
        priority: 'high' as TaskPriority,
        assignee_id: 'user-001',
        due_date: '2026-08-20T18:00:00Z',
        tags: ['report'],
        subtasks: [{ title: '收集数据' }, { title: '撰写初稿' }],
      };
      apiClient.im.post.mockResolvedValue({ data: mockSyncedTask });
      const result = await imTaskSyncApi.createTaskFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/tasks/from-message', req);
      expect(result.data?.title).toBe('完成周报');
      expect(result.data?.subtasks.length).toBe(2);
    });
  });

  describe('batchCreateTasksFromMessages', () => {
    it('应调用 POST /task-sync/tasks/batch 批量创建', async () => {
      const req = {
        tasks: [
          { message_id: 'msg-001', title: '任务 1', priority: 'high' as TaskPriority },
          { message_id: 'msg-002', title: '任务 2', priority: 'medium' as TaskPriority },
          { message_id: 'msg-003', title: '任务 3', priority: 'low' as TaskPriority },
        ],
      };
      await imTaskSyncApi.batchCreateTasksFromMessages(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/tasks/batch', req);
    });
  });

  describe('listSyncedTasks', () => {
    it('应调用 GET /task-sync/tasks 带查询参数', async () => {
      const params = {
        status: 'in_progress' as TaskStatus,
        priority: 'high' as TaskPriority,
        overdue: true,
        page: 1,
        pagesize: 20,
      };
      await imTaskSyncApi.listSyncedTasks(params);
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/tasks', { params });
    });

    it('应支持逾期筛选', async () => {
      await imTaskSyncApi.listSyncedTasks({ overdue: true });
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/tasks', {
        params: { overdue: true },
      });
    });
  });

  describe('getSyncedTask', () => {
    it('应调用 GET /task-sync/tasks/:id', async () => {
      await imTaskSyncApi.getSyncedTask('task-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/tasks/task-001');
    });
  });

  describe('updateSyncedTask', () => {
    it('应调用 PUT /task-sync/tasks/:id 更新任务', async () => {
      const data = {
        status: 'done' as TaskStatus,
        progress_percentage: 100,
      };
      await imTaskSyncApi.updateSyncedTask('task-001', data);
      expect(apiClient.im.put).toHaveBeenCalledWith('/task-sync/tasks/task-001', data);
    });

    it('应支持部分字段更新', async () => {
      const data = { title: '更新后的任务标题' };
      await imTaskSyncApi.updateSyncedTask('task-001', data);
      expect(apiClient.im.put).toHaveBeenCalledWith('/task-sync/tasks/task-001', data);
    });
  });

  describe('deleteSyncedTask', () => {
    it('应调用 DELETE /task-sync/tasks/:id', async () => {
      await imTaskSyncApi.deleteSyncedTask('task-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith('/task-sync/tasks/task-001');
    });
  });

  describe('listMyTodos', () => {
    it('应调用 GET /task-sync/todos 查询待办', async () => {
      const params = {
        status: 'pending' as TodoStatus,
        priority: 'medium' as TaskPriority,
      };
      await imTaskSyncApi.listMyTodos(params);
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/todos', { params });
    });
  });

  describe('createMyTodo', () => {
    it('应调用 POST /task-sync/todos 创建待办', async () => {
      const req = {
        title: '回复客户邮件',
        priority: 'medium' as TaskPriority,
        due_date: '2026-08-14T18:00:00Z',
        message_id: 'msg-005',
        tags: ['email'],
      };
      apiClient.im.post.mockResolvedValue({ data: mockPersonalTodo });
      const result = await imTaskSyncApi.createMyTodo(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/todos', req);
      expect(result.data?.status).toBe('pending');
    });
  });

  describe('toggleTodoComplete', () => {
    it('应调用 PUT /task-sync/todos/:id/toggle 切换状态', async () => {
      await imTaskSyncApi.toggleTodoComplete('todo-001');
      expect(apiClient.im.put).toHaveBeenCalledWith('/task-sync/todos/todo-001/toggle');
    });
  });

  describe('deleteMyTodo', () => {
    it('应调用 DELETE /task-sync/todos/:id', async () => {
      await imTaskSyncApi.deleteMyTodo('todo-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith('/task-sync/todos/todo-001');
    });
  });

  describe('listTaskReminders', () => {
    it('应调用 GET /task-sync/reminders 查询提醒', async () => {
      const params = { is_enabled: true, is_triggered: false };
      await imTaskSyncApi.listTaskReminders(params);
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/reminders', { params });
    });
  });

  describe('createTaskReminder', () => {
    it('应调用 POST /task-sync/reminders 创建单次提醒', async () => {
      const req = {
        message_id: 'msg-005',
        chat_id: 'chat-003',
        reminder_type: 'once' as ReminderType,
        reminder_time: '2026-08-14T09:00:00Z',
        is_enabled: true,
      };
      await imTaskSyncApi.createTaskReminder(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/reminders', req);
    });

    it('应支持自定义间隔提醒', async () => {
      const req = {
        message_id: 'msg-005',
        chat_id: 'chat-003',
        reminder_type: 'custom_interval' as ReminderType,
        interval_minutes: 30,
        is_enabled: true,
      };
      await imTaskSyncApi.createTaskReminder(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/reminders', req);
    });

    it('应支持每日提醒', async () => {
      const req = {
        message_id: 'msg-005',
        chat_id: 'chat-003',
        reminder_type: 'daily' as ReminderType,
        reminder_time: '09:00:00',
        is_enabled: true,
      };
      await imTaskSyncApi.createTaskReminder(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/reminders', req);
    });
  });

  describe('updateTaskReminder', () => {
    it('应调用 PUT /task-sync/reminders/:id 更新提醒', async () => {
      const data = { is_enabled: false };
      await imTaskSyncApi.updateTaskReminder('rem-001', data);
      expect(apiClient.im.put).toHaveBeenCalledWith('/task-sync/reminders/rem-001', data);
    });
  });

  describe('deleteTaskReminder', () => {
    it('应调用 DELETE /task-sync/reminders/:id', async () => {
      await imTaskSyncApi.deleteTaskReminder('rem-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith('/task-sync/reminders/rem-001');
    });
  });

  describe('listKanbanBoards', () => {
    it('应调用 GET /task-sync/boards 查询看板列表', async () => {
      apiClient.im.get.mockResolvedValue({ data: [mockKanbanBoard] });
      const result = await imTaskSyncApi.listKanbanBoards();
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/boards');
      expect(result.data?.length).toBe(1);
    });
  });

  describe('createKanbanBoard', () => {
    it('应调用 POST /task-sync/boards 创建看板', async () => {
      const req = { name: 'Q3 规划', description: '第三季度路线图' };
      await imTaskSyncApi.createKanbanBoard(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/boards', req);
    });
  });

  describe('getKanbanBoard', () => {
    it('应调用 GET /task-sync/boards/:id 获取看板详情', async () => {
      await imTaskSyncApi.getKanbanBoard('board-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/boards/board-001');
    });
  });

  describe('getTaskSyncStats', () => {
    it('应调用 GET /task-sync/stats 返回统计数据', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockTaskSyncStats });
      const result = await imTaskSyncApi.getTaskSyncStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/stats');
      expect(result.data?.completion_rate_today).toBe(0.53);
      expect(result.data?.total_tasks_today).toBe(15);
    });
  });
});

// ====================================================================
// 聚合快捷方法测试
// ====================================================================

describe('IM API 聚合快捷方法 (Phase 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Integration 快捷方法', () => {
    it('createTicketFromMessage 应正确调用 apiClient', async () => {
      const req = { message_id: 'msg-001', title: 'Test' };
      await imApi.createTicketFromMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/integrations/ticket', req);
    });

    it('getIntegrationStats 应正确调用 apiClient', async () => {
      await imApi.getIntegrationStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/integrations/stats');
    });

    it('listIntegrationHistory 应支持空参数', async () => {
      await imApi.listIntegrationHistory();
      expect(apiClient.im.get).toHaveBeenCalledWith('/integrations/history', { params: undefined });
    });
  });

  describe('Whiteboard 快捷方法', () => {
    it('createWhiteboard 应正确调用 apiClient', async () => {
      const req: CreateWhiteboardRequest = { conference_id: 'conf-001', title: 'Test' };
      await imApi.createWhiteboard(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards', req);
    });

    it('exportWhiteboard 应正确调用 apiClient', async () => {
      await imApi.exportWhiteboard('wb-001', { format: 'pdf' });
      expect(apiClient.im.post).toHaveBeenCalledWith('/whiteboards/wb-001/export', {
        format: 'pdf',
      });
    });

    it('getWhiteboardStats 应正确调用 apiClient', async () => {
      await imApi.getWhiteboardStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/whiteboards/stats');
    });

    it('restoreWhiteboardSnapshot 应正确调用 apiClient', async () => {
      await imApi.restoreWhiteboardSnapshot('wb-001', 'snap-001');
      expect(apiClient.im.post).toHaveBeenCalledWith(
        '/whiteboards/wb-001/snapshots/snap-001/restore'
      );
    });
  });

  describe('TaskSync 快捷方法', () => {
    it('createSyncedTask 应正确调用 apiClient', async () => {
      const req = { message_id: 'msg-001', title: 'Test Task' };
      await imApi.createSyncedTask(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/tasks/from-message', req);
    });

    it('batchCreateSyncedTasks 应正确调用 apiClient', async () => {
      const req = { tasks: [{ message_id: 'msg-001', title: 'Test' }] };
      await imApi.batchCreateSyncedTasks(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/tasks/batch', req);
    });

    it('toggleTodoComplete 应正确调用 apiClient', async () => {
      await imApi.toggleTodoComplete('todo-001');
      expect(apiClient.im.put).toHaveBeenCalledWith('/task-sync/todos/todo-001/toggle');
    });

    it('createTaskReminder 应正确调用 apiClient', async () => {
      const req = {
        message_id: 'msg-001',
        chat_id: 'chat-001',
        reminder_type: 'once' as ReminderType,
        reminder_time: '2026-08-14T09:00:00Z',
      };
      await imApi.createTaskReminder(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/task-sync/reminders', req);
    });

    it('getTaskSyncStats 应正确调用 apiClient', async () => {
      await imApi.getTaskSyncStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/task-sync/stats');
    });
  });

  describe('子域对象访问', () => {
    it('imApi.integration 应暴露 imIntegrationApi', () => {
      expect(imApi.integration).toBe(imIntegrationApi);
    });

    it('imApi.whiteboard 应暴露 imWhiteboardApi', () => {
      expect(imApi.whiteboard).toBe(imWhiteboardApi);
    });

    it('imApi.taskSync 应暴露 imTaskSyncApi', () => {
      expect(imApi.taskSync).toBe(imTaskSyncApi);
    });
  });
});

// ====================================================================
// 类型导出测试
// ====================================================================

describe('Phase 21 类型导出验证', () => {
  it('IntegrationTarget 类型值正确', () => {
    const targets: IntegrationTarget[] = ['ticket', 'task', 'calendar', 'approval', 'webhook'];
    expect(targets).toHaveLength(5);
  });

  it('IntegrationStatus 类型值正确', () => {
    const statuses: IntegrationStatus[] = ['pending', 'success', 'failed', 'cancelled'];
    expect(statuses).toHaveLength(4);
  });

  it('WhiteboardToolType 类型值正确', () => {
    const tools: WhiteboardToolType[] = [
      'pen',
      'highlight',
      'rectangle',
      'ellipse',
      'line',
      'arrow',
      'text',
      'sticky_note',
      'eraser',
      'shapes',
    ];
    expect(tools).toHaveLength(10);
  });

  it('WhiteboardPermission 类型值正确', () => {
    const perms: WhiteboardPermission[] = ['view', 'edit', 'admin', 'owner'];
    expect(perms).toHaveLength(4);
  });

  it('TaskPriority 类型值正确', () => {
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    expect(priorities).toHaveLength(4);
  });

  it('TaskStatus 类型值正确', () => {
    const statuses: TaskStatus[] = [
      'todo',
      'in_progress',
      'review',
      'done',
      'cancelled',
      'blocked',
    ];
    expect(statuses).toHaveLength(6);
  });

  it('TodoStatus 类型值正确', () => {
    const todoStatuses: TodoStatus[] = ['pending', 'completed'];
    expect(todoStatuses).toHaveLength(2);
  });

  it('ReminderType 类型值正确', () => {
    const reminderTypes: ReminderType[] = ['once', 'daily', 'weekly', 'custom_interval'];
    expect(reminderTypes).toHaveLength(4);
  });
});
