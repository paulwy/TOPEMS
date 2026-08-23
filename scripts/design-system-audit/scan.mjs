#!/usr/bin/env node
/**
 * TOPEMS 设计系统审计扫描脚本
 *
 * 扫描范围：apps/web/src/pages 下的所有 tsx 页面文件
 * 输出报告：
 *   - reports/page-template-map.csv      页面与模板/组件/共享组件映射
 *   - reports/hardcoded-style-report.csv 硬编码颜色、间距、字号、阴影
 *   - reports/shared-component-usage.csv 共享组件使用统计
 *
 * 使用方式：
 *   node scripts/design-system-audit/scan.mjs
 *
 * 注意：
 *   本脚本基于正则匹配，存在少量误报/漏报可能。关键结论建议人工抽样验证。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 配置
// ============================================================================

const PAGES_DIR = path.resolve(__dirname, '../../apps/web/src/pages');
const REPORTS_DIR = path.resolve(__dirname, 'reports');

// 页面文件匹配规则
const PAGE_FILE_PATTERN = /\.tsx$/;
const EXCLUDE_PATTERNS = [
  /[\\/]__tests__[\\/]/,
  /[\\/]components[\\/]/,
  /[\\/]hooks[\\/]/,
  /\.stories\.tsx$/,
  /\.test\.tsx$/,
];

// 页面模板类型到组件名的映射
// 注：项目中实际大量使用的是 CrudPage（Schema 驱动的完整 CRUD 页面），
// 它内部封装了 ListPageTemplate / FormBuilder / Detail 等能力
const TEMPLATE_TYPE_TO_COMPONENTS = {
  crud: ['CrudPage'],
  dashboard: ['DashboardTemplate'],
  list: ['ListPageTemplate'],
  detail: ['DetailPageTemplate'],
  form: ['FormPageTemplate'],
  tree: ['TreePageTemplate'],
  stats: ['StatsPageTemplate'],
  settings: ['SettingsPageTemplate'],
  kanban: ['KanbanPageTemplate'],
  'card-list': ['CardListTemplate'],
  wizard: ['WizardPageTemplate'],
  timeline: ['TimelinePageTemplate'],
  'master-detail': ['MasterDetailPageTemplate'],
  'markdown-editor': ['MarkdownEditorTemplate'],
  'report-designer': ['ReportDesignerTemplate'],
  'gis-map': ['GisMapTemplate'],
  mobile: ['MobilePageTemplate'],
  auth: ['AuthPageTemplate'],
  chat: ['ChatPageTemplate'],
  designer: ['DesignerTemplate'],
};

const ALL_TEMPLATE_COMPONENTS = Object.values(TEMPLATE_TYPE_TO_COMPONENTS).flat();

// 共享组件 / 公共组件来源
// 项目中页面主要使用 @/components/common（其内部部分 re-export 自 @topems/shared-components）
const COMMON_COMPONENT_SOURCES = [
  '@topems/shared-components',
  '@/components/common',
  /packages[\\/]shared-components/,
];

// 模板来源（用于检测页面是否从 templates 目录导入任意模板/Builder）
const TEMPLATE_IMPORT_SOURCES = [
  '@/components/templates',
  /components[\\/]templates/,
];

// 硬编码样式检测规则
// 注意：MUI 主题字符串引用（如 'divider'、'primary.main'、'common.white'）不算硬编码，已排除
const MUI_THEME_REF_REGEX = /^['"][a-zA-Z][a-zA-Z0-9.]*['"]$/;

const HARDCODED_PATTERNS = [
  {
    name: 'hex_color',
    label: '十六进制颜色',
    regex: /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    contextRegex: /\bsx\s*=\s*\{|\bstyle\s*=\s*\{|styled\s*\(|css\s*=\s*`/,
    valueFilter: null,
  },
  {
    name: 'rgb_rgba_color',
    label: 'rgb/rgba 颜色',
    regex: /rgba?\s*\([^)]*\)/g,
    contextRegex: /\bsx\s*=\s*\{|\bstyle\s*=\s*\{|styled\s*\(|css\s*=\s*`/,
    valueFilter: null,
  },
  {
    name: 'px_spacing',
    label: 'px 间距/尺寸',
    regex: /\b\d+px\b/g,
    contextRegex: /\bsx\s*=\s*\{|\bstyle\s*=\s*\{|styled\s*\(|css\s*=\s*`/,
    valueFilter: null,
  },
  {
    name: 'rem_font_size',
    label: 'rem 字号（疑似硬编码）',
    // 排除已替换为 designTokens.typography.fontSize.scale['x.xrem'] 的引用
    regex: /(?<!scale\[['"])\b\d+\.?\d*rem\b(?!['"]\])/g,
    contextRegex: /\bsx\s*=\s*\{|\bstyle\s*=\s*\{|styled\s*\(|css\s*=\s*`/,
    valueFilter: null,
  },
  {
    name: 'box_shadow',
    label: 'box-shadow 硬编码',
    regex: /boxShadow\s*:\s*['"][^'"]+['"]/g,
    contextRegex: null,
    valueFilter: (v) => !MUI_THEME_REF_REGEX.test(v),
  },
  {
    name: 'border_color',
    label: 'borderColor 硬编码',
    regex: /borderColor\s*:\s*['"][^'"]+['"]/g,
    contextRegex: null,
    valueFilter: (v) => !MUI_THEME_REF_REGEX.test(v),
  },
  {
    name: 'background_color',
    label: 'backgroundColor 硬编码',
    regex: /backgroundColor\s*:\s*['"][^'"]+['"]/g,
    contextRegex: null,
    valueFilter: (v) => !MUI_THEME_REF_REGEX.test(v),
  },
];

// 排除项：这些匹配通常不是真正的硬编码样式问题
const HARDCODED_IGNORE_PATTERNS = [
  /^#\s/, // 注释行
  /data:image\/svg\+xml/,
  /url\s*\(\s*['"]?#/,
  /['"]#[a-fA-F0-9]{6}['"]/, // 字符串中的 hex，如 '#ffffff'（常是 Token 引用，但也可能是硬编码）
];

// ============================================================================
// 工具函数
// ============================================================================

function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

function walkDir(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  }
}

function shouldIncludePage(filePath) {
  if (!PAGE_FILE_PATTERN.test(filePath)) return false;
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(filePath)) return false;
  }
  return true;
}

function getRelativePath(fullPath) {
  return path.relative(process.cwd(), fullPath);
}

function getModuleFromPath(filePath) {
  const relative = path.relative(PAGES_DIR, filePath);
  const firstPart = relative.split(path.sep)[0];
  return firstPart || 'shared';
}

// ============================================================================
// 扫描逻辑
// ============================================================================

function detectTemplateUsage(content) {
  const usedTemplates = [];
  for (const [type, components] of Object.entries(TEMPLATE_TYPE_TO_COMPONENTS)) {
    for (const component of components) {
      // 检测 JSX 使用：<ListPageTemplate 或 </ListPageTemplate
      const jsxRegex = new RegExp(`<\\/?${component}\\b`, 'g');
      // 检测导入：import { ListPageTemplate } from '...templates...'
      const importRegex = new RegExp(
        `import\\s+.*?\\{[^}]*\\b${component}\\b[^}]*\\}\\s+from\\s+['"][^'"]*templates[^'"]*['"]`,
        'g'
      );
      // 也检测默认导入：import CrudPage from '@/components/templates/CrudPage'
      const defaultImportRegex = new RegExp(
        `import\\s+(?:\\{[^}]*\\}\\s*,\\s*)?${component}\\b[^'"]*from\\s+['"][^'"]*templates[^'"]*['"]`,
        'g'
      );
      if (jsxRegex.test(content) || importRegex.test(content) || defaultImportRegex.test(content)) {
        usedTemplates.push(type);
        break;
      }
    }
  }
  return usedTemplates;
}

function detectTemplateImports(content) {
  const imports = [];
  const importRegex = /import\s+(?:\{([^}]*)\}|([^'"{}]+?))\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importedNames = match[1] || match[2] || '';
    const source = match[3];

    const isTemplateSource = TEMPLATE_IMPORT_SOURCES.some((src) =>
      typeof src === 'string' ? source === src || source.startsWith(src + '/') : src.test(source)
    );

    if (isTemplateSource) {
      const names = importedNames
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => {
          const parts = n.split(/\s+/);
          return parts[parts.length - 1];
        });
      imports.push(...names);
    }
  }
  return imports;
}

function detectCommonComponentImports(content) {
  const imports = [];
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importedNames = match[1];
    const source = match[2];

    const isCommonSource = COMMON_COMPONENT_SOURCES.some((src) =>
      typeof src === 'string' ? source === src || source.startsWith(src + '/') : src.test(source)
    );

    if (isCommonSource) {
      const names = importedNames
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => {
          // 处理 type import / as 别名
          const parts = n.split(/\s+/);
          return parts[parts.length - 1];
        });
      imports.push(...names);
    }
  }
  return imports;
}

function detectComponentUsage(content, componentName) {
  const regex = new RegExp(`<\\/?${componentName}\\b`, 'g');
  return regex.test(content);
}

function detectHardcodedStyles(content) {
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // 跳过明显不是样式的行（注释、import、字符串拼接等）
    if (/^\s*\/\//.test(line)) continue;

    for (const pattern of HARDCODED_PATTERNS) {
      // 如果配置了上下文正则，先检查当前行是否处于样式上下文
      if (pattern.contextRegex && !pattern.contextRegex.test(line)) {
        continue;
      }

      const regex = new RegExp(pattern.regex.source, pattern.regex.flags.replace('g', '') + 'g');
      let match;
      while ((match = regex.exec(line)) !== null) {
        const matchedText = match[0];

        // 排除忽略项
        const shouldIgnore = HARDCODED_IGNORE_PATTERNS.some((ignore) => ignore.test(matchedText));
        if (shouldIgnore) continue;

        // 应用模式自定义值过滤（如排除 MUI 主题字符串引用）
        if (pattern.valueFilter) {
          // 对于 prop: 'value' 形式的匹配，提取引号内的值
          const quotedValueMatch = matchedText.match(/['"][^'"]+['"]/);
          const valueToCheck = quotedValueMatch ? quotedValueMatch[0] : matchedText;
          if (!pattern.valueFilter(valueToCheck)) {
            continue;
          }
        }

        findings.push({
          line: lineNumber,
          column: match.index + 1,
          type: pattern.name,
          label: pattern.label,
          value: matchedText,
          context: line.trim(),
        });
      }
    }
  }

  return findings;
}

// ============================================================================
// 主流程
// ============================================================================

function main() {
  console.log('🔍 TOPEMS 设计系统审计扫描开始');
  console.log(`   扫描目录: ${getRelativePath(PAGES_DIR)}`);
  console.log(`   输出目录: ${getRelativePath(REPORTS_DIR)}`);

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const pageFiles = [];
  walkDir(PAGES_DIR, (filePath) => {
    if (shouldIncludePage(filePath)) {
      pageFiles.push(filePath);
    }
  });

  console.log(`   发现页面文件: ${pageFiles.length} 个`);

  const pageTemplateRows = [];
  const hardcodedStyleRows = [];
  const sharedComponentUsageMap = new Map();

  for (const filePath of pageFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = getRelativePath(filePath);
    const module = getModuleFromPath(filePath);

    // 1. 模板使用
    const usedTemplates = detectTemplateUsage(content);
    const templateImports = detectTemplateImports(content);

    // 2. 公共/共享组件导入
    const commonImports = detectCommonComponentImports(content);

    // 3. PageContainer / DataTable / CrudPage 使用检测
    const usesPageContainer = detectComponentUsage(content, 'PageContainer');
    const usesDataTableDirect = detectComponentUsage(content, 'DataTable');
    const usesCrudPage = detectComponentUsage(content, 'CrudPage');
    // CrudPage 内部封装了 DataTable，因此使用 CrudPage 的页面间接使用了 DataTable
    const usesDataTable = usesDataTableDirect || usesCrudPage;

    pageTemplateRows.push({
      file: relativePath,
      module,
      templateType: usedTemplates.join('; ') || 'unknown / custom',
      templateComponents: usedTemplates
        .map((t) => TEMPLATE_TYPE_TO_COMPONENTS[t].join(', '))
        .join('; '),
      templateImports: templateImports.join('; ') || 'none',
      commonComponents: commonImports.join('; ') || 'none',
      usesPageContainer: usesPageContainer ? 'yes' : 'no',
      usesDataTableDirect: usesDataTableDirect ? 'yes' : 'no',
      usesDataTable: usesDataTable ? 'yes' : 'no',
      usesCrudPage: usesCrudPage ? 'yes' : 'no',
      hasTemplate: usedTemplates.length > 0 ? 'yes' : 'no',
      commonComponentCount: commonImports.length,
    });

    // 4. 公共/共享组件使用统计
    for (const name of commonImports) {
      const key = name;
      const current = sharedComponentUsageMap.get(key) || { name, count: 0, files: [] };
      current.count += 1;
      if (!current.files.includes(relativePath)) {
        current.files.push(relativePath);
      }
      sharedComponentUsageMap.set(key, current);
    }

    // 5. 硬编码样式
    const hardcodedFindings = detectHardcodedStyles(content);
    for (const finding of hardcodedFindings) {
      hardcodedStyleRows.push({
        file: relativePath,
        module,
        line: finding.line,
        column: finding.column,
        type: finding.type,
        label: finding.label,
        value: finding.value,
        context: finding.context,
      });
    }
  }

  // 统计摘要
  const pagesWithTemplate = pageTemplateRows.filter((r) => r.hasTemplate === 'yes').length;
  const pagesWithDataTable = pageTemplateRows.filter((r) => r.usesDataTable === 'yes').length;
  const pagesWithDataTableDirect = pageTemplateRows.filter((r) => r.usesDataTableDirect === 'yes').length;
  const pagesWithCrudPage = pageTemplateRows.filter((r) => r.usesCrudPage === 'yes').length;
  const pagesWithPageContainer = pageTemplateRows.filter((r) => r.usesPageContainer === 'yes').length;
  const pagesWithCommonComponents = pageTemplateRows.filter(
    (r) => r.commonComponentCount > 0
  ).length;

  // 按模板类型分布
  const templateTypeDistribution = pageTemplateRows.reduce((acc, row) => {
    const types = row.templateType.split('; ').filter((t) => t !== 'unknown / custom');
    if (types.length === 0) {
      acc['unknown / custom'] = (acc['unknown / custom'] || 0) + 1;
    } else {
      for (const type of types) {
        acc[type] = (acc[type] || 0) + 1;
      }
    }
    return acc;
  }, {});

  // 输出 page-template-map.csv
  writeCsv(
    path.join(REPORTS_DIR, 'page-template-map.csv'),
    [
      'file',
      'module',
      'templateType',
      'templateComponents',
      'templateImports',
      'commonComponents',
      'usesPageContainer',
      'usesDataTable',
      'usesDataTableDirect',
      'usesCrudPage',
      'hasTemplate',
      'commonComponentCount',
    ],
    pageTemplateRows
  );

  // 输出 hardcoded-style-report.csv
  writeCsv(
    path.join(REPORTS_DIR, 'hardcoded-style-report.csv'),
    ['file', 'module', 'line', 'column', 'type', 'label', 'value', 'context'],
    hardcodedStyleRows
  );

  // 输出 shared-component-usage.csv
  const sharedComponentUsageRows = Array.from(sharedComponentUsageMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      componentName: item.name,
      usageCount: item.count,
      fileCount: item.files.length,
      files: item.files.join('; '),
    }));

  writeCsv(
    path.join(REPORTS_DIR, 'shared-component-usage.csv'),
    ['componentName', 'usageCount', 'fileCount', 'files'],
    sharedComponentUsageRows
  );

  // 输出摘要
  const summaryPath = path.join(REPORTS_DIR, 'summary.txt');
  const summaryText = `TOPEMS 设计系统审计扫描摘要
================================
扫描时间: ${new Date().toISOString()}
扫描页面: ${pageFiles.length} 个

模板覆盖:
  使用标准模板的页面: ${pagesWithTemplate} (${((pagesWithTemplate / pageFiles.length) * 100).toFixed(1)}%)
  未使用标准模板的页面: ${pageFiles.length - pagesWithTemplate}

模板类型分布:
${Object.entries(templateTypeDistribution)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => `    ${type}: ${count} 个页面`)
  .join('\n')}

核心组件使用:
  使用 PageContainer: ${pagesWithPageContainer} (${((pagesWithPageContainer / pageFiles.length) * 100).toFixed(1)}%)
  使用 DataTable（含 CrudPage 间接使用）: ${pagesWithDataTable} (${((pagesWithDataTable / pageFiles.length) * 100).toFixed(1)}%)
  直接使用 DataTable: ${pagesWithDataTableDirect} (${((pagesWithDataTableDirect / pageFiles.length) * 100).toFixed(1)}%)
  使用 CrudPage: ${pagesWithCrudPage} (${((pagesWithCrudPage / pageFiles.length) * 100).toFixed(1)}%)
  使用任意公共/共享组件: ${pagesWithCommonComponents} (${((pagesWithCommonComponents / pageFiles.length) * 100).toFixed(1)}%)

硬编码样式:
  问题总数: ${hardcodedStyleRows.length}
  涉及文件数: ${new Set(hardcodedStyleRows.map((r) => r.file)).size}
  按类型分布:
${Object.entries(
      hardcodedStyleRows.reduce((acc, r) => {
        acc[r.label] = (acc[r.label] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => `    ${label}: ${count}`)
      .join('\n')}

共享组件使用 TOP10:
${sharedComponentUsageRows
  .slice(0, 10)
  .map((r) => `  ${r.componentName}: ${r.usageCount} 次 (${r.fileCount} 个文件)`)
  .join('\n')}

输出文件:
  - page-template-map.csv
  - hardcoded-style-report.csv
  - shared-component-usage.csv
`;
  fs.writeFileSync(summaryPath, summaryText, 'utf-8');

  console.log('\n✅ 扫描完成');
  console.log(`   使用标准模板: ${pagesWithTemplate}/${pageFiles.length} (${((pagesWithTemplate / pageFiles.length) * 100).toFixed(1)}%)`);
  console.log(`   使用 DataTable（含 CrudPage）: ${pagesWithDataTable}/${pageFiles.length} (${((pagesWithDataTable / pageFiles.length) * 100).toFixed(1)}%)`);
  console.log(`   使用 CrudPage: ${pagesWithCrudPage}/${pageFiles.length} (${((pagesWithCrudPage / pageFiles.length) * 100).toFixed(1)}%)`);
  console.log(`   使用公共/共享组件: ${pagesWithCommonComponents}/${pageFiles.length} (${((pagesWithCommonComponents / pageFiles.length) * 100).toFixed(1)}%)`);
  console.log(`   硬编码样式问题: ${hardcodedStyleRows.length} 处`);
  console.log(`   公共/共享组件种类: ${sharedComponentUsageRows.length} 种`);
  console.log(`\n报告已输出到: ${getRelativePath(REPORTS_DIR)}`);
}

main();
