#!/bin/bash
#
# TOPEMS Update Script
# Updates TOPEMS services with new binaries
#
# Usage: ./update.sh [OPTIONS]
# Options:
#   --version VERSION   Update to specific version/branch
#   --services SVC      Update specific services only (comma-separated)
#   --restart           Restart services after update
#   --skip-frontend     Skip frontend update
#

set -e

PREFIX="/opt/topems"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERSION=""
SERVICES=""
RESTART=false
SKIP_FRONTEND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            VERSION="$2"
            shift 2
            ;;
        --services)
            SERVICES="$2"
            shift 2
            ;;
        --restart)
            RESTART=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TOPEMS Update Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${SCRIPT_DIR}"

# Pull latest code if version specified
if [[ -n "$VERSION" ]]; then
    echo -e "${YELLOW}Updating to version: ${VERSION}${NC}"
    git fetch origin
    git checkout "$VERSION"
    git pull origin "$VERSION"
fi

# Build backend
echo -e "${YELLOW}Building backend services...${NC}"
cargo build --release

# Determine which services to update
ALL_SERVICES=(
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

if [[ -n "$SERVICES" ]]; then
    UPDATE_SERVICES=(${SERVICES//,/ })
else
    UPDATE_SERVICES=("${ALL_SERVICES[@]}")
fi

# Update binaries
echo -e "${YELLOW}Updating service binaries...${NC}"

for svc in "${UPDATE_SERVICES[@]}"; do
    if [[ -f "target/release/${svc}" ]]; then
        # Stop service before update
        systemctl stop "topems-${svc}.service" 2>/dev/null || true

        cp "target/release/${svc}" "${PREFIX}/bin/${svc}-service"
        chmod +x "${PREFIX}/bin/${svc}-service"

        echo -e "${GREEN}✓ Updated ${svc}-service${NC}"

        # Start service if restart flag set
        if [[ "$RESTART" == true ]]; then
            systemctl start "topems-${svc}.service"
            echo -e "${GREEN}✓ Started ${svc}-service${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Binary for ${svc} not found${NC}"
    fi
done

# Update frontend
if [[ "$SKIP_FRONTEND" == false ]]; then
    echo -e "${YELLOW}Building frontend...${NC}"

    cd "${SCRIPT_DIR}/apps/web"
    npm install
    npm run build

    # Backup old frontend
    if [[ -d "${PREFIX}/web" ]]; then
        mv "${PREFIX}/web" "${PREFIX}/web.backup.$(date +%Y%m%d%H%M%S)"
    fi

    mkdir -p "${PREFIX}/web"
    cp -r dist/* "${PREFIX}/web/"

    echo -e "${GREEN}✓ Frontend updated${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Update completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [[ "$RESTART" == false ]]; then
    echo -e "${YELLOW}Services are stopped. To restart:${NC}"
    echo "  systemctl start topems.target"
    echo ""
fi