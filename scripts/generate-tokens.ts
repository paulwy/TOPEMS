import fs from 'fs';
import path from 'path';
import { designTokens, semanticTokens } from '../packages/tokens/src/tokens';

const outputPath = path.resolve(__dirname, '../apps/web/src/theme/generated-tokens.css');

function toKebab(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}-${toKebab(key)}` : toKebab(key);
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, newKey));
    } else if (typeof value === 'string' || typeof value === 'number') {
      result[newKey] = value;
    }
  }
  return result;
}

const designFlat = flatten(designTokens as Record<string, unknown>);
const semanticFlat = flatten(semanticTokens as Record<string, unknown>);

const cssVars: string[] = [];

// Primary
const primary = designTokens.colors.primary;
cssVars.push('  /* ===== Primary ===== */');
cssVars.push(`  --color-primary: ${primary.main};`);
cssVars.push(`  --color-primary-hover: ${primary.dark};`);
cssVars.push(`  --color-primary-light: ${primary.light};`);
cssVars.push(`  --color-primary-foreground: ${primary.contrastText};`);
for (const [key, value] of Object.entries(primary)) {
  if (/^\d+$/.test(key)) {
    cssVars.push(`  --color-primary-${key}: ${value};`);
  }
}

// Secondary
const secondary = designTokens.colors.secondary;
cssVars.push('');
cssVars.push('  /* ===== Secondary ===== */');
cssVars.push(`  --color-secondary: ${secondary.main};`);
cssVars.push(`  --color-secondary-hover: ${secondary.dark};`);
cssVars.push(`  --color-secondary-light: ${secondary.light};`);
cssVars.push(`  --color-secondary-foreground: ${secondary.contrastText};`);
for (const [key, value] of Object.entries(secondary)) {
  if (/^\d+$/.test(key)) {
    cssVars.push(`  --color-secondary-${key}: ${value};`);
  }
}

// State colors
for (const name of ['success', 'warning', 'error', 'info'] as const) {
  const scale = designTokens.colors[name];
  cssVars.push('');
  cssVars.push(`  /* ===== ${name.charAt(0).toUpperCase() + name.slice(1)} ===== */`);
  cssVars.push(`  --color-${name}: ${scale.main};`);
  cssVars.push(`  --color-${name}-hover: ${scale.dark};`);
  cssVars.push(`  --color-${name}-light: ${scale.light};`);
  for (const [key, value] of Object.entries(scale)) {
    if (/^\d+$/.test(key)) {
      cssVars.push(`  --color-${name}-${key}: ${value};`);
    }
  }
}

// Grey
const grey = designTokens.colors.grey;
cssVars.push('');
cssVars.push('  /* ===== Grey ===== */');
for (const [key, value] of Object.entries(grey)) {
  cssVars.push(`  --color-grey-${key}: ${value};`);
}

// Background / text / border / action
const { background, text, border, action } = designTokens.colors;
cssVars.push('');
cssVars.push('  /* ===== Background & Text ===== */');
cssVars.push(`  --color-background: ${background.default};`);
cssVars.push(`  --color-background-paper: ${background.paper};`);
cssVars.push(`  --color-background-elevated: ${background.elevated};`);
cssVars.push(`  --color-text-primary: ${text.primary};`);
cssVars.push(`  --color-text-secondary: ${text.secondary};`);
cssVars.push(`  --color-text-muted: ${text.muted};`);
cssVars.push(`  --color-text-disabled: ${text.disabled};`);
cssVars.push(`  --color-border: ${border.default};`);
cssVars.push(`  --color-border-light: ${border.light};`);
cssVars.push(`  --color-border-dark: ${border.dark};`);
cssVars.push(`  --color-action-hover: ${action.hover};`);
cssVars.push(`  --color-action-active: ${action.active};`);
cssVars.push(`  --color-action-selected: ${action.selected};`);
cssVars.push(`  --color-action-disabled: ${action.disabled};`);
cssVars.push(`  --color-action-disabled-background: ${action.disabledBackground};`);
cssVars.push(`  --color-action-focus: ${action.focus};`);

// Brand semantic aliases
cssVars.push('');
cssVars.push('  /* ===== Brand Semantic ===== */');
const semantic = designTokens.colors.brand.semantic;
for (const [key, value] of Object.entries(semantic)) {
  cssVars.push(`  --color-brand-${toKebab(key)}: ${value};`);
}

// Extended colors
for (const name of ['orange', 'yellow', 'blue', 'cyan', 'purple', 'pink', 'teal'] as const) {
  const scale = designTokens.colors[name];
  if (!scale) continue;
  cssVars.push('');
  cssVars.push(`  /* ===== ${name.charAt(0).toUpperCase() + name.slice(1)} ===== */`);
  cssVars.push(`  --color-${name}: ${scale.main};`);
  for (const [key, value] of Object.entries(scale)) {
    if (/^\d+$/.test(key)) {
      cssVars.push(`  --color-${name}-${key}: ${value};`);
    }
  }
}

// Surface
cssVars.push('');
cssVars.push('  /* ===== Surface ===== */');
const surface = designTokens.colors.surface;
for (const [key, value] of Object.entries(surface)) {
  cssVars.push(`  --color-surface-${key}: ${value};`);
}

// Typography
cssVars.push('');
cssVars.push('  /* ===== Typography ===== */');
cssVars.push(`  --font-sans: ${designTokens.typography.fontFamily};`);
cssVars.push(`  --font-mono: ${designTokens.typography.fontMono};`);
for (const [key, value] of Object.entries(designTokens.typography.fontSize)) {
  if (typeof value === 'string' && !key.includes('.')) {
    cssVars.push(`  --font-size-${toKebab(key)}: ${value};`);
  }
}
for (const [key, value] of Object.entries(designTokens.typography.lineHeight)) {
  cssVars.push(`  --line-height-${toKebab(key)}: ${value};`);
}
for (const [key, value] of Object.entries(designTokens.typography.fontWeight)) {
  cssVars.push(`  --font-weight-${toKebab(key)}: ${value};`);
}
for (const [key, value] of Object.entries(designTokens.typography.letterSpacing)) {
  cssVars.push(`  --letter-spacing-${toKebab(key)}: ${value};`);
}

// Spacing
cssVars.push('');
cssVars.push('  /* ===== Spacing ===== */');
for (const [key, value] of Object.entries(designTokens.spacing.scale)) {
  cssVars.push(`  --space-${key}: ${value}px;`);
}

// Border radius
cssVars.push('');
cssVars.push('  /* ===== Border Radius ===== */');
for (const [key, value] of Object.entries(designTokens.borderRadius)) {
  cssVars.push(`  --radius-${toKebab(key)}: ${typeof value === 'number' ? `${value}px` : value};`);
}

// Shadows
cssVars.push('');
cssVars.push('  /* ===== Shadows ===== */');
for (const [key, value] of Object.entries(designTokens.shadows)) {
  cssVars.push(`  --shadow-${toKebab(key)}: ${value};`);
}

// Motion
cssVars.push('');
cssVars.push('  /* ===== Motion ===== */');
for (const [key, value] of Object.entries(designTokens.motion.duration)) {
  cssVars.push(`  --duration-${toKebab(key)}: ${value};`);
}
for (const [key, value] of Object.entries(designTokens.motion.easing)) {
  cssVars.push(`  --easing-${toKebab(key)}: ${value};`);
}
for (const [key, value] of Object.entries(designTokens.motion.transition)) {
  cssVars.push(`  --transition-${toKebab(key)}: ${value};`);
}

// Z-index
cssVars.push('');
cssVars.push('  /* ===== Z-Index ===== */');
for (const [key, value] of Object.entries(designTokens.zIndex)) {
  cssVars.push(`  --z-${toKebab(key)}: ${value};`);
}

// Brand visual effects
cssVars.push('');
cssVars.push('  /* ===== Brand Visual Effects ===== */');
for (const [key, value] of Object.entries(semanticTokens.brand.glass)) {
  cssVars.push(`  --glass-${toKebab(key)}: ${value};`);
}
for (const [key, value] of Object.entries(semanticTokens.brand.glow)) {
  cssVars.push(`  --glow-${toKebab(key)}: ${value};`);
}
cssVars.push(`  --tab-underline: ${semanticTokens.brand.tabUnderline};`);
cssVars.push(`  --active-tab-glow: ${semanticTokens.brand.activeTabGlow};`);
cssVars.push(`  --focus-ring: ${semanticTokens.brand.focusRing};`);
cssVars.push(`  --focus-ring-dark: ${semanticTokens.brand.focusRingDark};`);

const output = `/* Auto-generated from tokens.ts — do not edit manually */\n:root {\n${cssVars.join('\n')}\n}\n`;

fs.writeFileSync(outputPath, output);
console.log(`Generated ${outputPath}`);
