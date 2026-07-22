#!/usr/bin/env node
/**
 * OpenAPI → TypeScript 类型自动生成脚本
 *
 * 功能：从 OpenAPI 规范（YAML/JSON）自动生成 TypeScript 类型定义，
 *       消除手写 DTO 与后端 schema 的类型漂移。
 *
 * 用法：
 *   node scripts/openapi/gen-types.mjs                    # 使用默认 docs/api/openapi.yaml
 *   node scripts/openapi/gen-types.mjs --input <file>      # 指定输入文件
 *   node scripts/openapi/gen-types.mjs --aggregated        # 使用聚合 JSON（需服务运行）
 *
 * 输出：
 *   packages/shared-types/src/generated/openapi.d.ts  — 完整类型定义
 *   packages/shared-types/src/generated/index.ts      — 命名空间导出
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../..');
const require = createRequire(import.meta.url);

// 解析命令行参数
const args = process.argv.slice(2);
let inputPath = null;
let useAggregated = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) {
    inputPath = args[++i];
  } else if (args[i] === '--aggregated') {
    useAggregated = true;
  }
}

// 确定输入文件：优先聚合 JSON，其次手写 YAML
if (!inputPath) {
  const aggregatedPath = resolve(ROOT_DIR, 'docs/api/openapi-aggregated.json');
  if (useAggregated && existsSync(aggregatedPath)) {
    inputPath = aggregatedPath;
  } else {
    inputPath = resolve(ROOT_DIR, 'docs/api/openapi.yaml');
  }
}

if (!existsSync(inputPath)) {
  console.error(`❌ 输入文件不存在: ${inputPath}`);
  process.exit(1);
}

console.log('==========================================');
console.log('  TOPEMS OpenAPI → TypeScript 类型生成');
console.log('==========================================');
console.log(`  输入: ${inputPath}`);

// 读取并解析 OpenAPI 规范
let spec;
try {
  const raw = readFileSync(inputPath, 'utf-8');
  if (inputPath.endsWith('.yaml') || inputPath.endsWith('.yml')) {
    const yaml = require('js-yaml');
    spec = yaml.load(raw);
  } else {
    spec = JSON.parse(raw);
  }
} catch (e) {
  console.error(`❌ 解析失败: ${e.message}`);
  process.exit(1);
}

// 数据清洗：移除 null media type 对象（openapi-typescript 7.x 的已知限制）
function sanitizeSpec(spec) {
  let fixCount = 0;
  const paths = spec?.paths || {};
  for (const [path, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== 'object') continue;
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation || typeof operation !== 'object') continue;
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
      const responses = operation.responses || {};
      for (const [code, response] of Object.entries(responses)) {
        if (!response || typeof response !== 'object') continue;
        const content = response.content;
        if (!content || typeof content !== 'object') continue;
        for (const [mediaType, mediaTypeObj] of Object.entries(content)) {
          if (mediaTypeObj === null || mediaTypeObj === undefined) {
            // 用空 schema 替代 null media type 对象
            content[mediaType] = { schema: { type: 'object' } };
            fixCount++;
          } else if (!mediaTypeObj.schema) {
            mediaTypeObj.schema = { type: 'object' };
            fixCount++;
          }
        }
      }
    }
  }
  return fixCount;
}

const fixCount = sanitizeSpec(spec);
if (fixCount > 0) {
  console.log(`  清洗: 修复 ${fixCount} 个 null/缺失 schema 的 media type`);
}

// 检查 spec 是否有实际内容
const pathCount = Object.keys(spec?.paths || {}).length;
const schemaCount = Object.keys(spec?.components?.schemas || {}).length;
console.log(`  规范: ${pathCount} 个路径, ${schemaCount} 个 Schema`);

if (pathCount === 0 && schemaCount === 0) {
  console.error('⚠️  输入规范为空（可能后端服务未运行）。跳过类型生成。');
  console.error('   提示：启动后端服务后运行 ./scripts/openapi/generate.sh 生成聚合 JSON');
  process.exit(0);
}

// 写入清洗后的 spec 到临时文件，供 CLI 使用
const outputDir = resolve(ROOT_DIR, 'packages/shared-types/src/generated');
import { mkdirSync, writeFileSync as writeFile } from 'node:fs';
mkdirSync(outputDir, { recursive: true });

const tmpSpecPath = resolve(outputDir, '.tmp-openapi-sanitized.json');
writeFile(tmpSpecPath, JSON.stringify(spec, null, 2));

// 使用 openapi-typescript CLI 生成类型（CLI 内部正确处理 AST → 字符串转换）
const outputFile = resolve(outputDir, 'openapi.d.ts');
try {
  const { execSync } = require('child_process');
  execSync(`npx openapi-typescript "${tmpSpecPath}" -o "${outputFile}"`, {
    stdio: 'pipe',
    cwd: ROOT_DIR,
  });
} catch (e) {
  console.error(`❌ 类型生成失败: ${e.message}`);
  // 清理临时文件
  try { require('node:fs').unlinkSync(tmpSpecPath); } catch {}
  process.exit(1);
}

// 清理临时文件
try { require('node:fs').unlinkSync(tmpSpecPath); } catch {}

// 在文件头添加生成信息注释
const generatedContent = readFileSync(outputFile, 'utf-8');
const header = `/**
 * 此文件由 scripts/openapi/gen-types.mjs 自动生成，请勿手动编辑。
 * 生成时间: ${new Date().toISOString()}
 * 输入源: ${inputPath}
 * 路径数: ${pathCount} | Schema 数: ${schemaCount}
 */

`;
writeFile(outputFile, header + generatedContent);
console.log(`  输出: ${outputFile}`);

// 生成命名空间导出文件
const indexContent = `/**
 * OpenAPI 自动生成类型 — 命名空间导出
 *
 * 使用方式：
 *   import type { ApiPaths, ApiComponents } from '@topems/shared-types';
 *   type User = ApiComponents['schemas']['User'];
 *   type LoginPath = ApiPaths['/api/core/iam/auth/login']['post'];
 *
 * 此文件由 scripts/openapi/gen-types.mjs 自动生成，请勿手动编辑。
 */

export type { paths as ApiPaths } from './openapi';
export type { components as ApiComponents } from './openapi';
export type { operations as ApiOperations } from './openapi';
`;

const indexFile = resolve(outputDir, 'index.ts');
writeFileSync(indexFile, indexContent);
console.log(`  索引: ${indexFile}`);

console.log('');
console.log('==========================================');
console.log('  生成完成');
console.log('==========================================');
console.log(`  路径: ${pathCount} | Schema: ${schemaCount}`);
console.log('');
console.log('  后续步骤:');
console.log('    1. 在代码中使用: import type { ApiTypes } from "@topems/shared-types"');
console.log('    2. 重新生成: node scripts/openapi/gen-types.mjs');
console.log('    3. 从运行中的服务生成: ./scripts/openapi/generate.sh && node scripts/openapi/gen-types.mjs --aggregated');
