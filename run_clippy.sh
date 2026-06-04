#!/bin/bash

# 这个脚本会遍历所有包含 Cargo.toml 的目录并运行 clippy

echo "开始检查所有 Rust 项目..."

PROJECTS=(
    "shared/lib"
    "services/topems-crm/backend"
    "services/topems-hrm/backend"
    "services/topems-pm/backend"
    "services/topems-im/backend"
    "services/topems-gis/backend"
    "services/topems-erp/backend"
    "platform/topems-flow/backend"
    "services/report-service"
    "services/topems-lims/backend"
    "services/topems-qms/backend"
    "services/topems-mes/backend"
    "services/topems-bi/backend"
    "platform/topems-doc/backend"
    "services/notification-service"
    "services/topems-rs/backend"
    "services/topems-mail/backend"
    "services/topems-mobile/backend"
    "platform/topems-iam/backend"
    "services/topems-integration/backend"
    "services/topems-wms/backend"
    "services/topems-ai/backend"
    "services/topems-portal/backend"
    "services/topems-ehs/backend"
    "services/topems-scm/backend"
    "services/topems-srm/backend"
    "services/topems-pdm/backend"
)

TOTAL_ERRORS=0
TOTAL_PROJECTS=0

for project in "${PROJECTS[@]}"; do
    if [ -d "$project" ] && [ -f "$project/Cargo.toml" ]; then
        echo "========================================="
        echo "检查项目: $project"
        echo "========================================="
        TOTAL_PROJECTS=$((TOTAL_PROJECTS + 1))
        
        cd "$project" || continue
        cargo clippy --all-targets --all-features -- -D warnings 2>&1 | tee /tmp/clippy_output.txt
        
        if [ ${PIPESTATUS[0]} -ne 0 ]; then
            ERROR_COUNT=$(grep -c "error:" /tmp/clippy_output.txt || true)
            WARNING_COUNT=$(grep -c "warning:" /tmp/clippy_output.txt || true)
            echo "❌ $project 有 $ERROR_COUNT 个错误和 $WARNING_COUNT 个警告"
            TOTAL_ERRORS=$((TOTAL_ERRORS + ERROR_COUNT))
        else
            echo "✅ $project 检查通过！"
        fi
        
        cd /Users/air/TOPEMS || exit 1
        echo ""
    fi
done

echo ""
echo "========================================="
echo "检查完成！共检查 $TOTAL_PROJECTS 个项目，总计 $TOTAL_ERRORS 个错误。"
echo "========================================="
