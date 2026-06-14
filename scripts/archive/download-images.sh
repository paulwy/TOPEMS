#!/bin/bash
# 文件: scripts/download-images.sh
# 下载所有必需镜像的脚本 (在有网络的机器上执行)

set -e

OUTPUT_DIR="./topems-images"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=============================================="
echo "TOPEMS 镜像下载脚本"
echo "=============================================="
echo ""
echo "⏰ 开始时间: $(date)"
echo "📁 输出目录: ${OUTPUT_DIR}"
echo ""

# 创建输出目录
mkdir -p ${OUTPUT_DIR}

# ==================== 需要下载的镜像 ====================

# 基础设施镜像
INFRASTRUCTURE_IMAGES=(
    "ankane/pgvector:v0.7.4-pg16"
    "postgres:16-alpine"
    "redis:7-alpine"
    "redis:7.2-alpine"
    "nginx:1.25-alpine"
    "nginx:1.26-alpine"
    "rust:1.75-slim"
    "rust:1.80-slim"
    "node:20-alpine"
    "node:22-alpine"
    "alpine:latest"
)

# TOPEMS 服务镜像 (如果已有构建好的)
TOPEMS_IMAGES=(
    "topems/iam-service:latest"
    "topems/doc-service:latest"
    "topems/flow-service:latest"
    "topems/ai-service:latest"
    "topems/frontend:latest"
)

# ==================== 下载函数 ====================

download_image() {
    local image=$1
    local max_retries=3
    local retry=0

    echo -n "  📥 下载: ${image} ... "

    while [ $retry -lt $max_retries ]; do
        if docker pull ${image} 2>/dev/null; then
            echo "✅"
            return 0
        fi
        retry=$((retry + 1))
        echo ""
        echo "    ⚠️  重试 ($retry/$max_retries)..."
        sleep 5
    done

    echo "❌"
    echo "    💡 提示: 可以手动下载或使用其他镜像源"
    return 1
}

# ==================== 主流程 ====================

# 下载基础设施镜像
echo "📦 阶段1: 下载基础设施镜像"
echo "----------------------------------------------"
for img in "${INFRASTRUCTURE_IMAGES[@]}"; do
    download_image "$img" || true
done

# 下载 TOPEMS 镜像 (如果存在)
echo ""
echo "📦 阶段2: 下载 TOPEMS 服务镜像"
echo "----------------------------------------------"
for img in "${TOPEMS_IMAGES[@]}"; do
    download_image "$img" || true
done

# ==================== 保存镜像 ====================

echo ""
echo "💾 阶段3: 保存镜像到 tar 文件"
echo "----------------------------------------------"

# 获取所有已下载的镜像
ALL_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "^(ankane/pgvector|postgres|redis|nginx|rust|node|topems)/" | grep -v "<none>")

if [ -z "$ALL_IMAGES" ]; then
    echo "⚠️  未找到任何镜像，请检查下载是否成功"
    exit 1
fi

# 保存所有镜像
echo "📦 保存所有镜像..."
docker save $ALL_IMAGES -o ${OUTPUT_DIR}/all-images-${TIMESTAMP}.tar

# 压缩
echo "🗜️  压缩镜像包..."
gzip -9 ${OUTPUT_DIR}/all-images-${TIMESTAMP}.tar

# ==================== 生成清单 ====================

echo ""
echo "📋 生成镜像清单..."
cat > ${OUTPUT_DIR}/manifest.txt << EOF
# TOPEMS Docker 镜像清单
# 生成时间: $(date)
# 包含镜像: $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "^(ankane/pgvector|postgres|redis|nginx|rust|node|topems)/" | grep -v "<none>" | wc -l) 个

$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "^(ankane/pgvector|postgres|redis|nginx|rust|node|topems)/" | grep -v "<none>" | sort)

# 文件信息
文件: all-images-${TIMESTAMP}.tar.gz
大小: $(du -h ${OUTPUT_DIR}/all-images-${TIMESTAMP}.tar.gz 2>/dev/null | cut -f1 || echo "未知")
SHA256: $(sha256sum ${OUTPUT_DIR}/all-images-${TIMESTAMP}.tar.gz 2>/dev/null | cut -d' ' -f1 || echo "计算失败")

# 使用说明
# 1. 复制整个 ${OUTPUT_DIR} 目录到目标服务器
# 2. 在目标服务器执行: docker load -i all-images-${TIMESTAMP}.tar.gz
# 3. 验证: docker images | grep -E "postgres|redis|nginx|topems"
EOF

# ==================== 完成 ====================

echo ""
echo "=============================================="
echo "✅ 镜像下载完成!"
echo "=============================================="
echo ""
echo "📦 镜像包位置: ${OUTPUT_DIR}/all-images-${TIMESTAMP}.tar.gz"
echo "📋 清单文件: ${OUTPUT_DIR}/manifest.txt"
echo "💾 包大小: $(du -h ${OUTPUT_DIR}/all-images-${TIMESTAMP}.tar.gz | cut -f1)"
echo ""
echo "⏰ 完成时间: $(date)"
echo ""
echo "💡 下一步:"
echo "   1. 将 ${OUTPUT_DIR} 目录复制到目标服务器"
echo "   2. 在目标服务器执行: docker load -i all-images-${TIMESTAMP}.tar.gz"
echo ""
