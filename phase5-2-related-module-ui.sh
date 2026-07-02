#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Phase 5.2 — 跨模块关联数据 UI 组件
# RelatedModuleCard / ExtendedTab / useModuleData hook
# ============================================================================

PROJECT_ROOT="/Users/air/TOPEMS"
COMMON_DIR="${PROJECT_ROOT}/apps/web/src/components/common"
HOOKS_DIR="${PROJECT_ROOT}/apps/web/src/hooks"
PAGES_DIR="${PROJECT_ROOT}/apps/web/src/pages/erp"

BACKUP_EXT=".bak.phase5-2"

echo "=== Phase 5.2: Related Module UI Components ==="

# ─── 备份 ────────────────────────────────────────────────────────────────────
backup() {
  local target="$1"
  if [[ -f "$target" && ! -f "${target}${BACKUP_EXT}" ]]; then
    cp "$target" "${target}${BACKUP_EXT}"
    echo "  [backup] $(basename "$target")"
  fi
}

# ─── 1. RelatedModuleCard.tsx ────────────────────────────────────────────────
TARGET="${COMMON_DIR}/RelatedModuleCard.tsx"
if [[ ! -f "$TARGET" ]]; then
  echo "  [create] RelatedModuleCard.tsx"
  cat > "$TARGET" << 'RELATED_MODULE_CARD_EOF'
/**
 * Phase 5.2 — 跨模块关联数据卡片
 * 
 * 在当前页面中嵌入关联模块的数据摘要卡片。
 * 仅在关联模块已安装时显示，通过 usePluginContext.isPluginInstalled 判断。
 */
import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, Skeleton, Divider } from '@mui/material';
import { ExternalLink, ChevronRight, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePluginContext } from '@/context/PluginContext';

export interface RelatedModuleItem {
  /** 数据标签 */
  label: string;
  /** 数据值 */
  value: string | number;
  /** 可选的趋势方向 */
  trend?: 'up' | 'down' | 'flat';
  /** 可选的描述 */
  description?: string;
}

export interface RelatedModuleCardProps {
  /** 关联模块 code（如 'finance', 'crm', 'wms'） */
  moduleCode: string;
  /** 模块显示名称 */
  moduleName: string;
  /** 模块图标 */
  moduleIcon?: React.ReactNode;
  /** 数据列表 */
  items: RelatedModuleItem[];
  /** 详情页链接 */
  detailPath: string;
  /** 链接文字（默认"查看详情"） */
  linkText?: string;
  /** 加载状态 */
  loading?: boolean;
  /** 自定义 sx */
  sx?: any;
}

export const RelatedModuleCard: React.FC<RelatedModuleCardProps> = ({
  moduleCode,
  moduleName,
  moduleIcon,
  items,
  detailPath,
  linkText = '查看详情',
  loading = false,
  sx,
}) => {
  const { isPluginInstalled } = usePluginContext();
  const navigate = useNavigate();

  // 关联模块未安装时不渲染
  if (!isPluginInstalled(moduleCode)) return null;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* 头部: 模块名 + 链接按钮 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {moduleIcon || <ExternalLink sx={{ width: 16, height: 16, color: 'primary.main' }} />}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
              关联数据 ({moduleName})
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowRight sx={{ width: 14 }} />}
            onClick={() => navigate(detailPath)}
            sx={{ textTransform: 'none', fontSize: 12 }}
          >
            {linkText}
          </Button>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* 数据列表 */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={28} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : items.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {items.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                  {item.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    {item.value}
                  </Typography>
                  {item.trend === 'up' && <TrendingUp sx={{ width: 14, height: 14, color: 'success.main' }} />}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, textAlign: 'center', py: 1 }}>
            暂无关联数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default RelatedModuleCard;
RELATED_MODULE_CARD_EOF
else
  echo "  [skip] RelatedModuleCard.tsx already exists"
fi

# ─── 2. ExtendedTab.tsx ──────────────────────────────────────────────────────
TARGET="${COMMON_DIR}/ExtendedTab.tsx"
if [[ ! -f "$TARGET" ]]; then
  echo "  [create] ExtendedTab.tsx"
  cat > "$TARGET" << 'EXTENDED_TAB_EOF'
/**
 * Phase 5.2 — 模块关联 Tab 扩展
 * 
 * 在现有 Tab 列表末尾追加一个"关联数据" Tab，
 * 仅在关联模块已安装时显示。
 */
import React from 'react';
import { Tab } from '@mui/material';
import { usePluginContext } from '@/context/PluginContext';

export interface ExtendedTabConfig {
  /** 关联模块 code */
  moduleCode: string;
  /** Tab label */
  label: string;
  /** Tab 图标 */
  icon?: React.ReactNode;
  /** Tab 值 */
  value: string;
}

export interface ExtendedTabProps {
  /** 扩展 Tab 配置 */
  configs: ExtendedTabConfig[];
  /** 当前激活的 Tab 值 */
  value: string;
  /** Tab 变更回调 */
  onChange: (event: React.SyntheticEvent, newValue: string) => void;
}

/**
 * 渲染关联模块扩展 Tab 列表
 * 过滤掉未安装模块的 Tab，返回可渲染的 Tab 元素数组
 */
export const ExtendedTab: React.FC<ExtendedTabProps> = ({
  configs,
  value,
  onChange,
}) => {
  const { isPluginInstalled } = usePluginContext();

  const visibleConfigs = configs.filter((config) => isPluginInstalled(config.moduleCode));

  if (visibleConfigs.length === 0) return null;

  return (
    <>
      {visibleConfigs.map((config) => (
        <Tab
          key={config.value}
          label={config.label}
          value={config.value}
          icon={config.icon && <span style={{ marginRight: 4 }}>{config.icon}</span>}
          iconPosition="start"
        />
      ))}
    </>
  );
};

export default ExtendedTab;
EXTENDED_TAB_EOF
else
  echo "  [skip] ExtendedTab.tsx already exists"
fi

# ─── 3. useModuleData.ts ────────────────────────────────────────────────────
TARGET="${HOOKS_DIR}/useModuleData.ts"
if [[ ! -f "$TARGET" ]]; then
  echo "  [create] useModuleData.ts"
  cat > "$TARGET" << 'USE_MODULE_DATA_EOF'
/**
 * Phase 5.2 — 跨模块数据获取 Hook
 * 
 * 安全地从关联模块获取数据，当模块未安装时返回 null 而不是报错。
 */
import { useState, useEffect, useCallback } from 'react';
import { usePluginContext } from '@/context/PluginContext';

export interface UseModuleDataOptions<T> {
  /** 目标模块 code */
  moduleCode: string;
  /** 数据获取函数（仅在模块已安装时调用） */
  fetchFn: () => Promise<T>;
  /** 自动获取（默认 true） */
  autoFetch?: boolean;
  /** 依赖数组 */
  deps?: any[];
}

export interface UseModuleDataResult<T> {
  /** 数据（模块未安装时为 null） */
  data: T | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 目标模块是否已安装 */
  isAvailable: boolean;
  /** 手动重新获取 */
  refetch: () => void;
}

export function useModuleData<T>({
  moduleCode,
  fetchFn,
  autoFetch = true,
  deps = [],
}: UseModuleDataOptions<T>): UseModuleDataResult<T> {
  const { isPluginInstalled } = usePluginContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isPluginInstalled(moduleCode);

  const refetch = useCallback(async () => {
    if (!isAvailable) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || '获取关联数据失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAvailable, fetchFn]);

  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
  }, [autoFetch, refetch, ...deps]);

  return { data, loading, error, isAvailable, refetch };
}

export default useModuleData;
USE_MODULE_DATA_EOF
else
  echo "  [skip] useModuleData.ts already exists"
fi

# ─── 4. 导出追加到 common/index.ts ─────────────────────────────────────────
INDEX_FILE="${COMMON_DIR}/index.ts"
backup "$INDEX_FILE"

if ! grep -q "RelatedModuleCard" "$INDEX_FILE" 2>/dev/null; then
  echo "  [patch]  Append exports to common/index.ts"
  cat >> "$INDEX_FILE" << 'INDEX_EXPORT_EOF'

// ===== Phase 5.2 跨模块关联数据 UI =====
// RelatedModuleCard - 嵌入式关联数据卡片
export { RelatedModuleCard } from './RelatedModuleCard';
export type { RelatedModuleItem, RelatedModuleCardProps } from './RelatedModuleCard';

// ExtendedTab - 模块关联 Tab 扩展
export { ExtendedTab } from './ExtendedTab';
export type { ExtendedTabConfig, ExtendedTabProps } from './ExtendedTab';
INDEX_EXPORT_EOF
else
  echo "  [skip]  common/index.ts already has RelatedModuleCard exports"
fi

# ─── 5. VoucherManagementPage.tsx 示范集成 ─────────────────────────────────
VOUCHER_PAGE="${PAGES_DIR}/VoucherManagementPage.tsx"
backup "$VOUCHER_PAGE"

if ! grep -q "RelatedModuleCard" "$VOUCHER_PAGE" 2>/dev/null; then
  echo "  [patch]  Inject RelatedModuleCard into VoucherManagementPage.tsx"

  python3 - "$VOUCHER_PAGE" << 'PY_INJECT_EOF'
import re, sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# --- Step A: Add import for RelatedModuleCard ---
import_line_import = "import { RelatedModuleCard } from '@/components/common';"

# Insert after the last import from '@/components/common'
# Find the line that imports from '@/components/common'
pattern = r"(import \{[^}]*\} from '@/components/common';)"
matches = list(re.finditer(pattern, content))
if matches:
    last_match = matches[-1]
    insert_pos = last_match.end()
    content = content[:insert_pos] + '\n' + import_line_import + content[insert_pos:]
else:
    # Fallback: insert after the last 'import ... from' line
    last_import = max(m.end() for m in re.finditer(r"^import .*?;\s*$", content, re.MULTILINE))
    content = content[:last_import] + '\n' + import_line_import + content[last_import:]

# --- Step B: Insert RelatedModuleCard before </PageContainer> ---
card_jsx = """{/* 跨模块关联: Finance 财务分析 */}
      <RelatedModuleCard
        moduleCode="finance"
        moduleName="Finance 财务"
        items={[
          { label: '本月凭证数', value: '--' },
          { label: '未审核凭证', value: '--' },
          { label: '科目余额', value: '--' },
        ]}
        detailPath="/finance/vouchers"
        sx={{ mt: 2 }}
      />
"""

closing_tag = "</PageContainer>"
if closing_tag in content:
    content = content.replace(closing_tag, card_jsx + "\n    " + closing_tag)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("    Python injection done")
PY_INJECT_EOF
else
  echo "  [skip]  VoucherManagementPage.tsx already has RelatedModuleCard"
fi

echo ""
echo "Phase 5.2 Related Module UI: DONE"
