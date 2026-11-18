# shellcheck shell=bash
# =============================================
# TOPEMS lib/build.sh（自 scripts/topems.sh 拆分，2026-11-02）
# =============================================

# 统一 swagger-ui 离线包探测（直接 source 本文件时也能使用）
if ! declare -F topems_ensure_swagger_ui_archive >/dev/null 2>&1; then
    # shellcheck source=./swagger-ui.sh
    source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/swagger-ui.sh"
fi

build_service() {
    local service_name=$1
    shift
    local -a extra_opts=("$@")
    local service_path
    service_path=$(get_service_path "$service_name")

    # 磁盘守卫（2026-11）：单服务构建原先没有预检入口（只有 build-all/run 系列有），
    #   满盘时以 cargo "No space left on device" 收场。冷编预估 release 20GiB / debug 30GiB。
    local _skip_disk=0
    case " ${extra_opts[*]-} " in *" --skip-disk-check "*) _skip_disk=1 ;; esac
    [ "${SKIP_DISK_CHECK:-0}" = "1" ] && _skip_disk=1
    if [ "$_skip_disk" = 0 ]; then
        local _need="${BUILD_DISK_NEED_GB_RELEASE:-20}" _label="release 冷编"
        case " ${extra_opts[*]-} " in
            *" --dev "*|*" --debug "*) _need="${BUILD_DISK_NEED_GB_DEBUG:-30}"; _label="debug 冷编" ;;
        esac
        _check_disk_space "$_need" "$_label" || return 1
    else
        detail "已跳过磁盘守卫（--skip-disk-check / SKIP_DISK_CHECK=1）"
    fi

    topems_ensure_swagger_ui_archive || return 1

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
    cd "$PROJECT_ROOT" || exit 1

    # V3xx 参数解析：显式循环（替代子串匹配，避免 --debug/--dev 误判；未知 flag 透传）
    # V64+ 编译策略：默认优先离线（SQLX_OFFLINE=true），依赖根目录 .sqlx/
    # 除非显式声明 --online 或 env FORCE_ONLINE_BUILD=1
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

    # V3xx：统一离线优先（含 mes）。根 .sqlx/ 缓存 309 条已入库，sqlx-prepare.sh --check
    # 离线门禁保证缓存与代码匹配；mes 不再走"rm svc/mes/.sqlx + 在线编译"特例，
    # 与其它服务一致（在线回退时自动附加 search_path=mes,public）。
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

    # 内存不足导致失败时，不再重试（会再次 OOM）
    if [ "$mem_status" -eq 2 ] || [ "$mem_status" -eq 1 ]; then
        _restore_cargo_jobs
        error "$service_name 编译失败（可能与内存不足有关）。建议: 释放内存后重试。"
        return 1
    fi

    # --offline 显式指定：失败即停，绝不静默回退在线（帮助文档语义一致）
    if [ "$offline_only" -eq 1 ]; then
        _restore_cargo_jobs
        error "$service_name 离线编译失败（--offline 模式不回退在线编译）。"
        error "修复指引："
        error "  1) 校验离线缓存与当前代码是否一致：  ./scripts/dev/sqlx-prepare.sh --check"
        error "  2) 连接数据库刷新缓存：              ./scripts/dev/sqlx-prepare.sh"
        error "  3) 提交缓存变更后重试：              git add .sqlx && git commit"
        return 1
    fi

    # 默认模式：离线失败自动尝试在线（需要 DATABASE_URL）
    warning "$service_name 离线编译失败，自动尝试在线编译（需要 DATABASE_URL）..."
    load_env
    local online_url="${DATABASE_URL:-}"
    if [ "$service_name" = "mes" ] && [ -n "$online_url" ] && [[ "$online_url" != *"search_path"* ]]; then
        # mes 查询依赖 search_path=mes,public（见 docs/developer/backend/mes-compile-mechanism.md）
        if [[ "$online_url" == *"?"* ]]; then
            online_url="${online_url}&options=-csearch_path=mes,public"
        else
            online_url="${online_url}?options=-csearch_path=mes,public"
        fi
    fi
    if [ -z "$online_url" ]; then
        _restore_cargo_jobs
        error "未配置 DATABASE_URL（.env 缺失或未设置），无法在线回退。"
        error "请先运行 ./scripts/dev/sqlx-prepare.sh --check 定位离线缓存问题，或配置 DATABASE_URL 后重试。"
        return 1
    fi
    if DATABASE_URL="$online_url" SQLX_OFFLINE='' cargo build $profile --bin "$executable_name" 2>&1; then
        success "$service_name 在线编译成功"
        _restore_cargo_jobs
        return 0
    else
        _restore_cargo_jobs
        error "$service_name 编译失败（离线+在线均失败），建议执行: ./scripts/dev/sqlx-prepare.sh 刷新根 .sqlx/ 后重试"
        return 1
    fi
}

# 获取所有服务的二进制名（去重）

get_all_executables() {
    echo "$SERVICES_CONFIG" | grep -v "^$" | awk '{print $3}' | sort -u
}

# 按"依赖层"排序的服务编译顺序（有 query! 宏的包靠后，避免并行时被早期缓存拖慢）

get_build_order() {
    # 层 0（无依赖，纯库级别包不单独编）
    # 层 1（核心：iam = unified-core）
    # 层 2（业务：finance/erp/crm/scm/srm/hrm/pm/qms/wms/mes/pdm/ehs/lims/rd/portal）
    # 层 3（分析/搜索/AI/集成等扩展）
    echo "iam finance erp crm scm srm hrm pm qms wms mes pdm ehs lims rd portal master-data ticket communication mobile gis integration search ai bi tms monitor plugin-registry"
}

# 检测包管理器（pnpm > yarn）

get_pkg_cmd() {
    if command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif command -v yarn &> /dev/null; then
        echo "yarn"
    else
        error "pnpm 和 yarn 都未安装"
        return 1
    fi
}

# 检查并安装前端依赖

ensure_frontend_deps() {
    local pkg_cmd=$1
    local web_dir="$PROJECT_ROOT/apps/web"

    if [ ! -d "$web_dir" ]; then
        error "前端目录不存在: $web_dir"
        return 1
    fi

    cd "$web_dir" || exit 1

    if [ ! -d "node_modules" ]; then
        info "安装前端依赖..."
        # 本机 dev 场景跳过 puppeteer Chromium 下载（CI 应通过环境变量显式启用）
        # 避免 puppeteer postinstall 网络失败阻塞 pnpm install
        if [ -z "${PUPPETEER_SKIP_DOWNLOAD:-}" ]; then
            export PUPPETEER_SKIP_DOWNLOAD=true
            detail "已自动设置 PUPPETEER_SKIP_DOWNLOAD=true（本机 dev 模式）"
        fi
        $pkg_cmd install --silent
    fi

    return 0
}

# 全量编译所有后端服务（只编译服务包，避免编译 workspace 中所有包）
# V70+: 增加构建锁、内存自适应、--serial 模式、进度追踪

build_all_backend() {
    local -a extra_opts=("$@")
    info "全量编译所有后端服务..."

    cd "$PROJECT_ROOT" || exit 1

    # V64+ 新参数: --prepare（先刷新 sqlx 缓存，需要 DATABASE_URL）
    #              --online（强制在线编译，跳过离线）
    #              --offline（强制离线编译，失败即停）
    #              --only-core（只编 iam+finance+erp+scm+srm+crm 核心组）
    # V70+ 新参数: --serial（强制串行构建，关闭并行优化）
    #              --force（强制获取构建锁）
    #              --skip-mem-check（跳过内存检查，CI 场景）
    local do_prepare=0
    local only_core=0
    local force_lock=0
    local skip_mem_check=0
    local serial_mode=0
    local build_cooldown=2
    local skip_packages=""
    for opt in "${extra_opts[@]}"; do
        case "$opt" in
            --prepare)        do_prepare=1 ;;
            --only-core)      only_core=1 ;;
            --force)          force_lock=1 ;;
            --skip-mem-check) skip_mem_check=1 ;;
            --serial)         serial_mode=1 ;;
            --cooldown=*)     build_cooldown="${opt#--cooldown=}" ;;
            --skip=*)         skip_packages="${skip_packages} ${opt#--skip=}" ;;
        esac
    done

    # V70+ 构建锁：防止多个 build-all 并发
    if ! _acquire_build_lock "$( [ $force_lock -eq 1 ] && echo true || echo false )"; then
        error "无法获取构建锁，请等待其他构建完成，或使用 --force 强制获取。"
        return 1
    fi

    # V70+ 内存预检 + serial 模式处理
    local mem_status=0
    if [ $skip_mem_check -eq 0 ]; then
        _check_available_memory
        mem_status=$?
        case "$mem_status" in
            2)
                _release_build_lock
                error "内存严重不足，取消全量编译。请释放内存后重试。"
                return 1
                ;;
            1)
                warn "内存偏低，将启用安全模式（串行+低并行度）进行构建。"
                ;;
        esac
    fi

    # --serial 模式：强制串行单线程构建
    if [ $serial_mode -eq 1 ]; then
        warn "已指定 --serial 模式，强制单线程构建 (CARGO_BUILD_JOBS=1)。"
        export CARGO_BUILD_JOBS=1
    elif [ $mem_status -eq 1 ]; then
        # 内存偏低时默认启用安全模式
        serial_mode=1
        export CARGO_BUILD_JOBS=1
    fi

    # V3xx SQLx 离线缓存新鲜度门禁：缓存与当前代码匹配才进入编译
    if [ "$do_prepare" = "1" ]; then
        info "========== 预处理: 刷新 SQLx 离线缓存 =========="
        load_env
        if [ -x "$SCRIPT_DIR/dev/sqlx-prepare.sh" ]; then
            "$SCRIPT_DIR/dev/sqlx-prepare.sh" || warning "sqlx prepare 失败，但继续尝试编译"
        else
            warning "找不到 $SCRIPT_DIR/dev/sqlx-prepare.sh，跳过 sqlx prepare 阶段"
        fi
        # 刷新后强制校验：确认本次刷新真的让离线缓存可用
        if ! _check_sqlx_cache_freshness "${extra_opts[@]}"; then
            _release_build_lock
            return 1
        fi
    else
        # 默认离线优先：缓存缺失/过时即停（--skip-sqlx-check / SQLX_CHECK_SKIP=1 可跳过）
        if ! _check_sqlx_cache_freshness "${extra_opts[@]}"; then
            _release_build_lock
            return 1
        fi
    fi

    # 决定编译顺序
    local svc_order
    if [ "$only_core" = "1" ]; then
        svc_order="iam finance erp scm srm crm"
    else
        svc_order="$(get_build_order)"
    fi

    local build_success=0
    local build_failed=0
    local build_skipped=0
    local build_total=0
    local failed_list=""
    local start_time
    start_time=$(date +%s)
    local is_safe_mode=0

    # V70+ 构建间内存检查条件（serial 模式下也每个服务前检查）
    local _need_mem_check=0
    if [ $skip_mem_check -eq 0 ] && ( [ $is_safe_mode -eq 1 ] || [ $serial_mode -eq 1 ] ); then
        _need_mem_check=1
    fi

    for svc in $svc_order; do
        # 按 --skip 过滤
        local skip_this=0
        for s in $skip_packages; do
            [ "$svc" = "$s" ] && skip_this=1 && break
        done
        [ $skip_this -eq 1 ] && { build_skipped=$((build_skipped + 1)); continue; }

        # 某些 svc 别名 bi=analytics，需要映射
        local binary_name
        case "$svc" in
            bi) binary_name="topems-analytics" ;;
            *)  binary_name="$(get_executable_name "$svc")" ;;
        esac
        [ -z "$binary_name" ] && { build_skipped=$((build_skipped+1)); continue; }

        build_total=$((build_total + 1))

        # V70+ 构建间内存检查（serial/安全模式下每个服务前都检查）
        if [ $_need_mem_check -eq 1 ]; then
            local cur_mem=0
            _check_available_memory >/dev/null 2>&1
            cur_mem=$?
            if [ $cur_mem -eq 2 ]; then
                warn "构建 $svc 前检测到内存严重不足，暂停构建 10 秒等待系统释放内存..."
                sleep 10
                _check_available_memory >/dev/null 2>&1
                cur_mem=$?
                if [ $cur_mem -eq 2 ]; then
                    error "内存仍未恢复，跳过 $svc。"
                    build_failed=$((build_failed + 1))
                    failed_list="$failed_list $svc"
                    continue
                fi
            fi
        fi

        local elapsed=$(( $(date +%s) - start_time ))
        local eta_str=""
        if [ $build_success -gt 0 ] && [ $build_total -gt $build_success ]; then
            local avg_time=$(( elapsed / (build_success) ))
            local remaining=$(( (build_total - build_success - build_failed) * avg_time ))
            eta_str=" (预计剩余 ~${remaining}s)"
        fi

        info "[$((build_success + build_failed + 1))/$build_total] 编译 $svc -> bin=$binary_name ...${eta_str}"

        # V70+ 传递 --serial 给 build_service
        local -a _svc_opts=("${extra_opts[@]}")
        if [ $serial_mode -eq 1 ]; then
            _svc_opts+=("--serial")
        fi

        # 单包离线构建优先
        if build_service "$svc" "${_svc_opts[@]}" >/tmp/topems-build-"$svc".log 2>&1; then
            build_success=$((build_success + 1))
            success "  ✅ $svc 构建成功"
        else
            build_failed=$((build_failed + 1))
            failed_list="$failed_list $svc"
            error "  ❌ $svc 构建失败，日志 /tmp/topems-build-$svc.log（末 15 行）"
            tail -n 15 "/tmp/topems-build-$svc.log" >&2

            # V70+ 内存不足时自动切换到安全模式
            if [[ " ${extra_opts[*]} " != *" --skip-mem-check "* ]]; then
                _check_available_memory >/dev/null 2>&1
                local post_mem=$?
                if [ $post_mem -eq 1 ] || [ $post_mem -eq 2 ]; then
                    is_safe_mode=1
                    serial_mode=1
                    export CARGO_BUILD_JOBS=1
                    _need_mem_check=1
                    warn "检测到内存压力，切换到安全模式（串行+低并行度）继续构建..."
                fi
            fi
        fi

        # V70+ 构建间冷却：可配置冷却时间让 GC/缓存释放
        if [ $serial_mode -eq 1 ]; then
            sleep "$build_cooldown"
        elif [ $build_cooldown -gt 0 ]; then
            sleep 1
        fi
    done

    _release_build_lock

    local total_elapsed=$(( $(date +%s) - start_time ))
    local elapsed_min=$(( total_elapsed / 60 ))
    local elapsed_sec=$(( total_elapsed % 60 ))

    echo ""
    info "========== 后端编译汇总 =========="
    info "成功: $build_success   失败: $build_failed   跳过: $build_skipped   耗时: ${elapsed_min}m ${elapsed_sec}s"
    [ -n "$failed_list" ] && error "失败列表:$failed_list"
    [ $is_safe_mode -eq 1 ] && warn "构建过程中启用了安全模式（内存自适应）"
    [ $serial_mode -eq 1 ] && detail "构建模式: 串行单线程 (CARGO_BUILD_JOBS=1)"
    detail "冷却间隔: ${build_cooldown}s (serial/安全模式) / 1s (普通模式)"
    info "产物目录: $PROJECT_ROOT/target/release/ (release) 或 target/debug/ (debug)"

    if [ $build_failed -eq 0 ]; then
        success "所有后端服务编译完成 ($build_success 成功)"
        return 0
    else
        error "后端编译失败 ($build_success 成功, $build_failed 失败)"
        return 1
    fi
}

# 编译前端

build_frontend() {
    local -a extra_opts=("$@")
    info "编译前端..."

    # 磁盘守卫（2026-11）：前端构建（tsc + vite）也要落盘，满盘时同样会中途失败。
    local _skip_disk=0
    case " ${extra_opts[*]-} " in *" --skip-disk-check "*) _skip_disk=1 ;; esac
    [ "${SKIP_DISK_CHECK:-0}" = "1" ] && _skip_disk=1
    if [ "$_skip_disk" = 0 ]; then
        _check_disk_space "${BUILD_DISK_NEED_GB_FRONTEND:-5}" "前端构建" || return 1
    fi

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

    # V64+ 防御：只调用 apps/web/package.json 中"真正存在"的 scripts，
    # 不再假设 build:dev / build:prod 存在，避免 "Command xxx not found"。
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

    # 二次降级：如果 pnpm <script> 失败（如未定义脚本 / packageManager 版本不兼容）
    # 再尝试直接调用 vite build（生产形态）或 tsc 再 vite
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

# 全量编译（后端+前端）

build_all() {
    _preflight_check "$@" || return 1
    local -a extra_opts=("$@")
    # 剥掉 --skip-preflight 避免透传给子函数
    local -a filtered_opts=()
    for opt in "${extra_opts[@]}"; do [ "$opt" != "--skip-preflight" ] && filtered_opts+=("$opt"); done
    extra_opts=("${filtered_opts[@]}")
    info "========== 全量编译开始 =========="
    info "参数: $( [ ${#extra_opts[@]} -eq 0 ] && echo "(无)" || echo "${extra_opts[*]}" )"
    info "支持参数: --prepare --only-core --online --offline --dev/--debug --skip=<svc> --skip-lint --skip-sqlx-check --serial --force --skip-mem-check --cooldown=<N> --backend-only/--no-frontend --skip-preflight"

    local backend_result=0
    local frontend_result=0
    local skip_fe=0

    for opt in "${extra_opts[@]}"; do
        case "$opt" in
            --no-frontend|--backend-only) skip_fe=1 ;;
        esac
    done

    if ! build_all_backend "${extra_opts[@]}"; then backend_result=1; fi

    if [ $skip_fe -eq 0 ]; then
        info "========== 编译前端 =========="
        if ! build_frontend "${extra_opts[@]}"; then frontend_result=1; fi
    else
        info "========== 已指定跳过前端（--backend-only / --no-frontend）=========="
    fi

    echo ""
    info "========== 全量编译完成 =========="
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        success "全量编译成功 ✅"
        echo ""
        info "提示：接下来可启动服务"
        echo "  $0 start-all                       # 启动全部服务+前端"
        echo "  $0 start-all --only-core           # 只启动核心服务"
        echo "  $0 run                             # 一键启动 DB+Redis+所有服务"
        return 0
    else
        error "全量编译失败（后端=$backend_result 前端=$frontend_result）"
        return 1
    fi
}

# 运行后端测试（使用并行测试提高效率）
# shellcheck disable=SC2120

test_backend() {
    _preflight_check "$@" || return 1
    info "运行后端测试..."
    topems_ensure_swagger_ui_archive || return 1

    # 前置：确保 DB schema 就绪（迁移 + 应用自建表；失败仅告警，由测试内 init 兜底）
    info "测试前执行数据库迁移（db_migrate）..."
    if ! db_migrate; then
        warning "db_migrate 未完全成功，继续测试（依赖应用 init_database 兜底）"
    fi

    cd "$PROJECT_ROOT" || exit 1
    # V3xx：与 lefthook pre-push / CI 一致，离线模式跑测试（根 .sqlx 已入库）
    export SQLX_OFFLINE=true
    if cargo test --release --workspace 2>&1; then
        success "所有后端测试通过"
        return 0
    else
        error "后端测试失败"
        return 1
    fi
}

# 运行前端测试
# 用法: test_frontend [subcommand] [flags]
#   subcommand: all(default) | unit | component | smoke | coverage | shard:N (N=1..8)
#   flags:      --no-typecheck  跳过前置 tsc --noEmit
# 输出: 染色 summary（Test Files X passed / Tests Y passed），失败时返回非 0

# shellcheck disable=SC2120 # 参数可选：无参调用使用默认 all；外部可传 subcommand/flags
test_frontend() {
    local subcmd="all"
    local do_typecheck=1
    local shard_index=""

    # --- 参数解析（按位置 + 长 flag 混合）---
    local arg
    for arg in "$@"; do
        case "$arg" in
            --no-typecheck)      do_typecheck=0 ;;
            all|unit|component|smoke|coverage)   subcmd="$arg" ;;
            shard:1|shard:2|shard:3|shard:4|shard:5|shard:6|shard:7|shard:8)
                subcmd="shard"
                shard_index="${arg#shard:}"
                ;;
            *)
                warning "未知参数: $arg（已忽略）"
                ;;
        esac
    done

    info "运行前端测试（subcmd=${subcmd}, typecheck=$( [ "$do_typecheck" = "1" ] && echo "ON" || echo "OFF" )）..."

    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
    ensure_frontend_deps "$pkg_cmd" || return 1

    local web_dir="$PROJECT_ROOT/apps/web"
    # 先读取可用 scripts（与 build_frontend 相同防御思路）
    local pkg_scripts
    pkg_scripts=$(cd "$web_dir" && node -e 'console.log(Object.keys(require("./package.json").scripts || {}).join("\n"))' 2>/dev/null || true)
    has_script() {
        local name="$1"
        printf '%s\n' "$pkg_scripts" | grep -Fxq "$name"
    }

    # --- 1) 映射到 package.json 里真实存在的 script ---
    local script_name=""
    case "$subcmd" in
        all)       script_name="test" ;;                       # vitest run (unit + component)
        unit)      script_name="test:unit" ;;
        component) script_name="test:component" ;;
        smoke)     script_name="test:smoke" ;;
        coverage)  script_name="test:coverage" ;;
        shard)
            # 传了 shard:N 就用命名脚本；否则理论上不会进入此分支（上面解析要求数字）
            if [ -n "$shard_index" ]; then
                script_name="test:shard:${shard_index}"
            else
                script_name="test:shard"
            fi
            ;;
    esac

    if [ -z "$script_name" ] || ! has_script "$script_name"; then
        error "apps/web/package.json 未定义脚本: $script_name（可用: test, test:unit, test:component, test:smoke, test:coverage, test:shard:1..8）"
        return 1
    fi

    # --- 2) 前置：typecheck（默认开启）---
    if [ "$do_typecheck" = "1" ]; then
        if has_script "typecheck"; then
            info "  [1/2] 类型检查: $pkg_cmd typecheck"
            local log_typecheck="/tmp/topems-test-frontend-typecheck.log"
            if ! ( cd "$web_dir" && $pkg_cmd typecheck ) >"$log_typecheck" 2>&1; then
                error "类型检查失败（$pkg_cmd typecheck），摘要如下："
                tail -n 30 "$log_typecheck" >&2
                detail "完整日志: $log_typecheck"
                return 1
            fi
            success "  [1/2] 类型检查通过"
        else
            warning "  [1/2] apps/web 未定义 typecheck 脚本，跳过类型检查"
        fi
    else
        info "  [1/2] 已指定 --no-typecheck，跳过类型检查"
    fi

    # --- 3) 实际执行 vitest ---
    local step_label="[2/2]"
    if [ "$do_typecheck" != "1" ]; then step_label="[1/1]"; fi
    local log_test="/tmp/topems-test-frontend-${subcmd}${shard_index:+-$shard_index}.log"
    info "  $step_label 测试: $pkg_cmd run $script_name"
    info "  工作目录: $web_dir"
    info "  完整日志: $log_test"

    local rc=0
    # 用子 shell 包 cd，不污染主进程工作目录
    ( cd "$web_dir" && $pkg_cmd run "$script_name" ) >"$log_test" 2>&1 || rc=$?

    # --- 4) 提取 summary 行（vitest 输出末几行固定模式，含 ANSI 颜色码）---
    # 匹配形如:
    #   Test Files  5 passed (5)
    #   Tests  123 passed (123)
    local test_files_line tests_line
    # 放宽：允许 ANSI 前缀（\e[...m 用 .* 匹配，因为落盘时已经是字面量字节）
    test_files_line=$(grep -E "Test Files.*passed" "$log_test" 2>/dev/null | tail -n 1 || true)
    tests_line=$(grep -E "^.*Tests.*passed" "$log_test" 2>/dev/null | tail -n 1 || true)
    # 清洗 ANSI：删除 \e[...m 序列，保持最终 CLI 清爽
    _strip_ansi() { sed -E 's/\x1B\[[0-9;]*[mK]//g'; }
    if [ -n "$test_files_line" ]; then test_files_line=$(printf '%s' "$test_files_line" | _strip_ansi); fi
    if [ -n "$tests_line" ];      then tests_line=$(printf '%s' "$tests_line" | _strip_ansi); fi

    if [ "$rc" -eq 0 ]; then
        success "前端测试通过"
        if [ -n "$test_files_line" ]; then detail "  $test_files_line"; fi
        if [ -n "$tests_line" ];      then detail "  $tests_line"; fi
        return 0
    fi

    error "前端测试失败（exit=$rc）"
    if [ -n "$test_files_line" ]; then detail "  $test_files_line"; fi
    if [ -n "$tests_line" ];      then detail "  $tests_line"; fi
    detail "失败摘要（日志末 40 行）:"
    tail -n 40 "$log_test" >&2
    detail "完整日志: $log_test"
    return "$rc"
}

# 运行所有测试

test_all() {
    info "========== 运行所有测试 =========="

    local backend_result=0
    local frontend_result=0

    if ! test_backend; then
        backend_result=1
    fi

    info "========== 运行前端测试 =========="
    if ! test_frontend; then
        frontend_result=1
    fi

    echo ""
    info "========== 测试完成 =========="
    if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
        success "所有测试通过"
        return 0
    else
        error "测试失败"
        return 1
    fi
}

# 获取服务对应的端口环境变量名
