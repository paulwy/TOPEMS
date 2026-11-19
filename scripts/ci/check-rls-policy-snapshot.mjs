#!/usr/bin/env node
/**
 * RLS 策略期望快照门禁（[Gate RLS-SNAP]）
 *
 * 设计：docs/quality/remaining-work-schedule-2026-11-19.md §6.3
 *
 * 判定：快照 database/rls_policy_expected.json 的每个表/策略/表达式/RLS 标志
 *       必须与目标库实测完全一致；多表、少表、多策略、少策略、表达式变化、
 *       ENABLE/FORCE 变化一律 FAILED（无 WARN 降级、无 superuser/BYPASSRLS 豁免）。
 *
 * 用法：
 *   RLS_POLICY_DB_URL='postgresql://topems_drift@127.0.0.1:5432/topems_prod' \
 *     PGPASSFILE="$HOME/.pgpass" node scripts/ci/check-rls-policy-snapshot.mjs
 *   node scripts/ci/check-rls-policy-snapshot.mjs --dsn 'postgresql://...' --snapshot path/to/snapshot.json
 *
 * 连接解析顺序：--dsn > RLS_POLICY_DB_URL > MIGRATION_DRIFT_DB_URL > DATABASE_URL > .env MIGRATE_URL。
 * 无口令时回落 socket（peer 认证），但门禁仍拒绝 superuser/BYPASSRLS。
 */
import {
  TAG,
  SNAPSHOT_PATH,
  resolveDbUrl,
  dbLabel,
  assertNonPrivileged,
  fetchPolicySnapshot,
  compareSnapshots,
  snapshotCounts,
  readSnapshot,
  connectivityFailureReason,
} from "./lib/rls-policy-snapshot.mjs";

function parseArgs(argv) {
  const out = { dsn: null, snapshot: SNAPSHOT_PATH };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dsn") out.dsn = argv[++i];
    else if (arg === "--snapshot") out.snapshot = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log("用法: node scripts/ci/check-rls-policy-snapshot.mjs [--dsn <url>] [--snapshot <file>]");
      process.exit(0);
    } else {
      console.error(`${TAG} FAILED 未知参数：${arg}`);
      process.exit(2);
    }
  }
  return out;
}

function fail(lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let expected;
  try {
    expected = readSnapshot(args.snapshot);
  } catch (err) {
    fail([err.message]);
  }

  const { url, source } = resolveDbUrl(args.dsn);
  if (!url) {
    fail([
      `${TAG} FAILED 未解析到目标库`,
      "  设置 RLS_POLICY_DB_URL（或 --dsn）指向已应用迁移链的库；本机生产镜像示例：",
      "    RLS_POLICY_DB_URL='postgresql://topems_drift@127.0.0.1:5432/topems_prod' PGPASSFILE=\"$HOME/.pgpass\" node scripts/ci/check-rls-policy-snapshot.mjs",
    ]);
  }
  const label = dbLabel(url);

  let identity;
  try {
    identity = assertNonPrivileged(url, label);
  } catch (err) {
    fail([err.message]);
  }

  let actual;
  try {
    actual = fetchPolicySnapshot(url);
  } catch (err) {
    fail([
      `${TAG} FAILED 读取目标库策略失败`,
      `  目标库：${label}`,
      `  连接来源：${source}`,
      `  原因：${connectivityFailureReason(err)}`,
    ]);
  }

  const expCounts = snapshotCounts(expected);
  const actCounts = snapshotCounts(actual);
  const problems = compareSnapshots(expected, actual);

  console.log(
    `${TAG} 目标库 ${label}（来源 ${source}，current_user=${identity.user}，` +
      `rolsuper=${identity.rolsuper}，rolbypassrls=${identity.rolbypass}）`,
  );
  console.log(
    `${TAG} 快照 ${args.snapshot}：表 ${expCounts.tables} / 策略 ${expCounts.policies}；` +
      `实测：表 ${actCounts.tables} / 策略 ${actCounts.policies}`,
  );

  if (problems.length === 0) {
    console.log(`${TAG} PASS 策略快照与实测完全一致`);
    process.exit(0);
  }

  const shown = problems.slice(0, 50);
  console.error(`${TAG} FAILED ${problems.length} 项不一致（展示前 ${shown.length} 项）`);
  for (const p of shown) {
    console.error(`  - ${p.table} :: ${p.field}`);
    console.error(`      期望: ${p.expected}`);
    console.error(`      实际: ${p.actual}`);
  }
  if (problems.length > shown.length) {
    console.error(`  ... 还有 ${problems.length - shown.length} 项，未展示`);
  }
  console.error(
    "  修复：按迁移终态修改策略后，运行快照更新入口（只随迁移一起提交，不得为过门禁直接刷新）：",
  );
  console.error(
    "    MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1 bash scripts/dev/run-migration-drill.sh anchor",
  );
  process.exit(1);
}

main();
