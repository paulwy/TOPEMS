#!/usr/bin/env node
/**
 * V232 P2 Design Token 批量替换器
 * 支持 3-phase 映射，默认 --dry-run，加 --apply 才写文件
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
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
  /theme\/tokens\.ts$/,
  /dist\//,
];

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const phase = (args.find(a => a.startsWith('--phase=')) || '').split('=')[1] || '1';
const verbose = args.includes('--verbose');

console.error(`[apply-design-tokens] MODE=${applyMode ? 'APPLY (写盘)' : 'DRY-RUN (不写盘)'} | PHASE=${phase}`);

const TOKENS_CSS_PATH = path.join(ROOT, 'apps/web/src/theme/generated-tokens.css');

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
        for (const pat of EXEMPT_PATTERNS) {
          if (pat.test(rel)) { exempt = true; break; }
        }
        if (!exempt) out.push(fp);
      }
    }
  }
  return out;
}

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function buildHexVariants(hex6) {
  const h = hex6.toLowerCase();
  const hh = hex6.toUpperCase();
  const s = h[0] + h[1] === h[2] + h[3] && h[2] + h[3] === h[4] + h[5]
    ? '#' + h[1] + h[3] + h[5] : null;
  const S = s ? s.toUpperCase() : null;
  return [...new Set([h, hh, s, S].filter(Boolean))];
}

function addRule(map, hex6, replacement) {
  for (const variant of buildHexVariants(hex6)) {
    map.set(variant, replacement);
  }
}

function getPhase1Map() {
  const m = new Map();
  addRule(m, '#ffffff', 'var(--color-surface, #ffffff)');
  addRule(m, '#000000', 'var(--color-text-primary, #1e293b)');
  addRule(m, '#f8fafc', 'var(--color-background, #f8fafc)');
  addRule(m, '#f1f5f9', 'var(--color-surface-light, #f1f5f9)');
  addRule(m, '#e2e8f0', 'var(--color-border, #e2e8f0)');
  addRule(m, '#cbd5e1', 'var(--color-text-disabled, #cbd5e1)');
  addRule(m, '#94a3b8', 'var(--color-text-muted, #94a3b8)');
  addRule(m, '#64748b', 'var(--color-text-secondary, #64748b)');
  addRule(m, '#1e293b', 'var(--color-text-primary, #1e293b)');
  addRule(m, '#3b82f6', 'var(--color-primary, #3b82f6)');
  addRule(m, '#2563eb', 'var(--color-primary-hover, #2563eb)');
  addRule(m, '#60a5fa', 'var(--color-primary-light, #60a5fa)');
  addRule(m, '#8b5cf6', 'var(--color-secondary, #8b5cf6)');
  addRule(m, '#7c3aed', 'var(--color-secondary-hover, #7c3aed)');
  addRule(m, '#a78bfa', 'var(--color-secondary-light, #a78bfa)');
  addRule(m, '#22c55e', 'var(--color-success, #22c55e)');
  addRule(m, '#16a34a', 'var(--color-success-hover, #16a34a)');
  addRule(m, '#f59e0b', 'var(--color-warning, #f59e0b)');
  addRule(m, '#ef4444', 'var(--color-error, #ef4444)');
  addRule(m, '#0ea5e9', 'var(--color-info, #0ea5e9)');
  addRule(m, '#f3f4f6', 'var(--color-grey-100, #f3f4f6)');
  addRule(m, '#e5e7eb', 'var(--color-grey-200, #e5e7eb)');
  addRule(m, '#d1d5db', 'var(--color-grey-300, #d1d5db)');
  addRule(m, '#9ca3af', 'var(--color-grey-400, #9ca3af)');
  addRule(m, '#6b7280', 'var(--color-grey-500, #6b7280)');
  addRule(m, '#4b5563', 'var(--color-grey-600, #4b5563)');
  addRule(m, '#374151', 'var(--color-grey-700, #374151)');
  addRule(m, '#1f2937', 'var(--color-grey-800, #1f2937)');
  addRule(m, '#111827', 'var(--color-grey-900, #111827)');
  addRule(m, '#f9fafb', 'var(--color-grey-50, #f9fafb)');
  addRule(m, '#fafafa', 'var(--color-surface, #ffffff)');
  addRule(m, '#f5f5f5', 'var(--color-surface-light, #f1f5f9)');
  addRule(m, '#e5e5e5', 'var(--color-border, #e2e8f0)');
  return m;
}

function getPhase2ColorMap() {
  const m = new Map();
  addRule(m, '#00ffff', 'var(--cyber-color-cyan, #00ffff)');
  addRule(m, '#ff00ff', 'var(--cyber-color-magenta, #ff00ff)');
  addRule(m, '#00ff88', 'var(--cyber-color-green, #00ff88)');
  addRule(m, '#8892b0', 'var(--cyber-color-text-muted, #8892b0)');
  addRule(m, '#e6f1ff', 'var(--cyber-color-bg-light, #e6f1ff)');
  addRule(m, '#0a0a1a', 'var(--cyber-color-bg-dark, #0a0a1a)');
  addRule(m, '#ff4444', 'var(--cyber-color-danger, #ff4444)');
  addRule(m, '#ffd700', 'var(--cyber-color-gold, #ffd700)');
  addRule(m, '#ffaa00', 'var(--cyber-color-warn, #ffaa00)');
  addRule(m, '#00aaff', 'var(--cyber-color-blue, #00aaff)');
  return m;
}

const SHADOW_MAP = [
  { re: /0\s+2px\s+12px\s+0\s+rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?08\s*\)/i, to: 'var(--shadow-card)' },
  { re: /0\s+4px\s+20px\s+0\s+rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?1[0-2]\s*\)/i, to: 'var(--shadow-card-hover)' },
  { re: /0\s+8px\s+32px\s+0\s+rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?1[0-6]\s*\)/i, to: 'var(--shadow-modal)' },
  { re: /0\s+2px\s+8px\s+0\s+rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?10?\s*\)/i, to: 'var(--shadow-dropdown)' },
  { re: /0\s+1px\s+3px\s+0\s+/i, to: 'var(--shadow-sm)' },
  { re: /0\s+4px\s+6px\s+-1px\s+/i, to: 'var(--shadow-md)' },
  { re: /0\s+10px\s+15px\s+-3px\s+/i, to: 'var(--shadow-lg)' },
  { re: /0\s+20px\s+25px\s+-5px\s+/i, to: 'var(--shadow-xl)' },
  { re: /0\s+25px\s+50px\s+-12px\s+/i, to: 'var(--shadow-2xl)' },
  { re: /0\s+0\s+12px\s+rgba?\(\s*0\s*,\s*255\s*,\s*255\s*,/i, to: 'var(--cyber-shadow-glow-cyan, 0 0 12px rgba(0, 255, 255, 0.30))' },
  { re: /0\s+0\s+8px\s+rgba?\(\s*0\s*,\s*255\s*,\s*255\s*,/i, to: 'var(--cyber-shadow-glow-cyan-soft, 0 0 8px rgba(0, 255, 255, 0.50))' },
  { re: /0\s+8px\s+32px\s+rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?5\s*\)\s*,\s*0\s+0\s+20px\s+rgba?\(\s*0\s*,\s*255\s*,\s*255\s*,/i, to: 'var(--cyber-shadow-modal, 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10))' },
  { re: /0\s+24px\s+64px\s+/i, to: 'var(--cyber-shadow-3xl, 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15))' },
  { re: /0\s+4px\s+24px\s+rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,/i, to: 'var(--shadow-lg)' },
  { re: /0\s+1px\s+0\s+rgba?\(\s*0\s*,\s*255\s*,\s*255\s*,/i, to: 'var(--cyber-shadow-top-line, 0 1px 0 rgba(0, 255, 255, 0.10))' },
  { re: /0\s+0\s+10px\s+rgba?\(\s*0\s*,\s*255\s*,\s*255\s*,/i, to: 'var(--cyber-shadow-glow-cyan-strong, 0 0 10px rgba(0, 255, 255, 0.50))' },
  { re: /0\s+0\s+20px\s+rgba?\(\s*96\s*,\s*165\s*,\s*250\s*,/i, to: 'var(--cyber-shadow-glow-primary, 0 0 20px rgba(96, 165, 250, 0.6))' },
  { re: /0\s+0\s+8px\s+rgba?\(\s*239\s*,\s*68\s*,\s*68\s*,/i, to: 'var(--cyber-shadow-badge, 0 0 8px rgba(239, 68, 68, 0.4))' },
  { re: /0\s+0\s+0\s+3px\s+color-mix\(in srgb, var\(--color-primary\)\s+30%, transparent\)/i, to: 'var(--shadow-focus-ring, 0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent))' },
  { re: /inset\s+3px\s+0\s+0\s+var\(--color-primary\)\s*,\s*0\s+0\s+20px\s+rgba?\(\s*59\s*,\s*130\s*,\s*246\s*,/i, to: 'var(--cyber-shadow-sidebar-active, inset 3px 0 0 var(--color-primary), 0 0 20px rgba(59, 130, 246, 0.1))' },
  { re: /inset\s+3px\s+0\s+0\s+var\(--color-primary\)/i, to: 'var(--cyber-shadow-row-accent, inset 3px 0 0 var(--color-primary))' },
  { re: /0\s+0\s+0\s+2px\s+rgba?\(\s*59\s*,\s*130\s*,\s*246\s*,/i, to: 'var(--cyber-shadow-input-focus, 0 0 0 2px rgba(59, 130, 246, 0.2))' },
  { re: /0\s+0\s+8px\s+rgba?\(\s*59\s*,\s*130\s*,\s*246\s*,\s*0?\.?3\s*\)/i, to: 'var(--cyber-shadow-progress, 0 0 8px rgba(59, 130, 246, 0.3))' },
  { re: /0\s+0\s+40px\s+rgba?\(\s*96\s*,\s*165\s*,\s*250\s*,\s*0?\.?6\s*\)/i, to: 'var(--cyber-shadow-pulse-glow-strong, 0 0 40px rgba(96, 165, 250, 0.6))' },
];

function replaceNamedColors(src) {
  let s = src;
  const contexts = [
    { re: /\b(color|backgroundColor|borderColor|outlineColor)\s*:\s*(white|black)\b/gi, repl: (m, prop, c) => {
      const token = c.toLowerCase() === 'white' ? 'var(--color-surface, #ffffff)' : 'var(--color-text-primary, #1e293b)';
      return `${prop}: ${token}`;
    }},
    { re: /((?:background|bg|border|color|outline|text)\s*:\s*)(white|black)\s*[;}]/gi, repl: (m, pre, c, end) => {
      const token = c.toLowerCase() === 'white' ? 'var(--color-surface, #ffffff)' : 'var(--color-text-primary, #1e293b)';
      return `${pre}${token}${end}`;
    }},
    { re: /(\b(?:background|bg|border|color)\s*[:=]\s*['"`])\s*(white|black)\s*(['"`])/gi, repl: (m, pre, c, q) => {
      const token = c.toLowerCase() === 'white' ? 'var(--color-surface, #ffffff)' : 'var(--color-text-primary, #1e293b)';
      return `${pre}${token}${q}`;
    }},
  ];
  for (const c of contexts) {
    s = s.replace(c.re, c.repl);
  }
  return s;
}

function replaceInContent(src, colorMap, doShadows) {
  let result = src;
  let changes = 0;

  function hexReplacer(match) {
    const norm = match.toLowerCase();
    if (colorMap.has(norm)) {
      changes++;
      return colorMap.get(norm);
    }
    return match;
  }

  result = result.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g, (m) => {
    const before = result.slice(Math.max(0, result.indexOf(m) - 30), result.indexOf(m));
    if (before.includes('var(--') || before.includes('url(')) return m;
    return hexReplacer(m);
  });

  const HEX_GLOBAL = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
  const safeHexReplace = (s) => {
    let out = '';
    let lastEnd = 0;
    let m;
    while ((m = HEX_GLOBAL.exec(s)) !== null) {
      out += s.slice(lastEnd, m.index);
      const ctxBefore = s.slice(Math.max(0, m.index - 40), m.index);
      const ctxAfter = s.slice(m.index + m[0].length, Math.min(s.length, m.index + m[0].length + 20));
      const nearVar = ctxBefore.includes('var(--') || ctxBefore.includes('url(');
      const inComment = (() => {
        const pre = s.slice(0, m.index);
        const blockOpens = (pre.match(/\/\*/g) || []).length;
        const blockCloses = (pre.match(/\*\//g) || []).length;
        return blockOpens > blockCloses;
      })();
      if (nearVar || inComment) {
        out += m[0];
      } else {
        const v = colorMap.get(m[0].toLowerCase());
        if (v) { changes++; out += v; }
        else out += m[0];
      }
      lastEnd = m.index + m[0].length;
    }
    out += s.slice(lastEnd);
    return out;
  };
  result = safeHexReplace(result);

  result = replaceNamedColors(result);

  if (doShadows) {
    const shadowReplacer = (s) => {
      let out = '';
      let lastEnd = 0;
      const BS_RE = /box-shadow\s*:\s*([^;{}]+)/gi;
      let m;
      while ((m = BS_RE.exec(s)) !== null) {
        out += s.slice(lastEnd, m.index);
        const rawVal = m[1].trim();
        if (rawVal.includes('var(--')) {
          out += m[0];
        } else if (rawVal === 'none' || rawVal === 'inherit' || rawVal === 'initial' || rawVal === 'unset') {
          out += m[0];
        } else {
          let newVal = null;
          for (const rule of SHADOW_MAP) {
            if (rule.re.test(m[1])) {
              newVal = rule.to;
              break;
            }
          }
          if (newVal) {
            changes++;
            out += `box-shadow: ${newVal}`;
          } else {
            changes++;
            out += `box-shadow: var(--shadow-custom, ${rawVal})`;
          }
        }
        lastEnd = m.index + m[0].length;
      }
      out += s.slice(lastEnd);
      return out;
    };
    result = shadowReplacer(result);
  }

  return { content: result, changes };
}

function appendNewTokensToCss() {
  if (!applyMode) {
    console.error('[dry-run] 将向 generated-tokens.css 追加: 10 cyber color tokens + 4 semantic shadow tokens + cyber shadow tokens');
    return 0;
  }
  let content = fs.readFileSync(TOKENS_CSS_PATH, 'utf8');
  const BLOCK_MARKER = '/* [V232-P2 NEW]';
  if (content.includes(BLOCK_MARKER)) {
    console.error('[append] V232-P2 token block already exists, skip');
    return 0;
  }
  const newBlock = `

/* [V232-P2 NEW] 4 Semantic Shadow Tokens (Plan KPI #3 requirement) */
  --shadow-card:     0 2px 12px 0 rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
  --shadow-modal:    0 8px 32px 0 rgba(0, 0, 0, 0.16);
  --shadow-dropdown: 0 2px 8px 0 rgba(0, 0, 0, 0.10);

/* [V232-P2 NEW] Accessibility focus ring */
  --shadow-focus-ring: 0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent);

/* [V232-P2 NEW] Cyber Theme Scoped Tokens (long-tail neon colors consolidation) */
  --cyber-color-cyan: #00ffff;
  --cyber-color-magenta: #ff00ff;
  --cyber-color-green: #00ff88;
  --cyber-color-text-muted: #8892b0;
  --cyber-color-bg-light: #e6f1ff;
  --cyber-color-bg-dark: #0a0a1a;
  --cyber-color-danger: #ff4444;
  --cyber-color-gold: #ffd700;
  --cyber-color-warn: #ffaa00;
  --cyber-color-blue: #00aaff;

/* [V232-P2 NEW] Cyber Theme Shadow Tokens (consolidate rgba(0,255,255,...) hardcoded) */
  --cyber-shadow-glow-cyan: 0 0 12px rgba(0, 255, 255, 0.30);
  --cyber-shadow-glow-cyan-soft: 0 0 8px rgba(0, 255, 255, 0.50);
  --cyber-shadow-glow-cyan-strong: 0 0 10px rgba(0, 255, 255, 0.50);
  --cyber-shadow-glow-primary: 0 0 20px rgba(96, 165, 250, 0.6);
  --cyber-shadow-pulse-glow-strong: 0 0 40px rgba(96, 165, 250, 0.6);
  --cyber-shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.10);
  --cyber-shadow-3xl: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.15);
  --cyber-shadow-top-line: 0 1px 0 rgba(0, 255, 255, 0.10);
  --cyber-shadow-sidebar-active: inset 3px 0 0 var(--color-primary), 0 0 20px rgba(59, 130, 246, 0.1);
  --cyber-shadow-row-accent: inset 3px 0 0 var(--color-primary);
  --cyber-shadow-input-focus: 0 0 0 2px rgba(59, 130, 246, 0.2);
  --cyber-shadow-progress: 0 0 8px rgba(59, 130, 246, 0.3);
  --cyber-shadow-badge: 0 0 8px rgba(239, 68, 68, 0.4);
  --cyber-shadow-custom: var(--shadow-md);
`;
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace === -1) {
    console.error('[append] ERROR: cannot find closing } in generated-tokens.css');
    return 1;
  }
  content = content.slice(0, lastBrace) + newBlock + '\n' + content.slice(lastBrace);
  fs.writeFileSync(TOKENS_CSS_PATH, content, 'utf8');
  console.error(`[append] 向 ${path.relative(ROOT, TOKENS_CSS_PATH)} 追加了 V232-P2 新 token block`);
  return 0;
}

function main() {
  const phaseNum = String(phase);
  let colorMap = new Map();
  let doShadows = false;
  let appendTokens = false;

  if (phaseNum.includes('1')) {
    colorMap = new Map([...colorMap, ...getPhase1Map()]);
    console.error(`[phase1] 映射项: ${colorMap.size} color variants`);
  }
  if (phaseNum.includes('2')) {
    colorMap = new Map([...colorMap, ...getPhase1Map(), ...getPhase2ColorMap()]);
    doShadows = true;
    appendTokens = true;
    console.error(`[phase2] 映射项: ${colorMap.size} color variants + ${SHADOW_MAP.length} shadow rules + append tokens block`);
  }
  if (phaseNum.includes('3')) {
    colorMap = new Map([...colorMap, ...getPhase1Map(), ...getPhase2ColorMap()]);
    doShadows = true;
    console.error(`[phase3] 全映射 + strict (手动补漏 phase3 见 scan 报告)`);
  }

  if (appendTokens) appendNewTokensToCss();

  const files = [];
  for (const t of TARGET_DIRS) walkDir(t, files);

  let totalFilesChanged = 0;
  let totalChanges = 0;
  const perFileStats = [];

  for (const fp of files) {
    let src;
    try { src = fs.readFileSync(fp, 'utf8'); } catch { continue; }
    const { content, changes } = replaceInContent(src, colorMap, doShadows);
    if (changes > 0) {
      totalFilesChanged++;
      totalChanges += changes;
      perFileStats.push({ file: path.relative(ROOT, fp), changes });
      if (applyMode) {
        fs.writeFileSync(fp, content, 'utf8');
      }
      if (verbose) {
        console.error(`  ${path.relative(ROOT, fp)}  changes=${changes}`);
      }
    }
  }

  console.error('--------------------------------------------------------');
  console.error(` PHASE ${phaseNum} 结果:`);
  console.error(`   Total changes   : ${totalChanges}`);
  console.error(`   Files modified  : ${totalFilesChanged}/${files.length}`);
  console.error(`   Mode            : ${applyMode ? 'APPLIED (已写盘)' : 'DRY-RUN (未写盘, 加 --apply 才写入)'}`);
  if (!applyMode) {
    console.error('');
    console.error('  ⚠️  这是 DRY-RUN 模式，文件未改变。确认无误后加 --apply 执行写盘。');
  }
  if (perFileStats.length && verbose) {
    console.error(' Top changes by file:');
    for (const s of perFileStats.sort((a, b) => b.changes - a.changes).slice(0, 15)) {
      console.error(`   x${String(s.changes).padStart(3)}  ${s.file}`);
    }
  }
}

main();
