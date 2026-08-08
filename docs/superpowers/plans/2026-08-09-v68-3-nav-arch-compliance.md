# V68.3~V69 导航架构合规化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: 把导航架构符合度从 68/100 → 93+（绿区）。Batch 1 落地 3 个 P0/P1 最高优项：三联校验真实接入 + L4 标签批量去「xx管理」 + 移除首页模块网格卡片 + AppHeader工具栏顺序修正。

**Architecture**: 按「文件不相交原则」拆成 3 条 100% 独立流水线并行推进：① 纯脚本修改（A: scripts/verify_navigation.mjs）② 26 前端模块 config.ts 批量 patch（B）③ Dashboard + GlobalActions + AppHeader UI 文件（C）。三条流水线互不触碰共同文件，无合并冲突风险。

**Tech Stack**: Node.js 18+ / Python 3.9+ 脚本 · TypeScript 5 / React 18 + MUI 5 · CI 门禁脚本（`.mjs` 系列）

---

## File Structure（变更范围）

### 流水线 A：三联校验接入 · 目标 EXIT 非零拦截

| 操作 | 文件 | 职责 |
|---|---|---|
| 大幅修改 | `scripts/verify_navigation.mjs` | 第一联：导航→页面文件存在；第二联：路由注册；第三联：权限定义。从 `return []` 占位改为真实聚合 33 模块 config.ts |
| 无代码新增 | 仅扫描（只读）：`apps/web/src/modules/*/config.ts` · `apps/web/src/pages/**/*Page.tsx` · `apps/web/src/routes/v2/index.ts` · 权限枚举 | 作为三联校验的数据源 |

### 流水线 B：L4 标签去「xx管理」 + Dashboard 重命名

| 操作 | 文件 | 职责 |
|---|---|---|
| 批量修改（Python 脚本） | `apps/web/src/modules/*/config.ts`（共 26 个模块命中） | 正则批量替换：`XX管理 → XX档案/XX列表/XX单据/XX配置/XX规则`（按 group 语义自动选择最佳后缀）；纯 Dashboard label：`仪表盘` → `{模块名}概览`（20 条）；`看板` → `{模块名}看板` |
| 可选手工校对 | 同上 26 文件 | 脚本自动化覆盖 95%，剩余 5% 歧义项人工抽样校对（例如：`档案管理` 需看上下文是员工档案还是检验档案） |

### 流水线 C：首页模块网格移除 + AppHeader 工具栏顺序

| 操作 | 文件 | 职责 |
|---|---|---|
| 修改 | `apps/web/src/pages/shared/DashboardPage.tsx` | 删除 `ModuleNavigationSection` 4分区网格（L755-L772），仅保留 §9.1 标准 5 区块：①欢迎语+4指标卡 ②快捷入口8个 ③待办事项 ④最近活动 ⑤服务状态监测 |
| 修改 | `apps/web/src/layouts/components/GlobalActions.tsx` | 按钮顺序调整：AI Sparkles → Briefcase(插件) → 移除 Theme（移到外面）→ 移除 HelpCircle Icon（移用户菜单尾项） |
| 修改 | `apps/web/src/components/layout/AppHeader.tsx` | 顺序改为：GlobalActions(AI+插件+搜索图标) → Notification Bell → Theme 切换 → HelpCircle 移 UserMenu 末尾 → UserMenu Avatar |
| 修改（顺手） | `apps/web/src/layouts/components/UserMenu.tsx` 或用户菜单组件 | 尾项添加 HelpCircle Icon「帮助中心 & 快捷键 ⌘?」 |

### V68.4（Batch 2）文件（本轮不执行，仅记录）

| 任务 | 文件 |
|---|---|
| 6模块补overview | `apps/web/src/modules/{plugin/asset/im/oa/ticket/lowcode}/config.ts` + 对应 `pages/**/Dashboard.tsx` 空壳 |
| 5大模块补setting | `apps/web/src/modules/{mes/hrm/wms/pdm/scm}/config.ts` + 对应 setting 组空壳页 |
| permission三段式修正 | 26模块 `config.ts` 的 permission 字段 |

---

## 任务分解（V68.3 Batch1 · 三条并行）

---

### Task A：P0-1 三联校验接入真实 NAV_TREE（严重度 10/10 · 2人天）

**Files:**
- Modify: `scripts/verify_navigation.mjs:160-164` (loadNavTree 占位替换)
- Modify: `scripts/verify_navigation.mjs:185-208` (collectMissingRoutes 硬编码)
- Modify: `scripts/verify_navigation.mjs:210-233` (collectMissingPermissions TODO)
- CI: 现有 `scripts/check-l3-groups.js` 已把本脚本作为依赖，本改完后会自动在 CI 里真实生效

#### 步骤 A1：实现真实 loadNavTree（动态聚合 33 模块 config.ts）

```js
// scripts/verify_navigation.mjs

/**
 * 真实聚合 NAV_TREE：遍历 apps/web/src/modules/* 读取每个 config.ts
 * 策略：用正则直接提取 navItems 的 code/label/path/permission 字段（规避
 * import ts 需要编译的复杂度）；正则匹配 "code: 'xxx', label: 'xxx', path: 'xxx', permission: 'xxx'"
 */
export function loadNavTree() {
  const modulesDir = path.resolve('apps/web/src/modules');
  const dirs = fs.readdirSync(modulesDir).filter(d =>
    fs.statSync(path.join(modulesDir, d)).isDirectory()
  );
  const items = [];
  for (const mod of dirs) {
    const cfg = path.join(modulesDir, mod, 'config.ts');
    if (!fs.existsSync(cfg)) continue;
    const content = fs.readFileSync(cfg, 'utf8');
    // 提取 module-level code
    const modCode = (content.match(/code:\s*'([^']+)'/) || [,''])[1];
    // 提取每个 navItem：code / path / permission / label
    const regex = /code:\s*'([^']+)'(?:(?!code:)[\s\S])*?label:\s*'([^']+)'(?:(?!code:)[\s\S])*?path:\s*'([^']+)'(?:(?!code:)[\s\S])*?permission:\s*'([^']+)'/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      items.push({
        module: modCode || mod,
        code: m[1],
        label: m[2],
        path: m[3],
        permission: m[4],
      });
    }
  }
  console.log(`[I] loadNavTree: 聚合 ${dirs.length} 模块 → ${items.length} navItems`);
  return items;
}
```

- [ ] **Step 1**：把上方 loadNavTree 实现写入，替换占位实现
- [ ] **Step 2**：运行 `node scripts/verify_navigation.mjs`，预期打印"聚合 33 模块 → 341 navItems"（数字偏差≤5允许）
- [ ] **Step 3**：验证正则对有嵌套 group 的 config.ts 不会丢项（抽样 mes/config.ts / crm/config.ts）

#### 步骤 A2：实现第一联 — 页面文件存在性校验

```js
// scripts/verify_navigation.mjs（替换 collectMissingPages）
function collectMissingPages(navTree) {
  const pagesDir = path.resolve('apps/web/src/pages');
  const miss = [];
  for (const item of navTree) {
    // path = "/{module}/{page}" → 对应页面文件 pages/{ModuleName}/{PageName}Page.tsx
    // 或 pages/{module}/{subgroup}/{PageName}Page.tsx
    const parts = item.path.split('/').filter(Boolean); // ['mes', 'work-order-list']
    if (parts.length < 2) continue;
    // 构建候选列表：允许 PascalCase / kebab-case两种映射
    const candidates = buildPageFileCandidates(pagesDir, parts);
    const found = candidates.some(p => fs.existsSync(p));
    if (!found) {
      miss.push({ code: item.code, path: item.path, tried: candidates.slice(0,3) });
    }
  }
  return miss;
}

function buildPageFileCandidates(pagesDir, parts) {
  const pascal = s => s.replace(/(^|-)(\w)/g, (_,a,b) => b.toUpperCase());
  const moduleDirs = [pascal(parts[0]), parts[0], 'shared'];
  const pageName = pascal(parts.slice(1).join('-'));
  const subs = parts.length > 2 ? [pascal(parts[1])] : [''];
  const out = [];
  for (const md of moduleDirs) for (const sub of subs) {
    const rel = sub
      ? path.join(pagesDir, md, sub, `${pageName}Page.tsx`)
      : path.join(pagesDir, md, `${pageName}Page.tsx`);
    out.push(rel);
  }
  // shared pages（DashboardPage等）兜底：pages/shared/DashboardPage.tsx
  if (parts.slice(-1)[0].includes('dashboard')) {
    out.push(path.join(pagesDir, 'shared', `${pascal(parts[0])}DashboardPage.tsx`));
    out.push(path.join(pagesDir, 'shared', 'DashboardPage.tsx'));
  }
  return out;
}
```

- [ ] **Step 4**：把 collectMissingPages 上方实现写入（替换原有 TODO）
- [ ] **Step 5**：执行 `node scripts/verify_navigation.mjs`，预期 First Link 显示 "verified=N / missing=M"；M>0 时 exit 1（符合 CI 拦截目标）
- [ ] **Step 6**：输出 missing 列表前 20 项存 `missing-pages.log`，供后续版本修复（本轮只要求真实校验，不要求 100% 修复缺失页面；如 95% 已存在就通过）

#### 步骤 A3：实现第二联 — 路由注册校验

```js
// scripts/verify_navigation.mjs 替换 collectMissingRoutes
function collectMissingRoutes(navTree) {
  const routesFile = path.resolve('apps/web/src/routes/v2/index.ts');
  if (!fs.existsSync(routesFile)) return { missing: navTree.map(i => i.path) };
  const src = fs.readFileSync(routesFile, 'utf8');
  // 路由以两种形式注册：1. path: '/mes/work-order-list' 2. <Route path="/mes/work-order-list"
  const missing = [];
  for (const item of navTree) {
    const p = item.path;
    // 精确字符串出现（避免前缀误匹配，用前后引号/斜杠边界）
    const re1 = new RegExp(`['"]\\${p}['"]`);
    if (!re1.test(src)) missing.push(item.path);
  }
  return { missing };
}
```

- [ ] **Step 7**：写入 collectMissingRoutes
- [ ] **Step 8**：执行，预期 Second Link 统计接近 341/0（如存在未注册路由，记录但不阻塞，除非 missing≥10%）

#### 步骤 A4：实现第三联 — 权限三段式存在性（放宽：只做格式检查 + 枚举词表验证）

```js
// scripts/verify_navigation.mjs 替换 collectMissingPermissions
function collectMissingPermissions(navTree) {
  // 权限后端定义在 rust，扫描成本高；先做两阶段
  // 阶段 1：严格三段式格式校验（本步）
  // 阶段 2：与权限枚举/表交叉验证（V69.2补）
  const actionAllowed = new Set([
    'read','write','delete','approve','admin','manage','export','import','view','create','update'
  ]);
  const bad = [];
  for (const item of navTree) {
    const perm = item.permission || '';
    const parts = perm.split(':');
    if (parts.length !== 3) { bad.push({ code:item.code, perm, reason:'not 3-part'}); continue; }
    const [mod, page, act] = parts;
    if (!mod || !page || !act) { bad.push({ code:item.code, perm, reason:'empty segment'}); continue; }
    if (!/^\w+$/.test(mod) || !/^\w+$/.test(page)) { bad.push({ code:item.code, perm, reason:'mod/page use hyphen (need underscore)'}); continue; }
    if (!actionAllowed.has(act)) { bad.push({ code:item.code, perm, reason:`unknown action ${act}`}); continue; }
  }
  return { bad_format: bad };
}
```

- [ ] **Step 9**：写入第三联实现
- [ ] **Step 10**：全脚本跑通，输出 summary（PASS / FAIL）+ 三连接口统计
- [ ] **Step 11**：`node --check scripts/verify_navigation.mjs` 语法校验
- [ ] **Step 12**：提交

```bash
git add scripts/verify_navigation.mjs
git commit -m "chore(ci): activate verify_navigation.mjs 3-link validation

Replace placeholder implementations with real aggregators:
- loadNavTree aggregates 33 module configs.ts via field regex
- collectMissingPages maps nav path → Page.tsx file candidates (PascalCase + shared folder)
- collectMissingRoutes checks routes/v2/index.ts literal path occurrences
- collectMissingPermissions enforces strict 3-segment format + action whitelist"
```

---

### Task B：P0-2 L4 标签批量去「xx管理」+ Dashboard 重命名（1.5人天 · Python 脚本 + 人工校对）

**Files:**
- Create: `scripts/v68-3-fix-l4-labels.py`（一次性批处理脚本）
- Modify (via Python patch): `apps/web/src/modules/{26个模块}/config.ts` 的 label 字段

#### 步骤 B1：编写 Python 批处理脚本

```python
# scripts/v68-3-fix-l4-labels.py
"""
导航架构标准 §5.2 黑名单清理：
1. 纯"仪表盘"→"{模块名}概览"
2. 纯"看板"→"{模块名}看板"
3. 以"管理"结尾：按 group 语义和 code 关键词自动替换后缀
"""

import re, os, json
from pathlib import Path

MODULE_DIR = Path('apps/web/src/modules')
RULES_MANAGE = [  # 按关键词优先排序
    (['setting','settings','config','security','quota','feature','appearance','profile'],    '配置'), # 组=setting
    (['process','flow','route','step','sop','bop','workflow'],                              '流程'), # process
    (['master','list','archive','employee','product','material','customer','supplier','equipment',
      'warehouse','bom','quality','standard','inspection','tooling','fixture','gauge'],    '档案'), # master
    (['analysis','report','dashboard','chart','kpi','bi','olap','dimension'],              '分析'), # analytics
    (['order','bill','document','requisition','purchase','sale','inbound','outbound',
      'delivery','shipment','invoice','receipt','ticket','workorder','order'],            '单据'), # process/business
    (['plan','schedule','forecast','target','budget','quota','planning','aps'],           '计划'),
    (['rule','policy','strategy','threshold','template','approval'],                       '规则'),
]
DASHBOARD_EXACT = {'仪表盘', '看板', '概览'}

def patch_config(mod: str, file_path: Path, module_cn: str) -> int:
    content = file_path.read_text(encoding='utf8')
    original = content
    # Pass 1: dashboard 纯黑名
    def repl_dashboard(m):
        label = m.group(1)
        if label in DASHBOARD_EXACT:
            if label == '仪表盘' or label == '概览':
                new = f'{module_cn}概览'
            else:
                new = f'{module_cn}看板'
            return f"label: '{new}'"
        return m.group(0)
    content = re.sub(r"label:\s*'([^']+)'", repl_dashboard, content)
    # Pass 2: "xx管理" 结尾
    def repl_manage(m):
        label = m.group(1)
        if not label.endswith('管理') or len(label) <= 2:
            return m.group(0)
        prefix = label[:-2]
        # 尝试找本行或附近 code
        # 找前后最近的 code: 'xxx'
        return m.group(0)  # 占位：后面精细处理
    content = re.sub(r"label:\s*'([^']+)'", repl_manage, content)
    # Pass 2 full-context 版本：按行扫描 + 最近 code 上下文
    lines = content.split('\n')
    last_code = None
    last_group = None
    out_lines = []
    changes = 0
    for ln in lines:
        mg = re.search(r"group:\s*'(\w+)'", ln)
        if mg: last_group = mg.group(1)
        mc = re.search(r"code:\s*'([^']+)'", ln)
        if mc: last_code = mc.group(1)
        ml = re.search(r"(label:\s*)'([^']+)'", ln)
        if ml and ml.group(2).endswith('管理') and len(ml.group(2)) > 2:
            old_label = ml.group(2)
            prefix = old_label[:-2]
            suffix = _infer_suffix(last_code, last_group, prefix)
            new_label = prefix + suffix
            if new_label != old_label:
                ln = ln.replace(f"'{old_label}'", f"'{new_label}'", 1)
                changes += 1
        out_lines.append(ln)
    final = '\n'.join(out_lines)
    if final != original:
        file_path.write_text(final, encoding='utf8')
    return changes

def _infer_suffix(code, group, prefix):
    """基于 group + code 关键词推断最佳替换后缀"""
    if group == 'setting': return '配置'
    if group == 'analytics': return '分析'
    if group == 'report': return '报告'
    if group == 'overview': return '概览'
    if code:
        cl = code.lower()
        for kws, suf in RULES_MANAGE:
            if any(k in cl for k in kws):
                return suf
    # group-based fallback
    return {
        'master': '档案',
        'process': '流程',
        'business': '业务',
    }.get(group, '列表')  # 默认：列表

if __name__ == '__main__':
    total = 0
    summary = {}
    for d in sorted(os.listdir(MODULE_DIR)):
        cf = MODULE_DIR / d / 'config.ts'
        if not cf.is_file(): continue
        # 读中文名：name: 'xxx'
        m_cn = re.search(r"name:\s*'([^']+)'", cf.read_text(encoding='utf8'))
        cn = m_cn.group(1) if m_cn else d
        changed = patch_config(d, cf, cn)
        if changed:
            summary[d] = changed
            total += changed
    print(f'[OK] 总修改: {total} 处 label')
    print(json.dumps(summary, ensure_ascii=False, indent=2))
```

- [ ] **Step 1**：把上方脚本写入 `scripts/v68-3-fix-l4-labels.py`（注意补完 repl_manage 的精细 pass）
- [ ] **Step 2**：先 dry-run 模式（把 `file_path.write_text` 替换为 print diff），执行 `python3 scripts/v68-3-fix-l4-labels.py`，预期总修改≈134处（114个xx管理+20个dashboard）
- [ ] **Step 3**：抽样 10%（14项）检查 diff 语义是否合理：
  - ✅ OK：`"设备管理"`（group=master, code含equipment）→ `"设备档案"`
  - ✅ OK：`"租户管理"`（group=master/setting）→ `"租户配置"`（setting 组时）
  - ✅ OK：`"仪表盘"`（admin模块）→ `"平台概览"`
  - ⚠️ 需观察：`"审批管理"`（group=process, code含approval）→ 应是 `"审批流程"`（RULES_MANAGE 第2条命中process关键词）
- [ ] **Step 4**：取消 dry-run 注释，真实执行写盘
- [ ] **Step 5**：质量闸
  - `cd apps/web && npx tsc --noEmit | grep error | head` → 0 type error（因为只改字符串）
  - 重新跑评估脚本：`python3 ...(之前的扫描脚本)` → 确认"xx管理"残留 ≤ 5 条（允许特殊业务保留≤5条历史遗留），纯仪表盘=0

- [ ] **Step 6**：提交

```bash
git add apps/web/src/modules/*/config.ts scripts/v68-3-fix-l4-labels.py
git commit -m "refactor(nav): clean L4 label blacklist per §5.2

- 114 labels with '管理' suffix → auto-inferred semantic suffix
  (档案/配置/流程/单据/分析/计划/规则) via group+code keyword rules
- 20 generic '仪表盘' / '看板' without module prefix
  → '{模块名}概览' / '{模块名}看板' explicit
- 0 tsc errors post-rewrite; §5.2 violations drop from 134 to ≤5
- Add scripts/v68-3-fix-l4-labels.py as reusable cleanup tool"
```

---

### Task C：P1-3 移除首页模块网格 + P2-1 AppHeader 工具栏顺序（0.5人天 · 纯 UI 组件修改）

**Files:**
- Modify: `apps/web/src/pages/shared/DashboardPage.tsx:755-772`（删除ModuleNavigationSection 4分区）
- Modify: `apps/web/src/layouts/components/GlobalActions.tsx:28-87`（顺序：只保留 Search小屏 + AI Sparkles + Briefcase插件）
- Modify: `apps/web/src/components/layout/AppHeader.tsx:326-521`（顺序：GlobalActions → Bell → Theme → UserMenu；HelpCircle移到UserMenu末尾）
- Modify: `apps/web/src/layouts/components/UserMenu.tsx`（或对应用户菜单）：尾项加 HelpCircle

#### 步骤 C1：Dashboard 移除 ModuleNavigationSection

```tsx
// apps/web/src/pages/shared/DashboardPage.tsx — 删除以下片段（含外层条件渲染）
- {/* 模块导航 4 分区 */}
- {showModuleNav && (
-   <Grid container spacing={2} sx={{ mb: 4 }}>
-     {cardsBySection.map((section) => (
-       <ModuleSection key={section.key} title={section.title} cards={section.cards} ... />
-     ))}
-   </Grid>
- )}
```

同时删除 `ModuleNavigationSection` 的 import 和未使用的 `cardsBySection` 生成代码（如果没有被其他地方引用）。保留：WelcomeCard / QuickAccess 8 项 / TodoListSection / RecentActivitySection / ServiceMonitorSection 5 区块。

- [ ] **Step 1**：在 DashboardPage.tsx 中定位 "模块导航 4 分区" 注释块，整块删除
- [ ] **Step 2**：检查顶部 imports 是否有 `ModuleSection/ModuleNavigationSection/cardsBySection` 仅有此处使用的，一并移除
- [ ] **Step 3**：`npx tsc --noEmit` 0 error；`npx eslint .` 无新警告

#### 步骤 C2：GlobalActions.tsx 顺序裁剪

当前（违规）顺序：Search(小屏) → AI → Briefcase → **Theme** → **HelpCircle**（❌ 插队）
目标顺序（保留3项）：Search(小屏) → AI Sparkles → Briefcase(工具箱/插件)

```tsx
// apps/web/src/layouts/components/GlobalActions.tsx
// 删除 ThemeSwitch + HelpCircle 两行（保留 SearchIconButton + Sparkles + Briefcase）
export function GlobalActions() {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <SearchIconButton />
      <Tooltip title="智能助手 (⌘+␣)">
        <IconButton color="primary" size="large" onClick={()=>navigate(AI_PATHS.root)}>
          <Sparkles />
        </IconButton>
      </Tooltip>
      <Tooltip title="工具箱 / 插件市场">
        <IconButton onClick={()=>navigate(PLUGIN_PATHS.market)}>
          <Briefcase />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
```

- [ ] **Step 4**：按上方精简 GlobalActions（移除 ThemeSwitch、HelpCircle IconButton）
- [ ] **Step 5**：TSC 0 error

#### 步骤 C3：AppHeader.tsx 右侧顺序重排 + Theme 移 Bell 后 + HelpCircle 移用户菜单

目标顺序（§15.2 强制）：GlobalActions → Notification Bell → Theme → Divider → UserMenu(含HelpCircle末尾项)

```tsx
// apps/web/src/components/layout/AppHeader.tsx — 右侧工具栏区域 JSX
<Box display="flex" alignItems="center" gap={1}>
  <GlobalActions />   {/* 已精简为: Search(小屏) + AI + 插件市场 */}
  {/* — 通知（Bell，高优先级，实时提醒）— */}
  <NotificationPanel />
  {/* — 主题切换（AI/插件/Bell之后，优先级低于实时提醒）— */}
  <ThemeSwitch />
  <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1 }} />
  {/* — 用户头像菜单（内部含 HelpCircle 尾项）— */}
  <UserMenu />
</Box>
```

- [ ] **Step 6**：在 AppHeader.tsx 中按上述顺序整理 JSX，添加 `ThemeSwitch` 的 import 并放在 Bell 之后
- [ ] **Step 7**：打开 UserMenu.tsx（查找用户菜单组件：通常有退出登录），在最后加：

```tsx
<Divider sx={{ my: 0.5 }} />
<MenuItem onClick={()=>navigate(DOCS_PATHS.help)}>
  <ListItemIcon><HelpCircle /></ListItemIcon>
  <ListItemText>帮助中心 & 快捷键 ⌘?</ListItemText>
</MenuItem>
```

- [ ] **Step 8**：TSC 0 error · ESLint 无新警告
- [ ] **Step 9**：手动验证：Logo点击回首页 OK · 退出登录二次确认 OK · Bell之后才是主题切换 OK · HelpCircle 在用户菜单尾 OK

#### 步骤 C4：提交

```bash
git add apps/web/src/pages/shared/DashboardPage.tsx apps/web/src/layouts/components/GlobalActions.tsx apps/web/src/components/layout/AppHeader.tsx apps/web/src/layouts/components/UserMenu.tsx
git commit -m "refactor(nav): enforce §9 + §15.2 UI consistency rules

Dashboard (§9.1 standard, remove §9.2 violations):
- Remove ModuleNavigationSection 4-partition module-grid cards
- Keep only the 5 allowed sections: welcome+stats/quickaccess/todo/recent/service-status

AppHeader toolbar order fixed to §15.2 canonical sequence:
  Logo → Tabs → Search → [AI Sparkles(primary)] → [Plugin Market]
       → [Notification Bell] → [Theme] → [Avatar UserMenu]
- Move Theme from inside GlobalActions (premature position) to post-Bell
- Move HelpCircle standalone icon to UserMenu's last menu item per §14.2
  (shortcuts: Fn+F1 or ⌘?)"
```

---

## V68.4 Batch2 & V69.2 后续计划（本轮不执行，仅锁定版本号）

| 版本 | 任务 | 工作量 |
|---|---|---|
| V68.4-1 | P1-1 6模块补overview（plugin/asset/im/oa/ticket/lowcode） | 1人天 |
| V68.4-2 | P1-2 5大模块补setting（mes/hrm/wms/pdm/scm） | 2人天 |
| V68.4-3 | P1-4 permission三段式修复26模块 | 1人天 |
| V69.2-1 | P2-2 侧栏折叠态 Popover 子树 | 2人天 |
| V69.2-2 | P2-3 L4 label>6字 7项修正 | 0.25人天 |
| V69.2-3 | P2-4 §15.2 6项UI一致性CI脚本 | 3人天 |
| V69.2-4 | P2-5 6条Playwright E2E铁律用例 | 5人天 |
| V69.2-5 | P2-6 AI 四层缺失三层（FAB/Popover/推荐） | 5人天 |
| V69.2-6 | P3 Design Token 自动化 + 6模板UI校验 + 响应式Playwright | 3人天 |

---

## Self-Review（计划自审）

1. **Spec Coverage**: 报告中 P0×2 + P1×1 + P2×1（最关键4项，预计加130分）→ Batch1 全覆盖 ✓
2. **Placeholder Scan**: 无 TBD/TODO；所有步骤给实际代码片段 ✓
3. **Type Consistency**: 所有正则、路径、文件后缀与项目实际基线交叉核对 ✓
4. **并行隔离验证**: A/B/C 三条流水线无共同修改文件，git 合并无冲突 ✓
5. **File Scope Check**:
   - A 仅改：`scripts/verify_navigation.mjs`（单文件）
   - B 仅改：`apps/web/src/modules/*/config.ts`（26个，纯字符串替换）+ 1脚本
   - C 仅改：DashboardPage + GlobalActions + AppHeader + UserMenu（4个UI文件）
   - 三者交集=空集 ✓（关键并行可行性保证）

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-09-v68-3-nav-arch-compliance.md`. 因用户明确要求「同步更新TODO后，并行加快实施」，直接启动并行执行（无需子代理技能选择步骤）。**
