#!/bin/bash
# TOPEMS 回滚脚本
# 位置: /opt/topems/scripts/rollback.sh
# 使用: ./scripts/rollback.sh [backup_dir]
# 示例: ./scripts/rollback.sh /opt/topems/backups/20260621_100000

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检测 docker compose 命令
detect_docker_compose() {
    if command -v docker-compose &>/dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

DC=$(detect_docker_compose)

print_info() {
    echo -e "${YELLOW}ℹ INFO${NC} - $1"
}

print_ok() {
    echo -e "${GREEN}✅ OK${NC} - $1"
}

print_fail() {
    echo -e "${RED}❌ FAILED${NC} - $1"
}

# 检查是否为 root 用户或有 sudo 权限
if [ "$EUID" -ne 0 ] && ! sudo -v 2>/dev/null; then
    print_fail "需要 root 权限运行此脚本"
    exit 1
fi

echo "=========================================="
echo "  TOPEMS 回滚脚本"
echo "=========================================="
echo ""

# 确定备份目录
BACKUP_DIR=${1:-""}
if [ -z "$BACKUP_DIR" ]; then
    # 自动查找最新的备份
    BACKUP_DIR=$(ls -td /opt/topems/backups/*/ 2>/dev/null | head -1)
    
    if [ -z "$BACKUP_DIR" ]; then
        print_fail "未找到备份目录"
        echo "请手动指定备份目录: $0 /opt/topems/backups/YYYYMMDD_HHMMSS/"
        exit 1
    fi
fi

print_info "使用备份目录: $BACKUP_DIR"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_DIR/database.sql" ]; then
    print_fail "备份文件不存在: $BACKUP_DIR/database.sql"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/.env.backup" ]; then
    print_info "环境变量备份不存在，将使用当前配置"
fi

# 确认操作
echo ""
read -p "确定要执行回滚吗？此操作将覆盖当前数据。 (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "取消回滚操作"
    exit 0
fi

echo ""
print_info "开始回滚..."
echo ""

# 1. 停止服务
print_info "1. 停止所有服务..."
cd /opt/topems
$DC down
print_ok "服务已停止"

# 2. 备份当前数据库（以防万一）
print_info "2. 备份当前数据库..."
CURRENT_BACKUP="/opt/topems/backups/pre_rollback_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$CURRENT_BACKUP"
if $DC exec -T postgres pg_dump -U topems topems > "$CURRENT_BACKUP/database_pre_rollback.sql" 2>/dev/null; then
    print_ok "当前数据库已备份到: $CURRENT_BACKUP/database_pre_rollback.sql"
else
    print_fail "备份当前数据库失败，跳过"
fi

# 3. 恢复环境变量
if [ -f "$BACKUP_DIR/.env.backup" ]; then
    print_info "3. 恢复环境变量..."
    cp "$BACKUP_DIR/.env.backup" /opt/topems/.env
    print_ok "环境变量已恢复"
else
    print_info "3. 跳过环境变量恢复"
fi

# 4. 恢复数据库
print_info "4. 恢复数据库..."
$DC up -d postgres redis
sleep 5

# 删除现有数据库
print_info "删除现有数据库..."
$DC exec -T postgres dropdb -U topems topems 2>/dev/null || true

# 创建新数据库
print_info "创建新数据库..."
$DC exec -T postgres createdb -U topems topems

# 恢复数据
print_info "导入备份数据..."
$DC exec -T postgres psql -U topems -d topems < "$BACKUP_DIR/database.sql" && {
    print_ok "数据库已恢复"
} || {
    print_fail "数据库恢复失败"
    exit 1
}

# 5. 恢复上传文件（如果有）
if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
    print_info "5. 恢复上传文件..."
    tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C /opt/topems/ 2>/dev/null || true
    print_ok "上传文件已恢复"
fi

# 6. 启动服务
print_info "6. 启动服务..."
$DC up -d

# 7. 等待服务启动
print_info "7. 等待服务启动..."
sleep 15

# 8. 验证回滚结果
echo ""
print_info "8. 验证回滚结果..."

# 检查服务状态
RUNNING=$(docker ps --filter "name=topems-" --filter "status=running" -q 2>/dev/null | wc -l | tr -d ' ' || echo "0")
if [ "$RUNNING" -ge 2 ]; then
    print_ok "服务已启动"
else
    print_fail "部分服务未启动，请检查日志"
fi

# 检查数据库
PERM_COUNT=$($DC exec -T postgres psql -U topems -d topems -t -c "SELECT COUNT(*) FROM core_permissions;" 2>/dev/null | xargs || echo "0")
if [ "$PERM_COUNT" -ge 10 ]; then
    print_ok "权限数据已恢复 ( $PERM_COUNT 个权限)"
else
    print_fail "权限数据异常"
fi

# 检查管理员登录
sleep 2
LOGIN_RESULT=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

if echo "$LOGIN_RESULT" | grep -q '"success":true'; then
    print_ok "管理员登录正常"
else
    print_fail "管理员登录异常"
fi

echo ""
echo "=========================================="
echo "  回滚完成"
echo "=========================================="
echo ""
echo "如果需要进一步调查问题，请查看日志："
echo "  $DC logs -f"
echo ""
echo "如果需要恢复到回滚前的状态，请使用："
echo "  $CURRENT_BACKUP/database_pre_rollback.sql"
