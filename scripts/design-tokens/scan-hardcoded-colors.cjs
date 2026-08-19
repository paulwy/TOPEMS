#!/usr/bin/env node
/**
 * V232 P2 Design Token 硬编码扫描器（只读）
 * 扫描 apps/web/src/**.{ts,tsx,css} + packages/shared-components/**.{ts,tsx,css}
 * 内容：十六进制色值 + box-shadow 硬编码
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
const DEFAULT_TARGETS = [
  path.join(ROOT, 'apps/web/src'),
  path.join(ROOT, 'packages/shared-components/src'),
  path.join(ROOT, 'packages/shared-components'),
];
const EXEMPT_DIR_PATTERNS = [
  /__tests__/,
  /\.stories\./,
  /\.d\.ts$/,
  /node_modules/,
  /generated-tokens\.css$/,
  /generated-/,
  /theme\/tokens\.ts$/,
  /dist\//,
];
const HEX_RE = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const BOX_SHADOW_RE = /box-shadow\s*:\s*([^;{}]+)/gi;
const NAMED_COLORS_RE = /\b(white|black)\b/gi;

const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const isJson = args.includes('--json');
const verbose = args.includes('--verbose');

function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(fp, out);
    } else {
      if (/\.(ts|tsx|css)$/i.test(fp)) {
        const rel = path.relative(ROOT, fp);
        let exempt = false;
        for (const pat of EXEMPT_DIR_PATTERNS) {
          if (pat.test(rel)) {
            exempt = true;
            break;
          }
        }
        if (!exempt) out.push(fp);
      }
    }
  }
  return out;
}

function normalizeHex(hex) {
  let h = hex.toLowerCase();
  if (h.length === 4) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  } else if (h.length === 5) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] + h[4] + h[4];
  }
  return h;
}

function categorizeColor(hex) {
  const h = normalizeHex(hex);
  const rr = parseInt(h.slice(1, 3), 16);
  const gg = parseInt(h.slice(3, 5), 16);
  const bb = parseInt(h.slice(5, 7), 16);
  if (rr === gg && gg === bb) {
    if (rr > 240) return 'near-white';
    if (rr > 200) return 'light-gray';
    if (rr > 150) return 'mid-gray';
    if (rr > 80) return 'dark-gray';
    if (rr > 20) return 'near-black';
    return 'black';
  }
  const max = Math.max(rr, gg, bb);
  if (max === rr && rr > gg + 40 && rr > bb + 40) return 'red/orange';
  if (max === gg && gg > rr + 40 && gg > bb + 40) return 'green';
  if (max === bb && bb > rr + 40 && bb > gg + 40) return 'blue';
  if (rr > 200 && gg > 150 && bb < 120) return 'yellow/warm';
  if (rr > 150 && bb > 150 && Math.abs(rr - bb) < 50) return 'purple';
  return 'mixed/other';
}

function insideVarFallback(src, index) {
  let depth = 0;
  for (let i = index - 1; i >= Math.max(0, index - 500); i--) {
    const c = src[i];
    if (c === ')' && i > index - 1) continue;
    if (c === ')') depth--;
    else if (c === '(') {
      depth++;
      if (depth > 0) {
        const kwStart = Math.max(0, i - 3);
        const kw = src.slice(kwStart, i);
        if (kw.endsWith('var')) return true;
      }
    }
  }
  return false;
}

function insideCommentBlock(src, index) {
  const pre = src.slice(0, index);
  const blockOpens = (pre.match(/\/\*/g) || []).length;
  const blockCloses = (pre.match(/\*\//g) || []).length;
  return blockOpens > blockCloses;
}

function main() {
  const files = [];
  for (const t of DEFAULT_TARGETS) walkDir(t, files);
  if (verbose) console.error(`Scanning ${files.length} files...`);

  const byFile = {};
  const byColor = {};
  const byShadow = {};
  const byCategory = {};
  let colorTotal = 0;
  let shadowTotal = 0;

  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    let src;
    try {
      src = fs.readFileSync(fp, 'utf8');
    } catch {
      continue;
    }

    const fileResult = { colors: [], shadows: [] };

    let m;
    const hexSeen = new Set();
    HEX_RE.lastIndex = 0;
    while ((m = HEX_RE.exec(src)) !== null) {
      const beforeBig = src.slice(Math.max(0, m.index - 8), m.index);
      if (beforeBig.includes('url(')) continue;
      if (insideVarFallback(src, m.index)) continue;
      if (insideCommentBlock(src, m.index)) continue;
      const raw = m[0];
      const norm = normalizeHex(raw);
      const cat = categorizeColor(norm);
      const line = src.slice(0, m.index).split('\n').length;
      byColor[norm] = byColor[norm] || { raw_variants: new Set(), count: 0, category: cat };
      byColor[norm].raw_variants.add(raw);
      byColor[norm].count++;
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      fileResult.colors.push({ raw, normalized: norm, line, category: cat });
      if (!hexSeen.has(norm + ':' + line)) colorTotal++;
      hexSeen.add(norm + ':' + line);
    }

    const ncSeen = new Set();
    NAMED_COLORS_RE.lastIndex = 0;
    while ((m = NAMED_COLORS_RE.exec(src)) !== null) {
      const charBefore = m.index > 0 ? src[m.index - 1] : '';
      if (charBefore === '.') continue;
      const ctxLeft = src.slice(Math.max(0, m.index - 50), m.index);
      const ctxRight = src.slice(m.index + m[0].length, Math.min(src.length, m.index + m[0].length + 20));
      if (/(?:const|let|var)\s+(?:[A-Z_0-9]+,\s*)*$/.test(ctxLeft) && /^\s*=/.test(ctxRight)) continue;
      if (/(?:type|interface|enum)\s+\w+.*$/.test(ctxLeft)) continue;
      const ctxSlice = src.slice(Math.max(0, m.index - 80), m.index + m[0].length + 40);
      if (
        /\b(color|bg|background|border)\s*[:=].*\b/i.test(ctxSlice) ||
        /style=\s*\{\s*\{[^}]*\b(color|backgroundColor|borderColor)\s*:/i.test(ctxSlice)
      ) {
        const preCtx = src.slice(Math.max(0, m.index - 200), m.index);
        const postCtx = src.slice(m.index + m[0].length, Math.min(src.length, m.index + m[0].length + 200));
        const inQuote = (q) => {
          const start = preCtx.lastIndexOf(q);
          const endMatch = postCtx.indexOf(q);
          const lastEscape = preCtx
            .split('')
            .reverse()
            .join('')
            .search(/[^\\](\\\\)*$/);
          return start !== -1 && endMatch !== -1 && lastEscape === -1;
        };
        if (inQuote("'") || inQuote('"') || inQuote('`')) {
          const si1 = preCtx.search(/['"`]$/);
          const leftIdx = Math.max(preCtx.lastIndexOf("'"), preCtx.lastIndexOf('"'), preCtx.lastIndexOf('`'));
          const rightIdx =
            m.index +
            m[0].length +
            Math.min(
              postCtx.indexOf("'") === -1 ? 9999 : postCtx.indexOf("'"),
              postCtx.indexOf('"') === -1 ? 9999 : postCtx.indexOf('"'),
              postCtx.indexOf('`') === -1 ? 9999 : postCtx.indexOf('`')
            );
          const strContent = src.slice(leftIdx + 1, rightIdx);
          if (strContent.includes('.')) continue;
        }
        if (insideVarFallback(src, m.index)) continue;
        if (insideCommentBlock(src, m.index)) continue;
        const raw = m[0].toLowerCase();
        const norm = raw === 'white' ? '#ffffff' : '#000000';
        const cat = categorizeColor(norm);
        const line = src.slice(0, m.index).split('\n').length;
        byColor[norm] = byColor[norm] || { raw_variants: new Set(), count: 0, category: cat };
        byColor[norm].raw_variants.add(raw);
        byColor[norm].count++;
        byCategory[cat] = (byCategory[cat] || 0) + 1;
        fileResult.colors.push({ raw, normalized: norm, line, category: cat, named: true });
        if (!ncSeen.has(norm + ':' + line)) colorTotal++;
        ncSeen.add(norm + ':' + line);
      }
    }

    BOX_SHADOW_RE.lastIndex = 0;
    while ((m = BOX_SHADOW_RE.exec(src)) !== null) {
      const val = m[1].trim();
      if (val.includes('var(--')) continue;
      if (val === 'none' || val === 'inherit' || val === 'initial' || val === 'unset') continue;
      const line = src.slice(0, m.index).split('\n').length;
      const shortVal = val.length > 80 ? val.slice(0, 77) + '...' : val;
      byShadow[shortVal] = byShadow[shortVal] || { count: 0, full: val };
      byShadow[shortVal].count++;
      fileResult.shadows.push({ value: val, line });
      shadowTotal++;
    }

    if (fileResult.colors.length || fileResult.shadows.length) {
      byFile[rel] = fileResult;
    }
  }

  const byColorArr = Object.entries(byColor)
    .map(([hex, info]) => ({
      hex,
      count: info.count,
      category: info.category,
      variants: [...info.raw_variants].join('|'),
    }))
    .sort((a, b) => b.count - a.count);
  const byShadowArr = Object.entries(byShadow)
    .map(([sv, info]) => ({ short: sv, full: info.full, count: info.count }))
    .sort((a, b) => b.count - a.count);

  const summary = {
    total_files: files.length,
    files_with_issues: Object.keys(byFile).length,
    color_total: colorTotal,
    shadow_total: shadowTotal,
    total: colorTotal + shadowTotal,
    distinct_colors: byColorArr.length,
    distinct_shadows: byShadowArr.length,
    by_category: byCategory,
    top_colors: byColorArr.slice(0, 30),
    top_shadows: byShadowArr.slice(0, 20),
  };

  const result = { summary, by_file: byFile, by_color: byColorArr, by_shadow: byShadowArr };

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('========================================================');
    console.log(' V232 P2 Design Token 硬编码扫描报告');
    console.log('========================================================');
    console.log(` Scanned files      : ${summary.total_files}`);
    console.log(` Files w/ issues    : ${summary.files_with_issues}`);
    console.log('--------------------------------------------------------');
    console.log(` Color hardcoded    : ${summary.color_total}`);
    console.log(` Shadow hardcoded   : ${summary.shadow_total}`);
    console.log(` TOTAL (KPI #3)     : ${summary.total}`);
    console.log(` Distinct colors    : ${summary.distinct_colors}`);
    console.log(` Distinct shadows   : ${summary.distinct_shadows}`);
    console.log('--------------------------------------------------------');
    console.log(' By category:');
    for (const [cat, cnt] of Object.entries(summary.by_category).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat.padEnd(14)} : ${cnt}`);
    }
    console.log('--------------------------------------------------------');
    console.log(' Top 20 colors:');
    for (const c of summary.top_colors.slice(0, 20)) {
      console.log(`   ${c.hex.padEnd(9)} ${String(c.count).padStart(5)}  [${c.category}] variants=${c.variants}`);
    }
    console.log('--------------------------------------------------------');
    console.log(' Top 10 shadows:');
    for (const s of summary.top_shadows.slice(0, 10)) {
      console.log(`   x${String(s.count).padStart(3)}  ${s.short}`);
    }
    if (isStrict) {
      console.log('========================================================');
      console.log(` STRICT MODE: TOTAL = ${summary.total}`);
      process.exit(summary.total === 0 ? 0 : 1);
    }
  }
}

main();
