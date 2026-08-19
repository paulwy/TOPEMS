#!/usr/bin/env node
/**
 * V220 Pass 2: Fix colors inside var() fallbacks and remaining patterns.
 *
 * Patterns handled:
 * 1. 'var(--xxx, #hex)' → `var(--xxx, ${designTokens.colors.xxx})`
 * 2. 'var(--xxx, rgba(...))' → `var(--xxx, ${designTokens.colors.xxx})`
 * 3. Remaining standalone hex/rgba in strings not covered by pass 1
 * 4. New hex/rgba values not in original maps
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');
const WEB_SRC = path.resolve('apps/web/src');
const SKIP_RE =
  /\/(node_modules|dist|build|__tests__|\.stories\.|theme\/tokens|theme\/generated|theme\/gradients|design-system\/tokens)\//;

// Extended color maps (includes new values from pass 1 analysis)
const RGBA_MAP = {
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
  'rgba(0,0,0,0.23)': 'designTokens.glass.divider',
  'rgba(0, 0, 0, 0.23)': 'designTokens.glass.divider',
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
  'rgba(0,0,0,0.54)': 'designTokens.colors.text.secondary',
  'rgba(0, 0, 0, 0.54)': 'designTokens.colors.text.secondary',
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
  'rgba(255,255,255,0.02)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.02)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.04)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.04)': 'designTokens.glass.bgLight',
  'rgba(255,255,white,0.05)': 'designTokens.glass.bgLight',
  'rgba(255,255,white,0.05)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.05)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.05)': 'designTokens.glass.bgLight',
  'rgba(255,255,white,0.08)': 'designTokens.glass.bgLight',
  'rgba(255,255,white,0.08)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.08)': 'designTokens.glass.bgLight',
  'rgba(255, 255, 255, 0.08)': 'designTokens.glass.bgLight',
  'rgba(255,255,255,0.1)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.1)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.15)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.15)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.2)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.2)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.3)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.3)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.7)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.7)': 'designTokens.glass.topLight',
  'rgba(255,255,white,0.7)': 'designTokens.glass.topLight',
  'rgba(255,255,white,0.7)': 'designTokens.glass.topLight',
  'rgba(255,255,white,0.8)': 'designTokens.glass.topLight',
  'rgba(255,255,white,0.8)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.8)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.8)': 'designTokens.glass.topLight',
  'rgba(255,255,255,0.9)': 'designTokens.glass.topLight',
  'rgba(255, 255, 255, 0.9)': 'designTokens.glass.topLight',
  // Blue
  'rgba(59, 130, 246, 0.03)': 'designTokens.colors.primary[50]',
  'rgba(59, 130, 246, 0.08)': 'designTokens.glass.line',
  'rgba(59, 130, 246, 0.1)': 'designTokens.glass.line',
  'rgba(59, 130, 246, 0.2)': 'designTokens.glass.lineHeavy',
  'rgba(59, 130, 246, 0.25)': 'designTokens.glass.lineHeavy',
  'rgba(59, 130, 246, 0.3)': 'designTokens.glass.lineHeavy',
  'rgba(59,130,246,0.03)': 'designTokens.colors.primary[50]',
  'rgba(59,130,246,0.1)': 'designTokens.colors.primary[100]',
  'rgba(59,130,246,0.2)': 'designTokens.glass.lineHeavy',
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
  '#1976d2': 'designTokens.colors.primary[700]',
  '#eff6ff': 'designTokens.colors.primary[50]',
  '#dbeafe': 'designTokens.colors.primary[100]',
  '#8b5cf6': 'designTokens.colors.secondary[500]',
  '#7c3aed': 'designTokens.colors.secondary[600]',
  '#a78bfa': 'designTokens.colors.secondary[400]',
  '#6d28d9': 'designTokens.colors.secondary[700]',
  '#d946ef': 'designTokens.colors.pink[500]',
  '#f43f5e': 'designTokens.colors.error[500]',
  '#F43F5E': 'designTokens.colors.error[500]',
  '#ef4444': 'designTokens.colors.error[500]',
  '#dc2626': 'designTokens.colors.error[600]',
  '#fca5a5': 'designTokens.colors.error[300]',
  '#fecaca': 'designTokens.colors.error[200]',
  '#22c55e': 'designTokens.colors.success[500]',
  '#16a34a': 'designTokens.colors.success[600]',
  '#86efac': 'designTokens.colors.success[300]',
  '#bbf7d0': 'designTokens.colors.success[200]',
  '#047857': 'designTokens.colors.success[700]',
  '#388e3c': 'designTokens.colors.success[600]',
  '#0f766e': 'designTokens.colors.teal[700]',
  '#10b981': 'designTokens.colors.success[500]',
  '#059669': 'designTokens.colors.success[600]',
  '#f59e0b': 'designTokens.colors.warning[500]',
  '#d97706': 'designTokens.colors.warning[600]',
  '#ef6c00': 'designTokens.colors.warning[700]',
  '#ed6c02': 'designTokens.colors.warning[500]',
  '#fef3c7': 'designTokens.colors.warning[100]',
  '#fff3e0': 'designTokens.colors.warning[50]',
  '#fff7ed': 'designTokens.colors.warning[50]',
  '#ffedd5': 'designTokens.colors.warning[100]',
  '#fed7aa': 'designTokens.colors.warning[200]',
  '#0ea5e9': 'designTokens.colors.info[500]',
  '#0284c7': 'designTokens.colors.info[600]',
  '#0288d1': 'designTokens.colors.info[600]',
  '#38bdf8': 'designTokens.colors.info[400]',
  '#e1f5fe': 'designTokens.colors.info[50]',
  '#155e75': 'designTokens.colors.cyan[800]',
  '#0e7490': 'designTokens.colors.cyan[700]',
  '#06b6d4': 'designTokens.colors.cyan[500]',
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
  '#f5f5f5': 'designTokens.colors.grey[100]',
  '#f9fafb': 'designTokens.colors.grey[50]',
  '#e5e7eb': 'designTokens.colors.grey[200]',
  '#fff3e0': 'designTokens.colors.warning[50]',
  '#ffebee': 'designTokens.colors.error[50]',
  '#e0e7ff': 'designTokens.colors.secondary[50]',
  '#eef2ff': 'designTokens.colors.secondary[50]',
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
  '#a0c4e8': 'designTokens.colors.info[200]',
};

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

    let newLine = line;

    // 1. Fix colors inside var() fallbacks: 'var(--xxx, #hex)' → `var(--xxx, ${token})`
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const escaped = hex.replace('#', '\\#');
      const re = new RegExp(`'(var\\([^)]*,\\s*)${escaped}(\\s*)\\)'`, 'g');
      if (re.test(newLine)) {
        newLine = newLine.replace(re, '`$1${' + token + '}$2`');
        count++;
        modified = true;
        if (verbose) console.log(`  [var-hex] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
      }
      re.lastIndex = 0;
      // Also handle double quotes
      const re2 = new RegExp(`"(var\\([^)]*,\\s*)${escaped}(\\s*)\\)"`, 'g');
      if (re2.test(newLine)) {
        newLine = newLine.replace(re2, '`$1${' + token + '}$2`');
        count++;
        modified = true;
        if (verbose) console.log(`  [var-hex-dq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
      }
      re2.lastIndex = 0;
    }

    // 2. Fix rgba inside var() fallbacks: 'var(--xxx, rgba(...))' → `var(--xxx, ${token})`
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const escaped = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`'(var\\([^)]*,\\s*)${escaped}(\\s*)\\)'`, 'g');
      if (re.test(newLine)) {
        newLine = newLine.replace(re, '`$1${' + token + '}$2`');
        count++;
        modified = true;
        if (verbose) console.log(`  [var-rgba] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${rgba}`);
      }
      re.lastIndex = 0;
    }

    // 3. Fix shadow inside var() fallbacks
    for (const [shadow, token] of Object.entries(SHADOW_MAP)) {
      const escaped = shadow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`'(var\\([^)]*,\\s*)${escaped}(\\s*)\\)'`, 'g');
      if (re.test(newLine)) {
        newLine = newLine.replace(re, '`$1${' + token + '}$2`');
        count++;
        modified = true;
        if (verbose) console.log(`  [var-shadow] ${path.relative(WEB_SRC, filePath)}:${i + 1}`);
      }
      re.lastIndex = 0;
    }

    // 4. Replace standalone hex in strings (single-quoted): '#hex' → token
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const escaped = hex.replace('#', '\\#');
      const re = new RegExp(`'${escaped}'`, 'g');
      if (re.test(newLine) && !newLine.includes('var(')) {
        newLine = newLine.replace(re, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [hex-sq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
      }
      re.lastIndex = 0;
      // Double-quoted
      const re2 = new RegExp(`"${escaped}"`, 'g');
      if (re2.test(newLine) && !newLine.includes('var(')) {
        newLine = newLine.replace(re2, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [hex-dq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
      }
      re2.lastIndex = 0;
    }

    // 5. Replace standalone rgba in strings
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const escaped = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`'${escaped}'`, 'g');
      if (re.test(newLine) && !newLine.includes('var(')) {
        newLine = newLine.replace(re, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [rgba-sq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${rgba}`);
      }
      re.lastIndex = 0;
      const re2 = new RegExp(`"${escaped}"`, 'g');
      if (re2.test(newLine) && !newLine.includes('var(')) {
        newLine = newLine.replace(re2, token);
        count++;
        modified = true;
        if (verbose) console.log(`  [rgba-dq] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${rgba}`);
      }
      re2.lastIndex = 0;
    }

    // 6. Replace standalone shadow strings
    for (const [shadow, token] of Object.entries(SHADOW_MAP)) {
      const escaped = shadow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re1 = new RegExp(`boxShadow:\\s*'${escaped}'`, 'g');
      const re2 = new RegExp(`boxShadow:\\s*"${escaped}"`, 'g');
      for (const re of [re1, re2]) {
        if (re.test(newLine)) {
          newLine = newLine.replace(re, `boxShadow: ${token}`);
          count++;
          modified = true;
          if (verbose) console.log(`  [shadow] ${path.relative(WEB_SRC, filePath)}:${i + 1}`);
        }
        re.lastIndex = 0;
      }
    }

    // 7. Replace hex inside border strings: '1px solid #hex' → `1px solid ${token}`
    for (const [hex, token] of Object.entries(HEX_MAP)) {
      const escaped = hex.replace('#', '\\#');
      const re = new RegExp(`(['"])(\\d+px\\s+\\w+\\s+)${escaped}(['"])`, 'g');
      if (re.test(newLine) && !newLine.includes('designTokens') && !newLine.includes('var(')) {
        newLine = newLine.replace(re, '`$2${' + token + '}`');
        count++;
        modified = true;
        if (verbose) console.log(`  [border-hex] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
      }
      re.lastIndex = 0;
    }

    // 8. Replace rgba inside border/box-shadow strings: '1px solid rgba(...)' → `1px solid ${token}`
    for (const [rgba, token] of Object.entries(RGBA_MAP)) {
      const escaped = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(['"])([^'"]*\\s)${escaped}(['"])`, 'g');
      if (re.test(newLine) && !newLine.includes('designTokens') && !newLine.includes('var(')) {
        newLine = newLine.replace(re, '`$2${' + token + '}`');
        count++;
        modified = true;
        if (verbose) console.log(`  [border-rgba] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${rgba}`);
      }
      re.lastIndex = 0;
    }

    // 9. Replace hex inside template literals (already has backtick)
    if (newLine.includes('`')) {
      for (const [hex, token] of Object.entries(HEX_MAP)) {
        const escaped = hex.replace('#', '\\#');
        // Only replace if not already inside ${...}
        const re = new RegExp(`(?<!\\$\\{[^}]*|['"])${escaped}(?![\\w-])`, 'g');
        if (re.test(newLine) && !newLine.includes(`designTokens.${token.split('.')[1]}`)) {
          // Check if this hex is NOT already a ${designTokens...} reference
          if (!newLine.includes(`\${${token}}`)) {
            newLine = newLine.replace(re, `\${${token}}`);
            count++;
            modified = true;
            if (verbose) console.log(`  [hex-tmpl] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
          }
        }
        re.lastIndex = 0;
      }
    }

    // 10. Replace rgba inside template literals
    if (newLine.includes('`')) {
      for (const [rgba, token] of Object.entries(RGBA_MAP)) {
        const escaped = rgba.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?<!\\$\\{[^}]*|['"])${escaped}(?![\\w-])`, 'g');
        if (re.test(newLine) && !newLine.includes(`\${${token}}`)) {
          newLine = newLine.replace(re, `\${${token}}`);
          count++;
          modified = true;
          if (verbose) console.log(`  [rgba-tmpl] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${rgba}`);
        }
        re.lastIndex = 0;
      }
    }

    // 11. Replace remaining standalone hex in gradient strings inside template literals
    if (newLine.includes('gradient') && newLine.includes('`')) {
      for (const [hex, token] of Object.entries(HEX_MAP)) {
        const escaped = hex.replace('#', '\\#');
        const re = new RegExp(escaped, 'g');
        if (re.test(newLine) && !newLine.includes(`\${${token}}`)) {
          newLine = newLine.replace(re, `\${${token}}`);
          count++;
          modified = true;
          if (verbose) console.log(`  [gradient-hex] ${path.relative(WEB_SRC, filePath)}:${i + 1} ${hex}`);
        }
        re.lastIndex = 0;
      }
    }

    lines[i] = newLine;
  }

  if (modified) {
    ensureImport(lines);
    filesFixed++;
    totalReplaced += count;
    if (!dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
    }
  }
}

const files = walk(WEB_SRC).filter((f) => !SKIP_RE.test(f));
for (const f of files) {
  processFile(f);
}

console.log(`\n=== V220 Pass 2: Token Convergence ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
console.log(`Files: ${filesFixed}, Replacements: ${totalReplaced}`);
