#!/usr/bin/env node
/**
 * V219 P2 Edge-Case Fix: Handle remaining hardcoded Chinese patterns
 * that the batch script missed.
 *
 * Patterns handled:
 * 1. JSX bare text: 中文 on its own line inside JSX (not in quotes/backticks)
 * 2. JSX attribute quoted: placeholder='中文' or label="中文"
 * 3. Template literal with interpolation: `中文${var}中文`
 * 4. JSX text + expression: 中文: {expr} or {expr} 中文
 * 5. Breadcrumb/label arrays: label: '中文'
 * 6. Chinese object keys in export: 中文: value
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');
const moduleArg = args.indexOf('--module');
const targetModules =
  moduleArg !== -1 && args[moduleArg + 1]
    ? args[moduleArg + 1].split(',')
    : ['gis', 'im', 'system', 'automation', 'finance', 'lowcode', 'hrm', 'pdm', 'scm', 'integration'];

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');
const I18N_DIR = path.join(WEB_ROOT, 'i18n', 'locales');

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]/;
const CJK_RANGE = '[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff]';

let totalReplaced = 0;
let filesFixed = 0;
const translations = {}; // module -> { key -> { zh, en } }

function loadTranslations(module) {
  if (translations[module]) return translations[module];
  const zhPath = path.join(I18N_DIR, 'zh', `${module}.json`);
  const enPath = path.join(I18N_DIR, 'en', `${module}.json`);
  translations[module] = {};
  if (fs.existsSync(zhPath)) {
    try {
      translations[module] = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    } catch {}
  }
  return translations[module];
}

function saveTranslations(module) {
  const zhPath = path.join(I18N_DIR, 'zh', `${module}.json`);
  const enPath = path.join(I18N_DIR, 'en', `${module}.json`);
  const zhData = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  // Merge new translations
  for (const [key, val] of Object.entries(translations[module] || {})) {
    if (!zhData[key]) zhData[key] = val.zh;
    if (!enData[key]) enData[key] = val.en || val.zh;
  }

  if (!dryRun) {
    fs.writeFileSync(zhPath, JSON.stringify(zhData, null, 2) + '\n');
    fs.writeFileSync(enPath, JSON.stringify(enData, null, 2) + '\n');
  }
}

function fileLabel(filePath, module) {
  const rel = path.relative(path.join(PAGES_DIR, module), filePath);
  const b = rel
    .replace(/\.tsx$/, '')
    .replace(/\//g, '_')
    .replace(/\\/g, '_');
  return b
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]/g, '_')
    .toLowerCase();
}

let keyCounters = {};

function genKey(module, fileLabel, text) {
  const prefix = `${module}.${fileLabel}`;
  if (!keyCounters[prefix]) keyCounters[prefix] = 0;
  keyCounters[prefix]++;

  // Use a hash of the text for dedup
  const hash = text
    .trim()
    .substring(0, 12)
    .replace(/[^\u4e00-\u9fff\w]/g, '');
  const key = `${prefix}.e${keyCounters[prefix]}`;

  // Check if text already exists in translations
  for (const [k, v] of Object.entries(translations[module] || {})) {
    if (v.zh === text.trim()) return k;
  }

  return key;
}

function addTranslation(module, key, zhText, enText) {
  if (!translations[module]) loadTranslations(module);
  if (!translations[module][key]) {
    translations[module][key] = { zh: zhText, en: enText || zhText };
  }
  return key;
}

function isComment(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*');
}

function isImport(line) {
  return /^\s*import\s+/.test(line);
}

function hasTranslation(line) {
  return /i18n\.t\s*\(|\bt\s*\(\s*['"]/.test(line) && !/const\s*\{\s*t\s*\}/.test(line);
}

function isJSXContext(lines, lineIdx) {
  // Check if we're inside JSX by looking at surrounding context
  // Heuristic: check if there's a JSX tag opening before this line without closing
  let depth = 0;
  for (let i = lineIdx; i >= Math.max(0, lineIdx - 30); i--) {
    const line = lines[i];
    // Count opening and closing JSX tags
    const opens = (line.match(/<[A-Z][A-Za-z0-9.]*/g) || []).length;
    const closes = (line.match(/<\/[A-Z][A-Za-z0-9.]*/g) || []).length;
    const selfClosing = (line.match(/\/>/g) || []).length;
    depth += opens - closes - selfClosing;

    // Also count HTML-like tags
    const htmlOpens = (
      line.match(
        /<(div|span|p|ul|li|table|tr|td|th|thead|tbody|button|input|select|option|label|form|img|a|br|hr|section|article|header|footer|nav|main|aside)\b/g
      ) || []
    ).length;
    const htmlCloses = (
      line.match(
        /<\/(div|span|p|ul|li|table|tr|td|th|thead|tbody|button|input|select|option|label|form|img|a|br|hr|section|article|header|footer|nav|main|aside)\b/g
      ) || []
    ).length;
    depth += htmlOpens - htmlCloses;

    if (depth > 0) return true;
    if (depth < 0) depth = 0;

    // Check for return ( JSX ) pattern
    if (/return\s*\(/.test(line) || /=>\s*\(/.test(line)) return true;
    if (/=>\s*\{/.test(line) && !/=>\s*\{[^}]*\}/.test(line)) {
      // Inside arrow function body, could be JSX
      continue;
    }
  }
  return false;
}

function processFile(filePath, module) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;
  let replaceCount = 0;

  const label = fileLabel(filePath, module);
  loadTranslations(module);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip comments, imports, empty lines
    if (isComment(line) || isImport(line) || line.trim() === '') continue;

    // Skip lines that already have translation calls
    if (hasTranslation(line)) continue;

    // Skip test files
    if (filePath.includes('__test') || filePath.includes('.test.')) continue;

    // Skip lines that are just variable declarations without Chinese values
    if (/^(const|let|var)\s+\w+\s*=/.test(line.trim()) && !CJK_RE.test(line)) continue;

    if (!CJK_RE.test(line)) continue;

    // PATTERN: JSX bare text (Chinese text on its own line, possibly with indentation)
    // Example: "          地理围栏管理" or "          创建围栏"
    const bareTextMatch = line.match(
      /^(\s*)([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*?)\s*$/
    );
    if (
      bareTextMatch &&
      !line.includes('=') &&
      !line.includes('(') &&
      !line.includes('`') &&
      !line.includes('"') &&
      !line.includes("'")
    ) {
      const indent = bareTextMatch[1];
      const text = bareTextMatch[2].trim();
      if (text && CJK_RE.test(text)) {
        const key = genKey(module, label, text);
        addTranslation(module, key, text);
        const useI18n = !isJSXContext(lines, i) || /:\s*$/.test(lines[i - 1]?.trim() || '');
        // In JSX context, wrap in {}
        if (useI18n || /=>\s*\{/.test(lines.slice(Math.max(0, i - 5), i).join(''))) {
          // Check if inside JSX (between tags)
          const inJSX = isJSXContext(lines, i);
          if (inJSX) {
            lines[i] = `${indent}{t('${key}')}`;
          } else {
            lines[i] = `${indent}i18n.t('${key}')`;
          }
        } else {
          lines[i] = `${indent}{t('${key}')}`;
        }
        modified = true;
        replaceCount++;
        if (verbose)
          console.log(
            `  [P1-bare] ${path.relative(PAGES_DIR, filePath)}:${i + 1} "${text.substring(0, 20)}..." -> ${lines[i].trim()}`
          );
        continue;
      }
    }

    // PATTERN: Chinese text after > (JSX children)
    // Example: <Typography>加载中...</Typography> or <DialogTitle>BOM版本对比</DialogTitle>
    const jsxChildMatch = line.match(
      /(>\s*)([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%]*?)(\s*<)/
    );
    if (jsxChildMatch) {
      const text = jsxChildMatch[2].trim();
      if (text && CJK_RE.test(text)) {
        // Check if text has JSX expressions mixed in
        if (/\{[^}]/.test(jsxChildMatch[2])) continue; // Skip mixed expressions for now

        const key = genKey(module, label, text);
        addTranslation(module, key, text);
        lines[i] = line.replace(jsxChildMatch[0], `${jsxChildMatch[1]}{t('${key}')}${jsxChildMatch[3]}`);
        modified = true;
        replaceCount++;
        line = lines[i]; // Update for subsequent patterns
        if (verbose)
          console.log(
            `  [P5-jsx-child] ${path.relative(PAGES_DIR, filePath)}:${i + 1} "${text.substring(0, 20)}..." -> {t('${key}')}`
          );
        continue;
      }
    }

    // PATTERN: JSX attribute with quoted Chinese
    // Example: placeholder='搜索围栏...' or label="中文"
    const attrMatch = line.match(
      /(\w+)=(['"])([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*?)\2/
    );
    if (attrMatch) {
      const attr = attrMatch[1];
      const text = attrMatch[3].trim();
      if (text && CJK_RE.test(text)) {
        const key = genKey(module, label, text);
        addTranslation(module, key, text);
        lines[i] = line.replace(attrMatch[0], `${attr}={t('${key}')}`);
        modified = true;
        replaceCount++;
        line = lines[i];
        if (verbose)
          console.log(
            `  [P4-attr] ${path.relative(PAGES_DIR, filePath)}:${i + 1} ${attr}="${text.substring(0, 20)}..." -> {t('${key}')}`
          );
        continue;
      }
    }

    // PATTERN: label: '中文' in breadcrumb/tab arrays
    // Example: label: 'BOM管理'
    const labelMatch = line.match(
      /(label|title|name):\s*(['"])([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*?)\2/
    );
    if (labelMatch && !hasTranslation(line)) {
      const field = labelMatch[1];
      const text = labelMatch[3].trim();
      if (text && CJK_RE.test(text)) {
        // Check if at module level (not in component)
        const useI18n = !isJSXContext(lines, i);
        const key = genKey(module, label, text);
        addTranslation(module, key, text);
        if (useI18n) {
          lines[i] = line.replace(labelMatch[0], `${field}: i18n.t('${key}')`);
        } else {
          lines[i] = line.replace(labelMatch[0], `${field}: t('${key}')`);
        }
        modified = true;
        replaceCount++;
        line = lines[i];
        if (verbose)
          console.log(
            `  [P12-label] ${path.relative(PAGES_DIR, filePath)}:${i + 1} ${field}="${text.substring(0, 20)}..." -> ${useI18n ? 'i18n.' : ''}t('${key}')`
          );
        continue;
      }
    }

    // PATTERN: Template literal with Chinese + interpolation
    // Example: `成功删除 ${count} 条记录`
    const tmplMatch = line.match(
      /`([^`]*[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][^`]*\$\{[^}]+\}[^`]*)`/
    );
    if (!tmplMatch) {
      // Also match template literal with only Chinese (no interpolation)
      const simpleTmpl = line.match(/`([^`]*[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][^`]*)`/);
      if (simpleTmpl && !hasTranslation(line)) {
        const text = simpleTmpl[1].trim();
        if (text && CJK_RE.test(text)) {
          // Check if it's a message: property or other string context
          const useI18n = /message:|description:|error:|warning:|label:/.test(
            line.slice(0, line.indexOf(simpleTmpl[0]))
          );
          const key = genKey(module, label, text);
          addTranslation(module, key, text);
          if (useI18n) {
            lines[i] = line.replace(simpleTmpl[0], `i18n.t('${key}')`);
          } else {
            lines[i] = line.replace(simpleTmpl[0], `t('${key}')`);
          }
          modified = true;
          replaceCount++;
          line = lines[i];
          if (verbose)
            console.log(
              `  [P3-tmpl-simple] ${path.relative(PAGES_DIR, filePath)}:${i + 1} \`${text.substring(0, 20)}...\` -> t('${key}')`
            );
          continue;
        }
      }
    } else {
      // Complex template literal with interpolation
      const fullMatch = tmplMatch[0];
      const innerText = tmplMatch[1];
      if (CJK_RE.test(innerText)) {
        // Extract Chinese segments and ${} variables
        const parts = [];
        let remaining = innerText;
        const varRe = /\$\{([^}]+)\}/g;
        let lastIdx = 0;
        let m;
        let varIdx = 0;
        const interpolations = [];

        while ((m = varRe.exec(innerText)) !== null) {
          if (m.index > lastIdx) {
            const before = innerText.substring(lastIdx, m.index);
            if (before.trim()) parts.push(before.trim());
          }
          interpolations.push({ name: `v${varIdx + 1}`, expr: m[1] });
          parts.push(`{{v${varIdx + 1}}}`);
          lastIdx = m.index + m[0].length;
          varIdx++;
        }
        if (lastIdx < innerText.length) {
          const after = innerText.substring(lastIdx);
          if (after.trim()) parts.push(after.trim());
        }

        // Create a translation string with interpolation placeholders
        const transText = parts.join(' ');
        const key = genKey(module, label, transText);
        addTranslation(module, key, transText);

        // Build the t() call with interpolation params
        const paramStr =
          interpolations.length > 0 ? `, { ${interpolations.map((ip) => `${ip.name}: ${ip.expr}`).join(', ')} }` : '';

        // Check context for i18n vs t
        const useI18n = /message:|error:|warning:|throw|apiLogger|window\.confirm/.test(
          line.slice(0, line.indexOf(fullMatch))
        );

        const replacement = useI18n ? `i18n.t('${key}'${paramStr})` : `t('${key}'${paramStr})`;

        lines[i] = line.replace(fullMatch, replacement);
        modified = true;
        replaceCount++;
        line = lines[i];
        if (verbose)
          console.log(
            `  [P3-tmpl-complex] ${path.relative(PAGES_DIR, filePath)}:${i + 1} \`${innerText.substring(0, 30)}...\` -> ${useI18n ? 'i18n.' : ''}t('${key}'${paramStr ? ', {...}' : ''})`
          );
        continue;
      }
    }

    // PATTERN: Quoted string with Chinese (not in JSX attribute)
    // Example: setError('字段 JSON 解析失败')  or  throw new Error('MRP建议不支持创建')
    const quotedMatch = line.match(
      /(['"])([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w\s：，。、（）()·\-—\!！？%\/]*?)\1/
    );
    if (
      quotedMatch &&
      !hasTranslation(line) &&
      !line.includes('placeholder=') &&
      !line.includes('label=') &&
      !line.includes('title=')
    ) {
      const text = quotedMatch[2].trim();
      if (text && CJK_RE.test(text) && text.length > 1) {
        // Check context
        const beforeText = line.substring(0, line.indexOf(quotedMatch[0]));
        const useI18n = /message:|error:|warning:|throw|apiLogger|window\.confirm|setError|console\./.test(beforeText);

        const key = genKey(module, label, text);
        addTranslation(module, key, text);

        if (useI18n) {
          lines[i] = line.replace(quotedMatch[0], `i18n.t('${key}')`);
        } else {
          // Check if in JSX context
          if (isJSXContext(lines, i)) {
            lines[i] = line.replace(quotedMatch[0], `t('${key}')`);
          } else {
            lines[i] = line.replace(quotedMatch[0], `i18n.t('${key}')`);
          }
        }
        modified = true;
        replaceCount++;
        line = lines[i];
        if (verbose)
          console.log(
            `  [P-quoted] ${path.relative(PAGES_DIR, filePath)}:${i + 1} "${text.substring(0, 20)}..." -> ${useI18n ? 'i18n.' : ''}t('${key}')`
          );
        continue;
      }
    }

    // PATTERN: Chinese text in JSX attribute template literal
    // Example: subtitle={`中文${var}`}
    const jsxAttrTmpl = line.match(/(\w+)=\{`([^`]*[\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][^`]*)`\}/);
    if (jsxAttrTmpl && !hasTranslation(line)) {
      const attr = jsxAttrTmpl[1];
      const innerText = jsxAttrTmpl[2];
      if (CJK_RE.test(innerText)) {
        // Handle interpolation in template literal
        const varRe = /\$\{([^}]+)\}/g;
        let m;
        const interpolations = [];
        let transText = innerText;
        let varIdx = 0;
        while ((m = varRe.exec(innerText)) !== null) {
          interpolations.push({ name: `v${varIdx + 1}`, expr: m[1] });
          transText = transText.replace(m[0], `{{v${varIdx + 1}}}`);
          varIdx++;
        }

        const key = genKey(module, label, transText.trim());
        addTranslation(module, key, transText.trim());

        const paramStr =
          interpolations.length > 0 ? `, { ${interpolations.map((ip) => `${ip.name}: ${ip.expr}`).join(', ')} }` : '';

        lines[i] = line.replace(jsxAttrTmpl[0], `${attr}={t('${key}'${paramStr})}`);
        modified = true;
        replaceCount++;
        line = lines[i];
        if (verbose)
          console.log(
            `  [P6-jsx-attr-tmpl] ${path.relative(PAGES_DIR, filePath)}:${i + 1} ${attr}={\`...\`} -> {t('${key}'${paramStr ? ', {...}' : ''})}`
          );
        continue;
      }
    }

    // PATTERN: Chinese object keys in export
    // Example: 映射名称: m.name
    const objKeyMatch = line.match(
      /^(\s*)(['"]?)([\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff][\u4e00-\u9fff\u3400-\u4dbf\u3300-\u33ff\uf900-\ufaff\w]*)(['"]?)\s*:/
    );
    if (objKeyMatch) {
      const indent = objKeyMatch[1];
      const keyText = objKeyMatch[3];
      if (CJK_RE.test(keyText)) {
        // Replace Chinese object key with English key + t() for value
        // For now just skip object keys - they're complex to handle
        // These are usually export column headers
        continue;
      }
    }
  }

  if (modified) {
    if (!dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
    }
    filesFixed++;
    totalReplaced += replaceCount;
  }

  return replaceCount;
}

function walkDir(dir, ext, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, ext, callback);
    } else if (entry.name.endsWith(ext)) {
      callback(fullPath);
    }
  }
}

console.log(`\n=== V219 P2 Edge-Case Fix ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
console.log(`Modules: ${targetModules.join(', ')}\n`);

for (const mod of targetModules) {
  const modDir = path.join(PAGES_DIR, mod);
  if (!fs.existsSync(modDir)) continue;

  keyCounters = {};
  loadTranslations(mod);
  let modCount = 0;

  console.log(`Processing ${mod}...`);
  walkDir(modDir, '.tsx', (filePath) => {
    // Skip test files
    if (filePath.includes('__test') || filePath.includes('.test.')) return;
    try {
      modCount += processFile(filePath, mod);
    } catch (e) {
      console.error(`  ERROR: ${filePath}: ${e.message}`);
    }
  });

  if (modCount > 0) {
    saveTranslations(mod);
    console.log(`  ${mod}: ${modCount} replacements`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Files fixed: ${filesFixed}`);
console.log(`Total replacements: ${totalReplaced}`);
console.log(`Mode: ${dryRun ? 'DRY RUN (no files written)' : 'WRITE (files updated)'}`);
