#!/bin/bash
# TOPEMS 系统停止脚本

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================="
echo "      TOPEMS 系统停止"
echo "============================================="
echo ""

# 停止服务的函数
stop_service() {
    local name="$1"
    local pid_file="$SCRIPT_DIR/logs/$name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file" 2>/dev/null)
        if [ -n "$pid" ]; then
            if kill -0 "$pid" 2>/dev/null; then
                echo "🛑 停止 $name 服务 (PID: $pid)..."
                kill "$pid" 2>/dev/null || true
                # 等待进程结束
                for i in {1..10}; do
                    if ! kill -0 "$pid" 2>/dev/null; then
                        echo "   ✅ $name 服务已停止"
                        break
                    fi
                    sleep 1
                done
                # 如果还没停止，强制杀死
                if kill -0 "$pid" 2>/dev/null; then
                    echo "   ⚠️  强制停止 $name 服务"
                    kill -9 "$pid" 2>/dev/null || true
                fi
            else
                echo "   ℹ️  $name 服务未运行"
            fi
        fi
        rm -f "$pid_file" 2>/dev/null
    else
        echo "   ℹ️  未找到 $name 服务的 PID 文件"
    fi
}

# 尝试使用 lsof 查找并停止端口上的服务
stop_port() {
    local port="$1"
    local name="$2"
    
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "🛑 停止 $name 服务 (端口: $port)..."
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
                sleep 1
                if kill -0 "$pid" 2>/dev/null; then
                    kill -9 "$pid" 2>/dev/null || true
                fi
            fi
        done
        echo "   ✅ $name 服务已停止"
    fi
}

# 停止各个服务
echo "正在停止服务..."
echo ""

stop_service "iam"
stop_service "doc"
stop_service "ai"
stop_service "flow"
stop_service "frontend"

echo ""
echo "清理端口..."

# 尝试清理可能还在运行的服务
stop_port 8002 "IAM"
stop_port 8001 "DOC"
stop_port 8003 "AI"
stop_port 8004 "FLOW"
stop_port 3000 "Frontend"
stop_port 3005 "Frontend"

echo ""
echo "============================================="
echo "      所有服务已停止"
echo "============================================="
echo ""
echo "✅ 清理完成"
