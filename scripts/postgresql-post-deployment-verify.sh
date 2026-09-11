#!/bin/bash
# TOPEMS PostgreSQL 生产环境配置调优 - 部署后验证脚本
# 版本：v1.0
# 日期：2026-09-11
# 用途：在部署 PostgreSQL 配置调优后进行全面验证，确认配置生效且系统正常

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

# 目标数据库名
DB_NAME="topems"

# 目标配置参数（用于验证）
declare -A TARGET_CONFIG=(
    ["shared_buffers"]="4GB"
    ["effective_cache_size"]="12GB"
    ["work_mem"]="16MB"
    ["maintenance_work_mem"]="512MB"
    ["max_wal_size"]="4GB"
    ["min_wal_size"]="1GB"
    ["checkpoint_timeout"]="15min"
    ["random_page_cost"]="1.1"
    ["effective_io_concurrency"]="200"
    ["default_statistics_target"]="200"
    ["max_connections"]="200"
    ["shared_preload_libraries"]="pg_stat_statements"
    ["log_min_duration_statement"]="1000"
    ["logging_collector"]="on"
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

# 执行 SQL 查询
exec_sql() {
    local sql="$1"
    local db="${2:-postgres}"
    sudo -u postgres psql -t -A -c "$sql" -d "$db" 2>/dev/null || echo ""
}

# ==================== 验证函数 ====================

# 1. 基础服务验证
verify_basic_service() {
    print_section "1. 基础服务验证"

    # systemd 服务状态（Linux）
    if command -v systemctl &> /dev/null; then
        local service_status=$(systemctl is-active "$PG_SERVICE" 2>/dev/null || echo "unknown")
        if [[ "$service_status" == "active" ]]; then
            log_pass "PostgreSQL 服务状态: active"
        else
            log_fail "PostgreSQL 服务状态: $service_status"
        fi
    else
        log_info "非 systemd 系统，跳过服务状态检查"
    fi

    # 数据库连接
    if pg_isready -q 2>/dev/null; then
        log_pass "PostgreSQL 连接: 正常"
    else
        log_fail "PostgreSQL 连接: 失败"
        return 1
    fi

    # 目标数据库连接
    local db_test=$(exec_sql "SELECT 1;" "$DB_NAME")
    if [[ "$db_test" == "1" ]]; then
        log_pass "目标数据库连接 ($DB_NAME): 正常"
    else
        log_fail "目标数据库连接 ($DB_NAME): 失败"
    fi

    # PostgreSQL 版本
    local pg_version=$(exec_sql "SELECT version();" | head -1 | awk '{print $2}')
    log_info "PostgreSQL 版本: $pg_version"

    # 运行时间
    local uptime=$(exec_sql "SELECT now() - pg_postmaster_start_time();")
    log_info "PostgreSQL 运行时间: $uptime"
}

# 2. 配置参数验证
verify_config_params() {
    print_section "2. 配置参数验证"

    printf "%-30s %-20s %-20s %s\n" "参数名" "当前值" "目标值" "状态"
    printf "%-30s %-20s %-20s %s\n" "------" "------" "------" "----"

    for param in "${!TARGET_CONFIG[@]}"; do
        local current_value=$(exec_sql "SHOW $param;")
        local target_value=${TARGET_CONFIG[$param]}
        local status="FAIL"
        local status_color="$RED"

        # 特殊处理：shared_buffers 和 effective_cache_size 的单位是 8KB
        if [[ "$param" == "shared_buffers" || "$param" == "effective_cache_size" ]]; then
            # 将当前值转换为 GB 进行比较
            local current_kb=$((current_value * 8))
            local current_gb=$(echo "scale=0; $current_kb / 1024 / 1024" | bc 2>/dev/null || echo "0")
            local target_gb=$(echo "$target_value" | sed 's/GB//')
            if [[ "$current_gb" == "$target_gb" ]]; then
                status="PASS"
                status_color="$GREEN"
            fi
        elif [[ "$current_value" == "$target_value" ]]; then
            status="PASS"
            status_color="$GREEN"
        fi

        printf "%-30s %-20s %-20s %b%s%b\n" "$param" "$current_value" "$target_value" "$status_color" "$status" "$NC"

        if [[ "$status" == "PASS" ]]; then
            PASS_COUNT=$((PASS_COUNT + 1))
        else
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    done
}

# 3. pg_stat_statements 验证
verify_pg_stat_statements() {
    print_section "3. pg_stat_statements 验证"

    # 扩展是否存在
    local ext_exists=$(exec_sql "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements';" "$DB_NAME")
    if [[ "$ext_exists" == "1" ]]; then
        log_pass "pg_stat_statements 扩展: 已创建"
    else
        log_fail "pg_stat_statements 扩展: 未创建"
        return
    fi

    # 扩展版本
    local ext_version=$(exec_sql "SELECT extversion FROM pg_extension WHERE extname = 'pg_stat_statements';" "$DB_NAME")
    log_info "pg_stat_statements 版本: $ext_version"

    # 统计信息
    local stats=$(exec_sql "
        SELECT 
            count(*) as queries,
            sum(calls) as calls,
            round(sum(total_exec_time)::numeric, 2) as total_time_ms,
            round(avg(mean_exec_time)::numeric, 2) as avg_mean_time_ms
        FROM pg_stat_statements;
    " "$DB_NAME")

    local queries=$(echo "$stats" | cut -d'|' -f1)
    local calls=$(echo "$stats" | cut -d'|' -f2)
    local total_time=$(echo "$stats" | cut -d'|' -f3)
    local avg_time=$(echo "$stats" | cut -d'|' -f4)

    log_info "统计信息: $queries 个查询, $calls 次调用, 总时间 ${total_time}ms, 平均 ${avg_time}ms"

    if [[ "$queries" -gt 0 ]]; then
        log_pass "pg_stat_statements 数据收集: 正常"
    else
        log_warn "pg_stat_statements 数据收集: 暂无数据（需要运行一些查询后才会有数据）"
    fi

    # Top 5 慢查询
    log_info "Top 5 总执行时间最长的查询:"
    exec_sql "
        SELECT 
            LEFT(query, 60) as query,
            calls,
            round(total_exec_time::numeric, 2) as total_time_ms,
            round(mean_exec_time::numeric, 2) as mean_time_ms
        FROM pg_stat_statements
        ORDER BY total_exec_time DESC
        LIMIT 5;
    " "$DB_NAME" | while IFS='|' read -r query calls total_time mean_time; do
        if [[ -n "$query" && "$query" != "query" ]]; then
            echo "  - $query (calls: $calls, total: ${total_time}ms, mean: ${mean_time}ms)"
        fi
    done
}

# 4. 慢查询日志验证
verify_slow_query_log() {
    print_section "4. 慢查询日志验证"

    # 日志收集器状态
    local logging_collector=$(exec_sql "SHOW logging_collector;")
    if [[ "$logging_collector" == "on" ]]; then
        log_pass "日志收集器: 已启用"
    else
        log_fail "日志收集器: 未启用"
    fi

    # 慢查询阈值
    local log_min_duration=$(exec_sql "SHOW log_min_duration_statement;")
    log_info "慢查询阈值: ${log_min_duration}ms"

    # 日志目录
    local log_directory=$(exec_sql "SHOW log_directory;")
    local log_filename=$(exec_sql "SHOW log_filename;")
    log_info "日志目录: $log_directory"
    log_info "日志文件名格式: $log_filename"

    # 查找最新的日志文件
    local log_dir_path="$PG_DATA/$log_directory"
    if [[ -d "$log_dir_path" ]]; then
        local latest_log=$(ls -t "$log_dir_path"/*.log 2>/dev/null | head -1)
        if [[ -n "$latest_log" ]]; then
            log_info "最新日志文件: $latest_log"

            # 检查慢查询记录
            local slow_query_count=$(grep -c "duration:" "$latest_log" 2>/dev/null || echo "0")
            if [[ "$slow_query_count" -gt 0 ]]; then
                log_pass "慢查询日志记录: 已记录 $slow_query_count 条"
            else
                log_info "慢查询日志记录: 暂无慢查询记录（阈值 ${log_min_duration}ms）"
            fi
        else
            log_warn "未找到日志文件"
        fi
    else
        log_warn "日志目录不存在: $log_dir_path"
    fi

    # 测试慢查询记录（执行一个 1.5 秒的查询）
    log_info "执行测试慢查询（1.5秒）..."
    exec_sql "SELECT pg_sleep(1.5);" "$DB_NAME" > /dev/null
    log_info "测试慢查询已执行，请检查日志文件确认记录"
}

# 5. 性能指标验证
verify_performance_metrics() {
    print_section "5. 性能指标验证"

    # 连接数
    local total_connections=$(exec_sql "SELECT count(*) FROM pg_stat_activity;")
    local active_connections=$(exec_sql "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
    local idle_connections=$(exec_sql "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';")
    local max_connections=$(exec_sql "SHOW max_connections;")
    local connection_usage=$(echo "scale=1; $total_connections * 100 / $max_connections" | bc 2>/dev/null || echo "0")

    log_info "连接数: 总 $total_connections / 最大 $max_connections (${connection_usage}%)"
    log_info "  - 活跃: $active_connections"
    log_info "  - 空闲: $idle_connections"

    if (( $(echo "$connection_usage < 80" | bc -l) )); then
        log_pass "连接使用率: 正常 (${connection_usage}%)"
    else
        log_warn "连接使用率: 较高 (${connection_usage}%)"
    fi

    # 缓存命中率
    local cache_stats=$(exec_sql "
        SELECT 
            sum(heap_blks_read) as heap_read,
            sum(heap_blks_hit) as heap_hit,
            round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2) as cache_hit_rate
        FROM pg_statio_user_tables;
    ")

    local cache_hit_rate=$(echo "$cache_stats" | cut -d'|' -f3)
    log_info "数据缓存命中率: ${cache_hit_rate}%"

    if (( $(echo "$cache_hit_rate > 90" | bc -l) )); then
        log_pass "数据缓存命中率: 优秀 (${cache_hit_rate}%)"
    elif (( $(echo "$cache_hit_rate > 80" | bc -l) )); then
        log_warn "数据缓存命中率: 良好 (${cache_hit_rate}%)"
    else
        log_fail "数据缓存命中率: 较低 (${cache_hit_rate}%)"
    fi

    # 索引命中率
    local index_stats=$(exec_sql "
        SELECT 
            sum(idx_blks_read) as idx_read,
            sum(idx_blks_hit) as idx_hit,
            round(sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read)) * 100, 2) as index_hit_rate
        FROM pg_statio_user_indexes;
    ")

    local index_hit_rate=$(echo "$index_stats" | cut -d'|' -f3)
    log_info "索引缓存命中率: ${index_hit_rate}%"

    if (( $(echo "$index_hit_rate > 90" | bc -l) )); then
        log_pass "索引缓存命中率: 优秀 (${index_hit_rate}%)"
    elif (( $(echo "$index_hit_rate > 80" | bc -l) )); then
        log_warn "索引缓存命中率: 良好 (${index_hit_rate}%)"
    else
        log_fail "索引缓存命中率: 较低 (${index_hit_rate}%)"
    fi

    # 数据库大小
    local db_size=$(exec_sql "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    log_info "数据库大小: $db_size"

    # 事务吞吐量
    local xact_stats=$(exec_sql "
        SELECT 
            sum(xact_commit + xact_rollback) as total_transactions,
            now() - pg_postmaster_start_time() as uptime
        FROM pg_stat_database 
        WHERE datname = '$DB_NAME';
    ")

    local total_transactions=$(echo "$xact_stats" | cut -d'|' -f1)
    log_info "总事务数: $total_transactions (自启动以来)"
}

# 6. 系统资源验证
verify_system_resources() {
    print_section "6. 系统资源验证"

    # CPU 使用率
    if command -v top &> /dev/null; then
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 2>/dev/null || echo "0")
        log_info "CPU 使用率: ${cpu_usage}%"

        if (( $(echo "$cpu_usage < 80" | bc -l) )); then
            log_pass "CPU 使用率: 正常"
        else
            log_warn "CPU 使用率: 较高"
        fi
    fi

    # 内存使用率
    if command -v free &> /dev/null; then
        local memory_info=$(free -m | grep Mem)
        local total_memory=$(echo "$memory_info" | awk '{print $2}')
        local used_memory=$(echo "$memory_info" | awk '{print $3}')
        local memory_usage=$(echo "scale=1; $used_memory * 100 / $total_memory" | bc 2>/dev/null || echo "0")

        log_info "内存使用: ${used_memory}MB / ${total_memory}MB (${memory_usage}%)"

        if (( $(echo "$memory_usage < 80" | bc -l) )); then
            log_pass "内存使用率: 正常"
        else
            log_warn "内存使用率: 较高"
        fi
    elif [[ "$(uname)" == "Darwin" ]]; then
        local memory_info=$(vm_stat | head -5)
        log_info "内存信息: $memory_info"
        log_pass "内存检查: 已完成（macOS）"
    fi

    # 磁盘 I/O
    if command -v iostat &> /dev/null; then
        log_info "磁盘 I/O 统计:"
        iostat -x 1 2 2>/dev/null | tail -10 || log_info "iostat 不可用"
    fi

    # 磁盘空间
    local disk_usage=$(df -h "$PG_DATA" | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    log_info "数据目录磁盘使用率: ${disk_usage}%"

    if [[ "$disk_usage" -lt 80 ]]; then
        log_pass "磁盘空间: 充足"
    else
        log_warn "磁盘空间: 不足"
    fi
}

# ==================== 主函数 ====================

main() {
    echo "========================================"
    echo "TOPEMS PostgreSQL 配置调优 - 部署后验证"
    echo "========================================"
    echo "验证时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "配置文件: $PG_CONF"
    echo "数据目录: $PG_DATA"
    echo "目标数据库: $DB_NAME"

    # 执行验证
    verify_basic_service
    verify_config_params
    verify_pg_stat_statements
    verify_slow_query_log
    verify_performance_metrics
    verify_system_resources

    # 输出总结
    print_section "验证总结"
    echo -e "${GREEN}通过 (PASS): $PASS_COUNT${NC}"
    echo -e "${YELLOW}警告 (WARN): $WARN_COUNT${NC}"
    echo -e "${RED}失败 (FAIL): $FAIL_COUNT${NC}"
    echo ""

    if [[ "$FAIL_COUNT" -gt 0 ]]; then
        echo -e "${RED}存在失败项，请检查并解决失败项。${NC}"
        echo ""
        echo "如无法解决，可执行回滚:"
        echo "  sudo /tmp/postgresql-production-config-tuning.sh --rollback"
        exit 1
    elif [[ "$WARN_COUNT" -gt 0 ]]; then
        echo -e "${YELLOW}存在警告项，建议持续观察。${NC}"
        echo ""
        echo "建议观察 24-48 小时，确认无异常后视为部署成功。"
        exit 0
    else
        echo -e "${GREEN}所有验证通过，部署成功！${NC}"
        echo ""
        echo "建议观察 24-48 小时，持续监控性能指标。"
        exit 0
    fi
}

main "$@"
