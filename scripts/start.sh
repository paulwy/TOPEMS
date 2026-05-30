#!/bin/bash
# TOPEMS 系统快速启动脚本

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================="
echo "      TOPEMS 系统快速启动"
echo "============================================="
echo ""

# 检查是否已安装必要的工具
check_tools() {
    local missing_tools=()
    
    if ! command -v cargo &> /dev/null; then
        missing_tools+=("Rust (cargo)")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js")
    fi
    
    if ! command -v psql &> /dev/null; then
        missing_tools+=("PostgreSQL (psql)")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo "⚠️  缺少以下工具，请先安装："
        for tool in "${missing_tools[@]}"; do
            echo "   - $tool"
        done
        echo ""
        echo "提示：在 macOS 上可以使用 Homebrew 安装这些工具"
        return 1
    fi
    
    echo "✅ 所有必要工具已安装"
    return 0
}

# 检查并初始化数据库
check_database() {
    echo ""
    echo "📊 检查数据库状态..."
    
    # 检查 PostgreSQL 是否在运行
    if ! pg_isready &> /dev/null; then
        echo "⚠️  PostgreSQL 未运行，尝试启动..."
        if command -v brew &> /dev/null; then
            brew services start postgresql@16 || true
            sleep 3
        fi
    fi
    
    # 检查数据库是否存在
    if ! psql -lqt | cut -d \| -f 1 | grep -qw topems; then
        echo "📝 数据库不存在，正在创建..."
        createdb topems || {
            echo "⚠️  数据库创建失败，可能已存在，继续..."
        }
        
        # 创建用户（如果不存在）
        psql -d postgres -c "CREATE USER IF NOT EXISTS topems WITH PASSWORD 'topems_secret';" 2>/dev/null || true
        psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE topems TO topems;" 2>/dev/null || true
        
        # 运行初始化脚本
        if [ -f "infrastructure/docker/init.sql" ]; then
            echo "📝 运行数据库初始化脚本..."
            psql -d topems -f "infrastructure/docker/init.sql"
        fi
    fi
    
    echo "✅ 数据库已就绪"
}

# 启动后端服务
start_backends() {
    echo ""
    echo "🚀 启动后端服务..."
    
    # 在后台启动各个服务
    echo "   启动 IAM 服务 (端口 8002)..."
    cd "$SCRIPT_DIR/platform/topems-iam/backend"
    nohup cargo run > "$SCRIPT_DIR/logs/iam.log" 2>&1 &
    IAM_PID=$!
    echo "   IAM PID: $IAM_PID"
    
    echo "   启动文档服务 (端口 8001)..."
    cd "$SCRIPT_DIR/platform/topems-doc/backend"
    nohup cargo run > "$SCRIPT_DIR/logs/doc.log" 2>&1 &
    DOC_PID=$!
    echo "   DOC PID: $DOC_PID"
    
    echo "   启动 AI 服务 (端口 8003)..."
    cd "$SCRIPT_DIR/services/topems-ai/backend"
    nohup cargo run > "$SCRIPT_DIR/logs/ai.log" 2>&1 &
    AI_PID=$!
    echo "   AI PID: $AI_PID"
    
    echo "   启动工作流服务 (端口 8004)..."
    cd "$SCRIPT_DIR/platform/topems-flow/backend"
    nohup cargo run > "$SCRIPT_DIR/logs/flow.log" 2>&1 &
    FLOW_PID=$!
    echo "   FLOW PID: $FLOW_PID"
    
    cd "$SCRIPT_DIR"
    
    # 保存 PID 文件
    mkdir -p "$SCRIPT_DIR/logs"
    echo "$IAM_PID" > "$SCRIPT_DIR/logs/iam.pid"
    echo "$DOC_PID" > "$SCRIPT_DIR/logs/doc.pid"
    echo "$AI_PID" > "$SCRIPT_DIR/logs/ai.pid"
    echo "$FLOW_PID" > "$SCRIPT_DIR/logs/flow.pid"
    
    # 等待服务启动
    echo ""
    echo "⏳ 等待服务启动（约 30 秒）..."
    sleep 30
    
    echo ""
    echo "✅ 后端服务已启动"
}

# 启动前端
start_frontend() {
    echo ""
    echo "🎨 启动前端服务..."
    
    cd "$SCRIPT_DIR/frontend"
    nohup npm run dev > "$SCRIPT_DIR/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"
    
    echo "$FRONTEND_PID" > "$SCRIPT_DIR/logs/frontend.pid"
    echo "   前端 PID: $FRONTEND_PID"
    
    echo "⏳ 等待前端启动（约 10 秒）..."
    sleep 10
    
    echo "✅ 前端服务已启动"
}

# 检查服务状态
check_services() {
    echo ""
    echo "📋 检查服务状态..."
    
    # 检查各个服务
    local services=("IAM:8002" "DOC:8001" "AI:8003" "FLOW:8004")
    local all_ok=true
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        if curl -s "http://localhost:$port/health" &> /dev/null; then
            echo "   ✅ $name 服务 (端口 $port) 运行正常"
        else
            echo "   ❌ $name 服务 (端口 $port) 未响应"
            all_ok=false
        fi
    done
    
    echo ""
    if $all_ok; then
        echo "🎉 所有服务运行正常！"
        echo ""
        echo "🌐 访问地址："
        echo "   前端门户: http://localhost:3000"
        echo "   IAM 健康检查: http://localhost:8002/health"
        echo "   DOC 健康检查: http://localhost:8001/health"
        echo "   AI 健康检查: http://localhost:8003/health"
        echo "   FLOW 健康检查: http://localhost:8004/health"
        echo ""
        echo "📝 默认登录账号："
        echo "   管理员: admin / admin123"
        echo "   测试用户: testuser / Test123456"
        echo ""
        echo "📖 查看日志："
        echo "   tail -f logs/iam.log"
        echo "   tail -f logs/doc.log"
        echo "   tail -f logs/ai.log"
        echo "   tail -f logs/flow.log"
        echo "   tail -f logs/frontend.log"
        echo ""
        echo "🛑 停止所有服务：./stop.sh"
    else
        echo "⚠️  部分服务未正常运行，请检查日志"
    fi
}

# 主程序
main() {
    # 创建日志目录
    mkdir -p "$SCRIPT_DIR/logs"
    
    # 检查工具
    if ! check_tools; then
        exit 1
    fi
    
    # 检查数据库
    check_database
    
    # 启动后端
    start_backends
    
    # 启动前端
    start_frontend
    
    # 检查服务状态
    check_services
}

main
