#!/usr/bin/env node
/**
 * 为聚合 OpenAPI 产物生成 manifest：commit、路径/操作/schema 计数、sha256。
 *
 * 产物自 2026-11-19 起不再入库，由 CI 生成后作为 artifact / Release 附件发布；
 * manifest 用于让获取方校验「产物来自哪个 commit」以及内容是否被篡改。
 *
 * 用法:
 *   node scripts/openapi/make-manifest.mjs --artifact /tmp/openapi/openapi-aggregated.json
 *   node scripts/openapi/make-manifest.mjs --artifact <json> --out <manifest.json> --commit <sha>
 *
 * commit 取值优先级: --commit > GITHUB_SHA > git rev-parse HEAD
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(
    '用法: node scripts/openapi/make-manifest.mjs --artifact <openapi-aggregated.json> [--out <manifest.json>] [--commit <sha>]'
  );
  process.exit(0);
}

const artifactPath = getArg('--artifact');
if (!artifactPath) {
  console.error('缺少 --artifact <openapi-aggregated.json>');
  process.exit(1);
}
if (!existsSync(artifactPath)) {
  console.error(`产物不存在: ${artifactPath}`);
  process.exit(1);
}

function resolveCommit() {
  const explicit = getArg('--commit');
  if (explicit) return explicit;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();
  } catch {
    console.error('无法确定 commit：请传 --commit <sha>，或设置 GITHUB_SHA，或在 git 仓库内运行');
    process.exit(1);
  }
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

let doc;
try {
  doc = JSON.parse(readFileSync(artifactPath, 'utf-8'));
} catch (err) {
  console.error(`产物不是合法 JSON: ${artifactPath}\n  ${err.message}`);
  process.exit(1);
}

const paths = Object.keys(doc.paths || {});
const operations = paths.reduce(
  (sum, p) => sum + Object.keys(doc.paths[p] || {}).filter((m) => METHODS.includes(m)).length,
  0
);
const schemas = Object.keys(doc.components?.schemas || {});

const outPath =
  getArg('--out') || path.join(path.dirname(artifactPath), 'openapi-aggregated.manifest.json');

const files = [
  { name: path.basename(artifactPath), sha256: sha256(artifactPath) },
  { name: 'openapi-aggregated.yaml', sha256: null },
];
const yamlPath = path.join(path.dirname(artifactPath), 'openapi-aggregated.yaml');
if (existsSync(yamlPath)) {
  files[1].sha256 = sha256(yamlPath);
} else {
  files.pop();
}

const manifest = {
  commit: resolveCommit(),
  generated_at: new Date().toISOString(),
  generator: 'scripts/openapi/generate.sh --extract',
  paths: paths.length,
  operations,
  schemas: schemas.length,
  sha256: files[0].sha256,
  files,
};

writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[manifest] ${outPath}`);
console.log(
  `[manifest] commit=${manifest.commit} paths=${manifest.paths} operations=${manifest.operations} schemas=${manifest.schemas}`
);
console.log(`[manifest] sha256=${manifest.sha256}`);
