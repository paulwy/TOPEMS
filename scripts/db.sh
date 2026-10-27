#!/bin/bash

# =============================================
# TOPEMS 数据库模块
# =============================================
# PostgreSQL 启动/停止/状态/迁移/备份/恢复

# 注意：此文件由 topems.sh source 引入，不要直接执行

# 启动 PostgreSQL
db_start() {
    info "启动 PostgreSQL..."
    if command -v brew &> /dev/null; then
        local pg_version
        pg_version=$(brew list | grep -E '^postgresql@[0-9]+$' | sort -r | head -1)
        if [ -n "$pg_version" ]; then
            brew services start "$pg_version" 2>/dev/null
        else
            brew services start postgresql 2>/dev/null
        fi
        sleep 2
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql 2>/dev/null || true
    elif _is_windows; then
        local psql_bin
        psql_bin=$(find_psql_bin)
        if [ -z "$psql_bin" ]; then
            error "未找到 psql，请安装 PostgreSQL 并将其 bin 目录加入 PATH"
            return 1
        fi
        PSQL_BIN="$psql_bin"
    fi

    parse_database_url
    db_is_ready
    local rc=$?
    if [ "$rc" -eq 0 ]; then
        success "PostgreSQL 已启动"
        return 0
    elif [ "$rc" -eq 1 ]; then
        warn "PostgreSQL 运行中但拒绝新连接（连接数可能已满或正在恢复）"
        return 1
    else
        error "PostgreSQL 未启动（端口 ${DB_PORT} 无响应）"
        return 1
    fi
}

# 停止 PostgreSQL
db_stop() {
    info "停止 PostgreSQL..."
    if _is_windows; then
        warn "Windows 下 PostgreSQL 由系统服务管理"
        return 1
    fi
    if command -v brew &> /dev/null; then
        local pg_version
        pg_version=$(brew list | grep -E '^postgresql@[0-9]+$' | sort -r | head -1)
        if [ -n "$pg_version" ]; then
            brew services stop "$pg_version" 2>/dev/null
        else
            brew services stop postgresql 2>/dev/null
        fi
    elif command -v systemctl &> /dev/null; then
        sudo systemctl stop postgresql 2>/dev/null || true
    fi
    success "PostgreSQL 已停止"
}

# 数据库状态
db_status() {
    parse_database_url
    local psql_cmd=${PSQL_BIN:-$(find_psql_bin)}
    info "=== PostgreSQL 状态 ==="
    db_is_ready
    local rc=$?
    if [ "$rc" -eq 0 ]; then
        success "PostgreSQL 运行中并接受连接"
        [ -n "$psql_cmd" ] && PGPASSWORD=$DB_PASSWORD "$psql_cmd" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>/dev/null | head -1
    elif [ "$rc" -eq 1 ]; then
        warn "PostgreSQL 运行中但拒绝新连接（连接数可能已满或正在恢复）"
    else
        error "PostgreSQL 未运行（端口 ${DB_PORT} 无响应）"
    fi
}
