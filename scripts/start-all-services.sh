#!/bin/bash

echo "=========================================="
echo "  TOPEMS 快速启动脚本"
echo "=========================================="
echo ""

# 加载统一环境配置
if [ -f "/Users/xingzhai/TOPEMS/.env" ]; then
    echo "📦 加载统一环境配置..."
    # 使用 bash 展开环境变量
    while IFS='=' read -r key value; do
        # 跳过注释和空行
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        # 展开变量引用
        value=$(eval "echo \"$value\"")
        export "$key=$value"
    done < "/Users/xingzhai/TOPEMS/.env"
else
    echo "⚠️  未找到统一环境配置文件，使用默认值"
    export IAM_PORT=8002
    export RS_PORT=8005
    export LIMS_PORT=8006
    export POSTGRES_HOST=localhost
    export POSTGRES_PORT=5432
    export POSTGRES_USER=topems
    export POSTGRES_PASSWORD=topems_secret
    export POSTGRES_DB=topems
    export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
fi

# 验证数据库连接 URL
echo "📋 数据库连接: $DATABASE_URL"

# 清除可能干扰的环境变量
unset SERVER_PORT

# 停止所有已存在的服务
echo "📦 停止所有已存在的服务..."
lsof -ti:${IAM_PORT} | xargs kill -9 2>/dev/null
lsof -ti:${RS_PORT} | xargs kill -9 2>/dev/null
lsof -ti:${LIMS_PORT} | xargs kill -9 2>/dev/null
sleep 2

# 检查并启动 PostgreSQL 服务
echo "🔍 检查 PostgreSQL 服务..."
if nc -z localhost ${POSTGRES_PORT:-5432} 2>/dev/null; then
    echo "✅ PostgreSQL 服务已运行 (localhost:${POSTGRES_PORT:-5432})"
else
    echo "🚀 启动 PostgreSQL 服务..."
    brew services start postgresql@16 > /dev/null 2>&1
    sleep 5
    
    if nc -z localhost ${POSTGRES_PORT:-5432} 2>/dev/null; then
        echo "✅ PostgreSQL 启动成功 (localhost:${POSTGRES_PORT:-5432})"
    else
        echo "❌ PostgreSQL 启动失败"
        echo "请手动启动 PostgreSQL: brew services start postgresql@16"
        exit 1
    fi
fi

# 检查 Redis 服务
echo "🔍 检查 Redis 服务..."
if nc -z localhost ${REDIS_PORT:-6379} 2>/dev/null; then
    echo "✅ Redis 服务运行正常 (localhost:${REDIS_PORT:-6379})"
else
    echo "⚠️  Redis 服务未运行 (localhost:${REDIS_PORT:-6379})"
    echo "如果需要缓存功能，请启动 Redis: brew services start redis"
fi

echo ""
echo "🚀 启动 IAM 身份认证服务..."
cd /Users/xingzhai/TOPEMS/platform/topems-iam/backend
nohup cargo run > /tmp/topems-iam.log 2>&1 &
IAM_PID=$!
echo "   IAM 服务 PID: $IAM_PID"
sleep 6

# 检查 IAM 服务是否启动成功
if nc -z localhost ${IAM_PORT} 2>/dev/null; then
    echo "✅ IAM 服务启动成功 (localhost:${IAM_PORT})"
else
    echo "❌ IAM 服务启动失败"
    echo "日志: /tmp/topems-iam.log"
    cat /tmp/topems-iam.log | tail -15
    exit 1
fi

echo ""
echo "🚀 启动 RS 科研研发管理服务..."
cd /Users/xingzhai/TOPEMS/services/topems-rs/backend
nohup cargo run > /tmp/topems-rs.log 2>&1 &
RS_PID=$!
echo "   RS 服务 PID: $RS_PID"
sleep 6

# 检查 RS 服务是否启动成功
if nc -z localhost ${RS_PORT} 2>/dev/null; then
    echo "✅ RS 服务启动成功 (localhost:${RS_PORT})"
else
    echo "❌ RS 服务启动失败"
    echo "日志: /tmp/topems-rs.log"
    cat /tmp/topems-rs.log | tail -15
    exit 1
fi

echo ""
echo "🚀 启动 LIMS 实验室信息管理服务..."
cd /Users/xingzhai/TOPEMS/services/topems-lims/backend
nohup cargo run > /tmp/topems-lims.log 2>&1 &
LIMS_PID=$!
echo "   LIMS 服务 PID: $LIMS_PID"
sleep 6

# 检查 LIMS 服务是否启动成功
if nc -z localhost ${LIMS_PORT} 2>/dev/null; then
    echo "✅ LIMS 服务启动成功 (localhost:${LIMS_PORT})"
else
    echo "❌ LIMS 服务启动失败"
    echo "日志: /tmp/topems-lims.log"
    cat /tmp/topems-lims.log | tail -15
    exit 1
fi

echo ""
echo "=========================================="
echo "  ✅ 所有服务启动成功！"
echo "=========================================="
echo ""
echo "📋 服务列表："
echo "   • IAM 身份认证服务:      http://localhost:${IAM_PORT}"
echo "   • RS 科研研发管理服务:   http://localhost:${RS_PORT}"
echo "   • LIMS 实验室信息管理服务: http://localhost:${LIMS_PORT}"
echo ""
echo "🔑 测试账号："
echo "   • 管理员: admin / Admin123"
echo "   • 普通用户: user / User123"
echo "   • 访客: guest / Guest123"
echo ""
echo "📝 日志文件："
echo "   • IAM 日志: /tmp/topems-iam.log"
echo "   • RS 日志: /tmp/topems-rs.log"
echo "   • LIMS 日志: /tmp/topems-lims.log"
echo ""
echo "🛑 停止所有服务："
echo "   lsof -ti:${IAM_PORT} | xargs kill -9"
echo "   lsof -ti:${RS_PORT} | xargs kill -9"
echo "   lsof -ti:${LIMS_PORT} | xargs kill -9"
echo ""
