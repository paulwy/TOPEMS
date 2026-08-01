import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHINESE_RE = /[\u4e00-\u9fff]/;

function addHookToFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const hasTHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(content);
  if (hasTHook) return { status: 'skip', reason: 'already has hook' };
  
  if (!CHINESE_RE.test(content)) return { status: 'skip', reason: 'no chinese' };
  
  const importLine = "import { useTranslation } from 'react-i18next';";
  const hasImport = content.includes(importLine);
  
  if (!hasImport) {
    const reactImportRe = /import\s+React[^;]*;/m;
    const reactMatch = content.match(reactImportRe);
    if (reactMatch) {
      content = content.replace(reactMatch[0], `${reactMatch[0]}\n${importLine}`);
    } else {
      const lastImportRe = /(import\s+[^;]+;?\s*\n?)/g;
      let lastImportMatch;
      let lastImportIndex = 0;
      while ((lastImportMatch = lastImportRe.exec(content)) !== null) {
        lastImportIndex = lastImportRe.lastIndex;
      }
      if (lastImportIndex > 0) {
        content = content.slice(0, lastImportIndex) + '\n' + importLine + content.slice(lastImportIndex);
      }
    }
  }
  
  const exportRe = /export\s+(?:const|function|default)\s+(?:\w+)/g;
  let match;
  let bestInsertPos = null;
  
  while ((match = exportRe.exec(content)) !== null) {
    const afterExport = content.slice(match.index);
    
    const returnMatch = afterExport.match(/\n\s*return\s/);
    if (returnMatch) {
      const returnPos = match.index + returnMatch.index;
      const beforeReturn = content.slice(0, returnPos);
      
      const braceCount = (beforeReturn.match(/\{/g) || []).length;
      const closeBraceCount = (beforeReturn.match(/\}/g) || []).length;
      
      if (braceCount > closeBraceCount) {
        if (bestInsertPos === null || returnPos < bestInsertPos) {
          bestInsertPos = returnPos;
        }
      }
    }
  }
  
  const functionRe = /export\s+function\s+(\w+)\s*\(/g;
  while ((match = functionRe.exec(content)) !== null) {
    const afterName = content.slice(match.index);
    
    const returnMatch = afterName.match(/\n\s*return\s/);
    if (returnMatch) {
      const returnPos = match.index + returnMatch.index;
      const beforeReturn = content.slice(0, returnPos);
      
      const braceCount = (beforeReturn.match(/\{/g) || []).length;
      const closeBraceCount = (beforeReturn.match(/\}/g) || []).length;
      
      if (braceCount > closeBraceCount) {
        if (bestInsertPos === null || returnPos < bestInsertPos) {
          bestInsertPos = returnPos;
        }
      }
    }
  }
  
  if (bestInsertPos === null) {
    return { status: 'skip', reason: 'no export component found' };
  }
  
  const hookLine = 'const { t } = useTranslation();\n  ';
  const beforeHook = content.slice(0, bestInsertPos);
  const afterHook = content.slice(bestInsertPos);
  
  content = beforeHook + hookLine + afterHook;
  
  fs.writeFileSync(filePath, content, 'utf-8');
  
  return { status: 'success', pos: bestInsertPos };
}

function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name === 'i18n') continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walkDir(fp));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(fp);
  }
  return files;
}

function main() {
  const pagesDir = path.join(projectRoot, 'src', 'pages');
  const componentsDir = path.join(projectRoot, 'src', 'components');
  
  const pageFiles = walkDir(pagesDir);
  const componentFiles = walkDir(componentsDir);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  console.log('=== 为 pages 添加 useTranslation hook ===');
  for (const file of pageFiles) {
    try {
      const result = addHookToFile(file);
      if (result.status === 'success') {
        console.log(`  ${path.relative(projectRoot, file)}: hook added at ${result.pos}`);
        successCount++;
      } else {
        skipCount++;
      }
    } catch (err) {
      console.error(`  ERROR ${path.relative(projectRoot, file)}: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n=== 为 components 添加 useTranslation hook ===');
  for (const file of componentFiles) {
    try {
      const result = addHookToFile(file);
      if (result.status === 'success') {
        console.log(`  ${path.relative(projectRoot, file)}: hook added at ${result.pos}`);
        successCount++;
      } else {
        skipCount++;
      }
    } catch (err) {
      console.error(`  ERROR ${path.relative(projectRoot, file)}: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n=== 摘要 ===`);
  console.log(`  成功添加 hook: ${successCount}`);
  console.log(`  跳过: ${skipCount}`);
  console.log(`  错误: ${errorCount}`);
}

main();