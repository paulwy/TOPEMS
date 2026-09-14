#!/bin/bash

# TOPEMS UI 重设计迁移 - 快速启动脚本
# 用法：
#   ./scripts/enable-ui-v3.sh          # 启用新布局
#   ./scripts/enable-ui-v3.sh --disable # 禁用新布局（回退旧布局）
#   ./scripts/enable-ui-v3.sh --status  # 查看当前状态

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/apps/web/.env.local"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 .env.local 是否存在
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        print_info "创建 .env.local 文件..."
        touch "$ENV_FILE"
    fi
}

# 启用新布局
enable_ui_v3() {
    print_info "启用 Industrial OS V3 新布局..."

    check_env_file

    # 检查是否已经启用
    if grep -q "VITE_UI_V3_ENABLED=true" "$ENV_FILE"; then
        print_warning "新布局已经启用，无需重复操作。"
        show_status
        return 0
    fi

    # 移除旧的配置（如果存在）
    if grep -q "VITE_UI_V3_ENABLED" "$ENV_FILE"; then
        print_info "更新现有配置..."
        sed -i '' 's/VITE_UI_V3_ENABLED=.*/VITE_UI_V3_ENABLED=true/' "$ENV_FILE"
    else
        print_info "添加新配置..."
        echo "" >> "$ENV_FILE"
        echo "# UI 版本控制" >> "$ENV_FILE"
        echo "VITE_UI_V3_ENABLED=true" >> "$ENV_FILE"
    fi

    print_success "新布局已启用！"
    echo ""
    echo "下一步："
    echo "  1. 重启开发服务器：cd apps/web && pnpm dev"
    echo "  2. 访问以下页面验证新布局："
    echo "     - /dashboard          工作台首页"
    echo "     - /iam/users          用户管理"
    echo "     - /iam/roles          角色管理"
    echo "     - /admin/tenants      租户管理"
    echo "     - /admin/settings     系统设置"
    echo "     - /notifications      消息中心"
    echo "     - /workflow/approvals 审批中心"
    echo "     - /oa/announcements   公告管理"
    echo "     - /mes/work-orders    工单管理"
    echo "     - /erp/purchase-orders 采购订单"
    echo ""
    echo "如需回退旧布局，运行：./scripts/enable-ui-v3.sh --disable"
}

# 禁用新布局（回退旧布局）
disable_ui_v3() {
    print_info "禁用新布局，回退到旧布局..."

    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env.local 文件不存在，新布局未启用。"
        return 0
    fi

    if grep -q "VITE_UI_V3_ENABLED=true" "$ENV_FILE"; then
        sed -i '' 's/VITE_UI_V3_ENABLED=true/VITE_UI_V3_ENABLED=false/' "$ENV_FILE"
        print_success "已回退到旧布局！"
        echo ""
        echo "下一步："
        echo "  1. 重启开发服务器：cd apps/web && pnpm dev"
        echo "  2. 页面将使用旧布局（SmartLayout / GlobalLayout）"
        echo ""
        echo "如需重新启用新布局，运行：./scripts/enable-ui-v3.sh"
    else
        print_warning "新布局未启用，无需回退。"
    fi
}

# 查看当前状态
show_status() {
    print_info "当前 UI 布局状态："
    echo ""

    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env.local 文件不存在"
        echo "  状态：未配置（默认使用旧布局）"
        return 0
    fi

    if grep -q "VITE_UI_V3_ENABLED=true" "$ENV_FILE"; then
        print_success "新布局已启用 (VITE_UI_V3_ENABLED=true)"
        echo "  桌面端：GlobalLayoutV3 (AppShell + TopBar + SideRail)"
        echo "  移动端：MobileLayoutV3 (底部 5 Tab 导航)"
    elif grep -q "VITE_UI_V3_ENABLED=false" "$ENV_FILE"; then
        print_warning "新布局已禁用 (VITE_UI_V3_ENABLED=false)"
        echo "  当前使用旧布局（SmartLayout / GlobalLayout）"
    else
        print_warning "未配置 VITE_UI_V3_ENABLED（默认使用旧布局）"
    fi

    echo ""
    echo "已迁移页面（10 个）："
    echo "  P0：DashboardPage / NotificationCenter"
    echo "  P1：UserManagementPage / RoleManagementPage / TenantManagementPage / SystemSettingsPage"
    echo "  P2：WorkflowApprovalsPage / AnnouncementPage"
    echo "  P3：MesWorkOrderPage / PurchaseOrderPage / ScmPurchaseOrderPage"
    echo ""
    echo "参考文档："
    echo "  - UI_MIGRATION_GUIDE.md    迁移指南"
    echo "  - CHANGELOG_UI_MIGRATION.md 变更日志"
    echo "  - TODO.md                    任务进度"
}

# 主函数
main() {
    case "${1:-}" in
        --disable|-d)
            disable_ui_v3
            ;;
        --status|-s)
            show_status
            ;;
        --help|-h)
            echo "TOPEMS UI 重设计迁移 - 快速启动脚本"
            echo ""
            echo "用法："
            echo "  ./scripts/enable-ui-v3.sh          启用新布局"
            echo "  ./scripts/enable-ui-v3.sh --disable 禁用新布局（回退旧布局）"
            echo "  ./scripts/enable-ui-v3.sh --status  查看当前状态"
            echo "  ./scripts/enable-ui-v3.sh --help    显示帮助信息"
            echo ""
            echo "示例："
            echo "  # 启用新布局"
            echo "  ./scripts/enable-ui-v3.sh"
            echo ""
            echo "  # 回退旧布局"
            echo "  ./scripts/enable-ui-v3.sh --disable"
            echo ""
            echo "  # 查看状态"
            echo "  ./scripts/enable-ui-v3.sh --status"
            ;;
        *)
            enable_ui_v3
            ;;
    esac
}

main "$@"
