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

# 数据库连接配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-topems}"
DB_USER="${DB_USER:-topems}"
DB_PASSWORD="${DB_PASSWORD:-topems_secret}"

# 默认用户名和密码
USERNAME="${1:-admin}"
NEW_PASSWORD="${2:-admin123}"

# bcrypt 密码哈希（对应密码: admin123）
# 使用 Python bcrypt 生成: bcrypt.hashpw(b'admin123', bcrypt.gensalt())
DEFAULT_ADMIN_PASSWORD_HASH='$2b$12$YkGrx2WY9t1JbChfVNO7pe6S4T7iPjFm8j7dm5HBOe2d.InbncFce'

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
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "
SELECT id, username, email, is_superuser, status 
FROM core_users 
WHERE username = '${USERNAME}';
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

# 如果使用默认密码，使用预设哈希
if [ "$NEW_PASSWORD" = "admin123" ]; then
    PASSWORD_HASH="$DEFAULT_ADMIN_PASSWORD_HASH"
    echo "使用预设 bcrypt 哈希（密码: admin123）"
else
    # 动态生成哈希
    if command -v python3 &> /dev/null; then
        echo "生成 bcrypt 哈希..."
        PASSWORD_HASH=$(python3 -c "import bcrypt, sys; print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt()).decode())" "$NEW_PASSWORD" 2>/dev/null) || {
            echo "❌ 错误: 需要安装 bcrypt 库"
            echo "  运行: pip install bcrypt"
            echo "  或使用默认密码 admin123"
            unset PGPASSWORD
            exit 1
        }
    else
        echo "❌ 错误: 需要 Python 3 来生成自定义密码哈希"
        echo "  或使用默认密码 admin123"
        unset PGPASSWORD
        exit 1
    fi
fi
echo

echo "------------------------------------------------------------"
echo "步骤 2: 更新密码"
echo "------------------------------------------------------------"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "
UPDATE core_users 
SET password_hash = '${PASSWORD_HASH}',
    updated_at = NOW()
WHERE username = '${USERNAME}';
" 2>&1 || {
    echo "❌ 更新失败"
    unset PGPASSWORD
    exit 1
}
echo

echo "------------------------------------------------------------"
echo "步骤 3: 验证结果"
echo "------------------------------------------------------------"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "
SELECT username, email, 
       substring(password_hash, 1, 30) || '...' as password_hash_preview, 
       updated_at 
FROM core_users 
WHERE username = '${USERNAME}';
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
