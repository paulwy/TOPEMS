#!/usr/bin/env bash
# 补齐演示管理员（admin）的租户成员与公司数据范围。
#
# 背景：公司级写接口（integration 同步任务、finance 凭证等）要求「用户在当前租户持有
#      core_user_company_scopes 记录」，否则中间件 fail-closed 返回 403。历史播种脚本只
#      处理「有 core_tenant_users 成员记录」的用户，而 admin 在本机库没有成员记录，
#      于是既无默认公司也无显式范围 —— 表现为所有带 x-company-id 的写接口 403。
#
# 本脚本只做两件幂等的事（默认 dry-run，--apply 才落库）：
#   0) 清掉本租户里 user_id 已不存在的「孤儿成员记录」（历史重建用户表留下的残行，会占住 email 唯一槽）；
#   1) 给 admin 补一条 public.core_tenant_users 成员记录（role=owner, status=active）；
#   2) 给 admin 在租户内每个活跃公司补 write 范围（is_default 取主公司：唯一活跃公司，
#      或多公司时取 id 最小者），已有更高级别（consolidate）则保留不降级。
#
# 用法：
#   ./scripts/db/backfill-admin-company-access.sh                 # 预览
#   ./scripts/db/backfill-admin-company-access.sh --apply         # 落库
#   ./scripts/db/backfill-admin-company-access.sh --user admin --tenant <uuid> --apply

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

USER_NAME="admin"
TENANT_ID="00000000-0000-0000-0000-000000000001"
MODE="dry-run"

while [ $# -gt 0 ]; do
    case "$1" in
        --apply) MODE="apply"; shift ;;
        --user) USER_NAME="$2"; shift 2 ;;
        --tenant) TENANT_ID="$2"; shift 2 ;;
        -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
        *) echo "未知参数: $1" >&2; exit 2 ;;
    esac
done

if [ -z "${DATABASE_URL:-}" ]; then
    # 默认走本机 socket（当前系统用户，通常是本机超级用户），避免 topems_app 无密码时
    # psql 交互式提示把 CI/终端挂住；需要指定账号时显式传 DATABASE_URL。
    DATABASE_URL="postgres:///topems"
fi

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v user_name="$USER_NAME" -v tenant_id="$TENANT_ID")

echo "================ backfill-admin-company-access ================"
echo "模式: $MODE   用户: $USER_NAME   租户: $TENANT_ID"

ADMIN_ID=$(psql "$DATABASE_URL" -tAq -c "select id from iam.users where username = '$USER_NAME' and deleted_at is null limit 1")
if [ -z "$ADMIN_ID" ]; then
    echo "✗ 找不到用户 ${USER_NAME}（iam.users）" >&2
    exit 1
fi
echo "用户 id: $ADMIN_ID"

COMPANY_IDS=$(psql "$DATABASE_URL" -tAq -c "select id from hrm.companies where tenant_id = '$TENANT_ID' and deleted_at is null order by created_at, id")
if [ -z "$COMPANY_IDS" ]; then
    echo "✗ 租户 $TENANT_ID 下没有活跃公司" >&2
    exit 1
fi
echo "活跃公司: $(printf '%s' "$COMPANY_IDS" | tr '\n' ' ')"

ORPHAN_SQL=$(cat <<'SQL'
DELETE FROM public.core_tenant_users tu
WHERE tu.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM iam.users u WHERE u.id = tu.user_id)
  AND tu.tenant_id = :'tenant_id'::uuid
SQL
)

MEMBERSHIP_SQL=$(cat <<'SQL'
INSERT INTO public.core_tenant_users (tenant_id, user_id, email, role, status, created_at)
SELECT :'tenant_id'::uuid, u.id, COALESCE(NULLIF(u.email, ''), u.username || '@local'), 'owner', 'active', now()
FROM iam.users u
WHERE u.id = :'user_id'::uuid
  AND NOT EXISTS (
      SELECT 1 FROM public.core_tenant_users tu
      WHERE tu.tenant_id = :'tenant_id'::uuid AND tu.user_id = u.id AND tu.deleted_at IS NULL
  )
SQL
)

SCOPE_SQL=$(cat <<'SQL'
WITH target AS (
    SELECT c.id,
           row_number() OVER (ORDER BY c.created_at, c.id) = 1 AS is_primary
    FROM hrm.companies c
    WHERE c.tenant_id = :'tenant_id'::uuid AND c.deleted_at IS NULL
), prior AS (
    SELECT company_id, access_level FROM public.core_user_company_scopes
    WHERE tenant_id = :'tenant_id'::uuid AND user_id = :'user_id'::uuid
)
INSERT INTO public.core_user_company_scopes
    (tenant_id, user_id, company_id, access_level, is_default, created_at, updated_at)
SELECT :'tenant_id'::uuid, :'user_id'::uuid, t.id, 'write', t.is_primary, now(), now()
FROM target t
LEFT JOIN prior p ON p.company_id = t.id
WHERE COALESCE(p.access_level, '') <> 'consolidate'
ON CONFLICT (tenant_id, user_id, company_id) DO UPDATE
SET access_level = CASE
        WHEN public.core_user_company_scopes.access_level = 'consolidate' THEN 'consolidate'
        ELSE EXCLUDED.access_level
    END,
    is_default = public.core_user_company_scopes.is_default OR EXCLUDED.is_default,
    updated_at = now();
SQL
)

run_sql() {
    local title="$1" sql="$2"
    if [ "$MODE" = "dry-run" ]; then
        echo "[dry-run] $title —— 事务内执行后回滚"
        if printf 'BEGIN;\n%s;\nROLLBACK;\n' "$sql" | "${PSQL[@]}" -v user_id="$ADMIN_ID" -tAq >/tmp/backfill_dry.log 2>&1; then
            echo "  ✓ SQL 通过（已回滚，未落库）"
        else
            echo "  ✗ SQL 失败："; tail -4 /tmp/backfill_dry.log; return 1
        fi
    else
        echo "[apply] $title"
        printf '%s;\n' "$sql" | "${PSQL[@]}" -v user_id="$ADMIN_ID" -tAq 2>&1 | tail -3
    fi
}

if [ "$MODE" = "dry-run" ]; then
    # 三步存在依赖（先清孤儿腾出 email 唯一槽，再补成员，最后补范围）：
    # 必须在同一事务里试跑，逐步单独开事务会因为回滚而看不到前一步效果。
    echo "[dry-run] 三步在同一事务内试跑后回滚"
    if printf 'BEGIN;\n%s;\n%s;\n%s;\nROLLBACK;\n' "$ORPHAN_SQL" "$MEMBERSHIP_SQL" "$SCOPE_SQL" \
        | "${PSQL[@]}" -v user_id="$ADMIN_ID" -tAq >/tmp/backfill_dry.log 2>&1; then
        echo "  ✓ 全部 SQL 通过（已回滚，未落库）"
    else
        echo "  ✗ SQL 失败："; tail -4 /tmp/backfill_dry.log; exit 1
    fi
else
    run_sql "清理孤儿成员记录（user_id 已不存在）" "$ORPHAN_SQL"
    run_sql "补成员记录" "$MEMBERSHIP_SQL"
    run_sql "补公司数据范围" "$SCOPE_SQL"
fi

if [ "$MODE" = "apply" ]; then
    echo "--- 结果"
    psql "$DATABASE_URL" -F'|' -tAq -c "
        select 'membership', tu.role, tu.status from public.core_tenant_users tu
         where tu.tenant_id = '$TENANT_ID'::uuid and tu.user_id = '$ADMIN_ID'::uuid and tu.deleted_at is null
        union all
        select 'scope:'||s.company_id::text, s.access_level, s.is_default::text
          from public.core_user_company_scopes s
         where s.tenant_id = '$TENANT_ID'::uuid and s.user_id = '$ADMIN_ID'::uuid"
    echo "✓ 完成（可逆：删除对应 core_tenant_users / core_user_company_scopes 行即可回退）"
fi
