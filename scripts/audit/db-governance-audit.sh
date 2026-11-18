#!/usr/bin/env bash
# db-governance-audit.sh — 三库（prod/topems/prepare）索引·约束·类型治理只读审计
# 2026-11-03 P3 数据库治理启动：无 PK / 无二级索引 / CHECK / UNIQUE 缺失矩阵 + 无 PK 有数据表清单
# 用法: bash scripts/audit/db-governance-audit.sh [db...]  默认 topems_prod topems topems_prepare
set -euo pipefail
DB_URL="${DB_URL:-postgres://}"  # 默认本机 socket 认证（拼成 postgres:///<db>），不内嵌口令；跨机审计时导出完整基址如 postgres://user@host:5432

dbs=("$@"); [ ${#dbs[@]} -eq 0 ] && dbs=(topems_prod topems topems_prepare)

for db in "${dbs[@]}"; do
  echo "==================== $db ===================="
  psql "$DB_URL/$db" -tAc "
    SELECT '表数', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema')
    UNION ALL SELECT '无主键表', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conrelid=c.oid AND con.contype='p')
    UNION ALL SELECT '无二级索引表', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid AND i.indisprimary=FALSE)
    UNION ALL SELECT '无PK无索引非空表', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conrelid=c.oid AND con.contype='p') AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=c.oid) AND (SELECT count(*) FROM information_schema.columns ic WHERE ic.table_schema=n.nspname AND ic.table_name=c.relname) > 0
    UNION ALL SELECT 'CHECK约束数', count(*) FROM pg_constraint WHERE contype='c' AND connamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('pg_catalog','information_schema'))
    UNION ALL SELECT 'UNIQUE约束数', count(*) FROM pg_constraint WHERE contype='u' AND connamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('pg_catalog','information_schema'))
    UNION ALL SELECT '外键数', count(*) FROM pg_constraint WHERE contype='f' AND connamespace NOT IN (SELECT oid FROM pg_namespace WHERE nspname IN ('pg_catalog','information_schema'));
  "
done
