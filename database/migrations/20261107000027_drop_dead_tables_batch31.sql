-- [batch31] Drop dead tables (idempotent)
-- Created: 2026-11-07
-- Scope: drop 3 tables confirmed zero-writer / zero-reader / zero-DB-dependent.
--
-- ============================================================
-- FORENSICS SUMMARY (2026-11-07, on trunk)
-- ============================================================
-- Code grep (svc/, lib/, scripts/, apps/web/, all *.rs/*.ts/*.tsx/*.js/*.sql/*.sh/*.py):
--   * erp.core_erp_suppliers                         : 0 writers, 0 readers  (grep EXIT=1)
--   * crm.core_crm_customers                         : 0 writers, 0 readers  (grep EXIT=1)
--   * crm.customers_tenant_null_backup_20260919     : 0 references         (grep EXIT=1)
--   * erp.customers                                  : SKIPPED (see below)
--
-- DB dependency audit (information_schema / pg_depend / pg_constraint / pg_rewrite / pg_proc):
--   * No view / matview / function / trigger depends on the 3 dropped tables.
--   * No external FK references them; no FKs FROM them.
--   * Remaining pg_depend entries are internal (constraints, RLS policies,
--     column defaults, indexes like crm.idx_crm_cust_tenant) and drop automatically
--     with the table.
--
-- ------------------------------------------------------------
-- SKIPPED TABLE: erp.customers (NOT dropped in this batch)
-- ------------------------------------------------------------
-- Code readers/writers (non-exhaustive, full list from grep):
--   svc/erp/src/modules/customer.rs:145,162,180,233,279,368,456,608,655,716,777,854,921,995,1044,1051,1058,1065,1070,1110,1113
--   svc/erp/src/modules/searchable_projection.rs:46,219
--   svc/erp/src/modules/sales_order.rs:234,815
-- DB dependency:
--   erp.sales_orders.customer_id -> erp.customers (FK sales_orders_customer_id_fkey)
-- Conclusion: erp.customers is actively used by the ERP service customer CRUD and
-- by sales orders. It is NOT dead. The CSV backup
-- database/backup/batch31_erp_customers_20261107_063242.csv (6 rows) was taken but
-- the table must NOT be dropped. Leave it for a separate decision.
--
-- ============================================================
-- BACKUP (CSV, pre-drop, row counts verified 2026-11-07)
-- ============================================================
--   erp.core_erp_suppliers                       : 0 rows
--     -> database/backup/batch31_erp_core_erp_suppliers_20261107_063242.csv (header-only)
--   crm.core_crm_customers                       : 0 rows
--     -> database/backup/batch31_crm_core_crm_customers_20261107_063242.csv (header-only)
--   crm.customers_tenant_null_backup_20260919     : 177 rows
--     -> database/backup/batch31_crm_customers_backup_20260919.csv (178 lines incl. header)
--
-- ============================================================
-- ROLLBACK (restore from CSV if needed)
-- ============================================================
-- Original CREATE TABLE DDL lives in:
--   database/migrations/20260725000000_business_base_tables.sql
-- Steps:
--   1. Re-run the CREATE TABLE block for the desired table(s) from that file
--      (search for "CREATE TABLE erp.core_erp_suppliers", "CREATE TABLE crm.core_crm_customers",
--      "CREATE TABLE crm.customers_tenant_null_backup_20260919").
--   2. Reload data via psql \copy (note: CSV files have header row; use HEADER option):
--
--      \copy erp.core_erp_suppliers FROM 'database/backup/batch31_erp_core_erp_suppliers_20261107_063242.csv' WITH (FORMAT csv, HEADER true);
--      \copy crm.core_crm_customers FROM 'database/backup/batch31_crm_core_crm_customers_20261107_063242.csv' WITH (FORMAT csv, HEADER true);
--      \copy crm.customers_tenant_null_backup_20260919 FROM 'database/backup/batch31_crm_customers_backup_20260919.csv' WITH (FORMAT csv, HEADER true);
--
--   3. Re-apply any RLS policies / indexes that were originally created alongside
--      the table (search the same 20260725000000 migration and later RLS migrations
--      for policies touching these tables).
--
-- Column reference (for manual rebuild):
--   erp.core_erp_suppliers(id, tenant_id, code, name, contact_person, phone, email, address, status, created_at, updated_at, deleted_at)
--   crm.core_crm_customers(id, tenant_id, name, industry, scale, source, contact_person, phone, email, address, status, created_at, updated_at, deleted_at)
--   crm.customers_tenant_null_backup_20260919(id, org_id, name, code, industry, company_size, website, email, phone, fax, address, city, province, country, postal_code, status, customer_type, source, rating, revenue, employee_count, notes, created_at, updated_at, created_by, updated_by, deleted_at, tenant_id, region, owner_id, tags, approval_status, organization_id)
-- ============================================================

BEGIN;

-- Drop dead tables (idempotent: IF EXISTS makes second run a no-op).
-- erp.customers is intentionally NOT dropped (see header: actively used by
-- svc/erp customer CRUD + sales_orders FK).

DROP TABLE IF EXISTS erp.core_erp_suppliers;
DROP TABLE IF EXISTS crm.core_crm_customers;
DROP TABLE IF EXISTS crm.customers_tenant_null_backup_20260919;

COMMIT;
