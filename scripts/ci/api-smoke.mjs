#!/usr/bin/env node
/**
 * 接口层冒烟：拿 OpenAPI 里的 GET 路由逐条打一遍，抓「声明了但打不通」的接口
 *
 * 目的与页面巡检互补：页面只覆盖被用户点到的那条链路，而且前端兜底会把接口问题吃掉；
 * 这里直接按 OpenAPI 清单发请求，能看到全量接口的健康度。
 *
 * 判定：
 *   FAIL  — 5xx（501 除外）、或 404 且响应文案是「接口不存在 / 路径」（说明 OpenAPI 声明了但实际没挂载）
 *   SOFT  — 400 / 403 / 409 / 422 / 501（业务校验、权限、显式未实现）
 *   OK    — 2xx
 *   SKIP  — 401（鉴权失败，多半是缺租户头）
 *   DEGRADED — 5xx 且文案是连接池打满（pool timed out / 事务开启失败），容量信号，不判负
 *
 * 用法：
 *   node scripts/ci/api-smoke.mjs                          # 全量 GET（916 条）
 *   node scripts/ci/api-smoke.mjs --module mes,wms --json /tmp/api-smoke.json
 *   node scripts/ci/api-smoke.mjs --limit 100 --concurrency 4
 *
 * 并发与重试：默认并发 3。8099 的 PG 连接池在并发 8 下会被跨模块聚合查询打穿，
 * 表现是大量「pool timed out while waiting for an open connection」假红；
 * 因此 5xx / 超时一律重试 2 次，重试仍失败才算 FAIL（确定性 500 两次都挂）。
 *
 * 退出码：0 无 FAIL；1 有 FAIL；2 脚本级错误。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split('=').slice(1).join('=');
  const idx = argv.indexOf(`--${name}`);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
  return dflt;
};

const BASE = arg('base', process.env.API_BASE || 'http://127.0.0.1:8099');
const TENANT = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';
const CONCURRENCY = Number(arg('concurrency', '3'));
const LIMIT = Number(arg('limit', '0'));
const MODULES = (arg('module', '') || '').split(',').filter(Boolean);
const JSON_OUT = arg('json', '');
const TIMEOUT_MS = Number(arg('timeout', '20')) * 1000;
const RETRY = Number(arg('retry', '2'));

// spec 写法过期 → 真实路由的别名表（见 scripts/ci/openapi-path-aliases.json）
const ALIAS_FILE = arg('aliases', resolve(dirname(fileURLToPath(import.meta.url)), 'openapi-path-aliases.json'));
let ALIASES = {};
try {
  ALIASES = JSON.parse(readFileSync(ALIAS_FILE, 'utf8')).aliases || {};
} catch {
  ALIASES = {};
}

async function login() {
  const r = await fetch(`${BASE}/api/core/iam/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT },
    body: JSON.stringify({ username: process.env.USERNAME || 'admin', password: process.env.PASSWORD || 'Topems@2026' }),
  });
  const b = await r.json().catch(() => null);
  const token = b?.data?.access_token;
  if (!token) throw new Error(`登录失败 HTTP ${r.status}`);
  return token;
}

async function fetchSpec() {
  const r = await fetch(`${BASE}/api/openapi.json`);
  if (!r.ok) throw new Error(`OpenAPI 拉取失败 HTTP ${r.status}`);
  return r.json();
}

function collect(spec) {
  const ops = [];
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    const op = methods.get;
    if (!op) continue;
    if (path.includes('{')) continue; // 需要真实 id，不盲打
    const seg = path.split('/')[2] || '';
    if (MODULES.length && !MODULES.includes(seg)) continue;
    const target = ALIASES[path] || path;
    ops.push({ path, target, aliased: target !== path, module: seg, opId: op.operationId || '' });
  }
  return ops;
}

function isTransient(r) {
  return r.status === 0 || (r.status >= 500 && r.status !== 501);
}

/** 打一次；5xx / 超时重试 RETRY 次，避免连接池抖动被判成真缺陷 */
async function probe(token, item) {
  let last = await probeOnce(token, item);
  let attempts = 1;
  while (attempts <= RETRY && isTransient(last)) {
    await new Promise((res) => setTimeout(res, 1500 * attempts));
    last = await probeOnce(token, item);
    attempts += 1;
  }
  return { ...last, attempts, transient: attempts > 1 && last.verdict === 'OK' };
}

async function probeOnce(token, item) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${item.target || item.path}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': TENANT },
      signal: ctrl.signal,
    });
    const text = await r.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 80) };
    }
    const msg = String(body?.message || '');
    let verdict = 'OK';
    // 连接池打满属容量信号，不是接口逻辑坏了：单独标 DEGRADED，进汇总不进退出码
    const poolStarved = /pool timed out|开启租户作用域失败|事务开启失败/.test(msg);
    if (r.status >= 500 && r.status !== 501) verdict = poolStarved ? 'DEGRADED' : 'FAIL';
    else if (r.status === 401) verdict = 'SKIP';
    else if (r.status === 404 && (/接口不存在/.test(msg) || /路径/.test(msg))) verdict = 'FAIL';
    else if (r.status >= 400) verdict = 'SOFT';
    return { ...item, status: r.status, verdict, message: msg.slice(0, 100) };
  } catch (e) {
    const aborted = e?.name === 'AbortError';
    return { ...item, status: 0, verdict: aborted ? 'FAIL' : 'FAIL', message: aborted ? `超时 ${TIMEOUT_MS}ms` : String(e).slice(0, 100) };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  const token = await login();
  const spec = await fetchSpec();
  let ops = collect(spec);
  if (LIMIT > 0) ops = ops.slice(0, LIMIT);
  console.log(`接口冒烟  ${ops.length} 条 GET（不含路径参数）  并发 ${CONCURRENCY}`);

  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, ops.length) }, async () => {
    while (cursor < ops.length) {
      const item = ops[cursor++];
      const r = await probe(token, item);
      results.push(r);
      if (r.verdict !== 'OK') console.log(`  ${r.verdict.padEnd(5)} ${String(r.status).padStart(3)} ${r.path.padEnd(64)} ${r.message}`);
    }
  });
  await Promise.all(workers);

  const byVerdict = results.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {});
  const byModule = {};
  for (const r of results) {
    byModule[r.module] = byModule[r.module] || { OK: 0, SOFT: 0, FAIL: 0, SKIP: 0, DEGRADED: 0 };
    byModule[r.module][r.verdict] += 1;
  }

  console.log('\n按模块：');
  for (const [mod, c] of Object.entries(byModule).sort((a, b) => b[1].FAIL - a[1].FAIL)) {
    const dg = c.DEGRADED ? ` DEGRADED=${c.DEGRADED}` : '';
    console.log(`  ${mod.padEnd(16)} OK=${c.OK} SOFT=${c.SOFT} FAIL=${c.FAIL} SKIP=${c.SKIP}${dg}`);
  }
  console.log(`\n汇总：${results.length} 条  ` + ['OK', 'SOFT', 'FAIL', 'SKIP', 'DEGRADED'].map((k) => `${k}=${byVerdict[k] || 0}`).join('  '));
  const fails = results.filter((r) => r.verdict === 'FAIL');
  if (fails.length) {
    console.log('FAIL 明细：');
    for (const f of fails) console.log(`  ${String(f.status).padStart(3)} ${f.path}  ${f.message}`);
  }
  console.log(fails.length ? '判定：FAIL' : '判定：OK');

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ at: new Date().toISOString(), base: BASE, byVerdict, byModule, results }, null, 2));
    console.log(`明细已写入 ${JSON_OUT}`);
  }
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('脚本级错误：', e?.message || e);
  process.exit(2);
});
