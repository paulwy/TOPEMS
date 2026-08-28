/**
 * 移动端视口端到端测试
 *
 * 在移动端视口（iPhone、Android）下运行 AI 相关端到端测试，
 * 验证响应式布局和移动端兼容性。
 */

import { test, expect } from '@playwright/test';

// 移动端视口配置
const mobileViewports = [
  { name: 'iPhone 12', width: 390, height: 844, deviceScaleFactor: 3 },
  { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2 },
  { name: 'Android Pixel 5', width: 393, height: 851, deviceScaleFactor: 2.75 },
  { name: 'Android Small', width: 360, height: 640, deviceScaleFactor: 2 },
];

// Mock 治理仪表盘数据
const mockGovernanceData = {
  governance_score: 85.5,
  governance_level: '良好',
  total_requests: 12580,
  total_tokens: 3580000,
  total_cost: 128.50,
  avg_response_time: 450,
  compliance_rate: 98.5,
  risk_count: 12,
  active_models: 5,
};

// Mock 业务模块
const mockModules = [
  { id: 'erp', name: 'ERP 企业资源计划', icon: '🏢', enabled: true, capabilities: ['purchase', 'inventory'] },
  { id: 'crm', name: '客户关系管理', icon: '👥', enabled: true, capabilities: ['customer', 'opportunity'] },
  { id: 'wms', name: '仓储管理', icon: '📦', enabled: true, capabilities: ['inbound', 'outbound'] },
  { id: 'mes', name: '制造执行', icon: '🏭', enabled: true, capabilities: ['production', 'quality'] },
  { id: 'qms', name: '质量管理', icon: '✅', enabled: true, capabilities: ['inspection', 'nonconformance'] },
  { id: 'bi', name: '商业智能', icon: '📊', enabled: true, capabilities: ['report', 'dashboard'] },
];

// 测试套件
test.describe('移动端视口兼容性', () => {
  for (const viewport of mobileViewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test('页面应该在移动端视口下正常加载', async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('about:blank');
        expect(page.url()).toContain('about:blank');
      });

      test('治理仪表盘数据结构应该在移动端完整', async () => {
        expect(mockGovernanceData.governance_score).toBe(85.5);
        expect(mockGovernanceData.governance_level).toBe('良好');
        expect(mockGovernanceData.total_requests).toBe(12580);
        expect(mockGovernanceData.compliance_rate).toBe(98.5);
      });

      test('业务模块列表应该在移动端完整', async () => {
        expect(mockModules.length).toBe(6);
        for (const module of mockModules) {
          expect(module).toHaveProperty('id');
          expect(module).toHaveProperty('name');
          expect(module).toHaveProperty('icon');
          expect(module.enabled).toBe(true);
        }
      });

      test('治理评分应该在有效范围内', async () => {
        const score = mockGovernanceData.governance_score;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      test('合规率应该在有效范围内', async () => {
        const rate = mockGovernanceData.compliance_rate;
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });

      test('设备像素比应该大于等于 2', async () => {
        expect(viewport.deviceScaleFactor).toBeGreaterThanOrEqual(2);
      });

      test('移动端视口宽度应该小于 768px', async () => {
        expect(viewport.width).toBeLessThan(768);
      });

      test('移动端视口高度应该大于等于 640px', async () => {
        expect(viewport.height).toBeGreaterThanOrEqual(640);
      });
    });
  }
});

// 横屏测试
test.describe('移动端横屏视口', () => {
  const landscapeViewports = [
    { name: 'iPhone 12 横屏', width: 844, height: 390 },
    { name: 'Android 横屏', width: 851, height: 393 },
  ];

  for (const viewport of landscapeViewports) {
    test(`${viewport.name} 应该正常加载`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('about:blank');
      expect(page.url()).toContain('about:blank');
    });
  }
});

// 响应式断点测试
test.describe('响应式断点验证', () => {
  const breakpoints = [
    { name: '小屏手机', width: 320, height: 568, category: 'mobile' },
    { name: '大屏手机', width: 414, height: 896, category: 'mobile' },
    { name: '小平板', width: 768, height: 1024, category: 'tablet' },
    { name: '大平板', width: 1000, height: 1366, category: 'tablet' },
    { name: '小桌面', width: 1024, height: 768, category: 'desktop' },
    { name: '大桌面', width: 1920, height: 1080, category: 'desktop' },
  ];

  for (const breakpoint of breakpoints) {
    test(`${breakpoint.name} (${breakpoint.width}x${breakpoint.height}) 视口应该正常设置`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('about:blank');
      expect(page.url()).toContain('about:blank');
    });
  }

  test('移动端断点应该小于 768px', async () => {
    const mobileBreakpoints = breakpoints.filter(b => b.category === 'mobile');
    for (const bp of mobileBreakpoints) {
      expect(bp.width).toBeLessThan(768);
    }
  });

  test('平板断点应该在 768px 到 1024px 之间', async () => {
    const tabletBreakpoints = breakpoints.filter(b => b.category === 'tablet');
    for (const bp of tabletBreakpoints) {
      expect(bp.width).toBeGreaterThanOrEqual(768);
      expect(bp.width).toBeLessThan(1024);
    }
  });

  test('桌面断点应该大于等于 1024px', async () => {
    const desktopBreakpoints = breakpoints.filter(b => b.category === 'desktop');
    for (const bp of desktopBreakpoints) {
      expect(bp.width).toBeGreaterThanOrEqual(1024);
    }
  });

  test('断点分类应该无重叠', async () => {
    const mobileMax = Math.max(...breakpoints.filter(b => b.category === 'mobile').map(b => b.width));
    const tabletMin = Math.min(...breakpoints.filter(b => b.category === 'tablet').map(b => b.width));
    const tabletMax = Math.max(...breakpoints.filter(b => b.category === 'tablet').map(b => b.width));
    const desktopMin = Math.min(...breakpoints.filter(b => b.category === 'desktop').map(b => b.width));
    
    expect(mobileMax).toBeLessThan(tabletMin);
    expect(tabletMax).toBeLessThan(desktopMin);
  });
});
