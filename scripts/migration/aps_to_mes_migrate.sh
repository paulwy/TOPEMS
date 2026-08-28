#!/bin/bash
# ============================================================
# APS → MES 数据迁移执行脚本
# 版本: 1.0
# 日期: 2026-08-28
#
# 用法:
#   ./scripts/migration/aps_to_mes_migrate.sh [--dry-run] [--force]
#
# 选项:
#   --dry-run   只执行验证，不实际迁移
#   --force     跳过确认提示，直接执行
#
# 环境变量:
#   DATABASE_URL  PostgreSQL 连接字符串
#                 例如: postgres://user:pass@localhost:5432/topems
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/aps_to_mes_data_migration.sql"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# 解析参数
DRY_RUN=false
FORCE=false
for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN=true ;;
        --force) FORCE=true ;;
        *) log_error "未知参数: $arg"; exit 1 ;;
    esac
done

# 检查 SQL 文件
if [ ! -f "$SQL_FILE" ]; then
    log_error "SQL 文件不存在: $SQL_FILE"
    exit 1
fi

# 检查 DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    log_error "请设置 DATABASE_URL 环境变量"
    log_info "例如: export DATABASE_URL=postgres://user:pass@localhost:5432/topems"
    exit 1
fi

# 检查 psql 命令
if ! command -v psql &> /dev/null; then
    log_error "未找到 psql 命令，请安装 PostgreSQL 客户端"
    exit 1
fi

echo ""
echo "============================================================"
echo "  APS → MES 数据迁移"
echo "============================================================"
echo ""
log_info "数据库: $(echo $DATABASE_URL | sed 's/:[^:@]*@/:****@/')"
log_info "SQL 文件: $SQL_FILE"
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY-RUN 模式：只验证，不实际迁移"
    echo ""
fi

# 确认提示
if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    log_warn "此操作将修改数据库，请确保已备份！"
    read -p "是否继续？(yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "已取消迁移"
        exit 0
    fi
fi

echo ""
log_info "开始迁移..."

# 执行迁移
if [ "$DRY_RUN" = true ]; then
    # DRY-RUN: 只执行验证查询部分
    psql "$DATABASE_URL" -c "
        SELECT 'production_plans' AS table_name,
               (SELECT COUNT(*) FROM plugin_aps.aps_production_plans) AS source_count,
               (SELECT COUNT(*) FROM production_plans) AS target_count;
        SELECT 'capacities' AS table_name,
               (SELECT COUNT(*) FROM plugin_aps.aps_capacities) AS source_count,
               (SELECT COUNT(*) FROM capacities) AS target_count;
        SELECT 'demand_forecasts' AS table_name,
               (SELECT COUNT(*) FROM plugin_aps.aps_demand_forecasts) AS source_count,
               (SELECT COUNT(*) FROM demand_forecasts) AS target_count;
    "
else
    # 实际迁移
    psql "$DATABASE_URL" -f "$SQL_FILE" -v ON_ERROR_STOP=1
fi

if [ $? -eq 0 ]; then
    echo ""
    log_success "迁移执行完成！"
    echo ""
    log_info "请检查上方的计数对比结果，确认数据迁移正确"
    log_info "如果数据正确，请在 SQL 文件中取消 COMMIT 的注释，或手动执行 COMMIT"
    echo ""
    log_warn "后续步骤（确认数据正确后）："
    log_warn "  1. 在 SQL 文件中取消 COMMIT 注释，或手动执行 COMMIT"
    log_warn "  2. 可选：备份或删除 plugin_aps schema"
    log_warn "  3. 更新配置，停止 APS 服务"
else
    log_error "迁移执行失败，请检查错误信息"
    exit 1
fi
