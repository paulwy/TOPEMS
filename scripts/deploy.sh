#!/bin/bash

# =============================================
# TOPEMS 部署模块
# =============================================
# 全量启动/停止/一键运行

# 注意：此文件由 topems.sh source 引入，不要直接执行

# 启动所有服务
start_all_services() {
    _preflight_check "$@" || return 1
    local -a extra_opts=("$@")
    local -a filtered_opts=()
    for opt in "${extra_opts[@]}"; do [ "$opt" != "--skip-preflight" ] && filtered_opts+=("$opt"); done
    extra_opts=("${filtered_opts[@]}")
    _check_sqlx_cache_freshness "${extra_opts[@]}" || return 1
    info "启动所有服务..."
    load_env

    local only_core=0
    local skip_fe=0
    local no_register=0
    local skip_packages=""
    for opt in "${extra_opts[@]}"; do
        case "$opt" in
            --only-core)    only_core=1 ;;
            --no-frontend)  skip_fe=1 ;;
            --no-register)  no_register=1 ;;
            --skip=*)       skip_packages="${skip_packages} ${opt#--skip=}" ;;
        esac
    done

    local success_count=0
    local fail_count=0
    local register_failed_log="/tmp/topems-register-failed.log"
    rm -f "$register_failed_log"

    info "========== [1/3] 启动核心服务 =========="
    for service in $CORE_SERVICES; do
        local skip_this=0
        for s in $skip_packages; do
            [ "$service" = "$s" ] && skip_this=1 && break
        done
        [ $skip_this -eq 1 ] && continue

        if start_service "$service"; then
            success_count=$((success_count + 1))
        else
            fail_count=$((fail_count + 1))
        fi
    done

    wait_for_core_services

    if [ "$no_register" = "0" ]; then
        info "等待 plugin-registry 注册接口就绪..."
        _wait_for_plugin_registry || warning "plugin-registry 注册接口未就绪"
    fi

    if [ "$only_core" = "1" ]; then
        info "========== --only-core 指定，仅启动核心服务 =========="
    else
        info "========== [2/3] 启动其他服务 =========="
        for service in $(get_all_services); do
            if echo "$CORE_SERVICES" | grep -wq "$service"; then
                continue
            fi
            local skip_this=0
            for s in $skip_packages; do
                [ "$service" = "$s" ] && skip_this=1 && break
            done
            [ $skip_this -eq 1 ] && continue

            if start_service "$service"; then
                success_count=$((success_count + 1))
            else
                fail_count=$((fail_count + 1))
            fi
        done
    fi

    if [ $skip_fe -eq 1 ]; then
        info "========== [3/3] 已指定 --no-frontend，跳过前端 =========="
    else
        info "========== [3/3] 启动前端 =========="
        if start_frontend; then
            success_count=$((success_count + 1))
        else
            fail_count=$((fail_count + 1))
        fi
    fi

    echo ""
    info "========== 启动汇总 =========="
    info "成功: $success_count   失败: $fail_count"
    if [ $fail_count -eq 0 ]; then
        success "所有服务启动完成 ($success_count 成功) ✅"
    else
        warning "服务启动完成 ($success_count 成功, $fail_count 失败)"
    fi
}

# 停止所有服务
stop_all_services() {
    info "停止所有服务..."
    for service in $(get_all_services); do
        stop_service "$service" || true
    done
    success "所有服务已停止"
}
