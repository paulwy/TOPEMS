#!/usr/bin/env bash
set -euo pipefail

##############################################################################
# Phase 5.1 — 跨模块升级提示组件
#
# 功能:
#   1. 创建 ModuleUpgradeBanner.tsx 组件
#   2. 在 common/index.ts 追加导出
#   3. 在 8 个 ERP 页面嵌入 ModuleUpgradeBanner
#
# 幂等性: 检测 import/组件是否已存在，已存在则跳过
# 备份:   修改前自动备份为 .bak.phase5-1
##############################################################################

PROJECT_ROOT="/Users/air/TOPEMS"
COMMON_DIR="${PROJECT_ROOT}/apps/web/src/components/common"
ERP_DIR="${PROJECT_ROOT}/apps/web/src/pages/erp"
BACKUP_SUFFIX=".bak.phase5-1"

BANNER_FILE="${COMMON_DIR}/ModuleUpgradeBanner.tsx"
INDEX_FILE="${COMMON_DIR}/index.ts"

echo "=== Phase 5.1 Module Upgrade Banner ==="
echo ""

# ---------------------------------------------------------------------------
# Step 0: 备份
# ---------------------------------------------------------------------------
echo "[backup] Backing up files before modification..."
for f in "$INDEX_FILE"; do
  if [[ -f "$f" && ! -f "${f}${BACKUP_SUFFIX}" ]]; then
    cp "$f" "${f}${BACKUP_SUFFIX}"
    echo "  backed up: $f"
  fi
done

# ---------------------------------------------------------------------------
# Step 1: 创建 ModuleUpgradeBanner.tsx
# ---------------------------------------------------------------------------
if [[ -f "$BANNER_FILE" ]]; then
  echo "[skip] ModuleUpgradeBanner.tsx already exists"
else
  echo "[create] ModuleUpgradeBanner.tsx"
  cat > "$BANNER_FILE" << 'COMPONENT_EOF'
/**
 * Phase 5.1 — 跨模块升级提示组件
 *
 * 在基础模块页面中显示增强模块安装提示。
 * 非阻塞、可关闭（支持"不再提示" localStorage 持久化）、按需显示。
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Chip, Alert } from '@mui/material';
import { Info, ExternalLink, X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePluginContext } from '@/context/PluginContext';

export interface UpgradeBannerConfig {
  /** 功能名称 */
  feature: string;
  /** 增强内容描述 */
  description: string;
  /** 目标模块 code */
  targetModule: string;
  /** 安装页面路径 */
  installPath: string;
  /** 目标模块显示名称 */
  moduleName: string;
}

export interface ModuleUpgradeBannerProps {
  /** 升级配置（单条或多条） */
  configs: UpgradeBannerConfig[];
  /** 页面标识（用于 localStorage key） */
  pageId: string;
  /** 提示标题（多条时的总标题） */
  title?: string;
  /** 自定义 sx */
  sx?: any;
}

/**
 * 检查指定页面+模块是否已被用户关闭提示
 */
function isDismissed(pageId: string, moduleCode: string): boolean {
  try {
    const key = `topems:dismiss-upgrade:${pageId}:${moduleCode}`;
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

/**
 * 标记指定页面+模块的提示为已关闭
 */
function setDismissed(pageId: string, moduleCode: string): void {
  try {
    const key = `topems:dismiss-upgrade:${pageId}:${moduleCode}`;
    localStorage.setItem(key, 'true');
  } catch {
    // ignore
  }
}

export const ModuleUpgradeBanner: React.FC<ModuleUpgradeBannerProps> = ({
  configs,
  pageId,
  title = '功能增强推荐',
  sx,
}) => {
  const { isPluginInstalled } = usePluginContext();
  const navigate = useNavigate();
  const [dismissedModules, setDismissedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dismissed = new Set<string>();
    configs.forEach((config) => {
      if (isDismissed(pageId, config.targetModule)) {
        dismissed.add(config.targetModule);
      }
    });
    setDismissedModules(dismissed);
  }, [configs, pageId]);

  // 过滤：只显示未安装且未关闭的模块提示
  const visibleConfigs = configs.filter(
    (config) => !isPluginInstalled(config.targetModule) && !dismissedModules.has(config.targetModule)
  );

  if (visibleConfigs.length === 0) return null;

  const handleDismiss = (moduleCode: string) => {
    setDismissed(pageId, moduleCode);
    setDismissedModules((prev) => new Set(prev).add(moduleCode));
  };

  const handleInstall = (installPath: string) => {
    navigate(installPath);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...sx }}>
      {visibleConfigs.length > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sparkles sx={{ width: 16, height: 16, color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
      )}
      {visibleConfigs.map((config) => (
        <Alert
          key={config.targetModule}
          severity="info"
          variant="outlined"
          sx={{
            borderRadius: 2,
            '& .MuiAlert-message': { flex: 1 },
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                size="small"
                variant="text"
                startIcon={<ArrowRight sx={{ width: 14 }} />}
                onClick={() => handleInstall(config.installPath)}
              >
                前往安装
              </Button>
              <IconButton
                size="small"
                onClick={() => handleDismiss(config.targetModule)}
                aria-label="不再提示"
                title="不再提示此功能推荐"
              >
                <X sx={{ width: 14 }} />
              </IconButton>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1 }}>
            <Info sx={{ width: 16, height: 16, mt: 0.3, flexShrink: 0, color: 'info.main' }} />
            <Box>
              <Typography variant="body2">
                安装 <Chip label={config.moduleName} size="small" color="primary" variant="outlined" sx={{ mx: 0.5, height: 20 }} />
                获取{config.description}
              </Typography>
            </Box>
          </Box>
        </Alert>
      ))}
    </Box>
  );
};

/** 预定义的 ERP 页面升级提示配置 */
export const ERP_UPGRADE_CONFIGS: Record<string, UpgradeBannerConfig[]> = {
  'erp-dashboard': [
    { feature: '专业财务管理', description: '应收应付、发票管理、固定资产、预算等专业财务功能', targetModule: 'finance', installPath: '/iam/plugins', moduleName: 'Finance 财务' },
    { feature: '客户关系管理', description: '商机漏斗、客户分群、销售预测、交互记录', targetModule: 'crm', installPath: '/iam/plugins', moduleName: 'CRM 客户' },
    { feature: '仓储管理', description: '仓库精细管理、出入库单据、盘点、批次追溯', targetModule: 'wms', installPath: '/iam/plugins', moduleName: 'WMS 仓储' },
    { feature: '供应链管理', description: 'MRP 计划、供应商评估、询价比价', targetModule: 'scm', installPath: '/iam/plugins', moduleName: 'SCM 供应链' },
  ],
  'erp-vouchers': [
    { feature: '凭证管理增强', description: '用友 U8 导入、批量审核、独立凭证管理', targetModule: 'finance', installPath: '/iam/plugins', moduleName: 'Finance 财务' },
  ],
  'erp-financial-reports': [
    { feature: '财务分析增强', description: '项目/部门维度财务分析、合并报表', targetModule: 'finance', installPath: '/iam/plugins', moduleName: 'Finance 财务' },
  ],
  'erp-inventory': [
    { feature: '仓储管理增强', description: '仓库精细管理、出入库单据、盘点、批次追溯', targetModule: 'wms', installPath: '/iam/plugins', moduleName: 'WMS 仓储' },
  ],
  'erp-customers': [
    { feature: '客户关系增强', description: '商机漏斗、客户分群、销售预测、交互记录', targetModule: 'crm', installPath: '/iam/plugins', moduleName: 'CRM 客户' },
  ],
  'erp-sales': [
    { feature: '客户关系增强', description: '销售预测、交互记录、商机关联', targetModule: 'crm', installPath: '/iam/plugins', moduleName: 'CRM 客户' },
  ],
  'erp-suppliers': [
    { feature: '供应链增强', description: '供应商评估、询价比价、招投标管理', targetModule: 'scm', installPath: '/iam/plugins', moduleName: 'SCM 供应链' },
    { feature: '供应商管理增强', description: '供应商分类、产品管理、评分维度', targetModule: 'srm', installPath: '/iam/plugins', moduleName: 'SRM 供应商' },
  ],
  'erp-purchases': [
    { feature: '供应链增强', description: 'MRP 计划、询价比价、采购分析', targetModule: 'scm', installPath: '/iam/plugins', moduleName: 'SCM 供应链' },
  ],
};

export default ModuleUpgradeBanner;
COMPONENT_EOF
  echo "  created: $BANNER_FILE"
fi

# ---------------------------------------------------------------------------
# Step 2: 追加导出到 common/index.ts
# ---------------------------------------------------------------------------
if grep -q 'ModuleUpgradeBanner' "$INDEX_FILE" 2>/dev/null; then
  echo "[skip] common/index.ts — ModuleUpgradeBanner export already exists"
else
  echo "[append] Adding ModuleUpgradeBanner export to common/index.ts"
  cat >> "$INDEX_FILE" << 'INDEX_EOF'

// ModuleUpgradeBanner — 跨模块升级提示组件 (Phase 5.1)
export { ModuleUpgradeBanner, ERP_UPGRADE_CONFIGS } from './ModuleUpgradeBanner';
export type { UpgradeBannerConfig, ModuleUpgradeBannerProps } from './ModuleUpgradeBanner';
INDEX_EOF
  echo "  appended to: $INDEX_FILE"
fi

# ---------------------------------------------------------------------------
# Step 3: Python 脚本嵌入 8 个 ERP 页面
# ---------------------------------------------------------------------------
echo "[embed] Running Python script to embed banner in 8 ERP pages..."

python3 - "$ERP_DIR" "$BACKUP_SUFFIX" << 'PYTHON_SCRIPT'
import re
import os
import sys

erp_dir = sys.argv[1]
backup_suffix = sys.argv[2]

# 页面文件名 -> 配置 key 映射
PAGE_CONFIGS = {
    'DashboardPage.tsx':            'erp-dashboard',
    'VoucherManagementPage.tsx':     'erp-vouchers',
    'FinancialReportPage.tsx':      'erp-financial-reports',
    'InventoryManagementPage.tsx':   'erp-inventory',
    'CustomerManagementPage.tsx':   'erp-customers',
    'SalesOrderPage.tsx':           'erp-sales',
    'SupplierManagementPage.tsx':   'erp-suppliers',
    'PurchaseOrderPage.tsx':         'erp-purchases',
}

IMPORT_LINE = "import { ModuleUpgradeBanner, ERP_UPGRADE_CONFIGS } from '@/components/common/ModuleUpgradeBanner';"

for filename, config_key in PAGE_CONFIGS.items():
    filepath = os.path.join(erp_dir, filename)

    if not os.path.isfile(filepath):
        print(f"  [warn] File not found, skipping: {filepath}")
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 幂等检查：import 是否已存在
    if IMPORT_LINE in content:
        print(f"  [skip] {filename} — import already exists")
        continue

    # 备份
    backup_path = filepath + backup_suffix
    if not os.path.isfile(backup_path):
        import shutil
        shutil.copy2(filepath, backup_path)

    # 1) 添加 import — 在最后一个 import 语句之后
    #    找到所有 import 行的范围（从文件开头到最后一个 import 语句）
    import_pattern = re.compile(r'^import\s', re.MULTILINE)
    all_import_matches = list(import_pattern.finditer(content))

    if not all_import_matches:
        print(f"  [warn] {filename} — no import statements found, skipping")
        continue

    last_import_match = all_import_matches[-1]
    # 从最后一个 import 行开头，找到该行的结尾（包括可能的续行）
    last_import_start = last_import_match.start()
    # 找到该 import 语句结束位置（遇到下一个非 import 行或分号后换行）
    rest = content[last_import_start:]
    # import 语句通常以 ; 结尾，也可能以 } 结尾（多行导入）
    # 找到分号后的换行位置
    end_match = re.search(r';\s*\n', rest)
    if end_match:
        import_block_end = last_import_start + end_match.end()
    else:
        # 退而求其次，找到该行末尾
        line_end = rest.find('\n')
        import_block_end = last_import_start + line_end + 1 if line_end != -1 else len(content)

    # 在 import 块之后插入新 import
    new_import = IMPORT_LINE + '\n'
    content = content[:import_block_end] + new_import + content[import_block_end:]

    # 2) 找到 <PageContainer 的 JSX 开始标签，然后找到其 > 闭合后第一个子元素
    #    在第一个子元素之前插入 <ModuleUpgradeBanner />
    banner_jsx = (
        f"      <ModuleUpgradeBanner\n"
        f"        configs={{ERP_UPGRADE_CONFIGS['{config_key}']}}\n"
        f"        pageId=\"{config_key}\"\n"
        f"        sx={{{{' ' * 0}mb: 2}}}\n"
        f"      />\n"
    )

    # 匹配 <PageContainer ...> 或 <PageContainer\n ... \n>
    # 使用 DOTALL 以跨行匹配
    page_container_pattern = re.compile(
        r'(<PageContainer\b[^>]*>)', re.DOTALL
    )
    pc_match = page_container_pattern.search(content)

    if not pc_match:
        print(f"  [warn] {filename} — <PageContainer not found, skipping JSX insertion")
        continue

    tag_end = pc_match.end()

    # 从 tag_end 开始，跳过空白和换行，找到第一个非空白内容
    after_tag = content[tag_end:]
    leading_ws_match = re.match(r'(\s*)', after_tag)
    leading_ws = leading_ws_match.group(1) if leading_ws_match else ''

    # 确定缩进：使用 leading_ws 的最后一行作为缩进基准
    indent_lines = leading_ws.split('\n')
    # 用 PageContainer 标签的缩进作为参考
    tag_start_pos = pc_match.start()
    line_start = content.rfind('\n', 0, tag_start_pos)
    if line_start == -1:
        line_start = 0
    else:
        line_start += 1
    tag_line_prefix = content[line_start:tag_start_pos]

    # 构造带正确缩进的 banner JSX
    banner_lines = [
        f"{tag_line_prefix}  <ModuleUpgradeBanner",
        f"{tag_line_prefix}    configs={{ERP_UPGRADE_CONFIGS['{config_key}']}}",
        f'{tag_line_prefix}    pageId="{config_key}"',
        f"{tag_line_prefix}    sx={{{{ mb: 2 }}}}",
        f"{tag_line_prefix}  />",
    ]
    banner_insert = '\n' + '\n'.join(banner_lines) + '\n'

    # 在 PageContainer 闭合标签 > 之后、第一个子元素之前插入
    content = content[:tag_end] + banner_insert + content[tag_end:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  [done] {filename} — embedded ModuleUpgradeBanner (config: {config_key})")

print("")
print("All ERP pages processed.")
PYTHON_SCRIPT

echo ""
echo "=== Phase 5.1 Module Upgrade Banner: DONE ==="
