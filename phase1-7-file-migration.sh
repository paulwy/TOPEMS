#!/bin/bash
set -e

BASE="/Users/air/TOPEMS/apps/web/src"
PAGES="$BASE/pages"
ROUTES="$BASE/routes"

echo "=== Phase 1.7: 页面文件目录归位 ==="

# Backup
cp "$ROUTES/iam.ts" "${ROUTES}/iam.ts.bak"
cp "$ROUTES/tenant.ts" "${ROUTES}/tenant.ts.bak"
cp "$ROUTES/plugin.ts" "${ROUTES}/plugin.ts.bak"
cp "$ROUTES/professional.ts" "${ROUTES}/professional.ts.bak"

# Ensure target directories exist
mkdir -p "$PAGES/iam"
mkdir -p "$PAGES/plugin"
mkdir -p "$PAGES/monitor"

# ============================================
# 1.7a: IAM files (pages/admin/ -> pages/iam/)
# ============================================
echo "--- 1.7a: 迁移 IAM 页面文件 ---"

IAM_FILES=(
  UserManagementPage.tsx
  RoleManagementPage.tsx
  PermissionManagementPage.tsx
  AuditLogPage.tsx
  SystemManagementPage.tsx
  DictionaryManagementPage.tsx
  DatabaseStructurePage.tsx
  MigrationAdminPage.tsx
  ConfigDebugPage.tsx
  AccountManagementPage.tsx
  BankAccountManagementPage.tsx
  TenantManagementPage.tsx
  TenantDetailPage.tsx
  TenantSettingsPage.tsx
  TenantBillingPage.tsx
)

for f in "${IAM_FILES[@]}"; do
  src="$PAGES/admin/$f"
  dst="$PAGES/iam/$f"
  if [ -f "$src" ]; then
    if [ -f "$dst" ]; then
      echo "  SKIP: $dst already exists"
    else
      mv "$src" "$dst"
      echo "  MOVED: admin/$f -> iam/$f"
    fi
  else
    echo "  WARN: $src not found (already moved?)"
  fi
done

# ============================================
# 1.7b: Plugin file (pages/admin/ -> pages/plugin/)
# ============================================
echo "--- 1.7b: 迁移 Plugin 页面文件 ---"
if [ -f "$PAGES/admin/PluginManagementPage.tsx" ]; then
  mv "$PAGES/admin/PluginManagementPage.tsx" "$PAGES/plugin/PluginManagementPage.tsx"
  echo "  MOVED: admin/PluginManagementPage.tsx -> plugin/"
else
  echo "  WARN: PluginManagementPage.tsx not found"
fi

# ============================================
# 1.7c: Monitor file (pages/admin/ -> pages/monitor/)
# ============================================
echo "--- 1.7c: 迁移 Monitor 页面文件 ---"
if [ -f "$PAGES/admin/PerformanceMonitorPage.tsx" ]; then
  mv "$PAGES/admin/PerformanceMonitorPage.tsx" "$PAGES/monitor/PerformanceMonitorPage.tsx"
  echo "  MOVED: admin/PerformanceMonitorPage.tsx -> monitor/"
else
  echo "  WARN: PerformanceMonitorPage.tsx not found"
fi

# ============================================
# 1.7d: Handle dead code files
# ============================================
echo "--- 1.7d: 处理死代码文件 ---"
DEAD_FILES=(MonitorPage.tsx SystemSettingsPage.tsx CompanyStructurePage.tsx)
for f in "${DEAD_FILES[@]}"; do
  if [ -f "$PAGES/admin/$f" ]; then
    echo "  INFO: $f is dead code in admin/, leaving in place"
  else
    echo "  INFO: $f not found (already moved or deleted)"
  fi
done

# ============================================
# 1.7e: Update route imports
# ============================================
echo "--- 1.7e: 更新路由文件 import 路径 ---"

# iam.ts: 11 imports from ../pages/admin/ -> ../pages/iam/
sed -i '' "s|import('../pages/admin/|import('../pages/iam/|g" "$ROUTES/iam.ts"
echo "  Updated iam.ts: admin/ -> iam/"

# tenant.ts: 4 imports from ../pages/admin/ -> ../pages/iam/
sed -i '' "s|import('../pages/admin/|import('../pages/iam/|g" "$ROUTES/tenant.ts"
echo "  Updated tenant.ts: admin/ -> iam/"

# plugin.ts: 1 import from ../pages/admin/ -> ../pages/plugin/
sed -i '' "s|import('../pages/admin/PluginManagementPage')|import('../pages/plugin/PluginManagementPage')|g" "$ROUTES/plugin.ts"
echo "  Updated plugin.ts: PluginManagementPage -> plugin/"

# professional.ts: 1 import from ../pages/admin/ -> ../pages/monitor/
sed -i '' "s|import('../pages/admin/PerformanceMonitorPage')|import('../pages/monitor/PerformanceMonitorPage')|g" "$ROUTES/professional.ts"
echo "  Updated professional.ts: PerformanceMonitorPage -> monitor/"

# ============================================
# Verify
# ============================================
echo ""
echo "=== 验证 ==="
echo "pages/admin/ 剩余文件:"
ls "$PAGES/admin/" 2>/dev/null || echo "  (directory empty or removed)"
echo ""
echo "pages/iam/ 文件数: $(ls "$PAGES/iam/"*.tsx 2>/dev/null | wc -l)"
echo "pages/plugin/ 文件数: $(ls "$PAGES/plugin/"*.tsx 2>/dev/null | wc -l)"
echo "pages/monitor/ 文件数: $(ls "$PAGES/monitor/"*.tsx 2>/dev/null | wc -l)"
echo ""
echo "检查是否还有对 pages/admin 的引用:"
grep -rn "pages/admin" "$ROUTES/" 2>/dev/null && echo "  WARN: 仍有残留引用!" || echo "  OK: 无残留引用"

echo ""
echo "=== Phase 1.7 完成 ==="
