#!/bin/bash
#
# TOPEMS Service Management Script
# Manage TOPEMS services on a Linux server
#
# Usage: ./manage.sh <command> [service]
# Commands:
#   start       Start all services or specific service
#   stop        Stop all services or specific service
#   restart     Restart all services or specific service
#   status      Show status of all services or specific service
#   logs        Show logs of specific service
#   enable      Enable services at boot
#   disable     Disable services at boot
#   list        List all services
#

set -e

PREFIX="/opt/topems"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# All services
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

show_help() {
    echo "TOPEMS Service Management Script"
    echo ""
    echo "Usage: $0 <command> [service]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services or specific service"
    echo "  stop        Stop all services or specific service"
    echo "  restart     Restart all services or specific service"
    echo "  status      Show status of all services or specific service"
    echo "  logs        Show logs of specific service (follow mode)"
    echo "  enable      Enable services at boot"
    echo "  disable     Disable services at boot"
    echo "  list        List all services"
    echo ""
    echo "Services:"
    for svc in "${ALL_SERVICES[@]}"; do
        echo "  - ${svc}"
    done
    echo ""
}

check_service() {
    local svc="$1"
    if [[ ! " ${ALL_SERVICES[*]} " =~ " ${svc} " ]]; then
        echo -e "${RED}Unknown service: ${svc}${NC}"
        echo "Available services:"
        for s in "${ALL_SERVICES[@]}"; do
            echo "  - ${s}"
        done
        exit 1
    fi
}

start_services() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${YELLOW}Starting all TOPEMS services...${NC}"
        systemctl start topems.target
        echo -e "${GREEN}✓ All services started${NC}"
    else
        check_service "$svc"
        echo -e "${YELLOW}Starting topems-${svc}...${NC}"
        systemctl start "topems-${svc}.service"
        echo -e "${GREEN}✓ topems-${svc} started${NC}"
    fi
}

stop_services() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${YELLOW}Stopping all TOPEMS services...${NC}"
        systemctl stop topems.target
        echo -e "${GREEN}✓ All services stopped${NC}"
    else
        check_service "$svc"
        echo -e "${YELLOW}Stopping topems-${svc}...${NC}"
        systemctl stop "topems-${svc}.service"
        echo -e "${GREEN}✓ topems-${svc} stopped${NC}"
    fi
}

restart_services() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${YELLOW}Restarting all TOPEMS services...${NC}"
        systemctl restart topems.target
        echo -e "${GREEN}✓ All services restarted${NC}"
    else
        check_service "$svc"
        echo -e "${YELLOW}Restarting topems-${svc}...${NC}"
        systemctl restart "topems-${svc}.service"
        echo -e "${GREEN}✓ topems-${svc} restarted${NC}"
    fi
}

show_status() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${BLUE}TOPEMS Services Status:${NC}"
        echo ""
        for s in "${ALL_SERVICES[@]}"; do
            status=$(systemctl is-active "topems-${s}.service" 2>/dev/null || echo "inactive")
            if [[ "$status" == "active" ]]; then
                echo -e "  ${GREEN}●${NC} topems-${s}: ${GREEN}${status}${NC}"
            else
                echo -e "  ${RED}○${NC} topems-${s}: ${RED}${status}${NC}"
            fi
        done
        echo ""
    else
        check_service "$svc"
        systemctl status "topems-${svc}.service"
    fi
}

show_logs() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${RED}Please specify a service to view logs${NC}"
        echo "Usage: $0 logs <service>"
        exit 1
    fi
    check_service "$svc"
    journalctl -u "topems-${svc}.service" -f
}

enable_services() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${YELLOW}Enabling all TOPEMS services at boot...${NC}"
        systemctl enable topems.target
        echo -e "${GREEN}✓ All services enabled${NC}"
    else
        check_service "$svc"
        systemctl enable "topems-${svc}.service"
        echo -e "${GREEN}✓ topems-${svc} enabled${NC}"
    fi
}

disable_services() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${YELLOW}Disabling all TOPEMS services at boot...${NC}"
        systemctl disable topems.target
        echo -e "${GREEN}✓ All services disabled${NC}"
    else
        check_service "$svc"
        systemctl disable "topems-${svc}.service"
        echo -e "${GREEN}✓ topems-${svc} disabled${NC}"
    fi
}

list_services() {
    echo -e "${BLUE}TOPEMS Services:${NC}"
    echo ""
    for s in "${ALL_SERVICES[@]}"; do
        enabled=$(systemctl is-enabled "topems-${s}.service" 2>/dev/null || echo "disabled")
        status=$(systemctl is-active "topems-${s}.service" 2>/dev/null || echo "inactive")
        echo "  topems-${s}"
        echo "    Status: ${status}"
        echo "    Enabled: ${enabled}"
        echo ""
    done
}

# Main
case "$1" in
    start)
        start_services "$2"
        ;;
    stop)
        stop_services "$2"
        ;;
    restart)
        restart_services "$2"
        ;;
    status)
        show_status "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    enable)
        enable_services "$2"
        ;;
    disable)
        disable_services "$2"
        ;;
    list)
        list_services
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac