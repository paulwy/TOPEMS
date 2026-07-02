#!/bin/bash
# =============================================================================
# TOPEMS 脚本部署工具
# 将所有 Phase 1-8 脚本从工作目录复制到 TOPEMS 项目根目录
# =============================================================================
set -euo pipefail

SCRIPTS_DIR="$(dirname "$0")"
TOPEMS_ROOT="${1:-/Users/air/TOPEMS}"

echo "源目录: $SCRIPTS_DIR"
echo "目标:   $TOPEMS_ROOT"
echo ""

# 检查目标目录
if [ ! -f "$TOPEMS_ROOT/apps/web/package.json" ]; then
  echo "❌ 目标目录不包含 apps/web/package.json，请确认 TOPEMS 路径"
  echo "   用法: bash deploy.sh /path/to/TOPEMS"
  exit 1
fi

# 复制所有 .sh 脚本
count=0
for f in "$SCRIPTS_DIR"/run-phase*.sh "$SCRIPTS_DIR"/phase*.sh; do
  [ -f "$f" ] || continue
  cp "$f" "$TOPEMS_ROOT/"
  count=$((count + 1))
done

# 复制 Python 脚本（如果有）
for f in "$SCRIPTS_DIR"/phase*.py; do
  [ -f "$f" ] || continue
  cp "$f" "$TOPEMS_ROOT/"
  count=$((count + 1))
done

# 设置执行权限
chmod +x "$TOPEMS_ROOT"/run-phase*.sh "$TOPEMS_ROOT"/phase*.sh 2>/dev/null

echo "✅ 已复制 $count 个文件到 $TOPEMS_ROOT"
echo ""
echo "执行顺序:"
echo "  cd $TOPEMS_ROOT"
echo "  ./run-phase1.sh"
echo "  ./run-phase2.sh"
echo "  ./run-phase3.sh"
echo "  ./run-phase4.sh"
echo "  ./run-phase5.sh"
echo "  ./run-phase6.sh"
echo "  ./run-phase7.sh"
echo "  ./run-phase8.sh"
echo ""
echo "或一键执行:"
echo "  cd $TOPEMS_ROOT && for p in 1 2 3 4 5 6 7 8; do ./run-phase\$p.sh; done"
