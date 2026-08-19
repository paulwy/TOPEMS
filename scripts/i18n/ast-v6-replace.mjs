import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const require = createRequire(import.meta.url);
const ts = require('/Users/xingzhai/TOPEMS/apps/web/node_modules/typescript');

const CJK_REGEX = /[\u4E00-\u9FFF]/;

const SKIP_FILES = ['EHSBadges.tsx', 'v54-native-panel.tsx'];

const SKIP_DIRS = ['apps/web/src/api'];

const FILE_NS_MAP = {
  'DataTable.tsx': { ns: 'components.common.dataTable', jsonFile: 'components', startIdx: 7 },
  'Map3DView.tsx': { ns: 'gis.map3DView', jsonFile: 'gis', startIdx: 2 },
  'ToolPanel.tsx': { ns: 'gis.mapModule', jsonFile: 'gis', startIdx: 1 },
  'TemplateEditor.tsx': { ns: 'templates.editor', jsonFile: 'templates', startIdx: 2 },
  'WorkflowDesigner.tsx': { ns: 'workflow.designer', jsonFile: 'workflow', startIdx: 2 },
  'UserMenu.tsx': { ns: 'layouts.userMenu', jsonFile: 'layouts', startIdx: 1 },
  'MicroFrontendLoader.tsx': { ns: 'lib.pluginLoader', jsonFile: 'lib', startIdx: 1 },
  'ModuleLoadingProgress.tsx': { ns: 'lib.pluginLoader', jsonFile: 'lib', startIdx: 11 },
  'PluginLoader.tsx': { ns: 'lib.pluginLoader', jsonFile: 'lib', startIdx: 21 },
  'devtools-panel.tsx': { ns: 'ai.devex', jsonFile: 'ai', startIdx: 7 },
  'MaterialShortagePage.tsx': { ns: 'aps.analytics.materialShortage', jsonFile: 'aps', startIdx: 2 },
  'PlanAdherencePage.tsx': { ns: 'aps.analytics.planAdherence', jsonFile: 'aps', startIdx: 1 },
  'AddressbookFilters.tsx': { ns: 'components.addressbook', jsonFile: 'components', startIdx: 1 },
  'MesOeeDashboardPage.tsx': { ns: 'mes.analytics.oeeDashboard', jsonFile: 'mes', startIdx: 0 },
  'QmsInspectionDetailPage.tsx': { ns: 'qms.inspectionDetail', jsonFile: 'qms', startIdx: 0 },
  'WmsAgeParetoPage.tsx': { ns: 'wms.analytics.agePareto', jsonFile: 'wms', startIdx: 0 },
  'AuditLogPage.tsx': { ns: 'erp.auditLog', jsonFile: 'erp', startIdx: 0 },
};

function shouldSkipFile(relPath) {
  const absPath = path.join(PROJECT_ROOT, relPath);
  const fileName = path.basename(absPath);
  for (const sf of SKIP_FILES) {
    if (fileName === sf) return true;
  }
  for (const sd of SKIP_DIRS) {
    const sdAbs = path.join(PROJECT_ROOT, sd);
    if (absPath.startsWith(sdAbs)) return true;
  }
  return false;
}

function hasCJK(text) {
  return CJK_REGEX.test(text);
}

function countCJK(text) {
  let count = 0;
  for (const ch of text) {
    if (CJK_REGEX.test(ch)) count++;
  }
  return count;
}

function isInTypeContext(parentStack) {
  for (let i = parentStack.length - 1; i >= 0; i--) {
    const p = parentStack[i];
    if (
      ts.isTypeReferenceNode(p) ||
      ts.isTypeLiteralNode(p) ||
      ts.isFunctionTypeNode(p) ||
      ts.isConstructorTypeNode(p) ||
      ts.isIndexedAccessTypeNode(p) ||
      ts.isArrayTypeNode(p) ||
      ts.isUnionTypeNode(p) ||
      ts.isIntersectionTypeNode(p) ||
      ts.isConditionalTypeNode(p) ||
      ts.isMappedTypeNode(p) ||
      ts.isLiteralTypeNode(p) ||
      ts.isTupleTypeNode(p) ||
      ts.isTypeParameterDeclaration(p) ||
      ts.isTypeAliasDeclaration(p) ||
      ts.isInterfaceDeclaration(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodSignature(p) ||
      (ts.isTypeOfExpression(p) && i > 0 && ts.isTypeNode(parentStack[i - 1]))
    ) {
      return true;
    }
  }
  return false;
}

function isImportExportContext(parentStack) {
  if (parentStack.length === 0) return false;
  const last = parentStack[parentStack.length - 1];
  return (
    ts.isImportDeclaration(last) ||
    ts.isExportDeclaration(last) ||
    ts.isExportAssignment(last) ||
    ts.isImportTypeNode(last) ||
    ts.isImportClause(last) ||
    ts.isNamedImports(last) ||
    ts.isImportSpecifier(last) ||
    ts.isNamespaceImport(last) ||
    ts.isExportSpecifier(last) ||
    ts.isNamedExports(last) ||
    ts.isModuleDeclaration(last)
  );
}

function isParameterDefaultWithType(node, parentStack) {
  if (parentStack.length === 0) return false;
  const parent = parentStack[parentStack.length - 1];
  if (ts.isParameter(parent) && parent.initializer === node && parent.type) {
    return true;
  }
  return false;
}

function isVarInitWithType(node, parentStack) {
  if (parentStack.length === 0) return false;
  const parent = parentStack[parentStack.length - 1];
  if (ts.isVariableDeclaration(parent) && parent.type && parent.initializer === node) {
    return true;
  }
  return false;
}

function isJsxTypeArgument(node, parentStack) {
  for (let i = parentStack.length - 1; i >= 0; i--) {
    const p = parentStack[i];
    if (ts.isExpressionWithTypeArguments(p)) {
      return true;
    }
    if (ts.isCallExpression(p) && p.typeArguments && p.typeArguments.length > 0) {
      for (const ta of p.typeArguments) {
        if (ta === node) return true;
      }
    }
    if (ts.isNewExpression(p) && p.typeArguments && p.typeArguments.length > 0) {
      for (const ta of p.typeArguments) {
        if (ta === node) return true;
      }
    }
  }
  return false;
}

function isPropertyTypeAnnotation(node, parentStack) {
  if (parentStack.length < 2) return false;
  const parent = parentStack[parentStack.length - 1];
  const grand = parentStack[parentStack.length - 2];
  if ((ts.isPropertyAssignment(grand) || ts.isPropertySignature(grand)) && grand.initializer === parent) {
    return false;
  }
  if (ts.isPropertyDeclaration(parent) && parent.initializer === node && parent.type) {
    return true;
  }
  return false;
}

function shouldSkipByContext(node, parentStack) {
  if (isInTypeContext(parentStack)) return true;
  if (isImportExportContext(parentStack)) return true;
  if (isParameterDefaultWithType(node, parentStack)) return true;
  if (isVarInitWithType(node, parentStack)) return true;
  if (isJsxTypeArgument(node, parentStack)) return true;
  if (isPropertyTypeAnnotation(node, parentStack)) return true;
  return false;
}

function shouldSkipStringLiteral(node, parentStack) {
  const text = node.text;

  if (typeof text !== 'string') return true;
  if (text.length < 2) return true;
  if (!hasCJK(text)) return true;
  if (countCJK(text) < 2) return true;
  if (/^[\/\\]/.test(text)) return true;

  return shouldSkipByContext(node, parentStack);
}

function shouldSkipTemplateQuasi(text, node, parentStack) {
  if (typeof text !== 'string') return true;
  if (text.length < 2) return true;
  if (!hasCJK(text)) return true;
  if (countCJK(text) < 2) return true;
  return shouldSkipByContext(node, parentStack);
}

function createI18nCall(key, params) {
  const args = [ts.factory.createStringLiteral(key)];
  if (params && params.length > 0) {
    const properties = params.map((expr, idx) => {
      const name = `v${idx}`;
      return ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(name), expr);
    });
    args.push(ts.factory.createObjectLiteralExpression(properties, true));
  }
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('i18n'), 't'),
    undefined,
    args
  );
}

function createI18nJsxExpression(key, params) {
  return ts.factory.createJsxExpression(undefined, createI18nCall(key, params));
}

function buildTemplateKeyParts(node) {
  const quasiTexts = [];
  const expressions = [];

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    quasiTexts.push(node.text);
    return { quasiTexts, expressions, hasSpans: false };
  }

  if (ts.isTemplateExpression(node)) {
    quasiTexts.push(node.head.text);
    for (const span of node.templateSpans) {
      expressions.push(span.expression);
      quasiTexts.push(span.literal.text);
    }
    return { quasiTexts, expressions, hasSpans: true };
  }

  return null;
}

function extractJsxMixedSegments(children) {
  const segments = [];
  for (const child of children) {
    if (ts.isJsxText(child)) {
      segments.push({ kind: 'text', text: child.text, rawNode: child });
    } else if (ts.isJsxExpression(child) && child.expression) {
      segments.push({ kind: 'expr', expr: child.expression, rawNode: child });
    } else {
      return null;
    }
  }
  const hasText = segments.some((s) => s.kind === 'text' && s.text.trim().length > 0);
  const hasExpr = segments.some((s) => s.kind === 'expr');
  if (!hasText || !hasExpr) return null;

  const fullMergedQuasi = segments
    .filter((s) => s.kind === 'text')
    .map((s) => s.text)
    .join(' ');
  if (!hasCJK(fullMergedQuasi) || countCJK(fullMergedQuasi) < 2) return null;

  return segments;
}

function buildPatternFromSegments(segments) {
  let pattern = '';
  const expressions = [];
  let exprIdx = 0;
  for (const seg of segments) {
    if (seg.kind === 'text') {
      pattern += seg.text;
    } else {
      pattern += `{{v${exprIdx}}}`;
      expressions.push(seg.expr);
      exprIdx++;
    }
  }
  return { pattern: pattern.trim(), expressions };
}

function processFile(filePath, nsConfig) {
  const fileName = path.basename(filePath);
  const { ns, jsonFile, startIdx } = nsConfig;

  const originalContent = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(fileName, originalContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const keyMap = new Map();
  let keyCounter = startIdx || 0;

  function getNextKey() {
    const key = `${ns}.k${keyCounter}`;
    keyCounter++;
    return key;
  }

  function getOrCreateKey(text) {
    for (const [k, v] of keyMap.entries()) {
      if (v === text) return k;
    }
    const k = getNextKey();
    keyMap.set(k, text);
    return k;
  }

  function makeI18nImport() {
    return ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(false, ts.factory.createIdentifier('i18n'), undefined),
      ts.factory.createStringLiteral('@/i18n'),
      undefined
    );
  }

  function hasI18nImport(stmts) {
    for (const stmt of stmts) {
      if (ts.isImportDeclaration(stmt)) {
        const moduleSpecifier = stmt.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const modText = moduleSpecifier.text;
          if (modText === '@/i18n' || modText.includes('/i18n') || modText === './i18n') {
            if (stmt.importClause) {
              const ic = stmt.importClause;
              if (ic.name && ic.name.text === 'i18n') return true;
              if (ic.namedBindings && ts.isNamespaceImport(ic.namedBindings) && ic.namedBindings.name.text === 'i18n')
                return true;
            }
          }
        }
      }
    }
    return false;
  }

  function wrapInJsxContext(i18nCall, node, parentStack) {
    const parent = parentStack[parentStack.length - 1];
    if (parent) {
      if (ts.isJsxAttribute(parent) && parent.initializer === node) {
        return ts.factory.createJsxExpression(undefined, i18nCall);
      }
      if (ts.isJsxExpression(parent)) {
        return i18nCall;
      }
    }
    return i18nCall;
  }

  function transformNode(node, parentStack) {
    function visit(child) {
      return transformNode(child, [...parentStack, node]);
    }

    if (ts.isStringLiteral(node)) {
      if (shouldSkipStringLiteral(node, parentStack)) {
        return ts.visitEachChild(node, visit, undefined);
      }
      const text = node.text;
      const key = getOrCreateKey(text);
      const i18nCall = createI18nCall(key);
      return wrapInJsxContext(i18nCall, node, parentStack);
    }

    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text;
      if (shouldSkipTemplateQuasi(text, node, parentStack)) {
        return ts.visitEachChild(node, visit, undefined);
      }
      const key = getOrCreateKey(text);
      const i18nCall = createI18nCall(key);
      return wrapInJsxContext(i18nCall, node, parentStack);
    }

    if (ts.isTemplateExpression(node)) {
      const parts = buildTemplateKeyParts(node);
      if (!parts || parts.expressions.length === 0) {
        return ts.visitEachChild(node, visit, undefined);
      }
      const mergedQuasi = parts.quasiTexts.join(' ');
      if (shouldSkipTemplateQuasi(mergedQuasi, node, parentStack)) {
        return ts.visitEachChild(node, visit, undefined);
      }

      let pattern = '';
      for (let i = 0; i < parts.quasiTexts.length; i++) {
        pattern += parts.quasiTexts[i];
        if (i < parts.expressions.length) {
          pattern += `{{v${i}}}`;
        }
      }
      const key = getOrCreateKey(pattern.trim());
      const i18nCall = createI18nCall(key, parts.expressions);
      return wrapInJsxContext(i18nCall, node, parentStack);
    }

    if (ts.isJsxText(node)) {
      const text = node.text;
      const trimmed = text.trim();
      if (!trimmed || !hasCJK(trimmed) || countCJK(trimmed) < 2) {
        return ts.visitEachChild(node, visit, undefined);
      }
      const key = getOrCreateKey(trimmed);

      const leadingWs = text.match(/^[\s\n\r\t]*/)[0];
      const trailingWs = text.match(/[\s\n\r\t]*$/)[0];

      const result = [];
      if (leadingWs) {
        result.push(ts.factory.createJsxText(leadingWs));
      }
      result.push(createI18nJsxExpression(key));
      if (trailingWs) {
        result.push(ts.factory.createJsxText(trailingWs));
      }
      return result;
    }

    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      let children;
      let isElement = false;
      if (ts.isJsxElement(node)) {
        children = node.children;
        isElement = true;
      } else {
        children = node.children;
      }

      if (!children || children.length === 0) {
        return ts.visitEachChild(node, visit, undefined);
      }

      const visitedChildren = [];
      let childrenChanged = false;
      for (const child of children) {
        const v = transformNode(child, [...parentStack, node]);
        if (Array.isArray(v)) {
          visitedChildren.push(...v);
          childrenChanged = true;
        } else if (v !== child) {
          visitedChildren.push(v);
          childrenChanged = true;
        } else {
          visitedChildren.push(child);
        }
      }

      const segments = extractJsxMixedSegments(visitedChildren);
      if (segments) {
        const { pattern, expressions } = buildPatternFromSegments(segments);
        const key = getOrCreateKey(pattern);

        const newChildren = [];
        const firstRaw = segments[0].rawNode;
        const lastRaw = segments[segments.length - 1].rawNode;

        let firstLeadingWs = '';
        let lastTrailingWs = '';
        if (ts.isJsxText(firstRaw)) {
          const match = firstRaw.text.match(/^[\s\n\r\t]*/);
          if (match) firstLeadingWs = match[0];
        }
        if (ts.isJsxText(lastRaw)) {
          const match = lastRaw.text.match(/[\s\n\r\t]*$/);
          if (match) lastTrailingWs = match[0];
        }

        if (firstLeadingWs) {
          newChildren.push(ts.factory.createJsxText(firstLeadingWs));
        }
        newChildren.push(createI18nJsxExpression(key, expressions));
        if (lastTrailingWs) {
          newChildren.push(ts.factory.createJsxText(lastTrailingWs));
        }

        if (isElement) {
          const visitedOpening = visit(node.openingElement);
          const visitedClosing = node.closingElement ? visit(node.closingElement) : node.closingElement;
          return ts.factory.updateJsxElement(node, visitedOpening, newChildren, visitedClosing);
        } else {
          const visitedOpeningFrag = visit(node.openingFragment);
          const visitedClosingFrag = visit(node.closingFragment);
          return ts.factory.updateJsxFragment(node, visitedOpeningFrag, newChildren, visitedClosingFrag);
        }
      }

      if (childrenChanged) {
        if (isElement) {
          const visitedOpening = visit(node.openingElement);
          const visitedClosing = node.closingElement ? visit(node.closingElement) : node.closingElement;
          return ts.factory.updateJsxElement(node, visitedOpening, visitedChildren, visitedClosing);
        } else {
          const visitedOpeningFrag = visit(node.openingFragment);
          const visitedClosingFrag = visit(node.closingFragment);
          return ts.factory.updateJsxFragment(node, visitedOpeningFrag, visitedChildren, visitedClosingFrag);
        }
      }

      return ts.visitEachChild(node, visit, undefined);
    }

    if (ts.isJsxSelfClosingElement(node)) {
      return ts.visitEachChild(node, visit, undefined);
    }

    return ts.visitEachChild(node, visit, undefined);
  }

  let updatedStatements = [];
  for (const stmt of sourceFile.statements) {
    const visited = transformNode(stmt, []);
    if (Array.isArray(visited)) {
      updatedStatements.push(...visited);
    } else {
      updatedStatements.push(visited);
    }
  }

  if (!hasI18nImport(updatedStatements) && keyMap.size > 0) {
    let lastImportIdx = -1;
    for (let i = 0; i < updatedStatements.length; i++) {
      if (ts.isImportDeclaration(updatedStatements[i])) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx >= 0) {
      updatedStatements.splice(lastImportIdx + 1, 0, makeI18nImport());
    } else {
      updatedStatements.unshift(makeI18nImport());
    }
  }

  const updatedSourceFile = ts.factory.updateSourceFile(
    sourceFile,
    updatedStatements,
    sourceFile.isDeclarationFile,
    sourceFile.referencedFiles,
    sourceFile.typeReferenceDirectives,
    sourceFile.hasNoDefaultLib,
    sourceFile.libReferenceDirectives
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });
  const newContent = printer.printFile(updatedSourceFile);

  return {
    newContent,
    keyMap: Object.fromEntries(keyMap.entries()),
    jsonFile,
  };
}

function updateJsonFiles(lang, jsonFileName, keyMap) {
  const jsonPath = path.join(PROJECT_ROOT, 'apps/web/src/i18n/locales', lang, `${jsonFileName}.json`);
  let json = {};
  if (fs.existsSync(jsonPath)) {
    try {
      json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
      json = {};
    }
  }
  const added = {};
  for (const [k, v] of Object.entries(keyMap)) {
    if (lang === 'zh') {
      json[k] = v;
      added[k] = v;
    } else {
      json[k] = 'TODO: translate';
      added[k] = 'TODO: translate';
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  return added;
}

function removeJsonKeys(lang, jsonFileName, keys) {
  const jsonPath = path.join(PROJECT_ROOT, 'apps/web/src/i18n/locales', lang, `${jsonFileName}.json`);
  if (!fs.existsSync(jsonPath)) return;
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  for (const k of keys) delete json[k];
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

function runTscGlobal() {
  const { spawnSync } = require('child_process');
  const result = spawnSync('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
    cwd: path.join(PROJECT_ROOT, 'apps/web'),
    encoding: 'utf-8',
    timeout: 300000,
  });
  const allOutput = (result.stdout || '') + '\n' + (result.stderr || '');
  return {
    success: result.status === 0,
    allOutput,
    exitCode: result.status,
  };
}

function extractFileErrors(tscOutput, targetRelPath) {
  const targetSuffix = targetRelPath.replace('apps/web/', '');
  const lines = tscOutput.split('\n');
  const errors = [];
  for (const line of lines) {
    if (!line.includes('error TS')) continue;
    if (line.includes(targetSuffix)) {
      errors.push(line.trim());
    }
  }
  return errors;
}

function gitCheckout(relPath) {
  const { spawnSync } = require('child_process');
  spawnSync('git', ['checkout', 'HEAD', '--', relPath], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
  });
}

function cleanBackups(targets) {
  for (const t of targets) {
    const bakPath = path.join(PROJECT_ROOT, t) + '.bak.ast6';
    if (fs.existsSync(bakPath)) {
      try {
        fs.unlinkSync(bakPath);
      } catch (e) {}
    }
  }
}

function main() {
  const targets = [
    'apps/web/src/components/common/DataTable.tsx',
    'apps/web/src/components/gis/modules/Map3DModule/Map3DView.tsx',
    'apps/web/src/components/gis/modules/MapModule/ToolPanel.tsx',
    'apps/web/src/components/templates/TemplateEditor.tsx',
    'apps/web/src/components/workflow/WorkflowDesigner.tsx',
    'apps/web/src/layouts/components/UserMenu.tsx',
    'apps/web/src/lib/plugin-loader/MicroFrontendLoader.tsx',
    'apps/web/src/lib/plugin-loader/ModuleLoadingProgress.tsx',
    'apps/web/src/lib/plugin-loader/PluginLoader.tsx',
    'apps/web/src/microfrontend/devex/devtools-panel.tsx',
    'apps/web/src/pages/aps/analytics/MaterialShortagePage.tsx',
    'apps/web/src/pages/aps/analytics/PlanAdherencePage.tsx',
    'apps/web/src/components/addressbook/AddressbookFilters.tsx',
    'apps/web/src/pages/mes/analytics/MesOeeDashboardPage.tsx',
    'apps/web/src/pages/qms/QmsInspectionDetailPage.tsx',
    'apps/web/src/pages/wms/analytics/WmsAgeParetoPage.tsx',
    'apps/web/src/pages/erp/AuditLogPage.tsx',
  ];

  const filteredTargets = targets.filter((t) => !shouldSkipFile(t));

  cleanBackups(filteredTargets);

  console.log('[STEP 0] Running baseline global TSC...');
  const baselineTsc = runTscGlobal();
  console.log(`[STEP 0] Baseline global exit=${baselineTsc.exitCode}`);

  const results = [];
  const allAddedKeys = { zh: {}, en: {} };
  const currentTargetErrors = {};
  const jsonFilesTouched = new Set();

  for (const t of filteredTargets) {
    currentTargetErrors[t] = extractFileErrors(baselineTsc.allOutput, t);
  }

  for (const relPath of filteredTargets) {
    const fileName = path.basename(relPath);
    const nsConfig = FILE_NS_MAP[fileName];
    if (!nsConfig) {
      console.log(`[SKIP] No NS config for ${fileName}`);
      results.push({ file: relPath, status: 'SKIP', reason: 'No NS config' });
      continue;
    }
    const absPath = path.join(PROJECT_ROOT, relPath);
    const bakPath = absPath + '.bak.ast6';

    console.log(`\n===== Processing: ${fileName} =====`);
    console.log(`[BASELINE ERRORS] ${currentTargetErrors[relPath].length}`);

    fs.copyFileSync(absPath, bakPath);
    console.log(`[BACKUP] ${bakPath}`);

    let result;
    try {
      result = processFile(absPath, nsConfig);
    } catch (err) {
      console.log(`[AST ERROR] ${err.message}`);
      console.log(err.stack);
      gitCheckout(relPath);
      fs.unlinkSync(bakPath);
      results.push({
        file: relPath,
        status: 'FAIL',
        backup: bakPath,
        error: `AST transform error: ${err.message}`,
      });
      continue;
    }

    const replaceCount = Object.keys(result.keyMap).length;
    console.log(`[REPLACE] count=${replaceCount}`);

    if (replaceCount === 0) {
      console.log(`[PASS] No changes needed`);
      fs.unlinkSync(bakPath);
      results.push({
        file: relPath,
        status: 'PASS',
        replaceCount: 0,
        newKeys: 0,
      });
      continue;
    }

    fs.writeFileSync(absPath, result.newContent, 'utf-8');
    jsonFilesTouched.add(result.jsonFile);

    const addedZh = updateJsonFiles('zh', result.jsonFile, result.keyMap);
    const addedEn = updateJsonFiles('en', result.jsonFile, result.keyMap);
    Object.assign(allAddedKeys.zh, addedZh);
    Object.assign(allAddedKeys.en, addedEn);
    console.log(`[JSON] zh+${Object.keys(addedZh).length}, en+${Object.keys(addedEn).length}`);

    console.log('[TSC] Running global TSC to check this file...');
    const tscResult = runTscGlobal();
    const newErrors = extractFileErrors(tscResult.allOutput, relPath);
    const baselineCount = currentTargetErrors[relPath].length;
    const newCount = newErrors.length;

    if (newCount <= baselineCount) {
      console.log(`[TSC] PASS (errors: baseline=${baselineCount}, new=${newCount}, global exit=${tscResult.exitCode})`);
      fs.unlinkSync(bakPath);
      currentTargetErrors[relPath] = newErrors;
      results.push({
        file: relPath,
        status: 'PASS',
        replaceCount,
        newKeys: replaceCount,
        backup: null,
        baselineTscErrors: baselineCount,
        newTscErrors: newCount,
        addedKeys: Object.keys(result.keyMap),
      });
    } else {
      console.log(`[TSC] FAIL - new errors appeared! Rolling back...`);
      const newErrorLines = newErrors.filter((e) => !currentTargetErrors[relPath].includes(e));
      console.log(`[TSC NEW ERRORS]:\n${newErrorLines.join('\n').substring(0, 3000)}`);

      gitCheckout(relPath);
      removeJsonKeys('zh', result.jsonFile, Object.keys(result.keyMap));
      removeJsonKeys('en', result.jsonFile, Object.keys(result.keyMap));
      for (const k of Object.keys(result.keyMap)) {
        delete allAddedKeys.zh[k];
        delete allAddedKeys.en[k];
      }

      results.push({
        file: relPath,
        status: 'FAIL',
        replaceCount,
        newKeys: replaceCount,
        backup: bakPath,
        baselineTscErrors: baselineCount,
        newTscErrors: newCount,
        newErrorLines,
        error: `TSC new errors: ${newErrorLines.length}`,
      });
    }
  }

  console.log('\n===== All files processed, final global TSC =====');
  const finalTsc = runTscGlobal();
  console.log(`[FINAL TSC] exit=${finalTsc.exitCode}`);

  if (!finalTsc.success) {
    const errLines = finalTsc.allOutput.split('\n').filter((l) => l.includes('error TS'));
    const targetSet = new Set(filteredTargets);
    const nonTargetErrors = errLines.filter((l) => {
      for (const tp of filteredTargets) {
        if (l.includes(tp.replace('apps/web/', ''))) return false;
      }
      return true;
    });
    console.log(`[FINAL TSC] total TS error lines=${errLines.length}, non-target=${nonTargetErrors.length}`);

    if (nonTargetErrors.length > 2) {
      console.log(`[FINAL TSC] >2 non-target errors → FULL ROLLBACK`);
      for (const t of filteredTargets) {
        gitCheckout(t);
      }
      for (const lang of ['zh', 'en']) {
        for (const jf of Array.from(jsonFilesTouched)) {
          removeJsonKeys(lang, jf, Object.keys(allAddedKeys[lang]));
        }
      }
      for (const t of filteredTargets) {
        const bak = path.join(PROJECT_ROOT, t) + '.bak.ast6';
        if (fs.existsSync(bak)) {
          try {
            fs.unlinkSync(bak);
          } catch (e) {}
        }
      }
      results.push({
        finalTsc: 'FULL_ROLLBACK',
        nonTargetErrors: nonTargetErrors.length,
      });
    } else {
      console.log(`[FINAL TSC] Acceptable (≤2 non-target errors)`);
      results.push({
        finalTsc: 'PASS_ACCEPTABLE',
        nonTargetErrors: nonTargetErrors.length,
        globalExitCode: finalTsc.exitCode,
      });
    }
  } else {
    console.log(`[FINAL TSC] FULL PASS (exit=0)`);
    results.push({
      finalTsc: 'PASS',
      globalExitCode: finalTsc.exitCode,
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    baselineGlobalTscExit: baselineTsc.exitCode,
    finalGlobalTscExit: finalTsc.exitCode,
    skipFiles: SKIP_FILES,
    skipDirs: SKIP_DIRS,
    results,
    summary: {
      passCount: results.filter((r) => r.status === 'PASS').length,
      failCount: results.filter((r) => r.status === 'FAIL').length,
      skipCount: results.filter((r) => r.status === 'SKIP').length,
      totalAddedZhKeys: Object.keys(allAddedKeys.zh).length,
      totalAddedEnKeys: Object.keys(allAddedKeys.en).length,
    },
    addedKeys: allAddedKeys,
  };

  const reportPath = path.join(PROJECT_ROOT, 'scripts/i18n/ast-v6-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[DONE] Report: ${reportPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main();
