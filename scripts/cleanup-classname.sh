#!/bin/bash

# 批量清理 className 并迁移到 MUI sx
# 使用 sed 进行批量替换

cd /Users/xingzhai/TOPEMS/apps/web/src

# 1. 替换图标尺寸 className="w-4 h-4" 为 style={{ width: 16, height: 16 }}
find . -name "*.tsx" -exec sed -i '' 's/className="w-4 h-4"/style={{ width: 16, height: 16 }}/g' {} +

# 2. 替换图标尺寸 className="w-5 h-5" 为 style={{ width: 20, height: 20 }}
find . -name "*.tsx" -exec sed -i '' 's/className="w-5 h-5"/style={{ width: 20, height: 20 }}/g' {} +

# 3. 替换图标尺寸 className="w-6 h-6" 为 style={{ width: 24, height: 24 }}
find . -name "*.tsx" -exec sed -i '' 's/className="w-6 h-6"/style={{ width: 24, height: 24 }}/g' {} +

# 4. 替换图标尺寸 className="w-8 h-8" 为 style={{ width: 32, height: 32 }}
find . -name "*.tsx" -exec sed -i '' 's/className="w-8 h-8"/style={{ width: 32, height: 32 }}/g' {} +

# 5. 替换图标尺寸 className="w-16 h-16" 为 style={{ width: 64, height: 64 }}
find . -name "*.tsx" -exec sed -i '' 's/className="w-16 h-16"/style={{ width: 64, height: 64 }}/g' {} +

# 6. 替换图标尺寸 className="h-4 w-4" 为 style={{ width: 16, height: 16 }}
find . -name "*.tsx" -exec sed -i '' 's/className="h-4 w-4"/style={{ width: 16, height: 16 }}/g' {} +

# 7. 替换图标尺寸 className="h-5 w-5" 为 style={{ width: 20, height: 20 }}
find . -name "*.tsx" -exec sed -i '' 's/className="h-5 w-5"/style={{ width: 20, height: 20 }}/g' {} +

echo "className 清理完成！"
echo "请运行 npm run lint 和 npm run typecheck 验证"