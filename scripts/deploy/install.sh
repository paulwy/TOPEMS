#!/bin/bash
#
# TOPEMS Installation Script
# Installs TOPEMS services on a Linux server (non-Docker deployment)
#
# Usage: ./install.sh [OPTIONS]
# Options:
#   --prefix DIR     Installation directory (default: /opt/topems)
#   --user USER      Service user (default: topems)
#   --skip-build     Skip building binaries (use existing)
#   --dev            Development mode installation
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PREFIX="/opt/topems"
SERVICE_USER="topems"
SKIP_BUILD=false
DEV_MODE=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prefix)
            PREFIX="$2"
            shift 2
            ;;
        --user)
            SERVICE_USER="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# 项目根目录（绝对路径，脚本开头单次解析：BASH_SOURCE 相对路径只能在
# 未发生任何 cd 前可靠解析；后续 PWD 变化不影响本值）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TOPEMS Installation Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Installation directory: ${GREEN}${PREFIX}${NC}"
echo -e "Service user: ${GREEN}${SERVICE_USER}${NC}"
echo -e "Development mode: ${GREEN}${DEV_MODE}${NC}"
echo ""

# Check if running as root（--dry-run 预演模式豁免 root 检查：仅打印将执行的动作）
if [[ $EUID -ne 0 ]] && [[ "$DRY_RUN" != "true" ]]; then
    echo -e "${RED}This script must be run as root${NC}"
    exit 1
fi

# 命令执行包装：--dry-run 下仅打印，不实际执行（用于无生产环境的预演验证）
run() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}[dry-run]${NC} $*"
    else
        "$@"
    fi
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Rust
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Rust/Cargo is not installed. Please install Rust first:${NC}"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi
echo -e "${GREEN}✓ Rust/Cargo found${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ PostgreSQL client not found. Please ensure PostgreSQL server is installed.${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL client found${NC}"
fi

# Check Redis (optional)
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠ Redis not found. Some features may not work.${NC}"
else
    echo -e "${GREEN}✓ Redis found${NC}"
fi

# Check Node.js (for frontend)
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first:${NC}"
    echo "  https://nodejs.org/en/download/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

echo ""

# Create directories
echo -e "${YELLOW}Creating directory structure...${NC}"

run mkdir -p "${PREFIX}/bin"
run mkdir -p "${PREFIX}/svc"
run mkdir -p "${PREFIX}/config"
run mkdir -p "${PREFIX}/logs"
run mkdir -p "${PREFIX}/data"
run mkdir -p "${PREFIX}/lib"

# Create service user if not exists
if ! id "${SERVICE_USER}" &>/dev/null; then
    echo -e "${YELLOW}Creating service user: ${SERVICE_USER}${NC}"
    run useradd -r -s /bin/false -d "${PREFIX}" "${SERVICE_USER}"
fi

# Set permissions
run chown -R "${SERVICE_USER}:${SERVICE_USER}" "${PREFIX}"
run chmod -R 755 "${PREFIX}"
run chmod 700 "${PREFIX}/config"

echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Build backend services
    if [[ "$SKIP_BUILD" == false ]]; then
        echo -e "${YELLOW}Building backend services...${NC}"

        # Get script directory (project root)

        cd "${SCRIPT_DIR}"

        # Build release binaries
        cargo build --release

        # Copy binaries to installation directory
        # unified-core 包含: IAM + Doc + Flow + File + Communication + Tenant + Billing + AI + Monitor
        SERVICES=(
            "unified-core"
            "ai"
            "analytics"
            "hrm"
            "crm"
            "pm"
            "erp"
            "finance"
            "gis"
            "mes"
            "pdm"
            "qms"
            "lims"
            "ehs"
            "scm"
            "wms"
            "srm"
            "rd"
            "bi"
            "mobile"
            "portal"
            "integration"
        )

        for svc in "${SERVICES[@]}"; do
            if [[ -f "target/release/${svc}" ]]; then
                cp "target/release/${svc}" "${PREFIX}/bin/${svc}-service"
                echo -e "${GREEN}✓ Installed ${svc}-service${NC}"
            elif [[ -f "target/release/topems-${svc}" ]]; then
                cp "target/release/topems-${svc}" "${PREFIX}/bin/${svc}-service"
                echo -e "${GREEN}✓ Installed ${svc}-service${NC}"
            elif [[ -f "target/release/topems-unified-core" && "$svc" == "unified-core" ]]; then
                cp "target/release/topems-unified-core" "${PREFIX}/bin/topems-unified-core"
                echo -e "${GREEN}✓ Installed topems-unified-core${NC}"
            else
                echo -e "${YELLOW}⚠ Binary for ${svc} not found, skipping${NC}"
            fi
        done

        chmod +x "${PREFIX}/bin/*"
    fi

echo ""

# Build shared packages
echo -e "${YELLOW}Building shared packages...${NC}"

# 复用首处 SCRIPT_DIR（绝对路径，不依赖当前 PWD）

cd "${SCRIPT_DIR}/packages/shared-types"
pnpm install
pnpm run build

cd "${SCRIPT_DIR}/packages/shared-utils"
pnpm install
pnpm run build

echo -e "${GREEN}✓ Shared packages built${NC}"
echo ""

# Build Host Shell (web)
# （注：apps/core Remote Module 已并入 apps/web（V83/V84 构建层根治），
#  无独立 core 构建/部署步骤，core-remote 目录同步移除）
echo -e "${YELLOW}Building Host Shell (web)...${NC}"

cd "${SCRIPT_DIR}/apps/web"
pnpm install
pnpm run build

run mkdir -p "${PREFIX}/web"
run cp -r dist/* "${PREFIX}/web/"

echo -e "${GREEN}✓ Host Shell built and installed${NC}"
echo ""

# Copy configuration templates
echo -e "${YELLOW}Copying configuration templates...${NC}"


# Copy systemd service files
run cp -r "${SCRIPT_DIR}/deploy/systemd"/*.service /etc/systemd/system/
run cp "${SCRIPT_DIR}/deploy/systemd/topems.target" /etc/systemd/system/

# Reload systemd
run systemctl daemon-reload

echo -e "${GREEN}✓ Systemd services installed${NC}"

# Copy environment templates
run cp "${SCRIPT_DIR}/deploy/env/.env.production.template" "${PREFIX}/config/.env.template"
run cp "${SCRIPT_DIR}/.env.example" "${PREFIX}/config/.env.example"

echo -e "${GREEN}✓ Configuration templates copied${NC}"
echo ""

# Enable services
echo -e "${YELLOW}Enabling services...${NC}"

run systemctl enable topems.target

echo -e "${GREEN}✓ Services enabled${NC}"
echo ""

# Print summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Installation completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   ${PREFIX}/config/.env"
echo ""
echo "2. Initialize database:"
echo "   ${PREFIX}/bin/topems-unified-core --init-db"
echo ""
echo "3. Start services:"
echo "   systemctl start topems.target"
echo ""
echo "4. Check service status:"
echo "   systemctl status topems.target"
echo ""
echo "5. View logs:"
echo "   journalctl -u topems-unified-core -f"
echo ""
echo -e "${YELLOW}For production deployment, please review:${NC}"
echo "   - PostgreSQL configuration"
echo "   - Redis configuration (optional)"
echo "   - Nginx reverse proxy setup"
echo "   - Firewall rules"
echo ""