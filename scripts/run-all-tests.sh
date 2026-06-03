#!/bin/bash
# TOPEMS 一键运行所有测试脚本
# 生成时间: 2026-06-03

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_FILE="$SCRIPT_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"

echo "=========================================="
echo "TOPEMS 部署测试 - 一键执行"
echo "=========================================="
echo ""
echo "测试报告将保存到: $REPORT_FILE"
echo ""

# 初始化报告
echo "TOPEMS 部署测试报告" > "$REPORT_FILE"
echo "执行时间: $(date)" >> "$REPORT_FILE"
echo "============================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

TOTAL_PASS=0
TOTAL_FAIL=0

# 1. 环境检查
echo "========== 1. 环境检查 ==========" | tee -a "$REPORT_FILE"
if bash "$SCRIPT_DIR/test-environment.sh" 2>&1 | tee -a "$REPORT_FILE"; then
    ((TOTAL_PASS++))
else
    ((TOTAL_FAIL++))
fi
echo "" | tee -a "$REPORT_FILE"

# 2. 服务健康检查
echo "========== 2. 服务健康检查 ==========" | tee -a "$REPORT_FILE"
if bash "$SCRIPT_DIR/test-services-health.sh" 2>&1 | tee -a "$REPORT_FILE"; then
    ((TOTAL_PASS++))
else
    ((TOTAL_FAIL++))
fi
echo "" | tee -a "$REPORT_FILE"

# 3. 服务间通信测试
echo "========== 3. 服务间通信测试 ==========" | tee -a "$REPORT_FILE"
if bash "$SCRIPT_DIR/test-integration.sh" 2>&1 | tee -a "$REPORT_FILE"; then
    ((TOTAL_PASS++))
else
    ((TOTAL_FAIL++))
fi
echo "" | tee -a "$REPORT_FILE"

# 4. 安全测试
echo "========== 4. 安全测试 ==========" | tee -a "$REPORT_FILE"
if bash "$SCRIPT_DIR/test-security.sh" 2>&1 | tee -a "$REPORT_FILE"; then
    ((TOTAL_PASS++))
else
    ((TOTAL_FAIL++))
fi
echo "" | tee -a "$REPORT_FILE"

# 5. 性能测试
echo "========== 5. 性能测试 ==========" | tee -a "$REPORT_FILE"
bash "$SCRIPT_DIR/test-performance.sh" 2>&1 | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# 总结
echo "============================================" | tee -a "$REPORT_FILE"
echo "测试总结" | tee -a "$REPORT_FILE"
echo "============================================" | tee -a "$REPORT_FILE"
echo "测试模块通过: $TOTAL_PASS" | tee -a "$REPORT_FILE"
echo "测试模块失败: $TOTAL_FAIL" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

if [ $TOTAL_FAIL -eq 0 ]; then
    echo "✅ 所有测试通过，系统可以部署" | tee -a "$REPORT_FILE"
    echo ""
    echo "测试报告已保存: $REPORT_FILE"
    exit 0
else
    echo "⚠️  存在 $TOTAL_FAIL 个测试模块失败，请检查" | tee -a "$REPORT_FILE"
    echo ""
    echo "测试报告已保存: $REPORT_FILE"
    exit 1
fi