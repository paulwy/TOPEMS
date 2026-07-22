import { createMockProvider, authHeaders } from './setup';
import axios from 'axios';

describe('Ticket API Contract', () => {
  const provider = createMockProvider('topems-ticket');
  const token = 'valid-ticket-token';

  it('should list tickets with pagination', async () => {
    provider
      .given('tenant has tickets')
      .uponReceiving('a request to list tickets')
      .withRequest({
        method: 'GET',
        path: '/api/ticket/tickets',
        headers: authHeaders(token),
        query: { page: '1', page_size: '10', status: 'open' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            items: [
              {
                id: 'ticket-001',
                ticketNo: 'TICKET-2024-0001',
                title: '系统登录失败',
                priority: 'high',
                status: 'open',
                category: 'system',
                assigneeId: 'user-002',
                createdAt: '2024-01-15T09:00:00Z',
              },
              {
                id: 'ticket-002',
                ticketNo: 'TICKET-2024-0002',
                title: '报表数据异常',
                priority: 'medium',
                status: 'open',
                category: 'finance',
                assigneeId: 'user-003',
                createdAt: '2024-01-15T10:30:00Z',
              },
            ],
            total: 2,
            page: 1,
            pageSize: 10,
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/ticket/tickets`, {
        headers: authHeaders(token),
        params: { page: 1, page_size: 10, status: 'open' },
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.total).toBe(2);
      expect(response.data.data.items[0].priority).toBe('high');
    });
  });

  it('should create a new ticket', async () => {
    const ticketData = {
      title: '网络连接异常',
      description: '无法连接到服务器，请求超时',
      priority: 'high',
      category: 'network',
      assigneeId: 'user-002',
    };

    provider
      .given('ticket creation is allowed')
      .uponReceiving('a request to create a ticket')
      .withRequest({
        method: 'POST',
        path: '/api/ticket/tickets',
        headers: authHeaders(token),
        body: ticketData,
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            id: 'ticket-new-001',
            ticketNo: 'TICKET-2024-0003',
            status: 'open',
            createdAt: '2024-01-15T11:00:00Z',
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(`${mockServer.url}/api/ticket/tickets`, ticketData, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(201);
      expect(response.data.code).toBe(0);
      expect(response.data.data.status).toBe('open');
    });
  });

  it('should get ticket by id', async () => {
    provider
      .given('ticket ticket-001 exists')
      .uponReceiving('a request to get ticket detail')
      .withRequest({
        method: 'GET',
        path: '/api/ticket/tickets/ticket-001',
        headers: authHeaders(token),
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            id: 'ticket-001',
            ticketNo: 'TICKET-2024-0001',
            title: '系统登录失败',
            description: '用户无法使用账号登录系统',
            priority: 'high',
            status: 'open',
            category: 'system',
            assigneeId: 'user-002',
            assigneeName: '张三',
            reporterId: 'user-001',
            reporterName: '李四',
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T09:00:00Z',
            comments: [],
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/ticket/tickets/ticket-001`, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.title).toBe('系统登录失败');
      expect(response.data.data.priority).toBe('high');
    });
  });

  it('should update ticket status', async () => {
    const updateData = { status: 'in_progress', assigneeId: 'user-002' };

    provider
      .given('ticket ticket-001 exists and is open')
      .uponReceiving('a request to update ticket status')
      .withRequest({
        method: 'PATCH',
        path: '/api/ticket/tickets/ticket-001/status',
        headers: authHeaders(token),
        body: updateData,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            id: 'ticket-001',
            status: 'in_progress',
            updatedAt: '2024-01-15T12:00:00Z',
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.patch(`${mockServer.url}/api/ticket/tickets/ticket-001/status`, updateData, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.status).toBe('in_progress');
    });
  });

  it('should close ticket with resolution', async () => {
    const closeData = {
      status: 'closed',
      resolution: '已修复',
      resolutionNote: '问题已解决，系统已恢复正常',
    };

    provider
      .given('ticket ticket-001 exists and is in_progress')
      .uponReceiving('a request to close ticket')
      .withRequest({
        method: 'PATCH',
        path: '/api/ticket/tickets/ticket-001/close',
        headers: authHeaders(token),
        body: closeData,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            id: 'ticket-001',
            status: 'closed',
            resolution: '已修复',
            closedAt: '2024-01-15T15:00:00Z',
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.patch(`${mockServer.url}/api/ticket/tickets/ticket-001/close`, closeData, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.status).toBe('closed');
      expect(response.data.data.resolution).toBe('已修复');
    });
  });

  it('should return ticket statistics', async () => {
    provider
      .given('tenant has various ticket statuses')
      .uponReceiving('a request for ticket statistics')
      .withRequest({
        method: 'GET',
        path: '/api/ticket/statistics',
        headers: authHeaders(token),
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            total: 100,
            open: 30,
            inProgress: 20,
            pending: 15,
            closed: 35,
            byPriority: { high: 20, medium: 50, low: 30 },
            byCategory: { system: 40, network: 30, finance: 20, hr: 10 },
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/ticket/statistics`, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.total).toBe(100);
      expect(response.data.data.open).toBe(30);
    });
  });
});
