#!/usr/bin/env bash
# =============================================================================
# Phase 3.2 - Chart Migration
# 将 7 个直接使用 recharts 的文件迁移到统一从 @/components/charts 导入
# =============================================================================
set -euo pipefail

# ---- 路径配置 ----
if [[ -f "apps/web/src/components/charts/index.ts" ]]; then
  PROJECT_ROOT="$(pwd)"
elif [[ -f "/Users/air/TOPEMS/apps/web/src/components/charts/index.ts" ]]; then
  PROJECT_ROOT="/Users/air/TOPEMS"
else
  echo "ERROR: 无法定位 TOPEMS 项目根目录。请在项目根目录运行此脚本，或确保项目位于 /Users/air/TOPEMS/"
  exit 1
fi

SRC="${PROJECT_ROOT}/apps/web/src"
CHARTS_INDEX="${SRC}/components/charts/index.ts"

echo "PROJECT_ROOT = ${PROJECT_ROOT}"
echo "charts/index.ts = ${CHARTS_INDEX}"

# 校验 charts/index.ts 存在
if [[ ! -f "${CHARTS_INDEX}" ]]; then
  echo "ERROR: ${CHARTS_INDEX} 不存在"
  exit 1
fi

# =============================================================================
# 0. 备份 charts/index.ts
# =============================================================================
cp "${CHARTS_INDEX}" "${CHARTS_INDEX}.bak.phase3-2"
echo "[0] 已备份 charts/index.ts"

# =============================================================================
# 1. 在 charts/index.ts 追加 recharts 子组件 re-export
# =============================================================================
python3 << 'PYEOF'
import sys

filepath = "${CHARTS_INDEX}"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

marker = """// recharts 子组件 re-export（仅供过渡期直接使用，新代码应使用封装组件）
export { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';"""

if marker in content:
    print('[1] charts/index.ts 已包含 recharts re-export，跳过')
else:
    # 在文件末尾追加（确保前面有换行）
    if not content.endswith('\n'):
        content += '\n'
    content += '\n' + marker + '\n'
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('[1] 已在 charts/index.ts 追加 recharts 子组件 re-export')
PYEOF

# =============================================================================
# 2. 定义 7 个文件的迁移配置
# =============================================================================
# 每条记录: "相对路径 | 原始recharts导入行(正则) | 替换后的导入行 | 额外需要删除的chartTheme导入行(正则,可空)"
# 使用 Python 脚本做精确替换，避免 sed 转义地狱

PROJECT_ROOT="${PROJECT_ROOT}" python3 << 'PYEOF'
import re
import os
import shutil
import sys

PROJECT_ROOT = os.environ["PROJECT_ROOT"]
SRC = os.path.join(PROJECT_ROOT, "apps/web/src")

migrations = [
    # ============================================================
    # File 1: PmReportPage.tsx
    # 策略: 替换 recharts import 为 @/components/charts 统一导入
    # 保留 BarChart, LineChart, PieChart 别名；子组件从同一入口导入
    # ============================================================
    {
        "file": "pages/pm/PmReportPage.tsx",
        "recharts_import_pattern": r"import\s*\{[^}]*\}\s*from\s*['\"]recharts['\"];",
        # 原始导入大致是:
        # import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
        "replacement": """import {
  BarChart as BarChartAlias,
  Bar, LineChart as LineChartAlias, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as PieChartAlias, Pie, Cell, Legend,
} from '@/components/charts';""",
        "charttheme_import_pattern": None,  # 无单独 chartTheme 导入
        "comment": "PmReportPage.tsx",
    },

    # ============================================================
    # File 2: BIModuleDetailPage.tsx
    # 策略: 合并 recharts 和 chartTheme 两个导入行
    # ============================================================
    {
        "file": "pages/bi/BIModuleDetailPage.tsx",
        "recharts_import_pattern": r"import\s*\{\s*LineChart\s+as\s+RechartsLineChart\s*,\s*Line\s*,\s*XAxis\s*,\s*YAxis\s*,\s*CartesianGrid\s*,\s*Tooltip\s*,\s*ResponsiveContainer\s*,\s*PieChart\s+as\s+RechartsPieChart\s*,\s*Pie\s*,\s*Cell\s*\}\s*from\s*['\"]recharts['\"];",
        "replacement": """import {
  LineChart as RechartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell,
  BIChartColors,
} from '@/components/charts';""",
        "charttheme_import_pattern": r"import\s*\{\s*BIChartColors\s*\}\s*from\s*['\"]@/components/charts/chartTheme['\"];",
        "comment": "BIModuleDetailPage.tsx",
    },

    # ============================================================
    # File 3: BIComparisonPage.tsx
    # 策略: 合并 recharts 和 chartTheme 两个导入行
    # ============================================================
    {
        "file": "pages/bi/BIComparisonPage.tsx",
        "recharts_import_pattern": r"import\s*\{\s*BarChart\s*,\s*Bar\s*,\s*XAxis\s*,\s*YAxis\s*,\s*CartesianGrid\s*,\s*Tooltip\s*,\s*ResponsiveContainer\s*,\s*Legend\s*\}\s*from\s*['\"]recharts['\"];",
        "replacement": """import {
  BarChart as BarChartAlias, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BIChartColors,
} from '@/components/charts';""",
        "charttheme_import_pattern": r"import\s*\{\s*BIChartColors\s*\}\s*from\s*['\"]@/components/charts/chartTheme['\"];",
        "comment": "BIComparisonPage.tsx",
    },

    # ============================================================
    # File 4: BIAnalyticsPage.tsx
    # ============================================================
    {
        "file": "pages/bi/BIAnalyticsPage.tsx",
        "recharts_import_pattern": r"import\s*\{\s*BarChart\s*,\s*Bar\s*,\s*XAxis\s*,\s*YAxis\s*,\s*CartesianGrid\s*,\s*Tooltip\s*,\s*ResponsiveContainer\s*,\s*PieChart\s+as\s+RechartsPieChart\s*,\s*Pie\s*\}\s*from\s*['\"]recharts['\"];",
        "replacement": """import {
  BarChart as BarChartAlias, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as PieChartAlias, Pie,
} from '@/components/charts';""",
        "charttheme_import_pattern": None,
        "comment": "BIAnalyticsPage.tsx",
    },

    # ============================================================
    # File 5: LimsSampleDetailPage.tsx
    # ============================================================
    {
        "file": "pages/lims/LimsSampleDetailPage.tsx",
        "recharts_import_pattern": r"import\s*\{\s*BarChart\s*,\s*Bar\s*,\s*XAxis\s*,\s*YAxis\s*,\s*CartesianGrid\s*,\s*Tooltip\s*,\s*ResponsiveContainer\s*,\s*Cell\s*\}\s*from\s*['\"]recharts['\"];",
        "replacement": """import {
  BarChart as BarChartAlias, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from '@/components/charts';""",
        "charttheme_import_pattern": None,
        "comment": "LimsSampleDetailPage.tsx",
    },

    # ============================================================
    # File 6: FinancialReports.tsx
    # ============================================================
    {
        "file": "components/finance/FinancialReports.tsx",
        "recharts_import_pattern": r"import\s*\{\s*BarChart\s*,\s*Bar\s*,\s*PieChart\s*,\s*Pie\s*,\s*Cell\s*,\s*XAxis\s*,\s*YAxis\s*,\s*CartesianGrid\s*,\s*Tooltip\s*,\s*Legend\s*,\s*ResponsiveContainer\s*\}\s*from\s*['\"]recharts['\"];",
        "replacement": """import {
  BarChart as BarChartAlias, Bar,
  PieChart as PieChartAlias, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from '@/components/charts';""",
        "charttheme_import_pattern": None,
        "comment": "FinancialReports.tsx",
    },

    # ============================================================
    # File 7: ProjectReport.tsx
    # ============================================================
    {
        "file": "components/pm/ProjectReport.tsx",
        "recharts_import_pattern": r"import\s*\{\s*BarChart\s*,\s*Bar\s*,\s*LineChart\s*,\s*Line\s*,\s*XAxis\s*,\s*YAxis\s*,\s*CartesianGrid\s*,\s*Tooltip\s*,\s*ResponsiveContainer\s*,\s*PieChart\s*,\s*Pie\s*,\s*Cell\s*,\s*Legend\s*\}\s*from\s*['\"]recharts['\"];",
        "replacement": """import {
  BarChart as BarChartAlias, Bar,
  LineChart as LineChartAlias, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as PieChartAlias, Pie, Cell, Legend,
} from '@/components/charts';""",
        "charttheme_import_pattern": None,
        "comment": "ProjectReport.tsx",
    },
]

success_count = 0
skip_count = 0

for mig in migrations:
    filepath = os.path.join(SRC, mig["file"])

    if not os.path.isfile(filepath):
        print(f"  WARN: {mig['file']} 不存在，跳过")
        skip_count += 1
        continue

    # 备份
    backup_path = filepath + ".bak.phase3-2"
    shutil.copy2(filepath, backup_path)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Step A: 删除 chartTheme 单独导入行（如果存在且在 recharts 导入之后）
    if mig["charttheme_import_pattern"]:
        content = re.sub(mig["charttheme_import_pattern"], '', content)

    # Step B: 替换 recharts 导入行
    # 使用 MULTILINE 模式让 ^ $ 匹配行首行尾；用 DOTALL 让 . 匹配换行
    # 先尝试匹配可能跨行的 import
    pattern = mig["recharts_import_pattern"]

    # 也尝试宽松匹配：from 'recharts' 的任何 import 行
    loose_pattern = r"import\s*\{[^}]*\}\s*from\s*['\"]recharts['\"];"

    new_content = re.sub(pattern, mig["replacement"], content, flags=re.DOTALL)

    if new_content == content:
        # 精确模式没匹配到，尝试宽松模式
        new_content = re.sub(loose_pattern, mig["replacement"], content, flags=re.DOTALL)
        if new_content == content:
            print(f"  WARN: {mig['file']} 未找到 recharts import 行，跳过")
            skip_count += 1
            continue
        else:
            print(f"  OK  (loose match): {mig['comment']} - 已替换 recharts import")
    else:
        print(f"  OK  (exact match):  {mig['comment']} - 已替换 recharts import")

    # Step C: 添加迁移注释（在文件顶部第一个 import 之前）
    migration_comment = "// Phase 3.2: recharts 导入已统一为 @/components/charts\n// TODO: Phase 3.3 - 逐步将 JSX 中的原始 recharts 组件替换为封装组件\n"
    if migration_comment not in new_content:
        # 在第一个 import 语句之前插入注释
        new_content = re.sub(
            r'^(\s*import\s)',
            migration_comment + r'\1',
            new_content,
            count=1,
            flags=re.MULTILINE
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    success_count += 1

print(f"\n迁移统计: 成功 {success_count}, 跳过 {skip_count}")
PYEOF

echo ""
echo "Phase 3.2 Chart Migration: DONE"
