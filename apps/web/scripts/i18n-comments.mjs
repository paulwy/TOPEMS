import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const CHINESE_RE = /[\u4e00-\u9fff]/;

const translations = {
  // iam
  '公司架构管理页面': 'Company structure management page',
  '管理母子公司关系、持股比例、控制类型等，用于合并报表': 'Manage parent-subsidiary company relationships, ownership ratios, control types, etc. for consolidated reporting',
  '关系类型配置': 'Relationship type configuration',
  '公司架构树节点组件': 'Company structure tree node component',
  '状态': 'Status',
  '查询公司关系列表': 'Query company relationship list',
  '查询公司架构树': 'Query company structure tree',
  '创建公司关系': 'Create company relationship',
  '更新公司关系': 'Update company relationship',
  '删除公司关系': 'Delete company relationship',
  '处理展开/折叠': 'Handle expand/collapse',
  '处理选择关系': 'Handle select relationship',
  '处理删除关系': 'Handle delete relationship',
  '关系列表列定义': 'Relationship list column definitions',
  '搜索栏': 'Search bar',
  '公司架构内容': 'Company structure content',
  '架构树视图': 'Structure tree view',
  '关系列表视图': 'Relationship list view',
  '统计信息': 'Statistics',
  '提示信息': 'Tips',
  '用户管理页面 — Schema 驱动的 CRUD 页面': 'User management page - Schema-driven CRUD page',
  '使用 userSchema 配置 + CrudPage 组件，': 'Using userSchema config + CrudPage component,',
  '代码量从 ~910 行缩减到 ~100 行，减少约 89%。': 'Code reduced from ~910 lines to ~100 lines, ~89% reduction.',
  '用户管理 API 适配器': 'User management API adapter',
  '用户管理页面组件': 'User management page component',
  // rd
  '默认数据': 'Default data',
  '当前Tab的数据': 'Current tab data',
  '创建本地数据的API适配器（支持所有Tab）': 'Create local data API adapter (supports all tabs)',
  '获取当前Tab的标题': 'Get current tab title',
  '统计概览': 'Statistics overview',
  '左侧Tab导航': 'Left tab navigation',
  '右侧内容区 - 使用CrudPage': 'Right content area - using CrudPage',
  '各Tab特有的额外内容': 'Extra content specific to each tab',
  '页面头部': 'Page header',
  '试验概览': 'Experiment overview',
  '详细信息标签页': 'Detail info tabs',
  '实验记录': 'Experiment records',
  '数据结果': 'Data results',
  '批次追溯': 'Batch traceability',
  '添加记录对话框': 'Add record dialog',
  '文档为统计派生数据，删除后重新查询将刷新列表': 'Documents are derived from statistics; deleting and re-querying will refresh the list',
  // lims
  'Sidebar - 关联检验任务': 'Sidebar - Related inspection tasks',
  'Sidebar - 检验进度': 'Sidebar - Inspection progress',
  'Sections - 检验统计': 'Sections - Inspection statistics',
  '检测方法管理页面 — Schema 驱动的 CRUD 页面': 'Test method management page - Schema-driven CRUD page',
  // ehs
  '用于统计计算的字段（原页面使用的字段集合）': 'Fields used for statistics calculation (field set used by original page)',
  '统计数据查询（使用 schema entity 作为 key 前缀，CRUD 变更会自动失效）': 'Statistics query (uses schema entity as key prefix, CRUD changes auto-invalidate)',
  'MSDS 弹窗状态': 'MSDS modal state',
};

function translateText(text) {
  const trimmed = text.trim();
  if (translations[trimmed]) return translations[trimmed];
  // Try partial matches
  for (const [zh, en] of Object.entries(translations)) {
    if (trimmed.includes(zh)) {
      return trimmed.replace(zh, en);
    }
  }
  return text; // Return original if no translation found
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return 0;

  const lines = content.split('\n');
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!CHINESE_RE.test(line)) continue;

    let newLine = line;

    // Match // comment with Chinese (but not URL-like //)
    const commentMatch = line.match(/^(\s*)(\/\/\s*)(.+)$/);
    if (commentMatch && CHINESE_RE.test(commentMatch[3])) {
      const translated = translateText(commentMatch[3]);
      if (translated !== commentMatch[3]) {
        newLine = commentMatch[1] + commentMatch[2] + translated;
        changes++;
      }
    }

    // Match * comment (JSDoc) with Chinese
    const jsdocMatch = line.match(/^(\s*\*\s)(.+)$/);
    if (jsdocMatch && CHINESE_RE.test(jsdocMatch[2]) && !line.includes('*/')) {
      const text = jsdocMatch[2];
      if (text && !text.startsWith('@')) {
        const translated = translateText(text);
        if (translated !== text) {
          newLine = jsdocMatch[1] + translated;
          changes++;
        }
      }
    }

    // Match {/* 中文 */} JSX comments (on single line)
    const jsxCommentMatches = [...line.matchAll(/\{\/\*\s*([^*]+)\s*\*\/\}/g)];
    for (const m of jsxCommentMatches) {
      if (CHINESE_RE.test(m[1])) {
        const translated = translateText(m[1]);
        if (translated !== m[1]) {
          newLine = newLine.replace(m[0], `{/* ${translated} */}`);
          changes++;
        }
      }
    }

    lines[i] = newLine;
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }
  return changes;
}

const modules = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['lims', 'ehs', 'rd', 'iam'];
console.log('=== TOPEMS i18n 注释翻译 ===');
let total = 0;
for (const mod of modules) {
  const modulePath = path.join(projectRoot, 'src', 'pages', mod);
  if (!fs.existsSync(modulePath)) continue;
  let modTotal = 0;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.tsx?$/.test(e.name)) modTotal += processFile(fp);
    }
  }
  walk(modulePath);
  console.log(`  ${mod}: ${modTotal} 处`);
  total += modTotal;
}
console.log(`总计: ${total} 处`);
