#!/usr/bin/env node
/**
 * V68.1-3 Phase 2+3 Generator
 *
 * Generates:
 * 1. SQL migration: ALTER TABLE ... ADD COLUMN IF NOT EXISTS deleted_at
 * 2. Rust DELETE→UPDATE conversion map (JSON)
 * 3. Rust CREATE TABLE patch list (for runtime DDL)
 *
 * Exclusions (keep hard DELETE):
 * - Junction/linking tables (composite PK: user_roles, role_permissions, etc.)
 * - Session/token expiry cleanup
 * - Materialized view refresh (mv_*)
 * - Migration locks
 * - Cache/temp tables
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname, dirname as pDirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = pDirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// === Exclude patterns (tables that should KEEP hard DELETE) ===
const EXCLUDE_TABLES = new Set([
  // Junction/linking tables (relationship tables - hard delete is correct)
  "core_user_roles",
  "core_role_permissions",
  "core_user_roles",
  "document_categories",
  "iam_user_positions",
  "iam_position_roles",
  "iam_position_permissions",
  "rs_project_members",
  "rs_document_relations",
  "pm_project_members",
  "plugin_pm_acceptance_items",
  "plugin_pm_budget_items",
  "plugin_pm_settlement_items",
  "core_chat_members",
  "material_issue_items",       // child of material_issues, cascade delete
  "material_return_items",
  "wms_replenishment_order_items",
  "wms_transfer_order_items",
  "scm_purchase_contract_items",
  "scm_purchase_items",
  "pm_contract_milestones",
  "pm_project_milestones",
  "pm_project_phases",
  "pm_project_expenses",
  "pm_project_documents",
  "rs_project_milestones",
  "rs_project_phases",
  "process_flow_steps",         // child of process_flows
  "process_route_steps",        // child of process_routes
  "bom_items",                  // child of material_boms
  "map_layers",                 // child of maps
  "map_markers",
  "transfer_items",             // child of transfers
  "plugin_pm_document_folders",
  "finance_voucher_template_lines",  // child line items
  "core_finance_voucher_lines",
  "core_finance_payment_items",
  "core_finance_approval_nodes",
  "qa_fmea_items",
  "qa_apqp_phases",
  "qa_apqp_tasks",
  "qa_apqp_risks",
  "plugin_hrm_contract_renewals",
  "plugin_hrm_performance_goals",
  "plugin_hrm_training_records",
  "plugin_hrm_training_courses",
  "plugin_crm_customer_tags",
  "crm_customer_tags",
  "wms_replenishment_suggestions",
  "material_requirements",
  "erp_production_orders",
  "core_mobile_offline_records",
  "device_locations",
  "location_photos",
  "barcode_scans",
  "photo_uploads",
  "patrol_records",
  "vehicle_requests",

  // Session/token cleanup (expiry-based hard delete is correct)
  "iam_sessions",
  "unified_core_password_resets",
  "core_migration_locks",

  // Materialized views (refresh = DELETE + INSERT)
  "mv_voucher_summary",
  "mv_receivable_aging",

  // Sync records (data sync, hard delete for re-sync)
  "qa_ehs_sync_records",
  "qa_lims_sync_records",
  "qa_qms_sync_records",
  "analytics_sync_records",
  "core_mobile_offline_records",

  // Dynamic/schema registry tables (structural, not business data)
  "schema_registry",
  "dynamic_data",
]);

// === Schema mapping by table prefix ===
function inferSchema(tableKey, svc) {
  const t = tableKey.toLowerCase();
  // plugin_ prefixed tables
  if (t.startsWith("plugin_")) {
    if (t.startsWith("plugin_erp_")) return "plugin_erp";
    if (t.startsWith("plugin_hrm_")) return "plugin_hrm";
    if (t.startsWith("plugin_crm_")) return "plugin_crm";
    if (t.startsWith("plugin_pm_")) return "plugin_pm";
    if (t.startsWith("plugin_srm_")) return "plugin_srm";
    if (t.startsWith("plugin_gis_")) return "plugin_gis";
    if (t.startsWith("plugin_ai_")) return "plugin_ai";
    return t.replace(/^(plugin_\w+?)_.*$/, "$1");
  }
  // qa_ prefixed tables (quality: qms, lims, ehs)
  if (t.startsWith("qa_")) {
    if (t.startsWith("qa_lims_")) return "plugin_lims";
    if (t.startsWith("qa_lab_")) return "plugin_lims";
    if (t.startsWith("qa_ehs_")) return "plugin_ehs";
    if (t.startsWith("qa_qms_")) return "plugin_qms";
    if (t.startsWith("qa_apqp_")) return "plugin_qms";
    if (t.startsWith("qa_corrective_")) return "plugin_qms";
    if (t.startsWith("qa_eightd_")) return "plugin_qms";
    if (t.startsWith("qa_fmea_")) return "plugin_qms";
    if (t.startsWith("qa_quality_")) return "plugin_qms";
    if (t.startsWith("qa_standards")) return "plugin_qms";
    if (t.startsWith("qa_spc_")) return "plugin_qms";
    if (t.startsWith("qa_alert_")) return "plugin_qms";
    return "plugin_qms";
  }
  // rs_ prefixed (R&D)
  if (t.startsWith("rs_")) return "rs";
  // scm_ prefixed
  if (t.startsWith("scm_")) return "plugin_scm";
  // wms_ prefixed
  if (t.startsWith("wms_")) return "plugin_wms";
  // hrm_ prefixed (non-plugin)
  if (t.startsWith("hrm_")) return "plugin_hrm";
  // crm_ prefixed (non-plugin)
  if (t.startsWith("crm_")) return "plugin_crm";
  // finance_ prefixed
  if (t.startsWith("finance_")) return "erp";
  if (t.startsWith("core_finance_")) return "erp";
  // analytics_ prefixed
  if (t.startsWith("analytics_")) return "plugin_bi";
  // pdm_ prefixed
  if (t.startsWith("pdm_")) return "plugin_pdm";
  // pm_ prefixed (non-plugin)
  if (t.startsWith("pm_")) return "plugin_pm";
  // erp_ prefixed
  if (t.startsWith("erp_")) return "plugin_erp";
  // mes tables (no prefix)
  const mesTables = new Set([
    "equipment", "equipment_oee", "material_boms", "material_issues",
    "material_returns", "process_flows", "process_routes", "production_orders",
    "production_processes", "production_records", "production_schedules",
    "quality_inspections", "quality_patrols", "quality_patrol_items",
    "quality_standard_values", "quality_standards", "teams", "wips",
    "work_orders", "work_reports", "work_stations",
  ]);
  if (mesTables.has(t)) return "plugin_mes";
  // mobile tables
  const mobileTables = new Set([
    "barcode_scans", "media_files", "patrol_records", "photo_uploads",
  ]);
  if (mobileTables.has(t)) return "plugin_mobile";
  // gis tables
  const gisTables = new Set([
    "business_locations", "maps", "map_layers", "map_markers",
    "pipelines", "warehouse_locations", "device_locations", "location_photos",
  ]);
  if (gisTables.has(t)) return "plugin_gis";
  // erp business tables (no prefix)
  const erpTables = new Set([
    "announcements", "assets", "fixed_assets", "meeting_rooms",
    "meeting_bookings", "office_supplies", "opening_balances", "vehicles",
    "leave_requests", "customers", "inventory", "materials",
    "purchase_orders", "sales_orders", "suppliers",
    "expenses", "receivables", "payables",
  ]);
  if (erpTables.has(t)) return "plugin_erp";
  // core_ prefixed tables
  if (t.startsWith("core_")) {
    // Core platform tables
    if (t.startsWith("core_finance_")) return "erp";
    if (t.startsWith("core_doc_")) return "unified_core";
    if (t.startsWith("core_mobile_")) return "plugin_mobile";
    if (t.startsWith("core_tenant")) return "public";
    if (t.startsWith("core_menu")) return "public";
    if (t.startsWith("core_dict")) return "public";
    if (t.startsWith("core_ticket")) return "public";
    if (t.startsWith("core_backup")) return "public";
    if (t.startsWith("core_workflow")) return "flow";
    if (t.startsWith("core_api_")) return "public";
    if (t.startsWith("core_feedbacks")) return "public";
    if (t.startsWith("core_notifications")) return "public";
    if (t.startsWith("core_notification_templates")) return "public";
    if (t.startsWith("core_knowledge_")) return "plugin_ai";
    if (t.startsWith("core_core_")) return "public"; // false positive double prefix
    // Default core tables
    if (["core_users", "core_roles", "core_login_logs"].includes(t)) return "unified_core";
    return "public";
  }
  // unified_core_ prefixed
  if (t.startsWith("unified_core_")) return "unified_core";
  // iam_ prefixed (non-core)
  if (t.startsWith("iam_")) return "unified_core";
  // conversion_rules (integration)
  if (t === "conversion_rules") return "plugin_integration";
  // reports (analytics)
  if (t === "reports" || t === "report_schedules" || t === "report_subscriptions" || t === "report_templates") return "plugin_bi";
  // plugin_hrm_vectors (shared-ai)
  if (t === "plugin_hrm_vectors") return "plugin_ai";

  return null; // unknown
}

// --- Reuse scanner logic to get table list ---
const tablesWithDeletedAt = new Set();
const allTables = new Map();

function scanSql(p) {
  const src = readFileSync(p, "utf8");
  const buf = "\n" + src + "\n";
  const stmts = [];
  {
    let start = 1, inStr = null, esc = false, lc = false, bc = false, inDol = false;
    for (let i = 1; i < buf.length; i++) {
      const ch = buf[i], n = buf[i+1];
      if (lc) { if (ch === "\n") lc = false; continue; }
      if (bc) { if (ch === "*" && n === "/") { bc = false; i++; } continue; }
      if (inDol) { if (ch === "$" && buf.slice(i,i+3) === "$$") { inDol = false; i += 2; } continue; }
      if (inStr) { if (esc){esc=false;continue;} if (ch === "\\") { esc=true; continue; } if (ch === inStr) inStr = null; continue; }
      if ((ch === "-" && n === "-") || (ch === "/" && n === "/")) { lc = true; i++; continue; }
      if (ch === "/" && n === "*") { bc = true; i++; continue; }
      if (ch === "$" && buf.slice(i,i+3) === "$$") { inDol = true; i += 2; continue; }
      if (ch === "'" || ch === '"' || ch === "`") { inStr = ch; continue; }
      if (ch === ";") { stmts.push(buf.slice(start, i)); start = i + 1; }
    }
    if (start < buf.length - 1) stmts.push(buf.slice(start, -1));
  }
  for (const sRaw of stmts) {
    const s = sRaw.replace(/^--[^\n]*\n/gm, '').trim();
    if (!s) continue;
    const h = s.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:([\w]+)\.)?([\w]+)\s*\(/i);
    if (!h) continue;
    const pg = (h[1] || "").toLowerCase();
    const tbl = h[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    allTables.set(tableKey, { schema: pg, name: tbl, file: p });
    if (/\bdeleted_at\b/i.test(s)) {
      tablesWithDeletedAt.add(tableKey);
    }
  }
}
function walkSql(dir, fn) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkSql(p, fn);
    else if (e.isFile() && extname(p) === ".sql" && basename(pDirname(p)) === "migrations") fn(p);
    else if (e.isFile() && extname(p) === ".sql" && p.includes("/init/")) fn(p);
    else if (e.isFile() && extname(p) === ".sql" && p.includes("/database/migrations/")) fn(p);
  }
}
for (const r of [join(ROOT,"svc"), join(ROOT,"lib"), join(ROOT,"database")]) {
  try { statSync(r); walkSql(r, scanSql); } catch {}
}

// --- Scan Rust for DELETE FROM ---
const deleteTables = new Map();

function scanRust(p) {
  const src = readFileSync(p, "utf8");
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/DELETE\s+FROM\s+(?:([\w]+)\.)?([\w]+)/i);
    if (!m) continue;
    if (p.includes("/tests/") || p.includes("#[test]")) continue;
    const pg = (m[1] || "").toLowerCase();
    const tbl = m[2].toLowerCase();
    const tableKey = pg ? `${pg}_${tbl}` : tbl;
    if (!deleteTables.has(tableKey)) deleteTables.set(tableKey, []);
    deleteTables.get(tableKey).push({ file: p.replace(ROOT + "/", ""), line: i + 1, stmt: line.trim() });
  }
}
function walkRust(dir, fn) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "target" || e.name === "node_modules") continue;
      walkRust(p, fn);
    } else if (e.isFile() && extname(p) === ".rs") fn(p);
  }
}
walkRust(join(ROOT, "svc"), scanRust);
walkRust(join(ROOT, "lib"), scanRust);

// --- Cross-reference ---
const needsMigration = [];
const hasDeletedAtButStillDeletes = [];

for (const [tableKey, occurrences] of deleteTables) {
  const hasDeletedAt = tablesWithDeletedAt.has(tableKey) ||
    [...tablesWithDeletedAt].some(t => t.endsWith("." + tableKey) || t === tableKey);

  if (hasDeletedAt) {
    hasDeletedAtButStillDeletes.push({ tableKey, count: occurrences.length, occurrences });
  } else {
    const sqlTable = allTables.get(tableKey);
    needsMigration.push({ tableKey, count: occurrences.length, sqlTable, occurrences });
  }
}

// --- Generate outputs ---

// 1. SQL migration for Phase 2 tables (add deleted_at)
const phase2Tables = needsMigration
  .filter(t => !EXCLUDE_TABLES.has(t.tableKey))
  .map(t => {
    const svc = t.occurrences[0].file.split("/")[1] || "?";
    const schema = t.sqlTable?.schema || inferSchema(t.tableKey, svc);
    // For tables with SQL definitions, use the actual table name from SQL.
    // For runtime DDL tables (NO SQL TABLE FOUND), the table name IS the tableKey
    // (the table is created without schema prefix, landing in the service's search_path).
    const tableName = t.sqlTable?.name || t.tableKey;
    return {
      tableKey: t.tableKey,
      schema,
      tableName,
      svc,
      hasSql: !!t.sqlTable,
      occurrences: t.occurrences,
    };
  })
  .filter(t => t.schema); // only include tables with known schema

// Deduplicate by schema.table
const seen = new Set();
const migrationTables = [];
for (const t of phase2Tables) {
  const full = `${t.schema}.${t.tableName}`;
  if (seen.has(full)) continue;
  seen.add(full);
  migrationTables.push(t);
}

// Generate SQL migration
let sql = `-- ================================================================================
-- V68.1-3 Phase 2: Add deleted_at column to hard-delete tables
-- Generated: 2026-08-08
-- Tables: ${migrationTables.length}
-- ================================================================================

`;

// Group by schema
const bySchema = new Map();
for (const t of migrationTables) {
  if (!bySchema.has(t.schema)) bySchema.set(t.schema, []);
  bySchema.get(t.schema).push(t);
}

for (const [schema, tables] of [...bySchema.entries()].sort()) {
  sql += `-- === Schema: ${schema} (${tables.length} tables) ===\n`;
  for (const t of tables) {
    sql += `ALTER TABLE IF EXISTS ${schema}.${t.tableName} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;\n`;
  }
  sql += "\n";
}

// Add partial indexes for tables with deleted_at
sql += `-- === Partial indexes for soft-delete queries ===\n`;
for (const t of migrationTables) {
  const idxName = `idx_${t.schema}_${t.tableName}_deleted_at`.substring(0, 63);
  sql += `CREATE INDEX IF NOT EXISTS ${idxName} ON ${t.schema}.${t.tableName}(deleted_at) WHERE deleted_at IS NULL;\n`;
}

writeFileSync(join(ROOT, "database/migrations/20260808000001_v68_1_3_add_deleted_at.sql"), sql);
console.log(`[SQL Migration] Generated ${migrationTables.length} ALTER TABLE statements`);

// 2. Rust DELETE→UPDATE conversion map (Phase 2 + Phase 3)
const convertList = [];
for (const t of [...needsMigration, ...hasDeletedAtButStillDeletes]) {
  if (EXCLUDE_TABLES.has(t.tableKey)) continue;
  for (const o of t.occurrences) {
    convertList.push({
      file: o.file,
      line: o.line,
      stmt: o.stmt,
      tableKey: t.tableKey,
    });
  }
}

writeFileSync(join(ROOT, "scripts/v68-1-3/convert_map.json"), JSON.stringify(convertList, null, 2));
console.log(`[Convert Map] ${convertList.length} DELETE statements to convert`);

// 3. Summary
console.log(`\n=== Summary ===`);
console.log(`Phase 2 tables (SQL migration): ${migrationTables.length}`);
console.log(`Excluded tables: ${needsMigration.filter(t => EXCLUDE_TABLES.has(t.tableKey)).length + hasDeletedAtButStillDeletes.filter(t => EXCLUDE_TABLES.has(t.tableKey)).length}`);
console.log(`DELETE→UPDATE conversions: ${convertList.length}`);
console.log(`Schemas: ${[...bySchema.keys()].sort().join(", ")}`);
