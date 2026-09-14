#!/usr/bin/env node
/**
 * TOPEMS Web 无障碍 CI 检查（`pnpm check:a11y`）
 *
 * 组成：
 *   1. 静态规则扫描 — 运行 `eslint -c eslint.a11y.config.js src/`（jsx-a11y 规则升为 error）
 *   2. 运行时规则扫描 — 运行 axe-core 组件测试（`a11y-layout.test.tsx`，覆盖
 *      AppHeader / BusinessDomainTabs / TabGroup / SidebarItem）
 *
 * 任一环节发现严重违规即退出码非 0，CI 门禁失败。
 *
 * 用法：
 *   pnpm check:a11y            # 完整检查
 *   pnpm check:a11y --static   # 仅静态扫描
 *   pnpm check:a11y --runtime  # 仅运行时 axe 扫描
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const only = process.argv.slice(2);

function runStatic() {
  console.log('\n[1/2] 静态 a11y 扫描（eslint jsx-a11y, error 级）…');
  try {
    execSync('npx eslint -c eslint.a11y.config.js src/', {
      cwd: root,
      stdio: 'inherit',
    });
    console.log('  ✅ 静态扫描通过：0 违规');
    return true;
  } catch {
    console.error('  ❌ 静态扫描发现 a11y 违规（见上方输出）');
    return false;
  }
}

function runRuntime() {
  console.log('\n[2/2] 运行时 axe-core 扫描（组件测试）…');
  try {
    execSync(
      'pnpm exec vitest run --project component src/components/__tests__/a11y-layout.test.tsx',
      {
        cwd: root,
        stdio: 'inherit',
      }
    );
    console.log('  ✅ 运行时扫描通过：无 critical/serious 违规');
    return true;
  } catch {
    console.error('  ❌ 运行时扫描发现严重违规');
    return false;
  }
}

(async () => {
  const tasks = [];
  if (only.includes('--static')) tasks.push(['static', runStatic]);
  else if (only.includes('--runtime')) tasks.push(['runtime', runRuntime]);
  else {
    tasks.push(['static', runStatic]);
    tasks.push(['runtime', runRuntime]);
  }

  let ok = true;
  for (const [, fn] of tasks) {
    ok = fn() && ok;
  }

  console.log(`\na11y 检查${ok ? '全部通过 ✅' : '失败 ❌'}`);
  process.exit(ok ? 0 : 1);
})();
