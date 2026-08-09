#!/usr/bin/env node
/**
 * OpenAPI → TypeScript 类型自动生成脚本
 *
 * 功能：从 OpenAPI 规范（YAML/JSON）自动生成 TypeScript 类型定义，
 *       消除手写 DTO 与后端 schema 的类型漂移。
 *
 * 用法：
 *   node scripts/openapi/gen-types.mjs                    # 自动选择输入源（优先聚合 JSON，回退到手写 YAML）
 *   node scripts/openapi/gen-types.mjs --input <file>      # 指定输入文件
 *   node scripts/openapi/gen-types.mjs --aggregated        # 强制使用聚合 JSON
 *   node scripts/openapi/gen-types.mjs --yaml              # 强制使用手写 YAML
 *   node scripts/openapi/gen-types.mjs --output <dir>      # 指定输出目录
 *   node scripts/openapi/gen-types.mjs --validate          # 生成前验证 OpenAPI 规范
 *
 * 一键流水线（抓取 + 聚合 + 生成类型）：
 *   ./scripts/openapi/generate.sh --with-types
 *
 * 输出（默认）：
 *   packages/shared-types/src/generated/openapi.d.ts  — 完整类型定义
 *   packages/shared-types/src/generated/index.ts      — 命名空间导出
 *
 * 通过 @topems/shared-types 对前端导出：
 *   import type { ApiPaths, ApiComponents, ApiOperations } from '@topems/shared-types';
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../..');
const require = createRequire(import.meta.url);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

// 解析命令行参数
const args = process.argv.slice(2);
let inputPath = null;
let useAggregated = false;
let forceYaml = false;
let validate = false;
let outputDir = resolve(ROOT_DIR, 'packages/shared-types/src/generated');

function printHelp() {
  console.log(`用法: node scripts/openapi/gen-types.mjs [options]

选项:
  --input <file>     指定 OpenAPI 输入文件 (JSON/YAML)
  --aggregated       强制使用 docs/api/openapi-aggregated.json
  --yaml             强制使用手写 docs/api/openapi.yaml
  --output <dir>     TS 类型输出目录 (默认: packages/shared-types/src/generated)
  --validate         生成前验证 OpenAPI 规范有效性
  -h, --help         显示帮助

默认行为:
  自动选择输入源：优先聚合 JSON（如有内容），回退到手写 YAML

示例:
  node scripts/openapi/gen-types.mjs                        # 自动选择输入源
  node scripts/openapi/gen-types.mjs --aggregated           # 强制从聚合 JSON 生成
  node scripts/openapi/gen-types.mjs --yaml                 # 强制从手写 YAML 生成
  node scripts/openapi/gen-types.mjs --validate             # 生成前验证规范
  ./scripts/openapi/generate.sh --with-types                # 抓取 + 聚合 + 生成 TS 类型
`);
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) {
    inputPath = args[++i];
  } else if (args[i] === '--aggregated') {
    useAggregated = true;
  } else if (args[i] === '--yaml') {
    forceYaml = true;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputDir = resolve(args[++i]);
  } else if (args[i] === '--validate') {
    validate = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    printHelp();
    process.exit(0);
  }
}

const aggregatedPath = resolve(ROOT_DIR, 'docs/api/openapi-aggregated.json');
const yamlPath = resolve(ROOT_DIR, 'docs/api/openapi.yaml');

// 确定输入文件
if (!inputPath) {
  if (useAggregated) {
    inputPath = aggregatedPath;
  } else if (forceYaml) {
    inputPath = yamlPath;
  } else {
    // 自动选择：优先聚合 JSON（有实际内容时），回退到手写 YAML
    const aggregatedExists = existsSync(aggregatedPath);
    const yamlExists = existsSync(yamlPath);

    if (aggregatedExists) {
      try {
        const aggContent = JSON.parse(readFileSync(aggregatedPath, 'utf-8'));
        const hasContent =
          Object.keys(aggContent.paths || {}).length > 0 ||
          Object.keys(aggContent.components?.schemas || {}).length > 0;
        if (hasContent) {
          inputPath = aggregatedPath;
          log.info('自动选择: 聚合 JSON（有实际内容）');
        } else if (yamlExists) {
          inputPath = yamlPath;
          log.warn('聚合 JSON 为空骨架，回退到手写 YAML');
        } else {
          inputPath = aggregatedPath;
          log.warn('聚合 JSON 为空且无手写 YAML，将使用空骨架');
        }
      } catch {
        if (yamlExists) {
          inputPath = yamlPath;
          log.warn('聚合 JSON 解析失败，回退到手写 YAML');
        } else {
          inputPath = aggregatedPath;
        }
      }
    } else if (yamlExists) {
      inputPath = yamlPath;
      log.info('自动选择: 手写 YAML（无聚合 JSON）');
    } else {
      log.error('未找到任何 OpenAPI 输入文件');
      log.error(`  期望位置: ${aggregatedPath} 或 ${yamlPath}`);
      process.exit(1);
    }
  }
}

if (!existsSync(inputPath)) {
  log.error(`输入文件不存在: ${inputPath}`);
  process.exit(1);
}

console.log('==========================================');
console.log('  TOPEMS OpenAPI → TypeScript 类型生成');
console.log('==========================================');
console.log('');
log.info(`输入: ${inputPath}`);
const fileSize = (statSync(inputPath).size / 1024).toFixed(1);
log.info(`大小: ${fileSize} KB`);
if (validate) log.info('模式: 验证 + 生成');
console.log('');

// 读取并解析 OpenAPI 规范
let spec;
try {
  const raw = readFileSync(inputPath, 'utf-8');
  if (inputPath.endsWith('.yaml') || inputPath.endsWith('.yml')) {
    let yaml;
    try {
      yaml = require('js-yaml');
    } catch (e) {
      log.error('解析 YAML 需要 js-yaml 依赖，但未安装。');
      log.error('   安装: pnpm add -D js-yaml -w   或改用 JSON 输入 (--aggregated)。');
      process.exit(1);
    }
    spec = yaml.load(raw);
  } else {
    spec = JSON.parse(raw);
  }
} catch (e) {
  log.error(`解析失败: ${e.message}`);
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
  log.warn(`清洗: 修复 ${fixCount} 个 null/缺失 schema 的 media type`);
}

// 悬空 $ref 修复：扫描全 spec 找所有 $ref 引用，若目标 schema 不存在则注入 stub
function fixDanglingRefs(spec) {
  const schemas = spec?.components?.schemas || {};
  const schemaNames = new Set(Object.keys(schemas));
  let refFixCount = 0;
  const missingRefs = new Set();

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    if (obj.$ref && typeof obj.$ref === 'string') {
      const m = obj.$ref.match(/^#\/components\/schemas\/(.+)$/);
      if (m && !schemaNames.has(m[1])) {
        missingRefs.add(m[1]);
      }
    }
    for (const v of Object.values(obj)) walk(v);
  }
  walk(spec);

  for (const name of missingRefs) {
    schemas[name] = { type: 'string', description: `Auto-injected stub for missing $ref target: ${name}` };
    refFixCount++;
  }
  if (refFixCount > 0) {
    spec.components = spec.components || {};
    spec.components.schemas = schemas;
    log.warn(`清洗: 注入 ${refFixCount} 个悬空 $ref stub schema（${[...missingRefs].slice(0, 5).join(', ')}${missingRefs.size > 5 ? '...' : ''}）`);
  }
  return refFixCount;
}

fixDanglingRefs(spec);

// 检查 spec 是否有实际内容
const pathCount = Object.keys(spec?.paths || {}).length;
const schemaCount = Object.keys(spec?.components?.schemas || {}).length;
log.info(`规范: ${pathCount} 个路径, ${schemaCount} 个 Schema`);

if (pathCount === 0 && schemaCount === 0) {
  log.warn('输入规范为空（可能后端服务未运行）。跳过类型生成。');
  log.warn('  提示：启动后端服务后运行 ./scripts/openapi/generate.sh 生成聚合 JSON');
  process.exit(0);
}

// OpenAPI 规范验证
function validateSpec(spec) {
  const errors = [];
  const warnings = [];

  if (!spec.openapi) {
    errors.push('缺少 openapi 版本字段');
  } else if (!spec.openapi.startsWith('3.')) {
    warnings.push(`openapi 版本 ${spec.openapi} 可能不完全兼容（期望 3.x）`);
  }

  if (!spec.info) {
    errors.push('缺少 info 字段');
  } else {
    if (!spec.info.title) warnings.push('缺少 info.title');
    if (!spec.info.version) warnings.push('缺少 info.version');
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    errors.push('缺少 paths 字段或格式错误');
  } else {
    let operationCount = 0;
    for (const [path, methods] of Object.entries(spec.paths)) {
      if (!methods || typeof methods !== 'object') continue;
      for (const [method, operation] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'].includes(method)) continue;
        operationCount++;
        if (!operation || typeof operation !== 'object') continue;
        if (!operation.responses) {
          warnings.push(`路径 ${path} [${method}] 缺少 responses 定义`);
        }
      }
    }
    log.info(`验证: 发现 ${operationCount} 个操作`);
  }

  const schemas = spec.components?.schemas;
  if (schemas && typeof schemas === 'object') {
    log.info(`验证: 发现 ${Object.keys(schemas).length} 个 Schema`);
  }

  return { errors, warnings };
}

if (validate) {
  log.info('正在验证 OpenAPI 规范...');
  const { errors, warnings } = validateSpec(spec);

  if (warnings.length > 0) {
    log.warn(`发现 ${warnings.length} 个警告:`);
    warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }

  if (errors.length > 0) {
    log.error(`发现 ${errors.length} 个错误:`);
    errors.forEach((e) => console.log(`  ❌ ${e}`));
    log.error('验证失败，终止生成。');
    process.exit(1);
  }

  log.success('规范验证通过');
}

// 写入清洗后的 spec 到临时文件，供 CLI 使用
mkdirSync(outputDir, { recursive: true });

const tmpSpecPath = resolve(outputDir, '.tmp-openapi-sanitized.json');
writeFileSync(tmpSpecPath, JSON.stringify(spec, null, 2));

// 解析 openapi-typescript CLI 二进制路径
function resolveOpenapiTypescriptBin() {
  // openapi-typescript 是 packages/shared-types 的 devDep，
  // 尝试从多个位置 resolve（scripts/ 层级找不到时会 fallback 到 shared-types）
  const resolvePaths = [
    'openapi-typescript/package.json',
    resolve(ROOT_DIR, 'packages/shared-types/node_modules/openapi-typescript/package.json'),
  ];
  let pkgPath = null;
  let lastErr = null;
  for (const p of resolvePaths) {
    try {
      pkgPath = require.resolve(p);
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!pkgPath) {
    throw new Error(
      `无法定位 openapi-typescript CLI。请确认已安装: pnpm add -D openapi-typescript -w\n  原因: ${lastErr?.message || 'unknown'}`,
    );
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const binRel = pkg.bin && (pkg.bin['openapi-typescript'] || (typeof pkg.bin === 'string' ? pkg.bin : null));
  if (!binRel) {
    throw new Error('openapi-typescript 未声明 bin 字段');
  }
  return resolve(dirname(pkgPath), binRel);
}

// 使用 openapi-typescript CLI 生成类型
const outputFile = resolve(outputDir, 'openapi.d.ts');
try {
  const binPath = resolveOpenapiTypescriptBin();
  log.info('正在生成 TypeScript 类型...');
  execSync(`node "${binPath}" "${tmpSpecPath}" -o "${outputFile}"`, {
    stdio: 'pipe',
    cwd: ROOT_DIR,
  });
} catch (e) {
  log.error(`类型生成失败: ${e.message}`);
  if (e.stderr) console.error(e.stderr.toString());
  try { unlinkSync(tmpSpecPath); } catch {}
  process.exit(1);
}

// 清理临时文件
try { unlinkSync(tmpSpecPath); } catch {}

// 在文件头添加生成信息注释
const generatedContent = readFileSync(outputFile, 'utf-8');
const outputSize = (Buffer.byteLength(generatedContent) / 1024).toFixed(1);
const header = `/**
 * 此文件由 scripts/openapi/gen-types.mjs 自动生成，请勿手动编辑。
 * 生成时间: ${new Date().toISOString()}
 * 输入源: ${inputPath}
 * 路径数: ${pathCount} | Schema 数: ${schemaCount}
 */

`;
writeFileSync(outputFile, header + generatedContent);
log.success(`输出: ${outputFile} (${outputSize} KB)`);

// 生成命名空间导出文件
// 注意：index.ts 由脚本全量覆写，必须包含手写 api-types.ts 的 re-export，
// 否则 packages/shared-types/src/index.ts 行 322-330 的 IamTypes/HrmTypes/... 命名空间导出会断裂。
const indexContent = `/**
 * OpenAPI 自动生成类型 — 命名空间导出
 *
 * 使用方式：
 *   import type { ApiPaths, ApiComponents } from '@topems/shared-types';
 *   type User = ApiComponents['schemas']['User'];
 *   type LoginPath = ApiPaths['/api/core/iam/auth/login']['post'];
 *
 * 此文件由 scripts/openapi/gen-types.mjs 自动生成，请勿手动编辑。
 * 注意：'./api-types' 的 re-export 是手写文件，脚本不覆盖；删除会导致 src/index.ts 命名空间导出断裂。
 */

export type { paths as ApiPaths } from './openapi';
export type { components as ApiComponents } from './openapi';
export type { operations as ApiOperations } from './openapi';

// 手写封装层（按模块命名空间导出，方便业务使用）— 由 V71 A3 维护
export type { IamTypes, HrmTypes, FinanceTypes, MasterDataTypes, QmsTypes, MesTypes, CommonTypes } from './api-types';
`;

const indexFile = resolve(outputDir, 'index.ts');
writeFileSync(indexFile, indexContent);
log.info(`索引: ${indexFile}`);

console.log('');
console.log('==========================================');
console.log('  生成完成');
console.log('==========================================');
console.log('');
log.success(`路径: ${pathCount} | Schema: ${schemaCount}`);
log.success(`输出: ${outputFile}`);
console.log('');
console.log('  后续步骤:');
console.log('    1. 在代码中使用: import type { ApiPaths, ApiComponents } from "@topems/shared-types"');
console.log('    2. 重新生成（自动选择输入源）: pnpm gen:types');
console.log('    3. 从运行中的服务生成（聚合 + 类型）: ./scripts/openapi/generate.sh --with-types');
console.log('    4. 仅从聚合 JSON 生成类型: node scripts/openapi/gen-types.mjs --aggregated');
console.log('    5. 验证规范: node scripts/openapi/gen-types.mjs --validate');
