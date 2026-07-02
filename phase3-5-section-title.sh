#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Phase 3.5 — SectionTitle 组件
# 创建统一的区域标题组件，消除内联 Typography 样式重复
# =============================================================================

PROJECT_ROOT="/Users/air/TOPEMS"
COMPONENT_DIR="$PROJECT_ROOT/apps/web/src/components/common"
COMPONENT_FILE="$COMPONENT_DIR/SectionTitle.tsx"
INDEX_FILE="$COMPONENT_DIR/index.ts"
BAK_SUFFIX=".bak.phase3-5"

echo "=== Phase 3.5: SectionTitle Component ==="

# ---------------------------------------------------------------------------
# 1. 幂等性检查 — 如果 SectionTitle.tsx 已存在则跳过
# ---------------------------------------------------------------------------
if [ -f "$COMPONENT_FILE" ]; then
  echo "[SKIP] SectionTitle.tsx already exists at $COMPONENT_FILE"
else
  echo "[CREATE] $COMPONENT_FILE"

  # 备份 index.ts（无论是否修改，都先备份一次）
  if [ -f "$INDEX_FILE" ]; then
    cp "$INDEX_FILE" "${INDEX_FILE}${BAK_SUFFIX}"
    echo "[BACKUP] ${INDEX_FILE}${BAK_SUFFIX}"
  fi

  cat > "$COMPONENT_FILE" << 'SECTIONTITLE_EOF'
import React from 'react';
import { Typography, Box, Divider, useTheme } from '@mui/material';

export interface SectionTitleProps {
  /** 标题文本 */
  children: React.ReactNode;
  /** 预设变体 */
  variant?: 'sidebar' | 'page' | 'card' | 'inline';
  /** 是否显示底部边线（仅 variant='page' 时） */
  showDivider?: boolean;
  /** 左右间距（默认 2） */
  px?: number;
  /** 上下间距（默认 1） */
  py?: number;
  /** 图标 */
  icon?: React.ReactNode;
  /** 额外右侧内容（如"查看全部"链接） */
  action?: React.ReactNode;
  /** 自定义 sx */
  sx?: any;
}

/**
 * 统一区域标题组件
 *
 * variant 说明:
 * - sidebar: 侧边栏分组标题（全大写、小字号、紧凑）
 * - page: 页面内分区标题（h6 大小、带可选分割线）
 * - card: 卡片内标题（subtitle2）
 * - inline: 行内标题（无额外间距）
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  children,
  variant = 'page',
  showDivider = false,
  px = 2,
  py = 1,
  icon,
  action,
  sx,
}) => {
  const theme = useTheme();

  const variantStyles = {
    sidebar: {
      fontSize: 12,
      fontWeight: 600,
      color: 'text.secondary',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      userSelect: 'none' as const,
    },
    page: {
      fontSize: 15,
      fontWeight: 600,
      color: 'text.primary',
    },
    card: {
      fontSize: 14,
      fontWeight: 600,
      color: 'text.primary',
    },
    inline: {
      fontSize: 13,
      fontWeight: 600,
      color: 'text.primary',
    },
  };

  return (
    <Box sx={{ px, py, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon && <Box sx={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>}
          <Typography sx={variantStyles[variant]}>{children}</Typography>
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
      {showDivider && variant === 'page' && (
        <Divider sx={{ mt: 1, borderColor: 'divider' }} />
      )}
    </Box>
  );
};

export default SectionTitle;
SECTIONTITLE_EOF

  echo "[OK] Created SectionTitle.tsx"
fi

# ---------------------------------------------------------------------------
# 2. 在 index.ts 中追加导出（幂等：先检查是否已存在）
# ---------------------------------------------------------------------------
if [ -f "$INDEX_FILE" ]; then
  if grep -q "SectionTitle" "$INDEX_FILE"; then
    echo "[SKIP] SectionTitle already exported in index.ts"
  else
    # 在文件末尾追加（添加空行分隔）
    echo "" >> "$INDEX_FILE"
    echo "// SectionTitle - 统一区域标题组件" >> "$INDEX_FILE"
    echo "export { SectionTitle } from './SectionTitle';" >> "$INDEX_FILE"
    echo "export { default as SectionTitleDefault } from './SectionTitle';" >> "$INDEX_FILE"
    echo "[OK] Appended SectionTitle export to index.ts"
  fi
else
  # index.ts 不存在 — 创建一个新的
  echo "[CREATE] index.ts"
  cat > "$INDEX_FILE" << INDEX_EOF
/**
 * 公共组件导出配置
 */

// SectionTitle - 统一区域标题组件
export { SectionTitle } from './SectionTitle';
export { default as SectionTitleDefault } from './SectionTitle';
INDEX_EOF
  echo "[OK] Created index.ts with SectionTitle export"
fi

echo ""
echo "Phase 3.5 SectionTitle Component: DONE"
