#!/usr/bin/env node
/**
 * Pass 3: Fix remaining Design Token deviations.
 *
 * Handles hex/rgba colors not covered by pass 1/2, including:
 *   a. Standalone hex in single/double quotes: '#hex' -> token
 *   b. Standalone rgba in single/double quotes: 'rgba(...)' -> token
 *   c. Hex inside border strings: '1px solid #hex' -> `1px solid ${token}`
 *   d. rgba inside border/boxShadow strings
 *   e. Hex inside var() fallbacks: 'var(--xxx, #hex)' -> `var(--xxx, ${token})`
 *   f. rgba inside var() fallbacks
 *   g. Hex inside template literals: #hex -> ${token}
 *   h. rgba inside template literals: rgba(...) -> ${token}
 *   i. boxShadow standalone strings -> token
 *
 * Merges pass 2 maps (with glass paths corrected to cyber.glass/metal/grid)
 * plus new entries specified for pass 3.
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');
const WEB_SRC = path.resolve('apps/web/src');
const SKIP_RE =
  /node_modules|dist|build|__tests__|\.stories\.|theme\/tokens|theme\/generated|theme\/gradients|design-system\/tokens/;

// ── Utility ──────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHex(hex) {
  return hex.replace('#', '\\#');
}

// ── HEX_MAP (pass 2 entries + new pass 3 entries) ────────

const HEX_MAP = {
  // Common
  '#ffffff': 'designTokens.colors.common.white',
  '#FFFFFF': 'designTokens.colors.common.white',
  '#fff': 'designTokens.colors.common.white',
  '#FFF': 'designTokens.colors.common.white',
  '#000000': 'designTokens.colors.common.black',
  '#000': 'designTokens.colors.common.black',
  // Primary
  '#3b82f6': 'designTokens.colors.primary.main',
  '#3B82F6': 'designTokens.colors.primary.main',
  '#2563eb': 'designTokens.colors.primary[600]',
  '#60a5fa': 'designTokens.colors.primary[400]',
  '#1d4ed8': 'designTokens.colors.primary[700]',
  '#1976d2': 'designTokens.colors.primary[700]',
  '#eff6ff': 'designTokens.colors.primary[50]',
  '#dbeafe': 'designTokens.colors.primary[100]',
  '#2196f3': 'designTokens.colors.primary[500]',
  // Secondary
  '#8b5cf6': 'designTokens.colors.secondary[500]',
  '#7c3aed': 'designTokens.colors.secondary[600]',
  '#a78bfa': 'designTokens.colors.secondary[400]',
  '#6d28d9': 'designTokens.colors.secondary[700]',
  '#7b1fa2': 'designTokens.colors.secondary[700]',
  '#e0e7ff': 'designTokens.colors.secondary[50]',
  '#eef2ff': 'designTokens.colors.secondary[50]',
  // Pink / Error
  '#d946ef': 'designTokens.colors.pink[500]',
  '#f43f5e': 'designTokens.colors.error[500]',
  '#F43F5E': 'designTokens.colors.error[500]',
  '#ef4444': 'designTokens.colors.error[500]',
  '#dc2626': 'designTokens.colors.error[600]',
  '#fca5a5': 'designTokens.colors.error[300]',
  '#fecaca': 'designTokens.colors.error[200]',
  '#b91c1c': 'designTokens.colors.error[700]',
  '#ffebee': 'designTokens.colors.error[50]',
  '#ff3e00': 'designTokens.colors.error[600]',
  '#dd0031': 'designTokens.colors.error[700]',
  // Success
  '#22c55e': 'designTokens.colors.success[500]',
  '#16a34a': 'designTokens.colors.success[600]',
  '#86efac': 'designTokens.colors.success[300]',
  '#bbf7d0': 'designTokens.colors.success[200]',
  '#047857': 'designTokens.colors.success[700]',
  '#388e3c': 'designTokens.colors.success[600]',
  '#10b981': 'designTokens.colors.success[500]',
  '#059669': 'designTokens.colors.success[600]',
  '#166534': 'designTokens.colors.success[800]',
  '#a7f3d0': 'designTokens.colors.success[200]',
  // Teal / Cyan
  '#0f766e': 'designTokens.colors.teal[700]',
  '#155e75': 'designTokens.colors.cyan[800]',
  '#0e7490': 'designTokens.colors.cyan[700]',
  '#06b6d4': 'designTokens.colors.cyan[500]',
  // Warning
  '#f59e0b': 'designTokens.colors.warning[500]',
  '#d97706': 'designTokens.colors.warning[600]',
  '#ef6c00': 'designTokens.colors.warning[700]',
  '#ed6c02': 'designTokens.colors.warning[500]',
  '#fef3c7': 'designTokens.colors.warning[100]',
  '#fff3e0': 'designTokens.colors.warning[50]',
  '#fff7ed': 'designTokens.colors.warning[50]',
  '#ffedd5': 'designTokens.colors.warning[100]',
  '#fed7aa': 'designTokens.colors.warning[200]',
  '#fffbeb': 'designTokens.colors.warning[50]',
  '#ca8a04': 'designTokens.colors.warning[600]',
  '#eab308': 'designTokens.colors.warning[500]',
  '#c2410c': 'designTokens.colors.warning[700]',
  '#b45309': 'designTokens.colors.warning[700]',
  // Info
  '#0ea5e9': 'designTokens.colors.info[500]',
  '#0284c7': 'designTokens.colors.info[600]',
  '#0288d1': 'designTokens.colors.info[600]',
  '#38bdf8': 'designTokens.colors.info[400]',
  '#e1f5fe': 'designTokens.colors.info[50]',
  '#a0c4e8': 'designTokens.colors.info[200]',
  // Grey
  '#111827': 'designTokens.colors.grey[900]',
  '#1f2937': 'designTokens.colors.grey[800]',
  '#334155': 'designTokens.colors.grey[700]',
  '#374151': 'designTokens.colors.grey[700]',
  '#616161': 'designTokens.colors.grey[600]',
  '#64748b': 'designTokens.colors.grey[500]',
  '#666': 'designTokens.colors.grey[600]',
  '#666666': 'designTokens.colors.grey[600]',
  '#9ca3af': 'designTokens.colors.grey[400]',
  '#cbd5e1': 'designTokens.colors.grey[300]',
  '#ddd': 'designTokens.colors.grey[300]',
  '#d0d0d0': 'designTokens.colors.grey[300]',
  '#d1d5db': 'designTokens.colors.grey[300]',
  '#f5f5f5': 'designTokens.colors.grey[100]',
  '#f9fafb': 'designTokens.colors.grey[50]',
  '#e5e7eb': 'designTokens.colors.grey[200]',
  '#f3f4f6': 'designTokens.colors.grey[100]',
  // Lime
  '#84CC16': 'designTokens.colors.neon.lime[500]',
  '#a3e635': 'designTokens.colors.neon.lime[400]',
  // ── NEW pass 3 entries ──
  '#fde047': 'designTokens.colors.warning[200]',
  '#eee': 'designTokens.colors.grey[200]',
  '#ecfeff': 'designTokens.colors.cyan[50]',
  '#cffafe': 'designTokens.colors.cyan[100]',
  '#999': 'designTokens.colors.grey[500]',
  '#333': 'designTokens.colors.grey[800]',
  '#1e3a8a': 'designTokens.colors.primary[900]',
  '#1e1e1e': 'designTokens.colors.grey[900]',
  '#15803d': 'designTokens.colors.success[700]',
  '#424242': 'designTokens.colors.grey[800]',
  '#90caf9': 'designTokens.colors.primary[200]',
};

// ── RGBA_MAP (pass 2 entries with glass paths corrected + new entries) ──

const RGBA_MAP = {
  // Black alpha — action / cyber.glass
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
  'rgba(0,0,0,0.2)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0, 0, 0, 0.2)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0,0,0,0.23)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0, 0, 0, 0.23)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0,0,0,0.25)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0, 0, 0, 0.25)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0,0,0,0.3)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0, 0, 0, 0.3)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0,0,0,0.38)': 'designTokens.colors.text.disabled',
  'rgba(0, 0, 0, 0.38)': 'designTokens.colors.text.disabled',
  'rgba(0,0,0,0.4)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0, 0, 0, 0.4)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0,0,0,0.5)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0, 0, 0, 0.5)': 'designTokens.colors.cyber.glass.divider',
  'rgba(0,0,0,0.54)': 'designTokens.colors.text.secondary',
  'rgba(0, 0, 0, 0.54)': 'designTokens.colors.text.secondary',
  'rgba(0,0,0,0.55)': 'designTokens.colors.cyber.metal.bottomShadow',
  'rgba(0, 0, 0, 0.55)': 'designTokens.colors.cyber.metal.bottomShadow',
  'rgba(0,0,0,0.6)': 'designTokens.colors.cyber.metal.bottomShadow',
  'rgba(0, 0, 0, 0.6)': 'designTokens.colors.cyber.metal.bottomShadow',
  'rgba(0,0,0,0.7)': 'designTokens.colors.cyber.metal.bottomShadow',
  'rgba(0, 0, 0, 0.7)': 'designTokens.colors.cyber.metal.bottomShadow',
  'rgba(0,0,0,0.87)': 'designTokens.colors.text.primary',
  'rgba(0, 0, 0, 0.87)': 'designTokens.colors.text.primary',
  'rgba(0,0,0,0.9)': 'designTokens.colors.text.primary',
  'rgba(0, 0, 0, 0.9)': 'designTokens.colors.text.primary',
  // White alpha — cyber.glass / metal
  'rgba(255,255,255,0.02)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255, 255, 255, 0.02)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255,255,255,0.04)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255, 255, 255, 0.04)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255,255,255,0.05)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255, 255, 255, 0.05)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255,255,255,0.08)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255, 255, 255, 0.08)': 'designTokens.colors.cyber.glass.bgLight',
  'rgba(255,255,255,0.1)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255, 255, 255, 0.1)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255,255,255,0.15)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255, 255, 255, 0.15)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255,255,255,0.2)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255, 255, 255, 0.2)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255,255,255,0.3)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255, 255, 255, 0.3)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255,255,255,0.7)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255, 255, 255, 0.7)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255,255,255,0.8)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255, 255, 255, 0.8)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255,255,255,0.9)': 'designTokens.colors.cyber.metal.topLight',
  'rgba(255, 255, 255, 0.9)': 'designTokens.colors.cyber.metal.topLight',
  // Blue
  'rgba(59, 130, 246, 0.03)': 'designTokens.colors.primary[50]',
  'rgba(59, 130, 246, 0.08)': 'designTokens.colors.cyber.grid.line',
  'rgba(59, 130, 246, 0.1)': 'designTokens.colors.cyber.grid.line',
  'rgba(59, 130, 246, 0.2)': 'designTokens.colors.cyber.grid.lineHeavy',
  'rgba(59, 130, 246, 0.25)': 'designTokens.colors.cyber.grid.lineHeavy',
  'rgba(59, 130, 246, 0.3)': 'designTokens.colors.cyber.grid.lineHeavy',
  'rgba(59,130,246,0.03)': 'designTokens.colors.primary[50]',
  'rgba(59,130,246,0.1)': 'designTokens.colors.primary[100]',
  'rgba(59,130,246,0.2)': 'designTokens.colors.cyber.grid.lineHeavy',
  // Indigo
  'rgba(99, 102, 241, 0.2)': 'designTokens.colors.secondary[200]',
  'rgba(99, 102, 241, 0.3)': 'designTokens.colors.secondary[200]',
  'rgba(99, 102, 241, 0.4)': 'designTokens.colors.secondary[300]',
  'rgba(99,102,241,0.4)': 'designTokens.colors.secondary[300]',
  'rgba(99,102,241,0.2)': 'designTokens.colors.secondary[200]',
  // Purple
  'rgba(139, 92, 246, 0.2)': 'designTokens.colors.secondary[300]',
  'rgba(139, 92, 246, 0.4)': 'designTokens.colors.secondary[400]',
  'rgba(139,92,246,0.2)': 'designTokens.colors.secondary[300]',
  'rgba(139,92,246,0.4)': 'designTokens.colors.secondary[400]',
  // Green
  'rgba(16, 185, 129, 0.1)': 'designTokens.colors.success[100]',
  'rgba(16, 185, 129, 0.2)': 'designTokens.colors.success[200]',
  'rgba(16,185,129,0.1)': 'designTokens.colors.success[100]',
  'rgba(16,185,129,0.2)': 'designTokens.colors.success[200]',
  // Red
  'rgba(239, 68, 68, 0.1)': 'designTokens.colors.error[100]',
  'rgba(239, 68, 68, 0.4)': 'designTokens.colors.error[400]',
  'rgba(239,68,68,0.1)': 'designTokens.colors.error[100]',
  'rgba(239,68,68,0.4)': 'designTokens.colors.error[400]',
  // Amber/Warning
  'rgba(245, 158, 11, 0.1)': 'designTokens.colors.warning[100]',
  'rgba(245,158,11,0.1)': 'designTokens.colors.warning[100]',
  // Sky/Info
  'rgba(14, 165, 233, 0.1)': 'designTokens.colors.info[100]',
  'rgba(14,165,233,0.1)': 'designTokens.colors.info[100]',
  'rgba(14, 165, 233, 0.4)': 'designTokens.colors.info[500]',
  'rgba(14,165,233,0.4)': 'designTokens.colors.info[500]',
  // Glow colors
  'rgba(124, 58, 237, 0.4)': 'designTokens.colors.secondary[600]',
  'rgba(124,58,237,0.4)': 'designTokens.colors.secondary[600]',
  'rgba(5, 150, 105, 0.4)': 'designTokens.colors.success[600]',
  'rgba(5,150,105,0.4)': 'designTokens.colors.success[600]',
  'rgba(220, 38, 38, 0.4)': 'designTokens.colors.error[600]',
  'rgba(220,38,38,0.4)': 'designTokens.colors.error[600]',
  'rgba(245, 158, 11, 0.4)': 'designTokens.colors.warning[500]',
  'rgba(245,158,11,0.4)': 'designTokens.colors.warning[500]',
  'rgba(249, 115, 22, 0.4)': 'designTokens.colors.warning[600]',
  'rgba(249,115,22,0.4)': 'designTokens.colors.warning[600]',
  'rgba(15, 118, 110, 0.4)': 'designTokens.colors.teal[600]',
  'rgba(15,118,110,0.4)': 'designTokens.colors.teal[600]',
  'rgba(6, 182, 212, 0.4)': 'designTokens.colors.cyan[500]',
  'rgba(6,182,212,0.4)': 'designTokens.colors.cyan[500]',
  'rgba(8, 145, 178, 0.4)': 'designTokens.colors.cyan[600]',
  'rgba(8,145,178,0.4)': 'designTokens.colors.cyan[600]',
  // ── NEW pass 3 entries ──
  'rgba(59, 130, 246, 0.4)': 'designTokens.colors.primary[400]',
  'rgba(59,130,246,0.4)': 'designTokens.colors.primary[400]',
  'rgba(96, 165, 250, 0.3)': 'designTokens.colors.primary[300]',
  'rgba(255,255,255,0.92)': 'designTokens.colors.common.white',
  'rgba(0,0,0,0.02)': 'designTokens.colors.action.hover',
  'rgba(16, 185, 129, 0.4)': 'designTokens.colors.success[400]',
  'rgba(31,41,55,0.5)': 'designTokens.colors.grey[800]',
};

// ── SHADOW_MAP (same as pass 2) ──────────────────────────

const SHADOW_MAP = {
  '0 1px 2px 0 rgba(0,0,0,0.03)': 'designTokens.shadows.xs',
  '0 1px 3px 0 rgba(0,0,0,0.1)': 'designTokens.shadows.sm',
  '0 1px 3px rgba(0, 0, 0, 0.05)': 'designTokens.shadows.sm',
  '0 4px 6px -1px rgba(0,0,0,0.1)': 'designTokens.shadows.md',
  '0 10px 15px -3px rgba(0,0,0,0.1)': 'designTokens.shadows.lg',
  '0 10px 15px -3px rgba(0,0,0,0.05)': 'designTokens.shadows.lg',
  '0 20px 25px -5px rgba(0,0,0,0.1)': 'designTokens.shadows.xl',
  '0 25px 50px -12px rgba(0,0,0,0.25)': 'designTokens.shadows["2xl"]',
  '0 20px 60px rgba(0,0,0,0.3)': 'designTokens.darkShadows.xl',
  '0 24px 80px rgba(0,0,0,0.4)': 'designTokens.darkShadows["3xl"]',
  '0 2px 8px rgba(0,0,0,0.1)': 'designTokens.shadows.sm',
  '0 2px 8px rgba(0,0,0,0.15)': 'designTokens.shadows.sm',
  '0 0 0 2px rgba(0,0,0,0.1)': 'designTokens.shadows.xs',
  '0 8px 25px rgba(0, 0, 0, 0.15)': 'designTokens.shadows.lg',
  '0 4px 15px rgba(0, 0, 0, 0.1)': 'designTokens.shadows.md',
  '0 1px 2px rgba(0,0,0,0.1)': 'designTokens.shadows.xs',
  'inset 0 2px 4px rgba(0, 0, 0, 0.2)': 'designTokens.shadows["inset"]',
  '0 2px 4px rgba(0,0,0,0.2)': 'designTokens.shadows.sm',
  '0 1px 2px rgba(0,0,0,0.06)': 'designTokens.shadows.xs',
  '0 0 0 3px rgba(0,0,0,0.1)': 'designTokens.shadows.xs',
  '0 0 0 3px rgba(59,130,246,0.2)': 'designTokens.shadows.xs',
  '0 0 0 2px rgba(59,130,246,0.2)': 'designTokens.shadows.xs',
};

// ── Helpers ──────────────────────────────────────────────

function log(tag, filePath, lineNum, detail) {
  if (verbose) {
    console.log(`  [${tag}] ${path.relative(WEB_SRC, filePath)}:${lineNum + 1} ${detail}`);
  }
}

/**
 * Replace a search value inside backtick template literals only.
 * Splits the inner content by ${...} expressions so hex/rgba
 * already inside an expression is left untouched.
 */
function replaceInBackticks(line, searchValue, replacement) {
  if (!line.includes('`')) return line;

  return line.replace(/`([^`]*)`/g, (fullMatch, inner) => {
    // Split inner by ${...} expressions
    const segments = [];
    let lastIdx = 0;
    const exprRe = /\$\{[^}]*\}/g;
    let m;
    while ((m = exprRe.exec(inner)) !== null) {
      segments.push({ text: inner.slice(lastIdx, m.index), expr: false });
      segments.push({ text: m[0], expr: true });
      lastIdx = m.index + m[0].length;
    }
    segments.push({ text: inner.slice(lastIdx), expr: false });

    let result = '';
    for (const seg of segments) {
      if (seg.expr) {
        result += seg.text;
      } else {
        result += seg.text.split(searchValue).join(replacement);
      }
    }
    return '`' + result + '`';
  });
}

function getLastImport(lines) {
  let last = -1;
  let inBlock = false;
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
    } else if (last >= 0 && !t.startsWith('import') && t !== '') {
      break;
    }
  }
  return last;
}

function ensureImport(lines) {
  const hasDesignTokens = lines.some(
    (l) => /import\s+\{[^}]*designTokens/.test(l) || /import\s+designTokens/.test(l)
  );
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

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      results.push(...walk(full));
    } else if (/\.[mc]?[tj]sx?$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── Core processing ──────────────────────────────────────

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    // Skip comment lines and imports
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;

    // ── (e) Hex inside var() fallbacks: 'var(--xxx, #hex)' → `var(--xxx, ${token})`
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const esc = escapeHex(hex);
      for (const q of ["'", '"']) {
        const re = new RegExp(`${q}(var\\([^)]+,)\\s*${esc}\\s*\\)${q}`, 'g');
        const newLine = line.replace(re, (match, prefix) => {
          count++;
          modified = true;
          log('var-hex', filePath, i, hex);
          return '`' + prefix + ' ${' + token + '})`';
        });
        line = newLine;
      }
    }

    // ── (f) rgba inside var() fallbacks: 'var(--xxx, rgba(...))' → `var(--xxx, ${token})`
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const esc = escapeRegex(rgba);
      for (const q of ["'", '"']) {
        const re = new RegExp(`${q}(var\\([^)]+,)\\s*${esc}\\s*\\)${q}`, 'g');
        const newLine = line.replace(re, (match, prefix) => {
          count++;
          modified = true;
          log('var-rgba', filePath, i, rgba);
          return '`' + prefix + ' ${' + token + '})`';
        });
        line = newLine;
      }
    }

    // ── (i) boxShadow standalone strings → token (exact match from SHADOW_MAP)
    for (const [shadow, token] of Object.entries(SHADOW_MAP)) {
      const esc = escapeRegex(shadow);
      for (const q of ["'", '"']) {
        const re = new RegExp(`boxShadow:\\s*${q}${esc}${q}`, 'g');
        const newLine = line.replace(re, () => {
          count++;
          modified = true;
          log('shadow', filePath, i, shadow);
          return `boxShadow: ${token}`;
        });
        line = newLine;
      }
    }

    // ── (a) Standalone hex in quotes: '#hex' → token
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const esc = escapeHex(hex);
      // single-quoted
      const re1 = new RegExp(`'${esc}'`, 'g');
      if (re1.test(line)) {
        line = line.replace(re1, () => {
          count++;
          modified = true;
          log('hex-sq', filePath, i, hex);
          return token;
        });
      }
      re1.lastIndex = 0;
      // double-quoted
      const re2 = new RegExp(`"${esc}"`, 'g');
      if (re2.test(line)) {
        line = line.replace(re2, () => {
          count++;
          modified = true;
          log('hex-dq', filePath, i, hex);
          return token;
        });
      }
      re2.lastIndex = 0;
    }

    // ── (b) Standalone rgba in quotes: 'rgba(...)' → token
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const esc = escapeRegex(rgba);
      const re1 = new RegExp(`'${esc}'`, 'g');
      if (re1.test(line)) {
        line = line.replace(re1, () => {
          count++;
          modified = true;
          log('rgba-sq', filePath, i, rgba);
          return token;
        });
      }
      re1.lastIndex = 0;
      const re2 = new RegExp(`"${esc}"`, 'g');
      if (re2.test(line)) {
        line = line.replace(re2, () => {
          count++;
          modified = true;
          log('rgba-dq', filePath, i, rgba);
          return token;
        });
      }
      re2.lastIndex = 0;
    }

    // ── (c) Hex inside border/boxShadow strings: 'Npx solid #hex' → `Npx solid ${token}`
    // Also catches hex in any larger quoted string (pattern c + general hex-in-string)
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const esc = escapeHex(hex);
      // Match quoted strings that contain the hex with other text
      const re = new RegExp(`(['"])([^'"]*?)${esc}([^'"]*?)\\1`, 'g');
      line = line.replace(re, (match, quote, prefix, suffix) => {
        // Skip standalone (already handled above) — prefix and suffix both empty
        if (prefix === '' && suffix === '') return match;
        count++;
        modified = true;
        log('hex-in-str', filePath, i, hex);
        return '`' + prefix + '${' + token + '}' + suffix + '`';
      });
    }

    // ── (d) rgba inside border/boxShadow strings: '... rgba(...)' → `... ${token}`
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const esc = escapeRegex(rgba);
      const re = new RegExp(`(['"])([^'"]*?)${esc}([^'"]*?)\\1`, 'g');
      line = line.replace(re, (match, quote, prefix, suffix) => {
        if (prefix === '' && suffix === '') return match;
        count++;
        modified = true;
        log('rgba-in-str', filePath, i, rgba);
        return '`' + prefix + '${' + token + '}' + suffix + '`';
      });
    }

    // ── (g) Hex inside template literals (backticks): #hex → ${token}
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const replacement = '${' + token + '}';
      const newLine = replaceInBackticks(line, hex, replacement);
      if (newLine !== line) {
        count++;
        modified = true;
        log('hex-tmpl', filePath, i, hex);
        line = newLine;
      }
    }

    // ── (h) rgba inside template literals: rgba(...) → ${token}
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const replacement = '${' + token + '}';
      const newLine = replaceInBackticks(line, rgba, replacement);
      if (newLine !== line) {
        count++;
        modified = true;
        log('rgba-tmpl', filePath, i, rgba);
        line = newLine;
      }
    }

    lines[i] = line;
  }

  if (modified) {
    ensureImport(lines);
    if (!dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
    }
    filesFixed++;
    totalReplaced += count;
  }
}

// ── Main ─────────────────────────────────────────────────

let totalReplaced = 0;
let filesFixed = 0;

const files = walk(WEB_SRC).filter((f) => !SKIP_RE.test(f));
for (const f of files) {
  processFile(f);
}

console.log(`\n=== Pass 3: Token Convergence ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
console.log(`Files fixed: ${filesFixed}, Replacements: ${totalReplaced}`);
