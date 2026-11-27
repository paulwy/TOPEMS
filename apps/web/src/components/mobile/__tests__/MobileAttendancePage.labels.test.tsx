/**
 * 移动考勤页文案护栏。
 *
 * 背景：该页曾整套复用 `pages.mobile_attendance_page.k0-k3`（本来是「打卡失败:」
 * 「提交请假申请失败:」这类错误前缀），导致卡片标签显示「打卡失败: 09:12」、
 * 请假天数后面跟「打卡失败:」、日期区间中间也是「打卡失败:」，另有
 * 「公司总部 · 北京市朝阳区xxx路xxx号」这种占位地址与恒为绿色的「范围内」标记。
 * 2026-11-27 已改用专用键 k12-k16 并删掉占位地址/假状态，此处锁住口径。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const WEB_ROOT = join(__dirname, '..', '..', '..', '..');

const read = (rel: string) => readFileSync(join(WEB_ROOT, rel), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel)) as Record<string, string>;

const PAGE_SRC = 'src/components/mobile/MobileAttendancePage.tsx';
const ZH = 'src/i18n/locales/zh/pages.json';
const EN = 'src/i18n/locales/en/pages.json';

describe('MobileAttendancePage 文案口径', () => {
  const src = read(PAGE_SRC);

  it('不再把错误前缀当标签复用', () => {
    // 注意用引号收尾，避免 k1 误匹配 k10/k11/k12
    expect(src).not.toMatch(/pages\.mobile_attendance_page\.k[0-3]['"]/);
  });

  it('打卡时间/地点/天数/区间都走专用键', () => {
    for (const key of ['k12', 'k13', 'k14', 'k15', 'k16']) {
      expect(src).toContain(`pages.mobile_attendance_page.${key}`);
    }
  });

  it('不再渲染占位地址与恒绿「范围内」标记', () => {
    expect(src).not.toContain('mobile_attendance_page.k44');
    expect(read(ZH)['pages.mobile_attendance_page.k3'] ?? '').not.toMatch(/xxx/);
  });

  it('中英文键值对齐且语义正确', () => {
    const zh = readJson(ZH);
    const en = readJson(EN);
    expect(zh['pages.mobile_attendance_page.k12']).toBe('上班打卡');
    expect(zh['pages.mobile_attendance_page.k13']).toBe('下班打卡');
    expect(zh['pages.mobile_attendance_page.k14']).toBe('打卡地点');
    expect(zh['pages.mobile_attendance_page.k15']).toBe('天');
    expect(zh['pages.mobile_attendance_page.k16']).toBe('至');
    for (const key of ['k12', 'k13', 'k14', 'k15', 'k16']) {
      expect(en[`pages.mobile_attendance_page.${key}`]).toBeTruthy();
    }
  });
});
