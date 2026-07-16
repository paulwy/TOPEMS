#!/usr/bin/env python3
"""Generate PostgreSQL migration script to add tenant_id and RLS policies."""

import os
import subprocess
from collections import OrderedDict

# Output file
OUTPUT_FILE = "/Users/air/TOPEMS/svc/unified-core/migrations/20260717000000_add_tenant_id_to_all_tables.sql"

# Skip rules
SKIP_SCHEMAS = {"shared"}
SKIP_PUBLIC_TABLES = {"_sqlx_migrations", "spatial_ref_sys", "shortcuts", "configurations", "user_settings"}

def should_skip(schema, table):
    if schema in SKIP_SCHEMAS:
        return True
    if schema == "public" and table in SKIP_PUBLIC_TABLES:
        return True
    if schema == "core" and table.startswith("core_plugin_"):
        return True
    return False

def sanitize_index_name(schema, table):
    name = f"idx_{schema}_{table}_tenant_id"
    if len(name) > 63:
        name = name[:63]
    return name

def main():
    # Query database for tables missing tenant_id
    result = subprocess.run(
        ["psql", "-h", "localhost", "-U", "topems", "-d", "topems", "-t", "-A", "-F", "|", "-c",
         """SELECT t.table_schema, t.table_name
FROM information_schema.tables t
WHERE t.table_schema NOT IN ('pg_catalog','information_schema','topems_shared')
  AND t.table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = t.table_schema
      AND c.table_name = t.table_name
      AND c.column_name = 'tenant_id'
  )
ORDER BY t.table_schema, t.table_name;"""],
        env={**os.environ, "PGPASSWORD": "topems_secret"},
        capture_output=True, text=True
    )

    tables = []
    for line in result.stdout.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split("|")
        if len(parts) == 2:
            schema, table = parts[0].strip(), parts[1].strip()
            tables.append((schema, table))

    # Apply skip rules
    filtered = [(s, t) for s, t in tables if not should_skip(s, t)]
    skipped = [(s, t) for s, t in tables if should_skip(s, t)]

    # Group by schema
    by_schema = OrderedDict()
    for schema, table in filtered:
        if schema not in by_schema:
            by_schema[schema] = []
        by_schema[schema].append(table)

    # Generate SQL
    lines = []
    lines.append("-- ============================================================================")
    lines.append("-- Migration: Add tenant_id column and RLS policies to all business tables")
    lines.append("-- Date: 2026-07-17")
    lines.append("-- Description: Add tenant_id UUID column, create indexes, and enable RLS")
    lines.append("--              with tenant isolation policies for multi-tenancy support.")
    lines.append("-- ============================================================================")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")

    # Log skipped tables
    lines.append("-- ============================================================================")
    lines.append("-- SKIPPED TABLES (no tenant_id needed)")
    lines.append("-- ============================================================================")
    for s, t in skipped:
        reason = "shared schema" if s in SKIP_SCHEMAS else \
                 "core_plugin_* in core schema" if s == "core" and t.startswith("core_plugin_") else \
                 "user preferences / system table"
        lines.append(f"--   SKIP: {s}.{t} ({reason})")
    lines.append("")

    # Phase 1: Add columns and indexes
    lines.append("-- ============================================================================")
    lines.append("-- PHASE 1: Add tenant_id column and create indexes")
    lines.append("-- ============================================================================")
    lines.append("")

    for schema in by_schema:
        tables_in_schema = by_schema[schema]
        lines.append(f"-- -----------------------------------------------------------------------")
        lines.append(f"-- Schema: {schema} ({len(tables_in_schema)} tables)")
        lines.append(f"-- -----------------------------------------------------------------------")
        lines.append("")

        for table in tables_in_schema:
            idx_name = sanitize_index_name(schema, table)
            lines.append(f"-- {schema}.{table}")
            lines.append(f"ALTER TABLE {schema}.{table} ADD COLUMN IF NOT EXISTS tenant_id UUID;")
            lines.append(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {schema}.{table} (tenant_id);")
            lines.append("")

    # Phase 2: Enable RLS and create policies
    lines.append("-- ============================================================================")
    lines.append("-- PHASE 2: Enable Row-Level Security and create tenant isolation policies")
    lines.append("-- ============================================================================")
    lines.append("")

    for schema in by_schema:
        tables_in_schema = by_schema[schema]
        lines.append(f"-- -----------------------------------------------------------------------")
        lines.append(f"-- Schema: {schema} ({len(tables_in_schema)} tables)")
        lines.append(f"-- -----------------------------------------------------------------------")
        lines.append("")

        for table in tables_in_schema:
            lines.append(f"-- {schema}.{table}")
            lines.append(f"ALTER TABLE {schema}.{table} ENABLE ROW LEVEL SECURITY;")
            lines.append("")
            lines.append(f"DO $$")
            lines.append(f"BEGIN")
            lines.append(f"  IF NOT EXISTS (")
            lines.append(f"    SELECT 1 FROM pg_policies")
            lines.append(f"    WHERE schemaname = '{schema}' AND tablename = '{table}' AND policyname = '{table}_tenant_policy'")
            lines.append(f"  ) THEN")
            lines.append(f"    CREATE POLICY {table}_tenant_policy ON {schema}.{table}")
            lines.append(f"      FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);")
            lines.append(f"  END IF;")
            lines.append(f"END $$;")
            lines.append("")

    # Phase 3: Verification
    lines.append("-- ============================================================================")
    lines.append("-- PHASE 3: Verification")
    lines.append("-- ============================================================================")
    lines.append("")
    lines.append("DO $$")
    lines.append("DECLARE")
    lines.append("  v_with_tenant BIGINT;")
    lines.append("  v_without_tenant BIGINT;")
    lines.append("  v_total BIGINT;")
    lines.append("BEGIN")
    lines.append("  SELECT")
    lines.append("    COUNT(*) FILTER (WHERE has_tenant),")
    lines.append("    COUNT(*) FILTER (WHERE NOT has_tenant),")
    lines.append("    COUNT(*)")
    lines.append("  INTO v_with_tenant, v_without_tenant, v_total")
    lines.append("  FROM (")
    lines.append("    SELECT DISTINCT t.table_schema, t.table_name,")
    lines.append("      EXISTS (")
    lines.append("        SELECT 1 FROM information_schema.columns c")
    lines.append("        WHERE c.table_schema = t.table_schema")
    lines.append("          AND c.table_name = t.table_name")
    lines.append("          AND c.column_name = 'tenant_id'")
    lines.append("      ) AS has_tenant")
    lines.append("    FROM information_schema.tables t")
    lines.append("    WHERE t.table_schema NOT IN ('pg_catalog','information_schema','topems_shared')")
    lines.append("      AND t.table_type = 'BASE TABLE'")
    lines.append("  ) sub;")
    lines.append("")
    lines.append("  RAISE NOTICE '=== TENANT_ID MIGRATION VERIFICATION ===';")
    lines.append("  RAISE NOTICE 'Tables WITH tenant_id:    %', v_with_tenant;")
    lines.append("  RAISE NOTICE 'Tables WITHOUT tenant_id: %', v_without_tenant;")
    lines.append("  RAISE NOTICE 'Total business tables:    %', v_total;")
    lines.append("  RAISE NOTICE 'Coverage: %%%', ROUND(v_with_tenant::numeric / v_total * 100, 1);")
    lines.append("")
    lines.append("  IF v_without_tenant > 0 THEN")
    lines.append("    RAISE WARNING 'Some tables still missing tenant_id!';")
    lines.append("  ELSE")
    lines.append("    RAISE NOTICE 'All business tables have tenant_id!';")
    lines.append("  END IF;")
    lines.append("END $$;")
    lines.append("")

    lines.append("COMMIT;")
    lines.append("")

    # Write file
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        f.write("\n".join(lines))

    # Print summary
    print(f"Generated migration file: {OUTPUT_FILE}")
    print(f"Total tables missing tenant_id: {len(tables)}")
    print(f"Skipped tables: {len(skipped)}")
    print(f"Tables to migrate: {len(filtered)}")
    print(f"Schemas: {list(by_schema.keys())}")
    for schema in by_schema:
        print(f"  {schema}: {len(by_schema[schema])} tables")

if __name__ == "__main__":
    main()
