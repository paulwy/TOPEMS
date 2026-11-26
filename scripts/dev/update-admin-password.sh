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
# 2026-11-26 修复:
#   1) 连接参数改为「用户/口令/主机/端口/库名」整体从 DATABASE_URL 解析，
#      不再出现「默认 DB_USER=topems 却取到 topems_app 口令」的账号口令错配。
#   2) psql 不再用 `-c` + `:'var'`（新版 psql 的 -c 不做变量插值，会报 syntax error
#      at or near ":"），统一改为 stdin heredoc + -v 传入。
#
# =============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# 显式环境变量（缺省为空，稍后由 DATABASE_URL 补齐）
ENV_HOST="${DB_HOST:-}"
ENV_PORT="${DB_PORT:-}"
ENV_NAME="${DB_NAME:-}"
ENV_USER="${DB_USER:-}"
ENV_PASSWORD="${DB_PASSWORD:-}"

# 解析 postgres://user:pass@host:port/db[?opts]
parse_dsn() {
    local dsn="$1"
    dsn="${dsn#*://}"
    DSN_NAME="" DSN_HOST="" DSN_PORT="" DSN_USER="" DSN_PASSWORD=""

    # userinfo@hostpart
    if [[ "$dsn" == *"@"* ]]; then
        local userinfo="${dsn%%@*}"
        dsn="${dsn#*@}"
        DSN_USER="${userinfo%%:*}"
        if [[ "$userinfo" == *":"* ]]; then
            DSN_PASSWORD="${userinfo#*:}"
        fi
    fi

    dsn="${dsn%%\?*}"          # 去掉查询参数
    local hostpart="${dsn%%/*}"
    DSN_NAME="${dsn#*/}"
    [[ "$DSN_NAME" == "$dsn" ]] && DSN_NAME=""

    if [[ "$hostpart" == *":"* ]]; then
        DSN_HOST="${hostpart%%:*}"
        DSN_PORT="${hostpart##*:}"
    else
        DSN_HOST="$hostpart"
    fi
}

# 连接串来源优先级：$DATABASE_URL > .env > .env.local > config/standalone.env
DSN_SOURCE=""
DSN=""
if [ -n "${DATABASE_URL:-}" ]; then
    DSN="$DATABASE_URL"; DSN_SOURCE="环境变量 DATABASE_URL"
else
    for f in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/config/standalone.env"; do
        if [ -f "$f" ]; then
            candidate="$(sed -n 's#^DATABASE_URL=\(.*\)$#\1#p' "$f" | head -1)"
            if [ -n "$candidate" ]; then
                DSN="$candidate"; DSN_SOURCE="$f"
                break
            fi
        fi
    done
fi

if [ -n "$DSN" ]; then
    parse_dsn "$DSN"
fi

DB_HOST="${ENV_HOST:-${DSN_HOST:-localhost}}"
DB_PORT="${ENV_PORT:-${DSN_PORT:-5432}}"
DB_NAME="${ENV_NAME:-${DSN_NAME:-topems}}"
DB_USER="${ENV_USER:-${DSN_USER:-topems}}"
DB_PASSWORD="${ENV_PASSWORD:-$DSN_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo "错误: 无法解析数据库口令（既无 DB_PASSWORD 环境变量，也未在 .env / .env.local / config/standalone.env 找到 DATABASE_URL）" >&2
    echo "用法: DB_PASSWORD='<口令>' bash scripts/dev/update-admin-password.sh <用户名> <新密码>" >&2
    exit 2
fi

# -y/--yes：跳过交互确认（供 topems.sh 等非交互调用链使用；默认仍需人工确认）
ASSUME_YES=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        -y|--yes) ASSUME_YES=1; shift ;;
        -h|--help)
            echo "用法: [DB_PASSWORD='<口令>'] $0 [-y] <用户名> <新密码>"
            echo "  -y, --yes   跳过交互确认直接执行"
            exit 0 ;;
        *) break ;;
    esac
done

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
echo "  Host: ${DB_HOST}:${DB_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
if [ -n "$DSN_SOURCE" ]; then
    echo "  凭据来源: ${DSN_SOURCE}"
fi
echo
echo "目标用户: ${USERNAME}"
echo "新密码: ${NEW_PASSWORD}"
echo

# 设置密码环境变量
export PGPASSWORD="${DB_PASSWORD}"

# 检查 psql 是否可用
if ! command -v psql &> /dev/null; then
    echo "❌ 错误: psql 未安装"
    echo "请安装 PostgreSQL 客户端工具"
    exit 1
fi

# 统一执行入口：SQL 走 stdin（psql 的 -c 不做 :'var' 变量插值）
run_sql() {
    local sql="$1"; shift
    psql -X -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -v ON_ERROR_STOP=1 "$@" -f - <<< "$sql"
}

echo "------------------------------------------------------------"
echo "步骤 1: 查看当前用户信息"
echo "------------------------------------------------------------"
run_sql "SELECT id, username, email, is_superuser, status
FROM core_users
WHERE username = :'username';" -v username="$USERNAME" 2>&1 || {
    echo "❌ 查询失败（请确认账号口令/端口与 .env 的 DATABASE_URL 一致）"
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

# 动态生成 bcrypt 哈希
if command -v python3 &> /dev/null; then
    echo "生成 bcrypt 哈希..."
    PASSWORD_HASH=$(python3 -c "import bcrypt, sys; print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt()).decode())" "$NEW_PASSWORD" 2>/dev/null) || {
        echo "❌ 错误: 需要安装 bcrypt 库（pip install bcrypt）"
        unset PGPASSWORD
        exit 1
    }
else
    echo "❌ 错误: 需要 Python 3 来生成密码哈希"
    unset PGPASSWORD
    exit 1
fi
echo

echo "------------------------------------------------------------"
echo "步骤 2: 更新密码"
echo "------------------------------------------------------------"
run_sql "UPDATE core_users
SET password_hash = :'pwdhash',
    updated_at = NOW()
WHERE username = :'username';" -v username="$USERNAME" -v pwdhash="$PASSWORD_HASH" 2>&1 || {
    echo "❌ 更新失败（若被 RLS 拦截，请确认会话 app.tenant_id 已设置）"
    unset PGPASSWORD
    exit 1
}
echo

echo "------------------------------------------------------------"
echo "步骤 3: 验证结果"
echo "------------------------------------------------------------"
run_sql "SELECT username, email,
       substring(password_hash, 1, 30) || '...' AS password_hash_preview,
       updated_at
FROM core_users
WHERE username = :'username';" -v username="$USERNAME"
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
