#!/usr/bin/env node
/**
 * W5-B B3 试点：finance 凭证状态常量由 DB ENUM 生成
 *
 * 单一源：docs/database/status-check-catalog.json 的 public.voucher_status
 * 生成物：apps/web/src/components/finance/generated/voucherStatus.ts
 *
 * 用法：
 *   node scripts/ci/gen-finance-voucher-status.mjs
 *   node scripts/ci/gen-finance-voucher-status.mjs --check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[gen-voucher-status]";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG = path.join(ROOT, "docs/database/status-check-catalog.json");
const OUT = path.join(
  ROOT,
  "apps/web/src/components/finance/generated/voucherStatus.ts",
);

function build() {
  if (!fs.existsSync(CATALOG)) {
    throw new Error(`缺少 ${path.relative(ROOT, CATALOG)}，先跑 B1 目录`);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const type = (catalog.enum_types ?? []).find(
    (e) => e.schema === "public" && e.name === "voucher_status",
  );
  if (!type) throw new Error("DB 目录缺少 public.voucher_status");
  const values = [...type.values].sort();
  return [
    "// 由 scripts/ci/gen-finance-voucher-status.mjs 生成，勿手改。",
    "// 单一源：docs/database/status-check-catalog.json · public.voucher_status",
    "export const VOUCHER_STATUS_VALUES = [",
    ...values.map((v) => `  '${v}',`),
    "] as const;",
    "",
    "export type VoucherStatus = (typeof VOUCHER_STATUS_VALUES)[number];",
    "",
    "export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {",
    ...values.map((v) => `  ${v}: 'finance.voucher_detail_page.status_${v}',`),
    "};",
    "",
  ].join("\n");
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
      console.error(`${TAG} 修复：node scripts/ci/gen-finance-voucher-status.mjs`);
      process.exit(1);
    }
    console.log(`${TAG} PASS: 凭证状态常量与 public.voucher_status 一致`);
    return;
  }
  fs.writeFileSync(OUT, body);
  console.log(`${TAG} WROTE: ${path.relative(ROOT, OUT)}`);
}

main();
