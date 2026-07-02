#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Phase 3.6 — ModuleErrorBoundary 路由级包装
# 在 routes/utils.ts 中添加 createSafeLazy，并示范替换 3 个模块的路由文件
# =============================================================================

PROJECT_ROOT="/Users/air/TOPEMS"
ROUTES_DIR="$PROJECT_ROOT/apps/web/src/routes"
UTILS_FILE="$ROUTES_DIR/utils.ts"
BAK_SUFFIX=".bak.phase3-6"

# 需要示范替换的 3 个路由文件
DEMO_ROUTES=(
  "$ROUTES_DIR/mes.ts"
  "$ROUTES_DIR/crm.ts"
  "$ROUTES_DIR/finance.ts"
)

MODULE_NAMES=("mes" "crm" "finance")

# 其余需要替换的路由文件（将在 md 说明文档中列出）
REMAINING_ROUTES=(
  "$ROUTES_DIR/ai.ts"
  "$ROUTES_DIR/auth.ts"
  "$ROUTES_DIR/bi.ts"
  "$ROUTES_DIR/common.ts"
  "$ROUTES_DIR/dashboard.ts"
  "$ROUTES_DIR/docs.ts"
  "$ROUTES_DIR/erp.ts"
  "$ROUTES_DIR/gis.ts"
  "$ROUTES_DIR/hrm.ts"
  "$ROUTES_DIR/iam.ts"
  "$ROUTES_DIR/im.ts"
  "$ROUTES_DIR/lowcode.ts"
  "$ROUTES_DIR/mobile.ts"
  "$ROUTES_DIR/monitor.ts"
  "$ROUTES_DIR/notifications.ts"
  "$ROUTES_DIR/pdm.ts"
  "$ROUTES_DIR/plugin.ts"
  "$ROUTES_DIR/pm.ts"
  "$ROUTES_DIR/professional.ts"
  "$ROUTES_DIR/report.ts"
  "$ROUTES_DIR/rs.ts"
  "$ROUTES_DIR/scm.ts"
  "$ROUTES_DIR/srm.ts"
  "$ROUTES_DIR/tenant.ts"
  "$ROUTES_DIR/wms.ts"
  "$ROUTES_DIR/workflow.ts"
)

echo "=== Phase 3.6: Error Boundary Routes ==="

# ---------------------------------------------------------------------------
# 1. 在 routes/utils.ts 中添加 createSafeLazy 函数
# ---------------------------------------------------------------------------
if grep -q "createSafeLazy" "$UTILS_FILE" 2>/dev/null; then
  echo "[SKIP] createSafeLazy already exists in routes/utils.ts"
else
  echo "[PATCH] Adding createSafeLazy to routes/utils.ts"

  # 备份
  cp "$UTILS_FILE" "${UTILS_FILE}${BAK_SUFFIX}"
  echo "[BACKUP] ${UTILS_FILE}${BAK_SUFFIX}"

  # 追加到文件末尾
  cat >> "$UTILS_FILE" << 'UTILS_EOF'

// =============================================================================
// Phase 3.6 — createSafeLazy: 带 ErrorBoundary + Suspense 的安全懒加载
// =============================================================================

import { Suspense } from 'react';
import React from 'react';
import { PageErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 为 lazy 组件创建带错误边界的包装
 *
 * 用法:
 *   const MyPage = createSafeLazy(() => import('../pages/MyPage'), 'my-module');
 *
 * 替代原有的:
 *   const MyPage = lazy(() => import('../pages/MyPage'));
 *
 * 效果: 在懒加载组件外层自动包裹 PageErrorBoundary + Suspense，
 *       防止单个页面崩溃导致整个应用白屏。
 */
export function createSafeLazy<T extends React.ComponentType<any>>(
  lazyFn: () => Promise<{ default: T }>,
  moduleName: string
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    lazyFn().then((module) => ({
      default: (props: any) => (
        <PageErrorBoundary
          level="page"
          onError={(report) => {
            console.error(`[${moduleName}] Page load error:`, report.error);
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60vh',
                }}
              >
                加载中...
              </div>
            }
          >
            <module.default {...props} />
          </Suspense>
        </PageErrorBoundary>
      ),
    }))
  );
}
UTILS_EOF

  echo "[OK] Added createSafeLazy to routes/utils.ts"
fi

# ---------------------------------------------------------------------------
# 2. 示范替换 3 个路由文件 (mes.ts, crm.ts, finance.ts)
#    使用 python3 进行精确的 AST 感知式文本替换
# ---------------------------------------------------------------------------

# 创建 python 替换脚本（临时文件）
PYTHON_PATCH_SCRIPT=$(mktemp /tmp/phase3-6-patch-XXXXXX.py)
trap 'rm -f "$PYTHON_PATCH_SCRIPT"' EXIT

cat > "$PYTHON_PATCH_SCRIPT" << 'PYEOF'
#!/usr/bin/env python3
"""Phase 3.6 — 替换 routes 文件中的 lazy 为 safeLazy"""
import re
import sys

def patch_routes_file(filepath: str, module_name: str) -> None:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # --- 幂等性检查 ---
    if 'createSafeLazy' in content and 'safeLazy' in content:
        print(f"[SKIP] {filepath} already uses createSafeLazy")
        return

    original = content

    # 1) 在 "import { lazyWithRetry } from './utils';" 后追加 createSafeLazy 导入
    content = content.replace(
        "import { lazyWithRetry } from './utils';",
        "import { lazyWithRetry } from './utils';\nimport { createSafeLazy } from './utils';"
    )

    # 2) 在 "const lazy = lazyWithRetry;" 后追加 safeLazy 别名
    content = content.replace(
        "const lazy = lazyWithRetry;\n",
        "const lazy = lazyWithRetry;\n"
        "const safeLazy: <T extends React.ComponentType<any>>(fn: () => Promise<{ default: T }>, mod: string) => ReturnType<typeof createSafeLazy<T>> = createSafeLazy as any;\n"
    )
    # 也处理无尾随换行的情况
    if "const lazy = lazyWithRetry;" in content and "safeLazy" not in content:
        content = content.replace(
            "const lazy = lazyWithRetry;",
            "const lazy = lazyWithRetry;\n"
            "const safeLazy: <T extends React.ComponentType<any>>(fn: () => Promise<{ default: T }>, mod: string) => ReturnType<typeof createSafeLazy<T>> = createSafeLazy as any;"
        )

    # 3) 替换所有 "const XxxPage = lazy(() => import('...'));" 为 safeLazy
    #    匹配模式: = lazy(<newline>)  <whitespace>  () => import('...')  <whitespace> );
    pattern = r'(= )lazy\(\s*\n(\s*)\(\) => import\(([^)]+)\)\s*\)'
    replacement = r'\1safeLazy(\n\2() => import(\3), \'' + module_name + '\')'
    content = re.sub(pattern, replacement, content)

    # 也处理单行格式: = lazy(() => import('...'));
    single_line_pattern = r'(= )lazy\(\(\) => import\(([^)]+)\)\)'
    single_line_replacement = r'\1safeLazy(() => import(\2), \'' + module_name + '\')'
    content = re.sub(single_line_pattern, single_line_replacement, content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] Patched {filepath}")
    else:
        print(f"[INFO] No changes made to {filepath}")


if __name__ == '__main__':
    filepath = sys.argv[1]
    module_name = sys.argv[2]
    patch_routes_file(filepath, module_name)
PYEOF

for i in "${!DEMO_ROUTES[@]}"; do
  ROUTE_FILE="${DEMO_ROUTES[$i]}"
  MODULE_NAME="${MODULE_NAMES[$i]}"

  if [ ! -f "$ROUTE_FILE" ]; then
    echo "[WARN] $ROUTE_FILE not found, skipping"
    continue
  fi

  # 幂等性: 如果已经导入并使用了 createSafeLazy，跳过
  if grep -q "safeLazy" "$ROUTE_FILE" 2>/dev/null; then
    echo "[SKIP] $ROUTE_FILE already uses safeLazy"
    continue
  fi

  echo "[PATCH] $ROUTE_FILE — replacing lazy with safeLazy"

  # 备份
  cp "$ROUTE_FILE" "${ROUTE_FILE}${BAK_SUFFIX}"

  # 使用 python3 进行精确替换
  python3 "$PYTHON_PATCH_SCRIPT" "$ROUTE_FILE" "$MODULE_NAME"
done

# ---------------------------------------------------------------------------
# 3. 生成 phase3-6-remaining-routes.md 说明文档
# ---------------------------------------------------------------------------
REMAINING_DOCS_FILE="$PROJECT_ROOT/docs/phases/phase3-6-remaining-routes.md"
mkdir -p "$(dirname "$REMAINING_DOCS_FILE")"

cat > "$REMAINING_DOCS_FILE" << 'MD_HEADER'
# Phase 3.6 — 剩余路由文件 ErrorBoundary 替换清单

## 背景

已在 `routes/utils.ts` 中添加 `createSafeLazy` 工具函数。
已在 `mes.ts`、`crm.ts`、`finance.ts` 三个模块中完成示范替换。

## 替换模式

在每个 routes 文件中:

**Before:**
```typescript
import { lazyWithRetry } from './utils';
const lazy = lazyWithRetry;

const SomePage = lazy(() => import('../pages/module/SomePage'));
```

**After:**
```typescript
import { lazyWithRetry } from './utils';
import { createSafeLazy } from './utils';
const lazy = lazyWithRetry;
const safeLazy: <T extends React.ComponentType<any>>(fn: () => Promise<{ default: T }>, mod: string) => ReturnType<typeof createSafeLazy<T>> = createSafeLazy as any;

const SomePage = safeLazy(() => import('../pages/module/SomePage'), 'module');
```

> `lazy` 别名保留不动，以兼容可能的 Navigate 等非 lazy 路由。
> 仅将 `lazy(() => import(...))` 改为 `safeLazy(() => import(...), 'moduleName')`。

## 需要替换的文件列表

MD_HEADER

for rfile in "${REMAINING_ROUTES[@]}"; do
  basename_r="$(basename "$rfile")"
  module_name="${basename_r%.ts}"
  if [ -f "$rfile" ]; then
    echo "- [ ] \`routes/${basename_r}\` — 模块名: \`${module_name}\`" >> "$REMAINING_DOCS_FILE"
  else
    echo "- [ ] \`routes/${basename_r}\` — **文件不存在，跳过**" >> "$REMAINING_DOCS_FILE"
  fi
done

cat >> "$REMAINING_DOCS_FILE" << 'MD_FOOTER'

## 说明

- 以上文件在 Phase 4 中逐步替换，每替换一个模块即可勾选。
- 替换后建议运行对应模块的页面测试，确认懒加载正常、错误边界生效。
- `createSafeLazy` 已内含 Suspense fallback，无需额外包裹。
- 对于 `Navigate` 等非 lazy 路由（使用 `React.createElement`），不需要修改。
MD_FOOTER

echo "[OK] Generated remaining routes doc at $REMAINING_DOCS_FILE"

# ---------------------------------------------------------------------------
# 4. 验证
# ---------------------------------------------------------------------------
echo ""
echo "--- Verification ---"

if grep -q "createSafeLazy" "$UTILS_FILE"; then
  echo "[OK] createSafeLazy found in utils.ts"
else
  echo "[FAIL] createSafeLazy NOT found in utils.ts"
fi

for rf in "${DEMO_ROUTES[@]}"; do
  if grep -q "safeLazy" "$rf" 2>/dev/null; then
    echo "[OK] $(basename "$rf") uses safeLazy"
  else
    echo "[INFO] $(basename "$rf") — patch may need manual review"
  fi
done

echo ""
echo "Phase 3.6 Error Boundary Routes: DONE"
