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
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TOPEMS Installation Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Installation directory: ${GREEN}${PREFIX}${NC}"
echo -e "Service user: ${GREEN}${SERVICE_USER}${NC}"
echo -e "Development mode: ${GREEN}${DEV_MODE}${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}This script must be run as root${NC}"
    exit 1
fi

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

mkdir -p "${PREFIX}/bin"
mkdir -p "${PREFIX}/svc"
mkdir -p "${PREFIX}/config"
mkdir -p "${PREFIX}/logs"
mkdir -p "${PREFIX}/data"
mkdir -p "${PREFIX}/lib"

# Create service user if not exists
if ! id "${SERVICE_USER}" &>/dev/null; then
    echo -e "${YELLOW}Creating service user: ${SERVICE_USER}${NC}"
    useradd -r -s /bin/false -d "${PREFIX}" "${SERVICE_USER}"
fi

# Set permissions
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${PREFIX}"
chmod -R 755 "${PREFIX}"
chmod 700 "${PREFIX}/config"

echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Build backend services
if [[ "$SKIP_BUILD" == false ]]; then
    echo -e "${YELLOW}Building backend services...${NC}"

    # Get script directory (project root)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

    cd "${SCRIPT_DIR}"

    # Build release binaries
    cargo build --release

    # Copy binaries to installation directory
    SERVICES=(
        "unified-core"
        "ai"
        "analytics"
        "manufacturing"
        "quality-assurance"
        "hrm"
        "crm"
        "pm"
        "erp"
        "gis"
        "rs"
        "scm"
        "wms"
        "mobile"
        "monitor"
        "portal"
    )

    for svc in "${SERVICES[@]}"; do
        if [[ -f "target/release/${svc}" ]]; then
            cp "target/release/${svc}" "${PREFIX}/bin/${svc}-service"
            echo -e "${GREEN}✓ Installed ${svc}-service${NC}"
        elif [[ -f "target/release/topems-${svc}" ]]; then
            cp "target/release/topems-${svc}" "${PREFIX}/bin/${svc}-service"
            echo -e "${GREEN}✓ Installed ${svc}-service${NC}"
        else
            echo -e "${YELLOW}⚠ Binary for ${svc} not found, skipping${NC}"
        fi
    done

    chmod +x "${PREFIX}/bin/*"
fi

echo ""

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${SCRIPT_DIR}/apps/web"

npm install
npm run build

# Copy frontend dist
mkdir -p "${PREFIX}/web"
cp -r dist/* "${PREFIX}/web/"

echo -e "${GREEN}✓ Frontend built and installed${NC}"
echo ""

# Copy configuration templates
echo -e "${YELLOW}Copying configuration templates...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Copy systemd service files
cp -r "${SCRIPT_DIR}/deploy/systemd"/*.service /etc/systemd/system/
cp "${SCRIPT_DIR}/deploy/systemd/topems.target" /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

echo -e "${GREEN}✓ Systemd services installed${NC}"

# Copy environment templates
cp "${SCRIPT_DIR}/deploy/env/.env.production.template" "${PREFIX}/config/.env.template"
cp "${SCRIPT_DIR}/.env.example" "${PREFIX}/config/.env.example"

echo -e "${GREEN}✓ Configuration templates copied${NC}"
echo ""

# Enable services
echo -e "${YELLOW}Enabling services...${NC}"

systemctl enable topems.target

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
echo "   ${PREFIX}/bin/unified-core-service --init-db"
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