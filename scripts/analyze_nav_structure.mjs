#!/usr/bin/env node
/**
 * 脚本：扫描 33 个 modules 下的 config.ts，提取 navItems 完整结构
 * 输出：业务域（L1） → 模块（L2） → 子组（L3，若存在） → 页面（L4）
 * 运行方式：node scripts/analyze_nav_structure.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODULES_DIR = join(__dirname, '..', 'apps/web/src/modules');

// 字段正则（支持单双引号）
const FIELD = (name) => new RegExp(`${name}:\\s*['"]([^'"]+)['"]`, 'm');
const FIELD_NUM = (name) => new RegExp(`${name}:\\s*(\\d+)`, 'm');
const FIELD_CHILDREN_OPEN = /navItems:\s*\[/;

// 解析 navItems 数组：用简单的大括号计数器匹配 [{...}, {...}]
function parseNavItems(text, startIdx) {
  const items = [];
  let i = startIdx;
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let start = -1;

  while (i < text.length) {
    const ch = text[i];
    const prev = text[i - 1] || '';

    if (!inString && (ch === '"' || ch === "'")) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar && prev !== '\\') {
      inString = false;
    }

    if (!inString) {
      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          const block = text.slice(start, i + 1);
          items.push(parseNavItemBlock(block));
          start = -1;
        }
      } else if (ch === ']' && depth === 0) {
        break; // navItems 数组结束
      }
    }
    i++;
  }
  return items;
}

function parseNavItemBlock(block) {
  const get = (re) => {
    const m = block.match(re);
    return m ? m[1] : null;
  };
  const result = {
    code: get(FIELD('code')),
    label: get(FIELD('label')),
    icon: get(FIELD('icon')),
    path: extractPath(block),
    permission: get(FIELD('permission')),
    group: get(FIELD('group')),
    order: (() => {
      const m = block.match(/order:\s*(\d+)/);
      return m ? parseInt(m[1], 10) : 9999;
    })(),
    description: get(FIELD('description')),
    // 支持 children（三级/四级结构嵌套）
    children: (() => {
      const m = block.match(/children:\s*(\[)/);
      if (!m) return null;
      // 找到 children 数组开始的 index
      const idx = m.index + m[0].length - 1;
      return parseNavItems(block, idx);
    })(),
  };
  return result;
}

// 从形如 MES_PATHS.workstation, ADMIN_PATHS.dashboard('/:id') 中抽取可读字符串
function extractPath(block) {
  const m = block.match(/path:\s*([A-Z_]+PATHS\.\w+(?:\s*\([^)]*\))?)/);
  if (m) return m[1].trim();
  const direct = block.match(/path:\s*['"]([^'"]+)['"]/);
  if (direct) return direct[1];
  return null;
}

const modules = [];
const dirEntries = readdirSync(MODULES_DIR);

for (const entry of dirEntries) {
  const entryPath = join(MODULES_DIR, entry);
  if (!statSync(entryPath).isDirectory()) continue;
  const configFile = join(entryPath, 'config.ts');
  try {
    const src = readFileSync(configFile, 'utf8');
    // 精准定位 NavConfig 对象：从 "export const xxxNavConfig: ModuleNavConfig = {" 开始
    const navConfigStart = src.search(/export\s+const\s+\w+NavConfig\s*:\s*ModuleNavConfig\s*=\s*\{/);
    if (navConfigStart === -1) continue;
    const navBlock = src.slice(navConfigStart);

    // 在 NavConfig 头部提取字段（避免 routes 数组里同名的 code 干扰）
    const header = navBlock.slice(0, navBlock.indexOf('navItems:') > 0 ? navBlock.indexOf('navItems:') : 2000);
    const headerMatch = header.match(/code:\s*['"]([^'"]+)['"]/);
    if (!headerMatch) continue;

    const moduleCode = headerMatch[1];
    const name = header.match(/name:\s*['"]([^'"]+)['"]/)?.[1] || moduleCode;
    const icon = header.match(/icon:\s*['"]([^'"]+)['"]/)?.[1] || '';
    const perm = header.match(/permission:\s*['"]([^'"]+)['"]/)?.[1] || '';
    const source = header.match(/source:\s*['"]([^'"]+)['"]/)?.[1] || '';
    const suite = header.match(/suite:\s*['"]([^'"]+)['"]/)?.[1] || '未分组';
    const status = header.match(/status:\s*['"]([^'"]+)['"]/)?.[1] || 'online';
    const orderMatch = header.match(/order:\s*(\d+)/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 9999;
    const desc = header.match(/description:\s*['"]([^'"]+)['"]/)?.[1] || '';

    // 找 navItems 数组
    const navMatch = src.match(/navItems:\s*(\[)/);
    let navItems = [];
    if (navMatch) {
      const startIdx = navMatch.index + navMatch[0].length - 1;
      navItems = parseNavItems(src, startIdx);
    }

    // 按 group 分组
    const byGroup = {};
    for (const item of navItems) {
      const g = item.group || 'other';
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(item);
    }

    modules.push({
      code: moduleCode,
      name,
      icon,
      permission: perm,
      source,
      suite,
      status,
      order,
      desc,
      navItems,
      byGroup,
      pageCount: navItems.length + countNestedPages(navItems),
    });
  } catch (e) {
    // 跳过
  }
}

function countNestedPages(items) {
  let n = 0;
  for (const it of items) {
    if (it.children && it.children.length) n += it.children.length;
  }
  return n;
}

modules.sort((a, b) => a.order - b.order);

console.log('\n========== TOPEMS 四层导航深度核对 ==========');
console.log(`L1 业务域 x ${new Set(modules.map(m => m.suite)).size}`);
console.log(`L2 模块数  x ${modules.length}`);
const l3Count = modules.reduce((s, m) => s + Object.keys(m.byGroup).length, 0);
console.log(`L3 子组数  x ${l3Count} (每个模块的 navItems.group 不同值)`);
const pageTotal = modules.reduce((s, m) => s + m.pageCount, 0);
console.log(`L4 页面入口 x ${pageTotal}`);

console.log('\n========== L1 业务域 → L2 模块 完整映射表 ==========');

const suiteGroups = {};
for (const m of modules) {
  if (!suiteGroups[m.suite]) suiteGroups[m.suite] = [];
  suiteGroups[m.suite].push(m);
}

// 推荐的 L1 重新分类（原 12 个 "未分组" 全部归类）
const RECOMMEND_L1 = {
  '企业平台': {
    order: 10,
    emoji: '🏢',
    desc: '租户、权限、报表、BI、主数据、插件市场',
    modules: ['admin', 'iam', 'report', 'bi', 'pdm', 'plugin', 'erp'],
  },
  '制造域': {
    order: 20,
    emoji: '🏭',
    desc: 'MES 生产 + EHS 安全环保',
    modules: ['mes', 'ehs'],
  },
  '质量域': {
    order: 30,
    emoji: '🔬',
    desc: 'QMS 质量管理 + LIMS 实验室',
    modules: ['qms', 'lims'],
  },
  '供应链域': {
    order: 40,
    emoji: '📦',
    desc: 'SCM 采购 + WMS 仓储 + SRM 供应商',
    modules: ['scm', 'wms', 'srm'],
  },
  '财务域': {
    order: 50,
    emoji: '💰',
    desc: '财务管理 (ERP 财务部分建议迁移)',
    modules: ['finance'],
  },
  '人力域': {
    order: 60,
    emoji: '👥',
    desc: 'HRM 员工、考勤、薪酬、招聘、培训',
    modules: ['hrm'],
  },
  '客户域': {
    order: 70,
    emoji: '🤝',
    desc: 'CRM 客户、商机、合同',
    modules: ['crm'],
  },
  '项目域': {
    order: 80,
    emoji: '🗓️',
    desc: 'PM 项目 + RD 研发',
    modules: ['pm', 'rd'],
  },
  '工具与协同域': {
    order: 90,
    emoji: '🧰',
    desc: '原"未分组"的协同办公工具统一收纳',
    modules: ['workflow', 'doc', 'notification', 'ticket', 'oa', 'im', 'asset', 'mobile'],
  },
  '平台能力域': {
    order: 100,
    emoji: '⚙️',
    desc: '低代码/集成/监控/自动化/AI/GIS',
    modules: ['integration', 'monitor', 'automation', 'lowcode', 'ai', 'gis'],
  },
};

// 反向校验：每个 module code 都有归属
const assigned = new Set();
for (const [domain, cfg] of Object.entries(RECOMMEND_L1)) {
  for (const code of cfg.modules) assigned.add(code);
}
const unassigned = modules.map(m => m.code).filter(c => !assigned.has(c));
console.log('\n--- 推荐 L1 分域结果（L2 覆盖率） ---');
for (const [domain, cfg] of Object.entries(RECOMMEND_L1)) {
  const present = cfg.modules.filter(code => modules.find(m => m.code === code));
  const msgs = present.map(code => {
    const m = modules.find(x => x.code === code);
    return `${m.name}(${m.code})·${m.pageCount}页`;
  }).join('，');
  console.log(`\n  ${cfg.order.toString().padStart(2)} ${cfg.emoji} ${domain}（${present.length} 模块）`);
  console.log(`     ${cfg.desc}`);
  if (msgs) console.log(`     L2 模块：${msgs}`);
  const orig = [...new Set(present.map(c => modules.find(m => m.code === c).suite))].filter(Boolean).join(' / ');
  if (orig) console.log(`     原 suite：${orig}`);
  const missing = cfg.modules.filter(code => !modules.find(m => m.code === code));
  if (missing.length) console.log(`     ⚠️  代码中暂无：${missing.join(',')}`);
}
if (unassigned.length) {
  console.log(`\n⚠️  未在推荐 L1 中归属的模块（${unassigned.length}）：${unassigned.join(',')}`);
} else {
  console.log('\n✅ L1→L2 映射 100% 覆盖全部 33 个模块！');
}

// L3/L4 展开抽样：展示三个典型大模块（MES/HRM/ERP）的分组详情
console.log('\n========== 抽样：3 个大模块的 L3 子组 → L4 页面展开（验证原导航全部纳入）==========');

for (const code of ['mes', 'hrm', 'qms', 'wms']) {
  const m = modules.find(x => x.code === code);
  if (!m) continue;
  console.log(`\n  [L2] ${m.name}（${m.code}）共 ${m.navItems.length} 一级菜单，${m.pageCount} 页面`);
  for (const [group, items] of Object.entries(m.byGroup).sort((a, b) => {
    // L3 标准 8 枚举 order（与 types.ts 的 NAV_GROUPS 对齐）
    const NA_GROUPS = { overview: 0, master: 10, process: 20, business: 30, analytics: 40, report: 50, setting: 60, other: 99 };
    return (NA_GROUPS[a[0]] ?? 99) - (NA_GROUPS[b[0]] ?? 99);
  })) {
    const groupMap = {
      overview:  '概览仪表盘',
      master:    '基础主数据',
      process:   '核心业务流程',
      business:  '业务单据管理',
      analytics: '统计分析',
      report:    '报表与打印',
      setting:   '配置与模板',
      other:     '其他',
    };
    console.log(`    [L3] ${groupMap[group] || group}（${items.length} 页）：`);
    for (const item of items) {
      const suffix = item.children && item.children.length ? ` (+${item.children.length}子页)` : '';
      console.log(`       · [L4] ${item.label} (${item.code})${suffix}`);
    }
  }
}

// 检查是否有模块 navItems 为空（只有模块首页，无二级）
const emptyL4 = modules.filter(m => m.navItems.length === 0);
if (emptyL4.length) {
  console.log('\n⚠️  无二级菜单的模块（纯一级跳转，需补 L4 细节）：');
  for (const m of emptyL4) console.log(`   · ${m.name}(${m.code})`);
} else {
  console.log('\n✅ 所有模块均定义了 navItems，原导航完整覆盖。');
}
