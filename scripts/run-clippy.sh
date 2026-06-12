#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "开始检查所有 Rust 项目..."

PROJECTS=(
    "lib"
    "svc/crm"
    "svc/hrm"
    "svc/pm"
    "svc/im"
    "svc/gis"
    "svc/erp"
    "svc/flow"
    "svc/report"
    "svc/lims"
    "svc/qms"
    "svc/mes"
    "svc/bi"
    "svc/doc"
    "svc/notification"
    "svc/rs"
    "svc/mail"
    "svc/mobile"
    "svc/iam"
    "svc/integration"
    "svc/wms"
    "svc/ai"
    "svc/portal"
    "svc/ehs"
    "svc/scm"
    "svc/srm"
    "svc/pdm"
    "svc/file"
)

TOTAL_ERRORS=0
TOTAL_PROJECTS=0

for project in "${PROJECTS[@]}"; do
    PROJECT_PATH="$PROJECT_ROOT/$project"
    if [ -d "$PROJECT_PATH" ] && [ -f "$PROJECT_PATH/Cargo.toml" ]; then
        echo "========================================="
        echo "检查项目: $project"
        echo "========================================="
        TOTAL_PROJECTS=$((TOTAL_PROJECTS + 1))
        
        cd "$PROJECT_PATH" || continue
        cargo clippy --all-targets --all-features -- -D warnings 2>&1 | tee /tmp/clippy_output.txt
        
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            ERROR_COUNT=$(grep -c "error:" /tmp/clippy_output.txt || true)
            WARNING_COUNT=$(grep -c "warning:" /tmp/clippy_output.txt || true)
            echo "❌ $project 有 $ERROR_COUNT 个错误和 $WARNING_COUNT 个警告"
            TOTAL_ERRORS=$((TOTAL_ERRORS + ERROR_COUNT))
        else
            echo "✅ $project 检查通过！"
        fi
        
        cd "$PROJECT_ROOT" || exit 1
        echo ""
    else
        echo "========================================="
        echo "跳过项目: $project (目录不存在或缺少 Cargo.toml)"
        echo "========================================="
        echo ""
    fi
done

echo ""
echo "========================================="
echo "检查完成！共检查 $TOTAL_PROJECTS 个项目，总计 $TOTAL_ERRORS 个错误。"
echo "========================================="