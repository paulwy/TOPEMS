#!/usr/bin/env node
/**
 * 状态枚举单一源（W5-B / DEC-09）B2：代码侧状态盘点
 *
 * 输入：docs/database/status-check-catalog.json（B1 DB 单一源目录）
 * 输出：docs/database/status-code-inventory.json
 *
 * 盘点两类手写状态源：
 *   1) Rust `pub enum *Status*` 变体（按 svc 模块归组）
 *   2) 前端 `apps/web/src/utils/status.ts` 的 `STATUS_COLOR_MAP` 键
 *
 * 只做盘点与覆盖率统计，不生成枚举、不改代码。覆盖判定使用 DB CHECK 值并集；
 * 业务 FSM 状态多数不在 CHECK 内，因此“未覆盖”是待确认清单，不是立即失败。
 *
 * 用法：
 *   node scripts/ci/dump-status-code-inventory.mjs
 *   node scripts/ci/dump-status-code-inventory.mjs --check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[status-code]";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG = path.join(ROOT, "docs/database/status-check-catalog.json");
const OUT = path.join(ROOT, "docs/database/status-code-inventory.json");
const FRONTEND_STATUS = path.join(ROOT, "apps/web/src/utils/status.ts");

function snake(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith(".rs")) files.push(full);
  }
  return files;
}

function moduleOf(file) {
  const rel = path.relative(ROOT, file);
  const parts = rel.split(path.sep);
  if (parts[0] === "svc") return parts[1];
  if (parts[0] === "lib") return `lib/${parts[1]}`;
  return parts[0];
}

function parseRustEnums() {
  const files = [...walk(path.join(ROOT, "svc")), ...walk(path.join(ROOT, "lib"))];
  const enums = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const re = /pub enum\s+(\w*Status\w*)\s*\{([\s\S]*?)\n\}/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      const body = m[2];
      const renameAll = /#\[serde\(rename_all\s*=\s*"([^"]+)"\)\]/.exec(body);
      const values = [];
      const lines = body.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line || line.startsWith("//") || line.startsWith("#")) continue;
        const variant = /^([A-Z]\w*)\s*(?:[({=,]|$)/.exec(line);
        if (!variant) continue;
        let explicit = null;
        for (let j = i - 1; j >= 0; j -= 1) {
          const prev = lines[j].trim();
          if (!prev || prev.startsWith("//")) continue;
          if (!prev.startsWith("#[")) break;
          const rename = /#\[serde\(rename\s*=\s*"([^"]+)"\)\]/.exec(prev);
          if (rename) explicit = rename[1];
        }
        const value = explicit ?? (renameAll?.[1] === "snake_case" ? snake(variant[1]) : variant[1]);
        if (!values.includes(value)) values.push(value);
      }
      enums.push({
        module: moduleOf(file),
        file: path.relative(ROOT, file),
        name,
        values: values.sort(),
        normalized: [...new Set(values.map((v) => snake(v)))].sort(),
      });
    }
  }
  return enums.sort((a, b) => `${a.file}:${a.name}`.localeCompare(`${b.file}:${b.name}`));
}

function parseFrontendStatuses() {
  if (!fs.existsSync(FRONTEND_STATUS)) return [];
  const src = fs.readFileSync(FRONTEND_STATUS, "utf8");
  const start = src.indexOf("STATUS_COLOR_MAP");
  if (start < 0) return [];
  const open = src.indexOf("{", start);
  const close = src.indexOf("\n};", open);
  if (open < 0 || close < 0) return [];
  const body = src.slice(open + 1, close);
  const keys = [];
  const re = /^\s*(?:'([^']+)'|"([^"]+)"|(\w+))\s*:/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    const key = m[1] ?? m[2] ?? m[3];
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys.sort();
}

function main() {
  const check = process.argv.includes("--check");
  if (!fs.existsSync(CATALOG)) {
    console.error(`${TAG} FAIL: 缺少 ${path.relative(ROOT, CATALOG)}，先跑 B1 目录`);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const dbValues = new Set([
    ...catalog.constraints.flatMap((c) => c.values),
    ...(catalog.enum_types ?? []).flatMap((e) => e.values),
  ]);
  const enums = parseRustEnums();
  const frontendKeys = parseFrontendStatuses();

  const enumValues = [...new Set(enums.flatMap((e) => e.normalized))].sort();
  const enumUncovered = enumValues.filter((v) => !dbValues.has(v));
  const frontendUncovered = frontendKeys.filter((v) => !dbValues.has(v));
  const inventory = {
    inventory_version: 1,
    source: "Rust pub enum *Status* + apps/web STATUS_COLOR_MAP; coverage vs status-check-catalog",
    stats: {
      db_check_constraints: catalog.constraints.length,
      db_enum_types: catalog.enum_types?.length ?? 0,
      db_check_values: dbValues.size,
      rust_enums: enums.length,
      rust_enum_values: enumValues.length,
      rust_values_not_in_db_check: enumUncovered.length,
      frontend_status_keys: frontendKeys.length,
      frontend_keys_not_in_db_check: frontendUncovered.length,
    },
    enums,
    frontend: {
      file: "apps/web/src/utils/status.ts",
      keys: frontendKeys,
    },
    not_in_db_check: {
      rust_values: enumUncovered,
      frontend_keys: frontendUncovered,
    },
  };
  const body = `${JSON.stringify(inventory, null, 2)}\n`;

  if (check) {
    if (!fs.existsSync(OUT)) {
      console.error(`${TAG} FAIL: ${path.relative(ROOT, OUT)} 不存在，先不带 --check 生成`);
      process.exit(1);
    }
    if (fs.readFileSync(OUT, "utf8") !== body) {
      console.error(`${TAG} FAIL: 代码侧状态盘点与仓库不一致，重跑后复核并提交`);
      process.exit(1);
    }
    console.log(
      `${TAG} PASS: ${enums.length} 个 Rust 枚举 / ${frontendKeys.length} 个前端状态键与盘点一致`,
    );
    return;
  }

  fs.writeFileSync(OUT, body);
  console.log(
    `${TAG} WROTE: ${enums.length} 个 Rust 枚举（${enumValues.length} 值，${enumUncovered.length} 不在 DB CHECK）+ ${frontendKeys.length} 个前端键（${frontendUncovered.length} 不在 DB CHECK）`,
  );
}

main();
