#!/bin/bash
#
# TOPEMS pgvector 全环境统一部署脚本
# 确保 Docker 和本地 Mac 都安装 pgvector
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         TOPEMS pgvector 统一部署脚本 v1.0              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============ 1. Docker PostgreSQL 配置 ============
install_docker_pgvector() {
    echo -e "${YELLOW}📦 配置 Docker PostgreSQL pgvector...${NC}"

    # 检查 Docker 是否运行
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker 未运行${NC}"
        return 1
    fi

    # 检查容器是否存在
    if ! docker ps --format '{{.Names}}' | grep -q topems-postgres; then
        echo -e "${YELLOW}⚠️  topems-postgres 容器不存在，创建中...${NC}"
        create_pgvector_container
        return $?
    fi

    # 检查是否已安装 pgvector
    if docker exec topems-postgres psql -U topems -d postgres -c "SELECT 1 FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -q 1; then
        echo -e "${GREEN}✅ Docker PostgreSQL pgvector 已安装${NC}"
        return 0
    fi

    echo -e "${YELLOW}⚠️  Docker PostgreSQL 需要重新构建以支持 pgvector${NC}"
    echo ""
    echo "请执行以下命令重建容器："
    echo ""
    echo -e "  ${GREEN}docker stop topems-postgres${NC}"
    echo -e "  ${GREEN}docker rm topems-postgres${NC}"
    echo -e "  ${GREEN}docker run -d \\${NC}"
    echo -e "    ${GREEN}--name topems-postgres \\${NC}"
    echo -e "    ${GREEN}-e POSTGRES_DB=topems \\${NC}"
    echo -e "    ${GREEN}-e POSTGRES_USER=topems \\${NC}"
    echo -e "    ${GREEN}-e POSTGRES_PASSWORD=topems_secret \\${NC}"
    echo -e "    ${GREEN}-p 5432:5432 \\${NC}"
    echo -e "    ${GREEN}--platform linux/amd64 \\${NC}"
    echo -e "    ${GREEN}anesposta/pgvector:16${NC}"
    echo ""
    echo -e "${YELLOW}或者直接运行: bash scripts/rebuild-postgres.sh${NC}"

    return 1
}

# 创建支持 pgvector 的 PostgreSQL 容器
create_pgvector_container() {
    echo -e "${YELLOW}🔨 创建支持 pgvector 的 PostgreSQL 容器...${NC}"

    docker run -d \
        --name topems-postgres \
        -e POSTGRES_DB=topems \
        -e POSTGRES_USER=topems \
        -e POSTGRES_PASSWORD=topems_secret \
        -p 5432:5432 \
        --platform linux/amd64 \
        anesposta/pgvector:16

    echo -e "${GREEN}✅ 容器创建成功，等待启动...${NC}"
    sleep 5

    return 0
}

# ============ 2. 本地 Mac 配置 ============
install_local_pgvector() {
    echo -e "${YELLOW}📦 配置本地 Mac PostgreSQL pgvector...${NC}"

    # 检查 PostgreSQL 是否安装
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ PostgreSQL 未安装${NC}"
        echo ""
        echo "安装 PostgreSQL："
        echo "  brew install postgresql@16"
        return 1
    fi

    # 检查 pgvector 是否已安装
    if psql -U xingzhai -d postgres -c "SELECT 1 FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -q 1; then
        echo -e "${GREEN}✅ 本地 PostgreSQL pgvector 已安装${NC}"
        return 0
    fi

    # 检查 pgvector 是否可用
    if psql -U xingzhai -d postgres -c "SELECT * FROM pg_available_extensions WHERE name='vector'" 2>/dev/null | grep -q vector; then
        echo -e "${YELLOW}⚙️  安装 pgvector 扩展...${NC}"

        # 安装 pgvector
        psql -U xingzhai -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ pgvector 安装成功${NC}"
        else
            echo -e "${RED}❌ pgvector 安装失败${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ 本地 PostgreSQL 不支持 pgvector${NC}"
        echo ""
        echo "需要重新编译 PostgreSQL："
        echo "  brew install pgvector"
        return 1
    fi

    return 0
}

# ============ 3. 创建示例表 ============
create_sample_tables() {
    echo -e "${YELLOW}📊 创建 pgvector 示例表...${NC}"

    # Docker PostgreSQL
    docker exec topems-postgres psql -U topems -d topems << 'EOSQL' 2>/dev/null
-- 员工向量表（用于 AI 相似度搜索）
CREATE TABLE IF NOT EXISTS hrm.employee_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES hrm.employees(id) ON DELETE CASCADE,
    embedding vector(1536),  -- OpenAI text-embedding-3-small 维度
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 HNSW 索引（高性能向量搜索）
CREATE INDEX IF NOT EXISTS idx_employee_embeddings_hnsw
ON hrm.employee_embeddings USING hnsw (embedding vector_cosine_ops);

-- 文档向量表
CREATE TABLE IF NOT EXISTS hrm.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw
ON hrm.document_embeddings USING hnsw (embedding vector_cosine_ops);

-- 技能向量表
CREATE TABLE IF NOT EXISTS hrm.skill_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_embeddings_hnsw
ON hrm.skill_embeddings USING hnsw (embedding vector_cosine_ops);

-- 插入示例技能数据
INSERT INTO hrm.skill_embeddings (skill_name, skill_category, embedding)
VALUES
    ('Rust', 'Programming', '[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0]'::vector),
    ('Python', 'Programming', '[0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1]'::vector),
    ('Project Management', 'Management', '[0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2]'::vector)
ON CONFLICT DO NOTHING;
EOSQL

    echo -e "${GREEN}✅ pgvector 示例表创建完成${NC}"
}

# ============ 4. 验证安装 ============
verify_installation() {
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                  验证安装结果                          ${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Docker PostgreSQL
    echo -e "${YELLOW}Docker PostgreSQL:${NC}"
    if docker exec topems-postgres psql -U topems -d topems -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -q vector; then
        echo -e "  ${GREEN}✅ pgvector 已安装${NC}"
        docker exec topems-postgres psql -U topems -d topems -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep vector | sed 's/^/  /'
    else
        echo -e "  ${RED}❌ pgvector 未安装${NC}"
    fi

    echo ""

    # 本地 PostgreSQL
    echo -e "${YELLOW}本地 PostgreSQL:${NC}"
    if psql -U xingzhai -d postgres -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -q vector; then
        echo -e "  ${GREEN}✅ pgvector 已安装${NC}"
        psql -U xingzhai -d postgres -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep vector | sed 's/^/  /'
    else
        echo -e "  ${YELLOW}⚠️  pgvector 未安装（可选）${NC}"
    fi

    echo ""
}

# ============ 主程序 ============
main() {
    local docker_ok=0
    local local_ok=0

    # 安装 Docker PostgreSQL pgvector
    if install_docker_pgvector; then
        docker_ok=1
    fi

    # 安装本地 pgvector
    if install_local_pgvector; then
        local_ok=1
    fi

    # 创建示例表
    if [ $docker_ok -eq 1 ]; then
        create_sample_tables
    fi

    # 验证安装
    verify_installation

    echo ""
    echo -e "${GREEN}🎉 pgvector 部署完成！${NC}"
    echo ""
    echo "下一步："
    echo "  1. 在代码中使用向量搜索功能"
    echo "  2. 参考 docs/pgvector-usage.md 了解更多用法"
}

# 运行
main
