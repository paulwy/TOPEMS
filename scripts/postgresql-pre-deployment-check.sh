#!/bin/bash
# TOPEMS PostgreSQL 生产环境配置调优 - 部署前检查脚本
# 版本：v1.0
# 日期：2026-09-11
# 用途：在部署 PostgreSQL 配置调优前进行全面检查，确保环境满足部署条件

set -euo pipefail

# ==================== 配置变量 ====================

# PostgreSQL 配置文件路径（根据实际环境修改）
# PG_CONF="/etc/postgresql/16/main/postgresql.conf"  # Linux
PG_CONF="/opt/homebrew/var/postgresql@18/postgresql.conf"  # macOS Homebrew

# PostgreSQL 数据目录
# PG_DATA="/var/lib/postgresql/16/main"  # Linux
PG_DATA="/opt/homebrew/var/postgresql@18"  # macOS Homebrew

# PostgreSQL 服务名（systemd/Linux）
PG_SERVICE="postgresql"

# 备份目录
# BACKUP_DIR="/var/backups/postgresql"  # Linux
BACKUP_DIR="/opt/homebrew/var/postgresql@18/backups"  # macOS Homebrew

# 最低要求配置
MIN_MEMORY_GB=8
MIN_CPU_CORES=2
MIN_DISK_SPACE_GB=10
MIN_PG_VERSION="16"

# 目标配置参数（用于对比）
# 使用普通数组兼容 bash 3.2（macOS 默认），格式：参数名|目标值
TARGET_CONFIG=(
    "shared_buffers|4GB"
    "effective_cache_size|12GB"
    "work_mem|16MB"
    "maintenance_work_mem|512MB"
    "max_wal_size|4GB"
    "min_wal_size|1GB"
    "checkpoint_timeout|15min"
    "random_page_cost|1.1"
    "effective_io_concurrency|200"
    "default_statistics_target|200"
    "max_connections|200"
    "shared_preload_libraries|pg_stat_statements"
    "log_min_duration_statement|1000"
    "logging_collector|on"
)

# ==================== 颜色定义 ====================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==================== 计数器 ====================

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

# ==================== 工具函数 ====================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARN_COUNT=$((WARN_COUNT + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

print_section() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# ==================== 检查函数 ====================

# 1. 操作系统检查
check_os() {
    print_section "1. 操作系统检查"

    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        log_pass "操作系统: $NAME $VERSION"
    elif [[ "$(uname)" == "Darwin" ]]; then
        log_pass "操作系统: macOS $(sw_vers -productVersion)"
        log_warn "当前为 macOS 开发环境，生产环境建议使用 Linux"
    else
        log_fail "无法识别操作系统"
    fi

    # 检查内核版本
    local kernel_version=$(uname -r)
    log_info "内核版本: $kernel_version"
}

# 2. 硬件资源检查
check_hardware() {
    print_section "2. 硬件资源检查"

    # CPU 核心数
    local cpu_cores=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "0")
    if [[ "$cpu_cores" -ge "$MIN_CPU_CORES" ]]; then
        log_pass "CPU 核心数: $cpu_cores (最低要求: $MIN_CPU_CORES)"
    else
        log_fail "CPU 核心数不足: $cpu_cores (最低要求: $MIN_CPU_CORES)"
    fi

    # 内存大小
    local memory_kb=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")
    if [[ "$memory_kb" == "0" ]]; then
        memory_kb=$(sysctl -n hw.memsize 2>/dev/null | awk '{print $1/1024}' || echo "0")
    fi
    local memory_gb=$(echo "scale=2; $memory_kb / 1024 / 1024" | bc 2>/dev/null || echo "0")

    if (( $(echo "$memory_gb >= $MIN_MEMORY_GB" | bc -l) )); then
        log_pass "内存大小: ${memory_gb}GB (最低要求: ${MIN_MEMORY_GB}GB)"
    else
        log_fail "内存不足: ${memory_gb}GB (最低要求: ${MIN_MEMORY_GB}GB)"
    fi

    # 磁盘类型和空间
    log_info "磁盘信息:"
    if command -v lsblk &> /dev/null; then
        lsblk -d -o name,rota,size 2>/dev/null | head -10
        local ssd_count=$(lsblk -d -n -o rota 2>/dev/null | grep -c "0" || echo "0")
        if [[ "$ssd_count" -gt 0 ]]; then
            log_pass "检测到 SSD 磁盘 ($ssd_count 个)"
        else
            log_warn "未检测到 SSD 磁盘，如为 HDD 请勿修改 random_page_cost"
        fi
    elif [[ "$(uname)" == "Darwin" ]]; then
        log_info "macOS 系统，假设使用 SSD"
        log_pass "磁盘类型: SSD (假设)"
    fi

    # 备份目录空间
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_space_kb=$(df -k "$BACKUP_DIR" | tail -1 | awk '{print $4}')
        local backup_space_gb=$(echo "scale=2; $backup_space_kb / 1024 / 1024" | bc 2>/dev/null || echo "0")
        if (( $(echo "$backup_space_gb >= $MIN_DISK_SPACE_GB" | bc -l) )); then
            log_pass "备份目录空间: ${backup_space_gb}GB (最低要求: ${MIN_DISK_SPACE_GB}GB)"
        else
            log_fail "备份目录空间不足: ${backup_space_gb}GB (最低要求: ${MIN_DISK_SPACE_GB}GB)"
        fi
    else
        log_warn "备份目录不存在: $BACKUP_DIR (部署时会自动创建)"
    fi
}

# 3. PostgreSQL 检查
check_postgresql() {
    print_section "3. PostgreSQL 检查"

    # PostgreSQL 版本
    if command -v psql &> /dev/null; then
        local pg_version=$(psql --version | awk '{print $3}')
        local pg_major_version=$(echo "$pg_version" | cut -d. -f1)
        if [[ "$pg_major_version" -ge "$MIN_PG_VERSION" ]]; then
            log_pass "PostgreSQL 版本: $pg_version (最低要求: $MIN_PG_VERSION)"
        else
            log_fail "PostgreSQL 版本过低: $pg_version (最低要求: $MIN_PG_VERSION)"
        fi
    else
        log_fail "psql 命令未找到，PostgreSQL 可能未安装"
        return
    fi

    # PostgreSQL 运行状态
    if pg_isready -q 2>/dev/null; then
        log_pass "PostgreSQL 运行状态: 正常"
    else
        log_fail "PostgreSQL 运行状态: 未运行或无法连接"
    fi

    # 配置文件检查
    if [[ -f "$PG_CONF" ]]; then
        log_pass "配置文件存在: $PG_CONF"
        if [[ -r "$PG_CONF" ]]; then
            log_pass "配置文件可读"
        else
            log_fail "配置文件不可读"
        fi
        if [[ -w "$PG_CONF" ]]; then
            log_pass "配置文件可写"
        else
            log_warn "配置文件不可写（部署时需要 sudo 权限）"
        fi
    else
        log_fail "配置文件不存在: $PG_CONF"
    fi

    # 数据目录检查
    if [[ -d "$PG_DATA" ]]; then
        log_pass "数据目录存在: $PG_DATA"
    else
        log_fail "数据目录不存在: $PG_DATA"
    fi
}

# 4. 当前配置检查
check_current_config() {
    print_section "4. 当前配置检查"

    if ! pg_isready -q 2>/dev/null; then
        log_warn "PostgreSQL 未运行，跳过配置检查"
        return
    fi

    printf "%-30s %-20s %-20s %s\n" "参数名" "当前值" "目标值" "状态"
    printf "%-30s %-20s %-20s %s\n" "------" "------" "------" "----"

    for config_item in "${TARGET_CONFIG[@]}"; do
        local param=$(echo "$config_item" | cut -d'|' -f1)
        local target_value=$(echo "$config_item" | cut -d'|' -f2)
        local current_value=$(psql -U air -d topems -t -c "SHOW $param;" 2>/dev/null | tr -d '[:space:]' || echo "N/A")
        local status="待修改"

        if [[ "$current_value" == "$target_value" ]]; then
            status="已匹配"
        fi

        printf "%-30s %-20s %-20s %s\n" "$param" "$current_value" "$target_value" "$status"
    done
}

# 5. 数据库连接检查
check_connections() {
    print_section "5. 数据库连接检查"

    if ! pg_isready -q 2>/dev/null; then
        log_warn "PostgreSQL 未运行，跳过连接检查"
        return
    fi

    # 总连接数
    local total_connections=$(psql -U air -d topems -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d '[:space:]' || echo "0")
    local max_connections=$(psql -U air -d topems -t -c "SHOW max_connections;" 2>/dev/null | tr -d '[:space:]' || echo "0")
    local connection_usage=$(echo "scale=1; $total_connections * 100 / $max_connections" | bc 2>/dev/null || echo "0")

    log_info "总连接数: $total_connections / $max_connections (${connection_usage}%)"

    if (( $(echo "$connection_usage > 80" | bc -l) )); then
        log_warn "连接使用率超过 80%，建议在业务低峰期部署"
    else
        log_pass "连接使用率正常"
    fi

    # 活跃连接数
    local active_connections=$(psql -U air -d topems -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d '[:space:]' || echo "0")
    log_info "活跃连接数: $active_connections"

    if [[ "$active_connections" -gt 10 ]]; then
        log_warn "活跃连接数较多 ($active_connections)，建议在业务低峰期部署"
    else
        log_pass "活跃连接数正常"
    fi

    # 最长查询时间
    local longest_query=$(psql -U air -d topems -t -c "
        SELECT COALESCE(max(EXTRACT(EPOCH FROM (now() - query_start))), 0)::int
        FROM pg_stat_activity
        WHERE state = 'active' AND pid != pg_backend_pid();
    " 2>/dev/null | tr -d '[:space:]' || echo "0")

    log_info "最长运行查询: ${longest_query}秒"

    if [[ "$longest_query" -gt 300 ]]; then
        log_warn "存在运行超过 5 分钟的查询，部署重启可能会中断这些查询"
    else
        log_pass "无长时间运行的查询"
    fi
}

# 6. 备份准备检查
check_backup() {
    print_section "6. 备份准备检查"

    # 备份目录
    if [[ -d "$BACKUP_DIR" ]]; then
        log_pass "备份目录存在: $BACKUP_DIR"
    else
        log_warn "备份目录不存在: $BACKUP_DIR (部署时会自动创建)"
    fi

    # 配置文件备份
    if [[ -f "$PG_CONF" ]]; then
        local conf_backup_count=$(ls -1 "$BACKUP_DIR"/postgresql.conf.backup-* 2>/dev/null | wc -l | tr -d '[:space:]')
        if [[ "$conf_backup_count" -gt 0 ]]; then
            log_pass "已存在 $conf_backup_count 个配置文件备份"
            ls -lh "$BACKUP_DIR"/postgresql.conf.backup-* 2>/dev/null | tail -3
        else
            log_info "暂无配置文件备份（部署时会自动创建）"
        fi
    fi

    # 数据库备份（可选检查）
    local db_backup_count=$(ls -1 "$BACKUP_DIR"/*.dump 2>/dev/null | wc -l | tr -d '[:space:]')
    if [[ "$db_backup_count" -gt 0 ]]; then
        log_pass "已存在 $db_backup_count 个数据库备份"
    else
        log_warn "暂无数据库备份，建议部署前执行数据库备份（可选但推荐）"
    fi
}

# 7. 监控准备检查
check_monitoring() {
    print_section "7. 监控准备检查"

    # Prometheus（可选）
    if command -v curl &> /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/ 2>/dev/null | grep -q "200"; then
            log_pass "Prometheus 运行正常 (http://localhost:9090)"
        else
            log_info "未检测到 Prometheus（可选）"
        fi

        # postgres_exporter（可选）
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:9187/metrics 2>/dev/null | grep -q "200"; then
            log_pass "postgres_exporter 运行正常 (http://localhost:9187)"
        else
            log_info "未检测到 postgres_exporter（可选）"
        fi
    fi

    # Grafana（可选）
    if command -v curl &> /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200\|302"; then
            log_pass "Grafana 运行正常 (http://localhost:3000)"
        else
            log_info "未检测到 Grafana（可选）"
        fi
    fi
}

# ==================== 主函数 ====================

main() {
    echo "========================================"
    echo "TOPEMS PostgreSQL 配置调优 - 部署前检查"
    echo "========================================"
    echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "配置文件: $PG_CONF"
    echo "数据目录: $PG_DATA"
    echo "备份目录: $BACKUP_DIR"

    # 执行检查
    check_os
    check_hardware
    check_postgresql
    check_current_config
    check_connections
    check_backup
    check_monitoring

    # 输出总结
    print_section "检查总结"
    echo -e "${GREEN}通过 (PASS): $PASS_COUNT${NC}"
    echo -e "${YELLOW}警告 (WARN): $WARN_COUNT${NC}"
    echo -e "${RED}失败 (FAIL): $FAIL_COUNT${NC}"
    echo ""

    if [[ "$FAIL_COUNT" -gt 0 ]]; then
        echo -e "${RED}存在失败项，请先解决失败项后再进行部署。${NC}"
        exit 1
    elif [[ "$WARN_COUNT" -gt 0 ]]; then
        echo -e "${YELLOW}存在警告项，建议评估后再进行部署。${NC}"
        echo ""
        echo "部署命令: sudo /tmp/postgresql-production-config-tuning.sh --apply"
        echo "回滚命令: sudo /tmp/postgresql-production-config-tuning.sh --rollback"
        exit 0
    else
        echo -e "${GREEN}所有检查通过，可以进行部署。${NC}"
        echo ""
        echo "部署命令: sudo /tmp/postgresql-production-config-tuning.sh --apply"
        echo "回滚命令: sudo /tmp/postgresql-production-config-tuning.sh --rollback"
        exit 0
    fi
}

main "$@"
