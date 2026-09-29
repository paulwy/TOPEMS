#!/usr/bin/env bash
# =============================================================================
# migrate-verify-empty.sh — 顶层迁移链全新空库全量验证
# =============================================================================
# 用途:
#   在全新空库（无历史脏数据）上全量应用 database/migrations/ 顶层迁移链，
#   断言 0 错误。等价于 CI migration-test 中"新环境可用性"验证，
#   防止迁移链依赖线上遗留表/列/角色（本地 5432 半迁移库会掩盖的缺陷）。
#
# 背景:
#   2026-09-25 空库验证循环在 topems_mig_verify 库发现并修复 9 类迁移链缺陷
#   （P1-2a 大小写误伤、遗留表无定义、服务自建表引用、flow 收敛缺口等，
#   commit 498c274de）。本脚本将该验证方法固化为可重复门禁。
#
# 用法:
#   DATABASE_URL="postgres://user:pass@host:5432/<dbname>" bash scripts/migrate-verify-empty.sh
#
# 行为:
#   1. 从 DATABASE_URL 解析 dbname，以同 user/pass 连接 postgres 管理库
#   2. DROP DATABASE IF EXISTS <dbname>; CREATE DATABASE <dbname>;
#   3. sqlx migrate run --source database/migrations 全量应用
#   4. 断言 0 错误；_sqlx_migrations 全量 success=true
#   5. 清理验证库（DROP），避免残留
# =============================================================================
set -uo pipefail

DB_URL="${DATABASE_URL:?需要设置 DATABASE_URL，例: postgres://user:pass@host:5432/topems_verify}"

# --- 解析 DATABASE_URL: postgres://user:pass@host:port/dbname -----------------
parse_url() {
  local url="$1" rest auth hostdb user cred host port db
  rest="${url#postgres://}"
  # 兼容两种格式：postgres://user@host/db（无密码）与 postgres://user:pass@host/db
  auth="${rest%%@*}"
  hostdb="${rest#*@}"
  if [[ "$auth" == *:* ]]; then
    user="${auth%%:*}"
    cred="${auth#*:}"
  else
    user="$auth"
    cred=""
  fi
  host="${hostdb%%/*}"
  db="${hostdb#*/}"
  if [[ "$db" == "$host" ]]; then
    db=""
  fi
  if [[ "$host" == *:* ]]; then
    port="${host##*:}"
    host="${host%%:*}"
  else
    port="5432"
  fi
  echo "$user|$cred|$host|$port|$db"
}

IFS='|' read -r PG_USER PG_PASS PG_HOST PG_PORT PG_DB <<< "$(parse_url "$DB_URL")"
if [[ -z "$PG_DB" ]]; then
  echo "错误: DATABASE_URL 缺少数据库名" >&2
  exit 2
fi
ADMIN_URL="postgres://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/postgres"
PSQL="psql $ADMIN_URL"

# 解析 sqlx 可执行文件（CI 用 PATH 内 sqlx；本地默认 ~/.cargo/bin/sqlx）
SQLX="$(command -v sqlx || echo "$HOME/.cargo/bin/sqlx")"
if [[ ! -x "$SQLX" ]]; then
  echo "错误: 未找到 sqlx-cli（需 0.7+，支持 migrate run）" >&2
  exit 2
fi

echo "== 空库迁移验证 =="
echo "  验证库: $PG_DB @ $PG_HOST:$PG_PORT (user $PG_USER)"

# --- 0. 库名守卫：只允许操作明确的验证/临时库，防止误删生产库 ------------------
if ! [[ "$PG_DB" =~ (verify|test|tmp|mig) ]]; then
  echo "错误: 验证库名 '$PG_DB' 不含 verify/test/tmp/mig 标记，拒绝执行（防误删生产库）" >&2
  echo "提示: 请使用形如 DATABASE_URL=postgres://user:pass@host:5432/topems_mig_verify 的验证库名" >&2
  exit 3
fi

# --- 1. DROP/CREATE 空库（同权限下 DROP 允许：owner/superuser） ----------------
echo "== 重建空库 $PG_DB =="
$PSQL -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS \"$PG_DB\";" \
  -c "CREATE DATABASE \"$PG_DB\";" || {
    echo "错误: 无法重建数据库 ${PG_DB}（需 postgres 超级用户或同权限）" >&2
    echo "提示: 本地验证请改用具有建库权限的账号，或先手动 DROP/CREATE" >&2
    exit 3
  }

# --- 2. 全量应用迁移链 ----------------------------------------------------------
echo "== 全量应用 database/migrations =="
DB_URL2="postgres://$PG_USER:$PG_PASS@$PG_HOST:$PG_PORT/$PG_DB"
DB_CONN="psql $DB_URL2"
MIGRATE_URL="$DB_URL2"
OUT="$("$SQLX" migrate run --source database/migrations --database-url "$MIGRATE_URL" 2>&1)"
RC=$?
echo "$OUT" | tail -8

if [[ $RC -ne 0 ]]; then
  echo "❌ 空库迁移验证失败（exit ${RC}）" >&2
  echo "$OUT" | grep -iE "error|错误" | head -10 >&2 || true
  # 诊断增强：pgvector 扩展类失败（CREATE EXTENSION vector 需超级用户，
  # topems_app 连接会被 000 迁移的 EXCEPTION 吞掉→后续 vector 类型缺失）
  if echo "$OUT" | grep -qiE "type .vector. does not exist|pgvector|extension.*vector"; then
    VEC_AVAIL="$($DB_CONN -t -A -c "SELECT count(*) FROM pg_available_extensions WHERE name='vector';" 2>/dev/null || echo 0)"
    if [[ "$VEC_AVAIL" != "0" ]]; then
      echo "⚠️  诊断：pgvector 扩展可用（pg_available_extensions 存在）但未安装到验证库。" >&2
      echo "    CREATE EXTENSION vector 需超级用户权限，topems_app 无法完成。" >&2
      echo "    请以超管执行：psql -h $PG_HOST -p $PG_PORT -U postgres -d $PG_DB -c 'CREATE EXTENSION IF NOT EXISTS vector;' 后重跑本脚本。" >&2
    else
      echo "⚠️  诊断：本实例未提供 pgvector 扩展（pg_available_extensions 无 vector），" >&2
      echo "    AI 向量类迁移在空库验证中将失败（生产需 pgvector 镜像）。" >&2
    fi
  fi
  exit 1
fi

# --- 3. 断言 _sqlx_migrations 全量 success=true --------------------------------
TOTAL="$($DB_CONN -t -A -c "SELECT count(*) FROM _sqlx_migrations WHERE success=true;" 2>/dev/null || echo 0)"
PENDING="$($DB_CONN -t -A -c "SELECT count(*) FROM _sqlx_migrations WHERE success=false;" 2>/dev/null || echo 0)"
echo "  已应用迁移: $TOTAL 条，失败: $PENDING 条"
if [[ "$PENDING" != "0" ]]; then
  echo "❌ 存在失败迁移记录" >&2
  exit 1
fi
if [[ "$TOTAL" == "0" ]]; then
  echo "❌ 迁移记录为空（迁移未执行？）" >&2
  exit 1
fi

# --- 4. 清理验证库 --------------------------------------------------------------
echo "== 清理验证库 =="
$PSQL -q -c "DROP DATABASE IF EXISTS \"$PG_DB\";" 2>/dev/null || echo "  (清理跳过: 库可能被占用)"
echo "✅ 空库全量迁移验证通过：$TOTAL/$TOTAL 迁移应用，0 错误"
