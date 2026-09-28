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
# =============================================

set -e

# 数据库连接配置（口令不设明文默认：优先环境变量，其次从 config/standalone.env 提取）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-topems}"
DB_USER="${DB_USER:-topems}"
DB_PASSWORD="${DB_PASSWORD:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
if [ -z "$DB_PASSWORD" ] && [ -f "$PROJECT_ROOT/config/standalone.env" ]; then
    DB_PASSWORD="$(sed -n 's#^DATABASE_URL=postgres://[^:]*:\([^@]*\)@.*#\1#p' "$PROJECT_ROOT/config/standalone.env" | head -1)"
fi
if [ -z "$DB_PASSWORD" ]; then
    echo "错误: 未设置 DB_PASSWORD 环境变量，且无法从 config/standalone.env 提取数据库口令" >&2
    echo "用法: DB_PASSWORD='<口令>' bash scripts/dev/update-admin-password.sh <用户名> <新密码>" >&2
    exit 2
fi

# 用户名与密码均为必填（不再提供 admin/admin123 默认弱口令）
USERNAME="${1:?用法: $0 <用户名> <新密码>}"
NEW_PASSWORD="${2:?用法: $0 <用户名> <新密码>}"
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

echo "------------------------------------------------------------"
echo "步骤 1: 查看当前用户信息"
echo "------------------------------------------------------------"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v username="$USERNAME" -c "
SELECT id, username, email, is_superuser, status 
FROM core_users 
WHERE username = :'username';
" 2>&1 || {
    echo "❌ 查询失败"
    unset PGPASSWORD
    exit 1
}
echo

# 确认操作
read -p "确认重置密码? (yes/no): " confirm
if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ] && [ "$confirm" != "Y" ] && [ "$confirm" != "YES" ] && [ "$confirm" != "Yes" ]; then
    echo "已取消"
    unset PGPASSWORD
    exit 0
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
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v username="$USERNAME" -v pwdhash="$PASSWORD_HASH" -c "
UPDATE core_users 
SET password_hash = :'pwdhash',
    updated_at = NOW()
WHERE username = :'username';
" 2>&1 || {
    echo "❌ 更新失败"
    unset PGPASSWORD
    exit 1
}
echo

echo "------------------------------------------------------------"
echo "步骤 3: 验证结果"
echo "------------------------------------------------------------"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v username="$USERNAME" -c "
SELECT username, email, 
       substring(password_hash, 1, 30) || '...' as password_hash_preview, 
       updated_at 
FROM core_users 
WHERE username = :'username';
"
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
