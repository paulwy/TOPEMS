/**
 * Safe i18n replacement script — processes Chinese hardcoding in code files.
 *
 * Safety rules:
 * 1. Process line by line (NEVER cross line boundaries)
 * 2. Skip lines that already contain i18n.t( or useTranslation
 * 3. Skip object literal keys (Chinese followed by :)
 * 4. Skip import/export/from statements
 * 5. Skip comments (// /* {/*)
 * 6. Skip template literals with ${} expressions
 * 7. Only replace Chinese in:
 *    a. String literals: '中文' or "中文"  →  i18n.t('module.page.key')
 *    b. JSX attributes: attr='中文'          →  attr={i18n.t('module.page.key')}
 *    c. JSX text: >中文<                     →  >{i18n.t('module.page.key')}<
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/;
const CHINESE_STRING_RE = /[\u4e00-\u9fff].{0,200}/;

// ── Helpers ──────────────────────────────────────────────

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return {}; }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
      typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/** Convert Chinese text to a safe key using a short hash (no Chinese in keys). */
function textToKey(text) {
  const sanitized = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  // Simple hash: generate a short hex hash from the text
  let hash = 0;
  for (let i = 0; i < sanitized.length; i++) {
    const ch = sanitized.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash; // Convert to 32-bit int
  }
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0').slice(0, 6);
  return `text_${hashHex}`;
}

/** Convert Chinese text to an English slug for readability (best-effort). */
function textToSlug(text) {
  // Just return the hash key; English translation would require a dictionary
  return textToKey(text);
}

function fileNameToPrefix(filePath) {
  const base = path.basename(filePath).replace(/\.tsx?$/, '');
  // Convert PascalCase/camelCase to snake_case
  return base
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/^./, c => c.toLowerCase());
}

/** Check if a line should be skipped entirely. */
function shouldSkipLine(line) {
  const trimmed = line.trim();
  // Skip empty lines
  if (!trimmed) return true;
  // Skip import/export lines
  if (/^\s*(import|export)\s/.test(line)) return true;
  // Skip useTranslation hook lines (but NOT lines that merely call t())
  if (/useTranslation/.test(line) && !/i18n\.t\s*\(/.test(line)) return true;
  // Skip comment-only lines
  if (/^\s*\/\//.test(line)) return true;
  if (/^\s*\*/.test(line)) return true;
  if (/^\s*\{\/\*/.test(line)) return true;
  // Skip console statements
  if (/console\./.test(line)) return true;
  // Skip lines with require()
  if (/require\s*\(/.test(line)) return true;
  return false;
}

/** Check if a Chinese string is an object literal key: `中文: value` or `'中文': value`. */
function isObjectKey(line, matchStart, matchEnd) {
  // Check if the character after the match end is a colon (allowing whitespace)
  const after = line.slice(matchEnd).match(/^\s*:/);
  if (after) return true;
  // Check if the string is quoted and followed by colon: '中文': or "中文":
  return false;
}

/** Check if the Chinese text is inside a comment on this line. */
function isInsideComment(line, position) {
  // Check if position is after // or /* or {/* on the same line
  const before = line.slice(0, position);
  if (before.includes('//')) return true;
  if (before.includes('/*')) return true;
  return false;
}

// ── Main processing ──────────────────────────────────────

function processFile(filePath, moduleName, jsonKeys) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return { changes: 0, keys: 0 };

  const lines = content.split('\n');
  const prefix = fileNameToPrefix(filePath);
  const pageKey = prefix.replace(/_/g, '');
  if (!jsonKeys[pageKey]) jsonKeys[pageKey] = {};

  const hasI18nImport = /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(content) ||
                        /import\s+\{[^}]*i18n[^}]*\}\s+from\s+['"]/.test(content);
  const hasUseTranslation = /useTranslation/.test(content);

  // Decide which function to use
  const useT = hasUseTranslation;
  const fnName = useT ? 't' : 'i18n.t';

  let totalChanges = 0;
  let totalKeys = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!CHINESE_RE.test(line)) continue;
    if (shouldSkipLine(line)) continue;

    const originalLine = line;
    const replacements = []; // {start, end, newText}

    // ── Pass 1: JSX text content: >中文< or >中文 text< (simple, no expressions) ──
    // Match > followed by Chinese text followed by <
    const jsxTextRe = />([^<>{}]*[\u4e00-\u9fff][^<>{}]*)</g;
    for (const m of line.matchAll(jsxTextRe)) {
      const text = m[1].trim();
      if (!text || !CHINESE_RE.test(text)) continue;
      if (isInsideComment(line, m.index)) continue;

      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) {
        jsonKeys[pageKey][key] = text;
        totalKeys++;
      }
      const replacement = `{${fnName}('${fullKey}')}`;
      // Replace only the text part, keep > and <
      const textStart = m.index + 1; // after >
      const textEnd = m.index + m[0].length - 1; // before <
      // Find the actual text boundaries within the match
      const fullMatch = m[0];
      const gtIndex = fullMatch.indexOf('>');
      const ltIndex = fullMatch.lastIndexOf('<');
      const textContent = fullMatch.slice(gtIndex + 1, ltIndex);
      const leadingSpaces = textContent.match(/^\s*/)[0];
      const trailingSpaces = textContent.match(/\s*$/)[0];

      replacements.push({
        start: m.index + gtIndex + 1 + leadingSpaces.length,
        end: m.index + gtIndex + 1 + textContent.length - trailingSpaces.length,
        newText: `{${fnName}('${fullKey}')}`,
      });
    }

    // ── Pass 2: JSX attributes: label='中文' or placeholder="中文" ──
    // Convert attr='中文' to attr={i18n.t('key')} or attr={t('key')}
    // IMPORTANT: exclude <>{} from char class to prevent matching across JSX tags
    const attrRe = /(\w+)=["']([^"'\n<>{}]*[\u4e00-\u9fff][^"'\n<>{}]*)["']/g;
    for (const m of line.matchAll(attrRe)) {
      const attrName = m[1];
      const text = m[2];
      if (!text || !CHINESE_RE.test(text)) continue;
      if (isInsideComment(line, m.index)) continue;
      // Skip if it's a key in an object (unlikely for JSX attr, but be safe)
      if (isObjectKey(line, m.index, m.index + m[0].length)) continue;

      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) {
        jsonKeys[pageKey][key] = text;
        totalKeys++;
      }
      replacements.push({
        start: m.index,
        end: m.index + m[0].length,
        newText: `${attrName}={${fnName}('${fullKey}')}`,
      });
    }

    // ── Pass 3: String literals (single quotes) ──
    // '中文' → i18n.t('module.page.key')
    // But skip if it's an object key: '中文': value
    // But skip if it's a JSX attribute value: attr='中文' (handled by Pass 2)
    // IMPORTANT: exclude <>{} from char class to prevent matching across JSX tags
    const singleQuoteRe = /'([^'\n<>{}]*[\u4e00-\u9fff][^'\n<>{}]*)'/g;
    for (const m of line.matchAll(singleQuoteRe)) {
      const text = m[1];
      if (!text || !CHINESE_RE.test(text)) continue;
      if (isInsideComment(line, m.index)) continue;

      // Check if this is an object key: '中文':
      const afterMatch = line.slice(m.index + m[0].length);
      if (/^\s*:/.test(afterMatch)) continue;

      // Check if already inside i18n.t() — look backwards for i18n.t( or t(
      const beforeMatch = line.slice(0, m.index);
      if (/i18n\.t\s*\(\s*$/.test(beforeMatch) || /\bt\s*\(\s*$/.test(beforeMatch)) continue;

      // Skip if it's a dynamic import path
      if (/import\s*\(\s*$/.test(beforeMatch)) continue;

      // Skip if it's a JSX attribute value: attr='中文' (already handled by Pass 2)
      if (/=\s*$/.test(beforeMatch)) continue;

      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) {
        jsonKeys[pageKey][key] = text;
        totalKeys++;
      }
      replacements.push({
        start: m.index,
        end: m.index + m[0].length,
        newText: `${fnName}('${fullKey}')`,
      });
    }

    // ── Pass 4: String literals (double quotes) ──
    // "中文" → i18n.t('module.page.key')
    // IMPORTANT: exclude <>{} from char class to prevent matching across JSX tags
    const doubleQuoteRe = /"([^"\n<>{}]*[\u4e00-\u9fff][^"\n<>{}]*)"/g;
    for (const m of line.matchAll(doubleQuoteRe)) {
      const text = m[1];
      if (!text || !CHINESE_RE.test(text)) continue;
      if (isInsideComment(line, m.index)) continue;

      // Check if this is an object key: "中文":
      const afterMatch = line.slice(m.index + m[0].length);
      if (/^\s*:/.test(afterMatch)) continue;

      // Check if already inside i18n.t() or t()
      const beforeMatch = line.slice(0, m.index);
      if (/i18n\.t\s*\(\s*$/.test(beforeMatch) || /\bt\s*\(\s*$/.test(beforeMatch)) continue;

      // Skip if it's an import/export statement
      if (/^\s*(import|export)\s/.test(line)) continue;
      if (/from\s+$/.test(beforeMatch)) continue;

      // Skip if it's a JSX attribute value: attr="中文" (already handled by Pass 2)
      if (/=\s*$/.test(beforeMatch)) continue;

      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) {
        jsonKeys[pageKey][key] = text;
        totalKeys++;
      }
      replacements.push({
        start: m.index,
        end: m.index + m[0].length,
        newText: `${fnName}('${fullKey}')`,
      });
    }

    // ── Pass 5: Template literals (backticks) WITHOUT ${} expressions ──
    // `中文` → i18n.t('module.page.key')
    // Only if the template has no ${} expressions
    // IMPORTANT: exclude <>{} from char class to prevent matching across JSX tags
    const templateRe = /`([^`\n<>{}]*[\u4e00-\u9fff][^`\n<>{}]*)`/g;
    for (const m of line.matchAll(templateRe)) {
      const text = m[1];
      if (!text || !CHINESE_RE.test(text)) continue;
      if (text.includes('${')) continue; // Skip templates with expressions
      if (isInsideComment(line, m.index)) continue;

      const beforeMatch = line.slice(0, m.index);
      if (/i18n\.t\s*\(\s*$/.test(beforeMatch) || /\bt\s*\(\s*$/.test(beforeMatch)) continue;

      const key = textToKey(text);
      const fullKey = `${moduleName}.${pageKey}.${key}`;
      if (!jsonKeys[pageKey][key]) {
        jsonKeys[pageKey][key] = text;
        totalKeys++;
      }
      replacements.push({
        start: m.index,
        end: m.index + m[0].length,
        newText: `${fnName}('${fullKey}')`,
      });
    }

    // ── Pass 6: Replace Chinese in i18n.t()/t() KEY arguments ──
    // i18n.t('module.page.中文') → i18n.t('module.page.text_hash')
    // This handles keys that were previously generated with Chinese text
    const i18nKeyRe = /(i18n\.t|t)\(\s*['"]([^'"]*[\u4e00-\u9fff][^'"]*)['"]\s*\)/g;
    for (const m of line.matchAll(i18nKeyRe)) {
      const callExpr = m[1]; // "i18n.t" or "t"
      const oldKey = m[2];   // e.g., "lims.inspectiontask.待分配"

      // Verify this is a function call, not part of a larger identifier
      if (callExpr === 't') {
        const charBefore = line[m.index - 1];
        if (charBefore && /[a-zA-Z0-9_]/.test(charBefore)) continue; // part of identifier
      }

      // Parse the key: module.page.keyParts
      const parts = oldKey.split('.');
      if (parts.length < 2) continue;

      const pagePart = parts[1];
      const keyParts = parts.slice(2);

      // Replace Chinese in each key part
      let changed = false;
      const newKeyParts = keyParts.map(part => {
        if (CHINESE_RE.test(part)) {
          const hash = textToKey(part);
          // Store in JSON under the page from the key path
          if (!jsonKeys[pagePart]) jsonKeys[pagePart] = {};
          if (!jsonKeys[pagePart][hash]) {
            jsonKeys[pagePart][hash] = part;
            totalKeys++;
          }
          changed = true;
          return hash;
        }
        return part;
      });

      if (changed) {
        const newKey = [parts[0], pagePart, ...newKeyParts].join('.');
        // Find the key string boundaries within the match
        const fullMatch = m[0];
        const keyStart = fullMatch.indexOf(oldKey);
        if (keyStart >= 0) {
          replacements.push({
            start: m.index + keyStart,
            end: m.index + keyStart + oldKey.length,
            newText: newKey,
          });
        }
      }
    }

    // Apply replacements: sort by start descending, prefer longer matches
    if (replacements.length > 0) {
      // Sort by start descending, then by length descending (longer matches first)
      replacements.sort((a, b) => {
        if (b.start !== a.start) return b.start - a.start;
        return (b.end - b.start) - (a.end - a.start);
      });
      // Filter overlapping replacements (keep the first/longest one)
      const valid = [];
      let lastEnd = line.length;
      for (const r of replacements) {
        if (r.end <= lastEnd) {
          valid.push(r);
          lastEnd = r.start;
        }
      }
      // Apply in order (already sorted by start descending)
      for (const r of valid) {
        line = line.slice(0, r.start) + r.newText + line.slice(r.end);
        totalChanges++;
      }
      lines[i] = line;
    }
  }

  // Add i18n import if needed and changes were made
  if (totalChanges > 0 && !hasI18nImport && !useT) {
    // Find the last import line
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, "import i18n from '@/i18n';");
    } else {
      lines.unshift("import i18n from '@/i18n';");
    }
  }

  if (totalChanges > 0) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  return { changes: totalChanges, keys: totalKeys };
}

// ── Comment translation ──────────────────────────────────

const commentTranslations = {
  // Common
  '创建': 'Create', '删除': 'Delete', '更新': 'Update', '查询': 'Query',
  '编辑': 'Edit', '保存': 'Save', '取消': 'Cancel', '确认': 'Confirm',
  '搜索': 'Search', '筛选': 'Filter', '排序': 'Sort', '导出': 'Export',
  '导入': 'Import', '下载': 'Download', '上传': 'Upload', '关闭': 'Close',
  '打开': 'Open', '添加': 'Add', '移除': 'Remove', '查看': 'View',
  '列表': 'List', '详情': 'Detail', '配置': 'Config', '设置': 'Settings',
  '状态': 'Status', '类型': 'Type', '名称': 'Name', '描述': 'Description',
  '操作': 'Action', '成功': 'Success', '失败': 'Fail', '错误': 'Error',
  '警告': 'Warning', '提示': 'Info', '加载': 'Loading', '暂无': 'No',
  '数据': 'Data', '管理': 'Management', '页面': 'Page', '组件': 'Component',
  '处理': 'Handle', '获取': 'Get', '设置': 'Set', '检查': 'Check',
  '验证': 'Validate', '提交': 'Submit', '重置': 'Reset', '刷新': 'Refresh',
  '统计': 'Statistics', '分析': 'Analysis', '报告': 'Report', '日志': 'Log',
  // IAM
  '公司架构管理页面': 'Company structure management page',
  '管理母子公司关系、持股比例、控制类型等，用于合并报表': 'Manage parent-subsidiary company relationships, ownership ratios, control types, etc. for consolidated reporting',
  '关系类型配置': 'Relationship type configuration',
  '公司架构树节点组件': 'Company structure tree node component',
  '状态配置': 'Status configuration',
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
  '用户管理页面': 'User management page',
  '用户管理 API 适配器': 'User management API adapter',
  '用户管理页面组件': 'User management page component',
  '角色管理页面': 'Role management page',
  '角色管理': 'Role management',
  '权限管理': 'Permission management',
  // LIMS
  '样品总数': 'Total samples', '检验任务': 'Inspection tasks',
  '检验流程': 'Inspection process', '已完成样品': 'Completed samples',
  '加载检验流程失败': 'Failed to load inspection processes',
  '使用此流程': 'Use this process', '返回首页': 'Back to home',
  '实验室管理服务未启动': 'Laboratory management service not started',
  '新建检验任务': 'Create inspection task',
  '样品管理': 'Sample management', '仪器管理': 'Instrument management',
  '检验结果': 'Inspection results', '试剂管理': 'Reagent management',
  '能力验证': 'Proficiency testing', '检测方法': 'Test methods',
  '条码管理': 'Barcode management', '样品接收': 'Sample receiving',
  '仪器数据': 'Instrument data', '维护记录': 'Maintenance records',
  '校准记录': 'Calibration records', '使用记录': 'Usage records',
  '不确定性': 'Uncertainty', '测量不确定度': 'Measurement uncertainty',
  // EHS
  '风险等级': 'Risk level', '风险评估': 'Risk assessment',
  '控制措施': 'Control measures', '隐患管理': 'Hazard management',
  '环境管理': 'Environment management', '安全管理': 'Safety management',
  '健康管理': 'Health management', '应急管理': 'Emergency management',
  '事故管理': 'Accident management', '合规管理': 'Compliance management',
  '检查管理': 'Check management', '演练管理': 'Drill management',
  '危险物资管理': 'Hazardous material management',
  '职业病管理': 'Occupational disease management',
  // RD
  '研发概览': 'R&D overview', '项目管理': 'Project management',
  '实验管理': 'Experiment management', '配方管理': 'Formula management',
  '报告管理': 'Report management', '评审管理': 'Review management',
  '发布管理': 'Release management', '构建管理': 'Build management',
  '部署管理': 'Deploy management', '测试管理': 'Test management',
  '缺陷管理': 'Bug management', '代码管理': 'Code management',
  '里程碑管理': 'Milestone management', '文档管理': 'Document management',
  '材料管理': 'Material management', '设置': 'Settings',
  '默认数据': 'Default data', '当前Tab的数据': 'Current tab data',
  '统计概览': 'Statistics overview', '左侧Tab导航': 'Left tab navigation',
  '页面头部': 'Page header', '试验概览': 'Experiment overview',
  '详细信息标签页': 'Detail info tabs', '实验记录': 'Experiment records',
  '数据结果': 'Data results', '批次追溯': 'Batch traceability',
};

function translateComment(text) {
  const trimmed = text.trim();
  if (commentTranslations[trimmed]) return commentTranslations[trimmed];
  let result = text;
  for (const [zh, en] of Object.entries(commentTranslations)) {
    if (result.includes(zh)) {
      result = result.replaceAll(zh, en);
    }
  }
  return result;
}

function processComments(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return 0;

  const lines = content.split('\n');
  let changes = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!CHINESE_RE.test(line)) continue;

    let newLine = line;

    // // comment with Chinese
    const commentMatch = line.match(/^(\s*)(\/\/\s*)(.+)$/);
    if (commentMatch && CHINESE_RE.test(commentMatch[3])) {
      const translated = translateComment(commentMatch[3]);
      if (translated !== commentMatch[3] && CHINESE_RE.test(translated) === false) {
        newLine = commentMatch[1] + commentMatch[2] + translated;
        changes++;
      }
    }

    // * JSDoc comment with Chinese
    const jsdocMatch = line.match(/^(\s*\*\s)(.+)$/);
    if (jsdocMatch && CHINESE_RE.test(jsdocMatch[2]) && !line.includes('*/')) {
      const text = jsdocMatch[2];
      if (text && !text.startsWith('@')) {
        const translated = translateComment(text);
        if (translated !== text && CHINESE_RE.test(translated) === false) {
          newLine = jsdocMatch[1] + translated;
          changes++;
        }
      }
    }

    // {/* JSX comment */}
    const jsxCommentMatches = [...line.matchAll(/\{\/\*\s*([^*]+)\s*\*\/\}/g)];
    for (const m of jsxCommentMatches) {
      if (CHINESE_RE.test(m[1])) {
        const translated = translateComment(m[1]);
        if (translated !== m[1] && CHINESE_RE.test(translated) === false) {
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

// ── Main ─────────────────────────────────────────────────

const modules = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ['iam', 'lims', 'ehs', 'rd'];

console.log('=== TOPEMS i18n Safe Final ===\n');

let grandTotalChanges = 0;
let grandTotalKeys = 0;
let grandTotalComments = 0;
const processedFiles = [];

for (const mod of modules) {
  const modulePath = path.join(projectRoot, 'src', 'pages', mod);
  if (!fs.existsSync(modulePath)) {
    console.log(`[${mod}] Module path not found, skipping`);
    continue;
  }

  const jsonPath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${mod}.json`);
  const jsonKeys = loadJson(jsonPath);

  let modChanges = 0;
  let modKeys = 0;
  let modComments = 0;
  const modFiles = [];

  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(fp);
      } else if (/\.tsx?$/.test(e.name)) {
        // Phase 1: Translate comments
        const cmt = processComments(fp);
        modComments += cmt;

        // Phase 2: Replace string literals
        const { changes, keys } = processFile(fp, mod, jsonKeys);
        modChanges += changes;
        modKeys += keys;

        if (changes > 0 || cmt > 0) {
          modFiles.push({
            file: path.relative(projectRoot, fp),
            changes,
            comments: cmt,
          });
        }
      }
    }
  }
  walk(modulePath);

  // Save updated JSON
  saveJson(jsonPath, jsonKeys);

  console.log(`[${mod}] Changes: ${modChanges}, New keys: ${modKeys}, Comments: ${modComments}`);
  for (const f of modFiles) {
    processedFiles.push(f);
    console.log(`  ${f.file}: ${f.changes} strings, ${f.comments} comments`);
  }

  grandTotalChanges += modChanges;
  grandTotalKeys += modKeys;
  grandTotalComments += modComments;
}

console.log(`\n=== Total: ${grandTotalChanges} strings, ${grandTotalKeys} keys, ${grandTotalComments} comments ===`);
