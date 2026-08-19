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

const FILE_NS_MAP = {
  'ListPageTemplate.tsx': { ns: 'templates.listPage', jsonFile: 'templates' },
  'DataTable.tsx': { ns: 'components.common.dataTable', jsonFile: 'components' },
  'MapView.tsx': { ns: 'gis.mapView', jsonFile: 'gis' },
  'QmsSpcControlChartPage.tsx': { ns: 'qms.analytics.spcControlChart', jsonFile: 'qms' },
  'QmsFmeaRiskMatrixPage.tsx': { ns: 'qms.analytics.fmeaRiskMatrix', jsonFile: 'qms' },
};

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

function shouldSkipStringLiteral(node, parentStack) {
  const text = node.text;

  if (typeof text !== 'string') return true;
  if (text.length < 2) return true;
  if (!hasCJK(text)) return true;
  if (countCJK(text) < 2) return true;
  if (/^[\/\\]/.test(text)) return true;

  if (isInTypeContext(parentStack)) return true;
  if (isImportExportContext(parentStack)) return true;
  if (isParameterDefaultWithType(node, parentStack)) return true;
  if (isVarInitWithType(node, parentStack)) return true;
  if (isJsxTypeArgument(node, parentStack)) return true;
  if (isPropertyTypeAnnotation(node, parentStack)) return true;

  return false;
}

function createI18nCall(key) {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('i18n'), 't'),
    undefined,
    [ts.factory.createStringLiteral(key)]
  );
}

function createI18nJsxExpression(key) {
  return ts.factory.createJsxExpression(undefined, createI18nCall(key));
}

function processFile(filePath, nsConfig) {
  const fileName = path.basename(filePath);
  const { ns, jsonFile } = nsConfig;

  const originalContent = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(fileName, originalContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const keyMap = new Map();
  let keyCounter = 0;

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
      const parent = parentStack[parentStack.length - 1];

      if (parent && ts.isJsxAttribute(parent) && parent.initializer === node) {
        return createI18nJsxExpression(key);
      }
      return createI18nCall(key);
    }

    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text;
      if (typeof text !== 'string' || text.length < 2 || !hasCJK(text) || countCJK(text) < 2) {
        return ts.visitEachChild(node, visit, undefined);
      }
      if (isInTypeContext(parentStack) || isImportExportContext(parentStack)) {
        return ts.visitEachChild(node, visit, undefined);
      }
      const key = getOrCreateKey(text);
      const parent = parentStack[parentStack.length - 1];
      if (parent && ts.isJsxAttribute(parent) && parent.initializer === node) {
        return createI18nJsxExpression(key);
      }
      return createI18nCall(key);
    }

    if (ts.isTemplateExpression(node)) {
      return ts.visitEachChild(node, visit, undefined);
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
    const bakPath = path.join(PROJECT_ROOT, t) + '.bak.ast5';
    if (fs.existsSync(bakPath)) {
      try {
        fs.unlinkSync(bakPath);
      } catch (e) {}
    }
  }
}

function main() {
  const targets = [
    'apps/web/src/components/templates/ListPageTemplate.tsx',
    'apps/web/src/components/common/DataTable.tsx',
    'apps/web/src/components/gis/modules/MapModule/MapView.tsx',
    'apps/web/src/pages/qms/analytics/QmsSpcControlChartPage.tsx',
    'apps/web/src/pages/qms/analytics/QmsFmeaRiskMatrixPage.tsx',
  ];

  cleanBackups(targets);

  console.log('[STEP 0] Running baseline global TSC...');
  const baselineTsc = runTscGlobal();
  console.log(`[STEP 0] Baseline global exit=${baselineTsc.exitCode}`);

  const results = [];
  const allAddedKeys = { zh: {}, en: {} };
  const currentTargetErrors = {};

  for (const t of targets) {
    currentTargetErrors[t] = extractFileErrors(baselineTsc.allOutput, t);
  }

  for (const relPath of targets) {
    const fileName = path.basename(relPath);
    const nsConfig = FILE_NS_MAP[fileName];
    if (!nsConfig) {
      console.log(`[SKIP] No NS config for ${fileName}`);
      results.push({ file: relPath, status: 'SKIP', reason: 'No NS config' });
      continue;
    }
    const absPath = path.join(PROJECT_ROOT, relPath);
    const bakPath = absPath + '.bak.ast5';

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
    const targetSet = new Set(targets);
    const nonTargetErrors = errLines.filter((l) => {
      for (const tp of targets) {
        if (l.includes(tp.replace('apps/web/', ''))) return false;
      }
      return true;
    });
    console.log(`[FINAL TSC] total TS error lines=${errLines.length}, non-target=${nonTargetErrors.length}`);

    if (nonTargetErrors.length > 2) {
      console.log(`[FINAL TSC] >2 non-target errors → FULL ROLLBACK`);
      for (const t of targets) {
        gitCheckout(t);
      }
      for (const lang of ['zh', 'en']) {
        for (const jf of ['templates', 'components', 'gis', 'qms']) {
          removeJsonKeys(lang, jf, Object.keys(allAddedKeys[lang]));
        }
      }
      for (const t of targets) {
        const bak = path.join(PROJECT_ROOT, t) + '.bak.ast5';
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

  const reportPath = path.join(PROJECT_ROOT, 'scripts/i18n/ast-v5-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[DONE] Report: ${reportPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main();
