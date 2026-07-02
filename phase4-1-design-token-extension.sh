#!/usr/bin/env bash
# =============================================================================
# Phase 4.1 — Design Token Extension
# 扩展 TOPEMS semanticTokens: 新增 dashboard / sidebar / emptyState / table / layout
# 同时为 background 添加暗色模式 token
# =============================================================================

set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
TOKENS_FILE="${PROJECT_ROOT}/packages/tokens/src/tokens.ts"
THEME_FILE="${PROJECT_ROOT}/apps/web/src/theme/theme.ts"
BACKUP="${TOKENS_FILE}.bak.phase4-1"

# ---------------------------------------------------------------------------
# 1. 备份
# ---------------------------------------------------------------------------
cp "$TOKENS_FILE" "$BACKUP"
echo "[backup] ${TOKENS_FILE} -> ${BACKUP}"

# ---------------------------------------------------------------------------
# 2. Python AST-level precise insertion
# ---------------------------------------------------------------------------
export TOKENS_FILE THEME_FILE

python3 << 'PYEOF'
import re, os

TOKENS_FILE = os.environ["TOKENS_FILE"]
THEME_FILE  = os.environ["THEME_FILE"]

with open(TOKENS_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ---- 2a. Insert dark-mode tokens into background block ----
# Find the 'disabled:' line inside the background block and append after it.
disabled_marker = "    disabled: designTokens.colors.action.disabledBackground,"
new_bg_tokens = """\
    disabled: designTokens.colors.action.disabledBackground,
    /** 暗色模式下的表格条纹背景 */
    tableStripe: 'rgba(255, 255, 255, 0.03)',
    /** 暗色模式下的 hover 背景 */
    hoverDark: 'rgba(255, 255, 255, 0.08)',
    /** 暗色模式下的 selected 背景 */
    selectedDark: 'rgba(59, 130, 246, 0.15)',"""

if disabled_marker in content:
    content = content.replace(disabled_marker, new_bg_tokens, 1)
else:
    print("[WARN] 'disabled' marker not found in background block — skipping bg tokens")

# ---- 2b. Insert 4 new semantic token groups before "} as const;" ----
as_const_marker = "} as const;"

new_token_groups = """\
  /** Dashboard 组件语义 Token */
  dashboard: {
    /** 统计卡片 */
    statCard: {
      padding: '20px',
      gap: '12px',
      iconSize: 40,
      iconBgRadius: '12px',
      valueFontSize: '28px',
      labelFontSize: '14px',
      trendFontSize: '12px',
    },
    /** 图表卡片 */
    chartCard: {
      padding: '20px',
      headerGap: '12px',
      chartHeight: 200,
      chartHeightLg: 300,
    },
    /** 快捷操作按钮 */
    quickAction: {
      gap: '12px',
      iconSize: 24,
    },
    /** 最近活动列表 */
    recentItem: {
      padding: '10px 0',
      gap: '12px',
      timestampFontSize: '12px',
    },
  },

  /** 侧边栏组件语义 Token */
  sidebar: {
    width: 240,
    collapsedWidth: 64,
    itemHeight: 40,
    itemGap: 2,
    groupTitle: {
      fontSize: 12,
      fontWeight: 600 as const,
      color: designTokens.colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    header: {
      height: 56,
      padding: '12px 16px',
      gap: '12px',
    },
    badge: {
      size: 16,
      fontSize: '0.625rem',
      fontWeight: 600 as const,
    },
    activeIndicator: {
      width: 3,
      color: designTokens.colors.primary.main,
      bgColor: designTokens.colors.primary[50],
      bgColorDark: 'rgba(59, 130, 246, 0.15)',
    },
  },

  /** 空状态组件语义 Token */
  emptyState: {
    padding: '48px 24px',
    iconSize: 64,
    titleFontSize: '16px',
    descriptionFontSize: '14px',
    actionGap: '12px',
    mutedColor: designTokens.colors.text.muted,
  },

  /** 表格组件语义 Token */
  table: {
    cellPadding: '12px 16px',
    headerBgColor: designTokens.colors.grey[50],
    headerBgColorDark: designTokens.colors.grey[800],
    headerFontWeight: designTokens.typography.fontWeight.semibold,
    rowHoverBg: designTokens.colors.action.hover,
    rowSelectedBg: designTokens.colors.action.selected,
    stripeBg: designTokens.colors.grey[50],
    stripeBgDark: 'rgba(255, 255, 255, 0.03)',
    denseCellPadding: '8px 16px',
  },

  /** 页面布局语义 Token */
  layout: {
    header: {
      height: 56,
      padding: '0 24px',
      gap: '16px',
    },
    content: {
      maxWidth: 1440,
      padding: '24px',
      gap: '24px',
    },
    breadcrumb: {
      fontSize: designTokens.typography.fontSize.sm,
      gap: 8,
    },
  },

} as const;"""

if as_const_marker in content:
    content = content.replace(as_const_marker, new_token_groups, 1)
else:
    print("[ERROR] '} as const;' not found — aborting")
    exit(1)

with open(TOKENS_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("[tokens] semanticTokens extended successfully")

# ---- 3. Add TODO comment in theme.ts ----
if THEME_FILE and os.path.isfile(THEME_FILE):
    with open(THEME_FILE, "r", encoding="utf-8") as f:
        theme_content = f.read()

    todo_block = """
  // TODO: Phase 4.1 — 利用新增的 semanticTokens 扩展 MUI 组件覆写
  //   - Dashboard statCard  -> MuiCard / MuiPaper variant
  //   - sidebar              -> MuiDrawer / MuiList custom styling
  //   - emptyState           -> MuiBox / MuiTypography empty state
  //   - table (dense/stripes)-> MuiTableCell / MuiTableHead
  //   - layout (header/content/breadcrumb) -> MuiAppBar / layout containers
"""

    # Insert after the last MUI component override's closing brace,
    # before the final "    },\n  });\n};"
    # We target the pattern: end of components closing -> before createTheme call end
    end_pattern = "    },\n  });\n"
    if end_pattern in theme_content:
        theme_content = theme_content.replace(
            end_pattern,
            todo_block + "    },\n  });\n",
            1,
        )
        with open(THEME_FILE, "w", encoding="utf-8") as f:
            f.write(theme_content)
        print("[theme] TODO comment added to theme.ts")
    else:
        print("[WARN] Could not locate insertion point in theme.ts — skipping TODO comment")
else:
    print("[WARN] theme.ts not found — skipping TODO comment")

PYEOF

echo ""
echo "Phase 4.1 Design Token Extension: DONE"
