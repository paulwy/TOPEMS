# =============================================
# TOPEMS lib/run.sh（自 scripts/topems.sh 拆分，2026-11-02）
# =============================================

run_all() {
    _preflight_check "$@" || return 1

    # D3: --auto-build 选项（先全量编译再启动；剥掉避免透传）
    local do_auto_build=0
    local -a run_opts=()
    local opt
    for opt in "$@"; do
        if [ "$opt" = "--auto-build" ]; then
            do_auto_build=1
        else
            run_opts+=("$opt")
        fi
    done
    if [ $do_auto_build -eq 1 ]; then
        info "========== --auto-build：先全量编译 =========="
        build_all "${run_opts[@]}" || { error "build-all 失败，中止 run"; return 1; }
    fi

    # D3: 二进制产物缺失检测（未构建时启动会逐服务自动编译，较慢）
    local missing_count=0
    local missing_names=""
    local svc exe
    for svc in $(get_all_services); do
        exe=$(get_executable_name "$svc")
        if [ -n "$exe" ] && [ ! -f "$PROJECT_ROOT/target/release/$exe" ]; then
            missing_count=$((missing_count + 1))
            missing_names="$missing_names $svc"
        fi
    done
    if [ "$missing_count" -gt 0 ]; then
        warning "检测到 ${missing_count} 个服务二进制缺失（未构建），启动时将逐个自动编译（较慢）"
        info "缺失:${missing_names}"
        info "建议先执行: $0 build-all 或 $0 run --auto-build"
    fi

    info "========== 一键运行 =========="

    # 1. 启动数据库
    db_start || { error "数据库启动失败，无法继续。请检查 PostgreSQL 配置。"; return 1; }
    redis_start || { error "Redis 启动失败，无法继续。请检查 Redis 配置。"; return 1; }
    sleep 2

    # 2. 启动所有服务（透传 --only-core / --no-frontend / --skip= 等参数，不含 --auto-build）
    start_all_services "${run_opts[@]}"

    echo ""
    success "一键运行完成！"
    show_all_status
}

# 一键停止：停止所有服务 + 数据库

stop_everything() {
    info "========== 一键停止 =========="

    # 1. 停止所有服务
    stop_all_services

    # 2. 停止数据库（可选）
    read -p "是否同时停止 PostgreSQL 和 Redis ? [y/N] " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        db_stop
        redis_stop
    fi

    success "一键停止完成"
}

# 重启所有服务（支持透传 --only-core / --no-frontend / --skip= 等）

restart_all() {
    info "========== 重启所有服务 =========="
    stop_all_services
    sleep 2
    start_all_services "$@"
    show_all_status
}

# 调用Python CLI

run_cli() {
    if [ -d "$CLI_DIR" ]; then
        local cli_entry="$CLI_DIR/bin/topems"
        if [ -f "$cli_entry" ]; then
            "$cli_entry" "$@"
            return $?
        fi
        cd "$CLI_DIR"
        # 创建虚拟环境（如果不存在）
        if [ ! -f ".venv/bin/activate" ]; then
            info "创建 Python 虚拟环境 .venv ..."
            python3 -m venv .venv
        fi
        source .venv/bin/activate
        export PYTHONPATH="$CLI_DIR/src"
        # 检查依赖（httpx 为 health.py 真实依赖，自检包清单须与 cli/bin/topems:38 一致）
        python3 -c "import yaml, click, rich, httpx" 2>/dev/null || {
            info "缺少 Python CLI 依赖，正在安装..."
            python3 -m pip install pyyaml click rich httpx --quiet
        }
        python3 -m topems_cli "$@"
    else
        error "Python CLI 未安装"
        echo "请运行以下命令安装:"
        echo "  cd $CLI_DIR && python3 -m venv .venv && source .venv/bin/activate && python3 -m pip install pyyaml click rich httpx"
        exit 1
    fi
}

# =============================================
# 清理/预检 公共工具函数（供 clean_project 和 _preflight_check 共用）
# =============================================

# kill 后台 cargo-(llvm-cov|test|bench|build) 进程
# 用法: _kill_background_cargo [--dry-run]
# 返回: 0=无进程（无动作）, 1=有动作（已终止或 dry-run 预览）

_kill_background_cargo() {
    local dry_run=false
    [ "$1" = "--dry-run" ] && dry_run=true

    local cargo_pids
    # 覆盖: cargo test/build/bench/run/check/clippy/fmt（空格分隔）+ cargo-nextest/llvm-cov（连字符）+ rustc 编译进程
    cargo_pids=$(ps aux | grep -v grep \
        | grep -E "cargo (nextest )?(test|build|bench|run|check|clippy|fmt)|cargo-(llvm-cov|nextest|test|build|bench)|rustc" \
        | grep -v "grep" \
        | awk '{print $2}' | tr '\n' ' ')

    [ -z "$cargo_pids" ] && return 0

    # 2026-10-03：仅保留工作目录在本仓库的进程（防误杀其他项目/并行会话的编译）
    local filtered_pids=""
    local p2
    for p2 in $cargo_pids; do
        if lsof -a -p "$p2" -d cwd -Fn 2>/dev/null | grep -q "$PROJECT_ROOT"; then
            filtered_pids="$filtered_pids $p2"
        fi
    done
    cargo_pids="${filtered_pids# }"
    [ -z "$cargo_pids" ] && return 0

    if $dry_run; then
        info "[DRY-RUN] 将终止后台 cargo 进程: $cargo_pids"
        return 1
    fi

    warn "检测到后台 cargo 进程（会持续膨胀 target 吃磁盘），自动终止: $cargo_pids"
    local p
    for p in $cargo_pids; do
        kill "$p" 2>/dev/null || true
    done
    sleep 2
    local still=""
    for p in $cargo_pids; do
        kill -0 "$p" 2>/dev/null && still="$still $p"
    done
    if [ -n "$still" ]; then
        warn "TERM 未退出，强制 kill -9:$still"
        for p in $still; do
            kill -9 "$p" 2>/dev/null || true
        done
    fi
    # 兜底强杀：仅针对工作目录在本仓库的残留进程（与上方 cwd 过滤一致，防误杀其他项目）
    local force_pids
    force_pids=$(ps aux | grep -v grep | grep -E "cargo-llvm-cov|cargo test.*llvm-cov|cargo nextest" | awk '{print $2}' | tr '\n' ' ')
    local fp
    for fp in $force_pids; do
        if lsof -a -p "$fp" -d cwd -Fn 2>/dev/null | grep -q "$PROJECT_ROOT"; then
            kill -9 "$fp" 2>/dev/null || true
        fi
    done
    success "后台 cargo 进程已终止"
    return 1
}

# 清理独立 target 残留目录（cargo clean 不会碰它们；2026-10-01 起 target-dir 已为绝对路径，
# svc/*/target 与 lib/*/target 均为历史/子目录单独构建残留，删除可消除依赖重复编译）
# 用法: _clean_cov_remnants [--dry-run]
# 返回: 0=无残留, 1=已清理或 dry-run 预览
