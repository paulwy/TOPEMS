#!/usr/bin/env node
/**
 * 前端发版前总闸：一条命令跑完「类型检查 + 两层页面巡检」
 *
 * 顺序与理由：
 *   1) tsc --noEmit            —— 类型错就先别扫页面，否则扫出来的错都是噪声
 *   2) itemsField 契约（15 个 GET，2 秒）
 *   3) 列表页一致性（总数 vs 行）
 *   4) 全站页面健康（5xx / 前端异常 / 错误边界）
 *
 * 用法：
 *   node scripts/verify-frontend.mjs            # quick：8 条列表 + 12 条健康，约 40 秒
 *   node scripts/verify-frontend.mjs --full     # 全量：--all，约 25 分钟
 *   node scripts/verify-frontend.mjs --skip-tsc # 只跑巡检
 *
 * 退出码：0 全绿；1 有 FAIL；2 脚本级错误（登录失败、依赖缺失等）
 */
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const FULL = argv.includes('--full');
const SKIP_TSC = argv.includes('--skip-tsc');
const SKIP_HEALTH = argv.includes('--skip-health');
const SKIP_CONTRACT = argv.includes('--skip-contract');

function run(label, cmd, args) {
  console.log(`\n=== ${label}：${cmd} ${args.join(' ')}`);
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = r.status === 0;
  console.log(`=== ${label}：${ok ? '通过' : `失败（exit ${r.status}）`} ${sec}s`);
  return { label, ok, sec, status: r.status };
}

const results = [];

if (!SKIP_TSC) {
  results.push(run('类型检查', 'npx', ['tsc', '--noEmit']));
  if (!results[0].ok) {
    console.log('\n判定：FAIL（类型检查未过，后续巡检跳过）');
    process.exit(1);
  }
}

if (!SKIP_CONTRACT) results.push(run('字段契约(itemsField)', 'node', ['scripts/check-items-field.mjs']));

const consistencyArgs = ['scripts/check-list-page-consistency.mjs'];
if (FULL) consistencyArgs.push('--all', '--max', '170', '--timeout', '20');
results.push(run('列表页一致性', 'node', consistencyArgs));

if (!SKIP_HEALTH) {
  const healthArgs = ['scripts/check-page-health.mjs'];
  if (FULL) healthArgs.push('--all', '--include-dashboards', '--max', '220', '--timeout', '20');
  results.push(run('页面健康', 'node', healthArgs));
}

const failed = results.filter((r) => !r.ok);
console.log('\n================ 总览 ================');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(10)} ${r.sec}s`);
console.log(`判定：${failed.length ? 'FAIL' : 'OK'}`);
process.exit(failed.length ? 1 : 0);
