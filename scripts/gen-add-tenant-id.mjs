#!/usr/bin/env node
/**
 * V68.1-5: Code generator for add_tenant_id migrations (v3 template)
 *
 * Usage:
 *   node scripts/gen-add-tenant-id.mjs <service-name> [schemas]
 *
 * Examples:
 *   # 1. New service: give service folder name; schemas default to plugin_<service>
 *      node scripts/gen-add-tenant-id.mjs srm        → plugin_srm
 *      node scripts/gen-add-tenant-id.mjs wms        → plugin_wms
 *
 *   # 2. Custom schemas (comma-separated, preserves order)
 *      node scripts/gen-add-tenant-id.mjs crm crm,plugin_crm
 *      node scripts/gen-add-tenant-id.mjs unified-core unified_core,iam,doc,flow,notification,mail
 *
 * Output:
 *   svc/<service>/migrations/YYYYMMDDHHMMSS_add_tenant_id.sql
 *
 * Timestamp rules (strict monotonic vs service's last migration):
 *   - Reads all existing *.sql in svc/<service>/migrations/ sorted
 *   - Picks max 14-digit timestamp
 *   - Adds +1 second
 *   - If same as current wall clock, uses wall clock + 1 second
 *   - Guarantees newly generated file sorts LAST in that service's migrations
 *
 * Idempotent: if a migration *_add_tenant_id*.sql already exists for this service,
 * exits with WARNING 0 (non-fatal) unless --force flag given.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname as pDirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- Args ---
const args = process.argv.slice(2).filter(a => !a.startsWith("-"));
const force = process.argv.includes("--force");

if (args.length < 1) {
  console.error(`
Usage: node scripts/gen-add-tenant-id.mjs <service> [schemas]

  <service>    Folder name under svc/ (e.g. srm, wms, crm, unified-core)
  [schemas]    Optional comma-separated list of target schemas.
               Default: plugin_<service>  (with hyphens→underscores)

Flags:
  --force      Overwrite existing add_tenant_id migration
  --dry-run    Print result path and content without writing files

Examples:
  node scripts/gen-add-tenant-id.mjs srm
  node scripts/gen-add-tenant-id.mjs crm crm,plugin_crm
  node scripts/gen-add-tenant-id.mjs unified-core unified_core,iam,doc
`);
  process.exit(1);
}

const service = args[0];
let schemas = args[1]
  ? args[1].split(",").map(s => s.trim()).filter(Boolean)
  : ["plugin_" + service.replace(/-/g, "_")];

const dryRun = process.argv.includes("--dry-run");

// --- Paths ---
const svcDir = join(ROOT, "svc", service);
if (!existsSync(svcDir) && !dryRun) {
  console.error(`[ERROR] Service directory not found: ${svcDir}`);
  process.exit(2);
}

const mgDir = join(svcDir, "migrations");
if (!dryRun) mkdirSync(mgDir, { recursive: true });

// --- Check existing add_tenant_id migration ---
let existingFile = null;
if (existsSync(mgDir)) {
  for (const f of readdirSync(mgDir)) {
    if (/add_tenant_id/i.test(f) && f.endsWith(".sql")) {
      existingFile = f;
      break;
    }
  }
}
if (existingFile && !force) {
  console.log(`⚠️  Service ${service} already has add_tenant_id migration:
       svc/${service}/migrations/${existingFile}
     Add --force to regenerate.`);
  process.exit(0);
}

// --- Compute strictly monotonic timestamp for THIS service ---
function nextTimestamp() {
  let maxTs = 0n;
  if (existsSync(mgDir)) {
    const files = readdirSync(mgDir)
      .filter(f => f.endsWith(".sql"))
      .sort();
    for (const f of files) {
      const m = f.match(/^(\d{14})/) || f.match(/^(\d{12})/) || f.match(/^(\d{8})/);
      if (!m) continue;
      let ts = m[1];
      while (ts.length < 14) ts += "0";
      const big = BigInt(ts);
      if (big > maxTs) maxTs = big;
    }
  }
  // Wall clock timestamp (UTC-ish local) formatted
  const now = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const nowTs = BigInt(
    pad(now.getFullYear(), 4) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
  const base = maxTs > nowTs ? maxTs : nowTs;
  const next = base + 1n;
  return next.toString();
}

const timestamp = nextTimestamp();
const fileName = `${timestamp}_add_tenant_id.sql`;

// --- Render template ---
const TEMPLATE = readFileSync(
  join(ROOT, "database", "migrations", ".snippets", "add_tenant_id_template.sql"),
  "utf8"
);

const schemaArrayLiteral = schemas.map(s => `'${s}'`).join(", ");
const dateStr = new Date().toISOString().slice(0, 10);

let rendered = TEMPLATE
  .replace("{{SERVICE}}", service)
  .replace("{{DATE}}", dateStr)
  .replace("{{SCHEMA_ARRAY}}", schemaArrayLiteral);

// {{SCHEMAS}} in the comment block (non-functional, for readability):
rendered = rendered.replace("{{SCHEMAS}}", schemas.join(", "));

const outPath = join(mgDir, fileName);

if (dryRun) {
  console.log(`=== DRY RUN ===
Service:        ${service}
Schemas:        ${schemas.join(", ")}
File:           svc/${service}/migrations/${fileName}
Timestamp:      ${timestamp} (strict monotonic vs previous in-service max)

Generated content:
=== BEGIN ===
`);
  process.stdout.write(rendered);
  console.log("=== END ===");
} else {
  writeFileSync(outPath, rendered);
  console.log(`✅ Generated:
     svc/${service}/migrations/${fileName}
     Schemas: [${schemas.join(", ")}]
     Timestamp: ${timestamp} (strict monotonic +1s)`);

  // Run migration name gate as a sanity check (only service-specific)
  const { spawnSync } = require("node:child_process");
  const { status } = spawnSync("node", ["scripts/check-migration-names.mjs"], {
    cwd: ROOT, stdio: "inherit",
  });
  if (status !== 0) console.error("\n[WARN] check-migration-names returned non-zero (see above)");
}
