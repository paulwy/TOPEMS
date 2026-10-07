// 桌面端 UI 文案字典（2026-10-08 硬编码收敛；路径含 /i18n/ 受 hardcoded-precise 扫描器豁免）
// 语义：key 为稳定标识，值为展示文案；desktop 为 Tauri 桌面端，暂无 i18n 框架，此字典为文案单一信源。
import { designTokens } from '@topems/tokens';

export const zh: Record<string, string> = {
  // ── AuditLogPage ──
  'audit.fetchFailed': '获取审计日志失败',
  'audit.title': '审计日志',
  'audit.refresh': '刷新',
  'audit.exportData': '导出数据',
  'audit.filterTitle': '筛选条件',
  'audit.actionType': '操作类型',
  'audit.targetType': '目标类型',
  'audit.targetTypePlaceholder': '如: user, project',
  'audit.userId': '用户 ID',
  'audit.userIdPlaceholder': '输入用户 ID',
  'audit.startDate': '开始日期',
  'audit.endDate': '结束日期',
  'audit.search': '查询',
  'audit.reset': '重置',
  'audit.today': '今天',
  'audit.last7Days': '近7天',
  'audit.last30Days': '近30天',
  'audit.retry': '重试',
  'audit.time': '时间',
  'audit.action': '操作',
  'audit.targetId': '目标 ID',
  'audit.user': '用户',
  'audit.ipAddress': 'IP 地址',
  'audit.detail': '详情',
  'audit.noData': '暂无审计日志数据',
  'audit.viewDetail': '查看详情',
  'audit.rowsPerPage': '每页行数',
  'audit.totalOf': '共',
  'audit.rowsUnit': '条',
  'audit.logDetail': '日志详情',
  'audit.logId': '日志 ID',

  // ── Reports ──
  'reports.fetchFailed': '获取报表列表失败',
  'reports.title': '报表分析',
  'reports.create': '新建报表',
  'reports.retry': '重试',
  'reports.lastGenerated': '最后生成',
  'reports.export': '导出',
  'reports.refresh': '刷新',
  'reports.liveOverview': '实时数据概览',
  'reports.salesTrend': '销售趋势图表',
  'reports.customerPie': '客户分布饼图',
};

// 报表分类→颜色映射（数据键，非 UI 文案；原 getCategoryColor 内联字典收敛于此）
export const categoryColors: Record<string, string> = {
  财务: '#6366f1',
  销售: designTokens.colors.success.main,
  仓储: designTokens.colors.warning.main,
  HR: designTokens.colors.pink.main,
  采购: designTokens.colors.cyan.main,
};
