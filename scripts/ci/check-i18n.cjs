#!/usr/bin/env node
// 国际化硬编码中文检查（V65 阶段四新增）
//
// 用途：
// 1. 扫描 apps/web/src/pages 下 .tsx 文件 JSX 中直接出现的中文（非注释、非 console、非 import）
// 2. 输出 top 20 文件清单，量化 i18n 覆盖率
// 3. CI 门禁：admin 模块硬编码中文必须为 0
//
// 用法：
//   node scripts/ci/check-i18n.cjs                 # 全量检查，输出 top 20
//   node scripts/ci/check-i18n.cjs --json          # 输出 JSON 格式
//   node scripts/ci/check-i18n.cjs --strict        # 严格模式：admin 模块 > 0 则 exit 1
//   node scripts/ci/check-i18n.cjs --module admin  # 仅检查指定模块
//
// 退出码：
//   0 = 通过
//   1 = 严格模式下 admin 模块存在硬编码中文

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../../apps/web/src');
const PAGES_DIR = path.join(WEB_ROOT, 'pages');

// CLI 参数解析
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const strictMode = args.includes('--strict');
const moduleIdx = args.indexOf('--module');
const targetModule = moduleIdx !== -1 && args[moduleIdx + 1] ? args[moduleIdx + 1] : null;

// 中文字符正则（CJK 统一表意文字 + 扩展 A + 兼容表意文字）
const CHINESE_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

// 递归收集所有 .tsx 文件
function collectTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['__tests__', 'node_modules', 'test', 'tests'].includes(entry.name)) continue;
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.stories.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

// 判断某行是否应跳过（注释、console、import、type 声明等）
function shouldSkipLine(line) {
  const trimmed = line.trim();
  // 空行
  if (!trimmed) return true;
  // 单行注释
  if (trimmed.startsWith('//')) return true;
  // 多行注释块内的行
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  // console 语句
  if (/^console\./.test(trimmed)) return true;
  // import 语句
  if (/^import\s/.test(trimmed)) return true;
  // export type / interface 声明（类型定义中的中文注释不算）
  if (/^(export\s+)?(type|interface)\s/.test(trimmed)) return true;
  return false;
}

// 提取行中的中文字符串（排除 t() 调用内的内容）
function findHardcodedChinese(line) {
  const matches = [];
  // 先移除 t('...') 和 t("...") 调用中的内容
  const cleaned = line
    .replace(/\bt\s*\(\s*['"`][^'"`]*['"`]/g, '')
    .replace(/i18n\.t\s*\(\s*['"`][^'"`]*['"`]/g, '')
    .replace(/tpl\s*\(\s*['"`][^'"`]*['"`]/g, '');

  // 查找包含中文的字符串字面量
  // 匹配 '中文' "中文" `中文` 以及 JSX 文本节点中的中文
  const stringRe = /(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = stringRe.exec(cleaned)) !== null) {
    matches.push(m[2]);
  }

  // 查找 JSX 文本节点中的中文（> 中文 < 或 >中文<）
  const jsxTextRe = />([^<>{}]*[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff][^<>{}]*)</g;
  while ((m = jsxTextRe.exec(cleaned)) !== null) {
    const text = m[1].trim();
    if (text) matches.push(text);
  }

  // 查找属性值中的中文（非 t() 调用） title='中文' label="中文"
  const attrRe = /\b(?:label|title|placeholder|helperText|tooltip|alt|aria-label)\s*=\s*(['"`])((?:\\.|(?!\1).)*?[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff](?:\\.|(?!\1).)*?)\1/g;
  while ((m = attrRe.exec(cleaned)) !== null) {
    // 避免重复添加（已被 stringRe 匹配的）
    if (!matches.includes(m[2])) matches.push(m[2]);
  }

  return matches;
}

// 获取模块名（pages 下的第一级目录）
function getModuleName(filePath) {
  const rel = path.relative(PAGES_DIR, filePath);
  const parts = rel.split(path.sep);
  return parts.length > 1 ? parts[0] : 'root';
}

function main() {
  let files = collectTsxFiles(PAGES_DIR);

  // 按模块过滤
  if (targetModule) {
    files = files.filter((f) => getModuleName(f) === targetModule);
  }

  const moduleStats = {}; // { admin: { count, files: Set } }
  const fileViolations = []; // [{ file, module, count, samples: [{ line, texts }] }]
  let totalCount = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const module = getModuleName(filePath);
    let fileCount = 0;
    const samples = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (shouldSkipLine(line)) continue;

      const texts = findHardcodedChinese(line);
      if (texts.length > 0) {
        fileCount += texts.length;
        totalCount += texts.length;
        if (samples.length < 3) {
          samples.push({ line: i + 1, texts });
        }
      }
    }

    if (fileCount > 0) {
      fileViolations.push({
        file: path.relative(path.resolve(__dirname, '../..'), filePath),
        module,
        count: fileCount,
        samples,
      });

      if (!moduleStats[module]) {
        moduleStats[module] = { count: 0, files: new Set() };
      }
      moduleStats[module].count += fileCount;
      moduleStats[module].files.add(filePath);
    }
  }

  // 按违规数排序
  fileViolations.sort((a, b) => b.count - a.count);

  const adminCount = moduleStats['admin'] ? moduleStats['admin'].count : 0;

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          totalCount,
          adminCount,
          moduleStats: Object.fromEntries(
            Object.entries(moduleStats).map(([k, v]) => [k, { count: v.count, files: v.files.size }])
          ),
          topFiles: fileViolations.slice(0, 20).map((v) => ({
            file: v.file,
            module: v.module,
            count: v.count,
          })),
        },
        null,
        2
      )
    );
  } else {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  国际化硬编码中文检查');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  扫描文件数: ${files.length}`);
    console.log(`  硬编码中文总数: ${totalCount}`);
    console.log(`  admin 模块硬编码: ${adminCount}`);
    console.log(`  严格模式: ${strictMode ? '开启' : '关闭'}`);
    console.log('');

    console.log('模块分布:');
    Object.entries(moduleStats)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([k, v]) => {
        const marker = k === 'admin' && v.count > 0 ? ' ❌' : '';
        console.log(`  ${k}: ${v.count} 处 (${v.files.size} 文件)${marker}`);
      });

    console.log('');
    console.log(`Top ${Math.min(20, fileViolations.length)} 文件:`);
    fileViolations.slice(0, 20).forEach((v, i) => {
      const marker = v.module === 'admin' ? ' ❌' : '';
      console.log(`  ${i + 1}. [${v.module}] ${v.file}: ${v.count} 处${marker}`);
      v.samples.forEach((s) => {
        console.log(`      L${s.line}: ${s.texts.join(', ')}`);
      });
    });
    console.log('═══════════════════════════════════════════════════════════');
  }

  // 严格模式：admin 模块 > 0 则失败
  if (strictMode && adminCount > 0) {
    console.error(`\n❌ admin 模块存在 ${adminCount} 处硬编码中文，需清零`);
    process.exit(1);
  }
}

main();
