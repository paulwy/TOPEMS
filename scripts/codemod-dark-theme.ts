/**
 * codemod-dark-theme.ts
 *
 * 将 apps/web/src/pages/**\/*.tsx 中静态 designTokens.colors.* / ct.* 颜色引用
 * 替换为 MUI 动态 theme.palette.*，使暗色主题切换生效。
 *
 * 映射（已在 theme.ts 提供明暗双值）：
 *   designTokens.colors.<key>.x  -> theme.palette.<key>.x
 *   ct.<key>.x                  -> theme.palette.<key>.x   (ct = designTokens.colors 别名)
 *
 * <key> ∈ {primary, secondary, success, warning, error, info, grey,
 *          background, text, action, teal, orange, yellow, blue,
 *          cyan, purple, pink, surface}
 *
 * 跳过（保留静态，无 MUI 对应或非颜色）：
 *   - common / brand / cyber / neon / border
 *   - designTokens.typography / spacing / shadows / zIndex / ...
 *   - 模块级（组件函数外）引用
 *   - 表达式体箭头组件（无 block body 可注入 hook）
 *
 * 用法：
 *   DRY_RUN=1 npx tsx scripts/codemod-dark-theme.ts   # 只报告，不改文件
 *   npx tsx scripts/codemod-dark-theme.ts              # 实际改写
 */
import {
  Project,
  SyntaxKind,
  Node,
  SourceFile,
  FunctionNode,
  Block,
} from 'ts-morph';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 配置 ──────────────────────────────────────────────────────────────────
const PAGES_DIR = path.resolve(__dirname, '../apps/web/src/pages');

/** 可映射到 theme.palette 的颜色 key */
const MAPPED_KEYS = new Set([
  'primary',
  'secondary',
  'success',
  'warning',
  'error',
  'info',
  'grey',
  'background',
  'text',
  'action',
  'teal',
  'orange',
  'yellow',
  'blue',
  'cyan',
  'purple',
  'pink',
  'surface',
]);

const DRY_RUN = process.env.DRY_RUN === '1';
const DESIGN_TOKENS_IMPORT_SOURCES = new Set(['@/theme/tokens', '@topems/tokens']);

// ── 统计 ───────────────────────────────────────────────────────────────────
interface Stats {
  filesVisited: number;
  filesModified: number;
  replacements: number;
  filesSkippedNoColors: number;
  skippedUnmappedRefs: number; // 保留的非映射引用（cyber/common/border/brand/neon）
  needsManual: string[]; // 表达式体组件 / 模块级引用
}
const stats: Stats = {
  filesVisited: 0,
  filesModified: 0,
  replacements: 0,
  filesSkippedNoColors: 0,
  skippedUnmappedRefs: 0,
  needsManual: [],
};

// ── 工具函数 ───────────────────────────────────────────────────────────────

/** 判断节点表达式是否为 `designTokens.colors` */
function isDesignTokensColors(expr: Node): boolean {
  return (
    expr.getKind() === SyntaxKind.PropertyAccessExpression &&
    (expr as any).getName?.() === 'colors' &&
    (expr as any).getExpression?.()?.getText?.() === 'designTokens'
  );
}

/** 判断节点是否为标识符 `ct` */
function isCtIdentifier(expr: Node): boolean {
  return expr.getKind() === SyntaxKind.Identifier && expr.getText() === 'ct';
}

/** 判断节点是否为函数节点（函数声明/函数表达式/箭头函数） */
function isFunctionNodeKind(n: Node): boolean {
  return (
    Node.isFunctionDeclaration(n) ||
    Node.isFunctionExpression(n) ||
    Node.isArrowFunction(n)
  );
}

/** 找到包含该节点的最外层函数祖先（即组件函数）。返回 null 表示模块级。 */
function findOutermostFunction(node: Node): FunctionNode | null {
  let current: Node | undefined = node;
  let outermost: FunctionNode | null = null;
  while (current) {
    if (isFunctionNodeKind(current)) {
      outermost = current as FunctionNode;
    }
    current = current.getParent();
  }
  return outermost;
}

/** 函数是否已有 theme 变量声明（含祖先链） */
function functionHasThemeBinding(fn: FunctionNode): boolean {
  // 在函数体内查找 const theme = ...
  const body = fn.getBody?.();
  if (body && Node.isBlock(body)) {
    const found = body.getDescendantsOfKind(SyntaxKind.VariableDeclaration).find((v) => {
      return v.getNameNode().getText().split(',').includes('theme');
    });
    if (found) return true;
  }
  // 祖先函数链（嵌套组件/闭包）是否已声明 theme
  let p: Node | undefined = fn.getParent();
  while (p) {
    if (isFunctionNodeKind(p)) {
      const b = (p as FunctionNode).getBody?.();
      if (b && Node.isBlock(b)) {
        const found = b.getDescendantsOfKind(SyntaxKind.VariableDeclaration).find((v) =>
          v.getNameNode().getText().split(',').includes('theme'),
        );
        if (found) return true;
      }
    }
    p = p.getParent();
  }
  return false;
}

// ── 主处理：单个文件 ───────────────────────────────────────────────────────
function processFile(sourceFile: SourceFile): void {
  stats.filesVisited++;
  const filePath = sourceFile.getFilePath();
  const fileText = sourceFile.getFullText();

  // 快速过滤：必须 import designTokens
  if (!/\bdesignTokens\b/.test(fileText)) {
    stats.filesSkippedNoColors++;
    return;
  }
  // 必须有可映射的颜色引用
  const hasMapped = new RegExp(
    `(designTokens\\.colors\\.(${[...MAPPED_KEYS].join('|')})\\b|\\bct\\.(${[...MAPPED_KEYS].join('|')})\\b)`,
  ).test(fileText);
  if (!hasMapped) {
    stats.filesSkippedNoColors++;
    return;
  }

  // 收集需要注入 useTheme 的组件函数
  const functionsToInject = new Set<FunctionNode>();
  let fileReplaced = 0;

  // 遍历所有属性访问表达式
  const propAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
  for (const pa of propAccesses) {
    const name = pa.getName();
    if (!MAPPED_KEYS.has(name)) continue;

    const expr = pa.getExpression();
    let shouldReplace = false;
    if (isDesignTokensColors(expr)) {
      shouldReplace = true;
    } else if (isCtIdentifier(expr)) {
      shouldReplace = true;
    }
    if (!shouldReplace) continue;

    // 模块级引用？
    const outerFn = findOutermostFunction(pa);
    if (!outerFn) {
      stats.needsManual.push(`${path.relative(PAGES_DIR, filePath)}: 模块级引用 @ ${pa.getText()}`);
      continue;
    }
    // 表达式体箭头组件？
    const body = outerFn.getBody?.();
    if (!body || !Node.isBlock(body)) {
      stats.needsManual.push(
        `${path.relative(PAGES_DIR, filePath)}: 表达式体组件 @ ${pa.getText()}`,
      );
      continue;
    }

    // 替换 base：designTokens.colors / ct -> theme.palette
    if (!DRY_RUN) {
      expr.replaceWithText('theme.palette');
    }
    fileReplaced++;
    stats.replacements++;
    functionsToInject.add(outerFn);
  }

  // 元素访问表达式：designTokens.colors.primary[400] / ct.primary[400]
  const elemAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.ElementAccessExpression);
  for (const ea of elemAccesses) {
    const expr = ea.getExpression();
    // expr 形如 designTokens.colors.primary 或 ct.primary
    if (!Node.isPropertyAccessExpression(expr)) continue;
    const keyName = expr.getName();
    if (!MAPPED_KEYS.has(keyName)) continue;
    const baseExpr = expr.getExpression();
    let shouldReplace = false;
    if (isDesignTokensColors(baseExpr)) shouldReplace = true;
    else if (isCtIdentifier(baseExpr)) shouldReplace = true;
    if (!shouldReplace) continue;

    const outerFn = findOutermostFunction(ea);
    if (!outerFn) {
      stats.needsManual.push(`${path.relative(PAGES_DIR, filePath)}: 模块级引用 @ ${ea.getText()}`);
      continue;
    }
    const body = outerFn.getBody?.();
    if (!body || !Node.isBlock(body)) {
      stats.needsManual.push(
        `${path.relative(PAGES_DIR, filePath)}: 表达式体组件 @ ${ea.getText()}`,
      );
      continue;
    }

    if (!DRY_RUN) {
      baseExpr.replaceWithText('theme.palette');
    }
    fileReplaced++;
    stats.replacements++;
    functionsToInject.add(outerFn);
  }

  if (fileReplaced === 0) {
    return;
  }

  // 注入 useTheme() 到组件函数体首行
  for (const fn of functionsToInject) {
    if (functionHasThemeBinding(fn)) continue;
    const block = fn.getBody() as Block;
    if (!DRY_RUN) {
      // 在函数体第一个语句前插入
      block.insertStatements(0, 'const theme = useTheme();');
    }
  }

  // ── import 管理（实际改写时） ──
  if (!DRY_RUN) {
    manageImports(sourceFile);
  }

  stats.filesModified++;
}

/** 管理 useTheme / designTokens import 与 ct 别名 */
function manageImports(sourceFile: SourceFile): void {
  const filePath = sourceFile.getFilePath();

  // 1) useTheme import
  // 检查文件是否已使用 useTheme
  const usesUseTheme = /\buseTheme\s*\(/.test(sourceFile.getFullText());
  if (usesUseTheme) {
    // 检查是否已 import useTheme from '@mui/material'
    const muiImport = sourceFile.getImportDeclarations().find((d) => {
      const spec = d.getModuleSpecifierValue();
      return spec === '@mui/material';
    });
    if (muiImport) {
      const named = muiImport.getNamedImports();
      const has = named.some((n) => n.getName() === 'useTheme');
      if (!has) {
        muiImport.addNamedImport('useTheme');
      }
    } else {
      sourceFile.addImportDeclaration({
        moduleSpecifier: '@mui/material',
        namedImports: ['useTheme'],
      });
    }
  }

  // 2) designTokens import 清理：文件里还有没有 designTokens. 引用？
  const remainingDesignTokens = /\bdesignTokens\./.test(sourceFile.getFullText());
  if (!remainingDesignTokens) {
    for (const d of sourceFile.getImportDeclarations()) {
      const spec = d.getModuleSpecifierValue();
      if (!DESIGN_TOKENS_IMPORT_SOURCES.has(spec)) continue;
      const named = d.getNamedImports();
      const dtImport = named.find((n) => n.getName() === 'designTokens');
      if (dtImport) {
        dtImport.remove();
        if (d.getNamedImports().length === 0) {
          d.remove();
        }
      }
    }
  }

  // 3) ct 别名清理：还有没有 ct. 引用？
  const remainingCt = /\bct\.[a-zA-Z]/.test(sourceFile.getFullText());
  if (!remainingCt) {
    // 删除 `const ct = designTokens.colors;`
    const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableStatement);
    for (const v of varDecls) {
      const text = v.getText();
      if (/^const ct = designTokens\.colors;?$/.test(text.trim())) {
        v.remove();
      }
    }
  }
}

// ── 入口 ───────────────────────────────────────────────────────────────────
function main(): void {
  const project = new Project({
    tsConfigFilePath: path.resolve(__dirname, '../apps/web/tsconfig.json'),
    skipFileDependencyResolution: true,
  });

  // 直接 addSourceFilesAtPaths，避免全项目类型解析开销
  const glob = path.join(PAGES_DIR, '**/*.tsx');
  project.addSourceFilesAtPaths([glob]);

  const sourceFiles = project.getSourceFiles();
  for (const sf of sourceFiles) {
    // 只处理 pages 目录下的文件（不动 components 等其他目录）
    const normalized = sf.getFilePath().replace(/\\/g, '/');
    if (!normalized.startsWith(PAGES_DIR.replace(/\\/g, '/') + '/')) continue;
    try {
      processFile(sf);
    } catch (err) {
      console.error(`ERROR processing ${sf.getFilePath()}:`, (err as Error).message);
    }
  }

  if (!DRY_RUN) {
    for (const sf of project.getSourceFiles()) {
      const normalized = sf.getFilePath().replace(/\\/g, '/');
      if (!normalized.startsWith(PAGES_DIR.replace(/\\/g, '/') + '/')) continue;
      try {
        sf.saveSync();
      } catch (err) {
        console.error(`save failed ${sf.getFilePath()}:`, (err as Error).message);
      }
    }
  }

  // ── 报告 ──
  console.log('='.repeat(60));
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN（未改写）' : '实际改写'}`);
  console.log(`访问文件:        ${stats.filesVisited}`);
  console.log(`修改文件:        ${stats.filesModified}`);
  console.log(`替换颜色引用:    ${stats.replacements}`);
  console.log(`跳过(无映射色):  ${stats.filesSkippedNoColors}`);
  console.log(`需人工处理:      ${stats.needsManual.length}`);
  for (const m of stats.needsManual.slice(0, 40)) {
    console.log(`  - ${m}`);
  }
  if (stats.needsManual.length > 40) {
    console.log(`  ... 还有 ${stats.needsManual.length - 40} 条`);
  }
  console.log('='.repeat(60));
}

main();
