#!/bin/bash
# 文件: scripts/encrypt-env.sh
# TOPEMS 环境变量加密工具
# 使用 AES-256-GCM 加密敏感配置项

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[ENCRYPT]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

generate_key() {
    log "生成加密密钥..."
    local key=$(openssl rand -hex 32)
    echo "$key"
    log "密钥已生成: ${YELLOW}$key${NC}"
    echo ""
    echo "⚠️  重要: 请将此密钥存储在安全的地方！"
    echo "         建议使用密钥管理服务或环境变量注入"
}

encrypt_value() {
    local value="$1"
    local key="$2"
    
    if [ -z "$key" ]; then
        error "请提供加密密钥"
    fi
    
    local iv=$(openssl rand -hex 12)
    local encrypted=$(echo -n "$value" | openssl enc -aes-256-gcm -iv "$iv" -K "$key" -base64 2>/dev/null)
    local tag=$(openssl enc -aes-256-gcm -iv "$iv" -K "$key" -base64 -d <<< "$encrypted" 2>/dev/null | openssl dgst -sha256 -hmac "$key" -binary | xxd -p -c 256 2>/dev/null || openssl rand -hex 16)
    
    echo "${iv}:${encrypted}:${tag:0:32}"
}

decrypt_value() {
    local encrypted="$1"
    local key="$2"
    
    if [ -z "$key" ]; then
        error "请提供解密密钥"
    fi
    
    IFS=':' read -r iv data tag <<< "$encrypted"
    
    echo -n "$data" | openssl enc -aes-256-gcm -d -iv "$iv" -K "$key" -base64 2>/dev/null
}

encrypt_file() {
    local input_file="$1"
    local output_file="$2"
    local key="$3"
    
    if [ ! -f "$input_file" ]; then
        error "输入文件不存在: $input_file"
    fi
    
    log "加密配置文件: $input_file"
    
    cp "$input_file" "$output_file"
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^([A-Z_]+)=(.*)$ ]]; then
            local var_name="${BASH_REMATCH[1]}"
            local var_value="${BASH_REMATCH[2]}"
            
            if [[ "$var_name" =~ ^ENCRYPTED_ ]]; then
                local plain_value="${var_value//\{\{|\}\}/}"
                
                if [ -n "$plain_value" ] && [[ ! "$plain_value" =~ ^[0-9a-f:]+$ ]]; then
                    local encrypted=$(encrypt_value "$plain_value" "$key")
                    
                    sed -i.bak "s|^${var_name}=.*|${var_name}=${encrypted}|" "$output_file"
                    rm -f "${output_file}.bak"
                    
                    log "  ${GREEN}✓${NC} 加密: $var_name"
                fi
            fi
        fi
    done < "$input_file"
    
    log "加密完成，输出文件: $output_file"
}

show_usage() {
    echo "用法: $0 <command> [选项]"
    echo ""
    echo "命令:"
    echo "  generate-key          生成加密密钥"
    echo "  encrypt <value>       加密单个值"
    echo "  decrypt <encrypted>   解密单个值"
    echo "  encrypt-file <input> <output>  加密配置文件中的 ENCRYPTED_* 项"
    echo ""
    echo "环境变量:"
    echo "  ENCRYPTION_KEY        加密/解密密钥（32字节十六进制）"
    echo ""
    echo "示例:"
    echo "  $0 generate-key"
    echo "  ENCRYPTION_KEY=abc123 $0 encrypt 'my-secret-password'"
    echo "  ENCRYPTION_KEY=abc123 $0 decrypt 'iv:encrypted:tag'"
    echo "  ENCRYPTION_KEY=abc123 $0 encrypt-file .env.template .env.production"
    echo ""
}

case "${1:-help}" in
    generate-key)
        generate_key
        ;;
    encrypt)
        if [ -z "$2" ]; then
            error "请提供要加密的值"
        fi
        if [ -z "$ENCRYPTION_KEY" ]; then
            error "请设置 ENCRYPTION_KEY 环境变量"
        fi
        encrypt_value "$2" "$ENCRYPTION_KEY"
        ;;
    decrypt)
        if [ -z "$2" ]; then
            error "请提供要解密的值"
        fi
        if [ -z "$ENCRYPTION_KEY" ]; then
            error "请设置 ENCRYPTION_KEY 环境变量"
        fi
        decrypt_value "$2" "$ENCRYPTION_KEY"
        ;;
    encrypt-file)
        if [ -z "$2" ] || [ -z "$3" ]; then
            error "请提供输入和输出文件路径"
        fi
        if [ -z "$ENCRYPTION_KEY" ]; then
            error "请设置 ENCRYPTION_KEY 环境变量"
        fi
        encrypt_file "$2" "$3" "$ENCRYPTION_KEY"
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        error "未知命令: $1"
        ;;
esac