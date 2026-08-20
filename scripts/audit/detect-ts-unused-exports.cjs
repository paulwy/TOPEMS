#!/usr/bin/env node
/**
 * TS Unused Export Detector (L1/L2/L3 分级)
 *
 * 快速 grep-based 方案：扫描 apps/web/src 的命名导出，全仓统计引用次数。
 * L1-SAFE:    0 处 import（且 barrel 未 re-export）
 * L2-CAUTION: 仅 barrel/test/storybook 引用
 * L3-HOLD:    被页面/组件/配置实际引用
 *
 * 速度优先，先跑第一轮粗筛，人工交叉验证 L1 候选再删除。
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB_SRC = path.join(ROOT, 'apps', 'web', 'src');

const EXCLUDE_DIR = new Set(['node_modules', 'dist', 'build', '__tests__', '__mocks__', '__fixtures__', '.next', 'coverage']);
const EXCLUDE_FILE_EXT = new Set(['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.stories.tsx', '.d.ts']);

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (EXCLUDE_DIR.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) {
      let skip = false;
      for (const ext of EXCLUDE_FILE_EXT) if (e.name.endsWith(ext)) { skip = true; break; }
      if (!skip) out.push(full);
    }
  }
  return out;
}

/**
 * 提取单文件的命名导出（不含 default, 不含 export = ...）
 * 返回 [{ kind, name, startLine, isTypeOnly, isReExport, fromPath? }]
 */
function extractExports(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const exports = [];
  let i = 0;

  // 1. export const/class/function/enum/type/interface/abstract class Foo
  const declRe = /^\s*export\s+(declare\s+)?(?:abstract\s+)?(type|interface|enum|const|let|var|function|class|namespace)\s+(\w+)/;
  const declRe2 = /^\s*export\s+\{\s*([^}]+?)\s*\}(?:\s+from\s+['"]([^'"]+)['"])?\s*;?\s*$/;
  // 2. export { A, B as C } 或 export { A } from './x'
  while (i < lines.length) {
    let line = lines[i];
    // 跳过块注释
    if (/^\s*\/\*/.test(line)) {
      while (i < lines.length && !/\*\//.test(lines[i])) i++;
      i++; continue;
    }
    // 跳过行注释
    if (/^\s*\/\//.test(line)) { i++; continue; }

    let m = line.match(declRe);
    if (m) {
      const kind = m[2];
      const name = m[3];
      const isTypeOnly = (kind === 'type' || kind === 'interface');
      exports.push({ kind, name, startLine: i + 1, isTypeOnly, isReExport: false });
      i++; continue;
    }

    // 处理 export { A, B as C } [from 'x'] - 可能跨多行
    // 合并多行到第一个 }; 出现
    if (/\bexport\s*\{/.test(line) && !/^\s*export\s+default\b/.test(line)) {
      let buf = line;
      let j = i;
      while (j < lines.length && !/\}/.test(buf)) {
        j++; buf += ' ' + (lines[j] || '');
        if (j - i > 20) break;
      }
      const m2 = buf.match(/export\s*\{\s*([^}]+?)\s*\}(?:\s+from\s+['"]([^'"]+)['"])?/);
      if (m2) {
        const parts = m2[1].split(',').map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          const [origName, , alias] = p.split(/\s+/); // A as B => A, as, B
          const name = alias || origName;
          if (!name || name.startsWith('type ')) continue; // 跳过 type-only 的标记，实际名字在后面
          // 处理 "type Foo"
          let cleanName = name.replace(/^type\s+/, '');
          const typeOnly = /^type\s+/.test(name);
          exports.push({
            kind: typeOnly ? 'type-reexport' : 'reexport',
            name: cleanName,
            startLine: i + 1,
            isTypeOnly: typeOnly,
            isReExport: true,
            fromPath: m2[2] || null,
            origName: origName ? origName.replace(/^type\s+/, '') : cleanName,
          });
        }
        i = j + 1;
        continue;
      }
    }

    i++;
  }
  return exports;
}

function main() {
  console.log('\n🔍 扫描文件...');
  const files = walk(WEB_SRC);
  console.log(`   文件数: ${files.length}`);

  // phase 1: 收集所有 exports
  console.log('\n📦 阶段 1/3  提取 exports ...');
  /** name -> { file, kind, isTypeOnly, count }[] */
  const exportMap = new Map();
  let totalExports = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const exps = extractExports(f);
    for (const e of exps) {
      e.file = rel;
      // 忽略 default
      if (e.name === 'default') continue;
      if (!exportMap.has(e.name)) exportMap.set(e.name, []);
      exportMap.get(e.name).push(e);
      totalExports++;
    }
  }
  console.log(`   命名导出数: ${totalExports} (去重名后 ${exportMap.size})`);

  // phase 2: 构建反向引用索引（每个标识符出现在哪些文件）
  console.log('\n📦 阶段 2/3  构建反向引用索引...');
  const reverseIndex = new Map(); // name -> Set<file>
  for (const f of files) {
    let src;
    try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
    // 粗略拿 identifiers：简单 /\b[A-Za-z_$][\w$]*\b/g 即可
    const ids = new Set(src.match(/\b[A-Za-z_$][\w$]{1,}\b/g) || []);
    const rel = path.relative(ROOT, f);
    for (const id of ids) {
      if (!reverseIndex.has(id)) reverseIndex.set(id, new Set());
      reverseIndex.get(id).add(rel);
    }
  }

  // phase 3：分级输出
  console.log('\n📦 阶段 3/3  分级中...');
  const L1 = []; // SAFE: 仅自身文件有引用 → 0 处引用
  const L2 = []; // CAUTION: 仅 barrel/test/story
  const L3 = []; // HOLD: 实际使用

  for (const [name, exps] of exportMap) {
    // 候选定义文件集合
    const defFiles = new Set(exps.map(e => e.file));
    const reffingFiles = reverseIndex.get(name) || new Set();

    // 真实引用文件数 = 出现的所有文件 - 定义文件
    const realRefFiles = new Set([...reffingFiles].filter(f => !defFiles.has(f)));

    // 类型导出的 L1 判定更严格：类型可以出现在 type-only import，TS 可能在 tsc 时用
    // 先只对 值导出（const/function/class/enum/非 type-only reexport）做严格 L1
    const anyValueExport = exps.some(e =>
      e.kind === 'const' || e.kind === 'let' || e.kind === 'var' ||
      e.kind === 'function' || e.kind === 'class' ||
      (e.kind === 'enum' && !e.isTypeOnly) ||
      (e.isReExport && !e.isTypeOnly)
    );
    const anyTypeExport = exps.some(e => e.isTypeOnly || e.kind === 'type' || e.kind === 'interface');

    let level;
    if (realRefFiles.size === 0) {
      level = 'L1';
    } else {
      // L2: 全部引用文件都符合 barrel/test/story/mock
      let allL2 = true;
      for (const rf of realRefFiles) {
        const isBarrel = /\/index\.(ts|tsx)$/.test(rf);
        const isTest = /__tests__|\.(test|spec)\.(ts|tsx)$/.test(rf);
        const isStory = /\.stories\.(ts|tsx)$/.test(rf);
        const isMock = /__mocks__|mock\.ts/.test(rf);
        if (!isBarrel && !isTest && !isStory && !isMock) { allL2 = false; break; }
      }
      level = allL2 ? 'L2' : 'L3';
    }

    const record = {
      name,
      level,
      totalExports: exps.length,
      defFiles: [...defFiles],
      refCount: realRefFiles.size,
      sampleRefs: [...realRefFiles].slice(0, 5),
      anyValueExport,
      anyTypeExport,
    };
    if (level === 'L1') L1.push(record);
    else if (level === 'L2') L2.push(record);
    else L3.push(record);
  }

  // 聚合结果
  const l1Values = L1.filter(r => r.anyValueExport);
  const l1Types = L1.filter(r => !r.anyValueExport && r.anyTypeExport);
  const l2Values = L2.filter(r => r.anyValueExport);
  const l2Types = L2.filter(r => !r.anyValueExport && r.anyTypeExport);

  console.log('\n📊 结果汇总 =================================');
  console.log(`   L1-SAFE  总数     : ${L1.length}`);
  console.log(`     其中值导出      : ${l1Values.length}  ← 可优先删除试点`);
  console.log(`     其中类型导出    : ${l1Types.length}`);
  console.log(`   L2-CAUTION 总数   : ${L2.length}`);
  console.log(`     其中值导出      : ${l2Values.length}`);
  console.log(`     其中类型导出    : ${l2Types.length}`);
  console.log(`   L3-HOLD    总数   : ${L3.length}`);
  console.log();

  // 写 JSON
  const outDir = path.join(ROOT, 'scripts', 'audit');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'ts-unused-exports-report.json');
  fs.writeFileSync(outFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    totalNamedExports: totalExports,
    uniqueExportNames: exportMap.size,
    summary: {
      L1: { total: L1.length, values: l1Values.length, types: l1Types.length },
      L2: { total: L2.length, values: l2Values.length, types: l2Types.length },
      L3: { total: L3.length },
    },
    L1, L2,
  }, null, 2));
  console.log(`💾 完整 JSON: ${path.relative(ROOT, outFile)}`);

  // 打印 L1 值导出前 60 条（优先删除候选）
  console.log('\n🎯 L1-SAFE 值导出（推荐优先删除试点，前 60 条）:');
  console.log('   文件                                                   | 名称                | 种类');
  console.log('   ─────────────────────────────────────────────────────────────────────────');
  for (const r of l1Values.slice(0, 60)) {
    const file = r.defFiles[0].padEnd(56).slice(0, 56);
    const name = r.name.padEnd(20).slice(0, 20);
    const exps = exportMap.get(r.name);
    const kind = exps[0].kind;
    console.log(`   ${file}| ${name}| ${kind}`);
  }
  if (l1Values.length > 60) console.log(`   ... 还有 ${l1Values.length - 60} 条见 JSON`);

  console.log('\n✅ 探测完成，下一步执行：');
  console.log('   1. 人工 spot-check L1 值导出候选（确保不是 string-literal 反射引用）');
  console.log('   2. 选 20-50 项做第一批删除 → tsc 验证 Gate');
  console.log();
}

main();
