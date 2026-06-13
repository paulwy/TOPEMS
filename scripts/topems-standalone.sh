#!/bin/bash

# TOPEMS 本地部署脚本
# 特性:
# - 直接启动所有后端服务
# - 支持环境变量配置
# - 服务依赖管理
# - 健康检查和状态报告

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
PROJECT_ROOT="$(pwd)/.."
cd "$PROJECT_ROOT"
PROJECT_ROOT="$(pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 加载配置文件
load_config() {
  # 加载端口配置
  if [ -f "$PROJECT_ROOT/config/ports.env" ]; then
    source "$PROJECT_ROOT/config/ports.env"
    info "已加载端口配置"
  else
    warning "端口配置文件不存在，使用默认端口"
  fi
  
  # 加载环境变量
  if [ -f "$PROJECT_ROOT/config/standalone.env" ]; then
    source "$PROJECT_ROOT/config/standalone.env"
    info "已加载环境变量配置"
  else
    warning "环境变量配置文件不存在，使用默认配置"
  fi
  
  # 导出所有必要的环境变量（确保cargo run能访问）
  export DATABASE_URL="${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}"
  export REDIS_URL="${REDIS_URL:-redis://:topems_redis_secret@localhost:6379}"
  export JWT_SECRET="${JWT_SECRET:-topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256}"
  export REFRESH_SECRET="${REFRESH_SECRET:-topems-refresh-secret-key-must-be-at-least-32-characters-long}"
  export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000,http://localhost:8000}"
  
  # AI/LLM 配置 (Ollama 本地 AI)
  export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434/v1}"
  export OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
  export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:7b-instruct}"
  export EMBEDDING_MODEL="${EMBEDDING_MODEL:-nomic-embed-text}"
  
  export RUST_LOG="${RUST_LOG:-info}"
}

# 检查必需的命令行工具
check_required_tools() {
  info "检查必需工具..."

  local missing_tools=()
  local required_tools=("psql" "redis-cli" "curl" "lsof" "cargo" "pkill")

  for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing_tools+=("$tool")
    fi
  done

  if [ ${#missing_tools[@]} -gt 0 ]; then
    error "缺少必需工具: ${missing_tools[*]}"
    info "请安装以下工具后重试:"
    for tool in "${missing_tools[@]}"; do
      case "$tool" in
        psql)
          info "  psql - PostgreSQL 客户端 (通常随 postgresql 包安装)" ;;
        redis-cli)
          info "  redis-cli - Redis 客户端 (通常随 redis-tools 包安装)" ;;
        curl)
          info "  curl - HTTP 客户端" ;;
        lsof)
          info "  lsof - 端口检测工具 (通常随 lsof 包安装)" ;;
        cargo)
          info "  cargo - Rust 构建工具 (安装 Rust: rustup.rs)" ;;
        pkill)
          info "  pkill - 进程终止工具 (通常随 procps 包安装)" ;;
      esac
    done
    exit 1
  fi

  success "必需工具检查通过"
}

# 检查Ollama服务（AI服务可选依赖）
check_ollama() {
  local ollama_port="${OLLAMA_PORT:-11434}"

  if curl -s "http://localhost:$ollama_port/api/tags" >/dev/null 2>&1; then
    success "Ollama 服务运行正常"

    # 检查必要的模型是否已安装
    local llm_model="${OLLAMA_MODEL:-qwen2.5:7b-instruct}"
    local embedding_model="${EMBEDDING_MODEL:-nomic-embed-text}"

    if ollama list 2>/dev/null | grep -q "$llm_model"; then
      success "LLM 模型已安装: $llm_model"
    else
      warning "LLM 模型未安装: $llm_model (AI服务将无法使用)"
      info "提示: 运行 'ollama pull $llm_model' 安装"
    fi

    if ollama list 2>/dev/null | grep -q "$embedding_model"; then
      success "嵌入模型已安装: $embedding_model"
    else
      warning "嵌入模型未安装: $embedding_model (AI服务将无法使用)"
      info "提示: 运行 'ollama pull $embedding_model' 安装"
    fi
  else
    warning "Ollama 服务未运行 (AI服务将无法使用)"
    info "提示: 运行 'ollama serve' 启动 Ollama 服务"
  fi
}

# 检查数据库并运行迁移
check_database() {
  info "检查数据库连接..."

  # 检查PostgreSQL
  if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
    success "PostgreSQL 连接正常"
  else
    error "PostgreSQL 连接失败"
    info "请确保PostgreSQL服务已启动，并且数据库配置正确"
    info "当前配置: $DATABASE_URL"
    exit 1
  fi

  # 检查Redis
  if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
    success "Redis 连接正常"
  else
    error "Redis 连接失败"
    info "请确保Redis服务已启动，并且配置正确"
    info "当前配置: $REDIS_URL"
    exit 1
  fi

  # 检查Ollama（AI服务可选依赖）
  check_ollama

  # 检查数据库迁移状态
  check_migrations
}

# 检查并运行数据库迁移
check_migrations() {
  info "检查数据库迁移状态..."

  local missing_migrations=()
  # 定义有SQL迁移文件的服务（使用Rust原生迁移的服务不包含在此列表中）
  local all_services=(
    "iam:iam:svc/iam"
    "pm:pm:svc/pm"
    "portal:portal:svc/portal"
    "integration:integration:svc/integration"
    "erp:erp:svc/erp"
    "hrm:hrm:svc/hrm"
    "crm:crm:svc/crm"
    "rs:rs:svc/rs"
    "lims:lims:svc/lims"
    "mes:mes:svc/mes"
    "qms:qms:svc/qms"
    "ehs:ehs:svc/ehs"
    "scm:scm:svc/scm"
    "srm:srm:svc/srm"
    "wms:wms:svc/wms"
    "file:storage:svc/file"
    "mail:mail:svc/mail"
    "im:im:svc/im"
    "gis:GIS:svc/gis"
    "bi:bi:svc/bi"
    "report:report:svc/report"
    "ai:ai:svc/ai"
    "doc:doc_service:svc/doc"
  )
  # 注意：以下服务使用Rust原生迁移，不在此列表中：
  # notification, flow, pdm, mobile
  # 这些服务会在启动时自动创建表

  for service_info in "${all_services[@]}"; do
    local svc_name="${service_info%%:*}"
    local remaining="${service_info#*:}"
    local schema_name="${remaining%%:*}"
    local svc_path="${remaining##*:}"

    # 检查 schema 是否存在且有表
    local table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_schema) = LOWER('$schema_name');" 2>/dev/null | tr -d ' ')

    if [ -z "$table_count" ] || [ "$table_count" = "0" ] || [ "$table_count" = "" ]; then
      # 检查是否有迁移文件（包括 src/db/migrations/ 子目录）
      local migration_dir=""
      if [ -d "$PROJECT_ROOT/$svc_path/migrations" ] && [ "$(ls -A "$PROJECT_ROOT/$svc_path/migrations" 2>/dev/null | wc -l)" -gt 0 ]; then
        migration_dir="$PROJECT_ROOT/$svc_path/migrations"
      elif [ -d "$PROJECT_ROOT/$svc_path/src/db/migrations" ] && [ "$(ls -A "$PROJECT_ROOT/$svc_path/src/db/migrations" 2>/dev/null | wc -l)" -gt 0 ]; then
        migration_dir="$PROJECT_ROOT/$svc_path/src/db/migrations"
      fi

      if [ -n "$migration_dir" ]; then
        missing_migrations+=("$svc_name:$schema_name:$svc_path")
      fi
    fi
  done

  if [ ${#missing_migrations[@]} -gt 0 ]; then
    warning "检测到 ${#missing_migrations[@]} 个模块缺少数据库表"
    info "正在自动运行数据库迁移..."

    for migration_info in "${missing_migrations[@]}"; do
      local svc_name="${migration_info%%:*}"
      local remaining="${migration_info#*:}"
      local schema_name="${remaining%%:*}"
      local svc_path="${remaining##*:}"

      info "  迁移 $svc_name schema..."

      # 创建 schema
      psql "$DATABASE_URL" -c "CREATE SCHEMA IF NOT EXISTS $schema_name;" >/dev/null 2>&1 || true

      # 确保必要的扩展已安装
      if [ "$svc_name" = "gis" ]; then
        psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" >/dev/null 2>&1 || true
        psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS btree_gin;" >/dev/null 2>&1 || true
      fi

      # 确定迁移目录并运行迁移文件
      local migration_dirs=("$PROJECT_ROOT/$svc_path/migrations" "$PROJECT_ROOT/$svc_path/src/db/migrations")

      for migration_dir in "${migration_dirs[@]}"; do
        if [ -d "$migration_dir" ]; then
          for migration_file in "$migration_dir"/*.sql; do
            if [ -f "$migration_file" ]; then
              info "    运行: $(basename "$migration_file")"
              psql "$DATABASE_URL" -f "$migration_file" >/dev/null 2>&1 || true
            fi
          done
        fi
      done
    done

    success "数据库迁移完成"
  else
    success "数据库迁移状态正常"
  fi
}

# 检查Ollama并确保模型已安装
check_ollama() {
  info "检查AI服务..."
  
  if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    warning "Ollama 服务未运行，AI功能将受限"
    warning "请运行: ollama serve"
    return 0
  fi
  
  success "Ollama 服务正常"
  
  # 获取已安装的模型列表
  local installed_models=$(curl -s http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[].name' 2>/dev/null || echo "")
  
  # 检查需要的模型
  local required_models=("nomic-embed-text:latest" "qwen2.5:7b-instruct")
  
  for model in "${required_models[@]}"; do
    if echo "$installed_models" | grep -q "$model"; then
      success "模型已安装: $model"
    else
      warning "模型未安装: $model"
      info "正在安装 $model..."
      if ollama pull "$model" >/dev/null 2>&1; then
        success "模型安装成功: $model"
      else
        warning "模型安装失败: $model"
      fi
    fi
  done
  
  # 显示当前模型
  info "当前配置的模型:"
  info "  LLM: ${OLLAMA_MODEL:-qwen2.5:7b-instruct}"
  info "  嵌入: ${EMBEDDING_MODEL:-nomic-embed-text}"
}

# 停止所有服务
stop_all() {
  info "停止所有服务..."
  
  # 停止后端服务
  services=(
    "iam" "notification" "portal" "flow" "integration"
    "erp" "hrm" "crm" "rs" "doc" "lims" "pdm"
    "mes" "qms" "ehs" "scm" "srm" "wms"
    "file" "mail" "im" "gis" "bi" "report" "ai" "mobile"
  )
  
  for service in "${services[@]}"; do
    pkill -f "topems-$service" 2>/dev/null || true
    pkill -f "cargo run.*$service" 2>/dev/null || true
    pkill -f "$service-service" 2>/dev/null || true
  done
  
  # 停止前端服务
  pkill -f "npm run dev" 2>/dev/null || true
  pkill -f "node.*vite" 2>/dev/null || true
  
  success "所有服务已停止"
}

# 启动单个服务
start_service() {
  local name="$1"
  local port="$2"
  
  info "启动 $name 服务 (端口 $port)..."
  
  # 检查端口是否被占用
  if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    # 检查是否是正确的服务
    if pgrep -f "topems-$name" >/dev/null 2>&1; then
      success "$name 服务已在运行 (端口 $port)"
      return
    else
      warning "端口 $port 被其他进程占用，跳过 $name 服务"
      return
    fi
  fi
  
  # 检查服务目录是否存在
  if [ ! -d "$PROJECT_ROOT/svc/$name" ]; then
    warning "$name 服务目录不存在，跳过"
    return
  fi
  
  # 创建日志目录
  mkdir -p "$PROJECT_ROOT/logs"
  
  # 启动服务
  cd "$PROJECT_ROOT/svc/$name"
  SERVER_PORT="$port" RUST_LOG=info cargo run --quiet > "$PROJECT_ROOT/logs/$name.log" 2>&1 &
  local pid=$!
  
  # 等待服务启动（最多15秒）
  local attempts=0
  while [ $attempts -lt 15 ]; do
    # 检查进程是否还在运行
    if ! kill -0 $pid 2>/dev/null; then
      warning "$name 服务启动失败，请检查日志: logs/$name.log"
      return
    fi
    
    # 尝试访问健康检查端点
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
      success "$name 服务启动成功 (PID: $pid)"
      return
    fi
    
    attempts=$((attempts + 1))
    sleep 1
  done
  
  # 超时但进程还在运行，认为启动成功
  if kill -0 $pid 2>/dev/null; then
    success "$name 服务启动成功 (PID: $pid, 启动中)"
  else
    warning "$name 服务启动失败，请检查日志: logs/$name.log"
  fi
}

# 启动核心服务
start_core() {
  info "启动核心服务..."

  local core_services=(
    "iam:${IAM_PORT:-8000}"
    "pm:${PM_PORT:-8001}"
    "notification:${NOTIFICATION_PORT:-8002}"
    "portal:${PORTAL_PORT:-8003}"
    "flow:${FLOW_PORT:-8004}"
    "integration:${INTEGRATION_PORT:-8005}"
  )

  for service in "${core_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动ERP服务
start_erp() {
  info "启动ERP服务..."
  
  local erp_services=(
    "erp:${ERP_PORT:-8010}"
    "hrm:${HRM_PORT:-8012}"
    "crm:${CRM_PORT:-8013}"
  )
  
  for service in "${erp_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动PLM服务
start_plm() {
  info "启动PLM服务..."

  local plm_services=(
    "rs:${RS_PORT:-8020}"
    "lims:${LIMS_PORT:-8022}"
    "pdm:${PDM_PORT:-8023}"
    "doc:${DOC_PORT:-8024}"
  )

  for service in "${plm_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动MES服务
start_mes() {
  info "启动MES服务..."
  
  local mes_services=(
    "mes:${MES_PORT:-8030}"
    "qms:${QMS_PORT:-8031}"
    "ehs:${EHS_PORT:-8032}"
  )
  
  for service in "${mes_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动SCM服务
start_scm() {
  info "启动SCM服务..."
  
  local scm_services=(
    "scm:${SCM_PORT:-8040}"
    "srm:${SRM_PORT:-8041}"
    "wms:${WMS_PORT:-8042}"
  )
  
  for service in "${scm_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动基础设施服务
start_infra() {
  info "启动基础设施服务..."
  
  local infra_services=(
    "file:${FILE_PORT:-8050}"
    "mail:${MAIL_PORT:-8051}"
    "im:${IM_PORT:-8052}"
    "gis:${GIS_PORT:-8053}"
  )
  
  for service in "${infra_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动数据分析服务
start_analytics() {
  info "启动数据分析服务..."
  
  local analytics_services=(
    "bi:${BI_PORT:-8060}"
    "report:${REPORT_PORT:-8061}"
    "ai:${AI_PORT:-8062}"
  )
  
  for service in "${analytics_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动预留扩展服务
start_extension() {
  info "启动预留扩展服务..."
  
  local extension_services=(
    "mobile:${MOBILE_PORT:-8070}"
  )
  
  for service in "${extension_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动前端服务
start_frontend() {
  info "启动前端服务..."
  
  if lsof -Pi ":${WEB_PORT:-3000}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "端口 ${WEB_PORT:-3000} 已被占用，跳过前端服务"
    return
  fi
  
  cd "$PROJECT_ROOT/apps/web"
  npm run dev > "$PROJECT_ROOT/logs/web.log" 2>&1 &
  
  # 等待前端启动
  local attempts=0
  while [ $attempts -lt 30 ]; do
    if curl -s "http://localhost:${WEB_PORT:-3000}" >/dev/null 2>&1; then
      success "前端服务启动成功"
      return
    fi
    attempts=$((attempts + 1))
    sleep 2
  done
  
  warning "前端服务启动超时"
}

# 显示状态
show_status() {
  info "服务状态检查..."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              TOPEMS 服务状态                   "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # ========== 系统资源 ==========
  echo ""
  echo "🖥️  系统资源:"
  
  # CPU 使用率
  local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | tr -d '%')
  if [ -n "$cpu_usage" ]; then
    echo "   CPU: ${cpu_usage}%"
  fi
  
  # 内存使用情况
  local mem_info=$(sysctl -n hw.memsize 2>/dev/null)
  local mem_gb=$((mem_info / 1024 / 1024 / 1024))
  local mem_used=$(vm_stat | grep "Pages active" | awk '{print $3}' | tr -d '.')
  local mem_active=$(echo "scale=2; $mem_used * 4096 / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
  echo "   内存: ${mem_gb}GB 总计"
  
  # 磁盘使用情况
  local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
  local disk_total=$(df -h / | tail -1 | awk '{print $2}')
  echo "   磁盘: ${disk_usage}% 使用 (总计 ${disk_total})"
  
  # 系统负载
  local load_avg=$(uptime | awk -F'load averages:' '{print $2}' | xargs)
  echo "   负载: ${load_avg}"
  
  # ========== 数据库状态 ==========
  echo ""
  echo "📦 数据库:"
  if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
    echo "  ✅ PostgreSQL"
    # 显示数据库统计
    local db_size=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size('topems'));" 2>/dev/null | xargs)
    echo "     💾 数据库大小: $db_size"
    
    # 检查数据库迁移状态
    echo ""
    echo "  📋 数据库迁移状态:"

    # 检查所有模块的迁移状态
    # 格式: schema_name:display_name
    # 注意: 以下服务使用Rust原生迁移，启动时会自动创建表
    #   notification, flow, pdm, mobile
    local all_services=(
      "iam:IAM"
      "pm:PM"
      "portal:门户"
      "integration:集成"
      "erp:ERP"
      "hrm:HRM"
      "crm:CRM"
      "rs:研发"
      "lims:LIMS"
      "mes:MES"
      "qms:QMS"
      "ehs:EHS"
      "scm:SCM"
      "srm:SRM"
      "wms:WMS"
      "storage:文件"
      "mail:邮件"
      "im:IM"
      "gis:GIS"
      "bi:BI"
      "report:报表"
      "ai:AI"
      "doc_service:文档"
    )

    local migrated_count=0
    local total_count=0

    for service_info in "${all_services[@]}"; do
      local schema_name="${service_info%%:*}"
      local display_name="${service_info##*:}"
      local table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_schema) = LOWER('$schema_name');" 2>/dev/null | tr -d ' ')

      # BI 服务特殊处理：检查 bi schema 和 public schema 中的 BI 相关表
      if [ "$schema_name" = "bi" ]; then
        local bi_table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_schema) = 'bi' OR (table_schema = 'public' AND table_name IN ('data_sources', 'datasource_tables', 'datasource_fields', 'analysis_queries', 'analysis_results', 'analysis_history', 'saved_analysis_results', 'visualizations', 'visualization_data', 'dashboards', 'dashboard_widgets', 'report_templates', 'reports', 'report_data', 'report_schedules', 'audit_logs'));" 2>/dev/null | tr -d ' ')
        table_count=$bi_table_count
      fi

      ((total_count++))

      if [ -n "$table_count" ] && [ "$table_count" -gt 0 ]; then
        echo "     ✅ $display_name ($table_count 张表)"
        ((migrated_count++))
      else
        echo "     ❌ $display_name (未迁移)"
      fi
    done

    # Rust 原生迁移的服务
    echo ""
    echo "  🔧 Rust 原生迁移服务 (启动时自动创建):"
    for native_svc in "notification:通知" "flow:Flow" "pdm:PDM" "mobile:移动"; do
      local schema_name="${native_svc%%:*}"
      local display_name="${native_svc##*:}"
      local schema_exists=$(psql "$DATABASE_URL" -t -c "SELECT 1 FROM information_schema.schemata WHERE LOWER(schema_name) = LOWER('$schema_name');" 2>/dev/null | tr -d ' ')
      if [ -n "$schema_exists" ] && [ "$schema_exists" = "1" ]; then
        echo "     ✅ $display_name (schema 已创建)"
      else
        echo "     ⏳ $display_name (启动服务后创建)"
      fi
    done

    echo ""
    echo "     迁移进度: $migrated_count / $total_count 模块"
    
    # AI 向量数据
    local doc_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM ai.documents;" 2>/dev/null | tr -d ' ')
    local chunk_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM ai.document_chunks;" 2>/dev/null | tr -d ' ')
    if [ -n "$doc_count" ] && [ "$doc_count" != "" ]; then
      echo ""
      echo "     📊 AI 向量数据: $doc_count 文档 | $chunk_count 分块"
    fi
    
    # pgvector 扩展状态
    local has_vector=$(psql "$DATABASE_URL" -t -c "SELECT 1 FROM pg_extension WHERE extname = 'vector';" 2>/dev/null | tr -d ' ')
    if [ -n "$has_vector" ] && [ "$has_vector" = "1" ]; then
      echo ""
      echo "     🔢 pgvector: ✅ 已安装"
    else
      echo ""
      echo "     🔢 pgvector: ❌ 未安装 (AI 向量功能不可用)"
    fi
  else
    echo "  ❌ PostgreSQL"
  fi
  if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
    echo ""
    echo "  ✅ Redis"
    # Redis 内存使用
    local redis_mem=$(redis-cli -u "$REDIS_URL" info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    if [ -n "$redis_mem" ]; then
      echo "     💾 Redis内存: $redis_mem"
    fi
  else
    echo "  ❌ Redis"
  fi
  
  # AI/LLM 配置状态
  echo ""
  echo "🤖 AI/LLM 配置:"
  
  # 显示当前安装的模型
  local installed_models=$(curl -s http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[].name' 2>/dev/null || echo "")
  
  if [ -n "$installed_models" ]; then
    echo "   已安装模型:"
    echo "$installed_models" | while read -r model; do
      if [ -n "$model" ]; then
        echo "   • $model"
      fi
    done
  fi
  
  # LLM 提供商
  local llm_provider="🖥️ Ollama 本地"
  local llm_model="${OLLAMA_MODEL:-${OPENAI_MODEL:-qwen2.5:7b-instruct}}"
  local embedding_model="${EMBEDDING_MODEL:-nomic-embed-text}"
  local api_key_status="✅ 本地模式"
  
  if [ -n "${OPENAI_API_KEY}" ] && [ "${OPENAI_API_KEY}" != "" ]; then
    llm_provider="☁️ 云端 AI (OpenAI/通义等)"
    api_key_status="✅ 已配置"
  fi
  
  echo "   当前配置:"
  echo "   • 提供商: $llm_provider"
  echo "   • LLM (生成回答): $llm_model"
  echo "   • 嵌入 (向量搜索): $embedding_model"
  echo "   • API密钥: $api_key_status"
  
  # Ollama 状态
  local ollama_url="${OLLAMA_URL:-${OLLAMA_BASE_URL:-http://localhost:11434}}"
  if curl -s --connect-timeout 3 "$ollama_url/api/tags" >/dev/null 2>&1 || curl -s --connect-timeout 3 "$ollama_url/v1/models" >/dev/null 2>&1; then
    echo "   Ollama: ✅ 运行中 ($ollama_url)"
  else
    echo "   Ollama: ⚠️ 未运行 ($ollama_url)"
    echo "   💡 提示: 运行 'ollama serve' 启动本地AI"
  fi
  
  # ========== TOPEMS 服务资源统计 ==========
  echo ""
  echo "📊 TOPEMS 服务统计:"
  
  # 统计运行中的服务数量
  local total_services=27
  local running_services=0
  local services_list=""
  
  for port in 8000 8001 8002 8003 8004 8005 8010 8011 8012 8020 8022 8023 8024 8030 8031 8032 8040 8041 8042 8050 8051 8052 8053 8060 8061 8062 8070; do
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      ((running_services++))
    fi
  done
  
  # 计算内存使用（所有 topems 服务）
  local service_mem=$(ps aux | grep "topems-" | grep -v grep | awk '{sum+=$6} END {printf "%.1f MB", sum/1024}' 2>/dev/null || echo "N/A")
  
  echo "   运行服务: $running_services / $total_services"
  echo "   服务内存: $service_mem"
  
  # 计算前端
  if lsof -Pi ":3000" -sTCP:LISTEN -t >/dev/null 2>&1; then
    local frontend_mem=$(ps aux | grep "node.*vite" | grep -v grep | awk '{sum+=$6} END {if(NR>0) printf "%.1f MB", sum/1024; else print "N/A"}' 2>/dev/null || echo "N/A")
    echo "   前端内存: $frontend_mem"
  fi
  
  # 服务状态
  local services=(
    "核心服务:iam:${IAM_PORT:-8000}"
    "核心服务:pm:${PM_PORT:-8001}"
    "核心服务:notification:${NOTIFICATION_PORT:-8002}"
    "核心服务:portal:${PORTAL_PORT:-8003}"
    "核心服务:flow:${FLOW_PORT:-8004}"
    "核心服务:integration:${INTEGRATION_PORT:-8005}"
    "ERP服务:erp:${ERP_PORT:-8010}"
    "ERP服务:hrm:${HRM_PORT:-8011}"
    "ERP服务:crm:${CRM_PORT:-8012}"
    "PLM服务:rs:${RS_PORT:-8020}"
    "PLM服务:lims:${LIMS_PORT:-8022}"
    "PLM服务:pdm:${PDM_PORT:-8023}"
    "PLM服务:doc:${DOC_PORT:-8024}"
    "MES服务:mes:${MES_PORT:-8030}"
    "MES服务:qms:${QMS_PORT:-8031}"
    "MES服务:ehs:${EHS_PORT:-8032}"
    "SCM服务:scm:${SCM_PORT:-8040}"
    "SCM服务:srm:${SRM_PORT:-8041}"
    "SCM服务:wms:${WMS_PORT:-8042}"
    "基础设施服务:file:${FILE_PORT:-8050}"
    "基础设施服务:mail:${MAIL_PORT:-8051}"
    "基础设施服务:im:${IM_PORT:-8052}"
    "基础设施服务:gis:${GIS_PORT:-8053}"
    "数据分析服务:bi:${BI_PORT:-8060}"
    "数据分析服务:report:${REPORT_PORT:-8061}"
    "数据分析服务:ai:${AI_PORT:-8062}"
    "扩展服务:mobile:${MOBILE_PORT:-8070}"
  )
  
  local current_module=""
  for service in "${services[@]}"; do
    module=$(echo "$service" | cut -d':' -f1)
    name=$(echo "$service" | cut -d':' -f2)
    port=$(echo "$service" | cut -d':' -f3)
    
    if [ "$module" != "$current_module" ]; then
      echo ""
      echo "$module:"
      current_module="$module"
    fi
    
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      response=$(curl -s --connect-timeout 3 "http://localhost:$port/health" 2>/dev/null)
      if [ $? -eq 0 ] && [ -n "$response" ]; then
        if echo "$response" | grep -qE '"status"|"healthy"|"success"|"degraded"'; then
          echo "  ✅ $name (端口 $port)"
        else
          echo "  ⚠️ $name (端口 $port)"
        fi
      else
        echo "  ⚠️ $name (端口 $port)"
      fi
    else
      echo "  ❌ $name (端口 $port)"
    fi
  done
  
  # 前端状态
  echo ""
  echo "🌐 前端服务:"
  if lsof -Pi ":${WEB_PORT:-3000}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ✅ Frontend (端口 ${WEB_PORT:-3000})"
  else
    echo "  ❌ Frontend"
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 重要提示
  if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo ""
    echo "💡 Ollama 未运行，AI 功能将受限:"
    echo "   • 启动 Ollama: ollama serve"
    echo "   • 查看模型: ollama list"
    echo "   • 安装模型: ollama pull qwen2.5:7b-instruct"
  fi
  
  # 检查数据库迁移状态（只检查有SQL迁移文件的服务）
  local missing_migrations=""
  # 定义有SQL迁移文件的服务（使用Rust原生迁移的服务不包含在此列表中）
  local services_with_migrations=(
    "iam:svc/iam"
    "pm:svc/pm"
    "portal:svc/portal"
    "integration:svc/integration"
    "erp:svc/erp"
    "hrm:svc/hrm"
    "crm:svc/crm"
    "rs:svc/rs"
    "lims:svc/lims"
    "mes:svc/mes"
    "qms:svc/qms"
    "ehs:svc/ehs"
    "scm:svc/scm"
    "srm:svc/srm"
    "wms:svc/wms"
    "storage:svc/file"
    "mail:svc/mail"
    "im:svc/im"
    "gis:svc/gis"
    "bi:svc/bi"
    "report:svc/report"
    "ai:svc/ai"
    "doc_service:svc/doc"
  )
  # 注意：以下服务使用Rust原生迁移，不在此列表中：
  # notification, flow, pdm, mobile
  # 这些服务会在启动时自动创建表

  for service_info in "${services_with_migrations[@]}"; do
    local svc_name="${service_info%%:*}"
    local svc_path="${service_info##*:}"
    local table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$svc_name';" 2>/dev/null | tr -d ' ')

    # 只检查有SQL迁移文件但未运行的服务（包括 src/db/migrations/ 子目录）
    if [ -z "$table_count" ] || [ "$table_count" = "0" ] || [ "$table_count" = "" ]; then
      local has_migrations=false
      if [ -d "$PROJECT_ROOT/$svc_path/migrations" ] && [ "$(ls -A "$PROJECT_ROOT/$svc_path/migrations" 2>/dev/null | wc -l)" -gt 0 ]; then
        has_migrations=true
      elif [ -d "$PROJECT_ROOT/$svc_path/src/db/migrations" ] && [ "$(ls -A "$PROJECT_ROOT/$svc_path/src/db/migrations" 2>/dev/null | wc -l)" -gt 0 ]; then
        has_migrations=true
      fi
      if [ "$has_migrations" = true ]; then
        missing_migrations="$missing_migrations $svc_name"
      fi
    fi
  done

  if [ -n "$missing_migrations" ]; then
    echo ""
    echo "⚠️  数据库迁移未完成:$missing_migrations"
    echo "   • 启动时将自动运行迁移"
  fi
}

# 主入口
case "$1" in
  start)
    load_config
    check_required_tools
    check_database
    check_ollama
    start_core
    start_erp
    start_plm
    start_mes
    start_scm
    start_infra
    start_analytics
    start_extension
    start_frontend
    show_status
    ;;
  start-core)
    load_config
    check_required_tools
    check_database
    start_core
    show_status
    ;;
  start-backend)
    load_config
    check_required_tools
    check_database
    start_core
    start_erp
    start_plm
    start_mes
    start_scm
    start_infra
    start_analytics
    start_extension
    show_status
    ;;
  start-service)
    if [ -z "$2" ] || [ -z "$3" ]; then
      error "缺少参数"
      echo "使用方法: $0 start-service <服务名> <端口>"
      exit 1
    fi
    load_config
    check_required_tools
    start_service "$2" "$3"
    ;;
  start-frontend)
    load_config
    check_required_tools
    start_frontend
    show_status
    ;;
  stop)
    stop_all
    ;;
  status)
    load_config
    check_required_tools
    show_status
    ;;
  restart)
    stop_all
    "$0" start
    ;;
  *)
    echo "使用方法: $0 {start|start-core|start-backend|start-frontend|stop|status|restart}"
    echo ""
    echo "命令说明:"
    echo "  start           - 启动所有服务（数据库+后端+前端）"
    echo "  start-core      - 仅启动核心服务"
    echo "  start-backend   - 启动所有后端服务"
    echo "  start-frontend  - 仅启动前端服务"
    echo "  stop            - 停止所有服务"
    echo "  status          - 查看服务状态"
    echo "  restart         - 重启所有服务"
    exit 1
    ;;
esac