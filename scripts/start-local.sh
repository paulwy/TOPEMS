#!/bin/bash

# TOPEMS 本地启动脚本
# 自动检测数据库环境并启动核心服务：IAM + HRM + Mail

set -e

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ollama 配置
OLLAMA_PORT=11434

# 数据库配置
DB_USER="topems"
DB_PASS="topems_secret"
DB_NAME="topems"
LOCAL_USER="xingzhai"

# JWT 配置（必须设置，至少 32 字符）
JWT_SECRET="${JWT_SECRET:-topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256}"
REFRESH_SECRET="${REFRESH_SECRET:-topems-jwt-refresh-secret-key-must-be-at-least-32-characters-long}"

# 邮件 SMTP 配置
SMTP_HOST="${SMTP_HOST:-smtp.163.com}"
SMTP_PORT="${SMTP_PORT:-465}"
SMTP_USERNAME="${SMTP_USERNAME:-topmap@163.com}"
SMTP_PASSWORD="${SMTP_PASSWORD:-BMyf23ZqRburuhCv}"
SMTP_FROM_ADDRESS="${SMTP_FROM_ADDRESS:-topmap@163.com}"

# 核心服务列表（只需启动这些）
CORE_SERVICES=(
  "iam:8000"
  "hrm:8011"
  "mail:8054"
)

# 其他服务（可选启动）
OPTIONAL_SERVICES=(
  "doc:8001"
  "pm:8002"
  "notification:8003"
  "ai:8004"
  "file:8055"
)

# Mail 服务特殊配置
MAIL_DATABASE_URL="postgres://topems_dev:topems_dev@localhost:5432/postgres?options=-c%20search_path=mail,public"

# 检测数据库环境（优先本地）
detect_database_env() {
  echo -e "${YELLOW}📡 检测数据库环境...${NC}"

  # 优先检查本地 PostgreSQL（带 pgvector）
  if command -v psql &> /dev/null; then
    local has_pgvector=$(psql -U $LOCAL_USER -d postgres -c "SELECT 1 FROM pg_extension WHERE extname='vector';" 2>/dev/null | grep -c "1" || echo "0")
    if [ "$has_pgvector" = "1" ]; then
      echo -e "  ${GREEN}检测到: 本地 PostgreSQL (pgvector)${NC}"
      DATABASE_URL="postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
      DB_HOST="localhost"
      DB_PORT="5432"
      USE_PGVECTOR=true
      return 0
    fi
  fi

  # 检查 Docker PostgreSQL（带 pgvector）
  if docker ps 2>/dev/null | grep -q "topems-postgres"; then
    local has_pgvector=$(docker exec topems-postgres psql -U topems -d topems -c "SELECT 1 FROM pg_extension WHERE extname='vector';" 2>/dev/null | grep -c "1" || echo "0")
    if [ "$has_pgvector" = "1" ]; then
      echo -e "  ${GREEN}检测到: Docker PostgreSQL (pgvector)${NC}"
      DATABASE_URL="postgres://topems:topems@host.docker.internal:5432/topems"
      DB_HOST="host.docker.internal"
      DB_PORT="5432"
      USE_PGVECTOR=true
      return 0
    fi
  fi

  # 检查本地 PostgreSQL（无 pgvector）
  if command -v psql &> /dev/null; then
    echo -e "  ${YELLOW}检测到: 本地 PostgreSQL${NC}"
    DATABASE_URL="postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
    DB_HOST="localhost"
    DB_PORT="5432"
    USE_PGVECTOR=false
    return 0
  fi

  # 检查 Docker PostgreSQL（无 pgvector）
  if docker ps 2>/dev/null | grep -q "topems-postgres"; then
    echo -e "  ${YELLOW}检测到: Docker PostgreSQL${NC}"
    DATABASE_URL="postgres://topems:topems@host.docker.internal:5432/topems"
    DB_HOST="host.docker.internal"
    DB_PORT="5432"
    USE_PGVECTOR=false
    return 0
  fi

  echo -e "${RED}❌ 未检测到 PostgreSQL${NC}"
  return 1
}

# 初始化数据库
init_database() {
  echo -e "${YELLOW}🗄️  初始化数据库...${NC}"

  if [ "$DB_HOST" = "localhost" ]; then
    # 本地 PostgreSQL 初始化
    # 创建用户
    if ! psql -U $LOCAL_USER -d postgres -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';" 2>/dev/null | grep -q "1"; then
      echo "  创建数据库用户: $DB_USER"
      psql -U $LOCAL_USER -d postgres -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS' CREATEDB SUPERUSER;" 2>/dev/null || true
    fi

    # 创建数据库
    if ! psql -U $LOCAL_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" 2>/dev/null | grep -q "1"; then
      echo "  创建数据库: $DB_NAME"
      psql -U $LOCAL_USER -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
    fi

    # 启用 pgvector
    if [ "$USE_PGVECTOR" = "true" ]; then
      psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
    fi

    # 初始化表结构
    init_tables_local
  else
    # Docker PostgreSQL 初始化
    echo "  Docker PostgreSQL 使用 Docker 网络"
  fi

  echo -e "${GREEN}  ✅ 数据库初始化完成${NC}"
}

# 初始化表结构（本地）
init_tables_local() {
  # IAM 表
  psql -U $DB_USER -d $DB_NAME -c "
  CREATE SCHEMA IF NOT EXISTS iam;
  CREATE TABLE IF NOT EXISTS iam.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      full_name VARCHAR(255),
      is_superuser BOOLEAN DEFAULT false,
      last_login TIMESTAMPTZ,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMPTZ,
      roles TEXT[] DEFAULT '{}',
      permissions TEXT[] DEFAULT '{}',
      metadata JSONB DEFAULT '{}'
  );
  " 2>/dev/null || true

  # HRM 表（shared schema）
  psql -U $DB_USER -d $DB_NAME -c "
  CREATE SCHEMA IF NOT EXISTS shared;
  
  CREATE TABLE IF NOT EXISTS shared.employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      company_id UUID,
      department_id UUID,
      position_id UUID,
      employee_number VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      gender VARCHAR(20),
      birth_date DATE,
      hire_date DATE,
      position VARCHAR(100),
      job_title VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      emergency_contact_name VARCHAR(100),
      emergency_contact_phone VARCHAR(50),
      address TEXT,
      status VARCHAR(50) DEFAULT 'active',
      skills TEXT[],
      embedding_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS shared.departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      company_id UUID,
      parent_id UUID,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      manager_id UUID,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS shared.positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      department_id UUID,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      level INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS shared.organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      logo_url TEXT,
      contact_email VARCHAR(255),
      contact_phone VARCHAR(50),
      address TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS shared.companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      registration_number VARCHAR(100),
      legal_representative VARCHAR(100),
      contact_email VARCHAR(255),
      contact_phone VARCHAR(50),
      address TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  " 2>/dev/null || true

  # IAM 审计和会话表
  psql -U $DB_USER -d $DB_NAME -c "
  CREATE TABLE IF NOT EXISTS iam.audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(255),
      resource_id UUID,
      details JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS iam.refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS iam.sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      session_token VARCHAR(255) UNIQUE NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      last_active TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  " 2>/dev/null || true

  # 创建默认管理员
  local admin_exists=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM iam.users WHERE username='admin';" 2>/dev/null | tr -d ' ')
  if [ "$admin_exists" = "0" ]; then
    local password_hash='$2b$12$p4qq8nF9ctPz/ipKzUZPYuLIQiawskQ5q9HRGzIGxjlYEfaHUPlbq'
    psql -U $DB_USER -d $DB_NAME -c "
    INSERT INTO iam.users (username, password_hash, email, is_active, roles)
    VALUES ('admin', '$password_hash', 'admin@topems.local', true, ARRAY['admin', 'user']);
    " 2>/dev/null || true
  fi
}

# 停止服务函数
stop_service() {
  local name=$1
  local port=$2
  echo -e "${YELLOW}停止 ${name} (${port})...${NC}"
  lsof -ti :$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
}

# 停止所有服务
stop_all() {
  echo -e "\n${YELLOW}⏹️ 停止所有服务...${NC}"
  for service in "${CORE_SERVICES[@]}" "${OPTIONAL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    stop_service "$name" "$port"
  done
  echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 检查端口是否可用
check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    return 0  # 端口已被占用
  fi
  return 1  # 端口可用
}

# 检查服务健康状态
check_service_health() {
  local name=$1
  local port=$2
  local health_path=${3:-"/health"}

  if curl -sf "http://localhost:$port$health_path" > /dev/null 2>&1; then
    return 0
  fi
  return 1
}

# 启动服务（带重试）
start_service() {
  local name=$1
  local port=$2
  local service_dir="$PROJECT_ROOT/svc/$name"
  local max_retries=${3:-2}
  local retry_count=0

  if [ ! -d "$service_dir" ]; then
    echo -e "${RED}❌ 服务目录不存在: $service_dir${NC}"
    return 1
  fi

  if check_port $port; then
    echo -e "${YELLOW}⚠️  端口 $port 已被占用，跳过 $name${NC}"
    return 0
  fi

  echo -e "${BLUE}🚀 启动 $name (端口 $port)...${NC}"

  cd "$service_dir"

  # Mail 服务需要特殊配置
  if [ "$name" = "mail" ]; then
    DATABASE_URL="$DATABASE_URL" \
      JWT_SECRET="$JWT_SECRET" \
      REFRESH_SECRET="$REFRESH_SECRET" \
      SMTP_HOST="$SMTP_HOST" \
      SMTP_PORT="$SMTP_PORT" \
      SMTP_USERNAME="$SMTP_USERNAME" \
      SMTP_PASSWORD="$SMTP_PASSWORD" \
      SMTP_FROM_ADDRESS="$SMTP_FROM_ADDRESS" \
      RUST_LOG=info \
      cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
  # File 服务需要存储路径配置
  elif [ "$name" = "file" ]; then
    DATABASE_URL="$DATABASE_URL" \
      STORAGE_LOCAL_PATH="./storage/files" \
      SERVER_PORT=8055 \
      RUST_LOG=info \
      cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
  # AI 服务需要 File 服务 URL
  elif [ "$name" = "ai" ]; then
    DATABASE_URL="$DATABASE_URL" \
      FILE_SERVICE_URL="http://localhost:8055" \
      SERVER_PORT=8004 \
      RUST_LOG=info \
      cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
  else
    DATABASE_URL="$DATABASE_URL" \
      JWT_SECRET="$JWT_SECRET" \
      REFRESH_SECRET="$REFRESH_SECRET" \
      SERVER_PORT="$port" \
      RUST_LOG=info \
      cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
  fi

  local cargo_pid=$!

  cd - > /dev/null

  # 等待服务启动
  local attempt=1
  local max_attempts=30

  while [ $attempt -le $max_attempts ]; do
    if check_port $port; then
      echo -e "  ${GREEN}✓ $name 进程已启动 (PID: $cargo_pid)${NC}"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  # 重试逻辑
  while [ $retry_count -lt $max_retries ] && [ ! check_port $port ]; do
    retry_count=$((retry_count + 1))
    echo -e "  ${YELLOW}⚠️  $name 启动超时，尝试重试 ($retry_count/$max_retries)${NC}"

    # 杀死可能残留的进程
    lsof -ti :$port 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    sleep 2

    # 重新启动
    cd "$service_dir"
    if [ "$name" = "mail" ]; then
      DATABASE_URL="$DATABASE_URL" \
        JWT_SECRET="$JWT_SECRET" \
        REFRESH_SECRET="$REFRESH_SECRET" \
        SMTP_HOST="$SMTP_HOST" \
        SMTP_PORT="$SMTP_PORT" \
        SMTP_USERNAME="$SMTP_USERNAME" \
        SMTP_PASSWORD="$SMTP_PASSWORD" \
        SMTP_FROM_ADDRESS="$SMTP_FROM_ADDRESS" \
        RUST_LOG=info \
        cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
    elif [ "$name" = "file" ]; then
      DATABASE_URL="$DATABASE_URL" \
        STORAGE_LOCAL_PATH="./storage/files" \
        SERVER_PORT=8055 \
        RUST_LOG=info \
        cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
    elif [ "$name" = "ai" ]; then
      DATABASE_URL="$DATABASE_URL" \
        FILE_SERVICE_URL="http://localhost:8055" \
        SERVER_PORT=8004 \
        RUST_LOG=info \
        cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
    else
      DATABASE_URL="$DATABASE_URL" \
        JWT_SECRET="$JWT_SECRET" \
        REFRESH_SECRET="$REFRESH_SECRET" \
        SERVER_PORT="$port" \
        RUST_LOG=info \
        cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
    fi
    cd - > /dev/null

    # 再次等待
    attempt=1
    while [ $attempt -le $max_attempts ]; do
      if check_port $port; then
        echo -e "  ${GREEN}✓ $name 重试成功 (PID: $!)${NC}"
        return 0
      fi
      sleep 1
      attempt=$((attempt + 1))
    done
  done

  echo -e "  ${RED}❌ $name 启动失败${NC}"
  echo -e "  ${YELLOW}查看日志: tail -f logs/$name.log${NC}"
  return 1
}

# 检查服务依赖
check_dependencies() {
  local deps_ok=true

  echo -e "\n${YELLOW}🔍 检查服务依赖...${NC}"

  # 检查 PostgreSQL
  echo -n "  PostgreSQL... "
  if command -v psql &> /dev/null && pg_isready -U $DB_USER -d $DB_NAME &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
  elif docker ps 2>/dev/null | grep -q "topems-postgres"; then
    echo -e "${GREEN}✓ (Docker)${NC}"
  else
    echo -e "${RED}✗${NC}"
    echo -e "    ${RED}错误: PostgreSQL 未运行${NC}"
    deps_ok=false
  fi

  # 检查 Redis
  echo -n "  Redis... "
  if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
  elif docker ps 2>/dev/null | grep -q "topems-redis"; then
    echo -e "${GREEN}✓ (Docker)${NC}"
  else
    echo -e "${YELLOW}⚠ (可选，用于缓存)${NC}"
  fi

  # 检查 Ollama
  echo -n "  Ollama... "
  if curl -sf http://localhost:$OLLAMA_PORT/api/tags &> /dev/null; then
    local ollama_model=$(curl -s http://localhost:$OLLAMA_PORT/api/tags 2>/dev/null | jq -r '.models[0].name // "未知"' 2>/dev/null || echo "未知")
    echo -e "${GREEN}✓ (模型: $ollama_model)${NC}"
  else
    echo -e "${YELLOW}⚠ (可选，用于 AI 功能)${NC}"
  fi

  if [ "$deps_ok" = false ]; then
    echo -e "\n${RED}❌ 依赖检查失败，请先启动必要的服务${NC}"
    return 1
  fi

  return 0
}

# 等待服务就绪
wait_for_service() {
  local name=$1
  local port=$2
  local max_attempts=${3:-30}
  local health_path=${4:-"/health"}

  echo -n "  等待 $name 就绪"
  for i in $(seq 1 $max_attempts); do
    if curl -sf "http://localhost:$port$health_path" > /dev/null 2>&1; then
      echo -e " - ${GREEN}✅${NC}"
      return 0
    fi
    echo -n "."
    sleep 1
  done
  echo -e " - ${RED}❌ 超时${NC}"
  return 1
}

# 主入口
case "$1" in
  stop)
    stop_all
    exit 0
    ;;
  status)
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "              服务状态                      "
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    for service in "${CORE_SERVICES[@]}"; do
      name=$(echo "$service" | cut -d':' -f1)
      port=$(echo "$service" | cut -d':' -f2)
      if check_port $port; then
        echo -e "  ✅ $name ($port)"
      else
        echo -e "  ❌ $name ($port) - 未运行"
      fi
    done
    # 显示 File 服务状态
    if check_port 8055; then
      echo -e "  ✅ file (8055)"
    else
      echo -e "  ❌ file (8055) - 未运行"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
    ;;
  "")
    # 启动核心服务
    ;;
  *)
    echo "用法: $0 {stop|status}"
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "      TOPEMS 核心服务启动脚本（本地）         "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 创建日志目录
mkdir -p "$PROJECT_ROOT/logs"

# 停止现有服务
echo -e "${YELLOW}📦 清理现有服务...${NC}"
for service in "${CORE_SERVICES[@]}"; do
  name=$(echo "$service" | cut -d':' -f1)
  port=$(echo "$service" | cut -d':' -f2)
  stop_service "$name" "$port"
done
sleep 1

echo ""
echo -e "${BLUE}🚀 启动核心服务...${NC}"
echo ""

# 检查依赖
check_dependencies || true

# 检测数据库环境
detect_database_env
echo ""

# 初始化数据库（如果需要）
if [ "$DB_HOST" = "localhost" ]; then
  init_database
  echo ""
fi

# 检查 Ollama
echo -e "${YELLOW}🤖 检查 Ollama AI 服务...${NC}"
if curl -sf "http://localhost:$OLLAMA_PORT/api/tags" > /dev/null 2>&1; then
  echo -e "  ${GREEN}✅ Ollama 已运行${NC}"
  MODEL_INFO=$(curl -s "http://localhost:$OLLAMA_PORT/api/tags" | jq -r '.models[0].name // "未知"' 2>/dev/null || echo "未知")
  echo -e "  模型: $MODEL_INFO"
else
  echo -e "  ${YELLOW}⚠️  Ollama 未运行${NC}"
  echo -e "  启动命令: ${BLUE}ollama serve${NC}"
  echo -e "  拉取模型: ${BLUE}ollama pull qwen2.5:7b-instruct${NC}"
fi
echo ""

# 先启动 IAM（核心依赖）
start_service "iam" "8000"

# 等待 IAM 就绪
wait_for_service "IAM" "8000" 30 "/health"

# 启动 HRM
start_service "hrm" "8011"

# 等待 HRM 就绪
wait_for_service "HRM" "8011" 30 "/health"

# 启动 Mail
start_service "mail" "8054"

# 等待 Mail 就绪
wait_for_service "Mail" "8054" 30 "/health"

# 启动 File
start_service "file" "8055"

# 等待 File 就绪
wait_for_service "File" "8055" 30 "/health"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "              服务状态                      "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

success=0
total=0

for service in "${CORE_SERVICES[@]}"; do
  name=$(echo "$service" | cut -d':' -f1)
  port=$(echo "$service" | cut -d':' -f2)
  total=$((total + 1))

  if check_port $port; then
    echo -e "  ✅ $name (http://localhost:$port)"
    success=$((success + 1))
  else
    echo -e "  ❌ $name (端口 $port)"
  fi
done

# 显示 File 服务状态
total=$((total + 1))
if check_port 8055; then
  echo -e "  ✅ file (http://localhost:8055)"
  success=$((success + 1))
else
  echo -e "  ❌ file (端口 8055)"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$success" -eq $total ]; then
  echo ""
echo -e "${GREEN}✅ 所有核心服务已成功启动！${NC}"
  echo ""
  echo "访问地址："
  echo "  - IAM:    http://localhost:8000"
  echo "  - HRM:    http://localhost:8011"
  echo "  - Mail:   http://localhost:8054"
  echo "  - File:   http://localhost:8055"
  echo "  - API:    http://localhost:8011/api/v1"
  echo "  - 文档:   http://localhost:8011/api-docs/openapi.json"
  echo "  - Ollama: http://localhost:$OLLAMA_PORT"
  echo ""
  echo "日志目录: $PROJECT_ROOT/logs"
  echo "  - iam.log, hrm.log, mail.log, file.log"
else
  echo -e "${YELLOW}⚠️  部分服务启动失败 ($success/$total)${NC}"
fi

echo ""
echo "💡 提示:"
echo "  - 运行 '$0 stop' 停止所有服务"
echo "  - 运行 '$0 status' 查看服务状态"
echo ""
