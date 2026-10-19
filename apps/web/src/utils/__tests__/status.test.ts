import { describe, it, expect, vi } from 'vitest';
import { getStatusColor, getChipStatusColor } from '@/utils/status';

// status.ts 的 lims 分支在模块加载期用 i18n.t 构造映射键，这里按 zh 真实文案 mock
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const map: Record<string, string> = {
        'utils.status.k0': '待登记',
        'utils.status.k1': '待接收',
        'utils.status.k2': '已接收',
        'utils.status.k3': '待确认',
        'utils.status.k4': '已确认',
        'utils.status.k5': '检测中',
        'utils.status.k6': '已完成',
      };
      return map[key] ?? key;
    },
  },
}));

describe('getStatusColor', () => {
  it('默认域：归一化（trim + 小写）后命中全局映射', () => {
    expect(getStatusColor(' Approved ')).toBe('success');
    expect(getStatusColor('cancelled')).toBe('error');
    expect(getStatusColor('ACTIVE')).toBe('success');
  });

  it('默认域：未知状态回退 default，可自定义 fallback', () => {
    expect(getStatusColor('totally-unknown')).toBe('default');
    expect(getStatusColor('totally-unknown', { fallback: 'warning' })).toBe('warning');
  });

  it('workflow 分类：approved/rejected/pending 固定，其余走全局映射', () => {
    expect(getStatusColor('approved', { category: 'workflow' })).toBe('success');
    expect(getStatusColor('rejected', { category: 'workflow' })).toBe('error');
    expect(getStatusColor('pending', { category: 'workflow' })).toBe('warning');
    expect(getStatusColor('completed', { category: 'workflow' })).toBe('success');
    expect(getStatusColor('nope', { category: 'workflow', fallback: 'default' })).toBe('default');
  });

  it('mes 分类：六个核心状态各自命中独立分支', () => {
    expect(getStatusColor('pending', { category: 'mes' })).toBe('warning');
    expect(getStatusColor('released', { category: 'mes' })).toBe('info');
    expect(getStatusColor('in_progress', { category: 'mes' })).toBe('primary');
    expect(getStatusColor('completed', { category: 'mes' })).toBe('success');
    expect(getStatusColor('cancelled', { category: 'mes' })).toBe('error');
    expect(getStatusColor('paused', { category: 'mes' })).toBe('default');
  });

  it('monitor 分类：healthy/degraded/unhealthy 用 .main 变体，未知回退', () => {
    expect(getStatusColor('healthy', { category: 'monitor' })).toBe('success.main');
    expect(getStatusColor('degraded', { category: 'monitor' })).toBe('warning.main');
    expect(getStatusColor('unhealthy', { category: 'monitor' })).toBe('error.main');
    expect(getStatusColor('nope', { category: 'monitor', fallback: 'default' })).toBe('default');
  });

  it('lims 分类：按真实中文文案命中专用配色，不经归一', () => {
    expect(getStatusColor('待登记', { category: 'lims' })).toBe('grey.100');
    expect(getStatusColor('已完成', { category: 'lims' })).toBe('success.lighter');
    expect(getStatusColor('检测中', { category: 'lims' })).toBe('primary.light');
  });
});

describe('getChipStatusColor', () => {
  it('返回 MUI chip 可接受的 color 取值', () => {
    expect(getChipStatusColor('approved')).toBe('success');
    expect(getChipStatusColor('rejected')).toBe('error');
    expect(getChipStatusColor('released', 'mes')).toBe('info');
  });
});
