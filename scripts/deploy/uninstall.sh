#!/bin/bash
#
# TOPEMS Uninstallation Script
# Removes TOPEMS services from a Linux server
#
# Usage: ./uninstall.sh [OPTIONS]
# Options:
#   --keep-data     Keep data and logs
#   --keep-config   Keep configuration files
#   --force         Force uninstall without confirmation
#

set -e

PREFIX="/opt/topems"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

KEEP_DATA=false
KEEP_CONFIG=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-data)
            KEEP_DATA=true
            shift
            ;;
        --keep-config)
            KEEP_CONFIG=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${RED}TOPEMS Uninstallation Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}This script must be run as root${NC}"
    exit 1
fi

# Confirmation
if [[ "$FORCE" == false ]]; then
    echo -e "${YELLOW}This will remove TOPEMS from your system.${NC}"
    echo ""
    echo "Options:"
    echo "  Keep data: ${KEEP_DATA}"
    echo "  Keep config: ${KEEP_CONFIG}"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""

# Stop all services
echo -e "${YELLOW}Stopping all services...${NC}"
systemctl stop topems.target 2>/dev/null || true

# Disable services
echo -e "${YELLOW}Disabling services...${NC}"
systemctl disable topems.target 2>/dev/null || true

# Remove systemd files
echo -e "${YELLOW}Removing systemd service files...${NC}"

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
    rm -f "/etc/systemd/system/topems-${svc}.service"
done

rm -f "/etc/systemd/system/topems.target"

systemctl daemon-reload

echo -e "${GREEN}✓ Systemd files removed${NC}"

# Remove binaries
echo -e "${YELLOW}Removing binaries...${NC}"
rm -rf "${PREFIX:?PREFIX 未设置}/bin"

# Remove service directories
echo -e "${YELLOW}Removing service directories...${NC}"
rm -rf "${PREFIX}/svc"

# Remove web
echo -e "${YELLOW}Removing web frontend...${NC}"
rm -rf "${PREFIX}/web"

# Remove config (unless keep_config)
if [[ "$KEEP_CONFIG" == false ]]; then
    echo -e "${YELLOW}Removing configuration...${NC}"
    rm -rf "${PREFIX}/config"
else
    echo -e "${GREEN}✓ Configuration preserved${NC}"
fi

# Remove data (unless keep_data)
if [[ "$KEEP_DATA" == false ]]; then
    echo -e "${YELLOW}Removing data and logs...${NC}"
    rm -rf "${PREFIX}/data"
    rm -rf "${PREFIX}/logs"
else
    echo -e "${GREEN}✓ Data and logs preserved${NC}"
fi

# Remove lib
rm -rf "${PREFIX:?PREFIX 未设置}/lib"

# Remove user if home directory is empty
if [[ -d "${PREFIX}" ]]; then
    contents=$(ls -A "${PREFIX}" 2>/dev/null)
    if [[ -z "$contents" ]]; then
        rm -rf "${PREFIX}"
        echo -e "${GREEN}✓ Installation directory removed${NC}"
    fi
fi

# Remove service user
if id "topems" &>/dev/null; then
    userdel topems 2>/dev/null || true
    echo -e "${GREEN}✓ Service user removed${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Uninstallation completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [[ "$KEEP_DATA" == true || "$KEEP_CONFIG" == true ]]; then
    echo -e "${YELLOW}Preserved files:${NC}"
    [[ "$KEEP_DATA" == true ]] && echo "  - ${PREFIX}/data"
    [[ "$KEEP_DATA" == true ]] && echo "  - ${PREFIX}/logs"
    [[ "$KEEP_CONFIG" == true ]] && echo "  - ${PREFIX}/config"
    echo ""
fi