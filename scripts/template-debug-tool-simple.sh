#!/bin/bash

# TOPEMS 模板调试工具（简化版）
# 用于快速排查模板变量替换问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印帮助信息
print_help() {
    echo "TOPEMS 模板调试工具"
    echo ""
    echo "用法: template-debug-tool-simple.sh [命令] [参数]"
    echo ""
    echo "命令:"
    echo "  check-template <模板ID>         检查模板内容和变量定义"
    echo "  test-render <模板ID> <变量JSON> 测试模板渲染"
    echo "  start-debug-server              启动带调试日志的后端服务"
    echo "  help                            显示帮助信息"
    echo ""
}

# 检查模板内容
check_template() {
    local template_id="$1"
    
    if [ -z "$template_id" ]; then
        echo -e "${RED}错误: 缺少模板ID参数${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== 检查模板内容 ===${NC}"
    echo "模板ID: $template_id"
    echo ""
    
    # 获取模板信息
    local template_info=$(curl -s "http://localhost:8024/api/v1/templates/$template_id")
    
    if [ -z "$template_info" ] || [ "$template_info" = "null" ]; then
        echo -e "${RED}错误: 无法获取模板信息${NC}"
        exit 1
    fi
    
    # 解析模板内容（API返回在data字段中）
    local name=$(echo "$template_info" | jq -r .data.name)
    local code=$(echo "$template_info" | jq -r .data.code)
    local content=$(echo "$template_info" | jq -r .data.content)
    local variables=$(echo "$template_info" | jq -r .data.variables)
    
    echo -e "${GREEN}模板基本信息:${NC}"
    echo "  名称: $name"
    echo "  编码: $code"
    echo ""
    
    echo -e "${GREEN}模板内容:${NC}"
    echo "$content"
    echo ""
    
    echo -e "${GREEN}变量定义:${NC}"
    echo "$variables" | jq .
    echo ""
}

# 测试模板渲染
test_render() {
    local template_id="$1"
    local variables="$2"
    
    if [ -z "$template_id" ]; then
        echo -e "${RED}错误: 缺少模板ID参数${NC}"
        exit 1
    fi
    
    if [ -z "$variables" ]; then
        echo -e "${RED}错误: 缺少变量JSON参数${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== 测试模板渲染 ===${NC}"
    echo "模板ID: $template_id"
    echo "变量配置: $variables"
    echo ""
    
    # 发送渲染请求
    echo -e "${GREEN}发送渲染请求...${NC}"
    local render_result=$(curl -s -X POST "http://localhost:8024/api/v1/templates/$template_id/render" \
        -H "Content-Type: application/json" \
        -d "{\"variables\": $variables}")
    
    echo ""
    echo -e "${GREEN}渲染结果:${NC}"
    echo "$render_result" | jq -r .data.content
    echo ""
}

# 启动调试服务器
start_debug_server() {
    echo -e "${BLUE}=== 启动调试服务器 ===${NC}"
    echo ""
    
    # 检查服务是否已运行
    if lsof -i :8024 > /dev/null 2>&1; then
        echo -e "${YELLOW}警告: 端口8024已被占用${NC}"
        echo "正在停止现有服务..."
        lsof -ti :8024 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    echo -e "${GREEN}启动后端服务（调试模式）...${NC}"
    echo "日志级别: DEBUG"
    echo "端口: 8024"
    echo ""
    
    cd /Users/air/TOPEMS
    RUST_LOG=debug DOC_PORT=8024 cargo run --bin topems-doc
}

# 主函数
main() {
    local command="$1"
    
    case "$command" in
        check-template)
            check_template "$2"
            ;;
        test-render)
            test_render "$2" "$3"
            ;;
        start-debug-server)
            start_debug_server
            ;;
        help|--help|-h)
            print_help
            ;;
        *)
            echo -e "${RED}错误: 未知的命令 ${command}${NC}"
            echo ""
            print_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"