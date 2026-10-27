#!/bin/bash

# =============================================
# TOPEMS 服务管理模块
# =============================================
# 服务启动/停止/重启/状态/日志

# 注意：此文件由 topems.sh source 引入，不要直接执行

# 启动服务
start_service() {
    local service_name=$1
    local force=${2:-false}
    local service_path
    service_path=$(get_service_path "$service_name")
    local port
    port=$(get_service_port "$service_name")

    [ -z "$service_path" ] && error "服务 $service_name 不存在" && return 1
    [ -z "$port" ] && error "无法获取服务 $service_name 的端口" && return 1

    info "启动 $service_name 服务..."

    if check_port $port; then
        local pid
        pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            warning "$service_name 服务已在运行 (PID: $pid, 端口: $port)"
            [ "$force" = "true" ] && { info "强制重启..."; stop_service "$service_name"; } || return 0
        else
            warning "端口 $port 已被占用"
            [ "$force" = "true" ] || { info "使用 --force 强制清理端口"; return 1; }
        fi
    fi

    local executable_name
    executable_name=$(get_executable_name "$service_name")
    local executable_path="$PROJECT_ROOT/target/release/${executable_name}"
    
    if [ -n "$executable_name" ] && ps aux | grep -v grep | grep -q "$executable_name" && [ "$executable_name" != "topems-unified-core" ]; then
        local other_service
        other_service=$(echo "$SERVICES_CONFIG" | grep -v "^${service_name} " | grep " ${executable_name} " | awk '{print $1}')
        if [ -n "$other_service" ]; then
            info "$service_name 与 $other_service 共享同一可执行文件，$other_service 已在运行，跳过 $service_name"
            return 0
        fi
    fi
    
    [ ! -f "$executable_path" ] && { warning "可执行文件不存在，开始编译..."; build_service "$service_name" || return 1; }

    load_env

    if [ "$service_name" = "ai" ]; then
        if ! curl -s -f http://localhost:11434/api/tags >/dev/null 2>&1; then
            info "AI 服务需要 Ollama，正在启动..."
            if command -v ollama &> /dev/null; then
                nohup ollama serve > /tmp/ollama.log 2>&1 &
                sleep 5
                if curl -s -f http://localhost:11434/api/tags >/dev/null 2>&1; then
                    success "Ollama 启动成功"
                else
                    warning "Ollama 启动失败，请手动启动: ollama serve"
                fi
            else
                warning "Ollama 未安装，请先安装: brew install ollama"
            fi
        fi
    fi

    local retries=0
    local delay=$RETRY_DELAY
    local pid=""

    while [ $retries -lt $MAX_RETRIES ]; do
        if [ $retries -gt 0 ]; then
            warning "$service_name 服务启动失败，第 $retries/$MAX_RETRIES 次重试，等待 ${delay}s..."
            sleep $delay
            delay=$((delay * BACKOFF_FACTOR))
        fi

        pid=$(_start_service_internal "$service_name" "$port" "$executable_path")

        # 轮询等待端口就绪
        local waited=0 ready=0
        while [ $waited -lt $READY_TIMEOUT ]; do
            if check_port $port; then ready=1; break; fi
            if ! kill -0 "$pid" 2>/dev/null; then break; fi
            sleep 2
            waited=$((waited + 2))
        done

        if [ $ready -eq 1 ]; then
            success "$service_name 服务启动成功 (PID: $pid, 端口: $port, 就绪耗时 ${waited}s)"

            if [ "$service_name" != "iam" ]; then
                if ! register_plugin "$service_name"; then
                    echo "$service_name" >> /tmp/topems-register-failed.log
                fi
            fi

            return 0
        else
            local failed_pid
            failed_pid=$(get_service_pid "$service_name" "$port")
            if [ -n "$failed_pid" ]; then
                kill -9 $failed_pid 2>/dev/null || true
                sleep 1
            fi
            retries=$((retries + 1))
        fi
    done

    error "$service_name 服务启动失败，已重试 $MAX_RETRIES 次，请查看日志: /tmp/topems-${service_name}.log"
    tail -20 "/tmp/topems-${service_name}.log" 2>/dev/null
    return 1
}

# 停止服务
stop_service() {
    local service_name=$1
    local port
    port=$(get_service_port "$service_name")
    [ -z "$port" ] && error "无法获取服务 $service_name 的端口" && return 1

    info "停止 $service_name 服务..."
    if check_port $port; then
        local pid
        pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            if _is_windows; then taskkill //F //PID "$pid" >/dev/null 2>&1 || true; else kill $pid 2>/dev/null || true; fi
            sleep 1
            if ! check_port $port; then
                success "$service_name 服务已停止"
                return 0
            else
                if _is_windows; then taskkill //F //PID "$pid" >/dev/null 2>&1 || true; else kill -9 $pid 2>/dev/null || true; fi
                sleep 1
                ! check_port $port && success "$service_name 服务已强制停止" || error "无法停止 $service_name 服务"
            fi
        else
            warning "未找到运行中的 $service_name 进程"
        fi
    else
        warning "$service_name 服务未运行"
    fi
}

# 查看服务状态
status_service() {
    local service_name=$1
    local port
    port=$(get_service_port "$service_name")
    [ -z "$port" ] && { echo -e "${RED}❌ $service_name: 无法获取端口${NC}"; return 1; }

    if check_port $port; then
        local pid
        pid=$(get_service_pid "$service_name" "$port")
        if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康]"
        else
            echo -e "${YELLOW}⚠️${NC} $service_name (端口 $port) 运行中 (PID: $pid) [健康检查失败]"
        fi
    else
        local executable_name
        executable_name=$(get_executable_name "$service_name")
        if [ -n "$executable_name" ] && ps aux | grep -v grep | grep -q "$executable_name" && [ "$executable_name" != "topems-unified-core" ]; then
            local provider
            provider=$(echo "$SERVICES_CONFIG" | grep -v "^${service_name} " | grep " ${executable_name} " | awk '{print $1}')
            if [ -n "$provider" ]; then
                local provider_port
                provider_port=$(get_service_port "$provider")
                if curl -s -f "http://localhost:$provider_port/health" >/dev/null 2>&1; then
                    echo -e "${GREEN}✅${NC} $service_name (端口 $port) 由 $provider 服务提供 [健康]"
                    return
                fi
            fi
        fi
        echo -e "${RED}❌${NC} $service_name (端口 $port) 未运行"
    fi
}

# 查看服务日志
logs_service() {
    local service_name=$1
    local lines=${2:-50}
    [ -f "/tmp/topems-${service_name}.log" ] && tail -n $lines "/tmp/topems-${service_name}.log" || { error "日志文件不存在"; return 1; }
}
