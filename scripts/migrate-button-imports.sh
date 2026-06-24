#!/bin/bash
# 批量迁移 Button 引用
# 替换: from '@/components/ui/Button' → from '@mui/material'
# 适用范围: apps/web/src 下所有 .ts/.tsx 文件

set -e

SRC_DIR="/Users/xingzhai/TOPEMS/apps/web/src"

echo "=== 迁移前统计 ==="
TOTAL=$(grep -rln "from '@/components/ui/Button'" "$SRC_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "引用废弃 Button 的文件数: $TOTAL"

echo ""
echo "=== 批量替换导入 ==="
# 使用 find + sed 进行替换
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  "s|from '@/components/ui/Button'|from '@mui/material'|g" {} \;

echo ""
echo "=== 迁移后验证 ==="
REMAINING=$(grep -rln "from '@/components/ui/Button'" "$SRC_DIR" 2>/dev/null | wc -l | tr -d ' ')
MUI_BUTTON=$(grep -rln "from '@mui/material'" "$SRC_DIR" 2>/dev/null | xargs -I {} grep -l "Button" {} 2>/dev/null | wc -l | tr -d ' ')
echo "仍引用废弃 Button 的文件数: $REMAINING"
echo "已迁移到 @mui/material 的文件数: $MUI_BUTTON"

echo ""
echo "=== 完成 ==="
