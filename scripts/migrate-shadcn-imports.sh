#!/bin/bash
# 批量迁移 shadcn 引用为 @mui/material 组件
# 支持: CardTitle, Label, Input, Progress, TableHeader, TabsList, TabsTrigger, TabsContent

set -e

SRC_DIR="/Users/xingzhai/TOPEMS/apps/web/src"

echo "=== 迁移前统计 ==="
SHADCN_REFS=$(grep -rln "from '@/components/ui/shadcn'" "$SRC_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "引用 shadcn 的文件数: $SHADCN_REFS"

# 这些文件由用户要求先处理 PM 模块的 2 个文件
TARGET_FILES=(
  "$SRC_DIR/pages/pm/PmProjectCreatePage.tsx"
  "$SRC_DIR/pages/pm/PmProjectDetailPage.tsx"
)

for FILE in "${TARGET_FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "⚠️  文件不存在: $FILE"
    continue
  fi

  echo ""
  echo "=== 处理: $(basename $FILE) ==="

  # 1. 替换 shadcn 导入为 @mui/material
  # CardTitle -> Typography
  # Label -> FormLabel
  # Input -> TextField
  # Progress -> LinearProgress
  # TableHeader -> TableHead
  # TabsList -> Box (包装 Tabs)
  # TabsTrigger -> Tab
  # TabsContent -> Box (条件渲染)

  # PmProjectCreatePage.tsx
  if [[ "$FILE" == *"PmProjectCreatePage.tsx" ]]; then
    sed -i '' "s|import {|import {|" "$FILE"
    sed -i '' "s|} from '@/components/ui/shadcn';|}|" "$FILE"

    # 添加需要的导入
    if ! grep -q "from '@mui/material'" "$FILE" || ! grep -q "Typography\|FormLabel\|TextField" "$FILE"; then
      sed -i '' "s|from '@mui/material';|from '@mui/material';\nimport { Typography as CardTitle, FormLabel as Label, TextField as Input } from '@mui/material';|" "$FILE"
    fi

  # PmProjectDetailPage.tsx
  elif [[ "$FILE" == *"PmProjectDetailPage.tsx" ]]; then
    sed -i '' "s|} from '@/components/ui/shadcn';|}|" "$FILE"

    # 追加缺失的导入
    sed -i '' "s|from '@mui/material';|from '@mui/material';\nimport { Typography as CardTitle, LinearProgress as Progress, TableHead as TableHeader } from '@mui/material';|" "$FILE"
  fi
done

echo ""
echo "=== 迁移后验证 ==="
REMAINING=$(grep -rln "from '@/components/ui/shadcn'" "$SRC_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "仍引用 shadcn 的文件数: $REMAINING"
