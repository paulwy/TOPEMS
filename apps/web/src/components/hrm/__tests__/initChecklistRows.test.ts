import { describe, it, expect } from 'vitest';
import { buildChecklistRows } from '../initChecklistRows';
import type { InitProgressResponse } from '@/api/hrm/hrmSetup';

const makeProgress = (
  currentStep: number,
  statuses: Record<string, 'pending' | 'completed' | 'failed'>
): InitProgressResponse =>
  ({
    is_completed: false,
    current_step: currentStep,
    company_id: null,
    steps: Object.entries(statuses).map(([name, status]) => ({
      name,
      order:
        ['company_info', 'departments', 'positions', 'admin_user', 'completion'].indexOf(name) + 1,
      status,
      is_current: false,
    })),
  }) as InitProgressResponse;

describe('buildChecklistRows', () => {
  it('只有 current_step 对应步骤是进行中，其余未完成是待办（P2-5）', () => {
    const rows = buildChecklistRows(
      makeProgress(2, {
        company_info: 'completed',
        departments: 'pending',
        positions: 'pending',
        admin_user: 'pending',
        completion: 'pending',
      })
    );

    expect(rows.map((r) => r.state)).toEqual([
      'completed',
      'current',
      'pending',
      'pending',
      'pending',
    ]);
  });

  it('后端步骤缺失时，仅第一步视为进行中', () => {
    const rows = buildChecklistRows(null);
    expect(rows[0].state).toBe('current');
    expect(rows.slice(1).every((r) => r.state === 'pending')).toBe(true);
  });

  it('已完成步骤保持 completed', () => {
    const rows = buildChecklistRows(
      makeProgress(5, {
        company_info: 'completed',
        departments: 'completed',
        positions: 'completed',
        admin_user: 'completed',
        completion: 'completed',
      })
    );
    expect(rows.every((r) => r.state === 'completed')).toBe(true);
  });
});
