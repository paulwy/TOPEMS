#!/usr/bin/env node
/**
 * W5-B B21：把“Rust 状态值不在 DB CHECK/ENUM”归因为可执行队列。
 *
 * 输入：
 *   docs/database/status-code-inventory.json（B2/B18 盘点）
 *   docs/database/finance-status-check-candidates-2026-11-21.sql（B19 候选 DDL）
 * 输出：
 *   docs/database/status-db-check-queue-2026-11-21.json
 *
 * 分桶（启发式，供排期，不是最终结论）：
 *   finance_candidate_ready  finance 值已在候选 DDL 的某列集合内，等窗口
 *   api_projection            GraphQL/API 投影类型（*Gql、graphql_*.rs），不对应表列
 *   persisted_unmapped        所在文件出现 sqlx/query 迹象，需映射到具体表列
 *   internal_state            其余（域值对象/计算中间态/UI 状态），暂不加 CHECK
 *
 * 用法：node scripts/ci/status-db-check-queue.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[status-queue]";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INV = path.join(ROOT, "docs/database/status-code-inventory.json");
const SQL = path.join(ROOT, "docs/database/finance-status-check-candidates-2026-11-21.sql");
const OUT = path.join(ROOT, "docs/database/status-db-check-queue-2026-11-21.json");

function parseCandidateColumns() {
  if (!fs.existsSync(SQL)) return [];
  const src = fs.readFileSync(SQL, "utf8");
  const blocks = src.split(/ALTER TABLE\s+/).slice(1);
  const cols = [];
  for (const block of blocks) {
    const head = /^(\S+)\s+ADD CONSTRAINT\s+(\w+)\s+CHECK/.exec(block);
    if (!head) continue;
    const body = block.slice(0, block.indexOf("NOT VALID"));
    const values = [...body.matchAll(/'([^']+)'/g)].map((x) => x[1]);
    if (values.length > 0) {
      cols.push({ table: head[1], constraint: head[2], values });
    }
  }
  return cols;
}

function main() {
  const check = process.argv.includes("--check");
  const inv = JSON.parse(fs.readFileSync(INV, "utf8"));
  const gaps = new Set(inv.not_in_db_check.rust_values);
  const cols = parseCandidateColumns();
  const candidateValues = new Map();
  for (const c of cols) {
    for (const v of c.values) {
      if (!candidateValues.has(v)) candidateValues.set(v, []);
      candidateValues.get(v).push(`${c.table}.${c.constraint}`);
    }
  }

  // 值级归因：每个值只落一个桶，优先级 候选 > 投影 > 持久化 > 内部
  const enumSignals = inv.enums.map((e) => {
    const fileSrc = fs.readFileSync(path.join(ROOT, e.file), "utf8");
    return {
      e,
      isGql: /Gql$/.test(e.name) || /graphql/i.test(e.file),
      persisted: /sqlx|query!|query_as/i.test(fileSrc),
    };
  });
  const valueBucket = new Map();
  for (const { e, isGql, persisted } of enumSignals) {
    for (const v of e.normalized) {
      if (!gaps.has(v)) continue;
      const current = valueBucket.get(v);
      if (current === "finance_candidate_ready") continue;
      const next = candidateValues.has(v)
        ? "finance_candidate_ready"
        : isGql
          ? "api_projection"
          : persisted
            ? "persisted_unmapped"
            : "internal_state";
      if (!current || next !== "internal_state") valueBucket.set(v, next);
    }
  }

  const rows = [];
  for (const { e } of enumSignals) {
    const values = e.normalized.filter((v) => gaps.has(v));
    if (values.length === 0) continue;
    const byBucket = {};
    for (const v of values) (byBucket[valueBucket.get(v)] = byBucket[valueBucket.get(v)] || []).push(v);
    rows.push({
      module: e.module,
      file: e.file,
      enum: e.name,
      values_by_bucket: byBucket,
      candidate_targets: [...new Set(values.flatMap((v) => candidateValues.get(v) ?? []))],
    });
  }
  const buckets = {};
  for (const [v, k] of valueBucket) {
    buckets[k] = buckets[k] || { enums: 0, values: 0 };
    buckets[k].values += 1;
  }
  for (const r of rows) for (const k of Object.keys(r.values_by_bucket)) buckets[k].enums += 1;

  const out = {
    version: 1,
    source: "docs/database/status-code-inventory.json + finance-status-check-candidates-2026-11-21.sql",
    note: "bucket 为启发式归因，落 CHECK 前仍需逐列确认表列与业务语义；分桶统计按枚举计，值存在跨枚举复用",
    stats: {
      uncovered_enums: rows.length,
      uncovered_values: gaps.size,
      finance_candidate_constraints: cols.length,
      ...Object.fromEntries(Object.entries(buckets).map(([k, v]) => [`${k}_enums`, v.enums])),
      ...Object.fromEntries(Object.entries(buckets).map(([k, v]) => [`${k}_values`, v.values])),
    },
    rows,
  };
  const body = `${JSON.stringify(out, null, 2)}\n`;
  if (check) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== body) {
      console.error(`${TAG} FAIL: 队列与盘点/候选不一致，重跑后复核并提交`);
      process.exit(1);
    }
    console.log(`${TAG} PASS: ${rows.length} 个枚举 / ${gaps.size} 个值，分桶一致`);
    return;
  }
  fs.writeFileSync(OUT, body);
  console.log(
    `${TAG} WROTE: ${rows.length} 枚举 / ${gaps.size} 值 -> ` +
      Object.entries(buckets).map(([k, v]) => `${k} ${v.values}`).join(" / "),
  );
}

main();
