#!/usr/bin/env node
'use strict';

/* =======================================================================
 *  check-props-alignment.cjs — Props Field Realness AST Scanner (V258)
 *
 *  Scans apps/web/src/modules/{module}/config.ts for RouteConfigV2<PropsType>
 *  declarations, extracts the Props interface fields, then parses the
 *  corresponding @/pages/<module>/<Page>.tsx to detect which props fields
 *  are actually destructured in the component body.
 *
 *  Reports:
 *    - Per-route: declared fields, destructured fields, realness %
 *    - Summary: overall field realness, routes below 90% threshold
 *
 *  Usage:
 *    node scripts/ci/check-props-alignment.cjs                # print report
 *    node scripts/ci/check-props-alignment.cjs --json          # JSON output
 *    node scripts/ci/check-props-alignment.cjs --threshold 90  # fail below %
 * ======================================================================= */

const fs = require('fs');
const path = require('path');

let ts;
try { ts = require('typescript'); } catch {
  console.error('[FATAL] typescript module not available. Install it first: pnpm add -w typescript');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '../..');
const WEB_SRC = path.join(ROOT, 'apps/web/src');
const MODULES_DIR = path.join(WEB_SRC, 'modules');

// Built-in TS utility types — not user-defined Props interfaces
const BUILTIN_TYPES = new Set(['Record', 'Partial', 'Pick', 'Omit', 'Readonly', 'Required', 'string', 'unknown', 'any', 'never', 'void']);

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const thresholdArg = args.find(a => a.startsWith('--threshold='));
const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : 0;

/* ============================================================
 *  Helpers
 * ============================================================ */
function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
}

function resolveImportPath(importSpecifier) {
  // @/pages/pdm/PdmProductConfigPage -> apps/web/src/pages/pdm/PdmProductConfigPage.tsx
  if (importSpecifier.startsWith('@/')) {
    const rel = importSpecifier.slice(2);
    const base = path.join(WEB_SRC, rel);
    for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
      if (fs.existsSync(base + ext)) return base + ext;
    }
  }
  return null;
}

/* ============================================================
 *  Step 1: Extract routes from config.ts
 *
 *  Pattern A: const xxxRoute: RouteConfigV2<PropsType> = { element: lazyWithRetry(() => import('...'), '...'), ... }
 *  Pattern B: { element: lazyWithRetry(() => import('...'), '...'), ... } as RouteConfigV2<PropsType>
 * ============================================================ */
function extractRoutesFromConfig(configPath) {
  const sourceFile = parseFile(configPath);
  const routes = [];

  function extractImportPath(exprNode) {
    const text = exprNode.getText(sourceFile);
    const m = text.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    return m ? m[1] : null;
  }

  function visit(node) {
    // Pattern A: variable declarations with type annotation RouteConfigV2<X>
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!decl.type) continue;
        const typeText = decl.type.getText(sourceFile);
        const match = typeText.match(/RouteConfigV2<\s*([A-Za-z_][A-Za-z0-9_]*)/);
        if (!match) continue;

        const propsTypeName = match[1];
        if (BUILTIN_TYPES.has(propsTypeName)) continue;
        const varName = decl.name && ts.isIdentifier(decl.name) ? decl.name.text : '?';
        const importPath = decl.initializer ? extractImportPath(decl.initializer) : null;

        routes.push({ varName, propsTypeName, importPath, configPath });
      }
    }

    // Pattern B: AsExpression — { ... } as RouteConfigV2<PropsType>
    if (ts.isAsExpression(node)) {
      const typeText = node.type.getText(sourceFile);
      const match = typeText.match(/RouteConfigV2<\s*([A-Za-z_][A-Za-z0-9_]*)/);
      if (match && !BUILTIN_TYPES.has(match[1])) {
        const propsTypeName = match[1];
        const importPath = extractImportPath(node.expression);
        // Derive varName from import path (e.g., '@/pages/mes/FooPage' → 'fooRoute')
        let varName = '?';
        if (importPath) {
          const base = importPath.split('/').pop() || '?';
          varName = base.charAt(0).toLowerCase() + base.slice(1) + 'Route';
        }
        routes.push({ varName, propsTypeName, importPath, configPath });
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return routes;
}

/* ============================================================
 *  Step 2: Extract Props interface/type fields from config.ts
 *
 *  Note: interfaces that `extends ListPageProps` / `extends FormPageProps`
 *  have 0 own members → realness defaults to 100% (no fields to mismatch).
 *  This correctly reflects that the interface is fully typed via base type.
 * ============================================================ */
function extractPropsFields(configPath, propsTypeName) {
  const sourceFile = parseFile(configPath);
  const fields = [];

  function visit(node) {
    // Interface declaration: interface Foo { field?: type; }
    if (ts.isInterfaceDeclaration(node) && node.name.text === propsTypeName) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          fields.push(member.name.text);
        }
      }
    }
    // Type alias: type Foo = { field?: type; }
    if (ts.isTypeAliasDeclaration(node) && node.name.text === propsTypeName) {
      if (node.type && ts.isTypeLiteralNode(node.type)) {
        for (const member of node.type.members) {
          if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
            fields.push(member.name.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return fields;
}

/* ============================================================
 *  Step 3: Extract destructured props from page component
 *
 *  Detects patterns like:
 *    function Page({ field1, field2 }: Props) { ... }
 *    const Page: React.FC<Props> = ({ field1, field2 }) => { ... }
 *    export default function Page({ field1, ...rest }: Props) { ... }
 * ============================================================ */
function extractDestructuredProps(pagePath, propsTypeName) {
  if (!pagePath || !fs.existsSync(pagePath)) return { fields: [], found: false };

  const sourceFile = parseFile(pagePath);
  const fields = [];

  function visit(node) {
    // Function declaration: function Page({ a, b }: Props) { ... }
    if (ts.isFunctionDeclaration(node) && node.parameters.length > 0) {
      const param = node.parameters[0];
      if (param.name && ts.isObjectBindingPattern(param.name)) {
        for (const element of param.name.elements) {
          if (element.name && ts.isIdentifier(element.name)) {
            fields.push(element.name.text);
          } else if (element.propertyName && ts.isIdentifier(element.propertyName)) {
            // Renamed: { propertyName: name }
            fields.push(element.propertyName.text);
          }
        }
      }
    }

    // Arrow function: const Page = ({ a, b }: Props) => { ... }
    if (ts.isArrowFunction(node) && node.parameters.length > 0) {
      const param = node.parameters[0];
      if (param.name && ts.isObjectBindingPattern(param.name)) {
        for (const element of param.name.elements) {
          if (element.name && ts.isIdentifier(element.name)) {
            fields.push(element.name.text);
          } else if (element.propertyName && ts.isIdentifier(element.propertyName)) {
            fields.push(element.propertyName.text);
          }
        }
      }
    }

    // Variable declaration with arrow function initializer
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isArrowFunction(node.initializer)) {
      const arrow = node.initializer;
      if (arrow.parameters.length > 0) {
        const param = arrow.parameters[0];
        if (param.name && ts.isObjectBindingPattern(param.name)) {
          for (const element of param.name.elements) {
            if (element.name && ts.isIdentifier(element.name)) {
              fields.push(element.name.text);
            } else if (element.propertyName && ts.isIdentifier(element.propertyName)) {
              fields.push(element.propertyName.text);
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return { fields, found: true };
}

/* ============================================================
 *  Main scan
 * ============================================================ */
function runScan() {
  const results = [];
  const modules = fs.existsSync(MODULES_DIR)
    ? fs.readdirSync(MODULES_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    : [];

  for (const modName of modules) {
    const configPath = path.join(MODULES_DIR, modName, 'config.ts');
    if (!fs.existsSync(configPath)) continue;

    const routes = extractRoutesFromConfig(configPath);
    for (const route of routes) {
      const declaredFields = extractPropsFields(configPath, route.propsTypeName);
      const pagePath = route.importPath ? resolveImportPath(route.importPath) : null;
      const { fields: destructuredFields, found } = extractDestructuredProps(pagePath, route.propsTypeName);

      // Calculate realness
      const declaredSet = new Set(declaredFields);
      const destructuredSet = new Set(destructuredFields);
      const usedAndDeclared = [...destructuredSet].filter(f => declaredSet.has(f));
      const declaredNotUsed = declaredFields.filter(f => !destructuredSet.has(f));
      const usedNotDeclared = [...destructuredSet].filter(f => !declaredSet.has(f));

      const realness = declaredFields.length > 0
        ? Math.round((usedAndDeclared.length / declaredFields.length) * 100)
        : 100;

      results.push({
        module: modName,
        route: route.varName,
        propsType: route.propsTypeName,
        pagePath: pagePath ? path.relative(ROOT, pagePath) : null,
        pageFound: found,
        declaredFields,
        destructuredFields,
        declaredNotUsed,
        usedNotDeclared,
        realness,
      });
    }
  }

  return results;
}

/* ============================================================
 *  Report
 * ============================================================ */
function printReport(results) {
  console.log('');
  console.log('Props Alignment Scanner (V258)');
  console.log('=============================');
  console.log(`  Routes scanned: ${results.length}`);

  const belowThreshold = threshold > 0 ? results.filter(r => r.realness < threshold) : [];
  const notFound = results.filter(r => !r.pageFound);
  const avgRealness = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.realness, 0) / results.length)
    : 0;

  console.log(`  Average realness: ${avgRealness}%`);
  console.log(`  Pages not found: ${notFound.length}`);
  if (threshold > 0) {
    console.log(`  Below ${threshold}% threshold: ${belowThreshold.length}`);
  }

  console.log('');
  console.log('  ── Per-route detail ──');
  for (const r of results) {
    const status = !r.pageFound ? 'PAGE-NOT-FOUND' : r.realness < 90 ? 'LOW-REALNESS' : 'OK';
    const flag = !r.pageFound ? '⚠️' : r.realness < 90 ? '⚠️' : '✅';
    console.log(`  ${flag} ${r.module}/${r.route} [${r.propsType}] realness=${r.realness}% (${status})`);
    if (r.pagePath) {
      console.log(`     page: ${r.pagePath}`);
    }
    if (r.declaredFields.length > 0) {
      console.log(`     declared: [${r.declaredFields.join(', ')}]`);
    }
    if (r.destructuredFields.length > 0) {
      console.log(`     destructured: [${r.destructuredFields.join(', ')}]`);
    }
    if (r.declaredNotUsed.length > 0) {
      console.log(`     declared-but-unused: [${r.declaredNotUsed.join(', ')}]`);
    }
    if (r.usedNotDeclared.length > 0) {
      console.log(`     used-but-not-declared: [${r.usedNotDeclared.join(', ')}]`);
    }
  }

  if (notFound.length > 0) {
    console.log('');
    console.log('  ── Pages not found ──');
    for (const r of notFound) {
      console.log(`    ${r.module}/${r.route} -> ${r.propsType} (import: ${r.pagePath || 'N/A'})`);
    }
  }

  console.log('');
  if (threshold > 0 && belowThreshold.length > 0) {
    console.log(`  exit code: 1 (${belowThreshold.length} routes below ${threshold}% threshold)`);
    process.exitCode = 1;
  } else {
    console.log(`  exit code: 0`);
  }
}

/* ============================================================
 *  CLI
 * ============================================================ */
const results = runScan();

if (jsonMode) {
  console.log(JSON.stringify({
    version: 'props-alignment@1.0.0',
    createdAt: new Date().toISOString(),
    routeCount: results.length,
    avgRealness: results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.realness, 0) / results.length)
      : 0,
    routes: results,
  }, null, 2));
} else {
  printReport(results);
}
