import type { InitProgressResponse, StepStatusInfo } from '@/api/hrm/hrmSetup';

/** 初始化向导的规范步骤顺序；后端 steps 为空（新库/未播种）时回退使用。 */
export const CANONICAL_STEPS: { name: string; order: number }[] = [
  { name: 'company_info', order: 1 },
  { name: 'departments', order: 2 },
  { name: 'positions', order: 3 },
  { name: 'admin_user', order: 4 },
  { name: 'completion', order: 5 },
];

export type RowState = 'completed' | 'current' | 'pending';

export interface ChecklistRow {
  name: string;
  order: number;
  state: RowState;
}

/**
 * P2-5：只有 current_step 对应的步骤是「进行中」，其余未完成统一「待办」。
 * 旧实现 `s.is_current || s.status !== 'failed'` 对任何未完成步骤都恒真，
 * 导致 4 个 pending 步骤同时显示转圈。
 */
export function buildChecklistRows(data: InitProgressResponse | null): ChecklistRow[] {
  const backend = new Map<string, StepStatusInfo>();
  data?.steps?.forEach((s) => backend.set(s.name, s));

  return CANONICAL_STEPS.map((canon) => {
    const s = backend.get(canon.name);
    if (!s) {
      return {
        name: canon.name,
        order: canon.order,
        state: canon.order === 1 ? 'current' : 'pending',
      };
    }
    if (s.status === 'completed') return { name: s.name, order: s.order, state: 'completed' };
    if (s.order === (data?.current_step ?? 1) && s.status !== 'failed')
      return { name: s.name, order: s.order, state: 'current' };
    return { name: s.name, order: s.order, state: 'pending' };
  });
}
