const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const APPS = path.join(ROOT, 'apps/web/src');
function readFile(p){try{return fs.readFileSync(p,'utf8');}catch{return '';}}
const API_DIR = path.join(APPS, 'api');
function walk(dir, out=[]){
  for (const f of fs.readdirSync(dir, {withFileTypes:true})) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) walk(fp, out);
    else if (/\.(tsx?|jsx?)$/.test(f.name) && !/\.d\.ts$|__tests__|(^|[/.])types\.ts$/.test(f.name)) out.push(fp);
  }
  return out;
}

/* ============================================================
   阶段 A：构建全局符号表 + 嵌套 API 字典
   ============================================================ */
const LEAF_DICT = {};
const NESTED_MAP = {};
const FILE_EXPORTS = {};
const CANONICAL = {};

// 提取 Promise<T> 中 T 的内容（支持嵌套泛型，如 Promise<ApiResponse<Foo[]>>）
function extractPromiseInner(text) {
  const m = text.match(/Promise\s*</);
  if (!m) return '';
  const start = m.index + m[0].length; // 指向 < 之后
  let depth = 1, i = start;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === '<') depth++;
    else if (ch === '>') depth--;
    if (depth === 0) return text.slice(start, i);
    i++;
  }
  return text.slice(start); // 未闭合，返回剩余全部
}

const allApiFiles = walk(API_DIR);
console.log(`[P6 v5] 扫描 API 文件：${allApiFiles.length} 个`);

for (const fp of allApiFiles) {
  const src = readFile(fp);
  const relFile = path.relative(API_DIR, fp).replace(/\\/g,'/');
  if (/(^|\/)(client|request|response-normalize|permissionInterceptor|requestPriority)\.ts$/.test(relFile)) continue;

  const localAlias = {};
  // 支持 named import: import { xxx } from '...'
  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let im; while ((im = importRe.exec(src)) !== null) {
    const names = im[1].split(',').map(s=>s.trim()).filter(Boolean);
    let modPath = im[2];
    let absMod;
    if (modPath.startsWith('@/')) absMod = path.resolve(APPS, modPath.slice(2));
    else if (modPath.startsWith('.')) absMod = path.resolve(path.dirname(fp), modPath);
    else continue;
    const cands = [absMod+'.ts', absMod+'.tsx', absMod+'.js', path.join(absMod,'index.ts'), path.join(absMod,'index.tsx')];
    let modFile = '';
    for (const c of cands) if (fs.existsSync(c)) { modFile = c; break; }
    if (!modFile) continue;
    const modRel = path.relative(API_DIR, modFile).replace(/\\/g,'/');
    const exportsInMod = FILE_EXPORTS[modRel] || (FILE_EXPORTS[modRel] = new Map());
    for (const n of names) {
      const mm = n.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      if (!mm) continue;
      const orig = mm[1], local = mm[2] || mm[1];
      const canonical = exportsInMod.get(orig) || `${modRel.replace(/\.[^.]+$/,'')}:${orig}`;
      exportsInMod.set(orig, canonical);
      localAlias[local] = canonical;
      CANONICAL[canonical] = { filePath: modFile, kind: 'unknown' };
    }
  }

  // 支持 default import: import xxx from '...' / import xxx, { yyy } from '...'
  const defaultImportRe = /import\s+([A-Za-z_$][\w$]*)(?:\s*,\s*\{([^}]+)\})?\s+from\s*['"]([^'"]+)['"]/g;
  let dim; while ((dim = defaultImportRe.exec(src)) !== null) {
    const defaultName = dim[1];
    let modPath = dim[3];
    let absMod;
    if (modPath.startsWith('@/')) absMod = path.resolve(APPS, modPath.slice(2));
    else if (modPath.startsWith('.')) absMod = path.resolve(path.dirname(fp), modPath);
    else continue;
    const cands = [absMod+'.ts', absMod+'.tsx', absMod+'.js', path.join(absMod,'index.ts'), path.join(absMod,'index.tsx')];
    let modFile = '';
    for (const c of cands) if (fs.existsSync(c)) { modFile = c; break; }
    if (!modFile) continue;
    const modRel = path.relative(API_DIR, modFile).replace(/\\/g,'/');
    const exportsInMod = FILE_EXPORTS[modRel] || (FILE_EXPORTS[modRel] = new Map());
    // default import: 查找 modFile 中的 export default
    // 先尝试从 exportsInMod 查找 'default'
    let defaultCan = exportsInMod.get('default');
    if (!defaultCan) {
      // 查找 modFile 中的 export default xxx 或 export { xxx as default }
      const modSrc = readFile(modFile);
      const defMatch = modSrc.match(/export\s+default\s+([A-Za-z_$][\w$]*)/);
      if (defMatch) {
        defaultCan = exportsInMod.get(defMatch[1]) || `${modRel.replace(/\.[^.]+$/,'')}:${defMatch[1]}`;
      } else {
        // 没有 default 导出，可能文件本身是默认导出对象（用 default 名称）
        defaultCan = `${modRel.replace(/\.[^.]+$/,'')}:default`;
      }
    }
    if (defaultCan) {
      localAlias[defaultName] = defaultCan;
      CANONICAL[defaultCan] = { filePath: modFile, kind: 'unknown' };
    }
    // 处理同时导入的 named exports
    if (dim[2]) {
      const names = dim[2].split(',').map(s=>s.trim()).filter(Boolean);
      for (const n of names) {
        const mm = n.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
        if (!mm) continue;
        const orig = mm[1], local = mm[2] || mm[1];
        const canonical = exportsInMod.get(orig) || `${modRel.replace(/\.[^.]+$/,'')}:${orig}`;
        exportsInMod.set(orig, canonical);
        localAlias[local] = canonical;
        CANONICAL[canonical] = { filePath: modFile, kind: 'unknown' };
      }
    }
  }

  const fileExports = FILE_EXPORTS[relFile] || (FILE_EXPORTS[relFile] = new Map());

  // 对象字面量解析
  const objRe = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*Api)(?:\s*:\s*[^=]+?)?\s*=\s*\{/g;
  let om; while ((om = objRe.exec(src)) !== null) {
    const symName = om[1];
    const start = om.index + om[0].length - 1;
    let i = start, depth = 1, inStr = false, q = '';
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (inStr) {
        if (ch === q && src[i-1] !== '\\') { inStr = false; q = ''; }
      } else {
        if (ch === '"' || ch === "'") { inStr = true; q = ch; }
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) break; }
      }
      i++;
    }
    const body = src.slice(start+1, i);
    const canonical = `${relFile.replace(/\.[^.]+$/,'')}:${symName}`;
    fileExports.set(symName, canonical);
    CANONICAL[canonical] = { filePath: fp, kind: 'object' };

    const entries = NESTED_MAP[canonical] = {};

    /* ---- 重写：在对象 body 中识别 3 种语法 ----
       1) spread: ...xxxApi
       2) key-value:  key: subApi  /  key: async (...) => {...}  /  key: function(...) {}
       3) shorthand method:  async name(args): Promise<...> {...}  |  name(args) {...}
    */
    // 先找所有方法/引用的起始位置，用 2 个正则 + spread 正则
    const anchors = []; // [{pos, name, kind: 'spread'|'kv'|'shorthand', asyncK}]

    // 计算每个字符位置的括号深度（过滤方法参数/类型注解内部的误匹配）
    // 不跟踪模板字面量（`），因为 ${} 中的花括号是平衡的，不影响深度
    const depths = new Array(body.length).fill(0);
    { let d=0, inS=false, q='';
      for (let i=0; i<body.length; i++) {
        const ch = body[i];
        if (inS) {
          if (ch === q && body[i-1] !== '\\') { inS=false; q=''; }
        } else {
          if (ch === '"' || ch === "'") { inS=true; q=ch; }
          else if (ch==='{'||ch==='['||ch==='(') d++;
          else if (ch==='}'||ch===']'||ch===')') d--;
        }
        depths[i] = d;
      }
    }

    const JS_KW = new Set(['if','for','while','switch','catch','return','const','let','var','function','class','new','typeof','void','this','super','import','export','default','await','yield','throw','try','else','do','in','of','instanceof']);
    const spreadRe = /(?:^|[\n,])\s*(\.\.\.[A-Za-z_$][\w$]*)/g;
    { let m; while ((m = spreadRe.exec(body)) !== null) {
        const name = m[1].slice(3);
        const pos = m.index + m[0].indexOf('...');
        if (depths[pos] !== 0) continue;
        anchors.push({ pos, name, kind: 'spread' });
    }}
    const kvRe = /(?:^|[\n,])\s*([A-Za-z_$][\w$]*)\s*:/g;
    { let m; while ((m = kvRe.exec(body)) !== null) {
        const namePos = m.index + m[0].lastIndexOf(m[1]);
        if (depths[namePos] !== 0) continue;
        anchors.push({ pos: namePos, name: m[1], kind: 'kv' });
    }}
    const shortRe = /(?:^|[\n,])(\s*(async\s+)?)([A-Za-z_$][\w$]*)\s*\(/g;
    { let m; while ((m = shortRe.exec(body)) !== null) {
        const name = m[3];
        if (JS_KW.has(name)) continue;
        const namePos = m.index + m[0].lastIndexOf(name);
        if (depths[namePos] !== 0) continue;
        const before = body.slice(Math.max(0, m.index - 80), m.index + m[0].length);
        if (/:\s*$/.test(before.slice(0, -m[0].length))) continue;
        anchors.push({ pos: namePos, name, kind: 'shorthand', asyncK: !!m[2] });
    }}
    anchors.sort((a,b)=>a.pos-b.pos);

    for (let ai = 0; ai < anchors.length; ai++) {
      const a = anchors[ai];
      if (a.pos < 0 || a.pos >= body.length) continue;
      const nextPos = ai+1 < anchors.length ? anchors[ai+1].pos : body.length;
      // 截取方法块：从 a.pos 开始，到 nextPos 之前的最后一个同级逗号/结尾
      let endIdx = nextPos;
      let k = a.pos, d3 = 0, inStr3 = 0, q3 = '', inTpl3 = 0, genD = 0;
      while (k < body.length && k < nextPos + 200) {
        const ch = body[k];
        if (!inStr3 && !inTpl3 && (ch === '"' || ch === "'")) { inStr3 = 1; q3 = ch; }
        else if (inStr3 && ch === q3 && body[k-1] !== '\\') { inStr3 = 0; q3 = ''; }
        else if (!inStr3 && ch === '`') { inTpl3 = inTpl3 ? 0 : 1; }
        else if (!inStr3 && !inTpl3) {
          if (ch === '{' || ch === '[' || ch === '(') d3++;
          else if (ch === '}' || ch === ']' || ch === ')') { d3--; if (d3 < 0) d3 = 0; }
          else if (ch === '<') genD++;
          else if (ch === '>' && genD > 0 && body[k-1] !== '=') genD--;
          else if (ch === ',' && d3 === 0 && genD === 0) { endIdx = k; break; }
        }
        k++;
      }
      const block = body.slice(a.pos, endIdx);
      const blockT = block.trim();
      if (!blockT) continue;

      if (a.kind === 'spread') {
        const target = a.name;
        // 检测 createCrudApi<T>('/path') 模式，注入 CRUD 方法
        const crudMatch = body.slice(a.pos, a.pos + 200).match(/createCrudApi(?:<[^>]+>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/);
        if (crudMatch || target === 'createCrudApi') {
          const crudEndpoint = crudMatch?.[1] || '';
          // 注入 5 个标准 CRUD 方法
          for (const m of ['list','get','create','update','delete']) {
            if (!entries[m]) {
              entries[m] = { kind: 'method' };
              const verbMap = { list: 'get', get: 'get', create: 'post', update: 'put', delete: 'delete' };
              LEAF_DICT[canonical + '.' + m] = { verb: verbMap[m], url: crudEndpoint, returns: '', file: relFile };
            }
          }
          continue;
        }
        const tSym = localAlias[target] || (fileExports.has(target) ? fileExports.get(target) : null);
        entries['__spread_'+target] = tSym || ('LOCAL:'+target);
        continue;
      }

      if (a.kind === 'kv') {
        // 去掉开头 "name:"
        const afterColon = blockT.slice(a.name.length).replace(/^\s*:/,'').trim();
        if (!afterColon) continue;
        // ref: xxxApi 标识符
        const idRef = afterColon.match(/^([A-Za-z_$][\w$]*Api(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*)\s*,?\s*$/);
        if (idRef && !/(async|function|=>)/.test(afterColon.slice(0, 120))) {
          const firstSeg = idRef[1].split('.')[0].split('?')[0].trim();
          const tSym = localAlias[firstSeg] || (fileExports.has(firstSeg) ? fileExports.get(firstSeg) : null);
          entries[a.name] = { kind: 'ref', target: tSym || ('LOCAL:'+firstSeg), restPath: idRef[1].split('.').slice(1).filter(Boolean).join('.') };
          continue;
        }
        // 方法：找 verb/url/Promise
        const verb = afterColon.match(/apiClient(?:\.[A-Za-z_][\w]*)?\s*\.\s*(get|post|put|patch|delete)/);
        const url = afterColon.match(/apiClient(?:\.[A-Za-z_][\w]*)?\s*\.\s*(?:get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]+)/);
        const rtInner = extractPromiseInner(afterColon);
        if (verb || url || rtInner) {
          entries[a.name] = { kind: 'method' };
          LEAF_DICT[canonical + '.' + a.name] = { verb: verb?.[1]||'', url: url?.[1]||'', returns: rtInner||'', file: relFile };
        } else if (/(async\s+)?\([^)]*\)\s*=>|async\s+function|function\s*\(/.test(afterColon)) {
          // 箭头函数或 function 表达式（即使没有 apiClient 直接调用，也标记为方法）
          // 例如: (params) => createCrudApi(...).list(params) 或 (params) => listDataSources({...})
          entries[a.name] = { kind: 'method' };
          LEAF_DICT[canonical + '.' + a.name] = { verb: '', url: '', returns: rtInner||'', file: relFile };
        } else if (/^[A-Za-z_$][\w$]*\s*,?\s*$/.test(afterColon)) {
          // 纯标识符引用（如 create: createDataSource），通常是导入的函数引用
          entries[a.name] = { kind: 'method' };
          LEAF_DICT[canonical + '.' + a.name] = { verb: '', url: '', returns: '', file: relFile };
        } else if (afterColon.startsWith('{')) {
          // 嵌套对象字面量: alert: { batch: alertBatchApi } 或 contracts: { ...contractApi, ... }
          const nestedBody = afterColon;
          const nestedEntries = {};
          // 解析嵌套对象中的 spread: ...xxxApi
          const nspreadRe = /\.\.\.([A-Za-z_$][\w$]*Api)/g;
          let nsm; while ((nsm = nspreadRe.exec(nestedBody)) !== null) {
            const nRef = nsm[1];
            const tSym = localAlias[nRef] || (fileExports.has(nRef) ? fileExports.get(nRef) : null);
            nestedEntries['__spread_'+nRef] = tSym || ('LOCAL:'+nRef);
          }
          // 解析嵌套对象的 key-value 对（ref 模式）
          const nkvRe = /([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*Api)/g;
          let nm; while ((nm = nkvRe.exec(nestedBody)) !== null) {
            const nKey = nm[1];
            const nRef = nm[2];
            const tSym = localAlias[nRef] || (fileExports.has(nRef) ? fileExports.get(nRef) : null);
            nestedEntries[nKey] = { kind: 'ref', target: tSym || ('LOCAL:'+nRef), restPath: '' };
          }
          if (Object.keys(nestedEntries).length) {
            // 将嵌套对象注册为新的 NESTED_MAP 条目
            const nestedCan = canonical + '.' + a.name;
            NESTED_MAP[nestedCan] = nestedEntries;
            entries[a.name] = { kind: 'ref', target: nestedCan, restPath: '' };
          } else {
            entries[a.name] = { kind: 'unknown' };
          }
        } else {
          entries[a.name] = { kind: 'unknown' };
        }
        continue;
      }

      if (a.kind === 'shorthand') {
        const verb = block.match(/apiClient(?:\.[A-Za-z_][\w]*)?\s*\.\s*(get|post|put|patch|delete)/);
        const url = block.match(/apiClient(?:\.[A-Za-z_][\w]*)?\s*\.\s*(?:get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]+)/);
        const rtInner = extractPromiseInner(block);
        if (verb || url || rtInner) {
          entries[a.name] = { kind: 'method' };
          LEAF_DICT[canonical + '.' + a.name] = { verb: verb?.[1]||'', url: url?.[1]||'', returns: rtInner||'', file: relFile };
        } else {
          // shorthand method（async name() {} 或 name() {}），即使没有 apiClient 也标记为方法
          entries[a.name] = { kind: 'method' };
          LEAF_DICT[canonical + '.' + a.name] = { verb: '', url: '', returns: rtInner||'', file: relFile };
        }
      }
    }
  }

  // 直接工厂赋值: const xxxApi = createCrudApi<T>('/path')
  const factoryRe = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*Api)(?:\s*:\s*[^=]+?)?\s*=\s*createCrudApi(?:<[^>]+>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
  let fcm; while ((fcm = factoryRe.exec(src)) !== null) {
    const symName = fcm[1];
    const endpoint = fcm[2];
    const canonical = `${relFile.replace(/\.[^.]+$/,'')}:${symName}`;
    fileExports.set(symName, canonical);
    CANONICAL[canonical] = { filePath: fp, kind: 'object' };
    const entries = NESTED_MAP[canonical] || (NESTED_MAP[canonical] = {});
    // 注入 5 个标准 CRUD 方法
    const verbMap = { list: 'get', get: 'get', create: 'post', update: 'put', delete: 'delete' };
    for (const m of ['list','get','create','update','delete']) {
      if (!entries[m]) {
        entries[m] = { kind: 'method' };
        LEAF_DICT[canonical + '.' + m] = { verb: verbMap[m], url: endpoint, returns: '', file: relFile };
      }
    }
  }

  // 顶层函数
  const fnRe = /export\s+(?:(?:async)\s+)?function\s+([A-Za-z_][\w]*)\s*\(/g;
  let fm; while ((fm = fnRe.exec(src)) !== null) {
    const name = fm[1];
    const slice = src.slice(Math.max(0, fm.index), fm.index + 800);
    const verb = slice.match(/apiClient(?:\.[A-Za-z_][\w]*)?\s*\.\s*(get|post|put|patch|delete)/);
    const url = slice.match(/apiClient(?:\.[A-Za-z_][\w]*)?\s*\.\s*(?:get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]+)/);
    const rtInner = extractPromiseInner(slice);
    const canonical = `${relFile.replace(/\.[^.]+$/,'')}:FN_${name}`;
    fileExports.set(name, canonical);
    LEAF_DICT[canonical] = { verb: verb?.[1]||'', url: url?.[1]||'', returns: rtInner||'', file: relFile };
  }
}

// 第二遍：解析 re-export 链（export { xxx } from './yyy'）
// 多轮迭代以处理深层 re-export 链（a → b → c）
for (let pass = 0; pass < 3; pass++) {
  let resolved = 0;
  for (const fp of allApiFiles) {
    const src = readFile(fp);
    const relFile = path.relative(API_DIR, fp).replace(/\\/g, '/');
    const fileExports = FILE_EXPORTS[relFile] || (FILE_EXPORTS[relFile] = new Map());

    const reexportRe = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    let re; while ((re = reexportRe.exec(src)) !== null) {
      const names = re[1].split(',').map(s => s.trim()).filter(Boolean);
      let modPath = re[2];
      let absMod;
      if (modPath.startsWith('@/')) absMod = path.resolve(APPS, modPath.slice(2));
      else if (modPath.startsWith('.')) absMod = path.resolve(path.dirname(fp), modPath);
      else continue;
      const cands = [absMod + '.ts', absMod + '.tsx', absMod + '.js', path.join(absMod, 'index.ts'), path.join(absMod, 'index.tsx')];
      let modFile = '';
      for (const c of cands) if (fs.existsSync(c)) { modFile = c; break; }
      if (!modFile) continue;
      const modRel = path.relative(API_DIR, modFile).replace(/\\/g, '/');
      const exportsInMod = FILE_EXPORTS[modRel];
      if (!exportsInMod) continue;
      for (const n of names) {
        const mm = n.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
        if (!mm) continue;
        const orig = mm[1], local = mm[2] || mm[1];
        const canonical = exportsInMod.get(orig);
        if (canonical && fileExports.get(local) !== canonical) {
          fileExports.set(local, canonical);
          resolved++;
        }
      }
    }
  }
  if (resolved === 0) break;
}

console.log(`[P6 v5] LEAF_DICT（原子方法）=${Object.keys(LEAF_DICT).length}`);
console.log(`[P6 v5] NESTED_MAP（顶层对象）=${Object.keys(NESTED_MAP).length}`);

const NAME_TO_CANON = {};
for (const [rel, expMap] of Object.entries(FILE_EXPORTS)) {
  for (const [name, can] of expMap.entries()) {
    if (!NAME_TO_CANON[name]) NAME_TO_CANON[name] = [];
    NAME_TO_CANON[name].push(can);
  }
}

function lookupCall(keyPath) {
  const parts = keyPath.split('.').filter(Boolean);
  if (!parts.length) return null;
  const first = parts[0];
  let cands = NAME_TO_CANON[first] || [];
  // Fallback：找所有 canonical 末段为 ":first" 的（例如 finance/account:accountApi）
  if (!cands.length) {
    const suffix = ':' + first;
    for (const can of Object.keys(NESTED_MAP)) {
      if (can.endsWith(suffix)) cands.push(can);
    }
    for (const can of Object.keys(CANONICAL)) {
      if (can.endsWith(suffix) && !cands.includes(can)) cands.push(can);
    }
    // 再扫 LEAF_DICT 的所有前缀
    if (!cands.length) {
      const prefix2 = suffix + '.';
      for (const lk of Object.keys(LEAF_DICT)) {
        const pi = lk.indexOf(suffix);
        if (pi > 0 && (pi + suffix.length === lk.length || lk[pi + suffix.length] === '.')) {
          const can = lk.slice(0, pi + suffix.length);
          if (!cands.includes(can)) cands.push(can);
        }
      }
    }
  }
  for (const can of cands) {
    const res = drillDown(can, parts.slice(1));
    if (res) return res;
  }
  return null;
}

function drillDown(canonical, restParts, visited = null, depth = 0) {
  if (depth > 12) return null;
  if (!visited) visited = new Set();
  const vkey = canonical + '::' + restParts.join('.');
  if (visited.has(vkey)) return null;
  visited.add(vkey);

  if (!restParts.length) {
    if (LEAF_DICT[canonical]) return { dictKey: canonical, info: LEAF_DICT[canonical] };
    return null;
  }
  const [head, ...tail] = restParts;
  const nested = NESTED_MAP[canonical];
  if (nested) {
    for (const [k, v] of Object.entries(nested)) {
      if (k.startsWith('__spread_')) {
        let tSym = v;
        if (tSym.startsWith('LOCAL:')) {
          const localName = tSym.slice(6);
          const filePrefix = canonical.split(':')[0];
          tSym = (FILE_EXPORTS[filePrefix+'.ts'] || FILE_EXPORTS[filePrefix+'/index.ts'] || new Map()).get(localName) || null;
        }
        // Fallback: 若 tSym 无 NESTED_MAP 条目，通过 NAME_TO_CANON 查找正确 canonical
        if (tSym && !NESTED_MAP[tSym]) {
          const refName = tSym.split(':').pop();
          const alts = NAME_TO_CANON[refName];
          if (alts) for (const alt of alts) {
            if (alt !== tSym && NESTED_MAP[alt]) { tSym = alt; break; }
          }
        }
        if (tSym && tSym !== canonical) {
          const subRes = drillDown(tSym, restParts, visited, depth + 1);
          if (subRes) return subRes;
        }
      }
    }
    const entry = nested[head];
    if (entry) {
      if (entry.kind === 'method') {
        if (!tail.length) return { dictKey: canonical+'.'+head, info: LEAF_DICT[canonical+'.'+head] || {} };
        return null;
      }
      if (entry.kind === 'ref') {
        let tSym = entry.target;
        if (tSym.startsWith('LOCAL:')) {
          const localName = tSym.slice(6);
          const filePrefix = canonical.split(':')[0];
          tSym = (FILE_EXPORTS[filePrefix+'.ts'] || FILE_EXPORTS[filePrefix+'/index.ts'] || new Map()).get(localName) || null;
        }
        // Fallback: 若 tSym 无 NESTED_MAP 条目，通过 NAME_TO_CANON 查找正确 canonical
        if (tSym && !NESTED_MAP[tSym]) {
          const refName = tSym.split(':').pop();
          const alts = NAME_TO_CANON[refName];
          if (alts) for (const alt of alts) {
            if (alt !== tSym && NESTED_MAP[alt]) { tSym = alt; break; }
          }
        }
        if (tSym && tSym !== canonical) {
          const nextParts = entry.restPath ? [entry.restPath, ...tail] : tail;
          return drillDown(tSym, nextParts.filter(Boolean), visited, depth + 1);
        }
      }
    }
  }
  const leafKey = canonical + '.' + restParts.join('.');
  if (LEAF_DICT[leafKey]) return { dictKey: leafKey, info: LEAF_DICT[leafKey] };
  if (restParts.length === 1 && LEAF_DICT[canonical+'.'+head]) return { dictKey: canonical+'.'+head, info: LEAF_DICT[canonical+'.'+head] };
  return null;
}

const CALLS = [];
const PAGES_DIR = path.join(APPS, 'pages');
const allPageFiles = walk(PAGES_DIR).filter(p => /\.tsx?$/.test(p));
console.log(`[P6 v5] 扫描 Page 组件：${allPageFiles.length} 个`);

for (const page of allPageFiles) {
  const src = readFile(page);
  const pageRel = path.relative(ROOT, page);
  if (!src) continue;

  const patA = /await\s*\(\s*(\w+)Api\s+as\s+any\s*\)((?:\s*\??\.\s*[A-Za-z_$][\w$]*)+)\s*\??\.\s*\(/g;
  let mm; while ((mm = patA.exec(src)) !== null) {
    const top = mm[1] + 'Api';
    const segs = [...mm[2].matchAll(/\.?\s*\??\s*([A-Za-z_$][\w$]*)/g)].map(x=>x[1]);
    const ctx = src.slice(Math.max(0, mm.index-100), patA.lastIndex + 300);
    const shapes = [...new Set([...(ctx.match(/\.(items|records|data|total|list)\b/g)||[])].map(x=>x.slice(1)))];
    CALLS.push({ page: pageRel, keyPath: [top, ...segs].join('.'), shapes });
  }
  const patB = /(?:^|[\s(,;=:\?])([A-Za-z_$][\w$]*Api)((?:\s*\??\.\s*[A-Za-z_$][\w$]*)+)\s*\??\.\s*\(/g;
  while ((mm = patB.exec(src)) !== null) {
    const top = mm[1];
    if (!/Api$/.test(top)) continue;
    const segs = [...mm[2].matchAll(/\.?\s*\??\s*([A-Za-z_$][\w$]*)/g)].map(x=>x[1]);
    if (!segs.length) continue;
    const ctx = src.slice(Math.max(0, mm.index-100), patB.lastIndex + 300);
    const shapes = [...new Set([...(ctx.match(/\.(items|records|data|total|list)\b/g)||[])].map(x=>x.slice(1)))];
    // 防御性适配器检测：调用点附近是否出现 Array.isArray(...) 兼容写法
    const defensive = /Array\.isArray\s*\(/.test(ctx);
    CALLS.push({ page: pageRel, keyPath: [top, ...segs].join('.'), shapes, defensive });
  }
  const patC = /await\s+([A-Za-z_$][\w$]*Api)(?:\s*\??\.\s*([A-Za-z_$][\w$]*))+\s*\??\s*\(/g;
  while ((mm = patC.exec(src)) !== null) {
    let segStr = src.slice(mm.index, patC.lastIndex).match(/[A-Za-z_$][\w$]*/g) || [];
    if (segStr[0] === 'await') segStr = segStr.slice(1);
    if (segStr.length < 2) continue;
    if (!/Api$/.test(segStr[0])) continue;
    const ctx = src.slice(Math.max(0, mm.index-100), patC.lastIndex + 300);
    const shapes = [...new Set([...(ctx.match(/\.(items|records|data|total|list)\b/g)||[])].map(x=>x.slice(1)))];
    // 防御性适配器检测：调用点附近是否出现 Array.isArray(...) 兼容写法
    const defensive = /Array\.isArray\s*\(/.test(ctx);
    CALLS.push({ page: pageRel, keyPath: segStr.join('.'), shapes, defensive });
  }
}

// 归一化：去掉可能的 "await." 前缀
function normalizeKeyPath(k) {
  return k.startsWith('await.') ? k.slice(6) : k;
}

function uniq(arr, byFn){const s=new Set(); return arr.filter(x=>{const k=byFn(x);if(s.has(k))return false;s.add(k);return true;});}
const UCALLS = uniq(CALLS.map(c=>({...c, keyPath:normalizeKeyPath(c.keyPath)})), c => c.page+'|'+c.keyPath);
console.log(`[P6 v5] 调用去重=${UCALLS.length}`);

const RED=[], YELLOW=[], GREEN=[], AMBER=[];
for (const c of UCALLS) {
  const h = lookupCall(c.keyPath);
  if (!h) { RED.push(c); continue; }
  const r = h.info.returns || '';
  const wantI=c.shapes.includes('items'), wantR=c.shapes.includes('records');
  const wantD=c.shapes.includes('data');
  let t = 'UNKNOWN';
  if (/Paginated(Result|Response)/.test(r) || /items\s*:/.test(r)) t='PAGINATED_ITEMS';
  else if (/records\s*:/.test(r)) t='RECORDS';
  else if (/ApiResponse<[^>]*\[\]>/.test(r)) t='ARRAY';
  else if (/TypedApiResponse<[^>]*\[\]/.test(r)) t='TYPED_ARRAY';
  else if (r) t='OBJECT';
  // 防御性适配器识别：若 page 调用点附近包含 Array.isArray(...) 检查，
  // 说明 page 已兼容 array 与 paginated 两种形状，YELLOW 降级为 GREEN
  const defensive = c.defensive === true;
  const ok = (!wantI || t==='PAGINATED_ITEMS' || t==='ARRAY' || t==='TYPED_ARRAY' || (defensive && (t==='ARRAY' || t==='TYPED_ARRAY'))) && (!wantR || t==='RECORDS' || (defensive && (t==='ARRAY' || t==='TYPED_ARRAY' || t==='OBJECT')));
  // ApiResponse 标准字段规则：ApiResponse<T> 始终包含 data 字段
  // 若 page 访问 .data，与任意 ApiResponse<T> 形状兼容
  const dataOnlyOk = wantD && (t==='OBJECT' || t==='ARRAY' || t==='TYPED_ARRAY' || t==='PAGINATED_ITEMS' || t==='RECORDS');
  if (!wantI && !wantR) GREEN.push({...c,hit:h,pageType:t});
  else if (ok) GREEN.push({...c,hit:h,pageType:t});
  else if (dataOnlyOk) GREEN.push({...c,hit:h,pageType:t});
  else if (t==='UNKNOWN' || !h.info.url) AMBER.push({...c,hit:h,pageType:t});
  else YELLOW.push({...c,hit:h,pageType:t});
}

console.log(`\n┌──────────────────────────────────────────────────────────────────┐`);
console.log(`│ 🔴RED（方法不存在）     ${String(RED.length).padStart(5)}条    │`);
console.log(`│ 🟡YELLOW（返回结构不匹配） ${String(YELLOW.length).padStart(5)}条    │`);
console.log(`│ 🟠AMBER（返回类型未知）   ${String(AMBER.length).padStart(5)}条    │`);
console.log(`│ 🟢GREEN（匹配）         ${String(GREEN.length).padStart(5)}条    │`);
console.log(`│ TOTAL                  ${String(UCALLS.length).padStart(5)}条    │`);
console.log(`└──────────────────────────────────────────────────────────────────┘`);

console.log(`\n============ 🔴 RED（全量）============`);
for (const c of RED) console.log(`  ${c.keyPath.padEnd(60)}  shapes=${(c.shapes.join(',')||'-').padEnd(14)} ${c.page.slice(0,90)}`);

if (YELLOW.length) {
  console.log(`\n============ 🟡 YELLOW（前 30 条）============`);
  for (const c of YELLOW.slice(0,30)) console.log(`  ${c.keyPath.padEnd(60)}  want=${(c.shapes.join(',')||'-').padEnd(10)}  pageType=${c.pageType.padEnd(14)}  ret=${(c.hit.info.returns||'').slice(0,70).replace(/\s+/g,' ')}`);
}

const outDir = path.join(ROOT, 'scripts', 'tmp-output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const CSV = ['page,keyPath,level,shapes,pageType,dictKey,verb,url,returns'];
for (const c of RED) CSV.push([`"${c.page}"`,c.keyPath,'RED',c.shapes.join('|'),'','','','',''].join(','));
for (const c of YELLOW) CSV.push([`"${c.page}"`,c.keyPath,'YELLOW',c.shapes.join('|'),c.pageType,c.hit.dictKey,c.hit.info.verb,`"${c.hit.info.url||''}"`,`"${(c.hit.info.returns||'').replace(/"/g,'""')}"`].join(','));
for (const c of AMBER) CSV.push([`"${c.page}"`,c.keyPath,'AMBER',c.shapes.join('|'),c.pageType,c.hit.dictKey,c.hit.info.verb,`"${c.hit.info.url||''}"`,`"${(c.hit.info.returns||'').replace(/"/g,'""')}"`].join(','));
for (const c of GREEN.slice(0,5000)) CSV.push([`"${c.page}"`,c.keyPath,'GREEN',c.shapes.join('|'),c.pageType,c.hit.dictKey,c.hit.info.verb,`"${c.hit.info.url||''}"`,`"${(c.hit.info.returns||'').replace(/"/g,'""')}"`].join(','));
fs.writeFileSync(path.join(outDir, 'p6-audit-v5-robust.csv'), CSV.join('\n'));
fs.writeFileSync(path.join(outDir, 'p6-red.json'), JSON.stringify(RED, null, 2));
console.log(`\nCSV→${path.join(outDir, 'p6-audit-v5-robust.csv')}`);
console.log(`RED→${path.join(outDir, 'p6-red.json')}`);

console.log('\n[lookup 调试] 前 5 条命中：');
for (const c of GREEN.slice(0,5)) console.log('  ', c.keyPath, '→', c.hit?.dictKey, c.hit?.info?.url);
