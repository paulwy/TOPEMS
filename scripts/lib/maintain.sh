# =============================================
# TOPEMS lib/maintain.sh（自 scripts/topems.sh 拆分，2026-11-02）
# =============================================

_clean_cov_remnants() {
    local dry_run=false
    [ "$1" = "--dry-run" ] && dry_run=true

    local cov_dirs=(
        "$PROJECT_ROOT/target/llvm-cov-target"
        "$PROJECT_ROOT/lib"/*/target
        "$PROJECT_ROOT/svc"/*/target
    )
    local cleaned=0
    for cov_dir in "${cov_dirs[@]}"; do
        if [ -d "$cov_dir" ]; then
            local size
            size=$(du -sh "$cov_dir" 2>/dev/null | awk '{print $1}')
            if $dry_run; then
                info "[DRY-RUN] 将删除 coverage/target 残留: $cov_dir ($size)"
            else
                info "清理 coverage 残留: $cov_dir ($size)"
                rm -rf "$cov_dir"
                detail "已清理 $cov_dir"
            fi
            cleaned=1
        fi
    done
    return $cleaned
}

# 累计本次清理释放的空间（供 clean_project 结束报告；只在实际删除前调用）
# 用法: _acc_freed <目录/文件>

_acc_freed() {
    [ -e "$1" ] || return 0
    local k
    k=$(du -sk "$1" 2>/dev/null | awk '{print $1}')
    [ -n "$k" ] || k=0
    _CLEAN_FREED_KB=$((_CLEAN_FREED_KB + k))
    return 0
}

# 磁盘空间守卫
# 用法: _check_disk_space
# 返回: 0=磁盘充足, 1=磁盘不足（阻断）

_check_disk_space() {
    local avail_kb
    avail_kb=$(df -k "$PROJECT_ROOT" 2>/dev/null | awk 'NR==2 {print $4}')
    [ -z "$avail_kb" ] && return 0
    local avail_gb=$((avail_kb / 1024 / 1024))
    # 阈值可配置：DISK_BLOCK_GB（阻断）/ DISK_WARN_GB（警告），默认 5 / 10
    local block_gb="${DISK_BLOCK_GB:-5}"
    local warn_gb="${DISK_WARN_GB:-10}"
    if [ "$avail_gb" -lt "$block_gb" ]; then
        error "磁盘仅剩 ${avail_gb}GiB！即将满盘，请先执行: $0 clean-all（全量释放；日常增量: $0 clean）"
        return 1
    elif [ "$avail_gb" -lt "$warn_gb" ]; then
        warn "磁盘仅剩 ${avail_gb}GiB，建议执行: $0 clean（增量）或 clean-all（全量）"
    fi
    return 0
}

# =============================================
# 内存守卫 & 构建锁（V70+）
# =============================================
# 检查可用内存
# 返回: 0=充足(>2GB), 1=偏低(1-2GB, WARN), 2=不足(<1GB, FAIL)

_check_available_memory() {
    local avail_kb=0
    local threshold_gb_fatal=${BUILD_MEMORY_FATAL_GB:-1}
    local threshold_gb_warn=${BUILD_MEMORY_WARN_GB:-2}

    case "$(uname -s)" in
        Darwin)
            # macOS: free + inactive 都属于可回收内存
            local pages_free pages_inactive page_size
            pages_free=$(vm_stat 2>/dev/null | grep "Pages free" | awk '{print $3}' | tr -d '.')
            pages_inactive=$(vm_stat 2>/dev/null | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
            page_size=$(vm_stat 2>/dev/null | head -1 | grep -oE 'page size of [0-9]+' | grep -oE '[0-9]+' || echo 4096)
            [ -z "$pages_free" ] && return 0
            : "${pages_inactive:=0}"
            avail_kb=$(( (pages_free + pages_inactive) * page_size / 1024 ))
            ;;
        Linux)
            avail_kb=$(grep MemAvailable /proc/meminfo 2>/dev/null | awk '{print $2}')
            ;;
        *)
            return 0
            ;;
    esac

    [ -z "$avail_kb" ] || [ "$avail_kb" -eq 0 ] && return 0
    local avail_gb=$((avail_kb / 1024 / 1024))
    local avail_mb=$((avail_kb / 1024))

    if [ "$avail_gb" -lt "$threshold_gb_fatal" ]; then
        error "可用内存仅 ${avail_mb}MB！低于安全阈值 ${threshold_gb_fatal}GiB，构建可能失败。"
        error "建议: 关闭其他应用或增加 swap，然后重试。"
        return 2
    elif [ "$avail_gb" -lt "$threshold_gb_warn" ]; then
        warn "可用内存 ${avail_mb}MB，低于推荐阈值 ${threshold_gb_warn}GiB，将自动启用安全模式（串行+节流）。"
        return 1
    else
        detail "可用内存 ${avail_gb}GiB，充足"
        return 0
    fi
}

# 构建锁机制：防止多个 build-all 并发执行导致 cargo 包缓存锁竞争
# 锁文件: /tmp/topems-build.lock
_BUILD_LOCK="/tmp/topems-build.lock"


_acquire_build_lock() {
    local force=${1:-false}
    if [ -f "$_BUILD_LOCK" ]; then
        local lock_pid
        lock_pid=$(cat "$_BUILD_LOCK" 2>/dev/null)
        if [ -n "$lock_pid" ] && kill -0 "$lock_pid" 2>/dev/null; then
            if [ "$force" = "true" ]; then
                warn "构建锁被 PID=$lock_pid 占用，强制获取..."
                kill "$lock_pid" 2>/dev/null || true
                sleep 1
            else
                error "检测到另一个构建正在运行 (PID=$lock_pid)，请等待其完成。"
                error "如需强制获取锁，使用 --force 参数。"
                return 1
            fi
        else
            warn "发现过期的构建锁 (PID=$lock_pid 已不存在)，清理..."
            rm -f "$_BUILD_LOCK"
        fi
    fi
    echo "$$" > "$_BUILD_LOCK"
    return 0
}


_release_build_lock() {
    if [ -f "$_BUILD_LOCK" ]; then
        local lock_pid
        lock_pid=$(cat "$_BUILD_LOCK" 2>/dev/null)
        if [ "$lock_pid" = "$$" ]; then
            rm -f "$_BUILD_LOCK"
            detail "构建锁已释放 (PID=$$)"
        fi
    fi
}

# 构建完成时自动释放锁
trap '_release_build_lock' EXIT

# =============================================
# 主流程预检（轻量模式，调用 clean_project --preflight）
# 在 run_all / start_dev / build / test 等主流程入口自动调用。
# 接受 --skip-preflight 参数跳过（CI 场景或已清理过的情况）。
# =============================================

_preflight_check() {
    local -a args=("$@")
    for a in "${args[@]}"; do
        [ "$a" = "--skip-preflight" ] && { detail "已指定 --skip-preflight，跳过预检"; return 0; }
    done
    clean_project --preflight
}

# 显示帮助
# =============================================
# 清理缓存命令
# =============================================

clean_project() {
    local clean_rust=false
    local clean_frontend=false
    local clean_cache=false
    local clean_system_cache=false
    local clean_logs=false
    local clean_ollama=false
    local clean_all=false
    local clean_deep=false
    local clean_debug=false
    local clean_debug_full=false
    local clean_sccache=false
    local clean_analyze=false
    local clean_sqlx=false
    local dry_run=false
    local preflight=false
    local prune_done=false

    for arg in "$@"; do
        case "$arg" in
            --rust)         clean_rust=true ;;
            --debug)        clean_debug=true ;;
            --debug-full)   clean_debug_full=true ;;
            --sccache)      clean_sccache=true ;;
            --analyze)      clean_analyze=true ;;
            --sqlx)         clean_sqlx=true ;;
            --frontend)     clean_frontend=true ;;
            --cache)        clean_cache=true ;;
            --system-cache) clean_system_cache=true ;;
            --logs)         clean_logs=true ;;
            --ollama)       clean_ollama=true ;;
            --all)          clean_all=true ;;
            --deep)         clean_deep=true ;;
            --dry-run)      dry_run=true ;;
            --preflight)    preflight=true ;;
            *)
                error "未知参数: $arg"
                echo "可用选项: --rust --debug --debug-full --sccache --analyze --sqlx --frontend --cache --system-cache --ollama --logs --all --deep --dry-run --preflight"
                return 1
                ;;
        esac
    done

    # 全局累计：本次清理合计释放（供结束报告）
    _CLEAN_FREED_KB=0

    # ── --analyze：磁盘占用分析（只读，不删除任何文件）──────────
    if [ "$clean_analyze" = true ]; then
        echo ""
        info "================================================"
        info "  TOPEMS 磁盘占用分析（只读，不删除任何文件）"
        info "================================================"
        echo ""
        local analyze_dirs=(
            "$PROJECT_ROOT/target"
            "$PROJECT_ROOT/target/debug/incremental"
            "$PROJECT_ROOT/target/debug/deps"
            "$PROJECT_ROOT/target/debug"
            "$PROJECT_ROOT/target/release"
            "$PROJECT_ROOT/node_modules"
            "$PROJECT_ROOT/apps/web/node_modules"
            "$PROJECT_ROOT/apps/desktop/node_modules"
            "$PROJECT_ROOT/apps/mobile/node_modules"
            "$PROJECT_ROOT/apps/web/dist"
            "$PROJECT_ROOT/storybook-static"
            "$PROJECT_ROOT/test-results"
            "$PROJECT_ROOT/logs"
            "$PROJECT_ROOT/.sqlx"
            "$HOME/.cargo/registry"
            "$HOME/Library/Caches/Mozilla.sccache"
            "$HOME/.ollama/models"
        )
        # 补充 svc/lib 嵌套 target 残留（glob 展开）
        local rem
        for rem in "$PROJECT_ROOT"/svc/*/target "$PROJECT_ROOT"/lib/*/target; do
            [ -e "$rem" ] && analyze_dirs+=("$rem")
        done
        {
            local d
            for d in "${analyze_dirs[@]}"; do
                if [ -e "$d" ]; then
                    du -sh "$d" 2>/dev/null
                fi
            done
        } | sort -rh | head -20
        echo ""
        info "磁盘当前可用: $(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}')（$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}') 已用）"
        echo ""
        detail "清理建议: 日常 topems clean（增量，保留依赖）| 大扫除 topems clean-all（全量）"
        return 0
    fi

    # ── 轻量预检模式（主流程自动调用入口）─────────────────────────
    if $preflight; then
        local issues=0
        echo ""
        info "================================================"
        info "  TOPEMS 预检（轻量清理）"
        info "================================================"
        echo ""

        # 1. 杀后台 cargo 进程（函数在清理后返回 1，不能让 set -e 误判为失败）
        if ! _kill_background_cargo; then issues=$((issues + 1)); fi

        # 2. 清 coverage 残留（同理：清理过则返回 1）
        if ! _clean_cov_remnants; then issues=$((issues + 1)); fi

        # 3. 磁盘守卫
        _check_disk_space || return 1

        if [ $issues -gt 0 ]; then
            success "预检完成（自动修复 $issues 项）"
        else
            detail "预检通过 ✅"
        fi
        return 0
    fi

    # 默认增量清理（保留 release 产物与依赖；全量需显式 --all / --rust / --debug-full）
    if [ "$clean_rust" = false ] && [ "$clean_debug" = false ] && \
       [ "$clean_debug_full" = false ] && [ "$clean_sccache" = false ] && \
       [ "$clean_frontend" = false ] && \
       [ "$clean_cache" = false ] && [ "$clean_system_cache" = false ] && \
       [ "$clean_ollama" = false ] && [ "$clean_logs" = false ] && \
       [ "$clean_sqlx" = false ] && [ "$clean_all" = false ]; then
        clean_debug=true
    fi
    if [ "$clean_all" = true ]; then
        clean_rust=true
        clean_frontend=true
        clean_cache=true
        clean_logs=true
    fi
    # --deep 必须配合 --frontend（deep 清理在 frontend 块内执行）
    if [ "$clean_deep" = true ]; then
        clean_frontend=true
    fi

    # --system-cache 是危险操作，需要二次确认
    local did_clean=false
    if [ "$clean_system_cache" = true ] && [ "$dry_run" = false ]; then
        warn "即将清理系统级缓存，这将影响其他应用并触发全量重新下载！"
        echo "  包括: pnpm 缓存、Cargo registry、IDE 缓存、SCCache 等"
        echo ""
        read -r -p "确认继续？(y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            warn "已取消系统缓存清理。"
            clean_system_cache=false
        fi
    fi

    # ── D1/D2: 运行态与构建活动感知（clean 前透明提示，避免误伤并行构建/运行中服务）──
    if ps aux | grep -v grep | grep -q "$PROJECT_ROOT/target/release/"; then
        warning "检测到运行中的服务进程（target/release/），clean 后重启将触发重新编译"
    fi
    if ps aux | grep -v grep | grep -qE "cargo (nextest )?(test|build|bench|run|check|clippy|fmt)|cargo-(llvm-cov|nextest|test|build|bench)|rustc"; then
        warning "检测到活跃构建进程（cargo/rustc），本仓库相关的将在清理时被终止（并行构建请先停手）"
    fi

    echo ""
    info "================================================"
    info "  TOPEMS 清理命令"
    info "================================================"
    info "提示: 默认 clean = 增量清理（保留产物与依赖）；全量用 clean-all（= clean --all）/ --rust；更轻量可用 ./scripts/clean_target.sh"
    echo ""

    # ── 公共前置：杀后台 cargo/rustc 进程 + 清独立 target 残留 ──
    #    （rust/debug/debug-full 均需避免与运行中构建冲突、避免残留目录复发）
    if [ "$clean_rust" = true ] || [ "$clean_debug" = true ] || [ "$clean_debug_full" = true ]; then
        # shellcheck disable=SC2046
        if ! _kill_background_cargo $( $dry_run && echo --dry-run ); then did_clean=true; fi
        # shellcheck disable=SC2046
        if ! _clean_cov_remnants $( $dry_run && echo --dry-run ); then did_clean=true; fi
    fi

    # ── 空间基线（用于结束报告 target/ 前后对比；必须在终止进程之后测量，
    #     否则与运行中构建的并发写入竞争，baseline 会失真导致报告显示 0.0G）──
    local target_before_kb=0
    [ -d "$PROJECT_ROOT/target" ] && target_before_kb=$(du -sk "$PROJECT_ROOT/target" 2>/dev/null | awk '{print $1}')

    if [ "$clean_rust" = true ]; then
        # target/ 完整清理
        local dir="$PROJECT_ROOT/target"
        if [ -d "$dir" ]; then
            local size
            size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除 Rust 编译产物: $dir ($size)"
            else
                info "清理 Rust 编译产物（直接删除 target/，等效 cargo clean 且更快）..."
                _acc_freed "$dir"
                rm -rf "$dir"
                success "已清理 target/ ($size)"
                did_clean=true
            fi
        else
            detail "target/ 不存在，跳过"
        fi

    fi

    # ── .sqlx 离线编译缓存（默认不删，已入库 git；--sqlx 或 CLEAN_SQLX=true 才清理）──
    if [ "$clean_sqlx" = true ] || [ "${CLEAN_SQLX:-false}" = "true" ]; then
        local sqlx_dir="$PROJECT_ROOT/.sqlx"
        if [ -d "$sqlx_dir" ]; then
            local sqlx_size
            sqlx_size=$(du -sh "$sqlx_dir" 2>/dev/null | awk '{print $1}')
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除 SQLx 缓存: $sqlx_dir ($sqlx_size)"
            else
                _acc_freed "$sqlx_dir"
                rm -rf "$sqlx_dir"
                detail "已清理 .sqlx ($sqlx_size)"
                warning "注意：.sqlx 为 SQLx 离线编译缓存（已入库 git）。清理后离线编译/启动会依赖它，"
                warning "  如需恢复：git checkout -- .sqlx，或运行 ./scripts/dev/sqlx-prepare.sh 重新生成。"
                did_clean=true
            fi
        else
            detail ".sqlx 不存在，跳过"
        fi
    else
        detail "默认跳过 .sqlx 缓存清理（已入库git，删除会导致离线编译失败）"
        detail "  如需强制清理.sqlx，请执行: $0 clean --sqlx"
    fi

    # ── --debug / --debug-full：只清 Rust 增量/依赖缓存，保留 release 产物 ──
    if [ "$clean_debug" = true ] || [ "$clean_debug_full" = true ]; then
        local debug_dirs=(
            "$PROJECT_ROOT/target/debug/incremental"
            "$PROJECT_ROOT/target/release/incremental"
            "$PROJECT_ROOT/target/tmp"
        )
        if [ "$clean_debug_full" = true ]; then
            debug_dirs+=(
                "$PROJECT_ROOT/target/debug/deps"
                "$PROJECT_ROOT/target/debug/build"
                "$PROJECT_ROOT/target/debug/examples"
            )
        fi
        local debug_cleaned=false
        for dir in "${debug_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除: $dir ($size)"
                else
                    _acc_freed "$dir"
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                    debug_cleaned=true
                fi
            fi
        done
        if [ "$dry_run" = false ]; then
            local debug_mode="Rust 增量缓存（debug+release incremental）"
            [ "$clean_debug_full" = true ] && debug_mode="debug 产物（增量+依赖+构建脚本+examples）"
            if [ "$debug_cleaned" = true ]; then
                info "已清理 $debug_mode；target/release 产物与 target/debug 二进制保留"
            else
                detail "$debug_mode 无残留，跳过"
            fi
        fi
    fi

    # ── --sccache：清空 sccache 编译缓存（下次构建冷启动）─────────
    if [ "$clean_sccache" = true ]; then
        local sccache_dir="$HOME/Library/Caches/Mozilla.sccache"
        local sccache_size
        sccache_size=$(du -sh "$sccache_dir" 2>/dev/null | awk '{print $1}')
        if [ -n "$sccache_size" ] && [ "$sccache_size" != "0B" ]; then
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将清空 sccache 缓存: $sccache_dir ($sccache_size)"
            else
                sccache --stop-server >/dev/null 2>&1 || true
                _acc_freed "$sccache_dir"
                rm -rf "${sccache_dir:?}/"* 2>/dev/null
                detail "已清空 sccache 编译缓存 ($sccache_size)"
                did_clean=true
            fi
        else
            detail "sccache 缓存为空或不存在，跳过"
        fi
    fi

    if [ "$clean_frontend" = true ]; then
        local fe_dirs=(
            "$PROJECT_ROOT/apps/web/dist"
            "$PROJECT_ROOT/apps/web/coverage"
            "$PROJECT_ROOT/apps/web/playwright-report"
            "$PROJECT_ROOT/apps/web/test-results"
            "$PROJECT_ROOT/apps/desktop/dist"
            "$PROJECT_ROOT/apps/mobile/dist"
            "$PROJECT_ROOT/apps/web/.vite"
        )
        for dir in "${fe_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除: $dir ($size)"
                else
                    _acc_freed "$dir"
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done

        # node_modules 内部缓存
        local nm_cache_dirs=(
            "$PROJECT_ROOT/apps/web/node_modules/.vite"
        )
        for dir in "${nm_cache_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除: $dir ($size)"
                else
                    _acc_freed "$dir"
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done

        # --deep: 深度清理所有 node_modules（解决 dual versions / lockfile 漂移 / 本机污染）
        if [ "$clean_deep" = true ]; then
            warn "--deep 模式: 将删除所有 node_modules 目录并 pnpm store prune"
            warn "  用于解决 dual @types/react 残留 / node_modules 与 lockfile 不一致等系统性问题"
            local deep_dirs=(
                "$PROJECT_ROOT/node_modules"
                "$PROJECT_ROOT/apps/web/node_modules"
                "$PROJECT_ROOT/apps/desktop/node_modules"
                "$PROJECT_ROOT/apps/mobile/node_modules"
            )
            # 补齐 packages/*/node_modules
            local pkg_dir
            for pkg_dir in "$PROJECT_ROOT/packages"/*/node_modules; do
                [ -d "$pkg_dir" ] && deep_dirs+=("$pkg_dir")
            done
            for dir in "${deep_dirs[@]}"; do
                if [ -d "$dir" ]; then
                    local size
                    size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                    if [ "$dry_run" = true ]; then
                        info "[DRY-RUN] 将删除: $dir ($size)"
                    else
                        _acc_freed "$dir"
                        rm -rf "$dir"
                        detail "已删除 $dir ($size)"
                        did_clean=true
                    fi
                fi
            done
            # pnpm store prune（清理未引用包，不影响其他项目）
            if [ "$prune_done" = false ] && command -v pnpm &>/dev/null; then
                prune_done=true
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将执行 pnpm store prune"
                else
                    info "执行 pnpm store prune..."
                    pnpm store prune 2>/dev/null
                    detail "pnpm store 已清理"
                    did_clean=true
                fi
            fi
            success "深度清理完成。下次运行 build/dev 时会自动 pnpm install 重新安装"
        fi
    fi

    # 项目级缓存（仅影响本项目，安全）
    if [ "$clean_cache" = true ]; then
        local project_cache_dirs=(
            "$PROJECT_ROOT/apps/web/.lighthouseci"
            "$PROJECT_ROOT/apps/web/.storybook"
            "$PROJECT_ROOT/cli/.venv"
            "$PROJECT_ROOT/cli/.pytest_cache"
            "$PROJECT_ROOT/apps/web/node_modules/.cache"
        )
        for dir in "${project_cache_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除项目缓存: $dir ($size)"
                else
                    _acc_freed "$dir"
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done

        # pnpm store prune （仅清理未引用包，不影响其他项目）
        if [ "$prune_done" = false ] && command -v pnpm &>/dev/null; then
            prune_done=true
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将执行 pnpm store prune"
            else
                info "执行 pnpm store prune..."
                pnpm store prune 2>/dev/null
                detail "pnpm store 已清理"
                did_clean=true
            fi
        fi
    fi

    # 系统级缓存（危险，影响其他应用）
    if [ "$clean_system_cache" = true ]; then
        local system_cache_dirs=(
            "$HOME/Library/Caches/pnpm"
            "$HOME/Library/Caches/Google"
            "$HOME/Library/Caches/Mozilla.sccache"
            "$HOME/Library/Caches/com.trae.app.ShipIt"
            "$HOME/Library/Caches/Trae CN"
        )
        for dir in "${system_cache_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将删除系统缓存: $dir ($size)"
                else
                    _acc_freed "$dir"
                    rm -rf "$dir"
                    detail "已删除 $dir ($size)"
                    did_clean=true
                fi
            fi
        done

        if [ -d "$HOME/.cargo/registry" ]; then
            local cargo_size
            cargo_size=$(du -sh "$HOME/.cargo/registry" 2>/dev/null | awk '{print $1}')
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除 Cargo registry: $HOME/.cargo/registry ($cargo_size)"
            else
                _acc_freed "$HOME/.cargo/registry"
                rm -rf "$HOME/.cargo/registry"
                detail "已删除 Cargo registry ($cargo_size)"
                did_clean=true
            fi
        fi
    fi

    # Ollama 模型清理（保留项目使用的模型，删除其他）
    if [ "$clean_ollama" = true ]; then
        # 从 .env 读取项目实际使用的模型
        local required_models=()
        if [ -f "$PROJECT_ROOT/.env" ]; then
            local ollama_model embed_model
            ollama_model=$(grep "^OLLAMA_MODEL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -s ' ' | xargs)
            embed_model=$(grep "^EMBEDDING_MODEL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -s ' ' | xargs)
            [ -n "$ollama_model" ] && required_models+=("$ollama_model")
            [ -n "$embed_model" ] && required_models+=("$embed_model")
        fi
        # 默认保留的模型
        if [ ${#required_models[@]} -eq 0 ]; then
            required_models=("qwen2.5:7b-instruct" "nomic-embed-text")
        fi

        info "项目需要保留的 Ollama 模型: ${required_models[*]}"

        if ! command -v ollama &>/dev/null; then
            warn "未安装 ollama，跳过模型清理"
        else
            local installed_models
            installed_models=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')
            if [ -z "$installed_models" ]; then
                detail "无已安装的 Ollama 模型"
            else
                for model in $installed_models; do
                    local is_required=false
                    for req in "${required_models[@]}"; do
                        # 兼容 tag 后缀：ollama list 返回 "name:tag"（如 nomic-embed-text:latest），
                        # required 为 "name" 或 "name:tag"，须前缀匹配，否则会把保留模型误判为多余
                        case "$model" in
                            "$req"|"$req:"*) is_required=true ;;
                        esac
                        [ "$is_required" = true ] && break
                    done
                    if [ "$is_required" = true ]; then
                        detail "保留项目模型: $model"
                    else
                        if [ "$dry_run" = true ]; then
                            info "[DRY-RUN] 将删除 Ollama 模型: $model"
                        else
                            ollama rm "$model" 2>/dev/null
                            detail "已删除 Ollama 模型: $model"
                            did_clean=true
                        fi
                    fi
                done
            fi
        fi

        # 清理 Ollama blobs 孤儿残留：只删未被任何 manifest 引用的 blob，保留模型的 blob 绝不触碰
        local ollama_blobs="$HOME/.ollama/models/blobs"
        local ollama_manifests="$HOME/.ollama/models/manifests"
        if [ -d "$ollama_blobs" ] && [ -d "$ollama_manifests" ] && [ -n "$(ls -A "$ollama_manifests" 2>/dev/null)" ]; then
            local blob_count=0 orphan_count=0
            local blob
            for blob in "$ollama_blobs"/sha256-*; do
                [ -e "$blob" ] || continue
                blob_count=$((blob_count + 1))
                local digest
                digest=$(basename "$blob" | sed 's/^sha256-/sha256:/')
                if ! grep -rlq "$digest" "$ollama_manifests" 2>/dev/null; then
                    if [ "$dry_run" = true ]; then
                        info "[DRY-RUN] 将删除孤儿 blob: $(basename "$blob")"
                    else
                        _acc_freed "$blob"
                        rm -f "$blob" 2>/dev/null || true
                        detail "已删除孤儿 blob: $(basename "$blob")"
                        did_clean=true
                    fi
                    orphan_count=$((orphan_count + 1))
                fi
            done
            if [ "$blob_count" -eq 0 ]; then
                detail "无 Ollama blobs，跳过"
            elif [ "$orphan_count" -eq 0 ]; then
                detail "无孤儿 blob（$blob_count 个 blob 均被模型引用），跳过"
            fi
        else
            warn "Ollama blobs/manifests 目录缺失，跳过 blob 清理（避免误删）"
        fi
    fi

    if [ "$clean_logs" = true ]; then
        local log_dirs=(
            "$PROJECT_ROOT/logs"
        )
        for dir in "${log_dirs[@]}"; do
            if [ -d "$dir" ]; then
                local size
                size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
                if [ "$dry_run" = true ]; then
                    info "[DRY-RUN] 将清空: $dir ($size)"
                else
                    _acc_freed "$dir"
                    find "$dir" -name "*.log" -type f -delete 2>/dev/null
                    detail "已清空 $dir 下的日志"
                    did_clean=true
                fi
            fi
        done

        local root_logs
        root_logs=$(find "$PROJECT_ROOT" -maxdepth 1 -name "*.log" -type f 2>/dev/null)
        if [ -n "$root_logs" ]; then
            if [ "$dry_run" = true ]; then
                info "[DRY-RUN] 将删除根目录日志文件"
            else
                find "$PROJECT_ROOT" -maxdepth 1 -name "*.log" -type f -delete 2>/dev/null
                detail "已删除根目录日志文件"
                did_clean=true
            fi
        fi
    fi

    echo ""
    if [ "$dry_run" = true ]; then
        info "[DRY-RUN] 完成。无文件被实际删除。"
    elif [ "$did_clean" = true ]; then
        success "清理完成！"
        echo ""
        # 空间报告：target/ 前后对比 + 磁盘可用
        local target_after_kb=0
        [ -d "$PROJECT_ROOT/target" ] && target_after_kb=$(du -sk "$PROJECT_ROOT/target" 2>/dev/null | awk '{print $1}')
        local freed_kb=$(( target_before_kb - target_after_kb ))
        [ "$freed_kb" -lt 0 ] && freed_kb=0
        info "target/ 占用: $(awk -v b="$target_before_kb" 'BEGIN{printf "%.1fG", b/1024/1024}') → $(awk -v a="$target_after_kb" 'BEGIN{printf "%.1fG", a/1024/1024}')（本次节省 $(awk -v f="$freed_kb" 'BEGIN{printf "%.1fG", f/1024/1024}')）"
        local total_freed_kb="${_CLEAN_FREED_KB:-0}"
        if [ "$total_freed_kb" -gt 0 ]; then
            info "本次清理合计释放: $(awk -v f="$total_freed_kb" 'BEGIN{printf "%.2fGB", f/1024/1024}')"
        fi
        local avail_kb
        avail_kb=$(df -k "$PROJECT_ROOT" 2>/dev/null | awk 'NR==2 {print $4}')
        [ -n "$avail_kb" ] && info "磁盘当前可用: $(awk -v a="$avail_kb" 'BEGIN{printf "%.1fGiB", a/1024/1024}')"
        echo ""
        detail "后续建议:"
        detail "  Rust:    cargo build  (重建 target/)"
        detail "  前端:    pnpm install && pnpm build"
        detail "  Python:  cd cli && python3 -m venv .venv && source .venv/bin/activate && python3 -m pip install -e ."
    else
        warn "未执行任何清理操作。"
        echo "  使用 --dry-run 预览将清理的内容，或指定具体选项如 --rust --cache 等。"
    fi
}

# ============================================================================
# [2026-10-02 A] doctor：多机环境自举（门禁一致性）
# 新机器 / 换机器 / 门禁失效后跑一次：
#   检测 git/lefthook → 注册 git 钩子（pre-commit/pre-push）→ 核对 rust 工具链
#   → sccache（可选）→ lefthook.yml 配置校验 → 提示 sync_base
# 效果：钩子注册在 git 层面（.git/hooks），此后该机任何 git push 都触发
#   本地 pre-push 门禁——TRAE 事故（无门禁机器直推坏提交）的本地根治。
# ============================================================================

doctor_env() {
    local fail=0
    local REPO_ROOT="$SCRIPT_DIR/.."

    echo "==> TOPEMS 环境自检（doctor）"

    echo "    [1/6] git"
    if command -v git &> /dev/null; then
        info "  git: $(git --version)"
    else
        error "  git 未安装 — 请先安装: brew install git"
        fail=1
    fi

    echo "    [2/6] lefthook（本地门禁引擎）"
    local lf=""
    if command -v lefthook &> /dev/null; then
        lf="lefthook"
    else
        lf=$(ls "$REPO_ROOT"/node_modules/.pnpm/lefthook-*/node_modules/lefthook-*/bin/lefthook 2>/dev/null | head -1)
    fi
    if [ -z "$lf" ]; then
        error "  lefthook 未安装 — 安装: brew install lefthook；或 cd $REPO_ROOT && pnpm add -D lefthook"
        fail=1
    else
        info "  lefthook: $("$lf" version 2>/dev/null | head -1 || echo 'found')"

        echo "    [3/6] 注册 git 钩子（pre-commit / pre-push）"
        if (cd "$REPO_ROOT" && "$lf" install) &> /dev/null; then
            if [ -x "$REPO_ROOT/.git/hooks/pre-push" ] && [ -x "$REPO_ROOT/.git/hooks/pre-commit" ]; then
                info "  钩子已注册: .git/hooks/pre-commit + pre-push（此后任何 git push 都触发门禁）"
            else
                error "  钩子文件缺失（lefthook install 声称成功但文件不在）"
                fail=1
            fi
        else
            error "  lefthook install 失败"
            fail=1
        fi
    fi

    echo "    [4/6] rust 工具链（rust-toolchain.toml 锁定 nightly-2026-07-01）"
    if command -v rustup &> /dev/null; then
        local want
        want=$(grep -E '^channel\s*=' "$REPO_ROOT/rust-toolchain.toml" 2>/dev/null | head -1 | sed 's/.*= *"//; s/"$//')
        if [ -z "$want" ]; then
            warn "  rust-toolchain.toml 缺失或 channel 未解析 — 仓库异常，请检查"
        elif rustup toolchain list 2>/dev/null | grep -q "$want"; then
            info "  工具链 $want 已安装"
        else
            warn "  工具链 $want 未安装，尝试安装..."
            if rustup toolchain install "$want" &> /dev/null; then
                info "  $want 安装完成"
            else
                error "  工具链安装失败 — 手动: rustup toolchain install $want"
                fail=1
            fi
        fi
    else
        warn "  rustup 未安装 — 手动: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    fi

    echo "    [5/6] 编译缓存（sccache，可选）"
    if command -v sccache &> /dev/null; then
        info "  sccache: $(sccache --version | head -1)"
    else
        warn "  sccache 未安装（可选，加速重复编译）— brew install sccache"
    fi

    echo "    [6/6] 配置校验"
    if [ -n "$lf" ] && (cd "$REPO_ROOT" && "$lf" validate) &> /dev/null; then
        info "  lefthook.yml 配置有效"
    else
        error "  lefthook.yml 配置校验失败"
        fail=1
    fi

    if [ "$fail" -eq 0 ]; then
        info "✅ 环境就绪。"
        echo "    下一步（每次开工必跑，新机器必跑）: bash scripts/sync_base.sh"
    else
        error "❌ 环境存在问题，按上述提示修复后重跑: topems doctor"
        return 1
    fi
}

# ============================================================================
# [2026-10-02 C] push：收敛推送入口（先自检门禁，再 git push）
# 用法: topems push [--skip-check] [git push 参数...]
#   --skip-check  跳过前置自检（仅门禁刚全绿、纯传输场景用）
# ============================================================================

push_guard() {
    local skip=false
    local args=()
    local REPO_ROOT="$SCRIPT_DIR/.."
    for arg in "$@"; do
        case "$arg" in
            --skip-check) skip=true ;;
            *) args+=("$arg") ;;
        esac
    done

    if [ "$skip" = false ]; then
        echo "==> push 前自检（门禁钩子 + lefthook 可用性）"
        if [ ! -x "$REPO_ROOT/.git/hooks/pre-push" ] || [ ! -x "$REPO_ROOT/.git/hooks/pre-commit" ]; then
            error "本地门禁钩子未注册 — 先运行: topems doctor"
            return 1
        fi
        if ! command -v lefthook &> /dev/null \
            && [ -z "$(ls "$REPO_ROOT"/node_modules/.pnpm/lefthook-*/node_modules/lefthook-*/bin/lefthook 2>/dev/null | head -1)" ]; then
            error "lefthook 不可用 — 先运行: topems doctor"
            return 1
        fi
        info "  自检通过（钩子已注册、lefthook 可用），进入门禁+传输"
    fi

    echo "==> git push ${args[*]:-}"
    git push "${args[@]}"
}

