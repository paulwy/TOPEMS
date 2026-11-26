#!/bin/bash
# =============================================
# TOPEMS Admin 用户密码重置脚本
# =============================================
#
# 此脚本用于重置管理员密码。
# 推荐使用 Python CLI 获取更多功能:
#
#   topems db reset-admin-password
#   topems db reset-admin-password -p <新密码>
#   topems db reset-admin-password -u <用户名>
#
# 2026-11-26 修复与增强:
#   1) 连接参数改为「用户/口令/主机/端口/库名」整体从 DATABASE_URL 解析，
#      不再出现「默认 DB_USER=topems 却取到 topems_app 口令」的账号口令错配。
#   2) psql 不再用 `-c` + `:'var'`（新版 psql 的 -c 不做变量插值，会报 syntax error
#      at or near ":"），统一改为 stdin heredoc + -v 传入。
#   3) 支持生产形态：unix socket + peer 认证（DSN 无 host/无口令）、
#      .env.production 作为来源、psql 从 /opt/homebrew/bin 兜底发现、
#      无 python-bcrypt 时用 htpasswd 生成（$2y$ 归一为 $2b$）。
#   4) 端到端登录验证：多端口候选探测（CORE_PORT/MONOLITH_PORT/SERVER_PORT/8000/8099）。
#
# =============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

usage_exit() {
    echo "用法: [DB_PASSWORD='<口令>'] $0 [-y] [--no-verify] [--verify-url <URL>] [--dsn <DSN>] <用户名> <新密码>"
    echo "  -y, --yes        跳过交互确认直接执行"
    echo "  --no-verify      跳过端到端登录验证（默认会打 core 登录接口）"
    echo "  --verify-url     指定登录接口（默认自动探测 127.0.0.1:<CORE_PORT|8000|8099>/api/core/iam/auth/login）"
    echo "  --dsn            显式连接串，优先于 \$DATABASE_URL 与本地 env 文件"
    echo "                   生产示例: --dsn \"\$(plutil -extract EnvironmentVariables.DATABASE_URL raw <plist>)\""
    echo "环境变量: DATABASE_URL / DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD / VERIFY_URL"
    exit 0
}

# ---------------- 选项（可出现在任意位置） ----------------
ASSUME_YES=0
SKIP_VERIFY=0
VERIFY_URL="${VERIFY_URL:-}"
DSN_OPT=""
POSITIONAL=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        -y|--yes) ASSUME_YES=1; shift ;;
        --no-verify|--skip-verify) SKIP_VERIFY=1; shift ;;
        --verify-url) VERIFY_URL="${2:?--verify-url 需要 URL}"; shift 2 ;;
        --dsn) DSN_OPT="${2:?--dsn 需要连接串}"; shift 2 ;;
        -h|--help) usage_exit ;;
        *) POSITIONAL+=("$1"); shift ;;
    esac
done
if [ "${#POSITIONAL[@]}" -gt 0 ]; then
    set -- "${POSITIONAL[@]}"
else
    set --
fi

# ---------------- 连接串解析 ----------------
# 解析 postgres://[user[:pass]@][host[:port]]/db[?k=v]，兼容
#   生产 socket 形态: postgresql:///topems_prod?user=xingzhai（host 缺省 = unix socket）
parse_dsn() {
    local dsn="$1"
    DSN_NAME="" DSN_HOST="" DSN_PORT="" DSN_USER="" DSN_PASSWORD=""
    DSN_SOCKET=0

    dsn="${dsn#*://}"
    local query=""
    if [[ "$dsn" == *"?"* ]]; then
        query="${dsn#*\?}"
        dsn="${dsn%%\?*}"
    fi

    if [[ "$dsn" == *"@"* ]]; then
        local userinfo="${dsn%%@*}"
        dsn="${dsn#*@}"
        DSN_USER="${userinfo%%:*}"
        if [[ "$userinfo" == *":"* ]]; then
            DSN_PASSWORD="${userinfo#*:}"
        fi
    fi

    local hostpart="${dsn%%/*}"
    DSN_NAME="${dsn#*/}"
    [[ "$DSN_NAME" == "$dsn" ]] && DSN_NAME=""

    if [ -z "$hostpart" ]; then
        DSN_SOCKET=1
    elif [[ "$hostpart" == *":"* ]]; then
        DSN_HOST="${hostpart%%:*}"
        DSN_PORT="${hostpart##*:}"
    else
        DSN_HOST="$hostpart"
    fi

    if [ -n "$query" ]; then
        local IFS='&'
        local -a qparts=()
        read -ra qparts <<< "$query"
        local q
        for q in "${qparts[@]}"; do
            case "$q" in
                user=*) [ -z "$DSN_USER" ] && DSN_USER="${q#user=}" ;;
                password=*) [ -z "$DSN_PASSWORD" ] && DSN_PASSWORD="${q#password=}" ;;
                port=*) [ -z "$DSN_PORT" ] && DSN_PORT="${q#port=}" ;;
                dbname=*) [ -z "$DSN_NAME" ] && DSN_NAME="${q#dbname=}" ;;
            esac
        done
    fi
}

# 连接串来源优先级：--dsn > $DATABASE_URL > .env > .env.local > .env.production > config/standalone.env
DSN_SOURCE=""
DSN=""
if [ -n "$DSN_OPT" ]; then
    DSN="$DSN_OPT"; DSN_SOURCE="--dsn 参数"
elif [ -n "${DATABASE_URL:-}" ]; then
    DSN="$DATABASE_URL"; DSN_SOURCE="环境变量 DATABASE_URL"
else
    for f in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/.env.production" "$PROJECT_ROOT/config/standalone.env"; do
        if [ -f "$f" ]; then
            candidate="$(sed -n 's#^DATABASE_URL=\(.*\)$#\1#p' "$f" | head -1)"
            if [ -n "$candidate" ]; then
                DSN="$candidate"; DSN_SOURCE="$f"
                break
            fi
        fi
    done
fi

DSN_HOST="" DSN_PORT="" DSN_NAME="" DSN_USER="" DSN_PASSWORD="" DSN_SOCKET=0
if [ -n "$DSN" ]; then
    parse_dsn "$DSN"
fi

EXPLICIT_HOST="${DB_HOST:-}"
DB_HOST="${EXPLICIT_HOST:-${DSN_HOST:-localhost}}"
DB_PORT="${DB_PORT:-${DSN_PORT:-5432}}"
DB_NAME="${DB_NAME:-${DSN_NAME:-topems}}"
DB_USER="${DB_USER:-${DSN_USER:-topems}}"
DB_PASSWORD="${DB_PASSWORD:-$DSN_PASSWORD}"
if [ "$DSN_SOCKET" = 1 ] && [ -z "$EXPLICIT_HOST" ]; then
    DB_HOST=""
fi

# 口令可缺省：生产 unix socket + peer 认证没有口令（依赖 pg_hba / ~/.pgpass）
if [ -z "$DB_PASSWORD" ] && [ -z "$DSN" ]; then
    echo "错误: 既无 DB_PASSWORD 环境变量，也未解析到 DATABASE_URL（.env / .env.local / .env.production / config/standalone.env）" >&2
    echo "用法: DB_PASSWORD='<口令>' $0 <用户名> <新密码>   或   $0 --dsn '<DSN>' <用户名> <新密码>" >&2
    exit 2
fi

# 用户名与密码均为必填（不再提供 admin/admin123 默认弱口令）
USERNAME="${1:?用法: $0 [-y] <用户名> <新密码>}"
NEW_PASSWORD="${2:?用法: $0 [-y] <用户名> <新密码>}"
if [ ${#NEW_PASSWORD} -lt 8 ]; then
    echo "错误: 新密码长度至少 8 位" >&2
    exit 2
fi

echo "============================================================"
echo "TOPEMS Admin 用户密码重置脚本"
echo "============================================================"
echo
echo "数据库连接信息:"
if [ "$DSN_SOCKET" = 1 ]; then
    echo "  Host: unix socket（peer 认证）"
else
    echo "  Host: ${DB_HOST}:${DB_PORT}"
fi
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
if [ -n "$DSN_SOURCE" ]; then
    echo "  凭据来源: ${DSN_SOURCE}"
fi
echo
echo "目标用户: ${USERNAME}"
echo "新密码: ${NEW_PASSWORD}"
echo

# 口令为空时不要导出空 PGPASSWORD（libpq 会把空值当作口令尝试）
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="${DB_PASSWORD}"
fi

# psql 发现：非交互 shell 的 PATH 常缺 /opt/homebrew/bin（生产 Mac mini 即此形态）
PSQL_BIN="$(command -v psql 2>/dev/null || true)"
if [ -z "$PSQL_BIN" ]; then
    for cand in /opt/homebrew/bin/psql /opt/homebrew/opt/postgresql@18/bin/psql /opt/homebrew/opt/postgresql@17/bin/psql /usr/local/bin/psql; do
        if [ -x "$cand" ]; then
            PSQL_BIN="$cand"
            break
        fi
    done
fi
if [ -z "$PSQL_BIN" ]; then
    echo "❌ 错误: 找不到 psql（PATH 与 /opt/homebrew/bin 均无）"
    echo "  macOS: brew install postgresql@18   或   brew install libpq"
    unset PGPASSWORD
    exit 1
fi

# 统一执行入口：SQL 走 stdin（psql 的 -c 不做 :'var' 变量插值）
run_sql() {
    local sql="$1"; shift
    if [ "$DSN_SOCKET" = 1 ]; then
        "$PSQL_BIN" -X -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 "$@" -f - <<< "$sql"
    else
        "$PSQL_BIN" -X -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
            -v ON_ERROR_STOP=1 "$@" -f - <<< "$sql"
    fi
}

# 列存在性判断（不同环境表结构有差异：生产 iam.users 没有 role_id 之外的若干列）
has_column() {
    local schema="$1" table="$2" column="$3"
    local cnt
    cnt=$(run_sql "SELECT count(*) FROM information_schema.columns
WHERE table_schema = :'schema' AND table_name = :'table' AND column_name = :'column';" \
        -tA -v schema="$schema" -v table="$table" -v column="$column" 2>/dev/null) || return 1
    [ "$(tr -d '[:space:]' <<< "$cnt")" = "1" ]
}

echo "------------------------------------------------------------"
echo "步骤 1: 查看当前用户信息"
echo "------------------------------------------------------------"
# 用户表定位：认证代码（iam/auth.rs）读 iam.users；而历史脚本写的是裸 core_users，
# 在本机会落到 public.core_users（重复表），在生产则一行没有 → 都是「改了但没生效」。
# 因此按候选表逐个判存，命中用户名即选定，优先认证表 iam.users。
USER_TABLE=""
TABLE_TRY=""
for t in iam.users iam.core_users core_users public.core_users; do
    cnt=$(run_sql "SELECT count(*) FROM ${t} WHERE username = :'username';" \
        -tA -v username="$USERNAME" 2>/dev/null) || { TABLE_TRY="${TABLE_TRY}${t}=<不可用> "; continue; }
    cnt=$(tr -d '[:space:]' <<< "$cnt")
    TABLE_TRY="${TABLE_TRY}${t}=${cnt} "
    if [ "${cnt:-0}" -gt 0 ] 2>/dev/null; then
        USER_TABLE="$t"
        break
    fi
done
if [ -z "$USER_TABLE" ]; then
    echo "❌ 用户 ${USERNAME} 在所有候选用户表都不存在（${TABLE_TRY}），已终止，未做任何修改"
    echo "   若计数全为 0 但确实有账号，检查 RLS 会话（app.tenant_id）或 DATABASE_URL 是否指向正确库"
    unset PGPASSWORD
    exit 1
fi
echo "  命中用户表: ${USER_TABLE}"

TABLE_SCHEMA="${USER_TABLE%%.*}"
TABLE_NAME="${USER_TABLE##*.}"
SELECT_COLS="id, username"
PREVIEW_EXTRA_COLS=""
for c in email is_superuser status must_change_password updated_at; do
    if has_column "$TABLE_SCHEMA" "$TABLE_NAME" "$c"; then
        SELECT_COLS="${SELECT_COLS}, ${c}"
    fi
done
for c in email must_change_password updated_at; do
    if has_column "$TABLE_SCHEMA" "$TABLE_NAME" "$c"; then
        PREVIEW_EXTRA_COLS="${PREVIEW_EXTRA_COLS}, ${c}"
    fi
done

run_sql "SELECT ${SELECT_COLS}
FROM ${USER_TABLE}
WHERE username = :'username';" -v username="$USERNAME" 2>&1 || {
    echo "❌ 查询失败（请确认账号口令/端口与 DATABASE_URL 一致）"
    unset PGPASSWORD
    exit 1
}
echo

# 确认操作（-y/--yes 跳过确认）
if [ "$ASSUME_YES" -eq 0 ]; then
    read -p "确认重置密码? (yes/no): " confirm
    if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ] && [ "$confirm" != "Y" ] && [ "$confirm" != "YES" ] && [ "$confirm" != "Yes" ]; then
        echo "已取消"
        unset PGPASSWORD
        exit 0
    fi
fi
echo

# 动态生成 bcrypt 哈希：优先 python-bcrypt；缺失则用 htpasswd（生产机常见，$2y$ 归一为 $2b$）
PASSWORD_HASH=""
HASH_METHOD=""
echo "生成 bcrypt 哈希..."
if command -v python3 &> /dev/null && python3 -c "import bcrypt" 2>/dev/null; then
    PASSWORD_HASH=$(python3 -c "import bcrypt, sys; print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt()).decode())" "$NEW_PASSWORD" 2>/dev/null) || PASSWORD_HASH=""
    [ -n "$PASSWORD_HASH" ] && HASH_METHOD="python-bcrypt"
fi
if [ -z "$PASSWORD_HASH" ] && command -v htpasswd &> /dev/null; then
    PASSWORD_HASH=$(htpasswd -bnBC 12 "" "$NEW_PASSWORD" 2>/dev/null | tr -d ':\r\n')
    PASSWORD_HASH="${PASSWORD_HASH/#\$2y\$/\$2b\$}"
    [ -n "$PASSWORD_HASH" ] && HASH_METHOD="htpasswd（\$2y\$→\$2b\$）"
fi
if [ -z "$PASSWORD_HASH" ]; then
    echo "❌ 错误: 无法生成 bcrypt 哈希"
    echo "  方案一: python3 -m pip install --user bcrypt"
    echo "  方案二: macOS 自带 htpasswd（brew install httpd 亦可）"
    unset PGPASSWORD
    exit 1
fi
echo "  哈希来源: ${HASH_METHOD}"
echo

echo "------------------------------------------------------------"
echo "步骤 2: 更新密码（${USER_TABLE}）"
echo "------------------------------------------------------------"
SET_CLAUSES="password_hash = :'pwdhash'"
if has_column "$TABLE_SCHEMA" "$TABLE_NAME" "updated_at"; then
    SET_CLAUSES="${SET_CLAUSES},
    updated_at = NOW()"
fi
MUST_CHANGE_CLEARED=0
if has_column "$TABLE_SCHEMA" "$TABLE_NAME" "must_change_password"; then
    SET_CLAUSES="${SET_CLAUSES},
    must_change_password = FALSE"
    MUST_CHANGE_CLEARED=1
fi
UPDATE_OUT=$(run_sql "UPDATE ${USER_TABLE}
SET ${SET_CLAUSES}
WHERE username = :'username';" -v username="$USERNAME" -v pwdhash="$PASSWORD_HASH" 2>&1) || {
    echo "❌ 更新失败（若被 RLS 拦截，请确认会话 app.tenant_id 已设置）"
    unset PGPASSWORD
    exit 1
}
echo "$UPDATE_OUT"
if [ "$MUST_CHANGE_CLEARED" = 1 ]; then
    echo "  已清除首次登录强制改密标记（must_change_password=false）"
fi
echo "$UPDATE_OUT"
UPDATED_ROWS=$(sed -n 's/^UPDATE \([0-9][0-9]*\)$/\1/p' <<< "$UPDATE_OUT" | tail -1)
if [ -z "$UPDATED_ROWS" ] || [ "$UPDATED_ROWS" -eq 0 ]; then
    echo "❌ 未更新任何行（RLS 策略可能过滤掉了 ${USERNAME}），已终止"
    unset PGPASSWORD
    exit 1
fi
if [ "$UPDATED_ROWS" -gt 1 ]; then
    echo "⚠️  命中 ${UPDATED_ROWS} 行（同名用户跨租户），请核对是否只需重置其一"
fi
echo

echo "------------------------------------------------------------"
echo "步骤 3: 验证结果"
echo "------------------------------------------------------------"
run_sql "SELECT username,
       substring(password_hash, 1, 30) || '...' AS password_hash_preview
       ${PREVIEW_EXTRA_COLS}
FROM ${USER_TABLE}
WHERE username = :'username';" -v username="$USERNAME"
echo

echo "------------------------------------------------------------"
echo "步骤 4: 端到端登录验证"
echo "------------------------------------------------------------"
# 哈希写进库 ≠ 账号能登录：哈希算法、must_change_password、租户 GUC 任一不一致都会导致
# 重置“成功”但登录失败。默认打一次登录接口；服务不可达则跳过（不阻断重置）。
if [ "$SKIP_VERIFY" -eq 1 ]; then
    echo "已按 --no-verify 跳过登录验证"
elif ! command -v curl &> /dev/null; then
    echo "⚠️  未安装 curl，跳过登录验证"
else
    # 未显式指定接口时按候选端口探测「路由存在」（GET 期望 405/401/400，避免盲发口令）
    if [ -z "$VERIFY_URL" ]; then
        seen=" "
        candidates=()
        for p in "${CORE_PORT:-}" "${MONOLITH_PORT:-}" "${SERVER_PORT:-}" 8000 8099; do
            [ -z "$p" ] && continue
            case "$seen" in *" $p "*) continue ;; esac
            seen="$seen$p "
            candidates+=("$p")
        done
        for p in "${candidates[@]}"; do
            probe="http://127.0.0.1:${p}/api/core/iam/auth/login"
            code=$(curl -s -m 3 -o /dev/null -w '%{http_code}' "$probe" 2>/dev/null) || code=""
            case "$code" in
                405|401|400|200) VERIFY_URL="$probe"; break ;;
            esac
        done
    fi

    if [ -z "$VERIFY_URL" ]; then
        echo "⚠️  未探测到可用的登录接口（已试 CORE_PORT/${CORE_PORT:-未设置}、8000、8099），跳过验证；库内哈希已写入"
    else
        LOGIN_JSON=$(python3 -c 'import json,sys; print(json.dumps({"username": sys.argv[1], "password": sys.argv[2]}))' \
            "$USERNAME" "$NEW_PASSWORD" 2>/dev/null) || LOGIN_JSON=""
        if [ -z "$LOGIN_JSON" ]; then
            echo "⚠️  python3 不可用，无法构造登录请求，跳过验证"
        else
            LOGIN_HTTP=$(curl -s -m 10 -o /tmp/.topems_login_check.$$ -w '%{http_code}' \
                -X POST "$VERIFY_URL" -H 'Content-Type: application/json' -d "$LOGIN_JSON" 2>/dev/null) || LOGIN_HTTP=""
            if [ -z "$LOGIN_HTTP" ]; then
                LOGIN_HTTP="000"
            fi
            if [ "$LOGIN_HTTP" = "000" ]; then
                echo "⚠️  登录接口不可达（${VERIFY_URL}），跳过验证；库内哈希已写入"
            elif [ "$LOGIN_HTTP" = "200" ] && grep -q '"success":true' /tmp/.topems_login_check.$$ 2>/dev/null; then
                echo "✓ 登录验证通过（${VERIFY_URL} 返回 200/success）"
            else
                echo "❌ 登录验证失败（HTTP ${LOGIN_HTTP}）：哈希已写入但认证未通过"
                if [ "$LOGIN_HTTP" = "404" ] || [ "$LOGIN_HTTP" = "405" ]; then
                    echo "   接口路径可能不符：用 --verify-url 指定正确地址，或 --no-verify 跳过校验"
                fi
                echo "   排查：服务是否用同一 JWT/租户配置、must_change_password、RLS 会话 GUC"
                rm -f /tmp/.topems_login_check.$$
                unset PGPASSWORD
                exit 1
            fi
            rm -f /tmp/.topems_login_check.$$
        fi
    fi
fi
echo

echo "============================================================"
echo "✓ 密码重置成功!"
echo "============================================================"
echo
echo "登录信息:"
echo "  用户名: ${USERNAME}"
echo "  密码: ${NEW_PASSWORD}"
echo
echo "⚠️  安全提示: 登录后请立即修改默认密码!"
echo

# 清除密码环境变量
unset PGPASSWORD
