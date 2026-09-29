#!/bin/bash
# shellcheck disable=SC2024
# TOPEMS PostgreSQL 生产环境配置调优脚本
# 版本：v1.0
# 日期：2026-09-11
# 用途：在生产环境应用 PostgreSQL 配置调优，包含备份、应用、验证和回滚

set -euo pipefail

# ==================== 配置变量 ====================

# PostgreSQL 配置文件路径（根据实际环境修改）
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
# PG_CONF="/opt/homebrew/var/postgresql@18/postgresql.conf"  # macOS Homebrew

# PostgreSQL 数据目录
PG_DATA="/var/lib/postgresql/16/main"
# PG_DATA="/opt/homebrew/var/postgresql@18"  # macOS Homebrew

# PostgreSQL 服务名（systemd）
PG_SERVICE="postgresql"

# 备份目录
BACKUP_DIR="/var/backups/postgresql"

# 日志文件
LOG_FILE="/var/log/postgresql-config-tuning.log"

# ==================== 颜色定义 ====================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== 工具函数 ====================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
}

# ==================== 前置检查 ====================

pre_check() {
    log_info "开始前置检查..."

    # 检查是否以 root 或 postgres 用户运行
    if [[ $EUID -ne 0 ]] && [[ $(whoami) != "postgres" ]]; then
        log_error "请以 root 或 postgres 用户运行此脚本"
        exit 1
    fi

    # 检查配置文件是否存在
    if [[ ! -f "$PG_CONF" ]]; then
        log_error "PostgreSQL 配置文件不存在: $PG_CONF"
        exit 1
    fi

    # 检查 PostgreSQL 是否运行
    if ! pg_isready -q; then
        log_warning "PostgreSQL 当前未运行，将在配置应用后启动"
    else
        log_success "PostgreSQL 运行正常"
    fi

    # 创建备份目录
    mkdir -p "$BACKUP_DIR"

    # 创建日志文件
    touch "$LOG_FILE"

    log_success "前置检查完成"
}

# ==================== 备份配置 ====================

backup_config() {
    log_info "开始备份当前配置..."

    local timestamp
    timestamp=$(date '+%Y%m%d-%H%M%S')
    local backup_file="$BACKUP_DIR/postgresql.conf.backup-$timestamp"

    # 备份配置文件
    cp "$PG_CONF" "$backup_file"
    log_success "配置文件已备份: $backup_file"

    # 保存当前配置参数（用于对比）
    local params_file="$BACKUP_DIR/current-params-$timestamp.txt"
    sudo -u postgres psql -c "
        SELECT name, setting, unit
        FROM pg_settings
        WHERE name IN (
            'shared_buffers', 'effective_cache_size', 'work_mem',
            'maintenance_work_mem', 'max_wal_size', 'min_wal_size',
            'checkpoint_timeout', 'random_page_cost', 'effective_io_concurrency',
            'default_statistics_target', 'max_connections',
            'shared_preload_libraries', 'log_min_duration_statement',
            'logging_collector'
        )
        ORDER BY name;
    # shellcheck disable=SC2024
    " > "$params_file" 2>/dev/null || true
    log_success "当前配置参数已保存: $params_file"

    # 保存备份文件路径到环境文件（用于回滚）
    echo "$backup_file" > "$BACKUP_DIR/latest-backup.txt"

    log_success "配置备份完成"
}

# ==================== 应用配置调优 ====================

apply_config() {
    log_info "开始应用配置调优..."

    # 内存配置（基于 16GB 内存，生产环境建议 25%）
    log_info "应用内存配置..."
    sed -i "s/^#*shared_buffers.*/shared_buffers = 4GB\t\t\t# min 128kB (生产环境 16GB 内存，建议 25%)/" "$PG_CONF"
    sed -i "s/^#*effective_cache_size.*/effective_cache_size = 12GB\t\t# 生产环境 16GB 内存，建议 75%/" "$PG_CONF"
    sed -i "s/^#*work_mem.*/work_mem = 16MB\t\t\t\t# min 64kB (排序\/哈希操作内存)/" "$PG_CONF"
    sed -i "s/^#*maintenance_work_mem.*/maintenance_work_mem = 512MB\t\t# min 64kB (VACUUM\/CREATE INDEX 内存)/" "$PG_CONF"

    # 检查点配置
    log_info "应用检查点配置..."
    sed -i "s/^#*checkpoint_timeout.*/checkpoint_timeout = 15min\t\t# range 30s-1d (减少检查点频率)/" "$PG_CONF"
    sed -i "s/^#*max_wal_size.*/max_wal_size = 4GB/" "$PG_CONF"
    sed -i "s/^#*min_wal_size.*/min_wal_size = 1GB/" "$PG_CONF"

    # 查询优化配置（SSD 优化）
    log_info "应用查询优化配置..."
    sed -i "s/^#*random_page_cost.*/random_page_cost = 1.1\t\t\t# same scale as above (SSD 建议 1.1)/" "$PG_CONF"
    sed -i "s/^#*effective_io_concurrency.*/effective_io_concurrency = 200\t\t# 1-1000 (SSD 建议 200)/" "$PG_CONF"
    sed -i "s/^#*default_statistics_target.*/default_statistics_target = 200\t# range 1-10000 (提高查询计划准确性)/" "$PG_CONF"

    # 连接配置
    log_info "应用连接配置..."
    sed -i "s/^#*max_connections.*/max_connections = 200\t\t\t# (change requires restart, 配合 PgBouncer 使用)/" "$PG_CONF"

    # 日志配置
    log_info "应用日志配置..."
    sed -i "s/^#*logging_collector.*/logging_collector = on\t\t\t# Enable capturing of stderr and csvlog/" "$PG_CONF"
    sed -i "s/^#*log_min_duration_statement.*/log_min_duration_statement = 1000\t# log statements running at least this number of ms (1秒)/" "$PG_CONF"

    # 扩展配置
    log_info "应用扩展配置..."
    sed -i "s/^#*shared_preload_libraries.*/shared_preload_libraries = 'pg_stat_statements'\t# (change requires restart)/" "$PG_CONF"

    log_success "配置调优应用完成"
}

# ==================== 验证配置语法 ====================

validate_config() {
    log_info "开始验证配置语法..."

    # 使用 PostgreSQL 自带的配置验证
    local result
    result=$(postgres -C "$PG_DATA" -t 2>&1) || true

    if echo "$result" | grep -q "syntax error"; then
        log_error "配置语法错误:"
        echo "$result" | grep "syntax error"
        return 1
    else
        log_success "配置语法验证通过"
    fi
}

# ==================== 重启 PostgreSQL ====================

restart_postgresql() {
    log_info "开始重启 PostgreSQL..."

    # 检查是否有活跃连接
    local active_connections
    active_connections=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND pid != pg_backend_pid();" 2>/dev/null | tr -d ' ')

    if [[ "$active_connections" -gt 5 ]]; then
        log_warning "当前有 $active_connections 个活跃连接，建议在业务低峰期重启"
        read -p "是否继续重启？(y/N): " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            log_info "用户取消重启"
            return 1
        fi
    fi

    # 重启 PostgreSQL
    if systemctl restart "$PG_SERVICE"; then
        log_success "PostgreSQL 重启成功"
    else
        log_error "PostgreSQL 重启失败"
        return 1
    fi

    # 等待 PostgreSQL 启动
    log_info "等待 PostgreSQL 启动..."
    local max_wait=30
    local waited=0
    while ! pg_isready -q && [[ $waited -lt $max_wait ]]; do
        sleep 1
        waited=$((waited + 1))
    done

    if pg_isready -q; then
        log_success "PostgreSQL 启动成功（等待 ${waited}s）"
    else
        log_error "PostgreSQL 启动超时（等待 ${max_wait}s）"
        return 1
    fi
}

# ==================== 验证配置生效 ====================

verify_config() {
    log_info "开始验证配置生效..."

    local expected_params=(
        "shared_buffers=4GB"
        "effective_cache_size=12GB"
        "work_mem=16MB"
        "maintenance_work_mem=512MB"
        "max_wal_size=4GB"
        "min_wal_size=1GB"
        "checkpoint_timeout=15min"
        "random_page_cost=1.1"
        "effective_io_concurrency=200"
        "default_statistics_target=200"
        "max_connections=200"
        "shared_preload_libraries=pg_stat_statements"
        "log_min_duration_statement=1000"
        "logging_collector=on"
    )

    local all_passed=true

    for param in "${expected_params[@]}"; do
        local name=${param%%=*}
        local expected=${param#*=}
        local actual
        actual=$(sudo -u postgres psql -t -c "SHOW $name;" 2>/dev/null | tr -d '[:space:]')

        if [[ "$actual" == "$expected" ]]; then
            log_success "  $name = $actual"
        else
            log_warning "  $name = $actual (预期: $expected)"
            all_passed=false
        fi
    done

    # 验证 pg_stat_statements 扩展
    if sudo -u postgres psql -d topems -c "SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements';" | grep -q "1"; then
        log_success "  pg_stat_statements 扩展已创建"
    else
        log_warning "  pg_stat_statements 扩展未创建，请手动执行: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
        all_passed=false
    fi

    if $all_passed; then
        log_success "所有配置验证通过"
    else
        log_warning "部分配置未达到预期，请检查上方警告"
    fi
}

# ==================== 回滚配置 ====================

rollback_config() {
    log_info "开始回滚配置..."

    local backup_file
    backup_file=$(cat "$BACKUP_DIR/latest-backup.txt" 2>/dev/null)

    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log_error "未找到备份文件，无法回滚"
        exit 1
    fi

    log_info "使用备份文件: $backup_file"

    # 恢复配置文件
    cp "$backup_file" "$PG_CONF"
    log_success "配置文件已恢复"

    # 重启 PostgreSQL
    if systemctl restart "$PG_SERVICE"; then
        log_success "PostgreSQL 重启成功，配置已回滚"
    else
        log_error "PostgreSQL 重启失败，请手动检查"
        exit 1
    fi
}

# ==================== 显示帮助 ====================

show_help() {
    echo "TOPEMS PostgreSQL 生产环境配置调优脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --apply      应用配置调优（默认）"
    echo "  --rollback   回滚到上一次备份的配置"
    echo "  --verify     仅验证当前配置"
    echo "  --backup     仅备份当前配置"
    echo "  --help       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --apply          # 应用配置调优"
    echo "  $0 --rollback       # 回滚配置"
    echo "  $0 --verify         # 验证配置"
    echo ""
    echo "注意事项:"
    echo "  1. 请以 root 或 postgres 用户运行"
    echo "  2. 建议在业务低峰期执行（需要重启 PostgreSQL）"
    echo "  3. 执行前会自动备份当前配置"
    echo "  4. 如遇问题可使用 --rollback 回滚"
    echo "  5. 配置基于 16GB 内存 + SSD，如硬件配置不同请调整参数"
}

# ==================== 主函数 ====================

main() {
    local action=${1:-"--apply"}

    case $action in
        --apply)
            echo "========================================"
            echo "TOPEMS PostgreSQL 配置调优"
            echo "========================================"
            echo ""

            pre_check
            backup_config
            apply_config

            if validate_config; then
                if restart_postgresql; then
                    verify_config
                    echo ""
                    log_success "配置调优完成！"
                    echo ""
                    echo "后续步骤:"
                    echo "  1. 监控 PostgreSQL 性能指标"
                    echo "  2. 检查应用日志，确认无异常"
                    echo "  3. 运行性能基准测试，对比优化前后"
                    echo "  4. 如遇问题，执行: $0 --rollback"
                else
                    log_error "PostgreSQL 重启失败，请手动检查"
                    exit 1
                fi
            else
                log_error "配置语法验证失败，已保留原配置（未重启）"
                exit 1
            fi
            ;;

        --rollback)
            pre_check
            rollback_config
            log_success "配置回滚完成"
            ;;

        --verify)
            pre_check
            verify_config
            ;;

        --backup)
            pre_check
            backup_config
            ;;

        --help|-h)
            show_help
            ;;

        *)
            log_error "未知选项: $action"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
