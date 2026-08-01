/**
 * @test-coverage 单测基础入口
 * @done V79 Phase 4 vitest 已启用 / V80 Tier2 coverage 扩展
 * - 基础 mock：localStorage / sessionStorage jsdom 原生支持
 * - 基础 mock：import.meta.env.DEV = true 在 CI 环境的兼容写法
 * @coverage-roadmap
 *  - Tier 1 (必须达到 60%+)：utils/* / hooks/useCrudUnified* / hooks/useUnifiedWebSocket*
 *  - Tier 2 (中期40%+)：components/common/* / api/* 调用层
 *  - Tier 3 (长期20%+)：pages/* 端到端路由覆盖
 */
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); });

beforeEach(() => {
  // 每个测试前清空 localStorage / sessionStorage，避免交叉污染
  localStorage.clear();
  sessionStorage.clear();
});
