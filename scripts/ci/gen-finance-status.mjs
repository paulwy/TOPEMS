#!/usr/bin/env node
/**
 * W5-B B3：finance 状态常量由 DB 单一源生成（PostgreSQL ENUM 五列）
 *
 * 单一源：docs/database/status-check-catalog.json · enum_types(public.*)
 * 生成物：apps/web/src/components/finance/generated/financeStatus.ts
 *
 * 用法：
 *   node scripts/ci/gen-finance-status.mjs
 *   node scripts/ci/gen-finance-status.mjs --check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[gen-finance-status]";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG = path.join(ROOT, "docs/database/status-check-catalog.json");
const OUT = path.join(
  ROOT,
  "apps/web/src/components/finance/generated/financeStatus.ts",
);

const SPECS = [
  { db: "voucher_status", prefix: "VOUCHER_STATUS", type: "VoucherStatus", i18n: "voucher" },
  { db: "approval_status", prefix: "APPROVAL_STATUS", type: "ApprovalStatus", i18n: "approval" },
  { db: "match_status", prefix: "MATCH_STATUS", type: "MatchStatus", i18n: "match" },
  { db: "period_status", prefix: "PERIOD_STATUS", type: "PeriodStatus", i18n: "period" },
  {
    db: "reconciliation_status",
    prefix: "RECONCILIATION_STATUS",
    type: "ReconciliationStatus",
    i18n: "reconciliation",
  },
];

function build() {
  if (!fs.existsSync(CATALOG)) {
    throw new Error(`缺少 ${path.relative(ROOT, CATALOG)}，先跑 B1 目录`);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const enumTypes = catalog.enum_types ?? [];
  const lines = [
    "// 由 scripts/ci/gen-finance-status.mjs 生成，勿手改。",
    "// 单一源：docs/database/status-check-catalog.json · public PostgreSQL ENUM",
  ];
  for (const spec of SPECS) {
    const type = enumTypes.find((e) => e.schema === "public" && e.name === spec.db);
    if (!type) throw new Error(`DB 目录缺少 public.${spec.db}`);
    const values = [...type.values].sort();
    const singleLine = `export const ${spec.prefix}_VALUES = [${values
      .map((v) => `'${v}'`)
      .join(", ")}] as const;`;
    const valueLines =
      singleLine.length <= 100
        ? [singleLine]
        : [
            `export const ${spec.prefix}_VALUES = [`,
            ...values.map((v) => `  '${v}',`),
            "] as const;",
          ];
    lines.push(
      "",
      ...valueLines,
      "",
      `export type ${spec.type} = (typeof ${spec.prefix}_VALUES)[number];`,
      "",
      `export const ${spec.prefix}_LABELS: Record<${spec.type}, string> = {`,
      ...values.map((v) => `  ${v}: 'finance.status.${spec.i18n}_${v}',`),
      "};",
    );
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const check = process.argv.includes("--check");
  let body;
  try {
    body = build();
  } catch (e) {
    console.error(`${TAG} FAIL: ${e.message}`);
    process.exit(1);
  }
  if (check) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, "utf8") !== body) {
      console.error(`${TAG} FAIL: ${path.relative(ROOT, OUT)} 与 DB 目录不一致`);
      console.error(`${TAG} 修复：node scripts/ci/gen-finance-status.mjs`);
      process.exit(1);
    }
    console.log(`${TAG} PASS: finance 状态常量与 5 个 DB ENUM 一致`);
    return;
  }
  fs.writeFileSync(OUT, body);
  console.log(`${TAG} WROTE: ${path.relative(ROOT, OUT)}`);
}

main();
