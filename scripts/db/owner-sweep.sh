#!/bin/bash
# 属主收敛巡检：把本机对象属主统一到 topems_owner，并断言 0 漂移。
# 用法：./scripts/db/owner-sweep.sh [库名=topems]（用本机超级用户 air 连接，需 psql 免密）
set -euo pipefail
DB=${1:-topems}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/database/scripts/converge_owner.sql"
drift_rel=$(psql -d "$DB" -tAc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','S','f') and pg_get_userbyid(c.relowner)<>'topems_owner'")
drift_fn=$(psql -d "$DB" -tAc "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace left join pg_depend d on d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e' where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and pg_get_userbyid(p.proowner)<>'topems_owner' and d.objid is null")
echo "owner drift: relations=$drift_rel functions=$drift_fn"
[ "$drift_rel" = "0" ] && [ "$drift_fn" = "0" ] || { echo "FAIL: 仍有对象未收敛"; exit 1; }
echo "OK"
