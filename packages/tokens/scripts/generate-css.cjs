const fs = require('fs');
const path = require('path');

// Read the compiled JS file and strip ESM export keywords so we can eval it
const tokensJs = fs.readFileSync(path.join(__dirname, '..', 'dist', 'tokens.js'), 'utf8');

// Remove 'export ' keywords and 'as const' assertions for eval
const cleaned = tokensJs
  .replace(/^export\s+/gm, '')
  .replace(/\s+as\s+const/g, '');

// Evaluate in a sandboxed context to get designTokens
const designTokens = new Function(
  cleaned + '\nreturn designTokens;'
)();

function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function generateCSSVariables(obj, prefix = '--') {
  let css = '';
  for (const [key, value] of Object.entries(obj)) {
    const varName = `${prefix}${toKebabCase(key)}`;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      css += generateCSSVariables(value, `${varName}-`);
    } else if (typeof value === 'string' || typeof value === 'number') {
      css += `  ${varName}: ${value};\n`;
    }
  }
  return css;
}

const css = `:root {\n${generateCSSVariables(designTokens, '--t-')}}\n`;

const distDir = path.join(__dirname, '..', 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'tokens.css'), css);
console.log('Generated dist/tokens.css');
