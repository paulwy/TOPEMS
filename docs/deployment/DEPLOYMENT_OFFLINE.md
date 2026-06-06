# TOPEMS 离线部署完整方案

> 本文档详细说明在无外网环境下，如何获取镜像、构建系统、部署 TOPEMS 平台的完整流程。

---

## 目录

1. [服务器配置要求](#一服务器配置要求)
2. [操作系统要求](#二操作系统要求)
3. [镜像获取方案](#三镜像获取方案)
4. [镜像打包与传输](#四镜像打包与传输)
5. [构建所有服务](#五构建所有服务)
6. [数据库初始化](#六数据库初始化)
7. [完整部署步骤](#七完整部署步骤)
8. [Docker 操作详解](#八docker操作详解)
9. [验证部署](#九验证部署)
10. [常见问题](#十常见问题)

---

## 一、服务器配置要求

### 最低配置（开发/测试环境）

| 资源 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **CPU** | 4 核心 | 8 核心+ |
| **内存** | 8 GB | 16 GB+ |
| **硬盘** | 100 GB SSD | 500 GB SSD+ |
| **网络** | 100Mbps | 1Gbps |

### 生产环境配置

| 资源 | 小型部署（<50用户） | 中型部署（50-200用户） | 大型部署（200+用户） |
|------|-------------------|----------------------|---------------------|
| **CPU** | 8 核心 | 16 核心 | 32 核心+ |
| **内存** | 16 GB | 32 GB | 64 GB+ |
| **系统盘** | 100 GB SSD | 200 GB SSD | 500 GB SSD |
| **数据盘** | 200 GB SSD | 500 GB SSD | 1 TB SSD+ |
| **网络** | 100Mbps | 1Gbps | 10Gbps + 负载均衡 |

### 存储规划

```
/var/lib/docker          # Docker 数据目录 (至少 100GB)
/data/postgres           # PostgreSQL 数据 (至少 200GB)
/data/redis             # Redis 数据 (10GB+)
/data/topems-docs       # 文档存储 (按需扩展)
/data/topems-logs       # 日志存储 (20GB+)
```

---

## 二、操作系统要求

### 支持的操作系统

| 操作系统 | 推荐版本 | 支持状态 |
|---------|---------|---------|
| **Ubuntu** | 22.04 LTS / 24.04 LTS | ✅ 首选 |
| **CentOS** | 7.x / Stream 8+ | ✅ 支持 |
| **Rocky Linux** | 9.x | ✅ 支持 |
| **Debian** | 12.x | ✅ 支持 |
| **macOS** | 13+ (本地开发) | ✅ 支持 |
| **Windows Server** | 2022 (WSL2) | ⚠️ 不推荐 |

### 系统要求

```bash
# 通用要求
- 64位操作系统
- 内核版本 3.10+
- 支持 Overlay2 存储驱动
- 支持 cgroup v2
```

### 前置依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    jq \
    unzip \
    git

# CentOS/Rocky
sudo dnf install -y \
    yum-utils \
    device-mapper-persistent-data \
    lvm2 \
    jq \
    unzip \
    git
```

---

## 三、镜像获取方案

### 方案 1：从公网机器下载后离线传输（推荐）

#### 3.1.1 在有网络的机器上创建镜像下载脚本

```bash
#!/bin/bash
# 文件: download-images.sh
# 在有网络的机器上执行

set -e
OUTPUT_DIR="./topems-images"

mkdir -p ${OUTPUT_DIR}

# ==================== 基础设施镜像 ====================

# PostgreSQL + pgvector (AI 向量数据库必需)
docker pull ankane/pgvector:v0.7.4-pg16
docker save -o ${OUTPUT_DIR}/pgvector-16.tar ankane/pgvector:v0.7.4-pg16

# PostgreSQL 备用（无 AI 功能）
docker pull postgres:16-alpine
docker save -o ${OUTPUT_DIR}/postgres-16-alpine.tar postgres:16-alpine

# Redis
docker pull redis:7-alpine
docker save -o ${OUTPUT_DIR}/redis-7-alpine.tar redis:7-alpine

# Nginx
docker pull nginx:1.25-alpine
docker save -o ${OUTPUT_DIR}/nginx-1.25-alpine.tar nginx:1.25-alpine

# Rust 构建镜像
docker pull rust:1.75-slim
docker save -o ${OUTPUT_DIR}/rust-1.75-slim.tar rust:1.75-slim

# Node.js 构建镜像
docker pull node:20-alpine
docker save -o ${OUTPUT_DIR}/node-20-alpine.tar node:20-alpine

# ==================== 压缩镜像包 ====================

cd ${OUTPUT_DIR}

# 压缩所有镜像
tar -czvf ../topems-images.tar.gz *.tar

# 生成校验文件
sha256sum *.tar.gz > checksums.txt

echo "✅ 镜像下载完成！"
echo "📦 输出文件:"
echo "   - topems-images.tar.gz  ($(du -h topems-images.tar.gz | cut -f1))"
echo "   - checksums.txt"
echo ""
echo "💾 需要传输到目标机器的文件:"
ls -lh *.tar.gz
```

#### 3.1.2 执行下载

```bash
chmod +x download-images.sh
./download-images.sh
```

### 方案 2：使用国内镜像源（有网络但速度慢）

#### 阿里云镜像加速器

```bash
# 配置镜像加速器
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://mirror.ccs.tencentyun.com",
    "https://docker.nju.edu.cn"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

#### 从阿里云拉取镜像

```bash
# PostgreSQL + pgvector（需手动构建或寻找）
# 方法1: 使用预构建镜像
docker pull registry.cn-hangzhou.aliyuncs.com/topems/pgvector:v0.7.4-pg16

# 方法2: 从 github 手动构建后推送
# 参考第五节手动构建 pgvector 镜像
```

### 方案 3：完全离线构建 pgvector 镜像

#### 3.3.1 下载 PostgreSQL 源码

在有网络的机器上：

```bash
# 下载 PostgreSQL 16 源码
wget https://ftp.postgresql.org/pub/source/v16.3/postgresql-16.3.tar.gz

# 下载 pgvector 源码
wget https://github.com/pgvector/pgvector/archive/refs/tags/v0.7.4.tar.gz -O pgvector-0.7.4.tar.gz
```

#### 3.3.2 构建 pgvector Dockerfile

创建 `Dockerfile.pgvector`：

```dockerfile
# 基于 PostgreSQL 16 Alpine
FROM postgres:16-alpine

# 安装编译工具
RUN apk add --no-cache \
    postgresql16-devel \
    gcc \
    make \
    libc-dev

# 复制 pgvector 源码（需要先下载）
COPY pgvector-0.7.4.tar.gz /tmp/

# 编译安装 pgvector
RUN tar -xzf /tmp/pgvector-0.7.4.tar.gz -C /tmp/ && \
    cd /tmp/pgvector-0.7.4 && \
    make && \
    make install && \
    cd / && \
    rm -rf /tmp/pgvector* && \
    postgres -V

# 清理
RUN rm -rf /var/cache/apk/*

# 初始化脚本：自动创建扩展
RUN echo "CREATE EXTENSION IF NOT EXISTS vector;" >> /usr/local/bin/docker-entrypoint-initdb.d/10-pgvector.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-initdb.d/10-pgvector.sh

EXPOSE 5432

CMD ["postgres"]
```

#### 3.3.3 构建镜像

```bash
# 复制必要文件到构建目录
mkdir -p build-pgvector
cp Dockerfile.pgvector build-pgvector/
cp postgresql-16.3.tar.gz build-pgvector/      # 可选，已有基础镜像
cp pgvector-0.7.4.tar.gz build-pgvector/

cd build-pgvector
docker build -t topems-pgvector:16 .

# 保存镜像
docker save -o ../topems-pgvector-16.tar topems-pgvector:16
```

---

## 四、镜像打包与传输

### 4.1 打包所有必需镜像

创建完整打包脚本 `package-all.sh`：

```bash
#!/bin/bash
# 文件: package-all.sh
# 在有网络的构建机上执行

set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_DIR="./topems-deployment-${TIMESTAMP}"
OUTPUT_FILE="./topems-deployment-${TIMESTAMP}.tar.gz"

echo "📦 开始打包 TOPEMS 部署包..."
echo "⏰ 时间戳: ${TIMESTAMP}"

# 创建目录
mkdir -p ${PACKAGE_DIR}/{images,scripts,config,code}

# ==================== 1. 打包镜像 ====================
echo "📥 正在下载镜像..."

# 基础设施镜像
IMAGES=(
    "ankane/pgvector:v0.7.4-pg16"
    "redis:7-alpine"
    "nginx:1.25-alpine"
    "rust:1.75-slim"
    "node:20-alpine"
)

for img in "${IMAGES[@]}"; do
    echo "  下载: ${img}"
    docker pull ${img} || echo "  ⚠️ 失败: ${img}"
done

echo "💾 正在保存镜像..."
docker save -o ${PACKAGE_DIR}/images/base-images.tar \
    ankane/pgvector:v0.7.4-pg16 \
    redis:7-alpine \
    nginx:1.25-alpine \
    rust:1.75-slim \
    node:20-alpine

# ==================== 2. 复制配置文件 ====================
echo "📝 正在复制配置文件..."

# 复制 docker-compose 配置
cp docker-compose.yml ${PACKAGE_DIR}/config/
cp docker-compose.prod.yml ${PACKAGE_DIR}/config/
cp .env.example ${PACKAGE_DIR}/config/.env

# 复制部署脚本
cp -r scripts/* ${PACKAGE_DIR}/scripts/ 2>/dev/null || true

# ==================== 3. 生成部署说明 ====================
cat > ${PACKAGE_DIR}/README.md << 'EOF'
# TOPEMS 离线部署包

## 包内容

- `images/` - Docker 镜像包
- `config/` - 配置文件
- `scripts/` - 部署脚本

## 部署步骤

1. 解压包
2. 加载镜像
3. 配置环境
4. 启动服务

详见 DEPLOYMENT_OFFLINE.md
EOF

# ==================== 4. 打包 ====================
echo "🗜️  正在压缩..."
tar -czvf ${OUTPUT_FILE} -C . $(basename ${PACKAGE_DIR})

# 生成校验
sha256sum ${OUTPUT_FILE} > ${OUTPUT_FILE}.sha256

echo ""
echo "=============================================="
echo "✅ 打包完成！"
echo "=============================================="
echo ""
echo "📦 输出文件:"
ls -lh ${OUTPUT_FILE}
echo ""
echo "📋 SHA256 校验:"
cat ${OUTPUT_FILE}.sha256
echo ""
echo "💡 下一步:"
echo "   1. 将 ${OUTPUT_FILE} 传输到目标服务器"
echo "   2. 在目标服务器解压"
echo "   3. 执行部署脚本"
```

### 4.2 传输到目标服务器

```bash
# 方法1: SCP 传输
scp topems-deployment-20240101_120000.tar.gz user@192.168.1.100:/data/

# 方法2: U盘拷贝
# 挂载U盘，复制文件

# 方法3: NFS共享
mount -t nfs 192.168.1.200:/share /mnt
cp topems-deployment-*.tar.gz /mnt/
```

### 4.3 在目标服务器解压和加载镜像

```bash
# 解压
tar -xzvf topems-deployment-20240101_120000.tar.gz
cd topems-deployment-20240101_120000

# 加载镜像
docker load -i images/base-images.tar

# 验证镜像
docker images | grep -E "pgvector|redis|nginx|rust|node"
```

---

## 五、构建所有服务

### 5.1 创建统一构建脚本

创建 `build-all-services.sh`：

```bash
#!/bin/bash
# 文件: build-all-services.sh
# 在构建机上执行

set -e
REGISTRY="topems"
TAG="latest"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 所有服务列表
PLATFORM_SERVICES=(
    "platform/topems-iam/backend:iam-service"
    "platform/topems-doc/backend:doc-service"
    "platform/topems-flow/backend:flow-service"
)

BUSINESS_SERVICES=(
    "services/topems-pm/backend:pm-service"
    "services/topems-notification/backend:notification-service"
    "services/topems-integration/backend:integration-service"
    "services/topems-portal/backend:portal-service"
    "services/topems-erp/backend:erp-service"
    "services/topems-hrm/backend:hrm-service"
    "services/topems-crm/backend:crm-service"
    "services/topems-ai/backend:ai-service"
    "services/topems-rs/backend:rs-service"
    "services/topems-lims/backend:lims-service"
    "services/topems-pdm/backend:pdm-service"
    "services/topems-mes/backend:mes-service"
    "services/topems-qms/backend:qms-service"
    "services/topems-ehs/backend:ehs-service"
    "services/topems-scm/backend:scm-service"
    "services/topems-srm/backend:srm-service"
    "services/topems-wms/backend:wms-service"
    "services/topems-gis/backend:gis-service"
    "services/topems-im/backend:im-service"
    "services/topems-bi/backend:bi-service"
    "services/topems-report/backend:report-service"
    "services/topems-mail/backend:mail-service"
    "services/topems-mobile/backend:mobile-service"
)

FRONTEND="frontend:frontend"

# 构建单个服务
build_service() {
    local context=$1
    local name=$2

    log_info "构建: ${context} -> ${REGISTRY}/${name}:${TAG}"

    if [ ! -d "$context" ]; then
        log_warn "跳过不存在的目录: $context"
        return 1
    fi

    if [ ! -f "$context/Dockerfile" ]; then
        log_warn "跳过无 Dockerfile 的目录: $context"
        return 1
    fi

    docker build -t ${REGISTRY}/${name}:${TAG} -f "$context/Dockerfile" "$context"

    if [ $? -eq 0 ]; then
        log_info "✅ 成功: ${name}"
    else
        log_error "❌ 失败: ${name}"
        return 1
    fi
}

# 构建前端
build_frontend() {
    local context=$1
    local name=$2

    log_info "构建前端: ${context}"

    if [ ! -f "$context/Dockerfile" ]; then
        log_error "前端 Dockerfile 不存在"
        return 1
    fi

    docker build -t ${REGISTRY}/${name}:${TAG} -f "$context/Dockerfile" "$context"

    if [ $? -eq 0 ]; then
        log_info "✅ 成功: frontend"
    else
        log_error "❌ 失败: frontend"
        return 1
    fi
}

# 导出镜像
export_images() {
    local output_dir=$1
    mkdir -p "$output_dir"

    log_info "导出所有镜像到 $output_dir"

    # 收集所有镜像
    ALL_IMAGES=("${PLATFORM_SERVICES[@]}" "${BUSINESS_SERVICES[@]}")
    IMAGE_NAMES=""

    for item in "${ALL_IMAGES[@]}"; do
        name=$(echo $item | cut -d: -f2)
        IMAGE_NAMES="${IMAGE_NAMES} ${REGISTRY}/${name}:${TAG}"
    done

    docker save -o "$output_dir/all-services.tar" $IMAGE_NAMES

    # 前端单独打包（可选）
    docker save -o "$output_dir/frontend.tar" ${REGISTRY}/frontend:${TAG}

    log_info "✅ 镜像导出完成"
}

# 主流程
case "${1:-build}" in
    build)
        log_info "开始构建平台服务..."
        for item in "${PLATFORM_SERVICES[@]}"; do
            context=$(echo $item | cut -d: -f1)
            name=$(echo $item | cut -d: -f2)
            build_service "$context" "$name" || true
        done

        log_info "开始构建业务服务..."
        for item in "${BUSINESS_SERVICES[@]}"; do
            context=$(echo $item | cut -d: -f1)
            name=$(echo $item | cut -d: -f2)
            build_service "$context" "$name" || true
        done

        log_info "构建前端..."
        build_frontend "$FRONTEND" "frontend"

        log_info "所有构建完成！"
        docker images | grep "^${REGISTRY}"
        ;;

    export)
        export_images "${2:-./exported-images}"
        ;;

    all)
        # 构建
        $0 build

        # 导出
        $0 export "${2:-./exported-images}"
        ;;

    *)
        echo "用法: $0 {build|export|all} [输出目录]"
        exit 1
        ;;
esac
```

### 5.2 执行构建

```bash
chmod +x build-all-services.sh

# 构建所有服务
./build-all-services.sh build

# 或者一键构建+导出
./build-all-services.sh all ./exported-images
```

### 5.3 构建耗时参考

| 服务类型 | 数量 | 平均耗时 | 总耗时 |
|---------|------|---------|-------|
| 平台服务 | 3 | ~5分钟 | ~15分钟 |
| 业务服务 | 23 | ~3分钟 | ~70分钟 |
| 前端 | 1 | ~10分钟 | ~10分钟 |
| **总计** | **27** | - | **~95分钟** |

---

## 六、数据库初始化

### 6.1 创建数据库 Schema 初始化脚本

创建 `init-db.sh`：

```bash
#!/bin/bash
# 文件: init-db.sh
# 数据库初始化脚本

set -e

# 配置
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-topems}"
POSTGRES_USER="${POSTGRES_USER:-topems}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-topems_secret}"

export PGPASSWORD="${POSTGRES_PASSWORD}"

echo "🗄️  初始化数据库..."
echo "   主机: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "   数据库: ${POSTGRES_DB}"
echo "   用户: ${POSTGRES_USER}"

# 等待数据库就绪
echo "⏳ 等待数据库启动..."
for i in {1..30}; do
    if pg_isready -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} > /dev/null 2>&1; then
        echo "✅ 数据库已就绪"
        break
    fi
    echo "  等待... ($i/30)"
    sleep 2
done

# 创建扩展
echo "📦 创建扩展..."

# 创建 pgvector 扩展（用于 AI 服务）
psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} << EOF
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 验证扩展
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- 创建公共 schema（按服务划分）
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS doc;
CREATE SCHEMA IF NOT EXISTS flow;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS hrm;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS pm;
CREATE SCHEMA IF NOT EXISTS rs;
CREATE SCHEMA IF NOT EXISTS lims;
CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS qms;
CREATE SCHEMA IF NOT EXISTS ehs;
CREATE SCHEMA IF NOT EXISTS scm;
CREATE SCHEMA IF NOT EXISTS srm;
CREATE SCHEMA IF NOT EXISTS wms;
CREATE SCHEMA IF NOT EXISTS gis;
CREATE SCHEMA IF NOT EXISTS im;
CREATE SCHEMA IF NOT EXISTS bi;
CREATE SCHEMA IF NOT EXISTS pdm;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS mail;
CREATE SCHEMA IF NOT EXISTS mobile;

-- 列出所有 schema
SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema');
EOF

echo "✅ 数据库初始化完成！"
```

### 6.2 运行迁移

```bash
# 对于使用 sqlx 的服务，运行迁移
for service in iam doc flow ai erp hrm crm pm rs lims mes qms ehs scm srm wms gis im bi pdm report mail mobile; do
    service_dir="services/topems-${service}/backend"
    if [ -d "$service_dir" ]; then
        echo "运行迁移: $service"
        # sqlx 数据库迁移通常通过 cargo run 来执行
        # docker exec topems-${service}-prod /app/${service} migrate || true
    fi
done
```

---

## 七、完整部署步骤

### 7.1 一键部署脚本

创建 `deploy.sh`：

```bash
#!/bin/bash
# 文件: deploy.sh
# TOPEMS 一键部署脚本

set -e

# ==================== 配置 ====================
VERSION="${1:-latest}"
DATA_DIR="${DATA_DIR:-/data/topems}"
NETWORK_NAME="topems-network"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TOPEMS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ==================== 检查 ====================
log "🔍 检查环境..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    error "Docker 未安装"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose 未安装"
fi

# 检查端口占用
check_port() {
    if netstat -tuln 2>/dev/null | grep -q ":$1 "; then
        warn "端口 $1 已被占用"
        return 1
    fi
    return 0
}

# ==================== 准备 ====================
log "📁 准备部署目录..."
mkdir -p ${DATA_DIR}/{postgres,redis,logs,docs,uploads}
mkdir -p ${DATA_DIR}/postgres/{data,backups}

# 创建网络
log "🌐 创建 Docker 网络..."
docker network create ${NETWORK_NAME} 2>/dev/null || log "  网络已存在"

# ==================== 配置环境变量 ====================
log "⚙️  配置环境变量..."
cat > ${DATA_DIR}/.env << EOF
# 数据库配置
POSTGRES_USER=topems
POSTGRES_PASSWORD=topems_secret_$(openssl rand -hex 8)
POSTGRES_DB=topems
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379

# JWT 配置
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_SECRET=$(openssl rand -base64 32)

# AI 配置
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=nomic-embed-text
USE_OLLAMA=false
OPENAI_API_KEY=
OPENAI_BASE_URL=

# 版本
VERSION=${VERSION}
EOF

log "  环境配置文件: ${DATA_DIR}/.env"

# ==================== 加载镜像 ====================
log "📦 加载 Docker 镜像..."

# 查找镜像包
IMAGE_TAR=""
for f in ./images/*.tar ./images/*.tar.gz; do
    if [ -f "$f" ]; then
        IMAGE_TAR="$f"
        break
    fi
done

if [ -n "$IMAGE_TAR" ]; then
    log "  加载: $IMAGE_TAR"
    docker load -i "$IMAGE_TAR"
else
    warn "  未找到镜像包，请手动加载镜像"
fi

# 验证关键镜像
log "🔎 验证关键镜像..."
REQUIRED_IMAGES=(
    "postgres"
    "redis"
    "nginx"
    "topems"
)

for img in "${REQUIRED_IMAGES[@]}"; do
    if docker images | grep -q "^$img"; then
        log "  ✅ $img"
    else
        warn "  ⚠️  $img 未找到"
    fi
done

# ==================== 启动基础设施 ====================
log "🚀 启动基础设施服务..."

docker run -d \
    --name topems-postgres \
    --network ${NETWORK_NAME} \
    -e POSTGRES_USER=${POSTGRES_USER:-topems} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-topems_secret} \
    -e POSTGRES_DB=${POSTGRES_DB:-topems} \
    -v ${DATA_DIR}/postgres/data:/var/lib/postgresql/data \
    -p 5432:5432 \
    --restart unless-stopped \
    $(docker images | grep -E "^postgres" | awk '{print $1":"$2}' | head -1)

docker run -d \
    --name topems-redis \
    --network ${NETWORK_NAME} \
    -v ${DATA_DIR}/redis:/data \
    -p 6379:6379 \
    --restart unless-stopped \
    redis:7-alpine redis-server --appendonly yes

# 等待就绪
log "⏳ 等待服务就绪..."
sleep 10

# 初始化数据库
log "🗄️  初始化数据库..."
docker exec topems-postgres psql -U ${POSTGRES_USER:-topems} -d ${POSTGRES_DB:-topems} << EOF
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS doc;
CREATE SCHEMA IF NOT EXISTS flow;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS hrm;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS pm;
CREATE SCHEMA IF NOT EXISTS rs;
CREATE SCHEMA IF NOT EXISTS lims;
CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS qms;
CREATE SCHEMA IF NOT EXISTS ehs;
CREATE SCHEMA IF NOT EXISTS scm;
CREATE SCHEMA IF NOT EXISTS srm;
CREATE SCHEMA IF NOT EXISTS wms;
CREATE SCHEMA IF NOT EXISTS gis;
CREATE SCHEMA IF NOT EXISTS im;
CREATE SCHEMA IF NOT EXISTS bi;
CREATE SCHEMA IF NOT EXISTS pdm;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS mail;
CREATE SCHEMA IF NOT EXISTS mobile;
EOF

# ==================== 启动服务 ====================
log "🚀 启动 TOPEMS 服务..."

# 读取环境变量
set -a
source ${DATA_DIR}/.env
set +a

# 启动所有服务（使用 docker-compose）
if [ -f "docker-compose.prod.yml" ]; then
    docker-compose -f docker-compose.prod.yml up -d
elif [ -f "docker-compose.yml" ]; then
    docker-compose up -d
fi

# ==================== 完成 ====================
log ""
log "=============================================="
log "✅ TOPEMS 部署完成！"
log "=============================================="
log ""
log "📍 访问地址:"
log "   前端: http://localhost:80"
log "   API:  http://localhost:8000"
log ""
log "📁 数据目录: ${DATA_DIR}"
log "📝 日志查看: docker logs -f <容器名>"
log "📊 状态查看: docker ps"
log ""
log "🔐 默认账号:"
log "   用户名: admin"
log "   密码: admin123 (首次登录后请修改)"
log ""
```

### 7.2 部署执行流程

```bash
# 1. 上传部署包到服务器
scp topems-deployment-20240101.tar.gz root@192.168.1.100:/data/

# 2. SSH 登录服务器
ssh root@192.168.1.100

# 3. 解压部署包
cd /data
tar -xzvf topems-deployment-20240101.tar.gz
cd topems-deployment-20240101

# 4. 加载 Docker 镜像
docker load -i images/base-images.tar
docker load -i images/all-services.tar

# 5. 执行部署
chmod +x deploy.sh
./deploy.sh

# 6. 查看部署状态
docker ps
docker logs -f topems-iam
```

---

## 八、Docker 操作详解

### 8.1 Docker 基础命令

```bash
# ==================== 镜像操作 ====================

# 查看本地镜像
docker images

# 拉取镜像
docker pull <image>

# 保存镜像为 tar 文件
docker save -o <output.tar> <image:tag>

# 从 tar 文件加载镜像
docker load -i <input.tar>

# 标记镜像（用于多架构）
docker tag <source> <target>

# 删除镜像
docker rmi <image>

# 清理未使用的镜像
docker image prune -a

# 批量保存多个镜像
docker save -o images.tar img1:tag img2:tag img3:tag

# ==================== 容器操作 ====================

# 查看运行中的容器
docker ps

# 查看所有容器（包括已停止）
docker ps -a

# 创建并启动容器
docker run -d --name myapp -p 8080:80 nginx

# 启动已存在的容器
docker start <container>

# 停止容器
docker stop <container>

# 重启容器
docker restart <container>

# 删除容器（需先停止）
docker rm <container>

# 查看容器日志
docker logs -f <container>

# 进入容器内部
docker exec -it <container> /bin/sh

# 查看容器详细信息
docker inspect <container>

# 查看容器资源使用
docker stats <container>

# ==================== Docker Compose ====================

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f <service>

# 重新构建并启动
docker-compose up -d --build

# 强制重新创建容器
docker-compose up -d --force-recreate
```

### 8.2 镜像迁移完整流程

```bash
# ==================== 步骤1: 在源机器导出 ====================

# 列出所有需要迁移的镜像
docker images | grep -E "^topems|^postgres|^redis|^nginx|^rust|^node"

# 导出所有相关镜像
docker save \
    $(docker images | grep -E "^topems" | awk '{print $1":"$2}') \
    postgres:16-alpine \
    redis:7-alpine \
    nginx:1.25-alpine \
    -o topems-all-images.tar

# 压缩以节省传输时间
gzip -9 topems-all-images.tar

# ==================== 步骤2: 传输镜像 ====================

# 方法1: SCP (局域网)
scp topems-all-images.tar.gz user@target-server:/data/

# 方法2: NFS挂载
mount -t nfs nfs-server:/share /mnt
cp topems-all-images.tar.gz /mnt/

# 方法3: U盘
# 挂载U盘，复制文件

# ==================== 步骤3: 在目标机器导入 ====================

# 解压
gunzip topems-all-images.tar.gz

# 导入镜像
docker load -i topems-all-images.tar

# 验证
docker images | grep topems

# ==================== 步骤4: 清理 ====================

# 删除 tar 文件节省空间
rm topems-all-images.tar

# 清理未使用的镜像、容器、网络
docker system prune -a -f --volumes
```

### 8.3 Docker 网络配置

```bash
# ==================== 创建专用网络 ====================

# 创建 bridge 网络
docker network create --driver bridge \
    --subnet=172.20.0.0/16 \
    --gateway=172.20.0.1 \
    topems-network

# 查看网络
docker network ls
docker network inspect topems-network

# 将容器连接到网络
docker network connect topems-network <container>

# 将容器从网络断开
docker network disconnect topems-network <container>

# ==================== 网络模式说明 ====================

# bridge (默认): 容器通过 docker0 网桥通信
# host: 容器直接使用宿主机网络
# overlay: 跨主机容器通信 (Swarm模式)
# none: 禁用网络
```

### 8.4 Docker 数据卷管理

```bash
# ==================== 数据卷操作 ====================

# 创建命名卷
docker volume create topems-postgres-data

# 查看卷列表
docker volume ls

# 查看卷详情
docker volume inspect topems-postgres-data

# 备份卷
docker run --rm \
    -v topems-postgres-data:/data \
    -v $(pwd):/backup \
    alpine \
    tar czf /backup/postgres-backup.tar.gz -C /data .

# 恢复卷
docker run --rm \
    -v topems-postgres-data:/data \
    -v $(pwd):/backup \
    alpine \
    tar xzf /backup/postgres-backup.tar.gz -C /data

# 删除未使用的卷
docker volume prune

# ==================== 绑定挂载示例 ====================

# 挂载本地目录到容器
docker run -d \
    --name topems-postgres \
    -v /data/postgres:/var/lib/postgresql/data \
    postgres:16

# 挂载配置文件
docker run -d \
    --name topems-nginx \
    -v /data/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
    nginx
```

### 8.5 Docker 健康检查

```bash
# ==================== 检查容器健康状态 ====================

# 查看健康状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 详细检查
docker inspect --format='{{json .State.Health}}' <container> | jq

# ==================== 手动健康检查 ====================

# PostgreSQL
docker exec <container> pg_isready -U topems

# Redis
docker exec <container> redis-cli ping

# HTTP 服务
curl -f http://localhost:8000/api/v1/health || exit 1

# ==================== 日志分析 ====================

# 查看错误日志
docker logs <container> --tail 100 --stderr

# 实时跟踪日志
docker logs -f <container>

# 按时间过滤
docker logs --since "2024-01-01T00:00:00" <container>

# 搜索错误关键词
docker logs <container> | grep -i error

# ==================== 资源限制 ====================

# 限制 CPU 和内存
docker run -d \
    --name topems-service \
    --memory="2g" \
    --memory-swap="4g" \
    --cpus="2" \
    topems-service:latest

# 更新运行中容器的资源限制
docker update --memory="4g" --cpus="4" <container>
```

---

## 九、验证部署

### 9.1 服务状态检查

```bash
#!/bin/bash
# 文件: check-status.sh
# 部署状态检查脚本

echo "=============================================="
echo "TOPEMS 部署状态检查"
echo "=============================================="
echo ""

# 检查 Docker
echo "📦 Docker 状态:"
if docker info &> /dev/null; then
    echo "  ✅ Docker 运行正常"
else
    echo "  ❌ Docker 未运行"
    exit 1
fi

# 检查容器
echo ""
echo "🐳 容器状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep topems || echo "  ⚠️  未找到 TOPEMS 容器"

# 检查端口
echo ""
echo "🔌 端口监听:"
for port in 80 5432 6379 8000 8001 8013; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo "  ✅ 端口 $port 正常"
    else
        echo "  ⚠️  端口 $port 未监听"
    fi
done

# 检查服务健康
echo ""
echo "🏥 服务健康检查:"
services=(
    "http://localhost:8000/api/v1/health|IAM"
    "http://localhost:8001/api/v1/health|DOC"
    "http://localhost:8013/api/v1/health|AI"
)

for svc in "${services[@]}"; do
    url=$(echo $svc | cut -d'|' -f1)
    name=$(echo $svc | cut -d'|' -f2)

    if curl -sf "$url" > /dev/null 2>&1; then
        echo "  ✅ $name 健康"
    else
        echo "  ⚠️  $name 未响应"
    fi
done

# 检查资源
echo ""
echo "💾 资源使用:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep topems | head -10

echo ""
echo "=============================================="
```

### 9.2 数据库验证

```bash
#!/bin/bash
# 文件: check-db.sh
# 数据库验证脚本

POSTGRES_CONTAINER="topems-postgres"
POSTGRES_USER="${POSTGRES_USER:-topems}"
POSTGRES_DB="${POSTGRES_DB:-topems}"

echo "🗄️  数据库验证"
echo ""

# 检查容器
if ! docker ps | grep -q $POSTGRES_CONTAINER; then
    echo "❌ PostgreSQL 容器未运行"
    exit 1
fi

# 执行检查
docker exec $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB << EOF

-- 1. 检查扩展
SELECT '扩展状态:' as info;
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- 2. 检查 schema
SELECT 'Schema 列表:' as info;
SELECT schema_name FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'public')
ORDER BY schema_name;

-- 3. 检查 AI 相关表
SELECT 'AI 向量表:' as info;
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'ai'
ORDER BY table_name;

-- 4. 数据库大小
SELECT '数据库大小:' as info;
SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));

EOF

echo ""
echo "✅ 数据库检查完成"
```

---

## 十、常见问题

### Q1: 镜像拉取失败怎么办？

```bash
# 检查 Docker daemon 状态
sudo systemctl status docker

# 重启 Docker
sudo systemctl restart docker

# 检查镜像源配置
cat /etc/docker/daemon.json

# 手动拉取
docker pull postgres:16-alpine
```

### Q2: 端口冲突如何解决？

```bash
# 查找占用端口的进程
netstat -tulnp | grep 5432

# 或使用 lsof
lsof -i :5432

# 停止冲突服务或修改端口
```

### Q3: 容器启动失败怎么排查？

```bash
# 查看详细日志
docker logs -f <container> --tail 100

# 检查容器配置
docker inspect <container>

# 检查网络连通性
docker exec <container> ping postgres

# 检查依赖容器状态
docker ps -a | grep <dependency>
```

### Q4: 数据库连接失败？

```bash
# 检查 PostgreSQL 容器
docker logs topems-postgres

# 测试连接
docker exec -it topems-postgres psql -U topems -d topems

# 检查连接信息
docker exec <app-container> env | grep DATABASE
```

### Q5: 如何清理并重新部署？

```bash
# 停止所有服务
docker-compose -f docker-compose.prod.yml down

# 删除数据卷（谨慎！会丢失数据）
docker volume rm $(docker volume ls -qf name=topems)

# 清理所有相关容器和镜像
docker system prune -a -f

# 重新部署
./deploy.sh
```

### Q6: 内存不足怎么办？

```bash
# 检查内存使用
free -h
docker stats

# 限制容器内存
docker update --memory=2g --memory-swap=4g <container>

# 增加 Swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 附录 A: 快速检查清单

```
□ 服务器配置满足要求
□ 操作系统安装完成
□ Docker 和 Docker Compose 安装完成
□ 镜像包已下载并传输到服务器
□ 镜像已加载到本地
□ 网络已配置
□ 数据目录已创建
□ 环境变量已配置
□ 部署脚本已执行
□ 服务状态已验证
□ 访问地址已测试
□ 账号可正常登录
```

---

## 附录 B: 联系方式

如有问题，请提交 Issue 或联系技术支持。

---

*文档版本: 1.0*
*最后更新: 2024-01-01*
