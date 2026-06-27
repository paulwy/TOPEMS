#!/bin/bash

set -e

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

echo "📊 1/2: 运行 SCM 服务性能测试..."
echo "------------------------------------------"
k6 run scm-performance-test.js --out json=scm-test-results.json
echo ""

echo "📊 2/2: 运行数据库性能测试..."
echo "------------------------------------------"
k6 run database-performance-test.js --out json=database-test-results.json
echo ""

echo "=========================================="
echo " 测试完成！"
echo "=========================================="
echo ""
echo "测试报告文件:"
echo "- scm-test-results.json      (SCM 服务测试结果)"
echo "- database-test-results.json (数据库测试结果)"
echo "- performance-report.json    (SCM 性能报告)"
echo "- database-performance-report.json (数据库性能报告)"
echo ""
echo "建议对比优化前后的测试结果来评估优化效果。"
