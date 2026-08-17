#!/usr/bin/env node
/**
 * V232 P2 Phase 3 Sweeper — 严格清零剩余 hardcoded
 * 策略：
 *   1) 从 generated-tokens.css 提取 hex→var 全量映射（97+ tokens）
 *   2) 新增 ≤10 个 fallback tokens 合并剩余长尾 (cyber 深色 / 彩色 fallback 等)
 *   3) 超 aggressive 替换：所有 #hex / #fff / white / black 在非注释非 var(--) 上下文全替换
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
const TOKENS_CSS = path.join(ROOT, 'apps/web/src/theme/generated-tokens.css');
const PHASE2_JSON = '/tmp/v232/p2-phase2.json';
const TARGET_DIRS = [
  path.join(ROOT, 'apps/web/src'),
  path.join(ROOT, 'packages/shared-components/src'),
  path.join(ROOT, 'packages/shared-components'),
];
const EXEMPT_PATTERNS = [
  /__tests__/,
  /\.stories\./,
  /\.d\.ts$/,
  /node_modules/,
  /generated-tokens\.css$/,
  /generated-/,
  /dist\//,
];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
console.error('[sweep-phase3] MODE=', apply ? 'APPLY (写盘)' : 'DRY-RUN');

function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(fp, out);
    else if (/\.(ts|tsx|css)$/i.test(fp)) {
      const rel = path.relative(ROOT, fp);
      if (!EXEMPT_PATTERNS.some(p => p.test(rel))) out.push(fp);
    }
  }
  return out;
}

function normalizeHex(h) {
  let s = h.toLowerCase();
  if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  else if (s.length === 5) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + s[4] + s[4];
  return s;
}

function buildHexVariants(hex6) {
  const h = hex6.toLowerCase();
  const H = hex6.toUpperCase();
  if (h[1] === h[2] && h[3] === h[4] && h[5] === h[6]) {
    const s = '#' + h[1] + h[3] + h[5];
    return [...new Set([h, H, s, s.toUpperCase()])];
  }
  return [h, H];
}

function extractTokenMap(css) {
  const map = new Map();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*(#([0-9a-fA-F]{6}|[0-9a-fA-F]{3}|[0-9a-fA-F]{8}))\b/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const varName = m[1];
    if (!varName.startsWith('--color-') && !varName.startsWith('--cyber-')) continue;
    const norm = normalizeHex(m[2]);
    for (const variant of buildHexVariants(norm)) {
      if (!map.has(variant)) map.set(variant, `var(${varName}, ${norm})`);
    }
  }
  return map;
}

function hexDistance(h1, h2) {
  const p = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = p(h1), [r2,g2,b2] = p(h2);
  return Math.abs(r1-r2)+Math.abs(g1-g2)+Math.abs(b1-b2);
}

function findNearest(hex, existingEntries) {
  let best = null, bestD = Infinity;
  for (const [eHex, eVar] of existingEntries) {
    if (!eVar.startsWith('var(--color-')) continue;
    const d = hexDistance(hex, eHex);
    if (d < bestD) { bestD = d; best = eVar; }
  }
  return bestD < 90 ? best : null;
}

const NEW_FALLBACK_TOKENS = [
  { name: '--color-fallback-dark-bg', hex: '#0a0a0a', desc: '深色背景通用' },
  { name: '--color-fallback-panel-bg', hex: '#1a1a2e', desc: '深色面板背景' },
  { name: '--color-fallback-ant-blue', hex: '#1890ff', desc: 'Ant Design 蓝' },
  { name: '--color-fallback-ant-purple', hex: '#722ed1', desc: 'Ant Design 紫' },
  { name: '--color-fallback-ant-green', hex: '#52c41a', desc: 'Ant Design 绿' },
  { name: '--color-fallback-accent-pink', hex: '#ec4899', desc: '粉色强调色' },
  { name: '--color-fallback-neutral-grey', hex: '#666666', desc: '中性灰' },
  { name: '--color-fallback-border-light', hex: '#dddddd', desc: '极浅边框' },
  { name: '--color-fallback-midnight', hex: '#0f172a', desc: '深夜蓝灰' },
];

function buildFullMap(cssContent, phase2Data) {
  const existingMap = extractTokenMap(cssContent);
  console.error('[sweep] existing color vars mapped:', existingMap.size, 'variants');

  const cyberWhite = existingMap.get('#ffffff') || 'var(--color-surface, #ffffff)';
  const cyberBlack = existingMap.get('#000000') || 'var(--color-text-primary, #1e293b)';

  const allHexes = new Set();
  for (const c of phase2Data.by_color) allHexes.add(c.hex);

  const existingAsHex = [...existingMap.entries()].filter(([, v]) => v.startsWith('var(--color-')).map(([k, v]) => {
    const m = /, (#[0-9a-f]{6})\)$/.exec(v);
    return m ? [normalizeHex(m[1]), v] : [normalizeHex(k), v];
  });

  const fullMap = new Map(existingMap);

  for (const hex6 of allHexes) {
    if (fullMap.has(hex6)) continue;
    if (hex6 === '#ffffff') { fullMap.set(hex6, cyberWhite); continue; }
    if (hex6 === '#000000') { fullMap.set(hex6, cyberBlack); continue; }
    const near = findNearest(hex6, existingAsHex);
    if (near) {
      for (const v of buildHexVariants(hex6)) fullMap.set(v, near);
      continue;
    }
    const r = parseInt(hex6.slice(1,3),16), g = parseInt(hex6.slice(3,5),16), b = parseInt(hex6.slice(5,7),16);
    let bestFb = null, bestFd = Infinity;
    for (const fb of NEW_FALLBACK_TOKENS) {
      const d = hexDistance(hex6, fb.hex);
      if (d < bestFd) { bestFd = d; bestFb = fb; }
    }
    const fallback = bestFb
      ? `var(${bestFb.name}, ${hex6})`
      : `var(--color-text-muted, ${hex6})`;
    for (const v of buildHexVariants(hex6)) fullMap.set(v, fallback);
  }

  for (const fb of NEW_FALLBACK_TOKENS) {
    for (const v of buildHexVariants(fb.hex)) {
      if (!fullMap.has(v)) fullMap.set(v, `var(${fb.name}, ${fb.hex})`);
    }
  }
  return fullMap;
}

function appendFallbackTokens(css) {
  const MARK = '/* [V232-P2 FALLBACK] */';
  if (css.includes(MARK)) {
    console.error('[append-fallback] block already exists, skip');
    return css;
  }
  let block = `\n\n${MARK}\n`;
  for (const fb of NEW_FALLBACK_TOKENS) {
    block += `  ${fb.name}: ${fb.hex};  /* ${fb.desc} */\n`;
  }
  const lastBrace = css.lastIndexOf('}');
  return css.slice(0, lastBrace) + block + '\n' + css.slice(lastBrace);
}

function stripComments(src) {
  const buf = [];
  let state = 'code';
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i], nx = src[i + 1];
    if (state === 'code') {
      if (!quote && (ch === '"' || ch === "'" || ch === '`')) { quote = ch; buf.push(ch); continue; }
      if (quote && ch === quote && src[i-1] !== '\\') { quote = null; buf.push(ch); continue; }
      if (!quote && ch === '/' && nx === '*') { state = 'block-comment'; buf.push('ⲬⲬ'); i++; continue; }
      if (!quote && ch === '/' && nx === '/') { state = 'line-comment'; buf.push('ⲬⲬ'); i++; continue; }
      buf.push(ch);
    } else if (state === 'block-comment') {
      if (ch === '*' && nx === '/') { state = 'code'; buf.push('ⲬⲬ'); i++; }
      else if (ch === '\n') buf.push('\n');
      else buf.push('Ⲭ');
    } else if (state === 'line-comment') {
      if (ch === '\n') { state = 'code'; buf.push('\n'); }
      else buf.push('Ⲭ');
    }
  }
  return buf.join('');
}

function aggressiveReplace(src, colorMap) {
  let changes = 0;
  const shadow = stripComments(src);
  const len = src.length;
  const out = [];
  const HEX_RE = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
  const NAMED_RE = /\b(white|black)\b/gi;
  let last = 0;
  let m;

  HEX_RE.lastIndex = 0;
  const hexMatches = [];
  while ((m = HEX_RE.exec(shadow)) !== null) {
    const idx = m.index;
    const before = shadow.slice(Math.max(0, idx - 20), idx);
    if (before.includes('var(--') || before.includes('url(')) continue;
    hexMatches.push({ idx, len: m[0].length, raw: m[0] });
  }

  while ((m = NAMED_RE.exec(shadow)) !== null) {
    const idx = m.index;
    const around = shadow.slice(Math.max(0, idx - 50), Math.min(len, idx + m[0].length + 50));
    if (/var\(--/.test(shadow.slice(Math.max(0, idx - 20), idx))) continue;
    hexMatches.push({ idx, len: m[0].length, raw: m[0], named: true });
  }

  hexMatches.sort((a, b) => a.idx - b.idx);

  for (const h of hexMatches) {
    if (h.idx < last) continue;
    out.push(src.slice(last, h.idx));
    const raw = src.substr(h.idx, h.len);
    let repl = null;
    if (h.named) {
      const low = raw.toLowerCase();
      if (low === 'white') repl = colorMap.get('#ffffff') || raw;
      else if (low === 'black') repl = colorMap.get('#000000') || raw;
    } else {
      repl = colorMap.get(raw.toLowerCase()) || colorMap.get(normalizeHex(raw)) || null;
    }
    if (repl && repl !== raw) {
      out.push(repl);
      changes++;
    } else {
      out.push(raw);
    }
    last = h.idx + h.len;
  }
  out.push(src.slice(last));
  return { result: out.join(''), changes };
}

function main() {
  let css = fs.readFileSync(TOKENS_CSS, 'utf8');
  const phase2Data = JSON.parse(fs.readFileSync(PHASE2_JSON, 'utf8'));

  css = appendFallbackTokens(css);
  const fullMap = buildFullMap(css, phase2Data);
  console.error('[sweep] total mapped variants:', fullMap.size);

  if (apply) fs.writeFileSync(TOKENS_CSS, css, 'utf8');
  else console.error('[dry-run] will append', NEW_FALLBACK_TOKENS.length, 'fallback tokens to generated-tokens.css');

  const files = [];
  for (const t of TARGET_DIRS) walkDir(t, files);

  let totalFiles = 0, totalChanges = 0;
  for (const fp of files) {
    const src = fs.readFileSync(fp, 'utf8');
    const { result, changes } = aggressiveReplace(src, fullMap);
    if (changes > 0) {
      totalFiles++;
      totalChanges += changes;
      if (apply) fs.writeFileSync(fp, result, 'utf8');
    }
  }

  console.error('--------------------------------------------------------');
  console.error(` Phase 3 Sweep ${apply ? 'APPLIED' : '(dry-run)'}:`);
  console.error(`   Files touched : ${totalFiles}/${files.length}`);
  console.error(`   Total changes : ${totalChanges}`);
  console.error(`   Mode          : ${apply ? 'WROTE DISK' : 'DRY RUN (add --apply)'}`);
}

main();
