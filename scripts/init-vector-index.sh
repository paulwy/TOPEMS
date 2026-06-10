#!/bin/bash
# TOPEMS Redis 向量索引初始化脚本
# 初始化员工和技能向量搜索索引

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔══════════════════════════════════════════════════════════╗"
echo "║      TOPEMS Redis 向量索引初始化                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 配置
REDIS_CONTAINER="topems-redis"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
VECTOR_DIMENSION="${VECTOR_DIMENSION:-3584}"  # Qwen2.5:7b 默认维度

# Redis CLI 命令
REDIS_CLI="docker exec $REDIS_CONTAINER redis-cli"

# 检查 Redis 是否运行
echo -e "${YELLOW}📡 检查 Redis 连接...${NC}"
if ! docker ps | grep -q "$REDIS_CONTAINER"; then
    echo -e "${RED}❌ 错误: Redis 容器 '$REDIS_CONTAINER' 未运行${NC}"
    echo -e "${YELLOW}请先启动 Redis: docker compose up -d redis${NC}"
    exit 1
fi

if ! $REDIS_CLI PING > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: 无法连接到 Redis${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Redis 连接正常${NC}"

# 检查 Redis 版本（需要 7.0+ 支持向量索引）
REDIS_VERSION=$($REDIS_CLI INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
echo -e "${YELLOW}📋 Redis 版本: $REDIS_VERSION${NC}"

# 提取主版本号
MAJOR_VERSION=$(echo $REDIS_VERSION | cut -d. -f1)
if [ "$MAJOR_VERSION" -lt 7 ]; then
    echo -e "${RED}❌ 错误: Redis 版本需要 7.0+ 以支持向量索引${NC}"
    echo -e "${YELLOW}当前版本: $REDIS_VERSION${NC}"
    exit 1
fi

# 删除现有索引（如果存在）
echo ""
echo -e "${YELLOW}🗑️  清理现有索引...${NC}"

for index in employee_vectors skill_vectors document_vectors; do
    if $REDIS_CLI FT.INFO $index > /dev/null 2>&1; then
        echo -e "   删除索引: $index"
        $REDIS_CLI FT.DROPINDEX $index > /dev/null 2>&1 || true
    fi
done

echo -e "${GREEN}✅ 清理完成${NC}"

# 创建员工向量索引
echo ""
echo -e "${YELLOW}🔧 创建员工向量索引...${NC}"
echo -e "   索引名称: employee_vectors"
echo -e "   向量维度: $VECTOR_DIMENSION"
echo -e "   距离度量: COSINE"

$REDIS_CLI FT.CREATE employee_vectors \
    ON HASH \
    PREFIX 1 "vec:employee:" \
    SCHEMA \
        embedding VECTOR HNSW 6 DIM $VECTOR_DIMENSION TYPE FLOAT32 DISTANCE_METRIC COSINE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 员工向量索引创建成功${NC}"
else
    echo -e "${RED}❌ 员工向量索引创建失败${NC}"
    exit 1
fi

# 创建技能向量索引
echo ""
echo -e "${YELLOW}🔧 创建技能向量索引...${NC}"
echo -e "   索引名称: skill_vectors"
echo -e "   向量维度: $VECTOR_DIMENSION"
echo -e "   距离度量: COSINE"

$REDIS_CLI FT.CREATE skill_vectors \
    ON HASH \
    PREFIX 1 "vec:skill:" \
    SCHEMA \
        embedding VECTOR HNSW 6 DIM $VECTOR_DIMENSION TYPE FLOAT32 DISTANCE_METRIC COSINE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 技能向量索引创建成功${NC}"
else
    echo -e "${RED}❌ 技能向量索引创建失败${NC}"
    exit 1
fi

# 创建文档向量索引
echo ""
echo -e "${YELLOW}🔧 创建文档向量索引...${NC}"
echo -e "   索引名称: document_vectors"
echo -e "   向量维度: $VECTOR_DIMENSION"
echo -e "   距离度量: COSINE"

$REDIS_CLI FT.CREATE document_vectors \
    ON HASH \
    PREFIX 1 "vec:document:" \
    SCHEMA \
        embedding VECTOR HNSW 6 DIM $VECTOR_DIMENSION TYPE FLOAT32 DISTANCE_METRIC COSINE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 文档向量索引创建成功${NC}"
else
    echo -e "${RED}❌ 文档向量索引创建失败${NC}"
    exit 1
fi

# 验证索引
echo ""
echo -e "${YELLOW}📋 验证索引...${NC}"
INDEXES=$($REDIS_CLI FT._LIST)
echo -e "   索引列表: $INDEXES"

# 显示索引信息
echo ""
echo -e "${YELLOW}📊 索引统计:${NC}"

for index in employee_vectors skill_vectors document_vectors; do
    if $REDIS_CLI FT.INFO $index > /dev/null 2>&1; then
        DOC_COUNT=$($REDIS_CLI FT.SEARCH $index "*" LIMIT 0 0 | grep "results" | awk '{print $2}')
        echo -e "   $index: $DOC_COUNT 个文档"
    fi
done

# 完成
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    初始化完成                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Redis 向量索引初始化成功！${NC}"
echo ""
echo "索引配置:"
echo "  - 员工索引: employee_vectors"
echo "  - 技能索引: skill_vectors"
echo "  - 文档索引: document_vectors"
echo "  - 向量维度: $VECTOR_DIMENSION"
echo ""
echo "下一步:"
echo "  1. 启动 Ollama 服务: ollama serve"
echo "  2. 启动 HRM 服务: cargo run -p topems-hrm"
echo "  3. 测试技能匹配: cargo run --example hrm_skill_matching"
echo ""
