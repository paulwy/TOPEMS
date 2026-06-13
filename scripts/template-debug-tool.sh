#!/bin/bash

# TOPEMS 模板调试工具
# 用于快速排查模板变量替换问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印帮助信息
print_help() {
    echo "TOPEMS 模板调试工具"
    echo ""
    echo "用法: template-debug-tool.sh [命令] [参数]"
    echo ""
    echo "命令:"
    echo "  check-template <模板ID>         检查模板内容和变量定义"
    echo "  test-render <模板ID> <变量JSON> 测试模板渲染（使用提供的变量）"
    echo "  find-unused-vars <模板ID>       查找模板中未使用的变量"
    echo "  validate-vars <模板ID> <变量JSON> 验证变量配置是否完整"
    echo "  compare-result <模板ID> <期望结果> 对比渲染结果与期望结果"
    echo "  start-debug-server              启动带调试日志的后端服务"
    echo "  generate-test-case <模板ID>     生成测试用例"
    echo "  help                            显示帮助信息"
    echo ""
    echo "示例:"
    echo "  template-debug-tool.sh check-template abc123"
    echo "  template-debug-tool.sh test-render abc123 '{\"name\":\"测试\"}'"
    echo "  template-debug-tool.sh start-debug-server"
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
        echo -e "${RED}错误: 无法获取模板信息，请检查模板ID是否正确${NC}"
        exit 1
    fi
    
    # 解析模板内容
    local name=$(echo "$template_info" | jq -r .name)
    local code=$(echo "$template_info" | jq -r .code)
    local content=$(echo "$template_info" | jq -r '.content')
    local variables=$(echo "$template_info" | jq -r '.variables')
    
    echo -e "${GREEN}模板基本信息:${NC}"
    echo "  名称: $name"
    echo "  编码: $code"
    echo ""
    
    echo -e "${GREEN}模板内容:${NC}"
    echo "$content"
    echo ""
    
    echo -e "${GREEN}变量定义:${NC}"
    echo "$variables" | jq '.'
    echo ""
    
    # 查找模板中的变量引用
    echo -e "${YELLOW}=== 查找模板中的变量引用 ===${NC}"
    local vars=$(echo "$content" | grep -oE '\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}' | sort -u)
    
    if [ -n "$vars" ]; then
        echo "找到的变量引用:"
        echo "$vars" | while read var; do
            echo "  - $var"
        done
    else
        echo -e "${YELLOW}警告: 模板中没有找到变量引用${NC}"
    fi
    
    # 查找条件判断
    echo ""
    echo -e "${YELLOW}=== 查找条件判断块 ===${NC}"
    local conditions=$(echo "$content" | grep -oE '\{\{#if [a-zA-Z_][a-zA-Z0-9_]*\}\}')
    
    if [ -n "$conditions" ]; then
        echo "找到的条件判断:"
        echo "$conditions" | while read cond; do
            echo "  - $cond"
        done
    else
        echo "没有找到条件判断"
    fi
    
    # 查找默认值
    echo ""
    echo -e "${YELLOW}=== 查找默认值块 ===${NC}"
    local defaults=$(echo "$content" | grep -oE '\{\{[a-zA-Z_][a-zA-Z0-9_]* \|\| ["\'][^"\']*["\']\}\}')
    
    if [ -n "$defaults" ]; then
        echo "找到的默认值块:"
        echo "$defaults" | while read def; do
            echo "  - $def"
        done
    else
        echo "没有找到默认值块"
    fi
    
    # 查找动态变量
    echo ""
    echo -e "${YELLOW}=== 查找动态变量 ===${NC}"
    local dynamic_vars=$(echo "$content" | grep -oE '\{\{(today|now|now_date|now_time|now_timestamp)\}\}' | sort -u)
    
    if [ -n "$dynamic_vars" ]; then
        echo "找到的动态变量:"
        echo "$dynamic_vars" | while read dyn; do
            echo "  - $dyn"
        done
    else
        echo "没有找到动态变量"
    fi
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
    
    # 获取模板信息
    local template_info=$(curl -s "http://localhost:8024/api/v1/templates/$template_id")
    
    if [ -z "$template_info" ] || [ "$template_info" = "null" ]; then
        echo -e "${RED}错误: 无法获取模板信息${NC}"
        exit 1
    fi
    
    local content=$(echo "$template_info" | jq -r '.content')
    
    # 创建渲染请求
    local render_request=$(cat <<EOF
{
    "template_id": "$template_id",
    "variables": $variables
}
EOF
)
    
    # 发送渲染请求
    echo -e "${GREEN}发送渲染请求...${NC}"
    local render_result=$(curl -s -X POST "http://localhost:8024/api/v1/templates/render" \
        -H "Content-Type: application/json" \
        -d "$render_request")
    
    echo ""
    echo -e "${GREEN}渲染结果:${NC}"
    echo "$render_result" | jq -r '.rendered_content'
    echo ""
    
    # 检查未处理的变量
    local rendered_content=$(echo "$render_result" | jq -r '.rendered_content')
    local remaining_vars=$(echo "$rendered_content" | grep -oE '\{\{[^#/][^}]+\}\}')
    
    if [ -n "$remaining_vars" ]; then
        echo -e "${YELLOW}警告: 发现未处理的变量:${NC}"
        echo "$remaining_vars" | while read var; do
            echo "  - $var"
        done
    else
        echo -e "${GREEN}✅ 所有变量已成功处理${NC}"
    fi
}

# 查找未使用的变量
find_unused_vars() {
    local template_id="$1"
    
    if [ -z "$template_id" ]; then
        echo -e "${RED}错误: 缺少模板ID参数${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== 查找未使用的变量 ===${NC}"
    echo "模板ID: $template_id"
    echo ""
    
    # 获取模板信息
    local template_info=$(curl -s "http://localhost:8024/api/v1/templates/$template_id")
    
    if [ -z "$template_info" ] || [ "$template_info" = "null" ]; then
        echo -e "${RED}错误: 无法获取模板信息${NC}"
        exit 1
    fi
    
    local content=$(echo "$template_info" | jq -r '.content')
    local variables=$(echo "$template_info" | jq -r '.variables')
    
    # 获取变量定义中的变量名
    local defined_vars=$(echo "$variables" | jq -r '.[]?.key' | sort -u)
    
    # 获取模板中引用的变量名
    local used_vars=$(echo "$content" | grep -oE {{[a-zA-Z_][a-zA-Z0-9_]*}} | sed s/{{//g | sed s/}}//g | sort -u)
    
    echo -e "${GREEN}定义的变量:${NC}"
    if [ -n "$defined_vars" ]; then
        echo "$defined_vars" | while read var; do
            echo "  - $var"
        done
    else
        echo "  (无)"
    fi
    
    echo ""
    echo -e "${GREEN}模板中引用的变量:${NC}"
    if [ -n "$used_vars" ]; then
        echo "$used_vars" | while read var; do
            echo "  - $var"
        done
    else
        echo "  (无)"
    fi
    
    echo ""
    echo -e "${YELLOW}未使用的变量:${NC}"
    local unused_found=false
    
    if [ -n "$defined_vars" ]; then
        echo "$defined_vars" | while read defined_var; do
            if ! echo "$used_vars" | grep -q "^$defined_var$"; then
                echo -e "${YELLOW}  - $defined_var (定义但未使用)${NC}"
                unused_found=true
            fi
        done
    fi
    
    if [ "$unused_found" = false ]; then
        echo -e "${GREEN}  ✅ 所有定义的变量都在模板中使用${NC}"
    fi
}

# 验证变量配置
validate_vars() {
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
    
    echo -e "${BLUE}=== 验证变量配置 ===${NC}"
    echo "模板ID: $template_id"
    echo "变量配置: $variables"
    echo ""
    
    # 获取模板信息
    local template_info=$(curl -s "http://localhost:8024/api/v1/templates/$template_id")
    
    if [ -z "$template_info" ] || [ "$template_info" = "null" ]; then
        echo -e "${RED}错误: 无法获取模板信息${NC}"
        exit 1
    fi
    
    local content=$(echo "$template_info" | jq -r .content)
    local var_defs=$(echo "$template_info" | jq -r .variables)
    
    # 获取模板中引用的变量名
    local used_vars=$(echo "$content" | grep -oE {{[a-zA-Z_][a-zA-Z0-9_]*}} | sed s/{{//g | sed s/}}//g | sort -u)
    
    # 获取配置中的变量名
    local config_vars=$(echo "$variables" | jq -r keys[] | sort -u)
    
    echo -e "${GREEN}模板中引用的变量:${NC}"
    if [ -n "$used_vars" ]; then
        echo "$used_vars" | while read var; do
            echo "  - $var"
        done
    else
        echo "  (无)"
    fi
    
    echo ""
    echo -e "${GREEN}配置中的变量:${NC}"
    if [ -n "$config_vars" ]; then
        echo "$config_vars" | while read var; do
            echo "  - $var"
        done
    else
        echo "  (无)"
    fi
    
    echo ""
    echo -e "${YELLOW}验证结果:${NC}"
    local missing_vars=""
    local extra_vars=""
    
    # 检查缺失的变量
    if [ -n "$used_vars" ]; then
        echo "$used_vars" | while read used_var; do
            # 排除动态变量
            if [[ "$used_var" != "today" ]] && [[ "$used_var" != "now" ]] && \
               [[ "$used_var" != "now_date" ]] && [[ "$used_var" != "now_time" ]] && \
               [[ "$used_var" != "now_timestamp" ]]; then
                if ! echo "$config_vars" | grep -q "^$used_var$"; then
                    # 检查是否有默认值
                    if ! echo "$content" | grep -qE "\{\{$used_var \|\| "; then
                        echo -e "${RED}  ❌ 缺少变量: $used_var${NC}"
                        missing_vars="$missing_vars $used_var"
                    else
                        echo -e "${YELLOW}  ⚠️ 变量 $used_var 未配置，但有默认值${NC}"
                    fi
                fi
            fi
        done
    fi
    
    # 检查多余的变量
    if [ -n "$config_vars" ]; then
        echo "$config_vars" | while read config_var; do
            if ! echo "$used_vars" | grep -q "^$config_var$"; then
                echo -e "${YELLOW}  ⚠️ 多余变量: $config_var (配置但模板未引用)${NC}"
                extra_vars="$extra_vars $config_var"
            fi
        done
    fi
    
    if [ -z "$missing_vars" ] && [ -z "$extra_vars" ]; then
        echo -e "${GREEN}  ✅ 变量配置完整且正确${NC}"
    fi
}

# 对比渲染结果
compare_result() {
    local template_id="$1"
    local expected_result="$2"
    
    if [ -z "$template_id" ]; then
        echo -e "${RED}错误: 缺少模板ID参数${NC}"
        exit 1
    fi
    
    if [ -z "$expected_result" ]; then
        echo -e "${RED}错误: 缺少期望结果参数${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== 对比渲染结果 ===${NC}"
    echo "模板ID: $template_id"
    echo ""
    
    # 这里需要用户提供变量配置，暂时跳过
    echo -e "${YELLOW}注意: 此功能需要提供变量配置${NC}"
    echo "请使用 test-render 命令先进行渲染测试"
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
    
    echo ""
    echo -e "${GREEN}调试服务器已启动${NC}"
    echo "API地址: http://localhost:8024"
    echo "查看日志: 终端输出"
}

# 生成测试用例
generate_test_case() {
    local template_id="$1"
    
    if [ -z "$template_id" ]; then
        echo -e "${RED}错误: 缺少模板ID参数${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}=== 生成测试用例 ===${NC}"
    echo "模板ID: $template_id"
    echo ""
    
    # 获取模板信息
    local template_info=$(curl -s "http://localhost:8024/api/v1/templates/$template_id")
    
    if [ -z "$template_info" ] || [ "$template_info" = "null" ]; then
        echo -e "${RED}错误: 无法获取模板信息${NC}"
        exit 1
    fi
    
    local name=$(echo "$template_info" | jq -r .name)
    local code=$(echo "$template_info" | jq -r .code)
    
    # 生成测试用例文件名
    local test_file="/Users/air/TOPEMS/tests/template_${code}_test.sh"
    
    echo -e "${GREEN}生成测试用例文件: $test_file${NC}"
    echo "注意: 此功能需要手动编写测试用例"
    echo "模板名称: $name"
    echo "模板编码: $code"
    echo ""
    echo -e "${GREEN}测试用例模板:${NC}"
    echo "#!/bin/bash"
    echo "# 模板测试用例: $name"
    echo "# 模板ID: $template_id"
    echo ""
    echo "# 测试变量配置"
    echo "# test_vars={变量名:值}"
    echo ""
    echo "# 执行渲染测试"
    echo "# curl -X POST http://localhost:8024/api/v1/templates/render"
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
        find-unused-vars)
            find_unused_vars "$2"
            ;;
        validate-vars)
            validate_vars "$2" "$3"
            ;;
        compare-result)
            compare_result "$2" "$3"
            ;;
        start-debug-server)
            start_debug_server
            ;;
        generate-test-case)
            generate_test_case "$2"
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