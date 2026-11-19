#!/usr/bin/env node
/**
 * RLS 策略期望快照生成器（独立入口）
 *
 * 设计：docs/quality/remaining-work-schedule-2026-11-19.md §6.3
 *
 * ⚠ 只随迁移一起更新：本脚本从「迁移链终态」的隔离演练库生成快照，
 *   用于把迁移里的策略变更同步为版本化契约。不得为了让门禁变绿而直接刷新快照；
 *   任何快照 diff 必须能与同批迁移的语义逐条对应。
 *
 * 推荐流程（不触碰生产、不需要手工保活临时库）：
 *   MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1 bash scripts/dev/run-migration-drill.sh anchor
 *   git diff database/rls_policy_expected.json   # 逐条核对后与迁移一起提交
 *
 * 也可对任意「已应用迁移链」的非特权库手动生成：
 *   RLS_POLICY_DB_URL='postgresql://topems_drift@127.0.0.1:5432/topems_prod' \
 *     PGPASSFILE="$HOME/.pgpass" node scripts/ci/gen-rls-policy-snapshot.mjs --write
 */
import {
  TAG,
  SNAPSHOT_PATH,
  resolveDbUrl,
  dbLabel,
  assertNonPrivileged,
  fetchPolicySnapshot,
  snapshotCounts,
  writeSnapshot,
  connectivityFailureReason,
} from "./lib/rls-policy-snapshot.mjs";

function parseArgs(argv) {
  const out = { dsn: null, out: SNAPSHOT_PATH, write: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dsn") out.dsn = argv[++i];
    else if (arg === "--out") out.out = argv[++i];
    else if (arg === "--write") out.write = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "用法: node scripts/ci/gen-rls-policy-snapshot.mjs [--dsn <url>] [--out <file>] [--write]",
      );
      process.exit(0);
    } else {
      console.error(`${TAG} FAILED 未知参数：${arg}`);
      process.exit(2);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { url, source } = resolveDbUrl(args.dsn);
  if (!url) {
    console.error(`${TAG} FAILED 未解析到目标库；请设置 RLS_POLICY_DB_URL 或传 --dsn`);
    process.exit(1);
  }
  const label = dbLabel(url);

  let identity;
  try {
    identity = assertNonPrivileged(url, label);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  let snapshot;
  try {
    snapshot = fetchPolicySnapshot(url);
  } catch (err) {
    console.error(`${TAG} FAILED 读取目标库策略失败`);
    console.error(`  目标库：${label}`);
    console.error(`  连接来源：${source}`);
    console.error(`  原因：${connectivityFailureReason(err)}`);
    process.exit(1);
  }

  const counts = snapshotCounts(snapshot);
  if (counts.tables === 0) {
    console.error(`${TAG} FAILED 目标库没有任何受管 RLS 表/策略，拒绝生成空快照`);
    process.exit(1);
  }

  if (args.write) {
    writeSnapshot(args.out, snapshot);
    console.log(
      `${TAG} 已写入 ${args.out}：表 ${counts.tables} / 策略 ${counts.policies}（` +
        `${label}，current_user=${identity.user}）`,
    );
    console.log(`${TAG} 提醒：只随迁移一起提交；不得为过门禁直接刷新快照。`);
  } else {
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  }
}

main();
