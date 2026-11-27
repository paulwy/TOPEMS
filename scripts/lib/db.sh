# shellcheck shell=bash
# =============================================
# TOPEMS lib/db.sh（自 scripts/topems.sh 拆分，2026-11-02）
# =============================================

parse_database_url() {
    # 本机默认走 socket 认证（不内嵌任何口令）：postgres:///topems 由当前 OS 用户连接；
    # 生产/远端经 DATABASE_URL 显式注入，禁止把带口令的连接串写成默认值。
    local db_url=${DATABASE_URL:-"postgres:///topems"}
    # 格式: postgres://user:password@host:port/database
    DB_USER=$(echo "$db_url" | sed -n 's|postgres://\([^:]*\):.*|\1|p')
    DB_PASSWORD=$(echo "$db_url" | sed -n 's|postgres://[^:]*:\([^@]*\)@.*|\1|p')
    DB_HOST=$(echo "$db_url" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$db_url" | sed -n 's|.*@.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$db_url" | sed -n 's|.*/\([^/]*\)$|\1|p')
    DB_USER=${DB_USER:-$(id -un)}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-topems}
}

# =============================================
# 数据库/缓存状态检查（跨平台：Windows/Git Bash · Linux · macOS）
# =============================================

# 定位 psql（跨平台）：PATH → 常见安装目录

find_psql_bin() {
    local p
    p=$(command -v psql 2>/dev/null)
    if [ -z "$p" ] && _is_windows; then
        for pg_dir in "/c/Program Files/PostgreSQL"/*/bin "/d/Program Files/PostgreSQL"/*/bin "/e/Program Files/PostgreSQL"/*/bin; do
            if [ -x "$pg_dir/psql" ]; then p="$pg_dir/psql"; break; fi
        done
    fi
    [ -n "$p" ] && echo "$p"
}

# 分层检查 PostgreSQL 是否就绪（跨平台）
# 第一层 pg_isready（官方工具，最快；0=接受连接 1=拒绝连接 2=无响应）
# 缺失时回退 psql SELECT 1
# 返回: 0=接受连接 1=运行中但拒绝 2=未运行/无响应

db_is_ready() {
    parse_database_url
    local psql_cmd=${PSQL_BIN:-$(find_psql_bin)}
    local pg_isready_cmd=""
    if command -v pg_isready &>/dev/null; then
        pg_isready_cmd="pg_isready"
    elif [ -n "$psql_cmd" ]; then
        local pi
        pi="$(dirname "$psql_cmd")/pg_isready"
        [ -x "$pi" ] && pg_isready_cmd="$pi"
    fi

    if [ -n "$pg_isready_cmd" ]; then
        "$pg_isready_cmd" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1
        local code=$?
        case $code in
            0) return 0 ;;
            1) return 1 ;;
            *) return 2 ;;
        esac
    fi

    if [ -n "$psql_cmd" ] && PGPASSWORD=$DB_PASSWORD "$psql_cmd" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        return 0
    fi
    return 2
}

# 定位 redis-cli（跨平台）：PATH → 常见安装目录

find_redis_cli() {
    local rcli
    rcli=$(command -v redis-cli 2>/dev/null)
    if [ -z "$rcli" ] && _is_windows; then
        for rdir in "/e/ZenTao/bin/redis" "/c/Program Files/Redis" "/d/Program Files/Redis" "/c/Program Files/Memurai"; do
            if [ -x "$rdir/redis-cli.exe" ]; then rcli="$rdir/redis-cli.exe"; break; fi
        done
    fi
    [ -n "$rcli" ] && echo "$rcli"
}

# 从 REDIS_URL 提取密码（无密码输出空）

redis_auth_arg() {
    [ -n "$REDIS_URL" ] && echo "$REDIS_URL" | sed -n 's|redis://:\([^@]*\)@.*|\1|p'
}

# Redis 是否就绪（带密码 ping，跨平台）

redis_is_ready() {
    local rcli
    rcli=$(find_redis_cli)
    [ -z "$rcli" ] && return 2
    local rpass
    rpass=$(redis_auth_arg)
    if [ -n "$rpass" ]; then
        "$rcli" -a "$rpass" ping >/dev/null 2>&1
    else
        "$rcli" ping >/dev/null 2>&1
    fi
}

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
        # Windows/Git Bash：PostgreSQL 通常已注册为 Windows 服务，仅需探测 psql
        local psql_bin
        psql_bin=$(find_psql_bin)
        if [ -z "$psql_bin" ]; then
            error "未找到 psql，请安装 PostgreSQL 并将其 bin 目录加入 PATH（或使用 topems.ps1）"
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
        warn "PostgreSQL 运行中但拒绝新连接（连接数可能已满或正在恢复），请检查 max_connections"
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
        # Windows：PostgreSQL 是系统服务，脚本不管理其生命周期
        warn "Windows 下 PostgreSQL 由系统服务管理，请用管理员终端执行: Stop-Service postgresql-x64-* -Force"
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
        case "$(detect_os)" in
            windows)
                local pid
                pid=$(netstat -ano 2>/dev/null | grep -E "[:.]${DB_PORT} .*LISTENING" | awk '{print $NF}' | sort -u | head -1)
                [ -n "$pid" ] && detail "端口 ${DB_PORT} 由 postgres (PID ${pid}) 监听"
                ;;
            linux)
                local act
                act=$(systemctl is-active postgresql 2>/dev/null || true)
                [ -n "$act" ] && detail "systemd 服务状态: ${act}"
                ;;
            darwin)
                local brewst
                brewst=$(brew services list 2>/dev/null | grep -iE 'postgres' | head -1 || true)
                [ -n "$brewst" ] && detail "${brewst}"
                ;;
        esac
    elif [ "$rc" -eq 1 ]; then
        warn "PostgreSQL 运行中但拒绝新连接（连接数可能已满或正在恢复）"
    else
        error "PostgreSQL 未运行（端口 ${DB_PORT} 无响应）"
    fi

    echo ""
    info "=== Redis 状态 ==="
    if redis_is_ready; then
        local rcli
        rcli=$(find_redis_cli)
        local rpass
        rpass=$(redis_auth_arg)
        local rver=""
        if [ -n "$rpass" ]; then
            rver=$("$rcli" -a "$rpass" info server 2>/dev/null | grep "redis_version" | head -1)
        else
            rver=$("$rcli" info server 2>/dev/null | grep "redis_version" | head -1)
        fi
        success "Redis 运行中"
        [ -n "$rver" ] && detail "Redis 版本: ${rver#redis_version:}"
    else
        error "Redis 未运行或认证失败（请检查 REDIS_URL 与 redis-server）"
    fi
}

# 启动 Redis

redis_start() {
    info "启动 Redis..."
    if command -v brew &> /dev/null; then
        brew services start redis 2>/dev/null
        sleep 2
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start redis 2>/dev/null || true
    fi

    local redis_cli
    redis_cli=$(find_redis_cli)
    if [ -z "$redis_cli" ]; then
        error "未找到 redis-cli，请安装 Redis 并将其 bin 目录加入 PATH（或使用 topems.ps1）"
        return 1
    fi
    if redis_is_ready; then
        success "Redis 已启动"
        return 0
    else
        error "Redis 启动失败（ping 不通或认证失败）"
        return 1
    fi
}

# 停止 Redis

redis_stop() {
    info "停止 Redis..."
    if _is_windows; then
        warn "Windows 下 Redis 由系统服务/禅道等自带进程管理，请自行停止对应服务或进程（脚本不代为停止）"
        return 1
    fi
    if command -v brew &> /dev/null; then
        brew services stop redis 2>/dev/null
    elif command -v systemctl &> /dev/null; then
        sudo systemctl stop redis 2>/dev/null || true
    fi
    success "Redis 已停止"
}

# 数据库迁移

db_migrate() {
    info "运行数据库迁移（统一入口 scripts/migrate.sh）..."
    cd "$PROJECT_ROOT" || exit 1

    load_env
    parse_database_url

    # 收敛为 migrate.sh 唯一入口（sqlx-cli 优先、psql fallback 结构与 sqlx 对齐）：
    # 扫描 database/migrations + svc/*/migrations，失败返回非零（不误记账、不静默空转）
    if ! command -v psql >/dev/null 2>&1 && ! command -v sqlx >/dev/null 2>&1; then
        error "未找到 psql/sqlx-cli，请安装 PostgreSQL 客户端后重试"
        return 1
    fi

    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    bash "$PROJECT_ROOT/scripts/migrate.sh" run
    return $?
}

# ==============================================================================
# Schema 防御自检（V69.2）
#
# 退出码语义：
#   0 = 全部通过（0 WARN / 0 ERROR）
#   1 = 有警告（存在 仍缺失 X 列 的 WARN）
#   2 = 有错误（编译失败 / 服务启动失败 / 没找到 defense 日志 等）
# ==============================================================================

# 跨平台 timeout 包装：优先系统 timeout(Linux) / gtimeout(macOS brew coreutils)，
# 均不可用时用 bash 后台进程 + sleep + TERM/KILL 兜底模拟。
#
# 用法: _timeout <seconds> <cmd...>
# 始终将 stdout/stderr 捕获到当前 shell 中；到达秒数强制终止。

_timeout() {
    local secs="$1"; shift
    if command -v timeout >/dev/null 2>&1; then
        timeout --kill-after=2 "$secs" "$@"
        return $?
    fi
    if command -v gtimeout >/dev/null 2>&1; then
        gtimeout --kill-after=2 "$secs" "$@"
        return $?
    fi
    # Bash 原生兜底：后台跑 + sleep + TERM（2秒后补KILL）
    local pid
    ( "$@" ) &
    pid=$!
    (
        sleep "$secs"
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    ) &
    local watcher=$!
    wait "$pid" 2>/dev/null
    local rc=$?
    wait "$watcher" 2>/dev/null || true
    # TERM/KILL 子进程时 wait 返回 128+sig 或其它，但我们只关心程序跑完没
    return $rc
}


defense_check_color() {
    # 根据退出码染色打印
    local code="$1"
    local svc="$2"
    local detail="$3"
    case "$code" in
        0) success "[✓ PASS] $svc  —  $detail" ;;
        1) warning "[⚠ WARN] $svc  —  $detail" ;;
        *) error   "[✗ FAIL] $svc  —  $detail" ;;
    esac
}

# 单个服务的 defense-check：
#   1) 先尝试 cargo check（缺则 warn 不中断）
#   2) 启动该服务 10 秒捕获启动日志
#   3) grep [svc schema 自检] 和 仍缺失列 关键字
#   返回: 0/1/2

db_defense_check() {
    local svc="$1"
    if [ -z "$svc" ]; then
        error "用法: topems.sh db defense-check <service>  例如: topems db defense-check ehs"
        echo "示例: ./scripts/topems.sh db defense-check gis"
        echo "      ./scripts/topems.sh db defense-check-all"
        exit 2
    fi

    local svc_dir="$PROJECT_ROOT/svc/$svc"
    if [ ! -d "$svc_dir" ]; then
        defense_check_color 2 "$svc" "目录 svc/$svc 不存在（请确认拼写）"
        return 2
    fi

    local rc=0
    local detail_parts=()

    # 阶段A: 编译存在性（强制项，但失败不退出）
    # 优先方案：预热后 target/debug/<pkg> 已存在 → 跳过 cargo check，复用已编译的二进制
    # 兜底方案：target 下缺失 → 用 cargo check -p 在 PROJECT_ROOT 下跑（共用 workspace target）
    local pkg_name="topems-${svc}"
    local bin_path="$PROJECT_ROOT/target/debug/${pkg_name}"
    info "[$svc] 编译检查..."
    if [ -x "$bin_path" ]; then
        detail_parts+=("build=SKIP（预热二进制已就绪 ${bin_path}）")
    elif ! topems_ensure_swagger_ui_archive >/dev/null 2>&1; then
        detail_parts+=("build=SKIP（swagger-ui 离线包缺失，见 scripts/lib/swagger-ui.sh）")
    elif (cd "$PROJECT_ROOT" && cargo check --offline -p "$pkg_name" 2>&1) \
        >/tmp/defense-check-${svc}-build.log 2>&1; then
        detail_parts+=("build=OK")
    else
        detail_parts+=("build=FAIL（见 /tmp/defense-check-${svc}-build.log）")
        rc=2
    fi

    # 阶段B: 捕获 15 秒启动日志，grep schema 自检段
    # 直接运行 target/debug/<pkg>（不经过 cargo run），避免每次再触发重编译耗时
    local log_tmp="/tmp/defense-check-${svc}-start.log"
    info "[$svc] 启动 15s 捕获 schema 自检日志（需要 DB 已运行）..."
    load_env 2>/dev/null || true
    if [ -x "$bin_path" ]; then
        (_timeout 15 "$bin_path" || true) > "$log_tmp" 2>&1 || true
    else
        (_timeout 15 "$SHELL" -c "cd '$PROJECT_ROOT' && cargo run --offline -p '$pkg_name' 2>&1" || true) \
            > "$log_tmp" 2>&1 || true
    fi

    # grep 迁移日志
    local stage1_line
    stage1_line=$(grep -E "增量迁移.*完成.*张表" "$log_tmp" 2>/dev/null | tail -1 || true)
    local stage2_line
    stage2_line=$(grep -E "schema 自检.*完成" "$log_tmp" 2>/dev/null | tail -1 || true)
    local warn_lines
    warn_lines=$(grep -E "仍缺失.*列" "$log_tmp" 2>/dev/null || true)

    if [ -z "$stage1_line" ] && [ -z "$stage2_line" ] && [ $rc -ne 2 ]; then
        # 既没 build 失败，也没自检日志 —— 说明该服务还没落地 TABLE_DEFS 防御
        detail_parts+=("defense=N/A（该服务尚未实现 TABLE_DEFS + 两阶段自检，请纳入下一批推进）")
        rc=1
    else
        # 统计表数 / 列数
        local t_count c_count
        t_count=$(echo "$stage1_line" | grep -oE "[0-9]+ 张表" | grep -oE "[0-9]+" | head -1)
        c_count=$(echo "$stage1_line" | grep -oE "[0-9]+ 列" | grep -oE "[0-9]+" | head -1)
        [ -z "$t_count" ] && t_count=0
        [ -z "$c_count" ] && c_count=0
        local miss_count
        miss_count=$(printf '%s' "$warn_lines" | grep -c "仍缺失" 2>/dev/null || true)
        [ -z "$miss_count" ] && miss_count=0

        detail_parts+=("tables=$t_count cols=$c_count missing-tables=$miss_count")
        if [ "$miss_count" -gt 0 ] && [ $rc -eq 0 ]; then
            rc=1
        fi
    fi

    # 输出最终染色行 + 明细（WARN 时附具体缺列表）
    defense_check_color $rc "$svc" "$(IFS=" | "; echo "${detail_parts[*]}")"
    if [ $rc -eq 1 ] && [ -n "$warn_lines" ]; then
        echo "$warn_lines" | sed 's/^/         └─  /'
    fi
    return $rc
}


db_defense_check_all() {
    info "全量 Schema 防御自检：遍历 svc/*（无需 DB / 无需前台启动）"
    echo "===================================================================="
    local total=0 pass=0 warn=0 fail=0
    # 第1批（已落地，P0）
    local b1_total=0 b1_pass=0 b1_warn=0 b1_fail=0
    for svc in gis ehs portal finance; do
        b1_total=$((b1_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b1_pass=$((b1_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b1_warn=$((b1_warn + 1)) ;;
                *) fail=$((fail + 1)); b1_fail=$((b1_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第1批（核心4服务）汇总：通过 $b1_pass / 警告 $b1_warn / 失败 $b1_fail （共 ${b1_total} 服务）"
    echo
    # 第2批（高频业务11服务 — V69.3 shared-db 抽象，已落地）
    local b2_total=0 b2_pass=0 b2_warn=0 b2_fail=0
    for svc in erp hrm crm pm scm wms srm pdm mes qms lims; do
        b2_total=$((b2_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b2_pass=$((b2_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b2_warn=$((b2_warn + 1)) ;;
                *) fail=$((fail + 1)); b2_fail=$((b2_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第2批（高频业务11服务）汇总：通过 $b2_pass / 警告 $b2_warn / 失败 $b2_fail （共 ${b2_total} 服务）"
    echo
    # 第3批（业务5服务 — V69.3 shared-db 抽象，已落地）
    local batch3="ai rd ticket plugin-registry mobile"
    local b3_total=0 b3_pass=0 b3_warn=0 b3_fail=0
    for svc in $batch3; do
        b3_total=$((b3_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b3_pass=$((b3_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b3_warn=$((b3_warn + 1)) ;;
                *) fail=$((fail + 1)); b3_fail=$((b3_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第3批（业务5服务 — V69.3 shared-db 抽象）汇总：通过 $b3_pass / 警告 $b3_warn / 失败 $b3_fail （共 ${b3_total} 服务）"
    echo
    # 第4批（平台5服务 — V69.3 shared-db 抽象，已落地）
    local batch4="unified-core integration master-data communication analytics"
    local b4_total=0 b4_pass=0 b4_warn=0 b4_fail=0
    for svc in $batch4; do
        b4_total=$((b4_total + 1)); total=$((total + 1))
        if db_defense_check "$svc"; then pass=$((pass + 1)); b4_pass=$((b4_pass + 1))
        else
            local exit_code=$?
            local rc=$exit_code
            case "$rc" in
                1) warn=$((warn + 1)); b4_warn=$((b4_warn + 1)) ;;
                *) fail=$((fail + 1)); b4_fail=$((b4_fail + 1)) ;;
            esac
        fi
        echo "--------------------------------------------------------------------"
    done
    echo
    info "第4批（平台5服务 — V69.3 shared-db 抽象）汇总：通过 $b4_pass / 警告 $b4_warn / 失败 $b4_fail （共 ${b4_total} 服务）"
    echo
    # 骨架服务（无 DB 表，跳过）— monitor / search
    # [V2026.08 已移除] lowcode（原骨架服务）
    info "骨架服务（无 DB 表，已排除）：monitor search"
    echo "===================================================================="
    info "全量汇总（共 ${total} 服务）：通过 $pass / 警告 $warn / 失败 $fail"
    echo "Exit codes: 0=全通过  1=有警告(缺列)  2=有错误(build/启动)"
    local overall=0
    [ $warn -gt 0 ] && overall=1
    [ $fail -gt 0 ] && overall=2
    return $overall
}

# 备份数据库

db_backup() {
    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/topems_db_${timestamp}.sql"

    mkdir -p "$backup_dir"

    info "备份数据库到 $backup_file..."
    load_env
    parse_database_url

    local backup_success=false
    
    if command -v docker &> /dev/null && docker ps | grep -q postgres; then
        info "使用 Docker 执行备份..."
        if docker exec -t topems-postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>&1; then
            backup_success=true
        fi
    else
        info "使用本地 psql 执行备份..."
        if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>&1; then
            backup_success=true
        fi
    fi

    if [ "$backup_success" = true ] && [ -s "$backup_file" ]; then
        success "数据库备份成功: $backup_file ($(du -h "$backup_file" | cut -f1))"
        return 0
    else
        [ -f "$backup_file" ] && rm -f "$backup_file"
        error "数据库备份失败"
        return 1
    fi
}

# 恢复数据库

db_restore() {
    local backup_file=$1
    [ -z "$backup_file" ] && { error "请指定备份文件"; return 1; }
    [ ! -f "$backup_file" ] && { error "备份文件不存在: $backup_file"; return 1; }

    info "恢复数据库从 $backup_file..."
    load_env
    parse_database_url

    read -p "确认恢复数据库 $DB_NAME ? [y/N] " confirm
    [[ ! "$confirm" =~ ^[Yy]$ ]] && { info "取消恢复"; return 0; }

    if command -v docker &> /dev/null && docker ps | grep -q postgres; then
        cat "$backup_file" | docker exec -i topems-postgres psql -U "$DB_USER" "$DB_NAME"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" < "$backup_file"
    fi

    success "数据库恢复完成"
}

# 重置数据库

db_reset() {
    load_env
    parse_database_url

    read -p "确认重置数据库 $DB_NAME ? 将会删除所有数据! [y/N] " confirm
    [[ ! "$confirm" =~ ^[Yy]$ ]] && { info "取消重置"; return 0; }

    info "重置数据库..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    success "数据库重置完成"
}

# =============================================
# 一键运行/停止
# =============================================

# 一键运行：启动依赖 + 所有服务
