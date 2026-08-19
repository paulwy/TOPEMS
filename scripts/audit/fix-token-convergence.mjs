#!/usr/bin/env node
/**
 * V220 Design Token Convergence: 616 → 0
 *
 * Comprehensive batch replacement for remaining token deviations.
 * Handles patterns missed by previous scripts:
 * - rgba in boxShadow strings (sx props, style objects)
 * - rgba in border strings
 * - rgba as standalone color values
 * - hex colors in arrays, gradients, style objects
 * - box-shadow strings → designTokens.shadows
 * - px-spacing → designTokens.spacing
 *
 * All replacements use designTokens. prefix and ensure imports.
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');
const WEB_SRC = path.resolve('apps/web/src');
const SKIP_RE =
  /\/(node_modules|dist|build|__tests__|\.stories\.|theme\/tokens|theme\/generated|theme\/gradients|theme\/presets|theme\/theme\.|design-system\/tokens)\//;

// ─── Color Maps ───

const RGBA_MAP = {
  // Black alpha
  'rgba(0,0,0,0.04)': 'designTokens.colors.action.hover',
  'rgba(0, 0, 0, 0.04)': 'designTokens.colors.action.hover',
  'rgba(0,0,0,0.05)': 'designTokens.colors.action.hover',
  'rgba(0, 0, 0, 0.05)': 'designTokens.colors.action.hover',
  'rgba(0,0,0,0.06)': 'designTokens.colors.action.hover',
  'rgba(0, 0, 0, 0.06)': 'designTokens.colors.action.hover',
  'rgba(0,0,0,0.08)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.08)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.1)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.1)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.12)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.12)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.15)': 'designTokens.colors.action.selected',
  'rgba(0, 0, 0, 0.15)': 'designTokens.colors.action.selected',
  'rgba(0,0,0,0.2)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.2)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.25)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.25)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.3)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.3)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.38)': 'designTokens.colors.text.disabled',
  'rgba(0, 0, 0, 0.38)': 'designTokens.colors.text.disabled',
  'rgba(0,0,0,0.4)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.4)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.5)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.5)': 'designTokens.glass.divider',
  'rgba(0,0,0,0.55)': 'designTokens.glass.bottomShadow',
  'rgba(0, 0, 0, 0.55)': 'designTokens.glass.bottomShadow',
  'rgba(0,0,0,0.6)': 'designTokens.glass.bottomShadow',
  'rgba(0, 0, 0, 0.6)': 'designTokens.glass.bottomShadow',
  'rgba(0,0,0,0.7)': 'designTokens.glass.bottomShadow',
  'rgba(0, 0, 0, 0.7)': 'designTokens.glass.bottomShadow',
  'rgba(0,0,0,0.87)': 'designTokens.colors.text.primary',
  'rgba(0, 0, 0, 0.87)': 'designTokens.colors.text.primary',
  'rgba(0,0,0,0.9)': 'designTokens.colors.text.primary',
  'rgba(0, 0, 0, 0.9)': 'designTokens.colors.text.primary',
  // White alpha
  'rgba(255,255,255,0.04)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.04)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.05)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.05)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.06)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.06)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.08)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.08)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.1)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.1)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.2)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.2)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.7)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.7)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.8)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.8)': 'designTokens.glass.topLight',
  // Blue (59,130,246 = #3b82f6 = primary.main)
  'rgba(59, 130, 246, 0.08)': 'designTokens.glass.line',
  'rgba(59, 130, 246, 0.1)': 'designTokens.glass.line',
  'rgba(59, 130, 246, 0.2)': 'designTokens.glass.lineHeavy',
  'rgba(59, 130, 246, 0.25)': 'designTokens.glass.lineHeavy',
  'rgba(59, 130, 246, 0.3)': 'designTokens.glass.lineHeavy',
  'rgba(59,130,246,0.2)': 'designTokens.glass.lineHeavy',
  'rgba(59,130,246,0.03)': 'designTokens.colors.primary[50]',
  'rgba(59,130,246,0.1)': 'designTokens.colors.primary[100]',
  // Indigo (99,102,241)
  'rgba(99, 102, 241, 0.2)': 'designTokens.colors.indigo[200]',
  'rgba(99, 102, 241, 0.3)': 'designTokens.colors.indigo[200]',
  'rgba(99, 102, 241, 0.4)': 'designTokens.colors.indigo[300]',
  'rgba(99,102,241,0.4)': 'designTokens.colors.indigo[300]',
  'rgba(99,102,241,0.2)': 'designTokens.colors.indigo[200]',
  // Purple (139,92,246 = #8b5cf6 = secondary[500])
  'rgba(139, 92, 246, 0.2)': 'designTokens.colors.secondary[300]',
  'rgba(139, 92, 246, 0.4)': 'designTokens.colors.secondary[400]',
  'rgba(139,92,246,0.2)': 'designTokens.colors.secondary[300]',
  'rgba(139,92,246,0.4)': 'designTokens.colors.secondary[400]',
  // Green (16,185,129 = success)
  'rgba(16, 185, 129, 0.1)': 'designTokens.colors.success[100]',
  'rgba(16, 185, 129, 0.2)': 'designTokens.colors.success[200]',
  'rgba(16,185,129,0.1)': 'designTokens.colors.success[100]',
  'rgba(16,185,129,0.2)': 'designTokens.colors.success[200]',
  // Red (239,68,68 = error)
  'rgba(239, 68, 68, 0.1)': 'designTokens.colors.error[100]',
  'rgba(239,68,68,0.1)': 'designTokens.colors.error[100]',
  // Purple glow (124,58,237)
  'rgba(124, 58, 237, 0.4)': 'designTokens.colors.secondary[600]',
  'rgba(124,58,237,0.4)': 'designTokens.colors.secondary[600]',
  // Emerald glow (5,150,105)
  'rgba(5, 150, 105, 0.4)': 'designTokens.colors.success[600]',
  'rgba(5,150,105,0.4)': 'designTokens.colors.success[600]',
  // Red glow (220,38,38)
  'rgba(220, 38, 38, 0.4)': 'designTokens.colors.error[600]',
  'rgba(220,38,38,0.4)': 'designTokens.colors.error[600]',
  // Sky glow (14,165,233)
  'rgba(14, 165, 233, 0.4)': 'designTokens.colors.info[500]',
  'rgba(14,165,233,0.4)': 'designTokens.colors.info[500]',
  // Amber glow (245,158,11)
  'rgba(245, 158, 11, 0.4)': 'designTokens.colors.warning[500]',
  'rgba(245,158,11,0.4)': 'designTokens.colors.warning[500]',
  // Orange glow (249,115,22)
  'rgba(249, 115, 22, 0.4)': 'designTokens.colors.warning[600]',
  'rgba(249,115,22,0.4)': 'designTokens.colors.warning[600]',
  // Teal glow (15,118,110)
  'rgba(15, 118, 110, 0.4)': 'designTokens.colors.teal[600]',
  'rgba(15,118,110,0.4)': 'designTokens.colors.teal[600]',
  // Cyan glow (6,182,212)
  'rgba(6, 182, 212, 0.4)': 'designTokens.colors.cyan[500]',
  'rgba(6,182,212,0.4)': 'designTokens.colors.cyan[500]',
  // Cyan (8,145,178)
  'rgba(8, 145, 178, 0.4)': 'designTokens.colors.cyan[600]',
  'rgba(8,145,178,0.4)': 'designTokens.colors.cyan[600]',
};

const HEX_MAP = {
  '#ffffff': 'designTokens.colors.common.white',
  '#FFFFFF': 'designTokens.colors.common.white',
  '#fff': 'designTokens.colors.common.white',
  '#FFF': 'designTokens.colors.common.white',
  '#000000': 'designTokens.colors.common.black',
  '#000': 'designTokens.colors.common.black',
  '#3b82f6': 'designTokens.colors.primary.main',
  '#3B82F6': 'designTokens.colors.primary.main',
  '#2563eb': 'designTokens.colors.primary[600]',
  '#60a5fa': 'designTokens.colors.primary[400]',
  '#1d4ed8': 'designTokens.colors.primary[700]',
  '#eff6ff': 'designTokens.colors.primary[50]',
  '#dbeafe': 'designTokens.colors.primary[100]',
  '#8b5cf6': 'designTokens.colors.secondary[500]',
  '#7c3aed': 'designTokens.colors.secondary[600]',
  '#a78bfa': 'designTokens.colors.secondary[400]',
  '#6d28d9': 'designTokens.colors.secondary[700]',
  '#d946ef': 'designTokens.colors.pink[500]',
  '#f43f5e': 'designTokens.colors.error[500]',
  '#ef4444': 'designTokens.colors.error[500]',
  '#dc2626': 'designTokens.colors.error[600]',
  '#fca5a5': 'designTokens.colors.error[300]',
  '#22c55e': 'designTokens.colors.success[500]',
  '#16a34a': 'designTokens.colors.success[600]',
  '#86efac': 'designTokens.colors.success[300]',
  '#047857': 'designTokens.colors.success[700]',
  '#0f766e': 'designTokens.colors.teal[700]',
  '#10b981': 'designTokens.colors.success[500]',
  '#059669': 'designTokens.colors.success[600]',
  '#f59e0b': 'designTokens.colors.warning[500]',
  '#d97706': 'designTokens.colors.warning[600]',
  '#ef6c00': 'designTokens.colors.warning[700]',
  '#ed6c02': 'designTokens.colors.warning[500]',
  '#fef3c7': 'designTokens.colors.warning[100]',
  '#0ea5e9': 'designTokens.colors.info[500]',
  '#0284c7': 'designTokens.colors.info[600]',
  '#0288d1': 'designTokens.colors.info[600]',
  '#38bdf8': 'designTokens.colors.info[400]',
  '#155e75': 'designTokens.colors.cyan[800]',
  '#0e7490': 'designTokens.colors.cyan[700]',
  '#06b6d4': 'designTokens.colors.cyan[500]',
  '#111827': 'designTokens.colors.grey[900]',
  '#1f2937': 'designTokens.colors.grey[800]',
  '#374151': 'designTokens.colors.grey[700]',
  '#64748b': 'designTokens.colors.grey[500]',
  '#9ca3af': 'designTokens.colors.grey[400]',
  '#cbd5e1': 'designTokens.colors.grey[300]',
  '#f5f5f5': 'designTokens.colors.grey[100]',
  '#ddd': 'designTokens.colors.grey[300]',
  '#f9fafb': 'designTokens.colors.grey[50]',
  '#e5e7eb': 'designTokens.colors.grey[200]',
  '#fff3e0': 'designTokens.colors.warning[50]',
  '#ffebee': 'designTokens.colors.error[50]',
  '#ffedd5': 'designTokens.colors.warning[100]',
  '#eef2ff': 'designTokens.colors.indigo[50]',
  '#e0e7ff': 'designTokens.colors.indigo[100]',
  '#e1f5fe': 'designTokens.colors.info[50]',
  '#ca8a04': 'designTokens.colors.warning[600]',
  '#eab308': 'designTokens.colors.warning[500]',
  '#b91c1c': 'designTokens.colors.error[700]',
  '#c2410c': 'designTokens.colors.warning[700]',
  '#b45309': 'designTokens.colors.warning[700]',
  '#84CC16': 'designTokens.colors.lime[500]',
  '#2196f3': 'designTokens.colors.primary[500]',
  '#166534': 'designTokens.colors.success[800]',
  '#a7f3d0': 'designTokens.colors.success[200]',
  '#fffbeb': 'designTokens.colors.warning[50]',
  '#ff3e00': 'designTokens.colors.error[600]',
  '#dd0031': 'designTokens.colors.error[700]',
  '#7b1fa2': 'designTokens.colors.secondary[700]',
};

const SHADOW_MAP = {
  '0 1px 2px 0 rgba(0,0,0,0.03)': 'designTokens.shadows.xs',
  '0 1px 3px 0 rgba(0,0,0,0.1)': 'designTokens.shadows.sm',
  '0 1px 3px rgba(0, 0, 0, 0.05)': 'designTokens.shadows.sm',
  '0 4px 6px -1px rgba(0,0,0,0.1)': 'designTokens.shadows.md',
  '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.02)': 'designTokens.shadows.md',
  '0 10px 15px -3px rgba(0,0,0,0.1)': 'designTokens.shadows.lg',
  '0 10px 15px -3px rgba(0,0,0,0.05)': 'designTokens.shadows.lg',
  '0 20px 25px -5px rgba(0,0,0,0.1)': 'designTokens.shadows.xl',
  '0 25px 50px -12px rgba(0,0,0,0.25)': "designTokens.shadows['2xl']",
  '0 20px 60px rgba(0,0,0,0.3)': 'designTokens.darkShadows.xl',
  '0 24px 80px rgba(0,0,0,0.4)': "designTokens.darkShadows['3xl']",
  '0 2px 8px rgba(0,0,0,0.1)': 'designTokens.shadows.sm',
  '0 2px 8px rgba(0,0,0,0.15)': 'designTokens.shadows.sm',
  '0 0 0 2px rgba(0,0,0,0.1)': 'designTokens.shadows.xs',
  '0 8px 25px rgba(0, 0, 0, 0.15)': 'designTokens.shadows.lg',
  '0 4px 15px rgba(0, 0, 0, 0.1)': 'designTokens.shadows.md',
  '0 1px 2px rgba(0,0,0,0.1)': 'designTokens.shadows.xs',
  'inset 0 2px 4px rgba(0, 0, 0, 0.2)': "designTokens.shadows['inset']",
  '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.1)': 'designTokens.shadows.xl',
};

const SPACING_MAP = {
  '2px': 'designTokens.spacing.xs',
  '4px': 'designTokens.spacing.xs',
  '6px': 'designTokens.spacing.sm',
  '8px': 'designTokens.spacing.sm',
  '12px': 'designTokens.spacing.md',
  '16px': 'designTokens.spacing.md',
  '20px': 'designTokens.spacing.lg',
  '24px': 'designTokens.spacing.lg',
  '32px': 'designTokens.spacing.xl',
  '40px': 'designTokens.spacing.xxl',
  '48px': 'designTokens.spacing.xxl',
};

let totalReplaced = 0,
  filesFixed = 0;

function getLastImport(lines) {
  let last = -1,
    inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('import ')) {
      last = i;
      if (t.includes('{') && !t.includes('}')) inBlock = true;
      else if (t.endsWith(';')) inBlock = false;
    } else if (inBlock) {
      if (t.endsWith(';')) {
        last = i;
        inBlock = false;
      }
    } else if (last >= 0 && !t.startsWith('import') && t !== '') break;
  }
  return last;
}

function ensureImport(lines) {
  const hasDesignTokens = lines.some((l) => /import\s+\{[^}]*designTokens/.test(l) || /import\s+designTokens/.test(l));
  const usesDesignTokens = lines.some((l) => /designTokens\./.test(l) && !/import/.test(l));
  if (usesDesignTokens && !hasDesignTokens) {
    const last = getLastImport(lines);
    if (last >= 0) {
      lines.splice(last + 1, 0, "import { designTokens } from '@topems/tokens';");
      return true;
    }
  }
  return false;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false,
    count = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;
    if (
      !line.includes('#') &&
      !line.includes('rgba') &&
      !line.includes('rgb(') &&
      !line.includes('px') &&
      !line.includes('boxShadow')
    )
      continue;

    let newLine = line;

    // 1. Replace exact boxShadow strings
    for (const [shadow, token] of Object.entries(SHADOW_MAP)) {
      const patterns = [
        new RegExp(`boxShadow:\\s*'${shadow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
        new RegExp(`boxShadow:\\s*"${shadow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
      ];
      for (const re of patterns) {
        if (re.test(newLine)) {
          newLine = newLine.replace(re, `boxShadow: ${token}`);
          count++;
          modified = true;
          if (verbose) console.log(`  [shadow] ${path.relative(WEB_SRC, filePath)}:${i + 1}`);
        }
      }
    }

    // 2. Replace rgba in quoted strings (both single and double quotes)
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const escaped = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // In single quotes
      const re1 = new RegExp(`'${escaped}'`, 'g');
      if (re1.test(newLine)) {
        newLine = newLine.replace(re1, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [rgba-sq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${rgba}`);
      }
      // In double quotes
      const re2 = new RegExp(`"${escaped}"`, 'g');
      if (re2.test(newLine)) {
        newLine = newLine.replace(re2, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [rgba-dq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${rgba}`);
      }
    }

    // 3. Replace hex colors in quoted strings
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const escaped = hex.replace('#', '\\#');
      // In single quotes
      const re1 = new RegExp(`'${escaped}'`, 'g');
      if (re1.test(newLine)) {
        newLine = newLine.replace(re1, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [hex-sq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
      }
      // In double quotes
      const re2 = new RegExp(`"${escaped}"`, 'g');
      if (re2.test(newLine)) {
        newLine = newLine.replace(re2, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [hex-dq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
      }
    }

    // 4. Replace hex colors in template literals (only if line has backtick and designTokens)
    if (newLine.includes('`') && (newLine.includes('designTokens') || newLine.includes('${'))) {
      for (const [hex, token] of Object.entries(HEX_MAP)) {
        const escaped = hex.replace('#', '\\#');
        const re = new RegExp(`(?<!\\$\\{[^}]*|['"])${escaped}(?![\\w-])`, 'g');
        if (re.test(newLine)) {
          newLine = newLine.replace(re, `\${${token}}`);
          count++;
          modified = true;
          if (verbose) console.log(`  [hex-tmpl] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
        }
      }
    }

    // 5. Replace rgba in border strings: '1px solid rgba(...)'
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const escaped = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // border: '1px solid rgba(...)'
      const re1 = new RegExp(`(border[BottomTopLeftRight]*:\\s*['"][^'"]*)${escaped}([^'"]*['"])`, 'g');
      if (re1.test(newLine)) {
        newLine = newLine.replace(re1, `$1\${${token}}$2`);
        count++;
        modified = true;
        if (verbose) console.log(`  [border-rgba] ${path.relative(WEB_SRC, filePath)}:${i + 1}`);
      }
      // Just the rgba in any string context: '...rgba(...)...'
      const re2 = new RegExp(`(['"][^'"]*)${escaped}([^'"]*['"])`, 'g');
      if (re2.test(newLine) && !newLine.includes(`designTokens`)) {
        // Only replace if the whole string is just the rgba value (already handled above)
        // Skip complex strings with multiple parts
      }
    }

    // 6. Replace standalone hex in template literal gradients
    // e.g., linear-gradient(135deg, #047857 0%, ...)
    if (newLine.includes('linear-gradient') || newLine.includes('radial-gradient')) {
      for (const [hex, token] of Object.entries(HEX_MAP)) {
        const escaped = hex.replace('#', '\\#');
        const re = new RegExp(escaped, 'g');
        if (re.test(newLine) && !newLine.includes(`designTokens.${token.split('.')[1]}`)) {
          // Replace hex in gradient with ${token} if inside template literal
          if (newLine.includes('`')) {
            newLine = newLine.replace(re, `\${${token}}`);
            count++;
            modified = true;
            if (verbose) console.log(`  [gradient-hex] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
          }
        }
      }
    }

    // 7. Replace px-spacing in spacing properties
    for (const [px, token] of Object.entries(SPACING_MAP)) {
      const escaped = px.replace('px', '\\s*px');
      const props = [
        'padding',
        'margin',
        'gap',
        'p:',
        'm:',
        'px:',
        'py:',
        'mx:',
        'my:',
        'pt:',
        'pb:',
        'pl:',
        'pr:',
        'mt:',
        'mb:',
        'width',
        'height',
      ];
      for (const prop of props) {
        const re = new RegExp(`\\b${prop}\\s*:?\\s*'?${escaped}'?`, 'g');
        if (re.test(newLine) && !newLine.includes('designTokens')) {
          newLine = newLine.replace(re, `${prop.replace(':', '')}: ${token}`);
          count++;
          modified = true;
          if (verbose) console.log(`  [spacing] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${px}`);
        }
      }
    }

    lines[i] = newLine;
  }

  if (modified) {
    const impChanged = ensureImport(lines);
    if (impChanged) count++;
    if (!dryRun) fs.writeFileSync(filePath, lines.join('\n'));
    filesFixed++;
    totalReplaced += count;
  }
  return count;
}

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, cb);
    } else if (
      (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
      !e.name.includes('.test.') &&
      !e.name.includes('.stories.')
    ) {
      if (!SKIP_RE.test(p)) cb(p);
    }
  }
}

console.log(`\n=== V220 Design Token Convergence ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

walk(WEB_SRC, (f) => {
  try {
    const c = processFile(f);
    if (c > 0 && verbose) console.log(`  ${path.relative(WEB_SRC, f)}: ${c} replacements`);
  } catch (e) {
    console.error(`  ERR: ${f}: ${e.message}`);
  }
});

console.log(`\nFiles: ${filesFixed}, Replacements: ${totalReplaced}, Mode: ${dryRun ? 'DRY' : 'WRITE'}`);
