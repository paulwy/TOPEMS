const fs = require('fs');
const path = require('path');

const ROOT = '/Users/air/TOPEMS/apps/web/src';
const zhPath = path.join(ROOT, 'i18n', 'locales', 'zh.json');
const enPath = path.join(ROOT, 'i18n', 'locales', 'en.json');

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

function walkDir(dir) {
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory(fullPath)) {
      results.push(...walkDir(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts') && item !== 'index.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

function hasChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str);
}

const schemaDirs = [
  path.join(ROOT, 'schemas', 'srm'),
  path.join(ROOT, 'schemas', 'workflow'),
  path.join(ROOT, 'schemas', 'scm'),
];

const extraFiles = [
  path.join(ROOT, 'schemas', 'ticket', 'ticket.ts'),
  path.join(ROOT, 'schemas', 'report', 'report.ts'),
  path.join(ROOT, 'schemas', 'crm', 'return.ts'),
  path.join(ROOT, 'schemas', 'crm', 'recommendation.ts'),
  path.join(ROOT, 'schemas', 'crm', 'opportunity.ts'),
  path.join(ROOT, 'schemas', 'crm', 'interaction.ts'),
  path.join(ROOT, 'schemas', 'crm', 'dashboardSchema.ts'),
  path.join(ROOT, 'schemas', 'crm', 'customerSegmentation.ts'),
  path.join(ROOT, 'schemas', 'crm', 'customerScoring.ts'),
  path.join(ROOT, 'schemas', 'crm', 'customer.ts'),
  path.join(ROOT, 'schemas', 'crm', 'contact.ts'),
  path.join(ROOT, 'schemas', 'bi', 'report.ts'),
  path.join(ROOT, 'schemas', 'bi', 'dataSource.ts'),
  path.join(ROOT, 'schemas', 'admin', 'tenantUser.ts'),
  path.join(ROOT, 'schemas', 'admin', 'tenantInvoice.ts'),
  path.join(ROOT, 'schemas', 'admin', 'tenant.ts'),
  path.join(ROOT, 'schemas', 'admin', 'plugin.ts'),
  path.join(ROOT, 'schemas', 'admin', 'migration.ts'),
  path.join(ROOT, 'schemas', 'admin', 'dictionary.ts'),
  path.join(ROOT, 'schemas', 'admin', 'bankAccount.ts'),
  path.join(ROOT, 'schemas', 'admin', 'account.ts'),
  path.join(ROOT, 'schemas', 'qms', 'audit.ts'),
  path.join(ROOT, 'schemas', 'monitor', 'alertRule.ts'),
  path.join(ROOT, 'schemas', 'pm', 'resource.ts'),
  path.join(ROOT, 'schemas', 'pm', 'dashboardSchema.ts'),
  path.join(ROOT, 'schemas', 'pm', 'contract.ts'),
  path.join(ROOT, 'schemas', 'pm', 'project.ts'),
];

let processedCount = 0;
let totalChineseStrings = 0;

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  if (!hasChinese(content)) return;

  const dirName = path.basename(path.dirname(filePath));
  const fileName = path.basename(filePath, '.ts');

  if (!content.includes("import i18n from '@/i18n'")) {
    const importLine = "import i18n from '@/i18n';\n";
    if (content.startsWith('import ')) {
      const lastIdx = content.lastIndexOf('import ');
      const semiIdx = content.indexOf(';\n', lastIdx);
      if (semiIdx !== -1) {
        content = content.slice(0, semiIdx + 2) + importLine + content.slice(semiIdx + 2);
      } else {
        content = importLine + content;
      }
    } else {
      content = importLine + content;
    }
  }

  const zhModule = zh.schema[dirName] || {};
  const enModule = en.schema[dirName] || {};
  const existingKeys = new Set([
    ...Object.keys(zhModule[fileName] || {}),
    ...Object.keys((en.schema[dirName] || {})[fileName] || {}),
  ]);

  const replacements = [];
  const newKeys = {};

  const patterns = [
    // title: '中文'
    { regex: /(title:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: 'title' },
    // description: '中文'
    { regex: /(description:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: 'description' },
    // createTitle: '中文', editTitle: '中文', detailTitle: '中文'
    { regex: /((?:createTitle|editTitle|detailTitle):\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: '_title_direct' },
    // create_title: '中文', detail_title: '中文'  (in zh.json)
    // label: '中文'
    { regex: /(label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: 'label' },
    // placeholder: '中文'
    { regex: /(placeholder:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: 'placeholder' },
    // message: '中文'
    { regex: /(message:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: 'message' },
    // option text: { label: '中文' }
    { regex: /(\{\s*label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'(\s*\})/g', prefix: 'option' },
    // status label: '中文'
    { regex: /((?:status_draft|status_pending|status_active|status_inactive|status_completed|status_cancelled|status_rejected|status_approved|status_submitted|status_failed|status_success|status_draft|status_review|status_approved|status_released|status_deprecated):\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: 'status_label_exact' },
    // filter label and option: label: '中文'
    { regex: /(filter_label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g', prefix: 'filter_label' },
  ];

  let keyCounter = 0;

  for (const { regex, prefix } of patterns) {
    content = content.replace(regex, (match, ...args) => {
      let prefixStr, chineseStr;
      if (prefix === 'option') {
        prefixStr = args[0];
        chineseStr = args[1];
        const suffixStr = args[2];
        const keyName = `option_${keyCounter++}`;
        newKeys[keyName] = chineseStr;
        totalChineseStrings++;
        replacements.push({ match, replacement: `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')${suffixStr}` });
        return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')${suffixStr}`;
      } else {
        prefixStr = args[0];
        chineseStr = args[1];
        let keyName;
        switch (prefix) {
          case 'title': keyName = 'title'; break;
          case 'description': keyName = 'description'; break;
          case '_title_direct': {
            const m = match.match(/(\w+):/);
            const propName = m ? m[1] : 'title';
            keyName = propName.replace(/([A-Z])/g, '_$1').toLowerCase();
            break;
          }
          case 'label': {
            const m = match.match(/label:\s*)'([^']*)'/);
            keyName = `label_${keyCounter++}`;
            break;
          }
          case 'placeholder': keyName = `placeholder_${keyCounter++}`; break;
          case 'message': keyName = `message_${keyCounter++}`; break;
          case 'status_label_exact': {
            const m = match.match(/(\w+):/);
            keyName = m ? m[1] : `status_${keyCounter++}`;
            break;
          }
          case 'filter_label': keyName = `filter_label_${keyCounter++}`; break;
          default: keyName = `key_${keyCounter++}`;
        }
        newKeys[keyName] = chineseStr;
        totalChineseStrings++;
        replacements.push({ match, replacement: `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')` });
        return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')`;
      }
    });
  }

  // Also handle section titles: title: '中文' inside formSections
  content = content.replace(/(title:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g, (match, prefixStr, chineseStr) => {
    if (match.includes('i18n.t(')) return match;
    const keyName = `section_${keyCounter++}`;
    newKeys[keyName] = chineseStr;
    totalChineseStrings++;
    return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')`;
  });

  // Handle status label map values like: active: '启用',
  content = content.replace(/((?:active|inactive|pending|draft|submitted|approved|rejected|cancelled|completed|paused|running|idle|maintenance|fault|passed|failed|rework|scrapped|scheduled|released|confirmed|issued|returned|obsolete|production|low|medium|high|urgent):\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g, (match, prefixStr, chineseStr) => {
    if (match.includes('i18n.t(')) return match;
    const propMatch = prefixStr.match(/(\w+):/);
    const propName = propMatch ? propMatch[1] : 'status';
    const keyName = `status_${propName}`;
    newKeys[keyName] = chineseStr;
    totalChineseStrings++;
    return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')`;
  });

  // Handle option values like: { value: 'low', label: '低' }
  content = content.replace(/(\{\s*value:\s*'[^']+',\s*label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'(\s*\})/g, (match, prefixStr, chineseStr, suffixStr) => {
    if (match.includes('i18n.t(')) return match;
    const keyName = `opt_${keyCounter++}`;
    newKeys[keyName] = chineseStr;
    totalChineseStrings++;
    return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')${suffixStr}`;
  });

  // Handle addButtonText: '中文'
  content = content.replace(/(addButtonText:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g, (match, prefixStr, chineseStr) => {
    const keyName = `add_button_text_${keyCounter++}`;
    newKeys[keyName] = chineseStr;
    totalChineseStrings++;
    return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')`;
  });

  // Handle tabLabel: '中文', statusLabel: '中文'
  content = content.replace(/((?:tabLabel|statusLabel):\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g, (match, prefixStr, chineseStr) => {
    const keyName = `${prefixStr.match(/(\w+):/)[1]}_${keyCounter++}`;
    newKeys[keyName] = chineseStr;
    totalChineseStrings++;
    return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')`;
  });

  // Handle trend label: '中文'
  content = content.replace(/(label:\s*)'([^']*[\u4e00-\u9fa5][^']*)'/g, (match, prefixStr, chineseStr) => {
    if (match.includes('i18n.t(')) return match;
    const keyName = `label_${keyCounter++}`;
    newKeys[keyName] = chineseStr;
    totalChineseStrings++;
    return `${prefixStr}i18n.t('schema.${dirName}.${fileName}.${keyName}')`;
  });

  if (Object.keys(newKeys).length === 0) return;

  fs.writeFileSync(filePath, content);

  // Build translations
  if (!zh.schema[dirName]) zh.schema[dirName] = {};
  if (!en.schema[dirName]) en.schema[dirName] = {};
  if (!zh.schema[dirName][fileName]) zh.schema[dirName][fileName] = {};
  if (!en.schema[dirName][fileName]) en.schema[dirName][fileName] = {};

  for (const [key, zhVal] of Object.entries(newKeys)) {
    zh.schema[dirName][fileName][key] = zhVal;
    en.schema[dirName][fileName][key] = zhVal;
  }

  processedCount++;
  console.log(`  Processed: ${dirName}/${fileName}.ts (${Object.keys(newKeys).length} keys)`);
}

console.log('Processing schema files...\n');

for (const dir of schemaDirs) {
  if (fs.existsSync(dir)) {
    const files = walkDir(dir);
    for (const file of files) {
      processFile(file);
    }
  }
}

for (const file of extraFiles) {
  processFile(file);
}

// Write zh.json and en.json
console.log('\nWriting zh.json...');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2));
console.log('Writing en.json...');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log(`\nDONE! Processed ${processedCount} files, ${totalChineseStrings} Chinese strings.`);
