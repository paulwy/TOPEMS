#!/usr/bin/env node
/**
 * [Gate STATUS-ENUM-CONTRACT] 代码 DB_VALUES ↔ DB CHECK 值集断言（2026-11-24 接入）
 *
 * 背景：NOT VALID 收口后，211 条有映射的约束靠台账人工对齐；其中 11 个枚举补了
 * `DB_VALUES` 常量，但没有机器断言。本脚本把「Rust 常量」与「DB 约束值集」绑定为
 * 契约文件 docs/database/status-enum-db-contract.json，任一侧改动未同步即 FAIL。
 *
 * 校验内容（逐条，不批量盖章）：
 *   1) 契约条目对应的 Rust 文件存在，且能在 `impl <Enum> {` 块内找到 `pub const DB_VALUES`；
 *   2) 常量里每个字符串字面量都必须在契约 values 内，且反向覆盖（无遗漏、无多余）；
 *   3) 契约 values 必须是小写 snake_case、无重复；
 *   4) 带 same_values_in_schemas 的条目（audit_logs 13 schema）必须列全 13 个 schema。
 *
 * 刷新方式：改 DB 约束或改 DB_VALUES 后，先按 docs/database/not-valid-triage-2026-11-24.md
 * 的“契约刷新”步骤核对两侧，再更新本契约文件，最后跑本脚本。
 *
 * 用法：
 *   node scripts/ci/check-status-enum-contract.mjs
 *   node scripts/ci/check-status-enum-contract.mjs --explain
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[status-enum-contract]";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONTRACT = path.join(ROOT, "docs/database/status-enum-db-contract.json");

const AUDIT_SCHEMAS = [
  "bi", "crm", "erp", "hrm", "iam", "mes", "plugin_mes",
  "public", "rs", "scm", "shared", "srm", "wms",
];

let failed = 0;
function fail(msg) {
  console.error(`${TAG} FAIL ${msg}`);
  failed += 1;
  process.exitCode = 1;
}

function findImplBlock(src, enumName) {
  const needle = new RegExp(`impl\\s+${enumName}\\s*\\{`, "m");
  const m = needle.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, i);
    }
  }
  return null;
}

function extractDbValues(block) {
  const m = /pub\s+const\s+DB_VALUES\s*:[^=]*=\s*(?:&\s*)?\[([\s\S]*?)\];/.exec(block);
  if (!m) return null;
  const literals = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  return literals;
}

const contract = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
const entries = contract.entries ?? [];
if (entries.length === 0) fail("契约条目为空");

let checked = 0;
for (const e of entries) {
  const label = `${e.table}.${e.column} (${e.enum})`;

  if (!Array.isArray(e.values) || e.values.length === 0) {
    fail(`${label}: values 为空`);
    continue;
  }
  if (new Set(e.values).size !== e.values.length) fail(`${label}: 契约 values 有重复`);
  for (const v of e.values) {
    if (!/^[a-z0-9_]+$/.test(v)) fail(`${label}: 值 '${v}' 不是小写 snake_case`);
  }

  if (e.same_values_in_schemas) {
    const listed = [...e.same_values_in_schemas].sort();
    const expect = [...AUDIT_SCHEMAS].sort();
    if (JSON.stringify(listed) !== JSON.stringify(expect)) {
      fail(`${label}: same_values_in_schemas 未列全 13 个 schema`);
    }
  }

  const abs = path.join(ROOT, e.file);
  if (!fs.existsSync(abs)) {
    fail(`${label}: 文件不存在 ${e.file}`);
    continue;
  }
  const src = fs.readFileSync(abs, "utf8");
  const block = findImplBlock(src, e.enum);
  if (!block) {
    fail(`${label}: 在 ${e.file} 找不到 impl ${e.enum} { 块`);
    continue;
  }
  const literals = extractDbValues(block);
  if (!literals) {
    fail(`${label}: ${e.file} 的 impl ${e.enum} 内没有 pub const DB_VALUES`);
    continue;
  }

  const code = [...literals].sort();
  const db = [...e.values].sort();
  const missingInCode = db.filter((v) => !code.includes(v));
  const extraInCode = code.filter((v) => !db.includes(v));
  if (missingInCode.length || extraInCode.length) {
    fail(
      `${label}: 代码与 DB 值集不一致 | 代码缺 ${JSON.stringify(missingInCode)} | 代码多 ${JSON.stringify(extraInCode)}`,
    );
    continue;
  }
  checked += 1;
}

if (process.argv.includes("--explain")) {
  for (const e of entries) console.log(`${TAG} ${e.table}.${e.column} <= ${e.file}::${e.enum} [${e.values.join(",")}]`);
}

if (failed > 0) {
  console.error(`${TAG} 通过 ${checked}/${entries.length}，${failed} 条不一致`);
} else {
  console.log(`${TAG} OK ${checked}/${entries.length} 条契约逐条一致`);
}
