#!/bin/bash

# TOPEMS AI模型管理脚本
# 特性:
# - Ollama服务管理（启动/停止/状态）
# - 模型下载和管理
# - 向量库配置
# - 模型切换和更新
# - 支持多种AI模型

set -e

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 模型配置
MODELS=(
  "qwen2.5:7b-instruct"
  "qwen2.5:14b-instruct"
  "llama3.1:8b"
  "llama3.1:70b"
  "phi3:3.8b"
  "mistral:7b"
  "nomic-embed-text"
  "all-minilm"
)

# 检查Ollama是否安装
check_ollama() {
  if ! command -v ollama &>/dev/null; then
    error "Ollama 未安装"
    echo "请运行以下命令安装 Ollama:"
    echo "  curl -fsSL https://ollama.com/install.sh | sh"
    exit 1
  fi
}

# 启动Ollama服务
start_ollama() {
  info "启动 Ollama 服务..."
  
  # 检查服务是否已运行
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    success "Ollama 服务已运行"
    return
  fi
  
  # 启动Ollama服务（后台运行）
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  OLLAMA_PID=$!
  
  # 等待服务启动
  info "等待 Ollama 服务启动..."
  for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
      success "Ollama 服务启动成功 (PID: $OLLAMA_PID)"
      echo "$OLLAMA_PID" > /tmp/ollama.pid
      return
    fi
    if [ $i -eq 30 ]; then
      error "Ollama 服务启动超时"
      exit 1
    fi
    sleep 2
  done
}

# 停止Ollama服务
stop_ollama() {
  info "停止 Ollama 服务..."
  
  if [ -f /tmp/ollama.pid ]; then
    OLLAMA_PID=$(cat /tmp/ollama.pid)
    kill "$OLLAMA_PID" 2>/dev/null || true
    rm /tmp/ollama.pid
    success "Ollama 服务已停止"
  else
    # 尝试查找并停止Ollama进程
    OLLAMA_PID=$(ps aux | grep "ollama serve" | grep -v grep | awk '{print $2}')
    if [ -n "$OLLAMA_PID" ]; then
      kill "$OLLAMA_PID"
      success "Ollama 服务已停止"
    else
      warning "Ollama 服务未运行"
    fi
  fi
}

# 查看Ollama状态
status_ollama() {
  info "检查 Ollama 服务状态..."
  
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    success "Ollama 服务运行正常"
    echo ""
    echo "已安装的模型:"
    ollama list
  else
    error "Ollama 服务未运行"
  fi
}

# 下载模型
pull_model() {
  local model="$1"
  
  if [ -z "$model" ]; then
    error "请指定要下载的模型名称"
    echo "可用模型:"
    for m in "${MODELS[@]}"; do
      echo "  - $m"
    done
    exit 1
  fi
  
  info "下载模型: $model..."
  ollama pull "$model"
  
  if ollama list | grep -q "$model"; then
    success "模型 $model 下载完成"
  else
    error "模型 $model 下载失败"
    exit 1
  fi
}

# 下载所有推荐模型
pull_all() {
  info "下载所有推荐模型..."
  
  # 基础模型
  local base_models=(
    "qwen2.5:7b-instruct"
    "nomic-embed-text"
  )
  
  # 可选大模型（需要更多内存）
  local large_models=(
    "qwen2.5:14b-instruct"
    "llama3.1:8b"
  )
  
  for model in "${base_models[@]}"; do
    info "下载基础模型: $model..."
    ollama pull "$model"
  done
  
  success "基础模型下载完成"
  
  read -p "是否下载大模型（需要更多内存，约20GB+）? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    for model in "${large_models[@]}"; do
      info "下载大模型: $model..."
      ollama pull "$model"
    done
    success "大模型下载完成"
  fi
}

# 删除模型
rm_model() {
  local model="$1"
  
  if [ -z "$model" ]; then
    error "请指定要删除的模型名称"
    exit 1
  fi
  
  info "删除模型: $model..."
  ollama rm "$model"
  
  success "模型 $model 删除完成"
}

# 查看模型信息
show_model_info() {
  local model="$1"
  
  if [ -z "$model" ]; then
    error "请指定模型名称"
    exit 1
  fi
  
  info "模型信息: $model"
  ollama show "$model"
}

# 创建模型别名
create_alias() {
  local model="$1"
  local alias="$2"
  
  if [ -z "$model" ] || [ -z "$alias" ]; then
    error "请指定模型名称和别名"
    exit 1
  fi
  
  info "创建别名: $alias -> $model..."
  ollama cp "$model" "$alias"
  
  success "别名创建完成"
}

# 测试模型
test_model() {
  local model="${1:-qwen2.5:7b-instruct}"
  
  info "测试模型: $model..."
  
  result=$(curl -s http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"$model\", \"prompt\": \"Hello, who are you?\", \"stream\": false}")
  
  if echo "$result" | grep -q "response"; then
    response=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['response'])")
    success "模型响应成功"
    echo "响应: $response"
  else
    error "模型测试失败"
    echo "$result"
    exit 1
  fi
}

# 配置向量库
config_vector_db() {
  info "配置向量库..."
  
  # 检查PostgreSQL是否支持向量
  if psql -U topems -d topems -c "SELECT 1 FROM pg_extension WHERE extname = 'vector'" >/dev/null 2>&1; then
    success "向量扩展已安装"
  else
    info "安装向量扩展..."
    psql -U topems -d topems -c "CREATE EXTENSION IF NOT EXISTS vector"
    success "向量扩展安装完成"
  fi
  
  # 创建向量表（如果需要）
  info "检查向量表..."
  if psql -U topems -d topems -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks'" >/dev/null 2>&1; then
    success "向量表已存在"
  else
    warning "向量表不存在，AI服务启动时会自动创建"
  fi
}

# 更新模型
update_model() {
  local model="$1"
  
  if [ -z "$model" ]; then
    error "请指定要更新的模型名称"
    exit 1
  fi
  
  info "更新模型: $model..."
  ollama pull "$model" --force
  
  success "模型 $model 更新完成"
}

# 导出模型
export_model() {
  local model="$1"
  local output="$2"
  
  if [ -z "$model" ] || [ -z "$output" ]; then
    error "请指定模型名称和输出路径"
    exit 1
  fi
  
  info "导出模型: $model -> $output..."
  ollama export "$model" "$output"
  
  success "模型导出完成"
}

# 导入模型
import_model() {
  local input="$1"
  local name="$2"
  
  if [ -z "$input" ] || [ -z "$name" ]; then
    error "请指定输入文件和模型名称"
    exit 1
  fi
  
  info "导入模型: $input -> $name..."
  ollama import "$name" < "$input"
  
  success "模型导入完成"
}

# 主入口
case "$1" in
  start)
    check_ollama
    start_ollama
    ;;
  stop)
    stop_ollama
    ;;
  status)
    check_ollama
    status_ollama
    ;;
  pull)
    check_ollama
    pull_model "$2"
    ;;
  pull-all)
    check_ollama
    pull_all
    ;;
  rm)
    check_ollama
    rm_model "$2"
    ;;
  info)
    check_ollama
    show_model_info "$2"
    ;;
  alias)
    check_ollama
    create_alias "$2" "$3"
    ;;
  test)
    check_ollama
    test_model "$2"
    ;;
  config-vector)
    config_vector_db
    ;;
  update)
    check_ollama
    update_model "$2"
    ;;
  export)
    check_ollama
    export_model "$2" "$3"
    ;;
  import)
    check_ollama
    import_model "$2" "$3"
    ;;
  *)
    echo "TOPEMS AI模型管理脚本"
    echo ""
    echo "使用方法: $0 <命令> [参数]"
    echo ""
    echo "命令说明:"
    echo "  start           - 启动 Ollama 服务"
    echo "  stop            - 停止 Ollama 服务"
    echo "  status          - 查看 Ollama 服务状态"
    echo "  pull <模型>     - 下载指定模型"
    echo "  pull-all        - 下载所有推荐模型"
    echo "  rm <模型>       - 删除指定模型"
    echo "  info <模型>     - 查看模型信息"
    echo "  alias <模型> <别名> - 为模型创建别名"
    echo "  test [模型]     - 测试模型响应"
    echo "  config-vector   - 配置向量库"
    echo "  update <模型>   - 更新指定模型"
    echo "  export <模型> <路径> - 导出模型"
    echo "  import <文件> <名称> - 导入模型"
    echo ""
    echo "可用模型:"
    echo "  - qwen2.5:7b-instruct    (推荐，约14GB)"
    echo "  - qwen2.5:14b-instruct   (约28GB)"
    echo "  - llama3.1:8b             (约16GB)"
    echo "  - llama3.1:70b            (约140GB)"
    echo "  - phi3:3.8b               (约8GB)"
    echo "  - mistral:7b              (约14GB)"
    echo "  - nomic-embed-text        (文本嵌入，约2GB)"
    echo "  - all-minilm              (文本嵌入，约1GB)"
    exit 1
    ;;
esac