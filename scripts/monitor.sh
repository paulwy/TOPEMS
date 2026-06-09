#!/bin/bash
# TOPEMS 监控管理脚本
# 用于启动、停止和检查监控系统状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 路径配置
MONITORING_DIR="$(cd "$(dirname "$0")/../monitoring" && pwd)"
PROMETHEUS_CONFIG="$MONITORING_DIR/prometheus/prometheus.yml"
ALERT_RULES="$MONITORING_DIR/prometheus/rules/topems-alerts.yml"

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}检查依赖...${NC}"

    if command -v docker &> /dev/null; then
        DOCKER_AVAILABLE=true
        echo -e "${GREEN}✓ Docker 可用${NC}"
    else
        DOCKER_AVAILABLE=false
        echo -e "${YELLOW}⚠ Docker 不可用${NC}"
    fi

    if command -v prometheus &> /dev/null; then
        PROMETHEUS_LOCAL=true
        echo -e "${GREEN}✓ Prometheus 已安装${NC}"
    else
        PROMETHEUS_LOCAL=false
        echo -e "${YELLOW}⚠ Prometheus 未安装（仅 Docker 模式可用）${NC}"
    fi

    if command -v grafana-server &> /dev/null; then
        GRAFANA_LOCAL=true
        echo -e "${GREEN}✓ Grafana 已安装${NC}"
    else
        GRAFANA_LOCAL=false
        echo -e "${YELLOW}⚠ Grafana 未安装（仅 Docker 模式可用）${NC}"
    fi
}

# 启动 Docker 模式
start_docker() {
    echo -e "${BLUE}启动监控系统（Docker 模式）...${NC}"

    cd "$MONITORING_DIR"

    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        echo -e "${RED}✗ Docker 未运行，请先启动 Docker Desktop${NC}"
        exit 1
    fi

    docker-compose up -d

    echo -e "${GREEN}✓ 监控系统已启动${NC}"
    echo ""
    echo -e "访问地址："
    echo -e "  ${BLUE}Prometheus:${NC}   http://localhost:9090"
    echo -e "  ${BLUE}Grafana:${NC}       http://localhost:3000 (admin/admin)"
    echo -e "  ${BLUE}Alertmanager:${NC}  http://localhost:9093"
}

# 启动本地模式
start_local() {
    echo -e "${BLUE}启动监控系统（本地模式）...${NC}"

    if [ "$PROMETHEUS_LOCAL" = false ]; then
        echo -e "${RED}✗ Prometheus 未安装${NC}"
        echo -e "请运行以下命令安装："
        echo -e "  ${GREEN}brew install prometheus${NC}"
        exit 1
    fi

    # 启动 Prometheus
    echo -e "${BLUE}启动 Prometheus...${NC}"
    prometheus \
        --config.file="$PROMETHEUS_CONFIG" \
        --web.listen-address=":9090" \
        --storage.tsdb.path="/tmp/prometheus" &

    PROMETHEUS_PID=$!
    echo $PROMETHEUS_PID > /tmp/topems-prometheus.pid
    echo -e "${GREEN}✓ Prometheus 已启动 (PID: $PROMETHEUS_PID)${NC}"

    # 启动 Grafana（如果可用）
    if [ "$GRAFANA_LOCAL" = true ]; then
        echo -e "${BLUE}启动 Grafana...${NC}"
        brew services start grafana
        echo -e "${GREEN}✓ Grafana 已启动${NC}"
    fi

    echo ""
    echo -e "访问地址："
    echo -e "  ${BLUE}Prometheus:${NC}   http://localhost:9090"
    if [ "$GRAFANA_LOCAL" = true ]; then
        echo -e "  ${BLUE}Grafana:${NC}       http://localhost:3000 (admin/admin)"
    fi
}

# 停止 Docker 模式
stop_docker() {
    echo -e "${BLUE}停止监控系统（Docker 模式）...${NC}"

    cd "$MONITORING_DIR"
    docker-compose down

    echo -e "${GREEN}✓ 监控系统已停止${NC}"
}

# 停止本地模式
stop_local() {
    echo -e "${BLUE}停止监控系统（本地模式）...${NC}"

    # 停止 Prometheus
    if [ -f /tmp/topems-prometheus.pid ]; then
        PROMETHEUS_PID=$(cat /tmp/topems-prometheus.pid)
        if ps -p $PROMETHEUS_PID > /dev/null 2>&1; then
            kill $PROMETHEUS_PID
            echo -e "${GREEN}✓ Prometheus 已停止 (PID: $PROMETHEUS_PID)${NC}"
        fi
        rm /tmp/topems-prometheus.pid
    fi

    # 停止 Grafana
    if [ "$GRAFANA_LOCAL" = true ]; then
        brew services stop grafana 2>/dev/null || true
        echo -e "${GREEN}✓ Grafana 已停止${NC}"
    fi
}

# 查看状态
status() {
    echo -e "${BLUE}监控系统状态：${NC}"
    echo ""

    # Docker 状态
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo -e "${YELLOW}Docker 模式：${NC}"
        cd "$MONITORING_DIR"
        CONTAINERS=$(docker-compose ps --format json 2>/dev/null || echo "[]")
        if [ -n "$CONTAINERS" ]; then
            docker-compose ps
        else
            echo -e "  ${YELLOW}服务未运行${NC}"
        fi
        echo ""
    fi

    # 本地进程状态
    echo -e "${YELLOW}本地进程：${NC}"
    if [ -f /tmp/topems-prometheus.pid ]; then
        PROMETHEUS_PID=$(cat /tmp/topems-prometheus.pid)
        if ps -p $PROMETHEUS_PID > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ Prometheus 运行中 (PID: $PROMETHEUS_PID)${NC}"
        else
            echo -e "  ${RED}✗ Prometheus 未运行（PID 文件过期）${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠ Prometheus 未运行${NC}"
    fi

    if command -v grafana-server &> /dev/null; then
        if brew services list | grep -q grafana; then
            echo -e "  ${GREEN}✓ Grafana 运行中${NC}"
        else
            echo -e "  ${YELLOW}⚠ Grafana 未运行${NC}"
        fi
    fi
}

# 查看日志
logs() {
    SERVICE=${1:-prometheus}
    echo -e "${BLUE}查看 $SERVICE 日志（Ctrl+C 退出）...${NC}"

    if [ "$DOCKER_AVAILABLE" = true ]; then
        cd "$MONITORING_DIR"
        docker-compose logs -f $SERVICE
    else
        echo -e "${RED}Docker 不可用，无法查看日志${NC}"
    fi
}

# 验证配置
validate_config() {
    echo -e "${BLUE}验证配置文件...${NC}"

    if [ -f "$PROMETHEUS_CONFIG" ]; then
        echo -e "${GREEN}✓ Prometheus 配置文件存在${NC}"
    else
        echo -e "${RED}✗ Prometheus 配置文件不存在${NC}"
    fi

    if [ -f "$ALERT_RULES" ]; then
        echo -e "${GREEN}✓ 告警规则文件存在${NC}"
    else
        echo -e "${RED}✗ 告警规则文件不存在${NC}"
    fi

    if command -v promtool &> /dev/null; then
        echo -e "${BLUE}验证 Prometheus 配置...${NC}"
        promtool check config "$PROMETHEUS_CONFIG" 2>/dev/null && \
            echo -e "${GREEN}✓ 配置验证通过${NC}" || \
            echo -e "${RED}✗ 配置验证失败${NC}"
    fi
}

# 显示帮助
show_help() {
    echo -e "${BLUE}TOPEMS 监控管理脚本${NC}"
    echo ""
    echo -e "${YELLOW}用法:${NC}"
    echo -e "  $0 <command>"
    echo ""
    echo -e "${YELLOW}命令:${NC}"
    echo -e "  ${GREEN}start${NC}       启动监控系统"
    echo -e "  ${GREEN}stop${NC}        停止监控系统"
    echo -e "  ${GREEN}restart${NC}     重启监控系统"
    echo -e "  ${GREEN}status${NC}      查看监控系统状态"
    echo -e "  ${GREEN}logs${NC}        查看监控日志"
    echo -e "  ${GREEN}validate${NC}     验证配置文件"
    echo -e "  ${GREEN}help${NC}        显示帮助信息"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo -e "  $0 start          # 启动监控系统"
    echo -e "  $0 status         # 查看状态"
    echo -e "  $0 logs prometheus # 查看 Prometheus 日志"
    echo ""
}

# 主函数
main() {
    check_dependencies

    COMMAND=${1:-help}

    case $COMMAND in
        start)
            if [ "$DOCKER_AVAILABLE" = true ]; then
                start_docker
            elif [ "$PROMETHEUS_LOCAL" = true ]; then
                start_local
            else
                echo -e "${RED}✗ 没有可用的监控系统（Docker 或本地 Prometheus）${NC}"
                exit 1
            fi
            ;;
        stop)
            if [ "$DOCKER_AVAILABLE" = true ]; then
                stop_docker
            else
                stop_local
            fi
            ;;
        restart)
            $0 stop
            sleep 2
            $0 start
            ;;
        status)
            status
            ;;
        logs)
            logs $2
            ;;
        validate)
            validate_config
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: $COMMAND${NC}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
