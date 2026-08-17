const fs = require('fs');
const path = require('path');
const ROOT = '/Users/air/TOPEMS';
const MODULES_DIR = path.join(ROOT, 'apps/web/src/modules');
function readFile(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function listConfigFiles() {
  return fs.readdirSync(MODULES_DIR)
    .filter(d => fs.existsSync(path.join(MODULES_DIR, d, 'config.ts')))
    .map(d => path.join(MODULES_DIR, d, 'config.ts'));
}
const NAV_GROUPS = {
  overview: { label: '概览', order: 0 },
  master:   { label: '主数据', order: 10 },
  process:  { label: '流程', order: 20 },
  business: { label: '单据', order: 30 },
  analytics:{ label: '分析', order: 40 },
  report:   { label: '报表', order: 50 },
  setting:  { label: '设置', order: 60 },
  other:    { label: '其他', order: 99 },
};
const SUITE_ORDER = { enterprise:10, manufacturing:20, quality:30, supply:40, finance:50, hr:60, crm:70, project:80, collaboration:90, platform:100 };

function parseModuleConfig(filePath) {
  const src = readFile(filePath);
  if (!src) return null;
  const moduleName = path.basename(path.dirname(filePath));
  const pathsMap = {};
  function addPathsFromSource(sourceText) {
    const constRe = /(?:export\s+)?const\s+(\w+_PATHS)\s*=\s*\{/g;
    let cm;
    while ((cm = constRe.exec(sourceText)) !== null) {
      const constName = cm[1];
      let i = cm.index + cm[0].length - 1;
      let depth = 0, inStr = null, inTpl = 0, objStart = i;
      for (; i < sourceText.length; i++) {
        const c = sourceText[i]; const prev = i > 0 ? sourceText[i-1] : '';
        if (prev !== '\\') {
          if (inTpl > 0) { if (c === '`') inTpl--; else if (c === '$' && sourceText[i+1] === '{') { inTpl++; i++; } continue; }
          if (inStr) { if (c === inStr) inStr = null; continue; }
          if (c === '"' || c === "'") { inStr = c; continue; }
          if (c === '`') { inTpl = 1; continue; }
          if (c === '{') depth++;
          else if (c === '}') { depth--; if (depth === 0) break; }
        }
      }
      const objSrc = sourceText.slice(objStart, i + 1);
      function flatten(objSrcInner, prefix = '') {
        if (objSrcInner.trim().startsWith('{')) {
          const inner = objSrcInner.trim();
          let d = 0, inS = null, inT = 0, k = 0;
          for (; k < inner.length; k++) {
            const c = inner[k]; const prev = k>0?inner[k-1]:'';
            if (prev !== '\\') {
              if (inT > 0) { if (c==='`') inT--; else if (c==='$'&&inner[k+1]==='{'){inT++;k++;} continue; }
              if (inS) { if (c===inS) inS=null; continue; }
              if (c==='"'||c==="'"){inS=c;continue;}
              if (c==='`'){inT=1;continue;}
              if (c==='{') d++;
              else if (c==='}'){d--;if(d===0)break;}
            }
          }
          const body = inner.slice(1, k);
          let pos = 0;
          function skipSpacesAndComments() {
            while (pos < body.length) {
              if (/[\s,]/.test(body[pos])) { pos++; continue; }
              if (body[pos] === '/' && body[pos+1] === '/') { while (pos < body.length && body[pos] !== '\n') pos++; continue; }
              if (body[pos] === '/' && body[pos+1] === '*') { pos += 2; while (pos < body.length && !(body[pos]==='*'&&body[pos+1]==='/')) pos++; pos += 2; continue; }
              break;
            }
          }
          while (pos < body.length) {
            skipSpacesAndComments();
            if (pos >= body.length) break;
            const keyM = body.slice(pos).match(/^(\w+)\s*:/);
            if (!keyM) break;
            const key = keyM[1];
            pos += keyM[0].length;
            skipSpacesAndComments();
            if (body[pos] === '"' || body[pos] === "'" || body[pos] === '`') {
              const quote = body[pos]; pos++; let val = '';
              while (pos < body.length && body[pos] !== quote) { if (body[pos] === '\\') { val += body[pos]; pos++; } val += body[pos]; pos++; }
              pos++;
              const fullKey = prefix ? `${prefix}.${key}` : key;
              pathsMap[`${constName}.${fullKey}`] = val;
            } else if (body[pos] === '{') {
              let d2 = 0, inS2 = null, inT2 = 0, start = pos;
              for (; pos < body.length; pos++) {
                const c = body[pos]; const prev = pos>0?body[pos-1]:'';
                if (prev !== '\\') {
                  if (inT2 > 0) { if (c==='`') inT2--; else if (c==='$'&&body[pos+1]==='{'){inT2++;pos++;} continue; }
                  if (inS2) { if (c===inS2) inS2=null; continue; }
                  if (c==='"'||c==="'"){inS2=c;continue;}
                  if (c==='`'){inT2=1;continue;}
                  if (c==='{') d2++;
                  else if (c==='}'){d2--;if(d2===0)break;}
                }
              }
              const nestedSrc = body.slice(start, pos + 1); pos++;
              const fullPrefix = prefix ? `${prefix}.${key}` : key;
              flatten(nestedSrc, fullPrefix);
            } else { while (pos < body.length && body[pos] !== ',') pos++; }
          }
        }
      }
      flatten(objSrc);
    }
  }
  addPathsFromSource(src);
  const pathsImport = src.match(/import\s*\{([^}]+_PATHS[^}]*)\}\s*from\s*['"`]\.\/paths['"`]/);
  if (pathsImport) {
    const pathsFile = path.join(path.dirname(filePath), 'paths.ts');
    const extSrc = readFile(pathsFile);
    if (extSrc) addPathsFromSource(extSrc);
  }
  function resolvePath(raw) {
    if (!raw) return ''; let t = raw.trim();
    if (/^['"`](.*)['"`]$/.test(t)) t = t.slice(1, -1);
    if (t.includes('${')) {
      t = t.replace(/\$\{([^}]+)\}/g, (_, expr) => {
        const key = expr.trim();
        return pathsMap[key] !== undefined ? pathsMap[key] : `\${${key}}`;
      });
    }
    if (pathsMap[t]) return pathsMap[t];
    return t;
  }
  function extractTopLevelPropertyValue(objStr, propName) {
    if (!objStr) return null;
    const re = new RegExp(`(^|[{,])\\s*${propName}\\s*:\\s*`, 'm');
    const startMatch = objStr.match(re);
    if (!startMatch) return null;
    let pos = startMatch.index + startMatch[0].length;
    let depth = 0, inStr = null, inTpl = 0, i = pos;
    for (; i < objStr.length; i++) {
      const c = objStr[i]; const prev = i > 0 ? objStr[i-1] : '';
      if (prev !== '\\') {
        if (inTpl > 0) { if (c === '`') inTpl--; else if (c === '$' && objStr[i+1] === '{') { inTpl++; i++; } continue; }
        if (inStr) { if (c === inStr) inStr = null; continue; }
        if (c === '"' || c === "'") { inStr = c; continue; }
        if (c === '`') { inTpl = 1; continue; }
        if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') { if (depth === 0) break; depth--; }
        else if ((c === ',' || c === ';') && depth === 0) break;
      }
    }
    return objStr.slice(pos, i).trim();
  }
  const rmConfigMatch = src.match(/export\s+const\s+\w+ModuleConfig\s*:\s*RouteModuleConfig\s*=\s*(\{[\s\S]*?)\n\}\s*;\s*\n/);
  const rmObjStr = rmConfigMatch ? rmConfigMatch[1] + '\n}' : null;
  function pickProp(objStr, prop, fallback = null) {
    const raw = extractTopLevelPropertyValue(objStr, prop);
    if (raw === null || raw === undefined) return fallback;
    let v = raw.replace(/\s+as\s+const\s*([,;\s]*)$/g, '$1').trim();
    if (v.endsWith(',')) v = v.slice(0, -1).trim();
    const i18nM = v.match(/i18n\.t\(\s*['"`]([^'"`]+)['"`]/);
    if (i18nM) return i18nM[1];
    const sm = v.match(/^['"`](.*)['"`]\s*$/s);
    if (sm) return sm[1];
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    return v;
  }
  const rmCode = pickProp(rmObjStr, 'code');
  const rmNameKey = pickProp(rmObjStr, 'nameKey');
  const rmSource = pickProp(rmObjStr, 'source');
  const rmSuite = pickProp(rmObjStr, 'suite');
  const rmOrder = pickProp(rmObjStr, 'order');
  const rmPermission = pickProp(rmObjStr, 'permission');
  const rmIcon = pickProp(rmObjStr, 'icon');
  const rmPath = pickProp(rmObjStr, 'path');
  const routesStartIdx = rmObjStr ? rmObjStr.indexOf('routes') : -1;
  let routesArrStr = '';
  if (routesStartIdx >= 0) {
    let i = routesStartIdx;
    while (i < rmObjStr.length && rmObjStr[i] !== '[') i++;
    if (rmObjStr[i] === '[') {
      i++; let depth = 1;
      while (i < rmObjStr.length && depth > 0) {
        const ch = rmObjStr[i];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        if (depth > 0) routesArrStr += ch;
        i++;
      }
    }
  }
  function splitTopLevelObjects(arrStr) {
    const objs = []; let depth = 0, start = -1, inStr = null;
    for (let i = 0; i < arrStr.length; i++) {
      const c = arrStr[i];
      if ((c === '"' || c === "'" || c === '`') && arrStr[i-1] !== '\\') { if (!inStr) inStr = c; else if (inStr === c) inStr = null; }
      if (inStr) continue;
      if (c === '{') { depth++; if (depth === 1) start = i; }
      else if (c === '}') { depth--; if (depth === 0 && start >= 0) { objs.push(arrStr.slice(start, i + 1)); start = -1; } }
    }
    return objs;
  }
  const routeObjStrs = splitTopLevelObjects(routesArrStr);
  const routes = routeObjStrs.map((objStr, idx) => {
    let pathRaw = extractTopLevelPropertyValue(objStr, 'path');
    if (pathRaw) {
      const quoteMatch = pathRaw.match(/^(['"`])/);
      if (quoteMatch) {
        const q = quoteMatch[1];
        let i = 1;
        for (; i < pathRaw.length; i++) { if (pathRaw[i] === '\\') { i++; continue; } if (pathRaw[i] === q) break; }
        pathRaw = pathRaw.slice(0, i + 1);
      }
    }
    const routePath = resolvePath(pathRaw || '');
    const code = (() => { const v = extractTopLevelPropertyValue(objStr, 'code'); if (!v) return ''; const sm = v.match(/['"`]([^'"`]+)['"`]/); return sm ? sm[1] : ''; })();
    const group = (() => { const v = extractTopLevelPropertyValue(objStr, 'group'); if (!v) return ''; const sm = v.match(/['"`]([^'"`]+)['"`]/); return sm ? sm[1] : ''; })();
    const titleKey = (() => { const v = extractTopLevelPropertyValue(objStr, 'titleKey'); if (!v) return ''; const sm = v.match(/['"`]([^'"`]+)['"`]/); return sm ? sm[1] : ''; })();
    const orderRaw = extractTopLevelPropertyValue(objStr, 'order');
    const order = orderRaw && /^\d+$/.test(orderRaw) ? parseInt(orderRaw) : idx;
    const rpRaw = extractTopLevelPropertyValue(objStr, 'requiredPermissions');
    const requiredPermissions = rpRaw ? (rpRaw.match(/['"`]([^'"`]+)['"`]/g) || []).map((s) => s.slice(1, -1)) : [];

    // ★ element (lazyWithRetry + import) → 直接用 objStr 匹配所有 import()，跳过资源文件
    const impAll = objStr.match(/import\(\s*['"`]([^'"`]+)['"`]\s*\)/g) || [];
    let pageImport = '';
    for (const im of impAll) {
      const mm = im.match(/import\(\s*['"`]([^'"`]+)['"`]\s*\)/);
      if (mm && !mm[1].match(/\.(css|scss|less|svg|png|jpg|jpeg|gif|webp|json)$/i)) { pageImport = mm[1]; break; }
    }
    return { code, path: routePath, group, titleKey, order, requiredPermissions, pageImport };
  });

  // ===== NavItems =====
  const navCfgMatch = src.match(/export\s+const\s+\w+NavConfig\s*:\s*ModuleNavConfig\s*=\s*(\{[\s\S]*?)\n\}\s*;\s*\n/);
  const navObjStr = navCfgMatch ? navCfgMatch[1] + '\n}' : null;
  const navCode = pickProp(navObjStr, 'code') || rmCode || moduleName;
  const navNameKey = pickProp(navObjStr, 'nameKey') || rmNameKey;
  const navIcon = pickProp(navObjStr, 'icon') || rmIcon || '';
  const navSource = pickProp(navObjStr, 'source') || rmSource;
  const navSuite = pickProp(navObjStr, 'suite') || rmSuite;
  const navOrder = pickProp(navObjStr, 'order') || rmOrder;
  const navItemsStartIdx = navObjStr ? navObjStr.indexOf('navItems') : -1;
  let navItemsArrStr = '';
  if (navItemsStartIdx >= 0) {
    let i = navItemsStartIdx;
    while (i < navObjStr.length && navObjStr[i] !== '[') i++;
    if (navObjStr[i] === '[') {
      i++; let depth = 1;
      while (i < navObjStr.length && depth > 0) {
        const ch = navObjStr[i];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        if (depth > 0) navItemsArrStr += ch;
        i++;
      }
    }
  }
  const navItemObjStrs = splitTopLevelObjects(navItemsArrStr);
  function extractStringProp(objStr, propName) {
    const v = extractTopLevelPropertyValue(objStr, propName);
    if (!v) return '';
    const sm = v.match(/['"`]([^'"`]+)['"`]/);
    return sm ? sm[1] : '';
  }
  function parseNavItems(objs, depth = 0) {
    return objs.map((objStr, idx) => {
      const code = extractStringProp(objStr, 'code');
      const labelKey = extractStringProp(objStr, 'labelKey');
      const pathRaw = extractTopLevelPropertyValue(objStr, 'path');
      const navPath = resolvePath(pathRaw || '');
      const icon = extractStringProp(objStr, 'icon');
      const group = extractStringProp(objStr, 'group');
      const permission = extractStringProp(objStr, 'permission');
      const orderRaw = extractTopLevelPropertyValue(objStr, 'order');
      const order = orderRaw && /^\d+$/.test(orderRaw) ? parseInt(orderRaw) : idx;
      let children = [];
      const childrenRaw = extractTopLevelPropertyValue(objStr, 'children');
      if (childrenRaw) {
        const inner = childrenRaw.trim();
        if (inner.startsWith('[') && inner.endsWith(']')) {
          children = parseNavItems(splitTopLevelObjects(inner.slice(1, -1)), depth + 1);
        }
      }
      return { code, labelKey, path: navPath, icon, group, permission, order, depth, children };
    });
  }
  const navItems = parseNavItems(navItemObjStrs);
  return {
    moduleName,
    module: { code: navCode || moduleName, nameKey: navNameKey, icon: navIcon, source: navSource, suite: navSuite, order: typeof navOrder === 'number' ? navOrder : 999, permission: rmPermission, path: rmPath ? resolvePath(rmPath) : '' },
    routes,
    navItems,
  };
}

// ===== 主流程 =====
const files = listConfigFiles();
const modules = files.map(f => parseModuleConfig(f)).filter(x => x !== null);
modules.sort((a, b) => ((SUITE_ORDER[a.module.suite] || 999) - (SUITE_ORDER[b.module.suite] || 999)) || (a.module.order - b.module.order));

function resolvePageAbs(configFilePath, pageImport) {
  if (!pageImport) return '';
  const cfgDir = path.dirname(configFilePath);
  let abs = '';
  if (pageImport.startsWith('@/')) abs = path.resolve(ROOT, 'apps/web/src', pageImport.slice(2));
  else if (pageImport.startsWith('.')) abs = path.resolve(cfgDir, pageImport);
  else abs = pageImport;
  const candidates = [
    abs + '.tsx', abs + '.ts', abs + '.jsx', abs + '.js',
    path.join(abs, 'index.tsx'), path.join(abs, 'index.ts'),
    path.join(abs, 'index.jsx'), path.join(abs, 'index.js'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return '';
}
const API_DIRECT_RE = /(from\s+['"](@\/api(?:\/[^'"]*)?)['"]|import\s*\([^)]*@\/api|\baxios\s*\(|\baxios\.[a-zA-Z_$]+\(|https?\.request|fetch\s*\(\s*['"`]\/?(api|graphql)|trpc\.|\.invoke\(|\bhttp\.|request\s*\(\s*\{[^}]{0,80}url:)/i;
const API_INDIRECT_RE = /(from\s+['"]\.\.\/?(?:api|hooks?|services?|stores?|lib\/api)[^'"]*['"]|import\s*\{[^}]*\}\s*from\s*['"]\.\.?\/[^'"]*(?:api|service|hook|store|request|client)[^'"]*['"]|use\w*Store\(|create[A-Z]\w*Api\(|queryOptions|useQuery\(|useMutation\(|useSWR\(|useRequest\(|\bgetQueryKey\b)/i;

function analyzePageBackend(pageAbs, depth = 0) {
  if (!pageAbs) return { exists: false, apiDirect: false, apiIndirect: false, reason: 'element 未配置或 Page 组件 import 路径未命中' };
  const fileSrc = readFile(pageAbs);
  if (!fileSrc) return { exists: false, apiDirect: false, apiIndirect: false, reason: '文件读取失败' };

  // --- Barrel 跟随：若 Page 组件仅是 re-export（< 500 字节、无 JSX、≤3 行非空），
  //     则解析 export { default } from '...' / export * from '...' 的真实路径再递归分析，
  //     最多跟随 2 层，避免 Barrel 文件（如 ReportPage.tsx 单行 re-export）被误判为静态。
  if (depth < 2 && fileSrc.length < 500) {
    const lines = fileSrc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const hasNoJsx = !/<\/?[A-Za-z][\s\S]*>/.test(fileSrc);
    if (lines.length <= 3 && hasNoJsx) {
      for (const ln of lines) {
        const star = ln.match(/^export\s+\*\s+from\s+['"]([^'"]+)['"]\s*;?$/);
        const named = ln.match(/^export\s*\{\s*[^}]*\s*\}\s*from\s+['"]([^'"]+)['"]\s*;?$/);
        const rel = (star && (star[1])) || (named && (named[1]));
        if (rel) {
          let nextAbs;
          if (rel.startsWith('@/')) nextAbs = path.resolve(ROOT, 'apps/web/src', rel.slice(2));
          else if (rel.startsWith('.')) nextAbs = path.resolve(path.dirname(pageAbs), rel);
          else nextAbs = path.resolve(path.dirname(pageAbs), './' + rel);
          const cands = [
            nextAbs + '.tsx', nextAbs + '.ts', nextAbs + '.jsx', nextAbs + '.js',
            path.join(nextAbs, 'index.tsx'), path.join(nextAbs, 'index.ts'),
            path.join(nextAbs, 'index.jsx'), path.join(nextAbs, 'index.js'),
          ];
          let hit = '';
          for (const c of cands) if (fs.existsSync(c)) { hit = c; break; }
          if (hit) {
            const sub = analyzePageBackend(hit, depth + 1);
            if (sub.exists) { sub.reason = '[barrel 跟随] ' + sub.reason; return sub; }
          }
        }
      }
    }
  }

  const dm = fileSrc.match(API_DIRECT_RE);
  const im = fileSrc.match(API_INDIRECT_RE);
  const reason = dm ? ('直连：' + dm[0].replace(/\s+/g,' ').slice(0,90))
                 : (im ? ('间接封装：' + im[0].replace(/\s+/g,' ').slice(0,90))
                       : '未命中 @/api|axios|fetch|http|useQuery|useSWR|hook|store|service 等标识');
  return { exists: true, apiDirect: !!dm, apiIndirect: !!im, reason };
}

const byMod = {};
const routeByCode = {};
const routeByModPath = {};
const navRouteMatch = [];
for (const m of modules) {
  byMod[m.module.code] = m;
  for (const r of m.routes) {
    if (r.code) routeByCode[m.module.code + ':' + r.code] = r;
    routeByModPath[m.module.code + '::' + r.path] = r;
    const pAbs = resolvePageAbs(path.join(MODULES_DIR, m.moduleName, 'config.ts'), r.pageImport);
    r._pageAbs = pAbs;
    r._backend = analyzePageBackend(pAbs);
  }
}

// ===== 编排诊断 =====
const modOrderBySuite = {};
const moduleOrderConflicts = [];
const groupOrderConflicts = [];
const missingGroupDef = [];
const pathCollisions = new Map();
const modulesWithoutOrder = [];
const navsWithoutOrder = [];
const groupsUsed = new Set();
const suitesUsed = new Set();
const navsWithChildren = [];

for (const m of modules) {
  suitesUsed.add(m.module.suite || '_unspecified_');
  if (typeof m.module.order !== 'number') modulesWithoutOrder.push(m.module.code);
  const suite = m.module.suite || '_';
  if (!modOrderBySuite[suite]) modOrderBySuite[suite] = {};
  if (modOrderBySuite[suite][m.module.order]) {
    moduleOrderConflicts.push({ suite, order: m.module.order, modules: [modOrderBySuite[suite][m.module.order], m.module.code] });
  } else {
    modOrderBySuite[suite][m.module.order] = m.module.code;
  }
  const byGroup = {};
  function walkNav(items) {
    for (const it of items) {
      if (it.children && it.children.length) navsWithChildren.push({module: m.module.code, code: it.code, children: it.children.length});
      if (!it.code) continue;
      const g = it.group || 'other';
      groupsUsed.add(g);
      if (!NAV_GROUPS[g]) missingGroupDef.push({ module: m.module.code, code: it.code, group: g });
      if (typeof it.order !== 'number' || it.order === -1) navsWithoutOrder.push({ module: m.module.code, code: it.code });
      if (!byGroup[g]) byGroup[g] = {};
      if (byGroup[g][it.order] && byGroup[g][it.order] !== it.code) {
        groupOrderConflicts.push({ module: m.module.code, group: g, order: it.order, items: [byGroup[g][it.order], it.code] });
      } else {
        byGroup[g][it.order] = it.code;
      }
      if (it.path) {
        const pk = (m.module.suite || '_') + ':' + it.path;
        if (pathCollisions.has(pk)) {
          const arr = pathCollisions.get(pk);
          if (!arr.find(x=>x.code===it.code)) arr.push({module: m.module.code, code: it.code});
        } else pathCollisions.set(pk, [{module: m.module.code, code: it.code}]);
      }
      let matchedRoute = null;
      if (it.code) matchedRoute = routeByCode[m.module.code + ':' + it.code] || null;
      if (!matchedRoute) matchedRoute = routeByModPath[m.module.code + '::' + it.path] || null;
      navRouteMatch.push({ module: m.module.code, suite: m.module.suite, navCode: it.code, navPath: it.path, navGroup: it.group, navOrder: it.order, navIcon: it.icon, navPerm: it.permission, depth: it.depth, route: matchedRoute ? matchedRoute.code : null, routePath: matchedRoute ? matchedRoute.path : '', pageAbs: matchedRoute ? matchedRoute._pageAbs : '', backend: matchedRoute && matchedRoute._backend ? matchedRoute._backend : null });
      walkNav(it.children || []);
    }
  }
  walkNav(m.navItems);
}
const realPathCollisions = [...pathCollisions.entries()].filter(([,v])=>v.length>1);

function pad(s, n){ s = String(s==null?'':s); return s.length < n ? s + ' '.repeat(n-s.length) : s.slice(0,n); }

// ===== 输出 =====
const ROOT2 = ROOT;
console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                                TOPEMS 菜单三级体系全量审计 · 编排 + 连通性 + 后端                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
console.log('');
const totalRoutes = modules.reduce((s,m)=>s+m.routes.length,0);
const missingPageRoutes = modules.reduce((s,m)=>s+m.routes.filter(r=>r._backend && !r._backend.exists).length,0);
const directApi = modules.reduce((s,m)=>s+m.routes.filter(r=>r._backend && r._backend.apiDirect).length,0);
const indirectApi = modules.reduce((s,m)=>s+m.routes.filter(r=>r._backend && r._backend.apiIndirect).length,0);
const staticPage = modules.reduce((s,m)=>s+m.routes.filter(r=>r._backend && r._backend.exists && !r._backend.apiDirect && !r._backend.apiIndirect).length,0);
console.log('模块总数: ' + modules.length + '     三级菜单项(NavItem): ' + navRouteMatch.length + '    嵌套父菜单数: ' + navsWithChildren.length);
console.log('Route 总数: ' + totalRoutes + '   Page 组件缺失: ' + missingPageRoutes + '   直连后端: ' + directApi + '   间连封装: ' + indirectApi + '   静态占位: ' + staticPage);
console.log('覆盖 Suite: ' + [...suitesUsed].sort((a,b)=>(SUITE_ORDER[a]||999)-(SUITE_ORDER[b]||999)).join(', '));
console.log('覆盖 Group: ' + [...groupsUsed].sort((a,b)=>(NAV_GROUPS[a]?.order||99)-(NAV_GROUPS[b]?.order||99)).join(', '));
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('▶ §1. 编排合理性诊断（对照 NAV_GROUPS / SUITE_GROUPS 技术规范）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('1.1 模块.order 冲突（同 Suite 内 order 重复 → 侧边栏模块排序未定）：' + moduleOrderConflicts.length + ' 条 ' + (moduleOrderConflicts.length ? '⚠' : '✅'));
if (!moduleOrderConflicts.length) console.log('   ✅ 37 模块 suite+order 双维度唯一');
else moduleOrderConflicts.forEach(x => console.log('   ⚠  suite=' + x.suite + '  order=' + x.order + '  →  ' + x.modules.join(' vs ')));
console.log('');
console.log('1.2 组内 NavItem.order 冲突（同模块同 group 内两项 order 相同 → 排序不定）：' + groupOrderConflicts.length + ' 条 ⚠');
groupOrderConflicts.forEach(x => console.log('   ⚠  [' + pad(x.module,10) + '] group=' + pad(x.group,10) + ' order=' + pad(x.order,2) + '  →  ' + x.items.join('  ↔  ')));
console.log('');
console.log('1.3 order 缺失：模块=' + modulesWithoutOrder.length + ' 个，NavItem=' + navsWithoutOrder.length + ' 条');
console.log('   ' + (modulesWithoutOrder.length ? '⚠ 模块缺 order：' + modulesWithoutOrder.join(',') : '✅ 全部模块含 order'));
if (navsWithoutOrder.length) navsWithoutOrder.slice(0,15).forEach(x => console.log('   ⚠  NavItem 缺/错 order：[' + pad(x.module,10) + '] ' + x.code));
else console.log('   ✅ 全部 NavItem 含 order');
console.log('');
console.log('1.4 使用未注册 group（types.ts 的 NAV_GROUPS 仅支持 overview/master/process/business/analytics/report/setting/other）：' + missingGroupDef.length + ' 条');
if (!missingGroupDef.length) console.log('   ✅ 所有 group 已在 lib/navigation/types.ts 的 NAV_GROUPS 中注册');
else missingGroupDef.forEach(x => console.log('   ⚠  [' + pad(x.module,10) + '] ' + x.code + '  group=\"' + x.group + '\"（不在 NAV_GROUPS 标准列表）'));
console.log('');
console.log('1.5 Suite 内 Path 前缀冲突（两个不同模块的菜单 path 相同 → 路由匹配命中先加载者）：' + realPathCollisions.length + ' 条');
if (!realPathCollisions.length) console.log('   ✅ 跨模块 path 前缀唯一');
else realPathCollisions.slice(0,10).forEach(([k,items]) => console.log('   ⚠  ' + k + '  →  ' + items.map(x=>x.module+'/'+x.code).join(' ⚡ ')));
console.log('');
console.log('1.6 多级菜单（children）：' + navsWithChildren.length + ' 条（符合 V2 设计：NavItem.children 支持 N 级）');
navsWithChildren.slice(0,12).forEach(x => console.log('   · [' + pad(x.module,10) + '] ' + x.code + '   子项数=' + x.children));
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('▶ §2. 三级菜单完整清单（Suite → 一级模块 → 二级 Group → 三级 NavItem · 含后端连通性色标）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('色标说明: 🟢直连 API/axios/fetch   🟡经 Hook/Store/Service 封装连接   ⚪静态页/未检测到后端   ❌Page 组件缺失   🟫无匹配路由');
console.log('');
let currentSuite = null, mIdx = 0;
const bColor = (n)=> {
  if (!n.route) return '🟫';
  const b = n.backend;
  if (!b || !b.exists) return '❌';
  if (b.apiDirect) return '🟢';
  if (b.apiIndirect) return '🟡';
  return '⚪';
};
for (const m of modules) {
  mIdx++;
  if (m.module.suite !== currentSuite) {
    currentSuite = m.module.suite;
    console.log('');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
    console.log('▓  产品线 Suite: ' + currentSuite + '   （SUITE_GROUPS.order = ' + (SUITE_ORDER[currentSuite]||'undef') + '）');
    console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  }
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('  │ 【一级·模块 #' + pad(mIdx,2) + '】 module.order=' + pad(m.module.order,3) + '  code=' + pad(m.module.code,14) + '  icon=' + pad(m.module.icon,18) + '  src=' + (m.module.source||''));
  console.log('  │            nameKey=' + pad(m.module.nameKey||'',34) + '  path=' + (m.module.path||''));
  console.log('  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘');
  const byGroup = {};
  for (const n of navRouteMatch) if (n.module === m.module.code) {
    const g = n.navGroup || 'other';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(n);
  }
  const gs = Object.keys(byGroup).sort((a,b)=> (NAV_GROUPS[a]?.order ?? 99) - (NAV_GROUPS[b]?.order ?? 99));
  let gi = 0;
  for (const g of gs) {
    gi++;
    const items = byGroup[g].sort((a,b)=>(a.depth||0)-(b.depth||0) || a.navOrder-b.navOrder);
    console.log('');
    console.log('    ╔════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('    ║  【二级·分组 #' + (mIdx+'.'+gi) + '】 key=' + pad(g,10) + '  中文名=\"' + (NAV_GROUPS[g]?.label ?? '未注册⚠') + '\"  group.order=' + (NAV_GROUPS[g]?.order ?? 'undef') + '  共 ' + items.length + ' 项');
    console.log('    ╚════════════════════════════════════════════════════════════════════════════════════════════════╝');
    for (const it of items) {
      const indent = '  '.repeat(it.depth || 0);
      const c = bColor(it);
      const pShort = (it.navPerm || '').length > 32 ? (it.navPerm||'').slice(0,30) + '…' : (it.navPerm || '(开放)');
      const routeMark = it.route ? '✓' : '⚠ 缺';
      console.log('     ' + indent + c + ' order=' + pad(it.navOrder,2) + ' code=' + pad(it.navCode,30) + ' icon=' + pad(it.navIcon,16) + ' perm=' + pad(pShort,32));
      console.log('            path=' + pad(it.navPath,36) + ' 路由匹配=' + routeMark + (it.pageAbs ? ('  page=' + it.pageAbs.replace(ROOT2 + '/apps/web/src/','')) : ''));
      if (it.backend && it.backend.exists && !it.backend.apiDirect && !it.backend.apiIndirect) {
        console.log('            后端=⚪ 静态/占位：' + it.backend.reason.slice(0,110));
      } else if (it.backend && (it.backend.apiDirect || it.backend.apiIndirect)) {
        console.log('            后端=' + (it.backend.apiDirect ? '🟢' : '🟡') + ' ' + it.backend.reason.slice(0,130));
      } else if (it.backend && !it.backend.exists) {
        console.log('            后端=❌ ' + it.backend.reason.slice(0,100));
      }
    }
  }
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('▶ §3. 菜单 → 路由 → Page → 后端·连通性 汇总');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const total = navRouteMatch.length;
const matchedRouteCnt = navRouteMatch.filter(x=>x.route).length;
const missingRoute = total - matchedRouteCnt;
const noPage = navRouteMatch.filter(x=>x.route && x.backend && !x.backend.exists).length;
const direct = navRouteMatch.filter(x=>x.backend && x.backend.apiDirect).length;
const indirect = navRouteMatch.filter(x=>x.backend && x.backend.apiIndirect).length;
const staticP = navRouteMatch.filter(x=>x.backend && x.backend.exists && !x.backend.apiDirect && !x.backend.apiIndirect).length;
const lines = [
  ['3级菜单 有对应路由', matchedRouteCnt, total],
  ['3级菜单 缺失对应路由', missingRoute, total],
  ['→ 路由 Page 组件缺失', noPage, matchedRouteCnt],
  ['→ 路由 Page 直连后端 API', direct, matchedRouteCnt],
  ['→ 路由 Page 经 Hook/Store 封装连后端', indirect, matchedRouteCnt],
  ['→ 路由 Page 静态/占位页', staticP, matchedRouteCnt],
];
for (const L of lines) {
  const [label, v, d] = L;
  const pct = d>0 ? (v/d*100).toFixed(1) : '0.0';
  const bar = '█'.repeat(Math.max(0,Math.round(+pct/3))) + '░'.repeat(Math.max(0,34-Math.round(+pct/3)));
  console.log('  ' + pad(label, 40) + ' ' + bar + ' ' + pad(pct,6) + '%   (' + v + ' / ' + d + ')');
}
console.log('');
console.log('§3.1 菜单缺失对应路由 明细（' + missingRoute + ' 条）：');
navRouteMatch.filter(x=>!x.route).forEach(x=>console.log('   [' + pad(x.module,10) + '] ' + pad(x.navCode,30) + '  path=' + x.navPath));
console.log('');
console.log('§3.2 菜单有路由，但 Page 组件找不到（element import 路径未命中，' + noPage + ' 条，top 30）：');
navRouteMatch.filter(x=>x.route && x.backend && !x.backend.exists).slice(0,30).forEach(x=>{
  const r = routeByCode[x.module+':'+x.route] || routeByModPath[x.module+'::'+x.routePath];
  console.log('   [' + pad(x.module,10) + '] ' + pad(x.navCode,30) + '  尝试 import=' + (r?r.pageImport:'?'));
});
console.log('');
console.log('§3.3 菜单有路由有 Page 但未直连后端（静态/占位，' + staticP + ' 条，top 50）：');
navRouteMatch.filter(x=>x.backend && x.backend.exists && !x.backend.apiDirect && !x.backend.apiIndirect).slice(0,50).forEach(x=>console.log('   [' + pad(x.module,10) + '] ' + pad(x.navCode,30) + '  ' + (x.pageAbs ? x.pageAbs.replace(ROOT2 + '/apps/web/src/','') : '')));
console.log('');
console.log('§3.4 后端连通性 按 Suite 分布：');
const bySuite = {};
for (const n of navRouteMatch) {
  const s = n.suite || '_';
  if (!bySuite[s]) bySuite[s]={tot:0, noRoute:0, noPage:0, direct:0, indirect:0, ok:0, staticP:0};
  bySuite[s].tot++;
  if (!n.route) bySuite[s].noRoute++;
  else if (!n.backend || !n.backend.exists) bySuite[s].noPage++;
  else if (n.backend.apiDirect) bySuite[s].direct++;
  else if (n.backend.apiIndirect) bySuite[s].indirect++;
  else bySuite[s].staticP++;
}
const skeys = Object.keys(bySuite).sort((a,b)=>(SUITE_ORDER[a]||999)-(SUITE_ORDER[b]||999));
console.log('  ' + pad('Suite',14) + pad('总菜单',8) + pad('缺路由',8) + pad('缺Page',8) + pad('直连🟢',8) + pad('间连🟡',8) + pad('静态⚪',8) + '  连通率');
for (const sk of skeys) {
  const d = bySuite[sk];
  const good = d.direct + d.indirect;
  const pct = d.tot ? ((good/(d.tot-d.noRoute-d.noPage))*100).toFixed(0) : '0';
  console.log('  ' + pad(sk,14) + pad(d.tot,8) + pad(d.noRoute,8) + pad(d.noPage,8) + pad(d.direct,8) + pad(d.indirect,8) + pad(d.staticP,8) + '  ' + pct + '%（' + good + '/' + (d.tot-d.noRoute-d.noPage) + '）');
}
console.log('');
console.log('§3.5 后端连通性 按 Group 分布：');
const byGroup = {};
for (const n of navRouteMatch) {
  const g = n.navGroup || 'other';
  if (!byGroup[g]) byGroup[g]={tot:0, noRoute:0, noPage:0, direct:0, indirect:0, staticP:0};
  byGroup[g].tot++;
  if (!n.route) byGroup[g].noRoute++;
  else if (!n.backend || !n.backend.exists) byGroup[g].noPage++;
  else if (n.backend.apiDirect) byGroup[g].direct++;
  else if (n.backend.apiIndirect) byGroup[g].indirect++;
  else byGroup[g].staticP++;
}
const gkeys = Object.keys(byGroup).sort((a,b)=>(NAV_GROUPS[a]?.order||99)-(NAV_GROUPS[b]?.order||99));
console.log('  ' + pad('Group',12) + pad('中文名',8) + pad('总菜单',8) + pad('缺路由',8) + pad('缺Page',8) + pad('直连🟢',8) + pad('间连🟡',8) + pad('静态⚪',8) + '  连通率');
for (const gk of gkeys) {
  const d = byGroup[gk];
  const good = d.direct + d.indirect;
  const base = d.tot - d.noRoute - d.noPage;
  const pct = base ? (good/base*100).toFixed(0) : '-';
  console.log('  ' + pad(gk,12) + pad(NAV_GROUPS[gk]?.label||'—',8) + pad(d.tot,8) + pad(d.noRoute,8) + pad(d.noPage,8) + pad(d.direct,8) + pad(d.indirect,8) + pad(d.staticP,8) + '  ' + pct + (pct!=='-'?'%':'') + '（' + good + '/' + base + '）');
}
