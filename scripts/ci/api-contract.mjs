#!/usr/bin/env node
/**
 * 前端调用 → OpenAPI 契约对账
 *
 * 目的：发现「前端调了一个后端根本不存在的路径」这类静默缺口。
 * 通知模块就是这么暴露出来的：142 条调用里只有 9 条能在 spec 里解析，其余 404，
 * 而其中一部分又被 comm_stub 以 200 空数据兜底，比 404 更隐蔽。
 *
 * 做法：
 * 1. 从 apps/web/src/config/runtime.ts 解析各命名空间的 baseURL（services 表）；
 * 2. 扫 apps/web/src/api/**\/*.ts，抓 apiClient.<ns>.<get|post|put|patch|delete>('...') 的第一个字面量/模板路径；
 * 3. 把 `${...}` 和 spec 里的 `{param}` 都归一成 `*`，按 方法+段数+段内容 比对；
 * 4. 没匹配上的记为 MISSING，按命名空间汇总。
 *
 * 只做静态对账，不需要登录、不需要后端在跑，只要有一份 openapi.json。
 *
 * 用法：
 *   node scripts/ci/api-contract.mjs                     # 全量，汇总
 *   node scripts/ci/api-contract.mjs --only notification  # 只看某个命名空间，打印明细
 *   node scripts/ci/api-contract.mjs --spec http://127.0.0.1:8099/api/openapi.json
 *   node scripts/ci/api-contract.mjs --json /tmp/contract.json --fail-on-missing
 *
 * 退出码：0 = 无 MISSING（或未开启 --fail-on-missing）；1 = 有 MISSING 且开启了 fail。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const WEB = path.join(ROOT, 'apps/web');
const API_DIR = path.join(WEB, 'src/api');
const RUNTIME = path.join(WEB, 'src/config/runtime.ts');

function arg(name, dflt = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const SPEC_SRC = arg('spec', path.join(ROOT, 'docs/api/openapi.json'));
const ONLY = arg('only', null);
const JSON_OUT = arg('json', null);
const FAIL = !!arg('fail-on-missing', false);
const PROBE = !!arg('probe', false);
const BASE = arg('base', 'http://127.0.0.1:8099');
const TOKEN_FILE = arg('token-file', '/tmp/tok7.txt');

function loadBases() {
  const src = fs.readFileSync(RUNTIME, 'utf8');
  const map = {};
  const re = /['\"]?([a-zA-Z][\w-]*)['\"]?\s*:\s*getEnv\([^,]+,\s*'(\/api[^']*)'/g;
  let m;
  while ((m = re.exec(src))) map[m[1]] = m[2];
  return map;
}

async function loadSpec() {
  if (/^https?:/.test(SPEC_SRC)) {
    const r = await fetch(SPEC_SRC);
    if (!r.ok) throw new Error(`拉 spec 失败 ${r.status}`);
    return r.json();
  }
  return JSON.parse(fs.readFileSync(SPEC_SRC, 'utf8'));
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 抽出文件内的字符串常量（`const API_BASE = '/tenant'` 这类），供模板占位符回填 */
function fileConsts(src) {
  const map = {};
  const re = /const\s+([A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*(`[^`]*`|'[^']*'|"[^"]*")/g;
  let m;
  while ((m = re.exec(src))) {
    const v = m[2].slice(1, -1);
    if (!v.includes('${')) map[m[1]] = v;
  }
  return map;
}

/** 把调用路径归一：去 query、`${...}` → `*`；能查到文件内常量的先回填 */
function normCall(p, consts = {}) {
  let s = p.split('?')[0].split('#')[0];
  s = s.replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (all, name) => (name in consts ? consts[name] : all));
  s = s.replace(/`\s*\+/g, '').replace(/\$\{[^}]*\}/g, '*');
  // 模板没闭合（如 `${queryString`）时按变量处理
  s = s.replace(/\$\{[^`]*$/g, '*');
  s = s.replace(/\+/g, '');
  // 多模板相邻（`/${id}${qs}`）会折叠成 `**`，先归一成一个 `*` 再判尾部
  s = s.replace(/\*{2,}/g, '*');
  // 尾部 `*` 只有"黏在文字后面"时才是 query/后缀拼串占位（如 /audit/operations${qs}）；
  // `/*` 结尾是真变量段（等价 spec 的 `{id}`），必须保留
  if (s.endsWith('*') && !s.endsWith('/*')) s = s.replace(/\*+$/g, '');
  if (!s.startsWith('/')) s = '/' + s;
  return s.replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
}

/** spec 路径归一：`{param}` → `*` */
function normSpec(p) {
  return p.replace(/\{[^}]*\}/g, '*').replace(/\/+/g, '/');
}

function segs(p) {
  return p.split('/').filter(Boolean);
}

function match(specPaths, method, callPath) {
  const cs = segs(callPath);
  for (const sp of Object.keys(specPaths)) {
    const ss = segs(normSpec(sp));
    if (ss.length !== cs.length) continue;
    let ok = true;
    for (let i = 0; i < ss.length; i++) {
      if (ss[i] === '*') continue;
      if (ss[i] !== cs[i]) { ok = false; break; }
    }
    if (!ok) continue;
    const item = specPaths[sp] || {};
    if (item[method.toLowerCase()]) return sp;
  }
  return null;
}

/**
 * 泛型 CRUD 工厂解析。
 * `function createCrudApi(endpoint: string)` 内部的 `apiClient.x.get(`${endpoint}/${id}`)`
 * 不是一条契约（路径由调用点决定），真正的契约在调用点 `createCrudApi('/samples')`。
 * 这里：泛型模板记为「工厂内部调用」不参与对账，同时把每个字面量调用点展开成具体调用。
 */
const FACTORY_DEF_RE = /(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(\s*([A-Za-z_$][\w$]*)\s*:\s*string/g;

function materialize(tpl, param, endpoint) {
  let bad = false;
  const out = tpl.replace(/\$\{\s*([^}]*?)\s*\}/g, (all, expr) => {
    if (expr === param) return endpoint;
    if (/^[A-Za-z_$][\w$]*$/.test(expr)) return '*';
    bad = true;
    return '*';
  });
  return bad ? null : out;
}

function resolveFactoryCalls(files) {
  const fileText = new Map();
  const factoriesByFile = new Map(); // file -> Map(name -> tpls)
  const importsByFile = new Map(); // file -> Map(localName -> resolvedAbsPath)
  const genericKeys = new Set();
  const resolveMod = (from, spec) => {
    const base = path.resolve(path.dirname(from), spec);
    for (const cand of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
      if (fileText.has(cand)) return cand;
    }
    return null;
  };
  for (const f of files) fileText.set(f, fs.readFileSync(f, 'utf8'));
  for (const f of files) {
    const src = fileText.get(f);
    // import { a, b as c } from './x'
    const impRe = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
    let im;
    const imps = new Map();
    while ((im = impRe.exec(src))) {
      const mod = resolveMod(f, im[2]);
      if (!mod) continue;
      for (const piece of im[1].split(',')) {
        const seg = piece.trim();
        if (!seg) continue;
        const asMatch = seg.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (asMatch) imps.set(asMatch[2], mod);
        else if (/^[A-Za-z_$][\w$]*$/.test(seg)) imps.set(seg, mod);
      }
    }
    importsByFile.set(f, imps);

    FACTORY_DEF_RE.lastIndex = 0;
    let m;
    const defs = new Map();
    while ((m = FACTORY_DEF_RE.exec(src))) {
      const name = m[1];
      const param = m[2];
      const body = src.slice(m.index, m.index + 4000);
      const inner = new RegExp(
        'apiClient\\.([\\w]+)\\.(get|post|put|patch|delete)\\s*(?:<[^>]*>)?\\s*\\(\\s*(`[^`]*`|\'[^\']*\'|"[^"]*"|[A-Za-z_$][\\w$]*)',
        'g'
      );
      let n;
      const tpls = [];
      while ((n = inner.exec(body))) {
        let raw = n[3];
        if (!/^[`'"]/.test(raw)) {
          // 裸标识符形态：apiClient.lims.get(endpoint, …)
          if (raw !== param) continue;
          raw = '${' + raw + '}';
        } else {
          raw = raw.slice(1, -1);
          if (!raw.includes(param)) continue;
        }
        tpls.push({ ns: n[1], method: n[2].toUpperCase(), raw, param });
        genericKeys.add(`${n[1]}|${n[2].toUpperCase()}|${raw}`);
      }
      if (tpls.length) defs.set(name, tpls);
    }
    if (defs.size) factoriesByFile.set(f, defs);
  }

  const factoryFor = (file, name) => {
    const own = factoriesByFile.get(file);
    if (own && own.has(name)) return own.get(name);
    const mod = importsByFile.get(file)?.get(name);
    if (mod) {
      const defs = factoriesByFile.get(mod);
      if (defs && defs.has(name)) return defs.get(name);
    }
    return null;
  };

  const synth = [];
  const names = new Set();
  for (const defs of factoriesByFile.values()) for (const n of defs.keys()) names.add(n);
  for (const f of files) {
    const src = fileText.get(f);
    for (const name of names) {
      const tpls = factoryFor(f, name);
      if (!tpls) continue;
      const callRe = new RegExp(`\\b${name}\\s*(?:<[^>]*>)?\\s*\\(\\s*(['"])([^'"]*)\\1`, 'g');
      let c;
      while ((c = callRe.exec(src))) {
        const endpoint = c[2];
        if (!endpoint.startsWith('/')) continue;
        const line = src.slice(0, c.index).split('\n').length;
        // 只按调用点真正用到的方法展开：createCrudApi('/x').list(...) 不应虚构 POST/DELETE
        const tail = src.slice(c.index + c[0].length, c.index + c[0].length + 40);
        const mem = tail.match(/^\s*\)\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/);
        const member = mem ? mem[1] : null;
        const want = {
          list: (t) => t.method === 'GET' && t.raw === '${' + t.param + '}',
          get: (t) => t.method === 'GET' && t.raw.startsWith('${' + t.param + '}/'),
          create: (t) => t.method === 'POST' && t.raw === '${' + t.param + '}',
          update: (t) => t.method === 'PUT' && t.raw.startsWith('${' + t.param + '}/'),
          delete: (t) => t.method === 'DELETE' && t.raw.startsWith('${' + t.param + '}/'),
        }[member];
        if (!want) continue;
        for (const t of tpls) {
          if (!want(t)) continue;
          const concrete = materialize(t.raw, t.param, endpoint);
          if (!concrete) continue;
          synth.push({ ns: t.ns, method: t.method, raw: concrete, file: path.relative(WEB, f), line });
        }
      }
    }
  }
  return { genericKeys, synth };
}

// 手写扫描器：JS 正则处理不了 `get<Array<{ a: number }>>(` 这种嵌套泛型（`[^>]*` 会停在第一个 `>` 上，
// 导致 by-severity 一类调用被静默漏掉）。这里对尖括号做配平跳过，再取第一个字面量/模板实参。
const CALL_HEAD_RE = /apiClient\.([\w]+)\.(get|post|put|patch|delete|head)/g;

function skipTypeArgs(src, i) {
  // 注意：类型实参里合法出现 `;`（对象字面量字段）和换行，不能当终止条件；只按尖括号配平。
  let depth = 0;
  const limit = Math.min(src.length, i + 4000);
  for (let j = i; j < limit; j++) {
    const ch = src[j];
    if (ch === '<') depth++;
    else if (ch === '>') {
      depth--;
      if (depth === 0) return j + 1;
    }
  }
  return -1;
}

function scanCalls(src) {
  const out = [];
  CALL_HEAD_RE.lastIndex = 0;
  let m;
  while ((m = CALL_HEAD_RE.exec(src))) {
    let i = m.index + m[0].length;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] === '<') {
      const end = skipTypeArgs(src, i);
      if (end < 0) continue;
      i = end;
      while (i < src.length && /\s/.test(src[i])) i++;
    }
    if (src[i] !== '(') continue;
    i++;
    while (i < src.length && /\s/.test(src[i])) i++;
    const quote = src[i];
    if (quote !== '`' && quote !== "'" && quote !== '"') continue;
    let j = i + 1;
    while (j < src.length && src[j] !== quote) {
      if (src[j] === '\\') j++;
      j++;
    }
    out.push({ ns: m[1], method: m[2].toUpperCase(), raw: src.slice(i + 1, j), index: m.index });
  }
  return out;
}

async function main() {
  const bases = loadBases();
  const spec = await loadSpec();
  const specPaths = spec.paths || {};

  // namespace 是否存在 baseURL：不在 map 里的（如 pm 走 alias）也允许，直接按 /api/<ns> 拼
  const files = walk(API_DIR);
  const { genericKeys, synth } = resolveFactoryCalls(files);
  const calls = [];
  for (const f of files) {
    const rel = path.relative(WEB, f);
    const src = fs.readFileSync(f, 'utf8');
    const consts = fileConsts(src);
    for (const call of scanCalls(src)) {
      const { ns, method, raw } = call;
      // 只处理纯路径（含模板变量），跳过明显拼接了变量的非路径表达式
      const norm = normCall(raw, consts);
      const prefix = bases[ns];
      if (!prefix) continue;
      if (genericKeys.has(`${ns}|${method}|${raw}`)) continue; // 泛型工厂内部模板，契约在调用点展开
      const full = norm.startsWith(prefix) ? norm : `${prefix}${norm}`.replace(/\/+/g, '/');
      const line = src.slice(0, call.index).split('\n').length;
      calls.push({ ns, method, raw, full, file: rel, line });
    }
  }

  // 泛型工厂调用点展开成具体调用（createCrudApi('/samples') → GET/POST /samples …）
  for (const s of synth) {
    const prefix = bases[s.ns];
    if (!prefix) continue;
    const norm = normCall(s.raw, {});
    const full = norm.startsWith(prefix) ? norm : `${prefix}${norm}`.replace(/\/+/g, '/');
    calls.push({ ns: s.ns, method: s.method, raw: s.raw, full, file: s.file, line: s.line, via: 'factory' });
  }

  // 已知桩：后端显形为 X-Stub、刻意不进 spec 的接口，单列不进缺口
  let knownStubs = [];
  try {
    const p = path.join(path.dirname(new URL(import.meta.url).pathname), 'openapi-known-stubs.json');
    knownStubs = JSON.parse(fs.readFileSync(p, 'utf8')).knownStubs || [];
  } catch { knownStubs = []; }
  const stubKey = (m, p) => `${m.toUpperCase()} ${p.replace(/\{[^}]*\}/g, '*')}`;
  const stubSet = new Set(knownStubs.map((x) => stubKey(x.method, x.path)));

  const missing = [];
  const stubbed = [];
  const ok = [];
  for (const c of calls) {
    const hit = match(specPaths, c.method, c.full);
    if (hit) { ok.push({ ...c, spec: hit }); continue; }
    if (stubSet.has(stubKey(c.method, c.full))) stubbed.push(c);
    else missing.push(c);
  }

  const byNs = {};
  for (const c of calls) {
    byNs[c.ns] ??= { total: 0, ok: 0, missing: 0 };
    byNs[c.ns].total++;
  }
  for (const c of ok) byNs[c.ns].ok++;
  for (const c of missing) byNs[c.ns].missing++;

  const nsList = ONLY
    ? Object.keys(byNs).filter((k) => k === ONLY)
    : Object.keys(byNs).filter((k) => byNs[k].missing > 0);

  console.log(`契约对账  spec=${SPEC_SRC}`);
  console.log(`扫描 ${files.length} 个前端 api 文件，抓到 ${calls.length} 条静态可解析调用`);
  console.log(`匹配 ${ok.length}，未匹配 ${missing.length}，已知桩豁免 ${stubbed.length}\n`);

  console.log('命名空间        调用  匹配  缺口');
  for (const ns of nsList.sort((a, b) => byNs[b].missing - byNs[a].missing)) {
    const s = byNs[ns];
    console.log(
      `${ns.padEnd(15)} ${String(s.total).padStart(4)} ${String(s.ok).padStart(6)} ${String(s.missing).padStart(6)}`
    );
  }

  if (ONLY) {
    console.log('\n明细：');
    for (const c of missing.filter((x) => x.ns === ONLY)) {
      console.log(`  MISSING  ${c.method.padEnd(6)} ${c.full}   ${c.file}:${c.line}`);
    }
  }

  // --emit-get：把前端在调、但 spec 没有的 GET 输出成清单，喂给 api-smoke --extra
  const EMIT = arg('emit-get', '');
  if (EMIT) {
    const list = [...new Set(
      missing.filter((c) => c.method === 'GET' && !c.full.includes('*') && !c.full.includes('{')).map((c) => c.full)
    )];
    fs.writeFileSync(EMIT, JSON.stringify({ paths: list }, null, 2));
    console.log(`\n已输出 ${list.length} 条 GET 路径 → ${EMIT}`);
  }

  // --probe：把「spec 里没有」的路径真的打一遍，区分
  //   1) 接口存在但没写进 spec（2xx）
  //   2) 接口不存在（404 文案）
  //   3) 接口存在但被 stub 兜底（2xx + pending upstream support 之类）——最隐蔽的一类
  //   4) 需要参数/方法不符（400/405/422）
  if (PROBE) {
    const token = fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '';
    const candidates = missing.filter(
      (c) => c.method === 'GET' && !c.full.includes('*') && !c.full.includes('{')
    );
    const buckets = { SPEC_GAP: [], STUB: [], REAL_MISSING: [], NEEDS_PARAM: [], OTHER: [] };
    const STUB_RE = /pending upstream support|not implemented|未实现|待实现|占位/i;
    const CONC = Number(arg('concurrency', 5));
    let idx = 0;
    async function worker() {
      while (idx < candidates.length) {
        const c = candidates[idx++];
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 15000);
          const r = await fetch(BASE + c.full, {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
            },
            signal: ctrl.signal,
          });
          clearTimeout(t);
          const text = await r.text();
          c.status = r.status;
          if (r.status === 200 || r.status === 201) {
            // 后端兜底 stub 会带 X-Stub: true（2026-11-26 起），文案匹配作为旧版本兼容
            if (r.headers.get('x-stub') === 'true' || STUB_RE.test(text)) buckets.STUB.push(c);
            else buckets.SPEC_GAP.push(c);
          } else if (r.status === 404 && /接口不存在|路径/.test(text)) buckets.REAL_MISSING.push(c);
          else if ([400, 405, 422].includes(r.status)) buckets.NEEDS_PARAM.push(c);
          else buckets.OTHER.push(c);
        } catch (e) {
          c.status = -1;
          buckets.OTHER.push(c);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.max(1, Math.min(CONC, 8)) }, worker));

    console.log(`\n实测分类（GET，无模板变量，共 ${candidates.length} 条）：`);
    console.log(`  接口存在但未写进 spec（2xx） : ${buckets.SPEC_GAP.length}`);
    console.log(`  被 stub 兜底（2xx + pending）  : ${buckets.STUB.length}`);
    console.log(`  接口真的不存在（404 文案）    : ${buckets.REAL_MISSING.length}`);
    console.log(`  存在但需要参数/方法不符       : ${buckets.NEEDS_PARAM.length}`);
    console.log(`  其他（401/5xx/网络）          : ${buckets.OTHER.length}`);

    const nsOf = (arr) => {
      const m = {};
      for (const c of arr) m[c.ns] = (m[c.ns] || 0) + 1;
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    console.log('\n按命名空间（real missing / stub）：');
    const rm = Object.fromEntries(nsOf(buckets.REAL_MISSING));
    const st = Object.fromEntries(nsOf(buckets.STUB));
    const allNs = [...new Set([...Object.keys(rm), ...Object.keys(st)])].sort(
      (a, b) => (rm[b] || 0) - (rm[a] || 0) || (st[b] || 0) - (st[a] || 0)
    );
    for (const k of allNs) console.log(`  ${k.padEnd(14)} ${String(rm[k] || 0).padStart(3)} / ${String(st[k] || 0).padStart(3)}`);

    if (ONLY) {
      for (const c of buckets.REAL_MISSING.filter((x) => x.ns === ONLY))
        console.log(`  REAL_MISSING ${c.method} ${c.full}  ${c.file}:${c.line}`);
      for (const c of buckets.STUB.filter((x) => x.ns === ONLY))
        console.log(`  STUB         ${c.method} ${c.full}  ${c.file}:${c.line}`);
    }

    if (JSON_OUT) {
      fs.writeFileSync(
        JSON_OUT,
        JSON.stringify({ spec: SPEC_SRC, candidates: candidates.length, ...buckets }, null, 2)
      );
      console.log(`\n明细已写入 ${JSON_OUT}`);
    }
    process.exit(FAIL && buckets.REAL_MISSING.length > 0 ? 1 : 0);
  }

  if (JSON_OUT) {
    fs.writeFileSync(
      JSON_OUT,
      JSON.stringify({ spec: SPEC_SRC, total: calls.length, ok: ok.length, missing, byNs }, null, 2)
    );
    console.log(`\n明细已写入 ${JSON_OUT}`);
  }

  if (FAIL && missing.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error('契约对账失败:', e.message);
  process.exit(2);
});
