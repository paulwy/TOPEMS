import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataSecurityAuditApiV76 } from '../master/dataSecurityAuditV76';
import apiClient from '../client';

// Mock the apiClient
vi.mock('../client', () => ({
  default: {
    master: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockGet = apiClient.master.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.master.post as ReturnType<typeof vi.fn>;
const mockPut = apiClient.master.put as ReturnType<typeof vi.fn>;
const mockPatch = apiClient.master.patch as ReturnType<typeof vi.fn>;
const mockDelete = apiClient.master.delete as ReturnType<typeof vi.fn>;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// ===== 访问审计日志 =====
describe('V161 · 数据安全审计 - 访问审计日志', () => {
  it('查询审计日志 - 带参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataSecurityAuditApiV76.queryLogs({
      user_id: 'u1',
      action: 'read',
      resource_type: 'document',
      page: 1,
      page_size: 20,
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/mdm-v76/logs?user_id=u1&action=read&resource_type=document&page=1&page_size=20'
    );
  });

  it('查询审计日志 - 无参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataSecurityAuditApiV76.queryLogs();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/logs');
  });

  it('获取审计日志详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'l1', action: 'read' },
      status: 200,
    });

    await dataSecurityAuditApiV76.getLog('l1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/logs/l1');
  });

  it('获取审计日志统计', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataSecurityAuditApiV76.getLogStats({ action: 'read', start_date: '2026-01-01' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/logs/stats?action=read&start_date=2026-01-01');
  });

  it('导出审计日志', async () => {
    mockGet.mockResolvedValueOnce({
      data: { download_url: '/files/logs.csv' },
      status: 200,
    });

    await dataSecurityAuditApiV76.exportLogs({ start_date: '2026-01-01' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/logs/export?start_date=2026-01-01');
  });
});

// ===== 审计策略管理 =====
describe('V161 · 数据安全审计 - 审计策略管理', () => {
  it('获取策略列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataSecurityAuditApiV76.listRules({ severity: 'high', page: 1 });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/rules?severity=high&page=1');
  });

  it('获取策略详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'r1', name: '敏感数据访问' },
      status: 200,
    });

    await dataSecurityAuditApiV76.getRule('r1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/rules/r1');
  });

  it('创建策略', async () => {
    const ruleData = {
      name: '敏感数据访问',
      description: '监控敏感数据访问',
      rule_type: 'access' as const,
      severity: 'high' as const,
      condition: 'data_classification == "restricted"',
      action: 'alert' as const,
      applies_to: [{ resource_type: 'document', action: 'read' as const }],
    };

    mockPost.mockResolvedValueOnce({
      data: { id: 'r1', ...ruleData },
      status: 201,
    });

    await dataSecurityAuditApiV76.createRule(ruleData);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/rules', ruleData);
  });

  it('更新策略', async () => {
    const updateData = {
      name: '更新策略名',
      severity: 'critical' as const,
    };

    mockPut.mockResolvedValueOnce({
      data: { id: 'r1', ...updateData },
      status: 200,
    });

    await dataSecurityAuditApiV76.updateRule('r1', updateData);

    expect(mockPut).toHaveBeenCalledWith('/mdm-v76/rules/r1', updateData);
  });

  it('删除策略', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataSecurityAuditApiV76.deleteRule('r1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v76/rules/r1');
  });

  it('启用策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'r1', status: 'active' },
      status: 200,
    });

    await dataSecurityAuditApiV76.enableRule('r1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/rules/r1/enable', {});
  });

  it('禁用策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'r1', status: 'inactive' },
      status: 200,
    });

    await dataSecurityAuditApiV76.disableRule('r1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/rules/r1/disable', {});
  });

  it('测试策略', async () => {
    mockPost.mockResolvedValueOnce({
      data: { matches: false },
      status: 200,
    });

    await dataSecurityAuditApiV76.testRule('r1', { action: 'read' });

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/rules/r1/test', {
      sample_log: { action: 'read' },
    });
  });
});

// ===== 安全事件管理 =====
describe('V161 · 数据安全审计 - 安全事件管理', () => {
  it('获取事件列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataSecurityAuditApiV76.listEvents({ severity: 'critical', status: 'open' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/events?severity=critical&status=open');
  });

  it('获取事件详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'e1', title: '数据泄露' },
      status: 200,
    });

    await dataSecurityAuditApiV76.getEvent('e1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/events/e1');
  });

  it('创建事件', async () => {
    const eventData = {
      title: '可疑活动检测',
      description: '检测到异常访问模式',
      severity: 'high' as const,
      type: 'anomalous_activity' as const,
    };

    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', ...eventData },
      status: 201,
    });

    await dataSecurityAuditApiV76.createEvent(eventData);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/events', eventData);
  });

  it('更新事件', async () => {
    const updateData = {
      status: 'in_progress' as const,
      assignee_id: 'u1',
    };

    mockPut.mockResolvedValueOnce({
      data: { id: 'e1', ...updateData },
      status: 200,
    });

    await dataSecurityAuditApiV76.updateEvent('e1', updateData);

    expect(mockPut).toHaveBeenCalledWith('/mdm-v76/events/e1', updateData);
  });

  it('分配事件', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', assignee_id: 'u1' },
      status: 200,
    });

    await dataSecurityAuditApiV76.assignEvent('e1', 'u1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/events/e1/assign', { assignee_id: 'u1' });
  });

  it('解决事件', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'resolved' },
      status: 200,
    });

    await dataSecurityAuditApiV76.resolveEvent('e1', '已确认是正常操作');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/events/e1/resolve', {
      resolution: '已确认是正常操作',
    });
  });

  it('关闭事件', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'e1', status: 'closed' },
      status: 200,
    });

    await dataSecurityAuditApiV76.closeEvent('e1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/events/e1/close', {});
  });

  it('删除事件', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataSecurityAuditApiV76.deleteEvent('e1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v76/events/e1');
  });
});

// ===== 异常检测配置 =====
describe('V161 · 数据安全审计 - 异常检测配置', () => {
  it('获取异常检测配置列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataSecurityAuditApiV76.listAnomalyConfigs({ is_active: true });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/anomaly-configs?is_active=true');
  });

  it('创建异常检测配置', async () => {
    const configData = {
      name: '访问模式异常检测',
      detection_type: 'access_pattern' as const,
      threshold: 3,
      sensitivity: 'medium' as const,
      baseline_period_days: 30,
    };

    mockPost.mockResolvedValueOnce({
      data: { id: 'c1', ...configData },
      status: 201,
    });

    await dataSecurityAuditApiV76.createAnomalyConfig(configData);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/anomaly-configs', configData);
  });

  it('更新异常检测配置', async () => {
    mockPut.mockResolvedValueOnce({
      data: { id: 'c1', threshold: 5 },
      status: 200,
    });

    await dataSecurityAuditApiV76.updateAnomalyConfig('c1', { threshold: 5 });

    expect(mockPut).toHaveBeenCalledWith('/mdm-v76/anomaly-configs/c1', { threshold: 5 });
  });

  it('开关异常检测配置', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { id: 'c1', is_active: false },
      status: 200,
    });

    await dataSecurityAuditApiV76.toggleAnomalyConfig('c1', false);

    expect(mockPatch).toHaveBeenCalledWith('/mdm-v76/anomaly-configs/c1', { is_active: false });
  });

  it('删除异常检测配置', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataSecurityAuditApiV76.deleteAnomalyConfig('c1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v76/anomaly-configs/c1');
  });

  it('运行异常检测', async () => {
    mockPost.mockResolvedValueOnce({
      data: { config_id: 'c1', anomalies_found: 2, events_created: 2 },
      status: 200,
    });

    await dataSecurityAuditApiV76.runAnomalyDetection('c1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/anomaly-configs/c1/run', {});
  });
});

// ===== 合规审计 =====
describe('V161 · 数据安全审计 - 合规审计', () => {
  it('获取合规审计列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataSecurityAuditApiV76.listComplianceAudits({ framework: 'GDPR' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/compliance?framework=GDPR');
  });

  it('创建合规审计', async () => {
    const auditData = {
      framework: 'GDPR' as const,
      audit_type: 'access_review' as const,
      scope: [{ data_classification: 'confidential' }],
      start_date: '2026-01-01',
    };

    mockPost.mockResolvedValueOnce({
      data: { id: 'a1', ...auditData },
      status: 201,
    });

    await dataSecurityAuditApiV76.createComplianceAudit(auditData);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/compliance', auditData);
  });

  it('获取合规审计详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'a1', framework: 'GDPR' },
      status: 200,
    });

    await dataSecurityAuditApiV76.getComplianceAudit('a1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/compliance/a1');
  });

  it('运行合规审计', async () => {
    mockPost.mockResolvedValueOnce({
      data: { id: 'a1', status: 'in_progress' },
      status: 200,
    });

    await dataSecurityAuditApiV76.runComplianceAudit('a1');

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/compliance/a1/run', {});
  });

  it('获取合规摘要', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        framework: 'GDPR',
        total_audits: 10,
        pass_rate: 0.9,
        critical_findings: 1,
        high_findings: 2,
        avg_resolution_days: 7,
      },
      status: 200,
    });

    await dataSecurityAuditApiV76.getComplianceSummary({ framework: 'GDPR' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/compliance/summary?framework=GDPR');
  });
});

// ===== 审计报告 =====
describe('V161 · 数据安全审计 - 审计报告', () => {
  it('获取报告列表', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
      status: 200,
    });

    await dataSecurityAuditApiV76.listReports({ report_type: 'security' });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/reports?report_type=security');
  });

  it('生成报告', async () => {
    const reportData = {
      name: '月度安全审计报告',
      report_type: 'security' as const,
      period_start: '2026-08-01',
      period_end: '2026-08-31',
    };

    mockPost.mockResolvedValueOnce({
      data: { id: 'r1', ...reportData, status: 'generating' },
      status: 201,
    });

    await dataSecurityAuditApiV76.generateReport(reportData);

    expect(mockPost).toHaveBeenCalledWith('/mdm-v76/reports', reportData);
  });

  it('获取报告详情', async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 'r1', name: '月度报告' },
      status: 200,
    });

    await dataSecurityAuditApiV76.getReport('r1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/reports/r1');
  });

  it('下载报告', async () => {
    mockGet.mockResolvedValueOnce({
      data: { download_url: '/files/report.pdf' },
      status: 200,
    });

    await dataSecurityAuditApiV76.downloadReport('r1');

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/reports/r1/download');
  });

  it('删除报告', async () => {
    mockDelete.mockResolvedValueOnce({
      data: { deleted: true },
      status: 200,
    });

    await dataSecurityAuditApiV76.deleteReport('r1');

    expect(mockDelete).toHaveBeenCalledWith('/mdm-v76/reports/r1');
  });
});

// ===== 仪表板 =====
describe('V161 · 数据安全审计 - 仪表板', () => {
  it('获取审计仪表板', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        total_audit_events: 1000,
        events_last_24h: 50,
        critical_events_open: 2,
        high_events_open: 5,
        avg_resolution_time_hours: 24,
        compliance_score: 0.85,
        event_severity_distribution: { low: 900, medium: 80, high: 15, critical: 5 },
        event_status_distribution: {
          open: 10,
          in_progress: 5,
          resolved: 80,
          closed: 5,
          ignored: 0,
        },
        top_rules_triggered: [],
        top_targeted_resources: [],
        resolution_trend_7d: [],
        compliance_frameworks: [],
        anomaly_detection_active: true,
        anomaly_events_last_7d: 3,
      },
      status: 200,
    });

    const result = await dataSecurityAuditApiV76.getDashboard();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/dashboard');
    expect(result.data.total_audit_events).toBe(1000);
  });

  it('获取实时反馈', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataSecurityAuditApiV76.getLiveFeed({ limit: 10 });

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/live-feed?limit=10');
  });

  it('获取实时反馈 - 空参数', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await dataSecurityAuditApiV76.getLiveFeed();

    expect(mockGet).toHaveBeenCalledWith('/mdm-v76/live-feed');
  });
});

// ===== 导出默认值 =====
describe('V161 · 默认导出', () => {
  it('应该导出默认的 api 对象', () => {
    expect(dataSecurityAuditApiV76).toBeDefined();
    expect(typeof dataSecurityAuditApiV76.queryLogs).toBe('function');
    expect(typeof dataSecurityAuditApiV76.listRules).toBe('function');
    expect(typeof dataSecurityAuditApiV76.listEvents).toBe('function');
    expect(typeof dataSecurityAuditApiV76.getDashboard).toBe('function');
  });
});
