#!/usr/bin/env bash
# =============================================================================
# Phase 3.1 - Navigation Suite Grouping
# 将侧边栏导航从 2 分组（核心/插件）重构为 6 业务域
# =============================================================================
set -euo pipefail

# ---- 路径配置 ----
# 如果当前目录下存在 apps/web/src/lib/NavigationRegistry.ts，则认为在项目根目录
# 否则尝试默认路径
if [[ -f "apps/web/src/lib/NavigationRegistry.ts" ]]; then
  PROJECT_ROOT="$(pwd)"
elif [[ -f "/Users/air/TOPEMS/apps/web/src/lib/NavigationRegistry.ts" ]]; then
  PROJECT_ROOT="/Users/air/TOPEMS"
else
  echo "ERROR: 无法定位 TOPEMS 项目根目录。请在项目根目录运行此脚本，或确保项目位于 /Users/air/TOPEMS/"
  exit 1
fi

NAV_REGISTRY="${PROJECT_ROOT}/apps/web/src/lib/NavigationRegistry.ts"
APP_SIDEBAR="${PROJECT_ROOT}/apps/web/src/components/layout/AppSidebar.tsx"

echo "PROJECT_ROOT = ${PROJECT_ROOT}"
echo "NavigationRegistry.ts = ${NAV_REGISTRY}"
echo "AppSidebar.tsx = ${APP_SIDEBAR}"

# 校验文件存在
for f in "${NAV_REGISTRY}" "${APP_SIDEBAR}"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: 文件不存在: $f"
    exit 1
  fi
done

# ---- 备份原文件 ----
cp "${NAV_REGISTRY}" "${NAV_REGISTRY}.bak.phase3-1"
cp "${APP_SIDEBAR}" "${APP_SIDEBAR}.bak.phase3-1"
echo "已备份原文件（.bak.phase3-1）"

# =============================================================================
# 1. NavigationRegistry.ts - 在 getNavItemsGroupedBySource() 之前插入
#    BUSINESS_DOMAIN_CONFIG 常量和 BusinessDomain 类型
# =============================================================================
# 定位锚点：在包含 "获取按 source 分组" 的 JSDoc 行前面插入

sed -i '' '/获取按 source 分组的 topNav 项（带权限过滤）/i\
\
  // ========== 业务域配置（Phase 3.1 - 6 域分组） ==========\
\
  /**\
   * 6 业务域配置：将 core/plugin 二分组细化为 6 个业务域\
   */\
  export const BUSINESS_DOMAIN_CONFIG = {\
    '"'"'workspace'"'"':             { label: '"'"'工作台'"'"',       icon: '"'"'LayoutDashboard'"'"', order: 0 },\
    '"'"'management'"'"':            { label: '"'"'经营管理'"'"',     icon: '"'"'TrendingUp'"'"',      order: 1 },\
    '"'"'rd-quality'"'"':             { label: '"'"'研发质量'"'"',     icon: '"'"'FlaskConical'"'"',     order: 2 },\
    '"'"'manufacturing-supply'"'"':   { label: '"'"'生产供应链'"'"',   icon: '"'"'Factory'"'"',         order: 3 },\
    '"'"'organization'"'"':           { label: '"'"'组织行政'"'"',     icon: '"'"'Users'"'"',           order: 4 },\
    '"'"'platform'"'"':               { label: '"'"'平台管理'"'"',     icon: '"'"'Settings'"'"',         order: 5 },\
  } as const;\
\
  export type BusinessDomain = keyof typeof BUSINESS_DOMAIN_CONFIG;\
\
' "${NAV_REGISTRY}"

echo "[1] 已插入 BUSINESS_DOMAIN_CONFIG 和 BusinessDomain 类型定义"

# =============================================================================
# 2. NavigationRegistry.ts - 在 getNavItemsGroupedBySource() 方法之后
#    插入 getNavItemsGroupedByBusinessDomain() 方法
# =============================================================================
# 使用 heredoc 写入临时文件，然后在 "return { core, plugin };" 后面的 "  }" 之后追加

cat << 'NEWMETHOD_EOF' > /tmp/phase3-1-new-method.txt

  /**
   * 获取按业务域分组的 topNav 项（带权限过滤）
   * 返回 Record<BusinessDomain, NavItem[]>，每个域按 order 排序
   */
  getNavItemsGroupedByBusinessDomain(hasPermission: (permission: string) => boolean): Record<BusinessDomain, NavItem[]> {
    const result: Record<BusinessDomain, NavItem[]> = {
      'workspace': [],
      'management': [],
      'rd-quality': [],
      'manufacturing-supply': [],
      'organization': [],
      'platform': [],
    };

    /**
     * 根据 moduleCard 的 source 和 suite 判断业务域归属
     */
    const resolveDomain = (code: string, source: string, suite?: string): BusinessDomain => {
      // 1. 有 suite 的模块按 suite → domain 映射
      if (suite) {
        if (suite === 'finance' || suite === 'crm') return 'management';
        if (suite === 'quality' || suite === 'project') return 'rd-quality';
        if (suite === 'manufacturing' || suite === 'supply') return 'manufacturing-supply';
        if (suite === 'hr') return 'organization';
        if (suite === 'gis') return 'management';
      }

      // 2. 无 suite 的 core 模块：按 code 细分
      if (source === 'core') {
        if (code === 'dashboard') return 'workspace';
        if (['workflow', 'settings', 'docs', 'im'].includes(code)) return 'platform';
        // 其余 core 无 suite → organization（admin/iam/monitor 等）
        return 'organization';
      }

      // 3. 无 suite 的 plugin 模块 → management 兜底
      return 'management';
    };

    this.navItems.forEach((navItems, key) => {
      if (key.endsWith(':top')) {
        const code = key.replace(':top', '');
        const card = this.moduleCards.get(code);
        const source = card?.source || 'plugin';
        const suite = card?.suite;

        navItems.forEach((item) => {
          if (!item.permission || hasPermission(item.permission)) {
            const domain = resolveDomain(code, source, suite);
            result[domain].push(item);
          }
        });
      }
    });

    // 每个 domain 按 order 排序
    for (const domain of Object.keys(result) as BusinessDomain[]) {
      result[domain].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return result;
  }
NEWMETHOD_EOF

# 在 "return { core, plugin };" 后面的方法闭合 "}" 之后追加新方法
# 匹配策略：找到 "return { core, plugin };" 行，然后找下一个 "  }" 行（缩进两个空格的独立闭合括号）
sed -i '' '/return { core, plugin };/,/^  }$/{
  /^  }$/r /tmp/phase3-1-new-method.txt
}' "${NAV_REGISTRY}"

rm -f /tmp/phase3-1-new-method.txt
echo "[2] 已插入 getNavItemsGroupedByBusinessDomain() 方法"

# =============================================================================
# 3. AppSidebar.tsx - 更新 import 行，追加 BUSINESS_DOMAIN_CONFIG 和 BusinessDomain
# =============================================================================

sed -i '' "s/import { navigationRegistry, type NavItem } from '@\/lib\/NavigationRegistry';/import { navigationRegistry, type NavItem, BUSINESS_DOMAIN_CONFIG, type BusinessDomain } from '@\/lib\/NavigationRegistry';/" "${APP_SIDEBAR}"

echo "[3] 已更新 AppSidebar.tsx 的 import 行"

# =============================================================================
# 4. AppSidebar.tsx - 替换 coreNavItems/pluginNavItems state 为 domainNavItems
# =============================================================================

# 使用临时文件做精确替换（避免 sed 多行替换的特殊字符问题）
python3 << 'PYEOF'
import sys

filepath = sys.argv[1] if len(sys.argv) > 1 else "${APP_SIDEBAR}"
filepath = "${APP_SIDEBAR}"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 替换两个 state 声明为一个 domainNavItems state
old = """  const [coreNavItems, setCoreNavItems] = useState<NavItem[]>([]);
  const [pluginNavItems, setPluginNavItems] = useState<NavItem[]>([]);"""

new = """  const [domainNavItems, setDomainNavItems] = useState<Record<BusinessDomain, NavItem[]>>(
    { 'workspace': [], 'management': [], 'rd-quality': [], 'manufacturing-supply': [], 'organization': [], 'platform': [] }
  );"""

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('[4] 已替换 state 为 domainNavItems')
else:
    print('WARNING [4]: 未找到 coreNavItems/pluginNavItems state 声明，跳过', file=sys.stderr)
PYEOF

# =============================================================================
# 5. AppSidebar.tsx - 修改 updateGroupedNavItems 调用新方法
# =============================================================================

python3 << 'PYEOF'
import sys

filepath = "${APP_SIDEBAR}"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = """  const updateGroupedNavItems = () => {
    const grouped = navigationRegistry.getNavItemsGroupedBySource(checkPermission);
    setCoreNavItems(grouped.core);
    setPluginNavItems(grouped.plugin);
  };"""

new = """  const updateGroupedNavItems = () => {
    const grouped = navigationRegistry.getNavItemsGroupedByBusinessDomain(checkPermission);
    setDomainNavItems(grouped);
  };"""

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('[5] 已修改 updateGroupedNavItems 调用新方法')
else:
    print('WARNING [5]: 未找到 updateGroupedNavItems 旧实现，跳过', file=sys.stderr)
PYEOF

# =============================================================================
# 6. AppSidebar.tsx - 替换渲染逻辑：提取 NavGroupSection + 循环渲染 6 组
# =============================================================================
# 将 {!isModuleMode && ( ... )} 整个块（从 "平台模式：按核心/插件分组" 注释开始）
# 替换为 NavGroupSection 内联组件 + 6 业务域循环

python3 << 'PYEOF'
import re, sys

filepath = "${APP_SIDEBAR}"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 旧块：从 JSX 注释 "导航项列表" 到 {!isModuleMode && ( ... )} 的闭合 )}
# 使用锚点匹配：到 ")}" 后面紧跟空行和 "模块模式：sidebar_nav 列表" 注释
old_block_pattern = re.compile(
    r'(\{/\* ---- 导航项列表 ---- \*/\}\s*\n'
    r'\s*\{/\* 平台模式：按核心/插件分组 \*/\}\s*\n'
    r'\s*\{!isModuleMode && \(\s*\n'
    r'[\s\S]*?'
    r'\)\})'  # Group 1: 整个旧块到闭合 )}
    r'(\s*\n'
    r'\s*\n'
    r'\s*\{/\* 模块模式：sidebar_nav 列表 \*/\})',  # Group 2: 锚点（保留）
    re.DOTALL
)

new_block = r'''{/* ---- 导航项列表 ---- */}

        {/* ---- 平台模式：按业务域分组（Phase 3.1 - 6 域） ---- */}
        {!isModuleMode && (
          <>
            {/* NavGroupSection 内联组件：消除重复的 NavButton 渲染代码 */}
            {(() => {
              const NavGroupSection: React.FC<{
                title: string;
                items: NavItem[];
                showDivider?: boolean;
              }> = ({ title, items, showDivider = true }) => {
                if (items.length === 0) return null;
                return (
                  <>
                    {showDivider && (
                      <Box sx={{ my: 1, mx: 1, borderBottom: 1, borderColor: 'divider' }} />
                    )}
                    {!collapsed && (
                      <Typography
                        sx={{
                          px: 2,
                          py: 1,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          userSelect: 'none',
                        }}
                      >
                        {title}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {items.map((item: NavItem, index: number) => {
                        const isActive = Boolean(
                          item.path === location.pathname ||
                          (item.path && location.pathname.startsWith(`${item.path}/`))
                        );
                        const NavButton = (
                          <Box
                            component='button'
                            role='menuitem'
                            tabIndex={0}
                            key={item.code || `${item.label}-${index}`}
                            onClick={() => item.path && navigate(item.path)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                item.path && navigate(item.path);
                              }
                            }}
                            aria-current={isActive ? 'page' : undefined}
                            sx={navItemSx(isActive, true)}
                          >
                            {renderIcon(item.icon, 18) || (
                              <Typography sx={{ width: 18, height: 18, fontSize: 18 }} />
                            )}
                            {!collapsed && (
                              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                                  {item.label}
                                </Typography>
                                {item.badge && (
                                  <Chip
                                    size='small'
                                    label={item.badge}
                                    sx={{
                                      height: 16,
                                      fontSize: '0.625rem',
                                      fontWeight: 600,
                                      bgcolor: 'error.main',
                                      color: 'white',
                                      '& .MuiChip-label': {
                                        px: 0.5,
                                      },
                                    }}
                                  />
                                )}
                              </Box>
                            )}
                            {collapsed && item.badge && (
                              <MuiBadge
                                badgeContent={item.badge}
                                color='error'
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  '& .MuiBadge-badge': {
                                    fontSize: '0.625rem',
                                    height: 14,
                                    minWidth: 14,
                                  },
                                }}
                              />
                            )}
                          </Box>
                        );
                        return collapsed ? (
                          <Tooltip
                            key={item.code || `${item.label}-${index}`}
                            title={item.label}
                            placement='right'
                            arrow
                          >
                            {NavButton}
                          </Tooltip>
                        ) : (
                          NavButton
                        );
                      })}
                    </Box>
                  </>
                );
              };

              return (
                <>
                  {(Object.keys(BUSINESS_DOMAIN_CONFIG) as BusinessDomain[])
                    .sort((a, b) => BUSINESS_DOMAIN_CONFIG[a].order - BUSINESS_DOMAIN_CONFIG[b].order)
                    .map((domain, idx) => (
                      <NavGroupSection
                        key={domain}
                        title={BUSINESS_DOMAIN_CONFIG[domain].label}
                        items={domainNavItems[domain]}
                        showDivider={idx > 0}
                      />
                    ))}
                </>
              );
            })()}
          </>
        )}'''

# 替换：保留锚点注释（Group 2）
result = old_block_pattern.sub(new_block + r'\2', content)

if result == content:
    print('WARNING [6]: 未找到匹配的旧代码块，跳过渲染逻辑替换', file=sys.stderr)
    sys.exit(0)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result)

print('[6] 已替换渲染逻辑：提取 NavGroupSection + 循环渲染 6 业务域')
PYEOF

echo "Phase 3.1 Navigation Suite Grouping: DONE"
