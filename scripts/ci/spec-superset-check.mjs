#!/usr/bin/env node
/**
 * spec 超集断言：本地 docs/api/openapi.json 不得比 origin/main 丢失任何 path 或 method。
 *
 * 背景：openapi-gen 会修剪不在注解集里的手工/别名路径，本机工作区又常常落后
 * origin/main，两次把 main 已文档化的路径覆盖回退。提交 spec 前跑一次本脚本。
 *
 * 用法：
 *   node scripts/ci/spec-superset-check.mjs                # 对比 origin/main
 *   node scripts/ci/spec-superset-check.mjs --base 88fcc6bfe
 *   node scripts/ci/spec-superset-check.mjs --base-file /tmp/main-openapi.json
 *
 * 退出码：0 无丢失（可能提示新增），1 有丢失。
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SPEC = 'docs/api/openapi.json';
const HTTP = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
}

function readBase() {
  const baseFile = arg('--base-file');
  if (baseFile) return { label: baseFile, doc: JSON.parse(fs.readFileSync(baseFile, 'utf8')) };
  const ref = arg('--base', 'origin/main');
  const raw = execFileSync('git', ['show', `${ref}:${SPEC}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return { label: ref, doc: JSON.parse(raw) };
}

function methods(doc) {
  const m = new Map();
  for (const [p, item] of Object.entries(doc.paths || {})) {
    const set = new Set(Object.keys(item).filter((k) => HTTP.includes(k.toLowerCase())));
    m.set(p, set);
  }
  return m;
}

if (!fs.existsSync(SPEC)) {
  console.error(`找不到 ${SPEC}`);
  process.exit(1);
}

const cur = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
const { label, doc: base } = readBase();
const cm = methods(cur);
const bm = methods(base);

const lostPaths = [];
const lostMethods = [];
for (const [p, set] of bm) {
  const curSet = cm.get(p);
  if (!curSet) lostPaths.push(p);
  else for (const meth of set) if (!curSet.has(meth)) lostMethods.push(`${meth.toUpperCase()} ${p}`);
}

const addedPaths = [...cm.keys()].filter((p) => !bm.has(p));
const addedMethods = [];
for (const [p, set] of cm) {
  const baseSet = bm.get(p);
  if (!baseSet) continue;
  for (const meth of set) if (!baseSet.has(meth)) addedMethods.push(`${meth.toUpperCase()} ${p}`);
}

console.log(`spec 超集检查  当前=${SPEC} (${cm.size} paths)  基底=${label} (${bm.size} paths)`);
console.log(`新增 path ${addedPaths.length} / 新增 method ${addedMethods.length} / 丢失 path ${lostPaths.length} / 丢失 method ${lostMethods.length}`);

if (lostPaths.length || lostMethods.length) {
  console.log('\n丢失明细（必须补回，否则 main 上已文档化的接口会回退）：');
  for (const p of lostPaths) console.log(`  LOST PATH    ${p}`);
  for (const m of lostMethods) console.log(`  LOST METHOD  ${m}`);
  process.exit(1);
}

if (addedPaths.length) {
  console.log('\n新增 path（确认都是真实路由，不能是前端名字的幻影路径）：');
  for (const p of addedPaths.slice(0, 60)) console.log(`  + ${p}`);
  if (addedPaths.length > 60) console.log(`  … 其余 ${addedPaths.length - 60} 条`);
}
console.log('\n判定：OK（无回退）');
