#!/bin/bash
# TOPEMS 生产环境启动脚本
# 用法: ./start-production.sh [start|stop|restart|status]

set -e

PROJECT_DIR="/Users/xingzhai/TOPEMS"
ENV_FILE="${PROJECT_DIR}/.env.production"
LOG_DIR="/tmp/topems-logs"
BACKEND_BIN="${PROJECT_DIR}/target/release/topems-unified-core"
FRONTEND_DIR="${PROJECT_DIR}/apps/web/dist"
BACKEND_PORT=8013
FRONTEND_PORT=3001
BACKEND_PID_FILE="${LOG_DIR}/backend.pid"
FRONTEND_PID_FILE="${LOG_DIR}/frontend.pid"

mkdir -p "$LOG_DIR"

# 加载环境变量
load_env() {
    set -a
    source "$ENV_FILE"
    set +a
}

# 检查端口是否被占用
check_port() {
    if lsof -i :"$1" -sTCP:LISTEN &> /dev/null; then
        return 1
    fi
    return 0
}

# 启动后端
start_backend() {
    echo "启动后端服务..."
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        OLD_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$OLD_PID" &> /dev/null; then
            echo "后端服务已在运行 (PID: $OLD_PID)"
            return 0
        fi
    fi
    
    if ! check_port "$BACKEND_PORT"; then
        echo "端口 $BACKEND_PORT 已被占用"
        return 1
    fi
    
    load_env
    cd "$PROJECT_DIR"
    nohup "$BACKEND_BIN" > "${LOG_DIR}/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
    
    sleep 5
    
    if ps -p "$BACKEND_PID" &> /dev/null; then
        echo "✅ 后端服务启动成功 (PID: $BACKEND_PID)"
        echo "   健康检查: http://localhost:${BACKEND_PORT}/health"
    else
        echo "❌ 后端服务启动失败"
        echo "   日志: ${LOG_DIR}/backend.log"
        tail -20 "${LOG_DIR}/backend.log"
        return 1
    fi
}

# 启动前端
start_frontend() {
    echo "启动前端服务..."
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        OLD_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$OLD_PID" &> /dev/null; then
            echo "前端服务已在运行 (PID: $OLD_PID)"
            return 0
        fi
    fi
    
    if ! check_port "$FRONTEND_PORT"; then
        echo "端口 $FRONTEND_PORT 已被占用"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    nohup python3 -m http.server "$FRONTEND_PORT" --bind 0.0.0.0 > "${LOG_DIR}/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
    
    sleep 3
    
    if ps -p "$FRONTEND_PID" &> /dev/null; then
        echo "✅ 前端服务启动成功 (PID: $FRONTEND_PID)"
        echo "   访问地址: http://localhost:${FRONTEND_PORT}"
    else
        echo "❌ 前端服务启动失败"
        echo "   日志: ${LOG_DIR}/frontend.log"
        tail -20 "${LOG_DIR}/frontend.log"
        return 1
    fi
}

# 停止后端
stop_backend() {
    echo "停止后端服务..."
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" &> /dev/null; then
            kill "$PID"
            sleep 2
            if ps -p "$PID" &> /dev/null; then
                kill -9 "$PID"
            fi
            echo "✅ 后端服务已停止"
        else
            echo "后端服务未在运行"
        fi
        rm -f "$BACKEND_PID_FILE"
    else
        pkill -f "topems-unified-core" 2>/dev/null || true
        echo "✅ 后端服务已停止"
    fi
}

# 停止前端
stop_frontend() {
    echo "停止前端服务..."
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" &> /dev/null; then
            kill "$PID"
            sleep 2
            if ps -p "$PID" &> /dev/null; then
                kill -9 "$PID"
            fi
            echo "✅ 前端服务已停止"
        else
            echo "前端服务未在运行"
        fi
        rm -f "$FRONTEND_PID_FILE"
    else
        pkill -f "http.server ${FRONTEND_PORT}" 2>/dev/null || true
        echo "✅ 前端服务已停止"
    fi
}

# 状态检查
status() {
    echo "========================================"
    echo "  TOPEMS 生产环境状态"
    echo "========================================"
    echo ""
    
    # 后端状态
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" &> /dev/null; then
            echo "后端服务: ✅ 运行中 (PID: $PID)"
            HEALTH=$(curl -s "http://localhost:${BACKEND_PORT}/health" 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"状态={d[\"status\"]}, 运行时间={d[\"uptime\"]}")' 2>/dev/null || echo "检查失败")
            echo "  健康状态: $HEALTH"
        else
            echo "后端服务: ❌ 未运行 (PID 文件存在但进程不存在)"
        fi
    else
        echo "后端服务: ⚪ 未启动"
    fi
    
    echo ""
    
    # 前端状态
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" &> /dev/null; then
            echo "前端服务: ✅ 运行中 (PID: $PID)"
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${FRONTEND_PORT}/" 2>/dev/null || echo "000")
            echo "  HTTP状态: $HTTP_CODE"
        else
            echo "前端服务: ❌ 未运行 (PID 文件存在但进程不存在)"
        fi
    else
        echo "前端服务: ⚪ 未启动"
    fi
    
    echo ""
    
    # 依赖服务状态
    echo "依赖服务:"
    pg_isready -h localhost -p 5432 &> /dev/null && echo "  PostgreSQL: ✅ 运行中" || echo "  PostgreSQL: ❌ 未运行"
    redis-cli ping &> /dev/null && echo "  Redis: ✅ 运行中" || echo "  Redis: ❌ 未运行"
    curl -s http://localhost:11434/api/tags &> /dev/null && echo "  Ollama: ✅ 运行中" || echo "  Ollama: ❌ 未运行"
    
    echo ""
    echo "访问地址:"
    echo "  后端 API: http://localhost:${BACKEND_PORT}"
    echo "  前端页面: http://localhost:${FRONTEND_PORT}"
    echo "  健康检查: http://localhost:${BACKEND_PORT}/health"
    echo "========================================"
}

# 主函数
case "${1:-start}" in
    start)
        echo "========================================"
        echo "  启动 TOPEMS 生产环境"
        echo "========================================"
        echo ""
        start_backend
        echo ""
        start_frontend
        echo ""
        status
        ;;
    stop)
        echo "========================================"
        echo "  停止 TOPEMS 生产环境"
        echo "========================================"
        echo ""
        stop_frontend
        echo ""
        stop_backend
        echo ""
        echo "✅ 所有服务已停止"
        ;;
    restart)
        echo "重启 TOPEMS 生产环境..."
        "$0" stop
        sleep 2
        "$0" start
        ;;
    status)
        status
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
