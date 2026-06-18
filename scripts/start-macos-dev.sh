#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

info "========================================="
info "TOPEMS macOS Development Environment"
info "========================================="
echo ""

check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 is not installed. Please install it first."
        echo "  Installation: $2"
        return 1
    fi
    return 0
}

info "Checking prerequisites..."

check_command "cargo" "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh" || exit 1
check_command "node" "brew install node" || exit 1
check_command "pnpm" "brew install pnpm" || exit 1
check_command "psql" "brew install postgresql@16" || exit 1

success "All prerequisites installed"
echo ""

info "Checking PostgreSQL..."
if ! psql -h localhost -U "$USER" -d "postgres" -c "SELECT 1;" &> /dev/null; then
    warning "PostgreSQL is not running or not configured"
    info "Starting PostgreSQL..."
    brew services start postgresql@16
    sleep 3
    
    info "Creating database..."
    createdb topems 2>/dev/null || true
    
    info "Checking pgvector extension..."
    psql -h localhost -U "$USER" -d topems -c "CREATE EXTENSION IF NOT EXISTS vector;" &> /dev/null || \
        warning "pgvector not available. AI features may not work."
else
    success "PostgreSQL is running"
fi

echo ""

info "Checking Redis..."
if ! redis-cli ping &> /dev/null; then
    warning "Redis is not running"
    info "Starting Redis..."
    brew services start redis
    sleep 2
else
    success "Redis is running"
fi

echo ""

info "Checking environment variables..."
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    warning ".env file not found, copying from example..."
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    
    info "Generating JWT secrets..."
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$PROJECT_ROOT/.env"
    sed -i.bak "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" "$PROJECT_ROOT/.env"
    rm "$PROJECT_ROOT/.env.bak"
    
    success "Environment variables configured"
else
    success ".env file exists"
fi

echo ""

info "Building shared packages..."
cd "$PROJECT_ROOT/packages/shared-types"
if [[ ! -d "dist" ]]; then
    info "Building shared-types..."
    pnpm install --silent
    pnpm run build --silent
    success "shared-types built"
else
    success "shared-types already built"
fi

cd "$PROJECT_ROOT/packages/shared-utils"
if [[ ! -d "dist" ]]; then
    info "Building shared-utils..."
    pnpm install --silent
    pnpm run build --silent
    success "shared-utils built"
else
    success "shared-utils already built"
fi

echo ""

info "Starting development services..."
echo ""

start_service() {
    local svc_name="$1"
    local svc_dir="$2"
    local port="$3"
    
    if lsof -Pi ":$port" -sTCP:LISTEN -t &> /dev/null; then
        warning "$svc_name is already running on port $port"
        return
    fi
    
    info "Starting $svc_name (port $port)..."
    cd "$PROJECT_ROOT/$svc_dir"
    nohup cargo run > "/tmp/topems-${svc_name}.log" 2>&1 &
    local pid=$!
    echo "$pid" > "/tmp/topems-${svc_name}.pid"
    
    for i in {1..30}; do
        if curl -s "http://localhost:$port/health" &> /dev/null; then
            success "$svc_name started (PID: $pid)"
            return
        fi
        sleep 1
    done
    
    warning "$svc_name startup timeout. Check logs: /tmp/topems-${svc_name}.log"
}

start_service "unified-core" "svc/unified-core" "8001"

echo ""

info "Starting frontend services..."
echo ""

start_frontend() {
    local app_name="$1"
    local app_dir="$2"
    local port="$3"
    local script="$4"
    
    if lsof -Pi ":$port" -sTCP:LISTEN -t &> /dev/null; then
        warning "$app_name is already running on port $port"
        return
    fi
    
    info "Starting $app_name (port $port)..."
    cd "$PROJECT_ROOT/$app_dir"
    
    if [[ ! -d "node_modules" ]]; then
        info "Installing dependencies..."
        pnpm install --silent
    fi
    
    nohup pnpm run "$script" > "/tmp/topems-${app_name}.log" 2>&1 &
    local pid=$!
    echo "$pid" > "/tmp/topems-${app_name}.pid"
    
    sleep 5
    
    if lsof -Pi ":$port" -sTCP:LISTEN -t &> /dev/null; then
        success "$app_name started (PID: $pid)"
    else
        warning "$app_name may not have started yet. Check logs: /tmp/topems-${app_name}.log"
    fi
}

start_frontend "core-remote" "apps/core" "3001" "dev:watch"
start_frontend "web-shell" "apps/web" "3000" "dev"

echo ""
info "========================================="
success "Development environment started!"
info "========================================="
echo ""
echo "Services running:"
echo ""
echo "  ${GREEN}●${NC} Unified Core:      http://localhost:8001"
echo "  ${GREEN}●${NC} Core Remote:       http://localhost:3001"
echo "  ${GREEN}●${NC} Web Shell:         http://localhost:3000"
echo ""
echo "To stop all services:"
echo "  ./scripts/stop-all.sh"
echo ""
echo "To view logs:"
echo "  tail -f /tmp/topems-unified-core.log"
echo "  tail -f /tmp/topems-web-shell.log"
echo ""
echo "Default credentials:"
echo "  Admin: admin@topems.local /