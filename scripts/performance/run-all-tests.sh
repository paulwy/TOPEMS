#!/bin/bash
#
# TOPEMS 性能测试套件 - 入口脚本
#
# 模式对比：
# ┌────────────┬──────────────────────┬──────────────────────────┐
# │            │  冒烟测试 SMOKE=true │  完整性能测试 (默认)      │
# ├────────────┼──────────────────────┼──────────────────────────┤
# │ 用途       │ CI 验证脚本无错       │ 真实性能评估             │
# │ SCM        │ 1 VUs / 5s          │ 50 VUs / 60s             │
# │ 数据库     │ 1 VUs / 5s          │ 100 VUs / 120s           │
# │ 后端依赖   │ 否                   │ 是 (localhost:8040)      │
# │ 超时       │ 无阈值 (永远通过)   │ 严格 (errors<1%)         │
# └────────────┴──────────────────────┴──────────────────────────┘
#
# 环境变量：
#   SMOKE=true|false     切换测试模式 (默认 false)
#   BASE_URL=url         后端服务地址 (默认 http://localhost:8040)
#
# 使用示例：
#   SMOKE=true ./run-all-tests.sh
#   ./run-all-tests.sh
#   BASE_URL=http://192.168.1.100:8040 ./run-all-tests.sh
#
# 输出文件：
#   scm-test-results.json           SCM 原始 k6 数据
#   database-test-results.json      数据库原始 k6 数据
#   performance-report.json         SCM 聚合报告
#   database-performance-report.json 数据库聚合报告
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo " TOPEMS 性能测试套件"
echo "=========================================="

if ! command -v k6 &> /dev/null; then
    echo "❌ k6 未安装，请先安装 k6:"
    echo "   brew install k6 (macOS)"
    echo "   sudo apt-get install k6 (Ubuntu/Debian)"
    echo "   或访问 https://k6.io/docs/get-started/installation/"
    exit 1
fi

# 检测模式
SMOKE="${SMOKE:-false}"
BASE_URL="${BASE_URL:-http://localhost:8040}"
IAM_URL="${IAM_URL:-http://localhost:8000}"

if [ "$SMOKE" = "true" ]; then
    echo "🔬 冒烟测试模式（无需后端，仅验证脚本可运行）"
else
    echo "🏋️  完整性能测试模式"
    echo "   VUs: 50-100 | Duration: 60-120s"
    echo ""
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null | grep -q "200\|401"; then
        echo "✅ 后端服务已连接 ($BASE_URL)"
    else
        echo "⚠️  后端服务未运行 ($BASE_URL)，测试可能全部失败"
        echo "   启动后端后重新运行可获得有效结果"
    fi
fi
echo ""

PASS=0
FAIL=0

# 构建 k6 -e 参数数组（每个 -e 只传一个 KEY=VALUE）
K6_E_ARGS=(-e "BASE_URL=$BASE_URL" -e "IAM_URL=$IAM_URL")
[ "$SMOKE" = "true" ] && K6_E_ARGS+=(-e "SMOKE=true")

echo "📊 1/2: 运行 SCM 服务性能测试..."
echo "------------------------------------------"
if k6 run "${K6_E_ARGS[@]}" scm-performance-test.js --out json=scm-test-results.json; then
    PASS=$((PASS + 1))
else
    FAIL=$((FAIL + 1))
fi
echo ""

echo "📊 2/2: 运行数据库性能测试..."
echo "------------------------------------------"
if k6 run "${K6_E_ARGS[@]}" database-performance-test.js --out json=database-test-results.json; then
    PASS=$((PASS + 1))
else
    FAIL=$((FAIL + 1))
fi
echo ""

echo "=========================================="
echo " 测试完成！通过: $PASS  失败: $FAIL"
echo "=========================================="
echo ""
echo "测试报告文件:"
echo "- scm-test-results.json      (SCM 服务测试结果)"
echo "- database-test-results.json (数据库测试结果)"
echo "- performance-report.json    (SCM 性能报告)"
echo "- database-performance-report.json (数据库性能报告)"
echo ""
echo "使用方法:"
echo "  SMOKE=true $0              # 冒烟测试（5s，无需后端）"
echo "  $0                         # 完整性能测试（需后端）"
echo "  BASE_URL=http://host:port $0  # 指定后端地址"

exit $FAIL
