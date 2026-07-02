#!/usr/bin/env bash
# =============================================================================
# Phase 7-4 P2 优化补丁
# 1. 创建 scripts/scan-hardcoded-values.py (独立扫描工具)
# 2. 在 eslint.config.js 追加硬编码值检测注释说明
# 3. 为 5 个大数据量列表页添加虚拟滚动 TODO 标记
#
# 用法: bash phase7-4-hardcoded-virtual-scroll.sh
# 幂等: 多次运行安全
# =============================================================================

set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
ESLINT_FILE="${PROJECT_ROOT}/apps/web/eslint.config.js"
SCAN_SCRIPT="${PROJECT_ROOT}/apps/web/scripts/scan-hardcoded-values.py"

# --- 颜色 ---
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[DONE]${NC} $*"; }

# =============================================================================
# Task 1: 创建 Python 扫描脚本
# =============================================================================
info "创建 scan-hardcoded-values.py ..."
cat > "$SCAN_SCRIPT" << 'PYTHON_EOF'
#!/usr/bin/env python3
"""
扫描 TSX 文件中 sx prop 里的硬编码颜色值
用法: python scripts/scan-hardcoded-values.py [目标目录]
默认扫描 apps/web/src/pages 和 apps/web/src/components
"""
import re
import sys
import os
from pathlib import Path

HEX_COLOR = re.compile(r"'#[0-9a-fA-F]{3,8}'")
RGB_COLOR = re.compile(r"'rgb\s*\(")
RGBA_COLOR = re.compile(r"'rgba\s*\(")


def scan_file(filepath: str) -> list:
    """扫描单个文件中 sx prop 里的硬编码颜色值"""
    results = []
    try:
        content = Path(filepath).read_text(encoding="utf-8")
    except Exception:
        return results

    in_sx = False
    brace_depth = 0
    for i, line in enumerate(content.split("\n"), 1):
        # 检测 sx prop 的开始
        if "sx={{" in line or "sx={" in line:
            in_sx = True
            brace_depth = line.count("{") - line.count("}")
        elif in_sx:
            brace_depth += line.count("{") - line.count("}")
            if brace_depth <= 0:
                in_sx = False
                continue

        if in_sx:
            for m in HEX_COLOR.finditer(line):
                results.append((i, m.group(), line.strip()))
            for m in RGB_COLOR.finditer(line):
                results.append((i, m.group()[:20], line.strip()))
            for m in RGBA_COLOR.finditer(line):
                results.append((i, m.group()[:20], line.strip()))

    return results


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else ""
    targets = target.split(",") if target else []

    if not targets:
        # 默认扫描目录
        script_dir = Path(__file__).resolve().parent
        web_src = script_dir.parent / "src"
        targets = [
            str(web_src / "pages"),
            str(web_src / "components"),
        ]

    total_files = 0
    total_hits = 0

    for t in targets:
        if not os.path.isdir(t):
            print(f"警告: 目录不存在 - {t}", file=sys.stderr)
            continue
        for tsx in sorted(Path(t).rglob("*.tsx")):
            hits = scan_file(str(tsx))
            if hits:
                total_files += 1
                for line_no, value, line_content in hits:
                    print(f"  {tsx}:{line_no}  {value}  |  {line_content[:80]}")
                    total_hits += 1

    print(f"\n总计: {total_files} 个文件, {total_hits} 处硬编码颜色值")


if __name__ == "__main__":
    main()
PYTHON_EOF
chmod +x "$SCAN_SCRIPT"
ok "scan-hardcoded-values.py 已创建"

# =============================================================================
# Task 2: 在 eslint.config.js 追加注释说明
# =============================================================================
info "在 eslint.config.js 追加 Phase 7-4 注释说明 ..."

# 幂等检查: 是否已有 Phase 7-4 标记
if grep -qF "Phase 7-4" "$ESLINT_FILE"; then
    info "eslint.config.js 已包含 Phase 7-4 标记，跳过"
else
    # 备份
    cp "$ESLINT_FILE" "${ESLINT_FILE}.bak.phase7-4"

    # 在 storybook config 展开之前插入注释
    python3 -c "
import sys
filepath = '$ESLINT_FILE'
with open(filepath, 'r') as f:
    content = f.read()

insert_marker = '  ...storybook.configs'
if insert_marker in content:
    comment_block = '''  // ==========================================================================
  // Phase 7-4 -- 硬编码值检测方案 (P2 优化)
  // ==========================================================================
  //
  // 目标: 检测 sx prop 中的硬编码颜色/间距值，引导使用 theme tokens。
  //
  // 方案说明:
  //   ESLint 的 no-restricted-syntax 使用 ESTree AST 选择器，但 JSX sx={{ }}
  //   内部的值结构较复杂，难以用简单的选择器精确匹配。
  //
  //   项目已有 eslint-plugin-topems-design (no-hardcoded-colors / no-hardcoded-spacing)
  //   插件，位于 scripts/eslint-plugin-topems-design.cjs，可覆盖大部分场景。
  //
  //   如需更精准的 sx prop 级别检测，建议:
  //   1. 扩展 eslint-plugin-topems-design，增加 sx prop AST 遍历逻辑
  //   2. 或运行独立扫描脚本:
  //      python scripts/scan-hardcoded-values.py apps/web/src/pages,apps/web/src/components
  //
  // =============================================================================

'''
    content = content.replace(insert_marker, comment_block + insert_marker)
    with open(filepath, 'w') as f:
        f.write(content)
    print('注释已插入')
else:
    print('ERROR: 未找到插入标记', file=sys.stderr)
    sys.exit(1)
"
    ok "eslint.config.js 已追加 Phase 7-4 注释"
fi

# =============================================================================
# Task 3: 为 5 个列表页添加虚拟滚动 TODO 标记 (使用 Python 实现以兼容 macOS bash)
# =============================================================================
info "为 5 个列表页添加虚拟滚动 TODO 标记..."

python3 << 'PY_TASK3'
import os
import shutil

PROJECT_ROOT = "/Users/air/TOPEMS"

pages = [
    (
        os.path.join(PROJECT_ROOT, "apps/web/src/pages/wms/InventoryPage.tsx"),
        "库存列表 (SKU 数千条)",
    ),
    (
        os.path.join(PROJECT_ROOT, "apps/web/src/pages/erp/VoucherManagementPage.tsx"),
        "凭证列表 (历史累积量大)",
    ),
    (
        os.path.join(PROJECT_ROOT, "apps/web/src/pages/crm/CustomerManagementPage.tsx"),
        "客户列表 (企业级数据量)",
    ),
    (
        os.path.join(PROJECT_ROOT, "apps/web/src/pages/mes/ProductionOrderManagementPage.tsx"),
        "生产工单 (按批次累积)",
    ),
    (
        os.path.join(PROJECT_ROOT, "apps/web/src/pages/hrm/HrmEmployeePage.tsx"),
        "员工列表 (全员数据)",
    ),
]

MARKER = "Phase 7-4 -- 虚拟滚动优化"

for filepath, description in pages:
    if not os.path.isfile(filepath):
        print(f"  [INFO] 文件不存在，跳过: {filepath}")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 幂等检查
    if MARKER in content:
        print(f"  [INFO] 已有虚拟滚动标记，跳过: {os.path.basename(filepath)}")
        continue

    # 备份
    shutil.copy2(filepath, filepath + ".bak.phase7-4")

    # 构建注释块
    comment = (
        "/**\n"
        f" * TODO: {MARKER}\n"
        " *\n"
        " * 当列表数据超过 100 条时，建议使用虚拟滚动提升渲染性能:\n"
        " *\n"
        " * 方案 1: @tanstack/react-virtual\n"
        " *   import { useVirtualizer } from '@tanstack/react-virtual';\n"
        " *   const virtualizer = useVirtualizer({ count: data.length, getScrollElement: () => parentRef.current });\n"
        " *\n"
        " * 方案 2: react-virtuoso (MUI 友好)\n"
        " *   import { TableVirtuoso } from 'react-virtuoso';\n"
        " *   <TableVirtuoso data={data} components={{ TableBody, TableRow, TableCell }} />\n"
        " *\n"
        f" * 当前预估数据量: {description}\n"
        " */\n"
    )

    # 找到最后一个 import 行的索引
    lines = content.split("\n")
    last_import_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("import ") and not stripped.startswith("//"):
            last_import_idx = i

    if last_import_idx == -1:
        print(f"  [ERROR] 未找到 import 语句: {filepath}", flush=True)
        continue

    # 在最后一个 import 之后插入空行 + 注释 + 空行
    insert = ["", comment, ""]
    lines = lines[: last_import_idx + 1] + insert + lines[last_import_idx + 1 :]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"  [DONE] {os.path.basename(filepath)} - 虚拟滚动标记已添加")
PY_TASK3

# =============================================================================
# 完成
# =============================================================================
echo ""
echo "Phase 7-4 Hardcoded Values + Virtual Scroll: DONE"
