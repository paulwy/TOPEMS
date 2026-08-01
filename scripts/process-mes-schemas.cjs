const fs = require('fs');
const path = require('path');

const ROOT = '/Users/air/TOPEMS/apps/web/src';
const schemasDir = path.join(ROOT, 'schemas', 'mes');
const zhPath = path.join(ROOT, 'i18n', 'locales', 'zh.json');
const enPath = path.join(ROOT, 'i18n', 'locales', 'en.json');
const translationsPath = '/Users/air/TOPEMS/scripts/mes-translations.json';

const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

if (!zh.schema) zh.schema = {};
if (!zh.schema.mes) zh.schema.mes = {};
if (!en.schema) en.schema = {};
if (!en.schema.mes) en.schema.mes = {};

function addTranslations(fileKey) {
  const entries = translations[fileKey];
  if (!entries) return;
  if (!zh.schema.mes[fileKey]) zh.schema.mes[fileKey] = {};
  if (!en.schema.mes[fileKey]) en.schema.mes[fileKey] = {};

  for (const [key, [zhVal, enVal]] of Object.entries(entries)) {
    zh.schema.mes[fileKey][key] = zhVal;
    en.schema.mes[fileKey][key] = enVal;
  }
}

for (const fileKey of Object.keys(translations)) {
  addTranslations(fileKey);
}

function injectI18nImport(content) {
  if (content.includes("import i18n from '@/i18n'")) return content;
  if (content.startsWith('import ')) {
    const lastImportIdx = content.lastIndexOf('import ');
    const nextSemi = content.indexOf(';\n', lastImportIdx);
    if (nextSemi !== -1) {
      return content.slice(0, nextSemi + 2) + "import i18n from '@/i18n';\n" + content.slice(nextSemi + 2);
    }
  }
  return "import i18n from '@/i18n';\n" + content;
}

const STATUS_MAP_TEMPLATE = (fileKey, statusKeys) => {
  const entries = statusKeys.map(k => `  ${k}: i18n.t('schema.mes.${fileKey}.${k}')`).join(',\n');
  return `const STATUS_LABEL_MAP: Record<string, string> = {\n${entries},\n};\n\n`;
};

function processFile(fileName, fileKey) {
  const filePath = path.join(schemasDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${fileName} not found`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  const entries = translations[fileKey];
  if (!entries) {
    console.log(`  SKIP: ${fileName} no translations`);
    return;
  }

  content = injectI18nImport(content);

  const replacePairs = [];

  for (const [key, [zhVal]] of Object.entries(entries)) {
    if (key.startsWith('label_') || key.startsWith('option_') || key.startsWith('status_') ||
        key.startsWith('filter_') || key === 'title' || key === 'description' ||
        key.startsWith('section_') || key.endsWith('_title')) {
      replacePairs.push({ zh: zhVal, key: `schema.mes.${fileKey}.${key}` });
    }
  }

  for (const { zh, key } of replacePairs) {
    const regex = new RegExp(`'${zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g');
    content = content.replace(regex, match => {
      const prefixMatch = content.slice(Math.max(0, content.indexOf(match) - 15), content.indexOf(match));
      if (prefixMatch.includes('i18n.t(')) return match;
      return `i18n.t('${key}')`;
    });
  }

  fs.writeFileSync(filePath, content);
  console.log(`  OK: ${fileName}`);
}

console.log('Processing MES schema files...');
console.log('');

const fileMap = {
  'productionProcess.ts': 'productionProcess',
  'productionRecord.ts': 'productionRecord',
  'workOrder.ts': 'workOrder',
  'workReport.ts': 'workReport',
  'workstation.ts': 'workstation',
  'team.ts': 'team',
  'quality.ts': 'quality',
  'productionSchedule.ts': 'productionSchedule',
  'productionOrder.ts': 'productionOrder',
  'processRoute.ts': 'processRoute',
  'processFlow.ts': 'processFlow',
  'wip.ts': 'wip',
  'materialReturn.ts': 'materialReturn',
  'materialRequirement.ts': 'materialRequirement',
  'materialIssue.ts': 'materialIssue',
  'materialBom.ts': 'materialBom',
  'equipmentOee.ts': 'equipmentOee',
  'equipment.ts': 'equipment',
  'dashboardSchema.ts': 'dashboardSchema',
};

for (const [file, key] of Object.entries(fileMap)) {
  processFile(file, key);
}

console.log('');
console.log('Writing zh.json...');
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2));
console.log('Writing en.json...');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log('');
console.log('DONE!');
