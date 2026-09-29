#!/bin/bash
# shellcheck disable=SC2034
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
DRY_RUN=false

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TOPEMS Update Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get script directory (project root)
# update.sh 位于 scripts/deploy/，仓库根 = 上移两级（此前 /.. 会落到 scripts/，
# 导致 cargo build 在错误目录执行、二进制路径判断失效——部署路径缺陷）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${SCRIPT_DIR}"

# 命令执行包装：--dry-run 下仅打印，不实际执行（用于无生产环境的预演验证）
run() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "\033[1;33m[dry-run]\033[0m $*"
    else
        "$@"
    fi
}

# Pull latest code if version specified
if [[ -n "$VERSION" ]]; then
    echo -e "${YELLOW}Updating to version: ${VERSION}${NC}"
    git fetch origin
    git checkout "$VERSION"
    git pull origin "$VERSION"
fi

# Build backend
echo -e "${YELLOW}Building backend services...${NC}"
# dry-run 预演模式跳过构建（构建非破坏性动作，干跑只验证部署动作流）
if [[ "$DRY_RUN" != "true" ]]; then
    cargo build --release
else
    echo -e "${YELLOW}[dry-run]${NC} 跳过 cargo build --release"
fi

# Determine which services to update
# unified-core 包含: IAM + Doc + Flow + File + Communication + Tenant + Billing + AI + Monitor
ALL_SERVICES=(
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

if [[ -n "$SERVICES" ]]; then
    IFS=',' read -r -a UPDATE_SERVICES <<< "$SERVICES" || true
else
    UPDATE_SERVICES=("${ALL_SERVICES[@]}")
fi

# Update binaries
echo -e "${YELLOW}Updating service binaries...${NC}"

for svc in "${UPDATE_SERVICES[@]}"; do
    if [[ -f "target/release/${svc}" ]]; then
        run systemctl stop "topems-${svc}.service" 2>/dev/null || true
        run cp "target/release/${svc}" "${PREFIX}/bin/${svc}-service"
        run chmod +x "${PREFIX}/bin/${svc}-service"
        echo -e "${GREEN}✓ Updated ${svc}-service${NC}"
        if [[ "$RESTART" == true ]]; then
            run systemctl start "topems-${svc}.service"
            echo -e "${GREEN}✓ Started ${svc}-service${NC}"
        fi
    elif [[ -f "target/release/topems-${svc}" ]]; then
        run systemctl stop "topems-${svc}.service" 2>/dev/null || true
        run cp "target/release/topems-${svc}" "${PREFIX}/bin/${svc}-service"
        run chmod +x "${PREFIX}/bin/${svc}-service"
        echo -e "${GREEN}✓ Updated ${svc}-service${NC}"
        if [[ "$RESTART" == true ]]; then
            run systemctl start "topems-${svc}.service"
            echo -e "${GREEN}✓ Started ${svc}-service${NC}"
        fi
    elif [[ -f "target/release/topems-unified-core" && "$svc" == "unified-core" ]]; then
        run systemctl stop "topems-unified-core.service" 2>/dev/null || true
        run cp "target/release/topems-unified-core" "${PREFIX}/bin/topems-unified-core"
        run chmod +x "${PREFIX}/bin/topems-unified-core"
        echo -e "${GREEN}✓ Updated topems-unified-core${NC}"
        if [[ "$RESTART" == true ]]; then
            run systemctl start "topems-unified-core.service"
            echo -e "${GREEN}✓ Started topems-unified-core${NC}"
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

    run mkdir -p "${PREFIX}/web"
    run cp -r dist/* "${PREFIX}/web/"

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