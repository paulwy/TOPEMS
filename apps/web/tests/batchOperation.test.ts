import { describe, it, expect } from 'vitest';
import { createBatchAbortController } from '@/utils/batchOperation';

describe('utils/batchOperation - createBatchAbortController', () => {
  it('返回标准 AbortController 实例', () => {
    const ctrl = createBatchAbortController();
    expect(ctrl).toBeInstanceOf(AbortController);
    expect(ctrl.signal).toBeDefined();
    expect(typeof ctrl.abort).toBe('function');
  });

  it('signal.aborted 初始为 false，abort() 后置 true', () => {
    const ctrl = createBatchAbortController();
    expect(ctrl.signal.aborted).toBe(false);
    ctrl.abort();
    expect(ctrl.signal.aborted).toBe(true);
  });

  it('两次调用返回独立控制器（互不影响）', () => {
    const a = createBatchAbortController();
    const b = createBatchAbortController();
    a.abort();
    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(false);
  });
});
