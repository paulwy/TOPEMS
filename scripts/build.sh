#!/bin/bash

# =============================================
# TOPEMS 编译模块
# =============================================
# 服务编译/全量编译/前端编译

# 注意：此文件由 topems.sh source 引入，不要直接执行

# 编译服务（V70+ 增加内存自适应 & 构建锁；V3xx 统一离线优先 + SQLx 缓存门禁）
build_service() {
    local service_name=$1
    shift
    local -a extra_opts=("$@")
    local service_path
    service_path=$(get_service_path "$service_name")

    # V70+ 保存/恢复 CARGO_BUILD_JOBS，避免污染后续构建
    local _orig_cargo_jobs="${CARGO_BUILD_JOBS:-}"
    local _cargo_jobs_modified=0
    _restore_cargo_jobs() {
        if [ "$_cargo_jobs_modified" -eq 1 ]; then
            if [ -n "$_orig_cargo_jobs" ]; then
                export CARGO_BUILD_JOBS="$_orig_cargo_jobs"
            else
                unset CARGO_BUILD_JOBS
            fi
            _cargo_jobs_modified=0
        fi
    }

    [ -z "$service_path" ] && error "服务 $service_name 不存在" && return 1

    info "编译 $service_name 服务..."
    local executable_name
    executable_name=$(get_executable_name "$service_name")
    cd "$PROJECT_ROOT" || return 1

    # V3xx 参数解析
    local online="${FORCE_ONLINE_BUILD:-0}"
    local offline_only=0
    local profile="--release"
    local _opt
    for _opt in "${extra_opts[@]}"; do
        case "$_opt" in
            --dev|--debug) profile="" ;;
            --online)      online=1 ;;
            --offline)     online=0; offline_only=1 ;;
        esac
    done

    # V70+ 内存自适应 + serial 模式
    local cargo_jobs=""
    local mem_status=0
    local _safe_mode=0
    local _serial_requested=0
    if [[ " ${extra_opts[*]} " == *" --serial "* ]]; then
        _serial_requested=1
    fi

    # --serial 模式：强制单线程构建，忽略内存检查
    if [ $_serial_requested -eq 1 ]; then
        export CARGO_BUILD_JOBS=1
        _cargo_jobs_modified=1
        cargo_jobs=" (jobs=1, 串行模式)"
    elif [[ " ${extra_opts[*]} " != *" --skip-mem-check "* ]]; then
        _check_available_memory
        mem_status=$?
        case "$mem_status" in
            2)
                _restore_cargo_jobs
                error "内存不足，无法安全编译 $service_name。请释放内存后重试，或使用 --skip-mem-check 跳过。"
                return 1
                ;;
            1)
                # 内存偏低：限制并行编译线程数
                local cpu_count
                cpu_count=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
                local safe_jobs=$(( cpu_count / 2 ))
                [ "$safe_jobs" -lt 1 ] && safe_jobs=1
                export CARGO_BUILD_JOBS=$safe_jobs
                _cargo_jobs_modified=1
                cargo_jobs=" (jobs=$safe_jobs, 内存安全模式)"
                _safe_mode=1
                ;;
            *)
                # 内存充足：使用默认并行
                ;;
        esac
    fi

    # V3xx：统一离线优先
    local cmd
    if [ "$online" = "1" ]; then
        cmd="SQLX_OFFLINE='' cargo build $profile --bin $executable_name"
    else
        cmd="SQLX_OFFLINE=true cargo build $profile --bin $executable_name"
    fi
    info "  命令: $cmd$cargo_jobs"

    if eval "$cmd" 2>&1; then
        success "$service_name 编译成功 ($( [ -z "$profile" ] && echo "debug" || echo "release" ), $( [ "$online" = "1" ] && echo "online" || echo "offline sqlx" ))"
        _restore_cargo_jobs
        return 0
    fi

    # 内存不足导致失败时，不再重试
    if [ "$mem_status" -eq 2 ] || [ "$mem_status" -eq 1 ]; then
        _restore_cargo_jobs
        error "$service_name 编译失败（可能与内存不足有关）。建议: 释放内存后重试。"
        return 1
    fi

    # --offline 显式指定：失败即停
    if [ "$offline_only" -eq 1 ]; then
        _restore_cargo_jobs
        error "$service_name 离线编译失败（--offline 模式不回退在线编译）。"
        return 1
    fi

    # 默认模式：离线失败自动尝试在线
    warning "$service_name 离线编译失败，自动尝试在线编译（需要 DATABASE_URL）..."
    load_env
    local online_url="${DATABASE_URL:-}"
    if [ "$service_name" = "mes" ] && [ -n "$online_url" ] && [[ "$online_url" != *"search_path"* ]]; then
        if [[ "$online_url" == *"?"* ]]; then
            online_url="${online_url}&options=-csearch_path=mes,public"
        else
            online_url="${online_url}?options=-csearch_path=mes,public"
        fi
    fi
    if [ -z "$online_url" ]; then
        _restore_cargo_jobs
        error "未配置 DATABASE_URL（.env 缺失或未设置），无法在线回退。"
        return 1
    fi
    if DATABASE_URL="$online_url" SQLX_OFFLINE='' cargo build $profile --bin "$executable_name" 2>&1; then
        success "$service_name 在线编译成功"
        _restore_cargo_jobs
        return 0
    else
        _restore_cargo_jobs
        error "$service_name 编译失败（离线+在线均失败）"
        return 1
    fi
}

# 编译前端
build_frontend() {
    local -a extra_opts=("$@")
    info "编译前端..."

    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
    ensure_frontend_deps "$pkg_cmd" || return 1

    local dev_mode=0
    local skip_lint=0
    for opt in "${extra_opts[@]}"; do
        case "$opt" in
            --dev|--debug) dev_mode=1 ;;
            --skip-lint)   skip_lint=1 ;;
        esac
    done

    # V64+ 防御：只调用 apps/web/package.json 中"真正存在"的 scripts
    local pkg_scripts
    pkg_scripts=$(cd "$PROJECT_ROOT/apps/web" && node -e 'console.log(Object.keys(require("./package.json").scripts || {}).join("\n"))' 2>/dev/null || true)
    has_script() {
        local name="$1"
        printf '%s\n' "$pkg_scripts" | grep -Fxq "$name"
    }

    local cmd="$pkg_cmd build"
    # 1. --dev / --debug：优先 build:dev（若存在），否则回退到 build + 提示
    if [ $dev_mode -eq 1 ]; then
        if has_script "build:dev"; then
            cmd="$pkg_cmd build:dev"
        else
            warning "apps/web/package.json 未定义 build:dev 脚本，回退到默认 build（tsc && vite build）"
            cmd="$pkg_cmd build"
        fi
    fi

    # 2. --skip-lint：如果有 build:nolint 之类变体就用，否则直接忽略
    if [ $skip_lint -eq 1 ]; then
        if has_script "build:nolint"; then
            cmd="$pkg_cmd build:nolint"
        else
            warning "apps/web/package.json 未定义 build:nolint，--skip-lint 被忽略（当前 build 不跑 lint，可直接使用）"
        fi
    fi

    info "  命令: cd apps/web && $cmd"
    if ( cd "$PROJECT_ROOT/apps/web" && eval "$cmd" 2>&1 ); then
        success "前端编译成功"
        return 0
    fi

    # 二次降级：如果 pnpm <script> 失败，再尝试直接调用 vite build
    warning "脚本 $cmd 失败，自动降级尝试直接调用 vite build ..."
    local fallback_cmd="$pkg_cmd exec -- tsc && $pkg_cmd exec -- vite build"
    info "  降级命令: cd apps/web && $fallback_cmd"
    if ( cd "$PROJECT_ROOT/apps/web" && eval "$fallback_cmd" 2>&1 ); then
        success "前端编译成功（降级 vite build）"
        return 0
    fi

    error "前端编译失败（两次尝试均失败）。直接手工排查：cd apps/web && $pkg_cmd build"
    return 1
}
