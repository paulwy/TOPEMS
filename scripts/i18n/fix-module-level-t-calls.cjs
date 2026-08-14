#!/usr/bin/env node
/**
 * Fix module-level t() calls -> i18n.t() for V219 P2 batch
 *
 * Strategy:
 * 1. Track component function boundaries via brace counting
 * 2. Replace t() with i18n.t() when OUTSIDE component bodies
 * 3. Remove misplaced useTranslation() from interfaces/objects/async/useMemo
 * 4. For component bodies using t() without useTranslation: add hook
 * 5. Ensure import i18n from '@/i18n' exists where needed
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const verbose = args.includes('--verbose');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');

const P2_MODULES = ['gis', 'im', 'system', 'automation', 'finance', 'lowcode', 'hrm', 'pdm', 'scm', 'integration'];

let totalFixed = 0;
let filesFixed = 0;

function hasI18nImport(lines) {
  return lines.some(l => /import\s+i18n\s+from\s+['"]@\/i18n['"]/.test(l));
}

function hasUseTranslationImport(lines) {
  return lines.some(l => /import\s*\{[^}]*useTranslation[^}]*\}\s*from\s+['"]react-i18next['"]/.test(l));
}

function getLastImportLine(lines) {
  let lastIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i]) || /^\s*import\s+.*from\s+/.test(lines[i])) {
      lastIdx = i;
    }
  }
  return lastIdx;
}

function isComponentStart(line) {
  // const XxxYyy: React.FC<...> = (...) => {
  // const XxxYyy = () => {
  // function XxxYyy() {
  // const XxxYyy: React.FC = ({ ... }) => {
  const m = line.match(/(?:const|function)\s+([A-Z]\w*)/);
  if (!m) return false;
  // Make sure it's not an interface, type, or const that's not a function
  if (/interface\s+/.test(line) || /type\s+/.test(line)) return false;
  // Check it looks like a component (has => or { or : React.FC or function)
  return /=>|function|React\.FC|memo|forwardRef|\)\s*\{|=\s*\(/.test(line);
}

function getNamespaceForModule(module) {
  return module;
}

function processFile(filePath, module) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;
  let fixCount = 0;

  const namespace = getNamespaceForModule(module);

  // Step 1: Remove misplaced useTranslation() calls
  // These are useTranslation calls placed inside:
  // - interfaces
  // - object literals (const xxx = { ... useTranslation ... })
  // - array literals (const xxx = [ ... useTranslation ... ])
  // - async function bodies at module level
  // - useMemo callbacks

  let inInterface = false;
  let braceDepthAtInterfaceStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track interface blocks
    if (/^\s*interface\s+\w+/.test(line)) {
      inInterface = true;
      braceDepthAtInterfaceStart = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepthAtInterfaceStart <= 0) inInterface = false;
      continue;
    }
    if (inInterface) {
      braceDepthAtInterfaceStart += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepthAtInterfaceStart <= 0) inInterface = false;
      continue;
    }

    // Remove useTranslation placed in wrong contexts
    if (/useTranslation/.test(line) && !/import\s+\{[^}]*useTranslation/.test(line)) {
      // Check if this is a proper useTranslation call inside a component
      // vs misplaced inside object/array/async/useMemo

      const isProperCall = /^\s*const\s+\{\s*t\s*(?:,\s*\w+)*\s*\}\s*=\s*useTranslation\s*\(/.test(line);

      if (isProperCall) {
        // Check context: is this inside an interface, object, array, async, or useMemo?
        const prevLines = lines.slice(Math.max(0, i - 15), i).join('\n');

        // Inside interface? (shouldn't happen but check)
        if (inInterface) {
          lines[i] = '';
          modified = true;
          fixCount++;
          continue;
        }

        // Inside object/array literal at module level?
        // Check if the enclosing scope is an object literal
        let depth = 0;
        let inObjectLiteral = false;
        for (let j = i - 1; j >= 0 && j >= i - 30; j--) {
          const l = lines[j];
          depth += (l.match(/\}/g) || []).length - (l.match(/\{/g) || []).length;
          if (depth > 0) continue;

          // Found the enclosing scope start
          const t = l.trim();
          if (/const\s+\w+\s*=\s*\{/.test(t) || /const\s+\w+\s*:\s*\{/.test(t)) {
            inObjectLiteral = true;
          }
          if (/const\s+\w+\s*=\s*\[/.test(t)) {
            inObjectLiteral = true; // array literal
          }
          break;
        }

        if (inObjectLiteral) {
          lines[i] = '';
          modified = true;
          fixCount++;
          continue;
        }

        // Inside async function at module level?
        let inAsync = false;
        let asyncDepth = 0;
        for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
          const l = lines[j];
          asyncDepth += (l.match(/\}/g) || []).length - (l.match(/\{/g) || []).length;
          if (asyncDepth > 0) continue;

          const t = l.trim();
          if (/async\s*\(/.test(t) || /=>\s*async/.test(t) || /async\s+function/.test(t)) {
            inAsync = true;
          }
          // Check if parent scope is a component
          if (/const\s+[A-Z]\w*|function\s+[A-Z]\w*/.test(t)) {
            // This is inside a component, so useTranslation is fine
            inAsync = false;
            break;
          }
          break;
        }

        if (inAsync) {
          lines[i] = '';
          modified = true;
          fixCount++;
          continue;
        }

        // Inside useMemo?
        let inUseMemo = false;
        let memoDepth = 0;
        for (let j = i - 1; j >= i - 20 && j >= 0; j--) {
          const l = lines[j];
          memoDepth += (l.match(/\}/g) || []).length - (l.match(/\{/g) || []).length;
          if (memoDepth > 0) continue;
          if (/useMemo\s*\(\s*\(/.test(l) || /useMemo\s*\(\s*\(\s*\)\s*=>/.test(l)) {
            inUseMemo = true;
          }
          break;
        }

        if (inUseMemo) {
          lines[i] = '';
          modified = true;
          fixCount++;
          continue;
        }
      }
    }
  }

  // Step 2: Track component boundaries and replace t() outside components
  // with i18n.t()

  let inComponent = false;
  let componentBraceStart = -1;
  let braceDepth = 0;
  let componentBodyStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip interfaces
    if (/^\s*interface\s+\w+/.test(line)) {
      inInterface = true;
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      braceDepthAtInterfaceStart = opens - closes;
      if (braceDepthAtInterfaceStart <= 0) inInterface = false;
      continue;
    }

    if (inInterface) {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      braceDepthAtInterfaceStart += opens - closes;
      if (braceDepthAtInterfaceStart <= 0) inInterface = false;
      continue;
    }

    // Check for component start
    if (!inComponent && isComponentStart(line)) {
      inComponent = true;
      braceDepth = 0;
      // Find the opening brace of the component body
      let foundOpen = false;
      for (let j = i; j < lines.length; j++) {
        const l = lines[j];
        for (const ch of l) {
          if (ch === '{') {
            braceDepth++;
            foundOpen = true;
          }
          if (ch === '}') braceDepth--;
        }
        if (foundOpen && braceDepth > 0) {
          componentBodyStart = j + 1;
          break;
        }
      }
      // Process lines from i to componentBodyStart (these are the signature lines, not body)
      // Actually, the component body starts after componentBodyStart
      // But lines before the opening brace might also have t() calls in decorators etc.
      // For safety, just continue normal processing
    }

    // Check for component end
    if (inComponent && braceDepth === 0 && i > componentBodyStart) {
      // We're past the component body
      // Actually this check is tricky. Let's use brace counting instead.
    }

    // Simple approach: if we're NOT inside a component body, replace t() with i18n.t()
    // We track this by checking if the current line is inside a component function

    // For now, let's use a simpler heuristic:
    // A line is "module-level" if it's inside a const/object/array at module scope
    // or inside a module-level function (non-component)

    const hasTCall = /\bt\s*\(\s*['"`]/.test(line) &&
      !/i18n\.t\s*\(/.test(line) &&
      !/const\s*\{\s*t\s*\}/.test(line) &&
      !/useTranslation/.test(line) &&
      !/^\s*\/\//.test(line);

    if (hasTCall) {
      // Check if this line is inside a component body
      // Simple check: is there a component start before this line,
      // and are we still inside its braces?

      // Actually, let's check if the line is at module level context
      // Module level context = inside const objects/arrays/functions declared at indent 0
      // or inside async adapters/useMemo

      // Check: is this line inside a module-level const block?
      let isModuleContext = false;

      // If indent is 0 and it's not a component start, it's module level
      if (getIndent(line) === 0 && !isComponentStart(line) && !/^\s*\/\//.test(line)) {
        isModuleContext = true;
      }

      // Check if inside a module-level const object (const xxx = { ... })
      // by looking backwards for the scope start
      if (!isModuleContext) {
        let searchDepth = 0;
        for (let j = i - 1; j >= 0 && j >= i - 50; j--) {
          const l = lines[j];
          searchDepth += (l.match(/\}/g) || []).length - (l.match(/\{/g) || []).length;
          if (searchDepth > 0) continue;

          const t = l.trim();
          // Found enclosing scope
          if (/const\s+\w+\s*=\s*\{/.test(t) && getIndent(l) === 0) {
            isModuleContext = true;
            break;
          }
          if (/const\s+\w+\s*=\s*\[/.test(t) && getIndent(l) === 0) {
            isModuleContext = true;
            break;
          }
          // Module-level function
          if (/(?:function|const)\s+\w+\s*(?:<[^>]*>)?\s*\(|=>\s*\{|=.*async/.test(t) && getIndent(l) === 0) {
            // Check if it's a component (starts with uppercase)
            const compMatch = t.match(/(?:function|const)\s+([A-Z]\w*)/);
            if (compMatch) {
              // This is a component, so we're inside a component body
              isModuleContext = false;
            } else {
              isModuleContext = true;
            }
            break;
          }
          // Inside useMemo callback
          if (/useMemo\s*\(/.test(t)) {
            isModuleContext = true;
            break;
          }
          // Inside an async adapter function
          if (/async\s*\(/.test(t) || /=>\s*async/.test(t)) {
            // Check if parent is module level
            let parentDepth = 0;
            for (let k = j - 1; k >= 0 && k >= j - 30; k--) {
              const pl = lines[k];
              parentDepth += (pl.match(/\}/g) || []).length - (pl.match(/\{/g) || []).length;
              if (parentDepth > 0) continue;
              const pt = pl.trim();
              if (/const\s+\w+\s*=/.test(pt) && getIndent(pl) === 0) {
                // Check if this const is a component
                const cMatch = pt.match(/const\s+([A-Z]\w*)/);
                if (cMatch) {
                  isModuleContext = false;
                } else {
                  isModuleContext = true;
                }
                break;
              }
              if (getIndent(pl) === 0) break;
            }
            break;
          }
          if (getIndent(l) === 0) break;
        }
      }

      if (isModuleContext) {
        let newLine = line.replace(/\bt\s*\(\s*'/g, "i18n.t('");
        newLine = newLine.replace(/\bt\s*\(\s*"/g, 'i18n.t("');
        newLine = newLine.replace(/\bt\s*\(\s*`/g, 'i18n.t(`');
        if (newLine !== line) {
          lines[i] = newLine;
          modified = true;
          fixCount++;
        }
      }
    }
  }

  // Step 3: For component bodies that use t() but don't have useTranslation,
  // add the hook. Find component functions and check.
  for (let i = 0; i < lines.length; i++) {
    if (!isComponentStart(lines[i])) continue;

    const compMatch = lines[i].match(/(?:const|function)\s+([A-Z]\w*)/);
    if (!compMatch) continue;

    // Find component body boundaries
    let bDepth = 0;
    let bodyStart = -1;
    let bodyEnd = -1;
    let foundOpen = false;

    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { bDepth++; foundOpen = true; }
        if (ch === '}') bDepth--;
      }
      if (foundOpen && bDepth > 0 && bodyStart === -1) {
        bodyStart = j + 1;
      }
      if (foundOpen && bDepth === 0 && bodyStart !== -1) {
        bodyEnd = j;
        break;
      }
    }

    if (bodyStart === -1 || bodyEnd === -1) continue;

    // Check if t() is used in body but useTranslation is not called
    let usesT = false;
    let hasUseTrans = false;
    for (let j = bodyStart; j <= bodyEnd; j++) {
      const l = lines[j];
      if (/\bt\s*\(\s*['"`]/.test(l) && !/i18n\.t\s*\(/.test(l)) {
        usesT = true;
      }
      if (/useTranslation\s*\(/.test(l)) {
        hasUseTrans = true;
      }
    }

    if (usesT && !hasUseTrans) {
      // Find proper insertion point (after opening brace, skip empty lines)
      let insertIdx = bodyStart;
      while (insertIdx < bodyEnd && lines[insertIdx].trim() === '') insertIdx++;

      // Determine indentation
      const indent = lines[insertIdx] ? lines[insertIdx].match(/^(\s*)/)[1] : '  ';

      // Check if there's already a useTranslation import
      const ns = namespace;
      lines.splice(insertIdx, 0, `${indent}const { t } = useTranslation('${ns}');`);
      modified = true;
      fixCount++;
      // Adjust bodyEnd since we inserted a line
      bodyEnd++;
    }
  }

  // Step 4: Ensure import i18n from '@/i18n' exists if i18n.t() is used
  const usesI18nT = lines.some(l => /i18n\.t\s*\(/.test(l));
  const hasImport = hasI18nImport(lines);

  if (usesI18nT && !hasImport) {
    const lastImport = getLastImportLine(lines);
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, "import i18n from '@/i18n';");
      modified = true;
      fixCount++;
    }
  }

  // Step 5: Ensure useTranslation import exists if useTranslation() is called
  const usesUseTrans = lines.some(l => /useTranslation\s*\(/.test(l) && !/import\s/.test(l));
  const hasUseTransImport = hasUseTranslationImport(lines);

  if (usesUseTrans && !hasUseTransImport) {
    const lastImport = getLastImportLine(lines);
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, "import { useTranslation } from 'react-i18next';");
      modified = true;
      fixCount++;
    }
  }

  if (modified) {
    if (!dryRun) {
      fs.writeFileSync(filePath, lines.join('\n'));
    }
    filesFixed++;
    totalFixed += fixCount;
    if (verbose) {
      console.log(`  Fixed ${fixCount} issues in ${path.relative(PAGES_DIR, filePath)}`);
    }
  }

  return fixCount;
}

function getIndent(line) {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
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

console.log(`\n=== V219 P2: Fix module-level t() calls ===`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
console.log(`Modules: ${P2_MODULES.join(', ')}\n`);

for (const mod of P2_MODULES) {
  const modDir = path.join(PAGES_DIR, mod);
  if (!fs.existsSync(modDir)) {
    if (verbose) console.log(`Skipping ${mod} (directory not found)`);
    continue;
  }

  console.log(`Processing ${mod}...`);
  let modFixes = 0;

  walkDir(modDir, '.tsx', (filePath) => {
    try {
      const fixes = processFile(filePath, mod);
      modFixes += fixes;
    } catch (e) {
      console.error(`  ERROR processing ${filePath}: ${e.message}`);
    }
  });

  console.log(`  ${mod}: ${modFixes} fixes`);
}

console.log(`\n=== Summary ===`);
console.log(`Files fixed: ${filesFixed}`);
console.log(`Total fixes: ${totalFixed}`);
console.log(`Mode: ${dryRun ? 'DRY RUN (no files written)' : 'WRITE (files updated)'}`);
