import { describe, it, expect } from 'vitest';
import { planSetupSubmission } from '../setupSubmission';

describe('planSetupSubmission（P1-3 回退/续走）', () => {
  it('全部为已入库 persisted 行时允许前进，且无需新建', () => {
    const plan = planSetupSubmission(
      [
        { name: '技术部', persisted: true },
        { name: '行政部', persisted: true },
      ],
      ['技术部', '行政部'],
      true
    );

    expect(plan.allowed).toBe(true);
    expect(plan.toCreate).toEqual([]);
  });

  it('无新行且库内也无数据时不允许前进', () => {
    const plan = planSetupSubmission([{ name: '' }], [], false);
    expect(plan.allowed).toBe(false);
  });

  it('新行里与库内重名的会被剔除，只提交真正新增', () => {
    const plan = planSetupSubmission(
      [{ name: '技术部' }, { name: '  财务部  ' }, { name: '技术部', persisted: true }],
      ['技术部'],
      true
    );

    expect(plan.allowed).toBe(true);
    expect(plan.toCreate).toEqual([{ name: '  财务部  ' }]);
  });
});
