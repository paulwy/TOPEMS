#!/usr/bin/env node
/**
 * itemsField 契约巡检：页面声明的「列表数组字段名」是否真的存在于后端响应
 *
 * 背景：`createCrudPageAdapter(api, { itemsField: 'contracts' })` 是前端对响应体的承诺。
 * 后端把字段改名（contracts → items）时，normalizeListResponse 会退到 items/materials/data 兜底，
 * 所以不会抛错、不会报红，只是数据悄悄变空——这类问题在数据本来就为空的租户上永远发现不了。
 * 这里直接打接口，看承诺的字段在不在。
 *
 * 解析链路（都是静态 grep，不执行 TS）：
 *   页面 createCrudPageAdapter(mesApi.equipmentOee, { itemsField:'records' })
 *     → src/api/mes/index.ts 里 `equipmentOee: <impl>`
 *     → src/api/mes/*.ts 里 `export const <impl>` 中 list 的 `apiClient.<svc>.get('<path>')`
 *   → GET ${API}/api/<svc>/<path>，检查 data 是否含该字段（或本身就是数组 / items / materials / data）
 *
 * 用法：
 *   node scripts/check-items-field.mjs           # 检查全部内置适配器页面
 *   node scripts/check-items-field.mjs --json /tmp/items-field.json
 *
 * 退出码：0 全部匹配（含无法解析而跳过的）；1 存在字段缺失；2 登录失败等。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const argv = process.argv.slice(2);
const API_BASE = (argv.find((a) => a.startsWith('--api=')) || '').split('=')[1] || process.env.API_BASE || 'http://127.0.0.1:8099';
const TENANT_ID = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';
const jsonIdx = argv.indexOf('--json');
const JSON_OUT = jsonIdx >= 0 ? argv[jsonIdx + 1] : '';

const FALLBACK_KEYS = ['items', 'materials', 'data'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(p, out);
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** 收集「页面 → 适配器对象 + itemsField」 */
function collectSites() {
  const sites = [];
  for (const file of walk(join(ROOT, 'src/components'))) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('itemsField')) continue;
    // 形态 1：createCrudPageAdapter(apiObj, { itemsField: 'x' })
    const re1 = /createCrudPageAdapter\s*(?:<[^>]*>)?\s*\(\s*([A-Za-z0-9_.]+)\s*(?:as[^,]*)?,[\s\S]{0,400}?itemsField:\s*'([A-Za-z0-9_]+)'/g;
    let m;
    while ((m = re1.exec(src))) sites.push({ page: relative(ROOT, file), apiExpr: m[1], field: m[2] });

    // 形态 2：手写适配器 { list: api.x.list, ... }, { itemsField: 'x' }
    const re2 = /createCrudPageAdapter[\s\S]{0,300}?list:\s*([A-Za-z0-9_.]+)\.list[\s\S]{0,300}?itemsField:\s*'([A-Za-z0-9_]+)'/g;
    while ((m = re2.exec(src))) {
      if (!sites.some((s) => s.page === relative(ROOT, file) && s.field === m[2])) {
        sites.push({ page: relative(ROOT, file), apiExpr: m[1], field: m[2] });
      }
    }
  }
  return sites;
}

/** 解析 apiExpr → HTTP 路径（返回 {svc, path} 或 null） */
function resolveEndpoint(apiExpr) {
  const ns = apiExpr.includes('.') ? apiExpr.split('.')[0] : null;
  const name = apiExpr.includes('.') ? apiExpr.split('.').slice(1).join('.') : apiExpr;
  const impl = resolveImpl(ns, name);
  if (!impl) return null;

  const apiDir = join(ROOT, 'src/api');
  for (const file of walk(apiDir)) {
    const src = readFileSync(file, 'utf8');
    const declIdx = src.search(new RegExp(`export const ${impl}\\b`));
    if (declIdx < 0) continue;
    // 截到对象结束）：从声明到下一处顶格 }; 之间
    const body = src.slice(declIdx, (src.indexOf('\n};', declIdx) + 3) || src.length);
    const m = body.match(/apiClient\.([a-z]+)\.get(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/);
    if (!m) continue;
    return { svc: m[1], path: m[2].split('$')[0] };
  }
  return null;
}

/** namespace.name → 实现对象名（mesApi.equipmentOee → equipmentOeeApi） */
function resolveImpl(ns, name) {
  if (!ns) return name;
  const svcDir = join(ROOT, 'src/api', ns.replace(/Api$/, ''));
  try {
    const idx = readFileSync(join(svcDir, 'index.ts'), 'utf8');
    const m = idx.match(new RegExp(`\\b${name}:\\s*([A-Za-z0-9_]+)`));
    if (m) return m[1];
  } catch {
    /* 没有 index.ts 就退回同名推断 */
  }
  return `${name}Api`;
}

(async () => {
  const sites = collectSites();
  const res = await fetch(`${API_BASE}/api/core/iam/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
    body: JSON.stringify({ username: 'admin', password: 'Topems@2026' }),
  });
  const login = await res.json();
  const token = login?.data?.access_token;
  if (!token) {
    console.error('登录失败，无法巡检');
    process.exit(2);
  }

  const rows = [];
  for (const site of sites) {
    const ep = resolveEndpoint(site.apiExpr);
    if (!ep) {
      rows.push({ ...site, status: 'SKIP(未解析)', detail: '' });
      console.log(`  SKIP          ${site.page.padEnd(42)} ${site.apiExpr} → 未解析`);
      continue;
    }
    const url = `${API_BASE}/api/${ep.svc}${ep.path.startsWith('/') ? '' : '/'}${ep.path}`;
    let body;
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': TENANT_ID } });
      body = await r.json();
      if (!r.ok || body?.success === false) {
        rows.push({ ...site, status: `SKIP(HTTP ${r.status})`, detail: ep.path });
        console.log(`  SKIP          ${site.page.padEnd(42)} ${url.replace(API_BASE, '')} → HTTP ${r.status}`);
        continue;
      }
    } catch (e) {
      rows.push({ ...site, status: 'SKIP(请求失败)', detail: String(e).slice(0, 60) });
      console.log(`  SKIP          ${site.page.padEnd(42)} ${url} → 请求失败`);
      continue;
    }
    const data = body.data;
    const ok =
      Array.isArray(data) ||
      (data && typeof data === 'object' && (site.field in data || FALLBACK_KEYS.some((k) => Array.isArray(data[k]))));
    const keys = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data).slice(0, 6).join(',') : Array.isArray(data) ? '[array]' : String(data);
    rows.push({ ...site, status: ok ? 'OK' : 'MISS', detail: `${url.replace(API_BASE, '')} keys=${keys}` });
    console.log(`  ${ok ? 'OK           ' : 'MISS         '} ${site.page.padEnd(42)} itemsField='${site.field}' → ${url.replace(API_BASE, '')} keys=${keys}`);
  }

  const miss = rows.filter((r) => r.status === 'MISS');
  console.log(`\n共 ${rows.length} 处声明：匹配 ${rows.filter((r) => r.status === 'OK').length}，缺失 ${miss.length}，跳过 ${rows.filter((r) => r.status.startsWith('SKIP')).length}`);
  console.log(miss.length ? '判定：FAIL' : '判定：OK');
  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ at: new Date().toISOString(), rows }, null, 2));
    console.log(`明细已写入 ${JSON_OUT}`);
  }
  process.exit(miss.length ? 1 : 0);
})();
