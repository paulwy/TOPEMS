#!/usr/bin/env node
/**
 * scripts/check-header-toolbar-order.mjs
 * =============================================================
 * 导航架构 §15.2 L552 合规检查器：AppHeader 工具栏顺序固定
 * 规范：从左到右必须是  Logo → 中央Tab → 搜索 → [AI Sparkles(primary)]
 *        → [插件市场] → [通知Bell] → [主题切换] → [用户Avatar]
 *
 * 实现：静态扫描 apps/web/src/components/layout/AppHeader.tsx
 *   提取默认右侧工具栏（rightActions || 缺省 Fragment）中最顶层组件顺序，
 *   忽略 Divider/Menu 等容器，只保留：GlobalActions / 通知Bell / ThemeSelector / UserMenu
 *   校验其出现顺序严格符合 [GlobalActions, 通知Bell, ThemeSelector, UserMenu]
 *
 * CI 接入：scripts/check-header-toolbar-order.mjs （exit=0 通过，exit>0 失败）
 *
 * V1.0 / 2026-08-09
 * ============================================================= */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const APP_HEADER_FILE = resolve(
  REPO_ROOT,
  'apps/web/src/components/layout/AppHeader.tsx'
);

// 规范顺序（组件标识名，每个可用数组提供多个别名）
const EXPECTED_ORDER = [
  { id: 'GlobalActions',     patterns: [/<GlobalActions\b/] },
  { id: '通知Bell(Badge)',  patterns: [/aria-label='通知'/, /title='通知'/] },
  { id: 'ThemeSelector',     patterns: [/<ThemeSelector\b/] },
  { id: 'UserMenu',          patterns: [/<UserMenu\b/] },
];

function main() {
  const src = readFileSync(APP_HEADER_FILE, 'utf8');
  const errors = [];
  const notices = [];

  // 1. 定位右侧工具栏区域：{rightActions || ( <> ... </> )}
  const regionStart = src.indexOf('rightActions || (');
  if (regionStart === -1) {
    errors.push('无法在 AppHeader.tsx 中找到 `rightActions || (` 区域标记');
    return report(errors, notices, []);
  }
  // 从 regionStart 开始向前找外层 JSX 片段的第一个 <> Fragment 开始，向后找对应 </>
  // 简化：从 regionStart 位置切出源代码，使用"括号层级计数"取 default branch 内容
  const sliceFrom = regionStart;
  const defaultStartIdx = src.indexOf('<>', sliceFrom);
  if (defaultStartIdx === -1) {
    errors.push('rightActions 缺省分支未找到 `<>` 开始标签');
    return report(errors, notices, []);
  }
  // 以 <> 起点开始用 depth 计数，找到匹配 </>
  let depth = 0, i = defaultStartIdx;
  let contentStart = -1, contentEnd = -1;
  while (i < src.length) {
    if (src.startsWith('<>', i)) {
      if (depth === 0) contentStart = i + 2;
      depth++;
      i += 2;
    } else if (src.startsWith('</>', i)) {
      depth--;
      if (depth === 0) { contentEnd = i; break; }
      i += 3;
    } else {
      i++;
    }
  }
  if (contentStart === -1 || contentEnd === -1) {
    errors.push('JSX Fragment 配对失败，未找到工具栏区域');
    return report(errors, notices, []);
  }
  const toolbarSrc = src.slice(contentStart, contentEnd);

  // 2. 过滤掉 Menu / Divider 等容器块（去掉嵌套再扫描顶层组件）
  // 先提取 top-level 直接 `<Component... >` 或 `<Component />`
  // 简单方案：对每个 EXPECTED 组件在整个 toolbarSrc 中搜索其首次出现位置（indexOf pattern），
  // 忽略它在 Menu 内部（Menu 内部不会有 GlobalActions / ThemeSelector / UserMenu）
  // 唯一可能误报：通知 Bell 也在 Menu 内部有 aria-label='全部确认' 之类，所以我们只看 Tooltip title='通知' 外层
  const positions = [];
  for (const rule of EXPECTED_ORDER) {
    let min = Infinity;
    for (const pat of rule.patterns) {
      const m = toolbarSrc.match(pat);
      if (m && m.index < min) min = m.index;
    }
    if (isFinite(min)) {
      positions.push({ id: rule.id, index: min });
    } else {
      errors.push(`找不到核心元素「${rule.id}」，pattern=${rule.patterns.map(p=>p.toString()).join(' | ')}`);
    }
  }
  if (errors.length) return report(errors, notices, positions);

  // 3. 比较顺序
  const actual = positions.sort((a,b) => a.index - b.index).map(p => p.id);
  const expected = EXPECTED_ORDER.map(r => r.id);
  let orderOk = actual.length === expected.length;
  for (let k = 0; k < Math.min(actual.length, expected.length); k++) {
    if (actual[k] !== expected[k]) orderOk = false;
  }
  if (orderOk) {
    notices.push(`顺序通过：${actual.join(' → ')}`);
  } else {
    errors.push(
      `顺序不匹配：\n     期望：${expected.join(' → ')}\n     实际：${actual.join(' → ')}`
    );
  }

  // 4. 额外：Bell 之前不能插队 ThemeSelector / UserMenu
  const bellIdx = positions.find(p => p.id === '通知Bell(Badge)').index;
  for (const p of positions) {
    if (p.id === 'ThemeSelector' || p.id === 'UserMenu') {
      if (p.index < bellIdx) {
        errors.push(`🚩 违规插队：${p.id} 出现在 通知Bell 之前，Bell 必须保持第一触达位置 §15.2`);
      }
    }
  }

  return report(errors, notices, positions);
}

function report(errors, notices, positions) {
  const cyan = '\x1b[36m', green = '\x1b[32m', red = '\x1b[31m', reset = '\x1b[0m';
  console.log(`${cyan}===== 导航架构 §15.2 L552：AppHeader 工具栏顺序检查 =====${reset}`);
  console.log(`文件：${APP_HEADER_FILE}\n`);
  for (const n of notices) console.log(`  ${green}✓ ${n}${reset}`);
  if (positions.length) {
    console.log(`\n  位置索引：`);
    positions.sort((a,b)=>a.index-b.index).forEach(p => console.log(`    [${String(p.index).padStart(5)}] ${p.id}`));
  }
  console.log('');
  if (errors.length === 0) {
    console.log(`${green}✅ PASS：工具栏顺序合规${reset}`);
    process.exit(0);
  } else {
    console.log(`${red}❌ FAIL：${errors.length} 处违规${reset}\n`);
    errors.forEach(e => console.log(`  ${red}· ${e}${reset}`));
    console.log('\n  修正参考：navigation-architecture.md §15.2 L552\n');
    process.exit(1);
  }
}

main();
