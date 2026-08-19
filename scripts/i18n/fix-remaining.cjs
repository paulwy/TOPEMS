#!/usr/bin/env node
/**
 * V219 P2 Final Fix: Handle the remaining ~271 hardcoded Chinese lines
 * that previous scripts missed.
 *
 * Patterns handled:
 * 1. JSX text + expression: `类型: {expr}` -> `{t('key', {v1: expr})}`
 * 2. Component prop strings: `placeholder='中文'` -> `placeholder={t('key')}`
 * 3. Data object values: `name: '中文'` -> `name: i18n.t('key')`
 * 4. Chinese object keys in export: `映射名称: val` -> keep key, skip (low priority)
 * 5. apiLogger.error('中文') -> apiLogger.error(i18n.t('key'))
 * 6. throw new Error('中文') -> throw new Error(i18n.t('key'))
 * 7. Conditional strings: `cond ? '中文' : t('key')` -> `cond ? t('k1') : t('k2')`
 * 8. "页面建设中…" stubs: batch replace
 * 9. MUI children with mixed text+expr: `<X>中文{expr}</X>` -> `<X>{t('key', {v1: expr})}</X>`
 * 10. Chart data labels: `name: '1周'` -> `name: i18n.t('key')`
 * 11. Bare Chinese with units: `{count} 个月` -> `{t('key', {v1: count})}`
 * 12. window.confirm template literals
 * 13. message: `中文${var}中文` -> message: i18n.t('key', {v1: var})
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');
const P2 = ['gis', 'im', 'system', 'automation', 'finance', 'lowcode', 'hrm', 'pdm', 'scm', 'integration'];

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]/;
const CJK_STR = '[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]';

let totalReplaced = 0;
let filesFixed = 0;
const translations = {};
let keyCounters = {};

function loadTranslations(mod) {
  if (translations[mod]) return translations[mod];
  const zhPath = path.join(I18N_DIR, 'zh', `${mod}.json`);
  translations[mod] = {};
  if (fs.existsSync(zhPath)) {
    try {
      translations[mod] = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    } catch {}
  }
  return translations[mod];
}

function saveTranslations(mod) {
  const zhPath = path.join(I18N_DIR, 'zh', `${mod}.json`);
  const enPath = path.join(I18N_DIR, 'en', `${mod}.json`);
  if (!fs.existsSync(zhPath)) return;
  const zhData = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  for (const [key, val] of Object.entries(translations[mod] || {})) {
    if (!zhData[key]) zhData[key] = val.zh;
    if (!enData[key]) enData[key] = val.en || val.zh;
  }
  if (!dryRun) {
    fs.writeFileSync(zhPath, JSON.stringify(zhData, null, 2) + '\n');
    fs.writeFileSync(enPath, JSON.stringify(enData, null, 2) + '\n');
  }
}

function fileLabel(filePath, mod) {
  const rel = path.relative(path.join(PAGES_DIR, mod), filePath);
  return rel
    .replace(/\.tsx$/, '')
    .replace(/\//g, '_')
    .replace(/\\/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]/g, '_')
    .toLowerCase();
}

function genKey(mod, label, text) {
  const prefix = `${mod}.${label}`;
  if (!keyCounters[prefix]) keyCounters[prefix] = 0;
  keyCounters[prefix]++;
  for (const [k, v] of Object.entries(translations[mod] || {})) {
    if (v.zh === text) return k;
  }
  return `${prefix}.r${keyCounters[prefix]}`;
}

function addTrans(mod, key, zh, en) {
  if (!translations[mod]) loadTranslations(mod);
  if (!translations[mod][key]) translations[mod][key] = { zh, en: en || zh };
  return key;
}

function hasI18nImport(lines) {
  return lines.some((l) => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
}

function hasUseTranslationImport(lines) {
  return lines.some((l) => /import\s*\{[^}]*useTranslation[^}]*\}\s*from\s+['"]react-i18next['"]/.test(l));
}

function getLastImportLine(lines) {
  let last = -1,
    inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('import ')) {
      if (t.includes('{') && !t.includes('}')) {
        inBlock = true;
        last = i;
      } else if (t.endsWith(';')) {
        last = i;
        inBlock = false;
      } else {
        last = i;
      }
    } else if (inBlock) {
      if (t.endsWith(';')) {
        last = i;
        inBlock = false;
      }
    } else if (last >= 0 && !t.startsWith('import') && t !== '') break;
  }
  return last;
}

function isJSXContext(lines, idx) {
  let depth = 0;
  for (let i = idx; i >= Math.max(0, idx - 20); i--) {
    const line = lines[i];
    const opens = (line.match(/<[A-Z][A-Za-z0-9.]*(?:\s|>)/g) || []).length;
    const closes = (line.match(/<\/[A-Z]/g) || []).length;
    depth += opens - closes;
    if (depth > 0) return true;
    if (depth < 0) depth = 0;
    if (/return\s*\(|=>\s*\(|=>\s*\{/.test(line)) return true;
  }
  return false;
}

function processFile(filePath, mod) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;
  let count = 0;
  const label = fileLabel(filePath, mod);
  loadTranslations(mod);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Skip comments, imports, empty
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('{/*'))
      continue;
    if (/^import\s/.test(trimmed)) continue;
    if (trimmed === '') continue;
    if (filePath.includes('.test.')) continue;

    // Check if line has untranslated Chinese (not inside t()/i18n.t() calls)
    let cleaned = line.replace(/i18n\.t\s*\([^)]*\)/g, '').replace(/\bt\s*\(\s*['"`][^)]*\)/g, '');
    if (!CJK.test(cleaned)) continue;

    // Skip Chinese property access (like report.归属于母公司净利润)
    if (/\.归属于母公司净利润/.test(line)) continue;

    // PATTERN: "页面建设中…" stubs
    const stubMatch = line.match(/description='([^']*页面建设中[^']*)'/);
    if (stubMatch) {
      const text = stubMatch[1];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(stubMatch[0], `description={i18n.t('${key}')}`);
      modified = true;
      count++;
      if (verbose) console.log(`  [stub] ${mod}/${label}:${i + 1} "${text.substring(0, 30)}"`);
      continue;
    }

    // PATTERN: title='中文'
    const titleMatch = line.match(/title=(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：·.↔()（∗]*?)\1/);
    if (titleMatch && !line.includes('i18n.t(') && !line.includes(`t('`)) {
      const text = titleMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(titleMatch[0], `title={i18n.t('${key}')}`);
      modified = true;
      count++;
      line = lines[i];
      if (verbose) console.log(`  [title] ${mod}/${label}:${i + 1} "${text.substring(0, 20)}"`);
      continue;
    }

    // PATTERN: label='中文'
    const labelMatch = line.match(/label=(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：·.（∗]*?)\1/);
    if (labelMatch && !line.includes('i18n.t(') && !line.includes(`t('`)) {
      const text = labelMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      const useI18n = !isJSXContext(lines, i);
      const prefix = useI18n ? 'i18n.' : '';
      lines[i] = line.replace(labelMatch[0], `label={${prefix}t('${key}')}`);
      modified = true;
      count++;
      line = lines[i];
      if (verbose) console.log(`  [label] ${mod}/${label}:${i + 1} "${text.substring(0, 20)}"`);
      continue;
    }

    // PATTERN: placeholder='中文'
    const phMatch = line.match(
      /placeholder=(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，。、（）()·\-—\!！？%\/]*?)\1/
    );
    if (phMatch && !line.includes('i18n.t(')) {
      const text = phMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(phMatch[0], `placeholder={t('${key}')}`);
      modified = true;
      count++;
      line = lines[i];
      if (verbose) console.log(`  [placeholder] ${mod}/${label}:${i + 1} "${text.substring(0, 20)}"`);
      continue;
    }

    // PATTERN: helperText='中文'
    const htMatch = line.match(
      /helperText=(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，。、（）()·\-—\!！？%\/]*?)\1/
    );
    if (htMatch && !line.includes('i18n.t(')) {
      const text = htMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(htMatch[0], `helperText={t('${key}')}`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: Conditional ternary with Chinese string
    // {cond ? '中文' : t('key')} or {cond ? '中文' : '中文2'}
    const ternaryMatch = line.match(/\?\s*['"]([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-…]*?)['"]\s*:/);
    if (ternaryMatch) {
      const text = ternaryMatch[1];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      const useI18n = !isJSXContext(lines, i);
      const prefix = useI18n ? 'i18n.' : '';
      lines[i] = line.replace(ternaryMatch[0], `? ${prefix}t('${key}') :`);
      modified = true;
      count++;
      line = lines[i];
      if (verbose) console.log(`  [ternary] ${mod}/${label}:${i + 1} "${text.substring(0, 15)}"`);
      continue;
    }

    // PATTERN: apiLogger.error('中文')
    const apiLogMatch = line.match(/apiLogger\.error\((['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，.（）()]*?)\1/);
    if (apiLogMatch) {
      const text = apiLogMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(apiLogMatch[0], `apiLogger.error(i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      if (verbose) console.log(`  [apiLog] ${mod}/${label}:${i + 1} "${text.substring(0, 20)}"`);
      continue;
    }

    // PATTERN: throw new Error('中文')
    const throwMatch = line.match(/throw new Error\((['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，.（）()]*?)\1/);
    if (throwMatch) {
      const text = throwMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(throwMatch[0], `throw new Error(i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: message: '中文' (non-JSX context)
    const msgMatch = line.match(/message:\s*(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，。、（）()·\-—\!！？%]*?)\1/);
    if (msgMatch && !line.includes('i18n.t(') && !line.includes(`t('`)) {
      const text = msgMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(msgMatch[0], `message: i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: message: `中文${var}中文` (template literal)
    const msgTmpl = line.match(/message:\s*`([^`]*[\u4e00-\u9fff][^`]*\$\{[^}]+\}[^`]*)`/);
    if (msgTmpl && !line.includes('i18n.t(')) {
      const inner = msgTmpl[1];
      const varRe = /\$\{([^}]+)\}/g;
      let m,
        varIdx = 0;
      const interpolations = [];
      let transText = inner;
      while ((m = varRe.exec(inner)) !== null) {
        interpolations.push({ name: `v${varIdx + 1}`, expr: m[1] });
        transText = transText.replace(m[0], `{{v${varIdx + 1}}}`);
        varIdx++;
      }
      const key = genKey(mod, label, transText.trim());
      addTrans(mod, key, transText.trim());
      const paramStr =
        interpolations.length > 0 ? `, { ${interpolations.map((ip) => `${ip.name}: ${ip.expr}`).join(', ')} }` : '';
      lines[i] = line.replace(msgTmpl[0], `message: i18n.t('${key}'${paramStr})`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: name: '中文' in data objects
    const nameMatch = line.match(/(\s+)name:\s*(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：·（()↔]*?)\2/);
    if (nameMatch && !line.includes('i18n.t(') && !line.includes(`t('`)) {
      const text = nameMatch[3];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(nameMatch[0], `${nameMatch[1]}name: i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: source: '中文' or target: '中文'
    const srcTgtMatch = line.match(
      /(\s+)(source|target|title|description):\s*(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：·（()↔,]*?)\4/
    );
    if (srcTgtMatch && !line.includes('i18n.t(') && !line.includes(`t('`)) {
      const field = srcTgtMatch[2];
      const text = srcTgtMatch[4];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(srcTgtMatch[0], `${srcTgtMatch[1]}${field}: i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: changeLabel: '中文'
    const clMatch = line.match(/changeLabel:\s*(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：·()]*)\1/);
    if (clMatch && !line.includes('i18n.t(')) {
      const text = clMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(clMatch[0], `changeLabel: i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: JSX text with expression: `中文: {expr}`
    // Like: 类型: {getTypeLabel(fence.type)}
    const jsxTextExpr = line.match(
      /^(\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—]*?):\s*\{([^}]+)\}(\s*)$/
    );
    if (jsxTextExpr) {
      const indent = jsxTextExpr[1];
      const text = jsxTextExpr[2].trim() + ':';
      const expr = jsxTextExpr[3];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = `${indent}{t('${key}')} {${expr}}${jsxTextExpr[4]}`;
      modified = true;
      count++;
      line = lines[i];
      if (verbose) console.log(`  [jsx-text-expr] ${mod}/${label}:${i + 1} "${text}"`);
      continue;
    }

    // PATTERN: JSX text with expression: `已选择 {expr} 条记录`
    // Chinese text before and after {expr}
    const jsxMixed = line.match(
      /^(\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—]*?)\s*\{([^}]+)\}\s*([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—]*?)?(\s*)$/
    );
    if (jsxMixed) {
      const indent = jsxMixed[1];
      const before = jsxMixed[2].trim();
      const expr = jsxMixed[3];
      const after = jsxMixed[4] ? jsxMixed[4].trim() : '';
      const fullText = before + ' {{v1}} ' + after;
      const key = genKey(mod, label, fullText.trim());
      addTrans(mod, key, fullText.trim());
      lines[i] = `${indent}{t('${key}', { v1: ${expr} })}${jsxMixed[5]}`;
      modified = true;
      count++;
      line = lines[i];
      if (verbose) console.log(`  [jsx-mixed] ${mod}/${label}:${i + 1} "${before}...{expr}...${after}"`);
      continue;
    }

    // PATTERN: MUI children: <X>中文{expr}</X>
    const muiChild = line.match(/(>\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—]*?)\s*(\{[^}]+\})(\s*<)/);
    if (muiChild) {
      const text = muiChild[2].trim();
      const expr = muiChild[3];
      const fullText = text + ' {{v1}}';
      const key = genKey(mod, label, fullText.trim());
      addTrans(mod, key, fullText.trim());
      lines[i] = line.replace(
        muiChild[0],
        `${muiChild[1]}{t('${key}', { v1: ${expr.replace(/[{}]/g, '')} })}${muiChild[4]}`
      );
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: MUI children: <X>中文</X>
    const muiSimple = line.match(/(>\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—\!！？%]*?)(\s*<\/)/);
    if (muiSimple && !line.includes('i18n.t(') && !line.includes(`t('`)) {
      const text = muiSimple[2].trim();
      if (text && CJK.test(text)) {
        const key = genKey(mod, label, text);
        addTrans(mod, key, text);
        lines[i] = line.replace(muiSimple[0], `${muiSimple[1]}{t('${key}')}${muiSimple[3]}`);
        modified = true;
        count++;
        line = lines[i];
        continue;
      }
    }

    // PATTERN: <InputLabel>中文 *</InputLabel>
    const inputLabel = line.match(
      /<InputLabel([^>]*)>([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—*]*?)<\/InputLabel>/
    );
    if (inputLabel && !line.includes('i18n.t(')) {
      const attrs = inputLabel[1];
      const text = inputLabel[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(inputLabel[0], `<InputLabel${attrs}>{t('${key}')}</InputLabel>`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: <DialogTitle>中文 - {expr}</DialogTitle>
    const dialogTitle = line.match(
      /<DialogTitle>([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—]*?)\s*-\s*\{([^}]+)\}<\/DialogTitle>/
    );
    if (dialogTitle && !line.includes('i18n.t(')) {
      const prefix = dialogTitle[1].trim();
      const expr = dialogTitle[2];
      const fullText = prefix + ' - {{v1}}';
      const key = genKey(mod, label, fullText);
      addTrans(mod, key, fullText);
      lines[i] = line.replace(dialogTitle[0], `<DialogTitle>{t('${key}', { v1: ${expr} })}</DialogTitle>`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: <DialogTitle>中文</DialogTitle>
    const dtSimple = line.match(/<DialogTitle>([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—]*?)<\/DialogTitle>/);
    if (dtSimple && !line.includes('i18n.t(') && !line.includes(`t('`)) {
      const text = dtSimple[1].trim();
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(dtSimple[0], `<DialogTitle>{t('${key}')}</DialogTitle>`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: <Tooltip title='中文'>
    const tooltipMatch = line.match(
      /<Tooltip\s+title=(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，。、（）()·()*+]*)\1/
    );
    if (tooltipMatch && !line.includes('i18n.t(')) {
      const text = tooltipMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(tooltipMatch[0], `<Tooltip title={t('${key}')}`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: <TableCell>中文</TableCell>
    const tcMatch = line.match(
      /<TableCell([^>]*)>([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-—/]*?)<\/TableCell>/
    );
    if (tcMatch && !line.includes('i18n.t(')) {
      const attrs = tcMatch[1] || '';
      const text = tcMatch[2].trim();
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(tcMatch[0], `<TableCell${attrs}>{t('${key}')}</TableCell>`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: <MenuItem value='X'>中文</MenuItem>
    const miMatch = line.match(
      /<MenuItem\s+value=(['"])([^'"]*)\1>([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：，。、（）()·()/]*?)<\/MenuItem>/
    );
    if (miMatch && !line.includes('i18n.t(')) {
      const val = miMatch[2];
      const text = miMatch[3];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(miMatch[0], `<MenuItem value='${val}'>{t('${key}')}</MenuItem>`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: breadcrumbs={[{ label: '中文' }, ...]}
    const bcMatch = line.match(/label:\s*(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s\-：·.]*)\1/);
    if (bcMatch && line.includes('breadcrumb') && !line.includes('i18n.t(')) {
      const text = bcMatch[2];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(bcMatch[0], `label: i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: Chart data: { name: '中文', value: N }
    const chartData = line.match(/(\s+)name:\s*(['"])([\u4e00-\u9fff][\u4e00-\u9fff\w\s]*)\2/);
    if (chartData && (line.includes('value:') || line.includes('value :')) && !line.includes('i18n.t(')) {
      const text = chartData[3];
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = line.replace(chartData[0], `${chartData[1]}name: i18n.t('${key}')`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: Chinese text before {expr} in JSX (like `共 {total} 条记录`)
    // Already handled by jsxMixed pattern above

    // PATTERN: Bare Chinese text in JSX (like `加载中...`)
    const bareText = line.match(/^(\s+)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-…]*?)(\s*)$/);
    if (
      bareText &&
      !line.includes('=') &&
      !line.includes('(') &&
      !line.includes('`') &&
      !line.includes('{') &&
      !line.includes('const ') &&
      !line.includes('let ') &&
      !line.includes('return ') &&
      !line.includes('if ') &&
      !line.includes('//')
    ) {
      const indent = bareText[1];
      const text = bareText[2].trim();
      if (text && CJK.test(text) && text.length > 1) {
        const key = genKey(mod, label, text);
        addTrans(mod, key, text);
        lines[i] = `${indent}{t('${key}')}${bareText[3]}`;
        modified = true;
        count++;
        line = lines[i];
        continue;
      }
    }

    // PATTERN: Chinese text with {' '} separator
    // Like: 在模板中使用{' '}
    const textWithSpace = line.match(/^(\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-]*?)\s*\{'\s'\}(\s*)$/);
    if (textWithSpace) {
      const indent = textWithSpace[1];
      const text = textWithSpace[2].trim();
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = `${indent}{t('${key}')}{' '}${textWithSpace[3]}`;
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: Chinese prefix before JSX expression
    // Like: 将批量更新{' '}
    const prefixExpr = line.match(/^(\s*)([\u4e00-\u9fff][\u4e00-\u9fff\w\s：，。、（）()·\-]*?)\{'\s'\}(\s*)$/);
    if (prefixExpr) {
      const indent = prefixExpr[1];
      const text = prefixExpr[2].trim();
      const key = genKey(mod, label, text);
      addTrans(mod, key, text);
      lines[i] = `${indent}{t('${key}')}{' '}${prefixExpr[3]}`;
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: subtitle={`中文${var}中文`}
    const subtitleTmpl = line.match(/subtitle=\{`([^`]*[\u4e00-\u9fff][^`]*\$\{[^}]+\}[^`]*)`\}/);
    if (subtitleTmpl && !line.includes('i18n.t(')) {
      const inner = subtitleTmpl[1];
      const varRe = /\$\{([^}]+)\}/g;
      let m,
        varIdx = 0;
      const interpolations = [];
      let transText = inner;
      while ((m = varRe.exec(inner)) !== null) {
        interpolations.push({ name: `v${varIdx + 1}`, expr: m[1] });
        transText = transText.replace(m[0], `{{v${varIdx + 1}}}`);
        varIdx++;
      }
      const key = genKey(mod, label, transText.trim());
      addTrans(mod, key, transText.trim());
      const paramStr =
        interpolations.length > 0 ? `, { ${interpolations.map((ip) => `${ip.name}: ${ip.expr}`).join(', ')} }` : '';
      lines[i] = line.replace(subtitleTmpl[0], `subtitle={t('${key}'${paramStr})}`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: window.confirm(`中文${var}中文`)
    const confirmMatch = line.match(/window\.confirm\(`([^`]*[\u4e00-\u9fff][^`]*\$\{[^}]+\}[^`]*)`\)/);
    if (confirmMatch && !line.includes('i18n.t(')) {
      const inner = confirmMatch[1];
      const varRe = /\$\{([^}]+)\}/g;
      let m,
        varIdx = 0;
      const interpolations = [];
      let transText = inner;
      while ((m = varRe.exec(inner)) !== null) {
        interpolations.push({ name: `v${varIdx + 1}`, expr: m[1] });
        transText = transText.replace(m[0], `{{v${varIdx + 1}}}`);
        varIdx++;
      }
      const key = genKey(mod, label, transText.trim());
      addTrans(mod, key, transText.trim());
      const paramStr =
        interpolations.length > 0 ? `, { ${interpolations.map((ip) => `${ip.name}: ${ip.expr}`).join(', ')} }` : '';
      lines[i] = line.replace(confirmMatch[0], `window.confirm(i18n.t('${key}'${paramStr}))`);
      modified = true;
      count++;
      line = lines[i];
      continue;
    }

    // PATTERN: Chinese object keys in export (映射名称: value)
    // Skip these - they're export column headers, low priority
    if (
      /^\s*[\u4e00-\u9fff]/.test(line) &&
      line.includes(':') &&
      !line.includes('const') &&
      !line.includes('let') &&
      !line.includes('function')
    ) {
      // This is likely a Chinese object key - skip for now
      continue;
    }
  }

  // Ensure imports
  if (modified) {
    const usesI18n = lines.some((l) => /i18n\.t\s*\(/.test(l));
    const hasImport = hasI18nImport(lines);
    if (usesI18n && !hasImport) {
      const last = getLastImportLine(lines);
      if (last >= 0) {
        lines.splice(last + 1, 0, "import i18n from '@/i18n';");
        count++;
      }
    }
    const usesT = lines.some((l) => /\bt\s*\(\s*['"`]/.test(l) && !/i18n\.t/.test(l) && !/const\s*\{\s*t\s*\}/.test(l));
    const hasTImport = hasUseTranslationImport(lines);
    if (usesT && !hasTImport) {
      const last = getLastImportLine(lines);
      if (last >= 0) {
        lines.splice(last + 1, 0, "import { useTranslation } from 'react-i18next';");
        count++;
      }
    }
  }

  if (modified) {
    if (!dryRun) fs.writeFileSync(filePath, lines.join('\n'));
    filesFixed++;
    totalReplaced += count;
  }
  return count;
}

function walk(dir, ext, cb) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, cb);
    else if (e.name.endsWith(ext) && !e.name.includes('.test.')) cb(p);
  }
}

console.log(`\n=== V219 P2 Final Fix ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

for (const mod of P2) {
  const dir = path.join(PAGES_DIR, mod);
  if (!fs.existsSync(dir)) continue;
  keyCounters = {};
  loadTranslations(mod);
  let c = 0;
  console.log(`Processing ${mod}...`);
  walk(dir, '.tsx', (f) => {
    try {
      c += processFile(f, mod);
    } catch (e) {
      console.error(`  ERR: ${f}: ${e.message}`);
    }
  });
  if (c > 0) {
    saveTranslations(mod);
    console.log(`  ${mod}: ${c} replacements`);
  }
}

console.log(`\nFiles: ${filesFixed}, Replacements: ${totalReplaced}, Mode: ${dryRun ? 'DRY' : 'WRITE'}`);
