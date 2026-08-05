/**
 * Patch react-transition-group@4.x and dom-helpers@5.x for ESM compatibility.
 *
 * These packages ship ESM files whose internal relative imports omit the ".js"
 * extension, and expose subpaths as directories (e.g. "react-transition-group/Transition")
 * without proper "exports" fields. Under Vitest's ESM resolver this breaks with:
 *   - "Directory import '...' is not supported resolving ES modules"
 *   - "Cannot find module '.../esm/CSSTransition' imported from .../esm/index.js"
 *
 * This script (run via `pnpm prepare` after every install) applies 4 fixes to
 * every copy found under node_modules/.pnpm and the top-level node_modules:
 *   1. Top-level package.json "exports" with proper subpath mapping (import -> esm, require -> cjs)
 *   2. Sub-directory index.mjs / index.js fallback entry files
 *   3. ".js" extension appended to all relative imports inside esm/*.js
 *   4. utils/* wildcard exports when applicable
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PNPM_DIR = path.join(ROOT, 'node_modules', '.pnpm');

/** Recursively walk node_modules/.pnpm and collect every <pkg>/package.json path. */
function findPackageCopies(pkgName) {
  const results = [];
  const seen = new Set();
  // Handle scoped packages: @scope/pkg → look for dir "@scope" then "pkg" inside
  const parts = pkgName.split('/');
  const leafName = parts[parts.length - 1];
  const scopeName = parts.length > 1 ? parts[0] : null;

  // 1. Top-level node_modules/<pkg>
  const top = path.join(ROOT, 'node_modules', pkgName);
  if (fs.existsSync(path.join(top, 'package.json'))) {
    results.push(top);
    seen.add(fs.realpathSync(top));
  }

  // 2. Walk .pnpm (bounded depth to avoid perf issues)
  if (!fs.existsSync(PNPM_DIR)) return results;

  function walk(dir, depth) {
    if (depth > 8) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      // For scoped packages, match the leaf name and verify scope via path
      if (entry.name === leafName) {
        const pkgJson = path.join(fullPath, 'package.json');
        if (fs.existsSync(pkgJson)) {
          // For scoped packages, verify the parent dir matches the scope
          if (scopeName) {
            const parentName = path.basename(path.dirname(fullPath));
            if (parentName !== scopeName) continue;
          }
          // Skip @types packages and dedupe by real path
          const realPath = fs.realpathSync(fullPath);
          if (!seen.has(realPath) && !fullPath.includes('@types')) {
            seen.add(realPath);
            results.push(fullPath);
          }
        }
      }
      // Keep walking (pnpm nests node_modules inside package dirs)
      walk(fullPath, depth + 1);
    }
  }
  walk(PNPM_DIR, 0);
  return results;
}

function ensureRelative(p) {
  if (!p) return './index.js';
  return p.startsWith('./') ? p : './' + p;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

/** Append ".js" to bare relative imports inside ESM files. */
function patchEsmExtensions(esmDir) {
  let patched = 0;
  if (!fs.existsSync(esmDir)) return 0;

  function processDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        processDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const src = fs.readFileSync(fullPath, 'utf-8');
        const fileDir = path.dirname(fullPath);
        const re = new RegExp(
          "(import\\s+|from\\s+|export\\s+[^;]+\\s+from\\s+)(['\"])((?:\\./|\\.\\./)[^'\"]+)(\\2)",
          'g'
        );
        const replaced = src.replace(re, (match, prefix, q, importPath, q2) => {
          // Strip trailing slash for basename check
          const cleanPath = importPath.replace(/\/$/, '');
          const base = path.basename(cleanPath);
          if (base === '' || base === '..' || base === '.' || base.includes('.')) {
            return match; // already has extension
          }
          // Only add .js if the target file exists and there's NO directory with that name
          const targetFile = path.resolve(fileDir, cleanPath + '.js');
          const targetDir = path.resolve(fileDir, cleanPath);
          if (fs.existsSync(targetFile) && !fs.existsSync(targetDir)) {
            return `${prefix}${q}${importPath}.js${q2}`;
          }
          return match;
        });
        if (replaced !== src) {
          fs.writeFileSync(fullPath, replaced);
          patched++;
        }
      }
    }
  }
  processDir(esmDir);
  return patched;
}

/** Fix imports where './Xxx.js' doesn't exist but './Xxx/' directory does (→ './Xxx/index.js'). */
function fixDirImports(esmDir) {
  let fixed = 0;
  if (!fs.existsSync(esmDir)) return 0;

  function processDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        processDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const src = fs.readFileSync(fullPath, 'utf-8');
        const fileDir = path.dirname(fullPath);
        const re = new RegExp(
          "(import\\s+|from\\s+|export\\s+[^;]+\\s+from\\s+)(['\"])((?:\\./|\\.\\./)[^'\"]+)(\\2)",
          'g'
        );
        const replaced = src.replace(re, (match, prefix, q, importPath, q2) => {
          if (!importPath.startsWith('./') && !importPath.startsWith('../')) return match;
          const clean = importPath.replace(/\/$/, '');
          const base = path.basename(clean);
          if (!base.includes('.js')) return match; // no .js extension to fix
          const targetFile = path.join(fileDir, clean);
          const targetDir = path.join(fileDir, clean.replace(/\.js$/, ''));
          if (!fs.existsSync(targetFile) && fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
            return `${prefix}${q}${clean.replace(/\.js$/, '/index.js')}${q2}`;
          }
          return match;
        });
        if (replaced !== src) {
          fs.writeFileSync(fullPath, replaced);
          fixed++;
        }
      }
    }
  }
  processDir(esmDir);
  return fixed;
}

function patchPackage(pkgDir) {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkg = readJson(pkgJsonPath);
  const name = pkg.name || path.basename(pkgDir);
  const version = pkg.version || '?';

  const hasEsm = fs.existsSync(path.join(pkgDir, 'esm'));
  const hasCjs = fs.existsSync(path.join(pkgDir, 'cjs'));
  const esmDir = path.join(pkgDir, 'esm');
  const cjsDir = path.join(pkgDir, 'cjs');

  const exports = {};
  const subdirsPatched = [];

  // 1. Top-level main entry
  const main = ensureRelative(pkg.main || (hasCjs ? './cjs/index.js' : './index.js'));
  const mod = ensureRelative(pkg.module || pkg.main || main);
  exports['.'] = { require: main, import: mod };

  // 2. Sub-directories that have their own package.json (e.g. Transition/, addClass/)
  let dirEntries = [];
  try {
    dirEntries = fs.readdirSync(pkgDir, { withFileTypes: true });
  } catch {
    /* ignore */
  }
  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    if (['cjs', 'esm', 'node_modules', 'dist', '.bin', 'utils'].includes(entry.name)) continue;
    const subPath = path.join(pkgDir, entry.name);
    const subPkgJson = path.join(subPath, 'package.json');
    if (!fs.existsSync(subPkgJson)) continue;

    subdirsPatched.push(entry.name);
    const sub = entry.name;

    // Create index.mjs / index.js fallback if missing
    if (hasEsm) {
      const idxMjs = path.join(subPath, 'index.mjs');
      if (!fs.existsSync(idxMjs)) {
        fs.writeFileSync(
          idxMjs,
          `import mod from '../esm/${sub}.js';\nexport default mod;\nexport * from '../esm/${sub}.js';\n`
        );
      }
    }
    if (hasCjs) {
      const idxJs = path.join(subPath, 'index.js');
      if (!fs.existsSync(idxJs)) {
        fs.writeFileSync(idxJs, `module.exports = require('../cjs/${sub}.js');\n`);
      }
    }

    const cjsTarget = `./cjs/${sub}.js`;
    const esmTarget = `./esm/${sub}.js`;
    exports[`./${sub}`] = { require: cjsTarget, import: esmTarget };
    exports[`./${sub}.js`] = { require: cjsTarget, import: esmTarget };
  }

  // 3. ESM .js files as extensionless subpaths
  if (hasEsm) {
    let esmFiles = [];
    try {
      esmFiles = fs.readdirSync(esmDir);
    } catch {
      /* ignore */
    }
    for (const f of esmFiles) {
      const stem = f.replace(/\.js$/, '');
      if (f.endsWith('.js') && stem !== 'index') {
        const cjsFile = path.join(cjsDir, `${stem}.js`);
        if (hasCjs && !fs.existsSync(cjsFile)) continue;
        const cjsTarget = `./cjs/${stem}.js`;
        const esmTarget = `./esm/${stem}.js`;
        if (!exports[`./${stem}`]) exports[`./${stem}`] = { require: cjsTarget, import: esmTarget };
        if (!exports[`./${stem}.js`]) exports[`./${stem}.js`] = { require: cjsTarget, import: esmTarget };
      }
    }
  }

  // 4. utils/* wildcard
  if (fs.existsSync(path.join(esmDir, 'utils'))) {
    exports['./utils/*'] = { require: './cjs/utils/*.js', import: './esm/utils/*.js' };
    exports['./utils/*.js'] = { require: './cjs/utils/*.js', import: './esm/utils/*.js' };
  }

  // 4b. cjs/* and esm/* wildcard (MUI internal imports use these subpaths)
  if (hasCjs) {
    exports['./cjs/*'] = './cjs/*.js';
    exports['./cjs/*.js'] = './cjs/*.js';
  }
  if (hasEsm) {
    exports['./esm/*'] = './esm/*.js';
    exports['./esm/*.js'] = './esm/*.js';
  }

  pkg.exports = exports;
  writeJson(pkgJsonPath, pkg);

  // 5. Patch ESM relative imports to include .js extension
  const esmPatched = patchEsmExtensions(esmDir);

  console.log(
    `  ${name}@${version}: exports=${Object.keys(exports).length}, subdirs=${subdirsPatched.length}, esm_patched=${esmPatched}`
  );
}

// --- Main ---
const CHECK_MODE = process.argv.includes('--check');

const TARGETS = ['react-transition-group', 'dom-helpers'];
let totalCopies = 0;
let unpatched = 0;

for (const pkgName of TARGETS) {
  const copies = findPackageCopies(pkgName);
  console.log(`\n[${pkgName}] found ${copies.length} copies`);
  for (const dir of copies) {
    try {
      if (CHECK_MODE) {
        const pkgJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        if (!pkgJson.exports) {
          console.warn(`  ⚠️  UNPATCHED: ${dir} (no "exports" field)`);
          unpatched++;
        } else {
          console.log(`  ✓ patched: ${dir}`);
        }
      } else {
        patchPackage(dir);
        totalCopies++;
      }
    } catch (e) {
      console.warn(`  SKIP ${dir}: ${e.message}`);
    }
  }
}

// --- OpenTelemetry: patch build/esm/ relative imports (same .js extension issue) ---
const OTEL_TARGETS = ['@opentelemetry/resources'];
for (const pkgName of OTEL_TARGETS) {
  const copies = findPackageCopies(pkgName);
  console.log(`\n[${pkgName}] found ${copies.length} copies`);
  for (const dir of copies) {
    const buildEsm = path.join(dir, 'build', 'esm');
    if (fs.existsSync(buildEsm)) {
      if (CHECK_MODE) {
        // Check if any extensionless imports remain
        let hasIssue = false;
        function checkDir(d) {
          for (const f of fs.readdirSync(d, { withFileTypes: true })) {
            const fp = path.join(d, f.name);
            if (f.isDirectory()) { checkDir(fp); continue; }
            if (!f.name.endsWith('.js')) continue;
            const content = fs.readFileSync(fp, 'utf8');
            if (/from\s+['"]\.\.?\/[^'"]+['"]/.test(content) && !/from\s+['"]\.\.?\/[^'"]+\.js['"]/.test(content)) {
              hasIssue = true;
            }
          }
        }
        checkDir(buildEsm);
        if (hasIssue) {
          console.warn(`  ⚠️  UNPATCHED: ${dir} (extensionless imports found)`);
          unpatched++;
        } else {
          console.log(`  ✓ patched: ${dir}`);
        }
      } else {
        // 1. Add .js to extensionless relative imports
        const patched = patchEsmExtensions(buildEsm);
        // 2. Fix imports where ./Xxx.js doesn't exist but ./Xxx/ directory does
        const dirFixed = fixDirImports(buildEsm);
        console.log(`  @opentelemetry/resources: esm_patched=${patched}, dir_fixed=${dirFixed}`);
        totalCopies++;
      }
    }
  }
}

if (CHECK_MODE) {
  if (unpatched > 0) {
    console.log(`\n❌ ${unpatched} package copy(s) need patching. Run: node scripts/patch-react-transition-group.js`);
    process.exit(1);
  } else {
    console.log(`\n✅ All package copies are properly patched.`);
  }
} else {
  console.log(`\nDone. Patched ${totalCopies} package copies.`);
}
