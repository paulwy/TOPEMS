import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import imApi from '../im';
import {
  imScheduledApi,
  type ScheduledMessage,
  type CreateScheduledMessageRequest,
  type ScheduledMessageStats,
  type ScheduledMessageStatus,
} from '../im/scheduled';
import {
  imInteractionApi,
  type Announcement,
  type CreateAnnouncementRequest,
  type Poll,
  type CreatePollRequest,
  type CheckIn,
  type CreateCheckInRequest,
  type AnnouncementType,
  type PollStatus,
  type CheckInType,
} from '../im/interaction';

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

const mockScheduledMessage: ScheduledMessage = {
  id: 'sched-001',
  chat_id: 'chat-001',
  chat_name: '产品讨论群',
  content: '这是一条定时消息',
  message_type: 'text',
  scheduled_at: '2026-08-15T10:00:00Z',
  status: 'pending',
  created_by: 'user-001',
  created_by_name: '张三',
  created_by_avatar: '/avatars/user-001.png',
  repeat: 'none',
  created_at: '2026-08-13T10:00:00Z',
  updated_at: '2026-08-13T10:00:00Z',
};

const mockScheduledMessageStats: ScheduledMessageStats = {
  total_pending: 5,
  total_sent_today: 12,
  total_failed_today: 1,
  total_cancelled: 3,
  by_chat: [
    { chat_id: 'chat-001', chat_name: '产品讨论群', count: 3 },
    { chat_id: 'chat-002', chat_name: '技术交流群', count: 2 },
  ],
  by_sender: [{ user_id: 'user-001', user_name: '张三', count: 5 }],
  upcoming_count: 8,
};

const mockAnnouncement: Announcement = {
  id: 'ann-001',
  chat_id: 'chat-001',
  title: '系统维护通知',
  content: '系统将于本周六凌晨2点进行维护',
  type: 'warning',
  is_pinned: true,
  pinned_until: '2026-08-20T23:59:59Z',
  created_by: 'user-001',
  created_by_name: '张三',
  view_count: 15,
  read_count: 10,
  read_user_ids: ['user-001', 'user-002'],
  allow_comment: true,
  comment_count: 3,
  created_at: '2026-08-13T10:00:00Z',
  updated_at: '2026-08-13T10:00:00Z',
};

const mockPoll: Poll = {
  id: 'poll-001',
  chat_id: 'chat-001',
  title: '下午茶选择',
  description: '请选择今天的下午茶',
  options: [
    { id: 'opt-1', text: '咖啡', votes: 5, voters: ['user-001'], is_winner: true },
    { id: 'opt-2', text: '奶茶', votes: 3, voters: ['user-002'] },
    { id: 'opt-3', text: '果汁', votes: 2, voters: [] },
  ],
  allow_multiple: false,
  is_anonymous: false,
  status: 'active',
  created_by: 'user-001',
  created_by_name: '张三',
  total_votes: 10,
  voters: [],
  created_at: '2026-08-13T10:00:00Z',
  updated_at: '2026-08-13T10:00:00Z',
};

const mockCheckIn: CheckIn = {
  id: 'ci-001',
  chat_id: 'chat-001',
  title: '周一晨会签到',
  description: '请准时参加晨会',
  type: 'once',
  location: '会议室 A',
  longitude: 116.404,
  latitude: 39.915,
  radius_meters: 100,
  allow_late: true,
  status: 'active',
  created_by: 'user-001',
  created_by_name: '张三',
  total_participants: 15,
  checked_in_count: 8,
  participants: [],
  starts_at: '2026-08-14T09:00:00Z',
  ends_at: '2026-08-14T09:30:00Z',
  created_at: '2026-08-13T10:00:00Z',
  updated_at: '2026-08-13T10:00:00Z',
};

// ====================================================================
// Scheduled Message Tests
// ====================================================================

describe('IM Scheduled Message API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createScheduledMessage', () => {
    it('应调用 POST /im/scheduled-messages 创建定时消息', async () => {
      const req: CreateScheduledMessageRequest = {
        chat_id: 'chat-001',
        content: '定时提醒',
        scheduled_at: '2026-08-15T10:00:00Z',
      };
      apiClient.im.post.mockResolvedValue({ data: mockScheduledMessage });
      const result = await imScheduledApi.createScheduledMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages', req);
      expect(result.data?.content).toBe('这是一条定时消息');
      expect(result.data?.status).toBe('pending');
    });

    it('应支持重复消息设置', async () => {
      const req: CreateScheduledMessageRequest = {
        chat_id: 'chat-001',
        content: '每日提醒',
        scheduled_at: '2026-08-15T10:00:00Z',
        repeat: 'daily',
        repeat_end_at: '2026-09-15T10:00:00Z',
      };
      await imScheduledApi.createScheduledMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages', req);
    });
  });

  describe('listScheduledMessages', () => {
    it('应调用 GET /im/scheduled-messages 带查询参数', async () => {
      const params = {
        chat_id: 'chat-001',
        status: 'pending' as ScheduledMessageStatus,
        page: 1,
        pagesize: 20,
      };
      await imScheduledApi.listScheduledMessages(params);
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/scheduled-messages', { params });
    });

    it('应支持无参数调用', async () => {
      await imScheduledApi.listScheduledMessages();
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/scheduled-messages', {
        params: undefined,
      });
    });
  });

  describe('getScheduledMessage', () => {
    it('应调用 GET /im/scheduled-messages/:id', async () => {
      await imScheduledApi.getScheduledMessage('sched-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/scheduled-messages/sched-001');
    });
  });

  describe('updateScheduledMessage', () => {
    it('应调用 PUT /im/scheduled-messages/:id 更新定时消息', async () => {
      const data = { content: '更新后的内容' };
      await imScheduledApi.updateScheduledMessage('sched-001', data);
      expect(apiClient.im.put).toHaveBeenCalledWith('/im/scheduled-messages/sched-001', data);
    });
  });

  describe('deleteScheduledMessage', () => {
    it('应调用 DELETE /im/scheduled-messages/:id', async () => {
      await imScheduledApi.deleteScheduledMessage('sched-001');
      expect(apiClient.im.delete).toHaveBeenCalledWith('/im/scheduled-messages/sched-001');
    });
  });

  describe('sendScheduledMessageNow', () => {
    it('应调用 POST /im/scheduled-messages/:id/send', async () => {
      await imScheduledApi.sendScheduledMessageNow('sched-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages/sched-001/send');
    });
  });

  describe('cancelScheduledMessage', () => {
    it('应调用 POST /im/scheduled-messages/:id/cancel', async () => {
      await imScheduledApi.cancelScheduledMessage('sched-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages/sched-001/cancel');
    });
  });

  describe('batchSendScheduledMessages', () => {
    it('应调用 POST /im/scheduled-messages/batch-send', async () => {
      const data = { ids: ['sched-001', 'sched-002'] };
      await imScheduledApi.batchSendScheduledMessages(data);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages/batch-send', data);
    });
  });

  describe('batchDeleteScheduledMessages', () => {
    it('应调用 POST /im/scheduled-messages/batch-delete', async () => {
      const data = { ids: ['sched-001', 'sched-002'] };
      await imScheduledApi.batchDeleteScheduledMessages(data);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages/batch-delete', data);
    });
  });

  describe('getScheduledMessageStats', () => {
    it('应调用 GET /im/scheduled-messages/stats 返回统计数据', async () => {
      apiClient.im.get.mockResolvedValue({ data: mockScheduledMessageStats });
      const result = await imScheduledApi.getScheduledMessageStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/scheduled-messages/stats');
      expect(result.data?.total_pending).toBe(5);
      expect(result.data?.upcoming_count).toBe(8);
    });
  });
});

// ====================================================================
// Interaction Tests
// ====================================================================

describe('IM Interaction API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Announcements ====================

  describe('Announcements', () => {
    describe('createAnnouncement', () => {
      it('应调用 POST /im/announcements 创建公告', async () => {
        const req: CreateAnnouncementRequest = {
          chat_id: 'chat-001',
          title: '系统维护通知',
          content: '系统将于本周六维护',
          type: 'warning',
        };
        apiClient.im.post.mockResolvedValue({ data: mockAnnouncement });
        const result = await imInteractionApi.createAnnouncement(req);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/announcements', req);
        expect(result.data?.title).toBe('系统维护通知');
        expect(result.data?.type).toBe('warning');
      });

      it('应支持置顶选项', async () => {
        const req: CreateAnnouncementRequest = {
          chat_id: 'chat-001',
          title: '重要通知',
          content: '请查收',
          is_pinned: true,
          pinned_until: '2026-08-31T23:59:59Z',
        };
        await imInteractionApi.createAnnouncement(req);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/announcements', req);
      });
    });

    describe('listAnnouncements', () => {
      it('应调用 GET /im/announcements', async () => {
        await imInteractionApi.listAnnouncements({ chat_id: 'chat-001' });
        expect(apiClient.im.get).toHaveBeenCalledWith('/im/announcements', {
          params: { chat_id: 'chat-001' },
        });
      });

      it('应支持无参数调用', async () => {
        await imInteractionApi.listAnnouncements();
        expect(apiClient.im.get).toHaveBeenCalledWith('/im/announcements', { params: undefined });
      });
    });

    describe('getAnnouncement', () => {
      it('应调用 GET /im/announcements/:id', async () => {
        await imInteractionApi.getAnnouncement('ann-001');
        expect(apiClient.im.get).toHaveBeenCalledWith('/im/announcements/ann-001');
      });
    });

    describe('updateAnnouncement', () => {
      it('应调用 PUT /im/announcements/:id 更新公告', async () => {
        const data = { title: '更新后的标题' };
        await imInteractionApi.updateAnnouncement('ann-001', data);
        expect(apiClient.im.put).toHaveBeenCalledWith('/im/announcements/ann-001', data);
      });
    });

    describe('deleteAnnouncement', () => {
      it('应调用 DELETE /im/announcements/:id', async () => {
        await imInteractionApi.deleteAnnouncement('ann-001');
        expect(apiClient.im.delete).toHaveBeenCalledWith('/im/announcements/ann-001');
      });
    });

    describe('markAnnouncementRead', () => {
      it('应调用 POST /im/announcements/:id/read', async () => {
        await imInteractionApi.markAnnouncementRead('ann-001');
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/announcements/ann-001/read');
      });
    });
  });

  // ==================== Polls ====================

  describe('Polls', () => {
    describe('createPoll', () => {
      it('应调用 POST /im/polls 创建投票', async () => {
        const req: CreatePollRequest = {
          chat_id: 'chat-001',
          title: '下午茶选择',
          options: ['咖啡', '奶茶', '果汁'],
        };
        apiClient.im.post.mockResolvedValue({ data: mockPoll });
        const result = await imInteractionApi.createPoll(req);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/polls', req);
        expect(result.data?.title).toBe('下午茶选择');
        expect(result.data?.options.length).toBe(3);
      });

      it('应支持多选投票', async () => {
        const req: CreatePollRequest = {
          chat_id: 'chat-001',
          title: '多选投票',
          options: ['选项 A', '选项 B'],
          allow_multiple: true,
          max_selections: 2,
          is_anonymous: true,
        };
        await imInteractionApi.createPoll(req);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/polls', req);
      });
    });

    describe('listPolls', () => {
      it('应调用 GET /im/polls', async () => {
        await imInteractionApi.listPolls({ chat_id: 'chat-001' });
        expect(apiClient.im.get).toHaveBeenCalledWith('/im/polls', {
          params: { chat_id: 'chat-001' },
        });
      });
    });

    describe('getPoll', () => {
      it('应调用 GET /im/polls/:id', async () => {
        await imInteractionApi.getPoll('poll-001');
        expect(apiClient.im.get).toHaveBeenCalledWith('/im/polls/poll-001');
      });
    });

    describe('votePoll', () => {
      it('应调用 POST /im/polls/:id/vote', async () => {
        const data = { option_ids: ['opt-1'] };
        await imInteractionApi.votePoll('poll-001', data);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/polls/poll-001/vote', data);
      });
    });

    describe('closePoll', () => {
      it('应调用 POST /im/polls/:id/close', async () => {
        await imInteractionApi.closePoll('poll-001');
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/polls/poll-001/close');
      });
    });

    describe('deletePoll', () => {
      it('应调用 DELETE /im/polls/:id', async () => {
        await imInteractionApi.deletePoll('poll-001');
        expect(apiClient.im.delete).toHaveBeenCalledWith('/im/polls/poll-001');
      });
    });
  });

  // ==================== Check-ins ====================

  describe('Check-ins', () => {
    describe('createCheckIn', () => {
      it('应调用 POST /im/check-ins 创建签到活动', async () => {
        const req: CreateCheckInRequest = {
          chat_id: 'chat-001',
          title: '晨会签到',
          type: 'once',
          location: '会议室 A',
          starts_at: '2026-08-14T09:00:00Z',
          ends_at: '2026-08-14T09:30:00Z',
        };
        apiClient.im.post.mockResolvedValue({ data: mockCheckIn });
        const result = await imInteractionApi.createCheckIn(req);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins', req);
        expect(result.data?.title).toBe('周一晨会签到');
        expect(result.data?.type).toBe('once');
      });

      it('应支持地理位置签到', async () => {
        const req: CreateCheckInRequest = {
          chat_id: 'chat-001',
          title: '现场签到',
          type: 'once',
          location: '公司总部',
          longitude: 116.404,
          latitude: 39.915,
          radius_meters: 100,
          starts_at: '2026-08-14T09:00:00Z',
          ends_at: '2026-08-14T18:00:00Z',
        };
        await imInteractionApi.createCheckIn(req);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins', req);
      });
    });

    describe('listCheckIns', () => {
      it('应调用 GET /im/check-ins', async () => {
        await imInteractionApi.listCheckIns({ chat_id: 'chat-001' });
        expect(apiClient.im.get).toHaveBeenCalledWith('/im/check-ins', {
          params: { chat_id: 'chat-001' },
        });
      });
    });

    describe('getCheckIn', () => {
      it('应调用 GET /im/check-ins/:id', async () => {
        await imInteractionApi.getCheckIn('ci-001');
        expect(apiClient.im.get).toHaveBeenCalledWith('/im/check-ins/ci-001');
      });
    });

    describe('submitCheckIn', () => {
      it('应调用 POST /im/check-ins/:id/submit', async () => {
        const data = { check_in_code: 'ABC123' };
        await imInteractionApi.submitCheckIn('ci-001', data);
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins/ci-001/submit', data);
      });

      it('应支持空参数调用', async () => {
        await imInteractionApi.submitCheckIn('ci-001');
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins/ci-001/submit', {});
      });
    });

    describe('closeCheckIn', () => {
      it('应调用 POST /im/check-ins/:id/close', async () => {
        await imInteractionApi.closeCheckIn('ci-001');
        expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins/ci-001/close');
      });
    });

    describe('deleteCheckIn', () => {
      it('应调用 DELETE /im/check-ins/:id', async () => {
        await imInteractionApi.deleteCheckIn('ci-001');
        expect(apiClient.im.delete).toHaveBeenCalledWith('/im/check-ins/ci-001');
      });
    });
  });
});

// ====================================================================
// Aggregated Shortcut Methods Tests
// ====================================================================

describe('IM API 聚合快捷方法 (Phase 22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scheduled 快捷方法', () => {
    it('createScheduledMessage 应正确调用 apiClient', async () => {
      const req = { chat_id: 'chat-001', content: 'Test', scheduled_at: '2026-08-15T10:00:00Z' };
      await imApi.createScheduledMessage(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages', req);
    });

    it('listScheduledMessages 应正确调用 apiClient', async () => {
      await imApi.listScheduledMessages({ status: 'pending' });
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/scheduled-messages', {
        params: { status: 'pending' },
      });
    });

    it('getScheduledMessage 应正确调用 apiClient', async () => {
      await imApi.getScheduledMessage('sched-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/scheduled-messages/sched-001');
    });

    it('sendScheduledMessageNow 应正确调用 apiClient', async () => {
      await imApi.sendScheduledMessageNow('sched-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/scheduled-messages/sched-001/send');
    });

    it('getScheduledMessageStats 应正确调用 apiClient', async () => {
      await imApi.getScheduledMessageStats();
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/scheduled-messages/stats');
    });
  });

  describe('Interaction 快捷方法 - Announcements', () => {
    it('createAnnouncement 应正确调用 apiClient', async () => {
      const req = { chat_id: 'chat-001', title: 'Test', content: 'Content' };
      await imApi.createAnnouncement(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/announcements', req);
    });

    it('listAnnouncements 应正确调用 apiClient', async () => {
      await imApi.listAnnouncements();
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/announcements', { params: undefined });
    });

    it('getAnnouncement 应正确调用 apiClient', async () => {
      await imApi.getAnnouncement('ann-001');
      expect(apiClient.im.get).toHaveBeenCalledWith('/im/announcements/ann-001');
    });

    it('markAnnouncementRead 应正确调用 apiClient', async () => {
      await imApi.markAnnouncementRead('ann-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/announcements/ann-001/read');
    });
  });

  describe('Interaction 快捷方法 - Polls', () => {
    it('createPoll 应正确调用 apiClient', async () => {
      const req = { chat_id: 'chat-001', title: 'Test', options: ['A', 'B'] };
      await imApi.createPoll(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/polls', req);
    });

    it('votePoll 应正确调用 apiClient', async () => {
      await imApi.votePoll('poll-001', { option_ids: ['opt-1'] });
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/polls/poll-001/vote', {
        option_ids: ['opt-1'],
      });
    });

    it('closePoll 应正确调用 apiClient', async () => {
      await imApi.closePoll('poll-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/polls/poll-001/close');
    });
  });

  describe('Interaction 快捷方法 - Check-ins', () => {
    it('createCheckIn 应正确调用 apiClient', async () => {
      const req = {
        chat_id: 'chat-001',
        title: 'Test',
        type: 'once' as CheckInType,
        starts_at: '2026-08-14T09:00:00Z',
        ends_at: '2026-08-14T09:30:00Z',
      };
      await imApi.createCheckIn(req);
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins', req);
    });

    it('submitCheckIn 应正确调用 apiClient', async () => {
      await imApi.submitCheckIn('ci-001', { check_in_code: 'ABC' });
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins/ci-001/submit', {
        check_in_code: 'ABC',
      });
    });

    it('closeCheckIn 应正确调用 apiClient', async () => {
      await imApi.closeCheckIn('ci-001');
      expect(apiClient.im.post).toHaveBeenCalledWith('/im/check-ins/ci-001/close');
    });
  });

  describe('子域对象访问', () => {
    it('imApi.scheduled 应暴露 imScheduledApi', () => {
      expect(imApi.scheduled).toBe(imScheduledApi);
    });

    it('imApi.interaction 应暴露 imInteractionApi', () => {
      expect(imApi.interaction).toBe(imInteractionApi);
    });
  });
});

// ====================================================================
// Type Export Tests
// ====================================================================

describe('Phase 22 类型导出验证', () => {
  it('ScheduledMessageStatus 类型值正确', () => {
    const statuses: ScheduledMessageStatus[] = ['pending', 'sent', 'failed', 'cancelled'];
    expect(statuses).toHaveLength(4);
  });

  it('AnnouncementType 类型值正确', () => {
    const types: AnnouncementType[] = ['info', 'warning', 'important'];
    expect(types).toHaveLength(3);
  });

  it('PollStatus 类型值正确', () => {
    const statuses: PollStatus[] = ['active', 'closed', 'draft'];
    expect(statuses).toHaveLength(3);
  });

  it('CheckInType 类型值正确', () => {
    const types: CheckInType[] = ['daily', 'once', 'event'];
    expect(types).toHaveLength(3);
  });
});
