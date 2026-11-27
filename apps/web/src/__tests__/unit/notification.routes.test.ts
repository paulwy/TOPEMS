import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_PATHS,
  notificationModuleConfig,
} from '../../module-configs/notification/config';

/**
 * 通知模块路由顺序回归护栏（2026-11-27）
 *
 * 事故：/notification/templates 未注册静态路由，被 /notification/:id 当作
 * 通知 id="templates" 命中，详情页随即请求
 * /api/communication/notification/notifications/templates → 后端按 UUID 解析失败返回 400。
 *
 * 约束：模板页的静态路径必须注册，且必须排在 /notification/:id 之前。
 */
describe('notification 路由：静态段先于 :id 动态段', () => {
  const routes = notificationModuleConfig.routes ?? [];
  const indexOf = (path: string) => routes.findIndex((r) => r.path === path);

  it('注册了 /notification/templates', () => {
    expect(indexOf(NOTIFICATION_PATHS.templates)).toBeGreaterThanOrEqual(0);
  });

  it('注册了 /notification/:id', () => {
    expect(indexOf(NOTIFICATION_PATHS.detail)).toBeGreaterThanOrEqual(0);
  });

  it('templates 排在 :id 之前（否则会 400）', () => {
    expect(indexOf(NOTIFICATION_PATHS.templates)).toBeLessThan(indexOf(NOTIFICATION_PATHS.detail));
  });

  it('/notification/templates 不再出现在侧栏菜单（入口保持关闭）', () => {
    const navPaths = (notificationModuleConfig.routes ?? []).filter(
      (r) => r.path === NOTIFICATION_PATHS.templates
    ).length;
    expect(navPaths).toBe(1);
  });
});
