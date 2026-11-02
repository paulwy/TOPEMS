# shellcheck shell=bash
# =============================================
# TOPEMS lib/service.sh（自 scripts/topems.sh 拆分，2026-11-02）
# =============================================

get_port_env_var() {
    case "$1" in
        iam) echo "CORE_PORT" ;;
        pm) echo "PM_PORT" ;;
        erp) echo "ERP_PORT" ;;
        finance) echo "FINANCE_PORT" ;;
        ai) echo "AI_PORT" ;;
        hrm) echo "HRM_PORT" ;;
        crm) echo "CRM_PORT" ;;
        mes) echo "MES_PORT" ;;
        pdm) echo "PDM_PORT" ;;
        scm) echo "SCM_PORT" ;;
        wms) echo "WMS_PORT" ;;
        srm) echo "SRM_PORT" ;;
        qms) echo "QMS_PORT" ;;
        lims) echo "LIMS_PORT" ;;
        ehs) echo "EHS_PORT" ;;
        rd) echo "RD_PORT" ;;
        bi|analytics) echo "BI_PORT" ;;
        portal) echo "PORTAL_PORT" ;;
        mobile) echo "MOBILE_PORT" ;;
        gis) echo "GIS_PORT" ;;
        integration) echo "INTEGRATION_PORT" ;;
        search) echo "SEARCH_PORT" ;;
        communication) echo "COMMUNICATION_PORT" ;;
        ticket) echo "TICKET_PORT" ;;
        # [V2026.08 已合并] feedback（原 FEEDBACK_PORT 8087，已合并至 ticket）
        master-data) echo "MASTER_DATA_PORT" ;;
        # [V2026.08 已移除] lowcode（原 LOWCODE_PORT）
        tms) echo "TMS_PORT" ;;
        monitor) echo "MONITOR_PORT" ;;
        plugin-registry) echo "PLUGIN_REGISTRY_PORT" ;;
        *) echo "SERVER_PORT" ;;
    esac
}


_start_service_internal() {
    local service_name=$1
    local port=$2
    local executable_path=$3
    local port_env_var
    port_env_var=$(get_port_env_var "$service_name")

    cd "$PROJECT_ROOT" || exit 1
    
    if [ "$service_name" = "iam" ]; then
        # port_env_var 对 iam 即 CORE_PORT，无需重复赋值
        env $port_env_var=$port nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    else
        env SERVER_PORT=$port $port_env_var=$port nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    fi
    
    echo "$!"
}


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

        # 轮询等待端口就绪：固定 sleep 3 对冷启动含 schema 自检的服务（unified-core ~18s）
        # 必然误判失败，并在重试时 kill -9 正在迁移的进程。改为最长等待 READY_TIMEOUT，
        # 端口绑定即成功；进程提前退出则立即跳出重试，避免空等。
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

# 查看日志

logs_service() {
    local service_name=$1
    local lines=${2:-50}
    [ -f "/tmp/topems-${service_name}.log" ] && tail -n $lines "/tmp/topems-${service_name}.log" || { error "日志文件不存在"; return 1; }
}

# 等待 plugin-registry 的插件注册接口就绪
# 返回: 0=就绪, 1=未就绪

_wait_for_plugin_registry() {
    local registry_url="http://localhost:8096"
    local max_wait=15
    local interval=1
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local health
        health=$(curl -s -o /dev/null -w "%{http_code}" "$registry_url/health" 2>/dev/null || echo "000")
        if [ "$health" = "200" ]; then
            local test_resp
            test_resp=$(curl -s -o /dev/null -w "%{http_code}" "$registry_url/dev/runtime/ping/register" 2>/dev/null || echo "000")
            if [ "$test_resp" != "000" ]; then
                return 0
            fi
        fi
        sleep $interval
        waited=$((waited + interval))
    done
    return 1
}

# 安全解析 JSON 字段（失败返回默认值）

_safe_json_field() {
    local json="$1"
    local field="$2"
    local default="${3:-}"
    local py_cmd=""
    # runtime probe: python3 may be a silent Microsoft Store stub on Windows/Git Bash
    if command -v python3 >/dev/null 2>&1 && echo '{}' | python3 -c "import sys,json" >/dev/null 2>&1; then
        py_cmd=python3
    elif command -v python >/dev/null 2>&1 && echo '{}' | python -c "import sys,json" >/dev/null 2>&1; then
        py_cmd=python
    fi
    if [ -n "$py_cmd" ]; then
        echo "$json" | "$py_cmd" -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('$field', '$default'))
except Exception:
    print('$default')
" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

# 服务注册到 plugin-registry（含重试与指数退避）

register_plugin() {
    local service_name=$1
    local port
    port=$(get_service_port "$service_name")
    [ -z "$port" ] && return

    local registry_url="http://localhost:8096"
    local max_retries=5
    local initial_delay=2
    local max_delay=30

    local service_display_name
    service_display_name=$(get_service_display_name "$service_name")
    local description
    description=$(get_service_description "$service_name")
    local runtime_url="http://localhost:$port"
    local plugin_token="${PLUGIN_REGISTRATION_TOKEN:-}"

    local attempt=1
    local delay=$initial_delay

    while [ $attempt -le $max_retries ]; do
        if [ $attempt -eq 1 ]; then
            if ! _wait_for_plugin_registry; then
                warning "plugin-registry 注册接口未就绪，$service_name 跳过注册（将在全部启动后重试）"
                return 1
            fi
        else
            sleep $delay
            delay=$((delay * 2))
            [ $delay -gt $max_delay ] && delay=$max_delay
        fi

        detail "注册 $service_name (第 $attempt/$max_retries 次)..."

        local token_header=""
        [ -n "$plugin_token" ] && token_header="-H \"X-Plugin-Token: $plugin_token\""

        # Windows/Git Bash: payload via temp file to avoid MSYS arg mangling of UTF-8
        local tmp_body
        tmp_body=$(mktemp /tmp/topems-register-body.XXXXXX 2>/dev/null || mktemp 2>/dev/null)
        cat > "$tmp_body" <<JSON
{
    "code": "${service_name}",
    "name": "${service_display_name}",
    "description": "${description}",
    "version": "0.1.0",
    "runtime_url": "${runtime_url}",
    "permissions": [],
    "category": "business"
}
JSON

        local response
        # curl 在连接失败时返回非零（如 exit 7=连接拒绝），set -e 会直接退出函数，
        # 导致 L1082 的空响应兜底分支不可达；用 || true 确保 curl 失败不触发 set -e
        response=$(eval curl -s --connect-timeout 5 --max-time 10 -X POST \
            "\"$registry_url/dev/runtime/${service_name}/register\"" \
            -H "\"Content-Type: application/json\"" \
            $token_header \
            -d "@$tmp_body" 2>/dev/null || true)
        rm -f "$tmp_body"

        if [ -z "$response" ]; then
            attempt=$((attempt + 1))
            continue
        fi

        local success
        success=$(_safe_json_field "$response" "success" "False")

        if [ "$success" = "True" ]; then
            success "$service_name 注册成功"
            # 从失败列表中移除（如果之前标记过）
            if [ -f /tmp/topems-register-failed.log ]; then
                grep -vx "$service_name" /tmp/topems-register-failed.log > /tmp/topems-register-failed.tmp 2>/dev/null
                mv /tmp/topems-register-failed.tmp /tmp/topems-register-failed.log 2>/dev/null
            fi
            return 0
        else
            local msg
            msg=$(_safe_json_field "$response" "message" "")
            if [ -n "$msg" ] && [ "$msg" != "" ]; then
                warning "$service_name 注册失败: $msg"
            fi
        fi

        attempt=$((attempt + 1))
    done

    warning "$service_name 注册失败（已重试 $max_retries 次），将在全部服务启动后再次尝试"
    return 1
}

# 批量注册所有服务到 plugin-registry
# 用法: ./scripts/topems.sh register-all

register_all_plugins() {
    local registry_url="http://localhost:8096"
    local -a services_to_register=()
    local success_count=0
    local fail_count=0

    if ! _wait_for_plugin_registry; then
        error "plugin-registry 注册接口未就绪，请先启动服务"
        return 1
    fi

    info "批量注册所有服务到 plugin-registry..."
    for service in $(get_all_services); do
        if echo "$CORE_SERVICES" | grep -wq "$service"; then
            continue
        fi
        local port
        port=$(get_service_port "$service")
        if check_port "$port"; then
            services_to_register+=("$service")
        else
            warning "$service 未运行，跳过注册"
        fi
    done

    info "待注册 ${#services_to_register[@]} 个服务..."
    for svc in "${services_to_register[@]}"; do
        if register_plugin "$svc"; then
            success_count=$((success_count + 1))
        else
            fail_count=$((fail_count + 1))
        fi
    done

    echo ""
    info "注册汇总: 成功 $success_count, 失败 $fail_count"
    [ $fail_count -eq 0 ] && success "所有服务注册完成 ✅" || warning "部分服务注册失败"
    return $fail_count
}

# 获取服务显示名称

get_service_display_name() {
    case "$1" in
        iam) echo "统一认证服务" ;;
        pm) echo "项目管理" ;;
        erp) echo "ERP系统" ;;
        finance) echo "财务管理" ;;
        ai) echo "AI服务" ;;
        hrm) echo "人力资源" ;;
        crm) echo "客户关系" ;;
        mes) echo "生产制造" ;;
        pdm) echo "产品数据" ;;
        scm) echo "供应链管理" ;;
        wms) echo "仓储管理" ;;
        srm) echo "供应商管理" ;;
        qms) echo "质量管理" ;;
        lims) echo "实验室管理" ;;
        ehs) echo "环境健康安全" ;;
        rd) echo "研发服务" ;;
        bi) echo "商业智能" ;;
        portal) echo "门户服务" ;;
        mobile) echo "移动服务" ;;
        gis) echo "地理信息" ;;
        integration) echo "集成服务" ;;
        tms) echo "运输管理" ;;
        communication) echo "通讯服务" ;;
        master-data) echo "主数据服务" ;;
        search) echo "搜索服务" ;;
        ticket) echo "工单服务" ;;
        # [V2026.08 已移除] lowcode（原低代码平台）
        # 注意：\U 是 GNU sed 扩展，macOS BSD sed 不支持，改用 awk toupper
        *) echo "$1" | awk '{print toupper(substr($0,1,1)) substr($0,2) "服务"}' ;;
    esac
}

# 获取服务描述

get_service_description() {
    case "$1" in
        iam) echo "统一身份认证与权限管理服务" ;;
        pm) echo "项目管理服务" ;;
        erp) echo "企业资源计划系统" ;;
        finance) echo "财务管理服务" ;;
        ai) echo "AI智能服务" ;;
        hrm) echo "人力资源管理系统" ;;
        crm) echo "客户关系管理系统" ;;
        mes) echo "生产制造执行系统" ;;
        pdm) echo "产品数据管理系统" ;;
        scm) echo "供应链管理系统" ;;
        wms) echo "仓储管理系统" ;;
        srm) echo "供应商关系管理" ;;
        qms) echo "质量管理系统" ;;
        lims) echo "实验室信息管理系统" ;;
        ehs) echo "环境健康安全管理" ;;
        rd) echo "研发服务管理" ;;
        bi) echo "商业智能分析服务" ;;
        portal) echo "企业门户服务" ;;
        mobile) echo "移动应用服务" ;;
        gis) echo "地理信息服务" ;;
        integration) echo "系统集成服务" ;;
        tms) echo "运输管理服务" ;;
        communication) echo "IM/通知/邮件/短信等通讯能力统一服务" ;;
        master-data) echo "企业级主数据统一管理服务" ;;
        search) echo "Elasticsearch全文检索与搜索聚合服务" ;;
        ticket) echo "工单与服务请求流程引擎服务" ;;
        # [V2026.08 已移除] lowcode（原低代码应用搭建与表单引擎平台）
        # 注意：\U 是 GNU sed 扩展，macOS BSD sed 不支持，改用 awk toupper
        *) echo "$1" | awk '{print toupper(substr($0,1,1)) substr($0,2) "服务"}' ;;
    esac
}

# 等待核心服务就绪

wait_for_core_services() {
    info "等待核心服务就绪..."
    local max_wait=60
    local wait_interval=2

    for service in $CORE_SERVICES; do
        local port
        port=$(get_service_port "$service")
        local elapsed=0
        while [ $elapsed -lt $max_wait ]; do
            if check_port $port && curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                success "$service 服务就绪"
                break
            fi
            sleep $wait_interval
            elapsed=$((elapsed + wait_interval))
        done
        if [ $elapsed -ge $max_wait ]; then
            warning "$service 服务未在 $max_wait 秒内就绪"
        fi
    done
}
# 启动开发环境（macOS）
# shellcheck disable=SC2120

start_dev_macos() {
    _preflight_check "$@" || return 1
    # V3xx SQLx 缓存新鲜度门禁（--skip-sqlx-check / SQLX_CHECK_SKIP=1 可跳过）
    _check_sqlx_cache_freshness "$@" || return 1
    info "启动 macOS 开发环境..."

    check_command() {
        if ! command -v "$1" &> /dev/null; then
            error "$1 未安装"
            return 1
        fi
    }

    check_command "cargo" || return 1
    check_command "node" || return 1
    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
    check_command "psql" || return 1

    db_start
    redis_start

    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        warning ".env 文件不存在，从示例复制..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        local jwt_secret
        jwt_secret=$(openssl rand -base64 32 | tr '/' '_' | tr '+' '-' | tr '=' '.')
        awk -F'=' -v secret="$jwt_secret" '$1=="JWT_SECRET" {$2=secret} 1' OFS='=' "$PROJECT_ROOT/.env" > "$PROJECT_ROOT/.env.tmp"
        mv "$PROJECT_ROOT/.env.tmp" "$PROJECT_ROOT/.env"
    fi

    start_service "iam"

    info "启动前端服务..."
    if ! check_port 3000; then
        ensure_frontend_deps "$pkg_cmd" || return 1
        # stdin=/dev/null 避免 TTY 关闭导致 Vite readline 触发 EIO 崩溃
        cd "$PROJECT_ROOT/apps/web" || exit 1
        nohup "$pkg_cmd" run dev -- \
            --port 3000 \
            --host "${FRONTEND_BIND_HOST:-::}" \
            < /dev/null \
            > "/tmp/topems-web.log" 2>&1 &
        cd - > /dev/null || exit 1
        sleep 5
        info "前端服务启动中..."
    else
        warning "前端已在端口 3000 运行"
    fi

    success "开发环境启动完成!"
    echo ""
    echo "服务状态:"
    show_all_status
}

# 获取前端 dev 进程 PID（vite/tsc/node）

get_frontend_pid() {
    if _is_windows; then
        # Windows/Git Bash：用 PowerShell 按命令行匹配 vite/tsc
        powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { \$_.CommandLine -match 'vite|tsc' -and \$_.CommandLine -match 'apps.web|topems-web' } | Select-Object -ExpandProperty ProcessId" 2>/dev/null | tr -d '\r'
    else
        ps aux | grep -v grep \
            | grep -E "(vite|tsc.*watch|topems-web\.log)" \
            | grep -E "(apps/web|$PROJECT_ROOT/apps/web)" \
            | awk '{print $2}' | sort -u | head -5
    fi
}

# 启动前端服务（带轮询等待，避免静态 sleep 5 与实际端口就绪不一致）

start_frontend() {
    info "启动前端服务..."

    local pkg_cmd
    pkg_cmd=$(get_pkg_cmd) || return 1
    ensure_frontend_deps "$pkg_cmd" || return 1

    if check_port 3000; then
        info "前端已在端口 3000 运行"
        return 0
    fi

    # 防止重复启动：已有 vite/tsc 进程在跑就先等它
    local existing_pid=""
    existing_pid=$(get_frontend_pid)
    if [ -n "$existing_pid" ]; then
        info "前端进程已存在 (PID: $existing_pid)，等待端口就绪..."
    else
        # 用 nohup + stdin=/dev/null 脱离 TTY，防止 TTY 关闭后 Vite readline 读到 EIO 崩溃
        # 使用 -- 透传参数到 vite（pnpm 自身参数不会误传入 vite）
        cd "$PROJECT_ROOT/apps/web" || exit 1
        nohup "$pkg_cmd" run dev -- \
            --port 3000 \
            --host "${FRONTEND_BIND_HOST:-::}" \
            < /dev/null \
            > "/tmp/topems-web.log" 2>&1 &
        cd - > /dev/null || exit 1
    fi
    local pid=$!
    [ -z "$pid" ] && pid=$existing_pid

    # 轮询等待端口就绪（最长 120s，冷启动含 tsc+vite 预构建通常 15~60s）
    local waited=0
    local interval=3
    local max_wait=120
    while [ $waited -lt $max_wait ]; do
        if check_port 3000; then
            success "前端服务启动成功 (PID: $pid, 端口: 3000, 用时: ${waited}s)"
            return 0
        fi
        # 进程挂了（立即失败）
        if ! kill -0 "$pid" 2>/dev/null; then
            local still_any=""
            still_any=$(get_frontend_pid)
            [ -z "$still_any" ] && break
        fi
        sleep $interval
        waited=$((waited + interval))
    done

    # 超过 max_wait：端口未开，但进程仍活着（仍在编译中）
    local still_pid=""
    still_pid=$(get_frontend_pid)
    if [ -n "$still_pid" ] || kill -0 "$pid" 2>/dev/null; then
        warning "前端服务仍在启动中 (PID: ${still_pid:-$pid})，端口 3000 暂未就绪（tsc 类型检查 / vite 预构建通常需要 30~90 秒）。"
        detail "日志: tail -f /tmp/topems-web.log"
        detail "稍后再查看: $0 status"
        return 0
    fi

    error "前端服务启动失败，请查看日志: /tmp/topems-web.log"
    tail -20 "/tmp/topems-web.log" 2>/dev/null
    return 1
}

# 停止前端服务

stop_frontend() {
    info "停止前端服务..."
    # 先按端口杀（已就绪态）
    local port_pid
    port_pid=$(get_port_pid 3000)
    # 再按进程名杀（仍在编译、端口未开的 vite/tsc 进程）
    local proc_pid
    proc_pid=$(get_frontend_pid)
    local all_pid
    all_pid=$(echo "$port_pid $proc_pid" | tr ' ' '\n' | sort -u | grep -v "^$")

    if [ -n "$all_pid" ]; then
        if _is_windows; then
            # Windows：MSYS kill 对原生 node.exe 无效，使用 taskkill 强杀
            for p in $all_pid; do taskkill //F //PID "$p" >/dev/null 2>&1 || true; done
            sleep 1
        else
            echo "$all_pid" | xargs -I{} kill {} 2>/dev/null || true
            sleep 1
            # 残留强杀
            local remain=""
            for p in $all_pid; do
                kill -0 "$p" 2>/dev/null && remain="$remain $p"
            done
            if [ -n "$remain" ]; then
                echo "$remain" | xargs -I{} kill -9 {} 2>/dev/null || true
                sleep 1
            fi
        fi
        success "前端服务已停止 (PID: $(echo "$all_pid" | tr '\n' ' '))"
    else
        warning "前端服务未运行"
    fi
}

# 显示所有服务状态

show_all_status() {
    echo ""
    info "TOPEMS 服务状态"
    echo "=================================================="

    local running_count=0
    local total_count=0

    for service in $(get_all_services); do
        status_service "$service"
        total_count=$((total_count + 1))
        # shellcheck disable=SC2046
        if check_port $(get_service_port "$service"); then
            running_count=$((running_count + 1))
        fi
    done

    if check_port 3000; then
        echo -e "${GREEN}✅${NC} 前端 (端口 3000) 运行中"
        running_count=$((running_count + 1))
    else
        # 端口未开，但 vite/tsc 仍在编译（仍在启动中 vs 真正未启动）
        local fe_pid=""
        fe_pid=$(get_frontend_pid)
        if [ -n "$fe_pid" ]; then
            echo -e "${YELLOW}⏳${NC} 前端 (端口 3000) 启动中 (PID: $fe_pid, 仍在编译/预构建，通常需要 30~90 秒)"
        else
            echo -e "${RED}❌${NC} 前端 (端口 3000) 未运行"
        fi
    fi
    total_count=$((total_count + 1))

    echo "=================================================="
    info "状态统计: ${running_count}/${total_count} 服务运行中"
}

# =============================================
# WebSocket 连接检查
# =============================================

# 检查 WebSocket 连接状态

ws_check() {
    info "=== WebSocket 连接检查 ==="
    
    local ws_endpoints=(
        "通知服务:/ws/core/notifications:8000"
        "IM服务:/ws/core/im:8000"
        "MES仪表盘:/ws/mes/dashboard:8030"
        "GIS服务:/ws/gis:8071"
    )
    
    local frontend_running=false
    if check_port 3000; then
        frontend_running=true
    fi
    
    local accessible_count=0
    local total_count=${#ws_endpoints[@]}
    
    for endpoint in "${ws_endpoints[@]}"; do
        local name
        name=$(echo "$endpoint" | cut -d: -f1)
        local path
        path=$(echo "$endpoint" | cut -d: -f2)
        local port
        port=$(echo "$endpoint" | cut -d: -f3)
        
        local backend_running=false
        if check_port $port; then
            backend_running=true
        fi
        
        if [ "$frontend_running" = true ]; then
            local proxy_status
            proxy_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
                -H "Upgrade: websocket" \
                -H "Connection: Upgrade" \
                -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
                -H "Sec-WebSocket-Version: 13" \
                "http://localhost:3000${path}" 2>/dev/null)
            if [ "$proxy_status" = "101" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 代理配置正确 (状态码: $proxy_status)"
                accessible_count=$((accessible_count + 1))
            elif [ "$proxy_status" = "401" ] || [ "$proxy_status" = "403" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 代理配置正确 (需要认证: $proxy_status)"
                accessible_count=$((accessible_count + 1))
            elif [ "$proxy_status" = "503" ]; then
                echo -e "${YELLOW}⚠️${NC} $name ($path) 后端服务未响应"
            elif [ "$proxy_status" = "000" ]; then
                echo -e "${YELLOW}⚠️${NC} $name ($path) 连接失败"
            else
                echo -e "${YELLOW}⚠️${NC} $name ($path) 状态码: $proxy_status"
            fi
        elif [ "$backend_running" = true ]; then
            local backend_status
            backend_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 \
                -H "Upgrade: websocket" \
                -H "Connection: Upgrade" \
                -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
                -H "Sec-WebSocket-Version: 13" \
                "http://localhost:${port}${path}" 2>/dev/null)
            if [ "$backend_status" = "101" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 后端可访问 (状态码: $backend_status)"
                accessible_count=$((accessible_count + 1))
            elif [ "$backend_status" = "401" ]; then
                echo -e "${GREEN}✅${NC} $name ($path) 后端可访问 (需要认证: $backend_status)"
                accessible_count=$((accessible_count + 1))
            else
                echo -e "${YELLOW}⚠️${NC} $name ($path) 后端状态码: $backend_status"
            fi
        else
            echo -e "${RED}❌${NC} $name ($path) 服务未运行 (端口 $port)"
        fi
    done
    
    echo ""
    info "WebSocket 统计: ${accessible_count}/${total_count} 可访问"
    
    if [ "$frontend_running" = false ]; then
        warning "前端未运行，请先启动前端: topems start web"
    fi
    
    echo ""
    detail "路径规范: /ws/{module}/{feature}"
    detail "详细文档: docs/developer/standards/websocket-path-mapping.md"
}

# =============================================
# 数据库管理
# =============================================

# 解析 DATABASE_URL 获取数据库连接信息
