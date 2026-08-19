#!/usr/bin/env node
/**
 * 菜单全面统计与问题分析脚本
 *
 * 用法:
 *   node scripts/analyze-menu.cjs                         # 默认 DRY-RUN：打印报告，exit 0
 *   node scripts/analyze-menu.cjs --fail-fast             # 严格门禁：FAIL 违规 > thresholds 时 exit 1
 *   node scripts/analyze-menu.cjs --report-json=/tmp/m.json  # 输出 JSON 机器报告（供 CI summary 解析）
 *   node scripts/analyze-menu.cjs --thresholds '{"T1":0,"T2":0,"P1":0}'  # 自定义 FAIL 级阈值（默认全 0）
 *   node scripts/analyze-menu.cjs --quiet                 # 不打印全文本报告（配合 --fail-fast / --report-json 使用）
 *   node scripts/analyze-menu.cjs --summary               # 仅打印概览 + 问题清单（不打印附录 A/B）
 *
 * FAIL / WARN 分级（与 perm-gate 一致）：
 *   FAIL = 影响功能/稳定性（如 403 / 404 / 缺必填字段）· --fail-fast 可触发 CI red
 *   WARN = 体验/可维护性问题 · 仅报告，永远不触发 exit 1
 *
 * FAIL 规则（永久 0 容忍基线）:
 *   T1: Route 缺 titleKey
 *   T2: NavItem 缺 labelKey
 *   P1: 权限码未注册
 *   R3: NavItem 无对应 Route（菜单点击 404）
 *
 * WARN 规则（永不 red）：
 *   R1: 路径冲突
 *   R2: NavItem 路径前缀与 module code 不符
 *   R4: Route 菜单无入口（多为详情页，属正常设计）
 *   G1: Route/NavItem 未分配 NavGroup
 *   O1: 模块 order 冲突
 *   C1: Route/NavItem 缺 code
 *   M1: 空壳模块
 *
 * 退出码:
 *   0 = 通过（含默认 DRY-RUN 未传 --fail-fast 时，任何问题都 exit 0）
 *   1 = --fail-fast 模式下 FAIL 违规超过阈值
 *   2 = CLI 参数错误
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'apps/web/src/modules');
const TYPES_FILE = path.join(ROOT, 'apps/web/src/lib/navigation/types.ts');
const PERMISSIONS_FILE = path.join(ROOT, 'apps/web/src/config/permissions.ts');

// ---------- 工具函数 ----------
function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}
function listConfigFiles() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs
    .readdirSync(MODULES_DIR)
    .filter((d) => fs.existsSync(path.join(MODULES_DIR, d, 'config.ts')))
    .map((d) => path.join(MODULES_DIR, d, 'config.ts'));
}
function safeMatch(str, regex, idx = 1, fallback = null) {
  const m = str.match(regex);
  return m ? m[idx] : fallback;
}

// ---------- 1. 读取 NAV_GROUPS / SUITE_GROUPS 规范 ----------
const typeContent = readFile(TYPES_FILE) || '';
const NAV_GROUP_KEYS = ['overview', 'master', 'process', 'business', 'analytics', 'report', 'setting', 'other'];
const SUITE_GROUP_KEYS = [
  'enterprise',
  'manufacturing',
  'quality',
  'supply',
  'finance',
  'hr',
  'crm',
  'project',
  'collaboration',
  'platform',
  'other',
];

// ---------- 2. 读取 permissions.ts 中的已注册权限码 ----------
const permContent = readFile(PERMISSIONS_FILE) || '';
function extractRegisteredPermissions() {
  // 匹配: 任意属性形如 module:resource:action 或 module:action，key 形式 value 形式
  const set = new Set();
  const re = /['"]([a-z_]+:[a-z_:*]+(?::[a-z_*]+)*)['"]/g;
  let m;
  while ((m = re.exec(permContent)) !== null) {
    const v = m[1];
    // 过滤翻译键 (含 shared.*、components.* 等)
    if (
      v.startsWith('shared.') ||
      v.startsWith('components.') ||
      v.startsWith('pages.') ||
      v.startsWith('plugins.') ||
      v.startsWith('routes.') ||
      v.startsWith('layout.')
    )
      continue;
    // 过滤非权限模式（比如 file:import 之类）
    if (!/^[a-z_]+:[a-z_]+:?/.test(v)) continue;
    set.add(v);
  }
  // 也提取 export const PERMISSIONS = { IAM: { DASHBOARD: { READ: 'iam:dashboard:read' } } }
  const literalRe = /['"]([a-z][a-z0-9_-]*:[a-z0-9_:.*-]+)['"]/g;
  while ((m = literalRe.exec(permContent)) !== null) {
    const v = m[1];
    if (v.includes('.') || v.includes('-continue') || v.includes(':') === false) continue;
    if ((v.match(/:/g) || []).length < 1) continue;
    set.add(v);
  }
  return set;
}
const registeredPermissions = extractRegisteredPermissions();

// ---------- 3. 解析每个模块 config.ts ----------
function parseModuleConfig(filePath) {
  const src = readFile(filePath);
  if (!src) return null;
  const moduleName = path.basename(path.dirname(filePath));

  // ===== 先提取所有顶部 *_PATHS 常量（从 config.ts 内联定义 或 从 ./paths 导入的文件） =====
  const pathsMap = {};
  function addPathsFromSource(sourceText) {
    // 匹配 const X_PATHS = {...} as const（贪婪匹配平衡括号找对象）
    const constRe = /(?:export\s+)?const\s+(\w+_PATHS)\s*=\s*\{/g;
    let cm;
    while ((cm = constRe.exec(sourceText)) !== null) {
      const constName = cm[1];
      // 从 { 开始找平衡的 }
      let i = cm.index + cm[0].length - 1; // '{' 的位置
      let depth = 0,
        inStr = null,
        inTpl = 0,
        objStart = i;
      for (; i < sourceText.length; i++) {
        const c = sourceText[i];
        const prev = i > 0 ? sourceText[i - 1] : '';
        if (prev !== '\\') {
          if (inTpl > 0) {
            if (c === '`') inTpl--;
            else if (c === '$' && sourceText[i + 1] === '{') {
              inTpl++;
              i++;
            }
            continue;
          }
          if (inStr) {
            if (c === inStr) inStr = null;
            continue;
          }
          if (c === '"' || c === "'") {
            inStr = c;
            continue;
          }
          if (c === '`') {
            inTpl = 1;
            continue;
          }
          if (c === '{') depth++;
          else if (c === '}') {
            depth--;
            if (depth === 0) break;
          }
        }
      }
      const objSrc = sourceText.slice(objStart, i + 1);
      // 递归扁平化嵌套对象 { key: 'val', nested: { a: 'va' } }
      //   →  pathsMap[constName.key] = 'val', pathsMap[constName.nested.a] = 'va'
      function flatten(objSrcInner, prefix = '') {
        // 找顶层 kv:  key: 'value' 或 key: { ... }
        let j = 0;
        // 跳过外层 { }
        if (objSrcInner.trim().startsWith('{')) {
          const inner = objSrcInner.trim();
          let d = 0,
            inS = null,
            inT = 0,
            k = 0;
          // 找到匹配的外层 {} 边界
          for (; k < inner.length; k++) {
            const c = inner[k];
            const prev = k > 0 ? inner[k - 1] : '';
            if (prev !== '\\') {
              if (inT > 0) {
                if (c === '`') inT--;
                else if (c === '$' && inner[k + 1] === '{') {
                  inT++;
                  k++;
                }
                continue;
              }
              if (inS) {
                if (c === inS) inS = null;
                continue;
              }
              if (c === '"' || c === "'") {
                inS = c;
                continue;
              }
              if (c === '`') {
                inT = 1;
                continue;
              }
              if (c === '{') d++;
              else if (c === '}') {
                d--;
                if (d === 0) break;
              }
            }
          }
          // 内部字符串：从 1 到 k-1
          const body = inner.slice(1, k);
          // 解析 body 里的各个顶层 key
          let pos = 0;
          function skipSpacesAndComments() {
            while (pos < body.length) {
              // 跳过空白 / 逗号
              if (/[\s,]/.test(body[pos])) {
                pos++;
                continue;
              }
              // 跳过行注释 // ... \n
              if (body[pos] === '/' && body[pos + 1] === '/') {
                while (pos < body.length && body[pos] !== '\n') pos++;
                continue;
              }
              // 跳过块注释 /* ... */
              if (body[pos] === '/' && body[pos + 1] === '*') {
                pos += 2;
                while (pos < body.length && !(body[pos] === '*' && body[pos + 1] === '/')) pos++;
                pos += 2;
                continue;
              }
              break;
            }
          }
          while (pos < body.length) {
            skipSpacesAndComments();
            if (pos >= body.length) break;
            // 匹配 key（标识符）
            const keyM = body.slice(pos).match(/^(\w+)\s*:/);
            if (!keyM) break;
            const key = keyM[1];
            pos += keyM[0].length;
            // 跳过 : 之后的空白 / 注释
            skipSpacesAndComments();
            // 判断值的类型：字符串 / 对象 / 数组
            if (body[pos] === '"' || body[pos] === "'" || body[pos] === '`') {
              const quote = body[pos];
              pos++;
              let val = '';
              while (pos < body.length && body[pos] !== quote) {
                if (body[pos] === '\\') {
                  val += body[pos];
                  pos++;
                }
                val += body[pos];
                pos++;
              }
              pos++; // 跳过结尾 quote
              const fullKey = prefix ? `${prefix}.${key}` : key;
              pathsMap[`${constName}.${fullKey}`] = val;
            } else if (body[pos] === '{') {
              // 找匹配的 }
              let d2 = 0,
                inS2 = null,
                inT2 = 0,
                start = pos;
              for (; pos < body.length; pos++) {
                const c = body[pos];
                const prev = pos > 0 ? body[pos - 1] : '';
                if (prev !== '\\') {
                  if (inT2 > 0) {
                    if (c === '`') inT2--;
                    else if (c === '$' && body[pos + 1] === '{') {
                      inT2++;
                      pos++;
                    }
                    continue;
                  }
                  if (inS2) {
                    if (c === inS2) inS2 = null;
                    continue;
                  }
                  if (c === '"' || c === "'") {
                    inS2 = c;
                    continue;
                  }
                  if (c === '`') {
                    inT2 = 1;
                    continue;
                  }
                  if (c === '{') d2++;
                  else if (c === '}') {
                    d2--;
                    if (d2 === 0) break;
                  }
                }
              }
              const nestedSrc = body.slice(start, pos + 1);
              pos++;
              const fullPrefix = prefix ? `${prefix}.${key}` : key;
              flatten(nestedSrc, fullPrefix);
            } else {
              // 其他类型：跳过直到遇到逗号或结束
              while (pos < body.length && body[pos] !== ',') pos++;
            }
          }
        }
      }
      flatten(objSrc);
    }
  }
  addPathsFromSource(src);
  // 如果 import 了 `{ XXX_PATHS } from './paths'`，则读取 paths.ts
  const pathsImport = src.match(/import\s*\{([^}]+_PATHS[^}]*)\}\s*from\s*['"`]\.\/paths['"`]/);
  if (pathsImport) {
    const pathsFile = path.join(path.dirname(filePath), 'paths.ts');
    const extSrc = readFile(pathsFile);
    if (extSrc) addPathsFromSource(extSrc);
  }
  function resolvePath(raw) {
    if (!raw) return '';
    let t = raw.trim();
    // 直接字符串字面量
    if (/^['"`](.*)['"`]$/.test(t)) {
      t = t.slice(1, -1);
    }
    // 展开模板字符串中的 ${XXX_PATHS.key}
    if (t.includes('${')) {
      t = t.replace(/\$\{([^}]+)\}/g, (_, expr) => {
        const key = expr.trim();
        return pathsMap[key] !== undefined ? pathsMap[key] : `\${${key}}`;
      });
    }
    // 常量引用 XXX_PATHS.key
    if (pathsMap[t]) return pathsMap[t];
    return t;
  }

  // ======== 通用：精准提取对象的顶层属性值（字符串片段），考虑嵌套括号/字符串 ========
  function extractTopLevelPropertyValue(objStr, propName) {
    if (!objStr) return null;
    const re = new RegExp(`(^|[{,])\\s*${propName}\\s*:\\s*`, 'm');
    const startMatch = objStr.match(re);
    if (!startMatch) return null;
    let pos = startMatch.index + startMatch[0].length;
    // 找值结束位置（到下一个顶层 , 或顶层 }）
    let depth = 0,
      inStr = null,
      inTpl = 0,
      i = pos;
    for (; i < objStr.length; i++) {
      const c = objStr[i];
      const prev = i > 0 ? objStr[i - 1] : '';
      if (prev !== '\\') {
        if (inTpl > 0) {
          if (c === '`') inTpl--;
          else if (c === '$' && objStr[i + 1] === '{') {
            inTpl++;
            i++;
          }
          continue;
        }
        if (inStr) {
          if (c === inStr) inStr = null;
          continue;
        }
        if (c === '"' || c === "'") {
          inStr = c;
          continue;
        }
        if (c === '`') {
          inTpl = 1;
          continue;
        }
        if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') {
          if (depth === 0) break;
          depth--;
        } else if ((c === ',' || c === ';') && depth === 0) break;
      }
    }
    return objStr.slice(pos, i).trim();
  }

  // ======== (A) RouteModuleConfig 路由配置 ========
  const rmConfigMatch = src.match(
    /export\s+const\s+\w+ModuleConfig\s*:\s*RouteModuleConfig\s*=\s*(\{[\s\S]*?)\n\}\s*;\s*\n/
  );
  const rmObjStr = rmConfigMatch ? rmConfigMatch[1] + '\n}' : null;

  function pickProp(objStr, prop, fallback = null) {
    const raw = extractTopLevelPropertyValue(objStr, prop);
    if (raw === null || raw === undefined) return fallback;
    let v = raw;
    // 去掉 as const
    v = v.replace(/\s+as\s+const\s*([,;\s]*)$/g, '$1').trim();
    if (v.endsWith(',')) v = v.slice(0, -1).trim();
    // i18n.t('xxx') → 取 'xxx'
    const i18nM = v.match(/i18n\.t\(\s*['"`]([^'"`]+)['"`]/);
    if (i18nM) return i18nM[1];
    // 字符串字面量 'xxx' "xxx"
    const sm = v.match(/^['"`](.*)['"`]\s*$/s);
    if (sm) return sm[1];
    // 数字
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    return v;
  }

  const rmCode = pickProp(rmObjStr, 'code');
  const rmNameKey = pickProp(rmObjStr, 'nameKey');
  const rmSource = pickProp(rmObjStr, 'source');
  const rmSuite = pickProp(rmObjStr, 'suite');
  const rmOrder = pickProp(rmObjStr, 'order');
  const rmPermission = pickProp(rmObjStr, 'permission');

  // 提取 routes 数组内的各项
  // 定位 routes: [ ... ] 的内部内容 (用括号计数)
  const routesStartIdx = rmObjStr ? rmObjStr.indexOf('routes') : -1;
  let routesArrStr = '';
  if (routesStartIdx >= 0) {
    let i = routesStartIdx;
    while (i < rmObjStr.length && rmObjStr[i] !== '[') i++;
    if (rmObjStr[i] === '[') {
      i++;
      let depth = 1;
      while (i < rmObjStr.length && depth > 0) {
        const ch = rmObjStr[i];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        if (depth > 0) routesArrStr += ch;
        i++;
      }
    }
  }

  // 用简单正则拆分 routes 数组中的每个 route 对象 (按层级)
  function splitTopLevelObjects(arrStr) {
    const objs = [];
    let depth = 0,
      start = -1,
      inStr = null;
    for (let i = 0; i < arrStr.length; i++) {
      const c = arrStr[i];
      if ((c === '"' || c === "'" || c === '`') && arrStr[i - 1] !== '\\') {
        if (!inStr) inStr = c;
        else if (inStr === c) inStr = null;
      }
      if (inStr) continue;
      if (c === '{') {
        depth++;
        if (depth === 1) start = i;
      } else if (c === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          objs.push(arrStr.slice(start, i + 1));
          start = -1;
        }
      }
    }
    return objs;
  }

  const routeObjStrs = splitTopLevelObjects(routesArrStr);

  const routes = routeObjStrs.map((objStr, idx) => {
    // 使用 extractTopLevelPropertyValue 精准提取
    let pathRaw = extractTopLevelPropertyValue(objStr, 'path');
    // 清洗 pathRaw：当它以字符串开头时，仅保留到字符串闭合为止（防止模板字符串后跟其他属性被混入）
    if (pathRaw) {
      const quoteMatch = pathRaw.match(/^(['"`])/);
      if (quoteMatch) {
        const q = quoteMatch[1];
        let i = 1;
        for (; i < pathRaw.length; i++) {
          if (pathRaw[i] === '\\') {
            i++;
            continue;
          }
          if (pathRaw[i] === q) break;
        }
        pathRaw = pathRaw.slice(0, i + 1);
      }
    }
    const path = resolvePath(pathRaw || '');
    const titleRaw = extractTopLevelPropertyValue(objStr, 'title');
    let title = '';
    if (titleRaw) {
      const i18nM = titleRaw.match(/i18n\.t\(\s*['"`]([^'"`]+)['"`]/);
      if (i18nM) title = i18nM[1];
      else {
        const sm = titleRaw.match(/^['"`](.*)['"`]\s*$/s);
        title = sm ? sm[1] : titleRaw;
      }
    }
    const titleKey = (() => {
      const v = extractTopLevelPropertyValue(objStr, 'titleKey');
      if (!v) return '';
      const sm = v.match(/['"`]([^'"`]+)['"`]/);
      return sm ? sm[1] : '';
    })();
    const code = (() => {
      const v = extractTopLevelPropertyValue(objStr, 'code');
      if (!v) return '';
      const sm = v.match(/['"`]([^'"`]+)['"`]/);
      return sm ? sm[1] : '';
    })();
    const group = (() => {
      const v = extractTopLevelPropertyValue(objStr, 'group');
      if (!v) return '';
      const sm = v.match(/['"`]([^'"`]+)['"`]/);
      return sm ? sm[1] : '';
    })();
    const template = (() => {
      const v = extractTopLevelPropertyValue(objStr, 'template');
      if (!v) return '';
      const sm = v.match(/['"`]([^'"`]+)['"`]/);
      return sm ? sm[1] : '';
    })();
    const action = (() => {
      const v = extractTopLevelPropertyValue(objStr, 'action');
      if (!v) return '';
      const sm = v.match(/['"`]([^'"`]+)['"`]/);
      return sm ? sm[1] : '';
    })();
    // requiredPermissions
    const rpRaw = extractTopLevelPropertyValue(objStr, 'requiredPermissions');
    const requiredPermissions = rpRaw ? (rpRaw.match(/['"`]([^'"`]+)['"`]/g) || []).map((s) => s.slice(1, -1)) : [];
    // order
    const orderRaw = extractTopLevelPropertyValue(objStr, 'order');
    const order = orderRaw && /^\d+$/.test(orderRaw) ? parseInt(orderRaw) : idx;
    return { path, title, titleKey, code, group, template, action, requiredPermissions, order };
  });

  // ======== (B) ModuleNavConfig 导航配置 (xxxNavConfig) ========
  const navCfgMatch = src.match(/export\s+const\s+\w+NavConfig\s*:\s*ModuleNavConfig\s*=\s*(\{[\s\S]*?)\n\}\s*;\s*\n/);
  const navObjStr = navCfgMatch ? navCfgMatch[1] + '\n}' : null;

  const navCode = pickProp(navObjStr, 'code') || rmCode || moduleName;
  const navNameKey = pickProp(navObjStr, 'nameKey') || rmNameKey;
  const navSource = pickProp(navObjStr, 'source') || rmSource;
  const navSuite = pickProp(navObjStr, 'suite') || rmSuite;
  const navOrder = pickProp(navObjStr, 'order') || rmOrder;

  // 提取 navItems 数组
  const navItemsStartIdx = navObjStr ? navObjStr.indexOf('navItems') : -1;
  let navItemsArrStr = '';
  if (navItemsStartIdx >= 0) {
    let i = navItemsStartIdx;
    while (i < navObjStr.length && navObjStr[i] !== '[') i++;
    if (navObjStr[i] === '[') {
      i++;
      let depth = 1;
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
  function extractStringProp(objStr, propName, fromI18n = false) {
    const v = extractTopLevelPropertyValue(objStr, propName);
    if (!v) return '';
    if (fromI18n) {
      const i18nM = v.match(/i18n\.t\(\s*['"`]([^'"`]+)['"`]/);
      if (i18nM) return i18nM[1];
    }
    const sm = v.match(/['"`]([^'"`]+)['"`]/);
    return sm ? sm[1] : '';
  }
  function parseNavItems(objs, depth = 0) {
    return objs.map((objStr, idx) => {
      const code = extractStringProp(objStr, 'code');
      const label = extractStringProp(objStr, 'label', true);
      const labelKey = extractStringProp(objStr, 'labelKey');
      const pathRaw = extractTopLevelPropertyValue(objStr, 'path');
      const path = resolvePath(pathRaw || '');
      const icon = extractStringProp(objStr, 'icon');
      const group = extractStringProp(objStr, 'group');
      const permission = extractStringProp(objStr, 'permission');
      const showInSidebar = extractStringProp(objStr, 'showInSidebar');
      const orderRaw = extractTopLevelPropertyValue(objStr, 'order');
      const order = orderRaw && /^\d+$/.test(orderRaw) ? parseInt(orderRaw) : idx;
      // children
      let children = [];
      const childrenRaw = extractTopLevelPropertyValue(objStr, 'children');
      if (childrenRaw) {
        const inner = childrenRaw.trim();
        if (inner.startsWith('[') && inner.endsWith(']')) {
          const childObjStrs = splitTopLevelObjects(inner.slice(1, -1));
          children = parseNavItems(childObjStrs, depth + 1);
        }
      }
      return { code, label, labelKey, path, icon, group, permission, showInSidebar, order, depth, children };
    });
  }

  const navItems = parseNavItems(navItemObjStrs);

  return {
    moduleName,
    filePath: path.relative(ROOT, filePath),
    module: {
      code: navCode || moduleName,
      nameKey: navNameKey,
      source: navSource,
      suite: navSuite,
      order: typeof navOrder === 'number' ? navOrder : null,
      permission: rmPermission,
    },
    routes,
    navItems,
  };
}

// ---------- 4. 汇总分析 ----------
function flattenNavItems(items, acc = []) {
  for (const it of items) {
    acc.push(it);
    if (it.children && it.children.length) flattenNavItems(it.children, acc);
  }
  return acc;
}

function analyze() {
  const files = listConfigFiles();
  const modules = files.map((f) => parseModuleConfig(f)).filter((x) => x !== null);

  // 统计
  const stats = {
    totalModules: modules.length,
    modulesBySuite: {},
    modulesBySource: {},
    coreModules: [],
    pluginModules: [],
    totalRoutes: 0,
    routesWithoutTitleKey: [],
    routesWithoutGroup: [],
    totalNavItems: 0,
    navItemsByGroup: {},
    navItemsWithoutLabelKey: [],
    navItemsWithoutGroup: [],
    navItemsTopLevel: 0,
    navItemsWithChildren: 0,
    maxDepth: 0,
    totalPermissionsRequired: 0,
    permissionsMissingFromRegistry: [],
    pathsAll: [],
    pathConflicts: [],
    pathPrefixMismatch: [],
    moduleOrderConflicts: [],
    routesWithoutCode: [],
    navItemsWithoutCode: [],
  };

  // 模块 order 冲突检测
  const orderMap = {};
  for (const m of modules) {
    const { code, source, suite, order, nameKey } = m.module;
    if (source) {
      stats.modulesBySource[source] = (stats.modulesBySource[source] || 0) + 1;
      if (source === 'core') stats.coreModules.push(code);
      else if (source === 'plugin') stats.pluginModules.push(code);
    }
    if (suite) {
      stats.modulesBySuite[suite] = (stats.modulesBySuite[suite] || 0) + 1;
    }
    if (typeof order === 'number') {
      const key = `${source || '_'}:${suite || '_'}`;
      if (!orderMap[key]) orderMap[key] = {};
      if (orderMap[key][order]) {
        stats.moduleOrderConflicts.push({
          key,
          order,
          modules: [orderMap[key][order], code],
        });
      } else {
        orderMap[key][order] = code;
      }
    }
    if (!nameKey) {
      // 标记缺失 nameKey 的模块
    }

    // routes 分析
    for (const r of m.routes) {
      stats.totalRoutes++;
      stats.pathsAll.push({ path: r.path, module: m.module.code, type: 'route', code: r.code });
      if (!r.titleKey) stats.routesWithoutTitleKey.push({ module: m.module.code, path: r.path, title: r.title });
      if (!r.group) stats.routesWithoutGroup.push({ module: m.module.code, path: r.path });
      if (!r.code) stats.routesWithoutCode.push({ module: m.module.code, path: r.path });
      for (const p of r.requiredPermissions) {
        stats.totalPermissionsRequired++;
        if (!registeredPermissions.has(p)) {
          stats.permissionsMissingFromRegistry.push({
            module: m.module.code,
            path: r.path,
            permission: p,
          });
        }
      }
    }

    // navItems 分析
    const flat = flattenNavItems(m.navItems);
    for (const it of flat) {
      stats.totalNavItems++;
      if (it.depth === 0) stats.navItemsTopLevel++;
      if (it.depth + 1 > stats.maxDepth) stats.maxDepth = it.depth + 1;
      if (it.children && it.children.length) stats.navItemsWithChildren++;
      if (it.group) {
        stats.navItemsByGroup[it.group] = (stats.navItemsByGroup[it.group] || 0) + 1;
      } else {
        stats.navItemsWithoutGroup.push({ module: m.module.code, code: it.code, path: it.path });
      }
      if (!it.labelKey) stats.navItemsWithoutLabelKey.push({ module: m.module.code, code: it.code, label: it.label });
      if (!it.code) stats.navItemsWithoutCode.push({ module: m.module.code, path: it.path });
      if (it.permission) {
        stats.totalPermissionsRequired++;
        if (!registeredPermissions.has(it.permission)) {
          stats.permissionsMissingFromRegistry.push({
            module: m.module.code,
            path: it.path,
            permission: it.permission,
          });
        }
      }
      if (it.path) {
        stats.pathsAll.push({ path: it.path, module: m.module.code, type: 'navItem', code: it.code });
        // 前缀检查: /<module>/ 开头
        const expectedPrefix = `/${m.module.code}/`;
        if (it.path !== `/${m.module.code}` && !it.path.startsWith(expectedPrefix)) {
          stats.pathPrefixMismatch.push({ module: m.module.code, path: it.path });
        }
      }
    }
  }

  // 路径冲突检测（仅当路径被跨模块使用时才算冲突，同模块内 Route ↔ NavItem 共享同路径视为正常匹配）
  const pathMap = {};
  for (const p of stats.pathsAll) {
    if (!p.path) continue;
    if (!pathMap[p.path]) pathMap[p.path] = [];
    pathMap[p.path].push(p);
  }
  for (const [path, entries] of Object.entries(pathMap)) {
    if (entries.length > 1) {
      const uniqueModules = new Set(entries.map((e) => e.module));
      // 如果只有 1 个模块，且正好是 route + navItem，视为匹配对而非冲突
      if (uniqueModules.size === 1 && entries.length <= 2) continue;
      stats.pathConflicts.push({ path, entries });
    }
  }

  // ============ 输出报告 ============
  const lines = [];
  const p = (s) => lines.push(s);
  const hr = () => p('─'.repeat(78));

  p('');
  p('╔══════════════════════════════════════════════════════════════════════════════╗');
  p('║                     TOPEMS 菜单全面统计与问题分析报告                        ║');
  p('╚══════════════════════════════════════════════════════════════════════════════╝');
  p(` 生成时间: ${new Date().toLocaleString('zh-CN')}`);
  p(` 扫描模块目录: apps/web/src/modules/*/config.ts`);
  p(` 已注册权限码数量 (permissions.ts): ${registeredPermissions.size}`);
  hr();

  // ===== 1. 模块概览 =====
  p('');
  p('【1/6】模块概览');
  hr();
  p(`  总模块数         : ${stats.totalModules}`);
  const srcCts = Object.entries(stats.modulesBySource)
    .map(([k, v]) => `${k}=${v}`)
    .join('  ');
  p(`  Source 分布      : ${srcCts}`);
  const suiteCts = Object.entries(stats.modulesBySuite)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join('  ');
  p(`  L1 业务域分布    : ${suiteCts}`);
  p(`  Core 模块列表    : ${stats.coreModules.sort().join(', ')}`);
  p(`  Plugin 模块列表  : ${stats.pluginModules.sort().join(', ')}`);
  p('');

  // 模块明细表格
  p('  ┌──────┬──────────────────────┬──────────┬────────────┬────────┬───────┬──────────┬──────────┐');
  p('  │序號  │ 模块 code            │ source   │ suite      │ order  │ routes│ navItems │ nameKey  │');
  p('  ├──────┼──────────────────────┼──────────┼────────────┼────────┼───────┼──────────┼──────────┤');
  [...modules]
    .sort((a, b) => (a.module.order || 999) - (b.module.order || 999))
    .forEach((m, i) => {
      const c = m.module;
      const niCount = flattenNavItems(m.navItems).length;
      const nameKeyFlag = c.nameKey ? '✓' : '✗ MISSING';
      p(
        `  │ ${String(i + 1).padStart(4)} │ ${c.code.padEnd(20)} │ ${(c.source || '-').padEnd(8)} │ ${(c.suite || '-').padEnd(10)} │ ${String(c.order || '--').padStart(6)} │ ${String(m.routes.length).padStart(5)} │ ${String(niCount).padStart(8)} │ ${nameKeyFlag.padEnd(8)} │`
      );
    });
  p('  └──────┴──────────────────────┴──────────┴────────────┴────────┴───────┴──────────┴──────────┘');

  // ===== 2. 菜单项统计 =====
  p('');
  p('【2/6】菜单项 (Route + NavItem) 统计');
  hr();
  p(`  Route 项总数     : ${stats.totalRoutes}`);
  p(`  NavItem 项总数   : ${stats.totalNavItems}`);
  p(`  NavItem 顶层项数 : ${stats.navItemsTopLevel}`);
  p(`  含 children 项数 : ${stats.navItemsWithChildren}`);
  p(`  菜单最大嵌套深度 : ${stats.maxDepth}`);
  p('');
  p('  NavGroup 分布:');
  NAV_GROUP_KEYS.forEach((g) => {
    const c = stats.navItemsByGroup[g] || 0;
    const bar = '█'.repeat(Math.min(Math.round(c / 2), 40));
    p(`    ${g.padEnd(10)} ${String(c).padStart(4)}  ${bar}`);
  });
  const unGrouped = stats.navItemsWithoutGroup.length + stats.routesWithoutGroup.length;
  if (unGrouped > 0) p(`    ⚠  无 group 项数 : ${unGrouped}`);

  // ===== 3. 翻译覆盖 =====
  p('');
  p('【3/6】i18n 翻译 key 覆盖');
  hr();
  p(
    `  Route titleKey 缺失率 : ${stats.routesWithoutTitleKey.length} / ${stats.totalRoutes}  = ${stats.totalRoutes ? ((stats.routesWithoutTitleKey.length / stats.totalRoutes) * 100).toFixed(1) : '0.0'}%`
  );
  p(`  NavItem labelKey 缺失 : ${stats.navItemsWithoutLabelKey.length} / ${stats.totalNavItems}`);
  if (stats.routesWithoutTitleKey.length) {
    p('');
    p('  ▶ 以下路由缺少 titleKey（语言切换时标题不更新）:');
    stats.routesWithoutTitleKey.slice(0, 30).forEach((r) => {
      p(`    [${r.module}] ${r.path.padEnd(48)}  → "${r.title}"`);
    });
    if (stats.routesWithoutTitleKey.length > 30) p(`    ... 还有 ${stats.routesWithoutTitleKey.length - 30} 项未列出`);
  }
  if (stats.navItemsWithoutLabelKey.length) {
    p('');
    p('  ▶ 以下 NavItem 缺少 labelKey:');
    stats.navItemsWithoutLabelKey.slice(0, 20).forEach((r) => {
      p(`    [${r.module}] code=${(r.code || '-').padEnd(22)}  → label="${r.label}"`);
    });
    if (stats.navItemsWithoutLabelKey.length > 20)
      p(`    ... 还有 ${stats.navItemsWithoutLabelKey.length - 20} 项未列出`);
  }

  // ===== 4. 权限覆盖 =====
  p('');
  p('【4/6】权限码覆盖分析');
  hr();
  p(`  权限要求总数     : ${stats.totalPermissionsRequired}`);
  p(`  未注册权限码     : ${stats.permissionsMissingFromRegistry.length}`);
  const missingRate = stats.totalPermissionsRequired
    ? ((stats.permissionsMissingFromRegistry.length / stats.totalPermissionsRequired) * 100).toFixed(1)
    : '0.0';
  p(`  未注册比例       : ${missingRate}%`);
  if (stats.permissionsMissingFromRegistry.length) {
    // 按 module 聚合
    const byModule = {};
    stats.permissionsMissingFromRegistry.forEach((x) => {
      if (!byModule[x.module]) byModule[x.module] = [];
      byModule[x.module].push(x);
    });
    p('');
    p('  ▶ 未在 permissions.ts 中注册的权限码（可能导致 403）:');
    Object.entries(byModule).forEach(([mod, list]) => {
      p(`    [${mod}] 共 ${list.length} 个:`);
      list.slice(0, 5).forEach((x) => {
        p(`      - ${x.permission.padEnd(36)}  (${x.path})`);
      });
      if (list.length > 5) p(`      ... 还有 ${list.length - 5} 个未列出`);
    });
  }

  // ===== 5. 路径一致性 =====
  p('');
  p('【5/6】路径一致性检查');
  hr();
  p(`  去重前路径总数   : ${stats.pathsAll.length}`);
  p(`  路径冲突数       : ${stats.pathConflicts.length}`);
  p(`  模块前缀不匹配   : ${stats.pathPrefixMismatch.length}`);
  if (stats.pathConflicts.length) {
    p('');
    p('  ▶ 以下路径被多个模块/页面共享（需确认是否故意）:');
    stats.pathConflicts.forEach((c) => {
      p(`    PATH: ${c.path}`);
      c.entries.forEach((e) => p(`      ↳ [${e.module}] ${e.type} code=${e.code}`));
    });
  }
  if (stats.pathPrefixMismatch.length) {
    p('');
    p('  ▶ 以下 NavItem 路径不是以 /<moduleCode>/ 开头:');
    stats.pathPrefixMismatch.forEach((x) => {
      p(`    [${x.module}]  ${x.path}`);
    });
  }

  // ===== 6. 其他规范问题 =====
  p('');
  p('【6/6】其他规范合规问题');
  hr();
  p(`  模块 order 冲突 : ${stats.moduleOrderConflicts.length} 组`);
  if (stats.moduleOrderConflicts.length) {
    stats.moduleOrderConflicts.forEach((c) => {
      p(`    ${c.key}  order=${c.order}  冲突模块: ${c.modules.join(' ↔ ')}`);
    });
  }
  p(`  Route 缺 code    : ${stats.routesWithoutCode.length}`);
  p(`  NavItem 缺 code  : ${stats.navItemsWithoutCode.length}`);
  stats.routesWithoutCode.forEach((x) => p(`    ⚠ [${x.module}] Route 无 code: ${x.path}`));

  // ===== 新增：Route ↔ NavItem 双向匹配 =====
  const orphanRoutes = []; // 有 Route 但无 NavItem（页面存在，用户无法从菜单到达）
  const orphanNavItems = []; // 有 NavItem 但无 Route（菜单点击可能 404）

  for (const m of modules) {
    const navPaths = new Set(
      flattenNavItems(m.navItems)
        .filter((x) => x.path)
        .map((x) => x.path)
    );
    const routePaths = new Set(m.routes.filter((x) => x.path).map((x) => x.path));
    for (const r of m.routes) {
      if (!r.path) continue;
      if (!navPaths.has(r.path))
        orphanRoutes.push({ module: m.module.code, code: r.code, path: r.path, title: r.title });
    }
    for (const ni of flattenNavItems(m.navItems)) {
      if (!ni.path) continue;
      if (!routePaths.has(ni.path))
        orphanNavItems.push({ module: m.module.code, code: ni.code, path: ni.path, label: ni.label });
    }
  }

  // ===== 新增：附录A 逐项菜单清单 =====
  p('');
  hr();
  p('附录A：逐项菜单清单（按模块 → NavGroup 分组）');
  hr();

  for (const m of [...modules].sort((a, b) => (a.module.order || 999) - (b.module.order || 999))) {
    const mc = m.module;
    const navItems = flattenNavItems(m.navItems);
    if (navItems.length === 0 && m.routes.length === 0) continue;
    const suiteLabel = mc.suite ? (SUITE_GROUP_KEYS.includes(mc.suite) ? mc.suite : 'other') : 'other';
    p('');
    p(`  ┌─ ${mc.code} ────────────────────────────────────────────────────────────────────────────────────┐`);
    p(
      `  │  nameKey: ${mc.nameKey || '(缺失)'}  source: ${(mc.source || '-').padEnd(6)}  suite: ${suiteLabel.padEnd(14)}  order: ${String(mc.order || '--').padStart(3)}  │`
    );
    p(
      `  │  Routes=${String(m.routes.length).padStart(3)}  NavItems=${String(navItems.length).padStart(3)}                                                           │`
    );
    p(`  ├────────────────────────────────────────────────────────────────────────────────────────────────┤`);

    if (m.routes.length === 0 && navItems.length === 0) {
      p('  │  (空模块)                                                                                      │');
    } else {
      // 按 NavGroup 聚合 NavItems & Routes
      const groupMap = {};
      const pushGroup = (g, type, item) => {
        if (!g) g = 'other';
        if (!groupMap[g]) groupMap[g] = { navItems: [], routes: [] };
        groupMap[g][type].push(item);
      };
      navItems.forEach((ni) => pushGroup(ni.group, 'navItems', ni));
      m.routes.forEach((r) => pushGroup(r.group, 'routes', r));

      NAV_GROUP_KEYS.forEach((g) => {
        const gm = groupMap[g];
        if (!gm) return;
        p(`  │  ▸ ${g}                                                                                        │`);
        const allByPath = {};
        gm.navItems.forEach((x) => {
          if (x.path) {
            allByPath[x.path] = allByPath[x.path] || {};
            allByPath[x.path].nav = x;
          }
        });
        gm.routes.forEach((x) => {
          if (x.path) {
            allByPath[x.path] = allByPath[x.path] || {};
            allByPath[x.path].route = x;
          }
        });
        // 再补只在 NavGroup 一边的
        gm.navItems
          .filter((x) => !x.path)
          .forEach((x, i) => {
            allByPath['__noPathNav__' + i] = { nav: x };
          });
        gm.routes
          .filter((x) => !x.path)
          .forEach((x, i) => {
            allByPath['__noPathR__' + i] = { route: x };
          });
        Object.entries(allByPath).forEach(([path, pair], idx) => {
          const route = pair.route || null;
          const nav = pair.nav || null;
          const label = (nav ? nav.label : '') || (route ? route.title : '');
          const code = (nav ? nav.code : '') || (route ? route.code : '');
          const tKeyFlag = route ? (route.titleKey ? 'T' : '░') : '';
          const lKeyFlag = nav ? (nav.labelKey ? 'L' : '░') : '';
          const permFlag = nav ? (nav.permission ? 'P' : '·') : route && route.requiredPermissions.length ? 'R' : '·';
          const dispPath = path.startsWith('__noPath') ? '(无 path)' : path;
          const pad = 48;
          p(
            `  │     ${String(idx + 1).padStart(2)} ${code.padEnd(24)} ${lKeyFlag}${tKeyFlag}${permFlag}  ${dispPath.padEnd(pad)}  ${label.slice(0, 16).padEnd(16)}│`
          );
        });
      });
      // other
      if (groupMap.other) {
        const g = 'other';
        const gm = groupMap.other;
        p(`  │  ▸ ${g} ⚠ 未归类                                                                               │`);
        gm.navItems.forEach((x, i) =>
          p(
            `  │     N${String(i + 1).padStart(2)} ${(x.code || '').padEnd(24)} ${x.labelKey ? 'L' : '░'}  ${x.path || '(无path)'.padEnd(48)}  ${(x.label || '').slice(0, 16).padEnd(16)}│`
          )
        );
        gm.routes.forEach((x, i) =>
          p(
            `  │     R${String(i + 1).padStart(2)} ${(x.code || '').padEnd(24)}  ${x.titleKey ? 'T' : '░'} ${x.path || '(无path)'.padEnd(48)}  ${(x.title || '').slice(0, 16).padEnd(16)}│`
          )
        );
      }
    }
    p(`  └────────────────────────────────────────────────────────────────────────────────────────────────┘`);
  }

  // ===== 新增：附录B 孤立项分析 =====
  p('');
  hr();
  p('附录B：Route ↔ NavItem 双向匹配分析');
  hr();
  p(`  有 Route 但无 NavItem（页面存在，但菜单没入口）: ${orphanRoutes.length}`);
  p(`  有 NavItem 但无 Route（菜单点击可能 404）     : ${orphanNavItems.length}`);
  if (orphanRoutes.length) {
    p('');
    p('  ▶ 菜单无入口的路由（可能是深层详情页/弹窗页，也可能漏配菜单）：');
    // 按 module 聚合
    const orphByMod = {};
    orphanRoutes.forEach((x) => {
      if (!orphByMod[x.module]) orphByMod[x.module] = [];
      orphByMod[x.module].push(x);
    });
    Object.entries(orphByMod).forEach(([mod, list]) => {
      p(`    [${mod}] ${list.length} 项:`);
      list.slice(0, 6).forEach((x) => p(`      - ${x.path.padEnd(44)}  ${x.title.slice(0, 20)}`));
      if (list.length > 6) p(`      ... 还有 ${list.length - 6} 项未列出`);
    });
  }
  if (orphanNavItems.length) {
    p('');
    p('  ▶ 无对应 Route 的 NavItem（高风险！可能触发 404）：');
    orphanNavItems.forEach((x) => p(`    [${x.module}]  code=${x.code}  path=${x.path}  label="${x.label}"`));
  }

  // ===== 汇总问题清单（补充新增问题） =====
  // FAIL 级规则（永久 0 容忍）：count=0 也生成条目，方便 CI summary 展示 baseline 对比
  const issues = [];
  // 工具：按计数选择 level（FAIL 级规则 count=0 时展示 PASS，避免误导；仍保留 isFail 基线属性）
  const fl = (count) => (count === 0 ? 'PASS' : 'FAIL');
  // --- FAIL 级：永远 push 条目（含 count=0），便于 JSON 报告和 --fail-fast 阈值判定 ---
  issues.push({
    level: fl(stats.routesWithoutTitleKey.length),
    rule: 'T1',
    id: 'T1',
    msg: `${stats.routesWithoutTitleKey.length} 个路由缺少 titleKey，语言切换后页面标题/面包屑不更新`,
  });
  issues.push({
    level: fl(stats.navItemsWithoutLabelKey.length),
    rule: 'T2',
    id: 'T2',
    msg: `${stats.navItemsWithoutLabelKey.length} 个 NavItem 缺少 labelKey，语言切换后菜单名不更新`,
  });
  issues.push({
    level: fl(stats.permissionsMissingFromRegistry.length),
    rule: 'P1',
    id: 'P1',
    msg: `${stats.permissionsMissingFromRegistry.length} 个权限码未在 permissions.ts 注册，可能导致前端拦截 403 或导航隐藏`,
  });
  issues.push({
    level: fl(orphanNavItems.length),
    rule: 'R3',
    id: 'R3',
    msg: `${orphanNavItems.length} 个 NavItem 无对应 Route，点击会 404`,
  });
  // --- WARN 级：仅 count>0 时 push 条目（避免污染报告）---
  if (stats.pathConflicts.length)
    issues.push({
      level: 'WARN',
      rule: 'R1',
      id: 'R1',
      msg: `${stats.pathConflicts.length} 条路径存在冲突（不同模块/配置使用同一路径）`,
    });
  if (stats.pathPrefixMismatch.length)
    issues.push({
      level: 'WARN',
      rule: 'R2',
      id: 'R2',
      msg: `${stats.pathPrefixMismatch.length} 个 NavItem 路径前缀与 module code 不符，增加 404 风险`,
    });
  if (orphanRoutes.length)
    issues.push({
      level: 'WARN',
      rule: 'R4',
      id: 'R4',
      msg: `${orphanRoutes.length} 条 Route 在菜单中无入口（若是详情页 OK，若是列表页可能漏配）`,
    });
  if (stats.routesWithoutGroup.length + stats.navItemsWithoutGroup.length)
    issues.push({
      level: 'WARN',
      rule: 'G1',
      id: 'G1',
      msg: `${stats.routesWithoutGroup.length + stats.navItemsWithoutGroup.length} 个菜单项未分配 NavGroup，侧栏可能归类到 "other"`,
    });
  if (stats.moduleOrderConflicts.length)
    issues.push({
      level: 'WARN',
      rule: 'O1',
      id: 'O1',
      msg: `${stats.moduleOrderConflicts.length} 组模块 order 冲突，菜单排序不确定`,
    });
  if (stats.routesWithoutCode.length + stats.navItemsWithoutCode.length)
    issues.push({
      level: 'WARN',
      rule: 'C1',
      id: 'C1',
      msg: `${stats.routesWithoutCode.length + stats.navItemsWithoutCode.length} 个菜单项缺少 code 字段，Tab/面包屑索引可能失败`,
    });
  // registry/shared 空模块检查
  const emptyModules = modules.filter((m) => m.routes.length === 0 && flattenNavItems(m.navItems).length === 0);
  if (emptyModules.length)
    issues.push({
      level: 'WARN',
      rule: 'M1',
      id: 'M1',
      msg: `${emptyModules.length} 个模块为空壳（无 routes/navItems）：${emptyModules.map((m) => m.module.code).join(', ')}`,
    });

  p('');
  hr();
  p('✦ 问题汇总清单 ✦');
  hr();
  if (issues.length === 0) {
    p('  ✓ 未发现违规项');
  } else {
    p('  ┌──────┬────────┬──────┬────────────────────────────────────────────────────────────────┐');
    p('  │ 级别 │ 编号   │ 计数 │ 说明                                                             │');
    p('  ├──────┼────────┼──────┼────────────────────────────────────────────────────────────────┤');
    issues.forEach((x) => {
      const countMatch = x.msg.match(/(\d+)/);
      const count = countMatch ? countMatch[1] : '-';
      p(`  │ ${x.level.padEnd(4)} │ ${x.id.padEnd(6)} │ ${count.padStart(4)} │ ${x.msg.slice(0, 64).padEnd(64)} │`);
    });
    p('  └──────┴────────┴──────┴────────────────────────────────────────────────────────────────┘');
  }
  p('');

  return { text: lines.join('\n'), stats, modules, issues, orphanRoutes, orphanNavItems };
}

// ---------- CLI 参数解析 ----------
function getArgValue(argsList, flag) {
  const eqIdx = argsList.findIndex((a) => a.startsWith(flag + '='));
  if (eqIdx !== -1) return argsList[eqIdx].slice(flag.length + 1);
  const spIdx = argsList.indexOf(flag);
  if (spIdx !== -1 && argsList[spIdx + 1]) return argsList[spIdx + 1];
  return null;
}
const ARGS = process.argv.slice(2);

// --help / -h 最高优先级：不跑任何 FS 扫描，立即打印 Usage + exit 0
const HELP = ARGS.some((a) => a === '--help' || a === '-h');
if (HELP) {
  const USAGE =
    [
      'analyze-menu.cjs — 菜单全面统计与问题分析（路由 / NavItem / 权限码一致性审计）',
      '',
      'USAGE:',
      '  node scripts/analyze-menu.cjs [OPTIONS]',
      '',
      'OPTIONS:',
      '  -h, --help                              显示帮助并退出（不跑扫描）',
      '      --fail-fast                         严格门禁：FAIL 违规 > thresholds 时 exit 1',
      '      --quiet                             不打印全文本报告（配合 --fail-fast / --report-json）',
      '      --summary                           仅打印概览 + 问题清单（不打印附录 A/B）',
      '      --report-json=<path>                输出 JSON 机器报告到 path（供 CI summary 解析）',
      '      --thresholds=\'{"T1":0,"T2":0,"P1":0}\'   自定义 FAIL 级阈值（默认：T1/T2/P1/R3 全 0）',
      '',
      'RULES (FAIL / WARN):',
      '  FAIL(0 容忍):  T1 Route 缺 titleKey   T2 NavItem 缺 labelKey',
      '                 P1 权限码未注册        R3 NavItem 无对应 Route（404）',
      '  WARN(仅报告):  R1 路径冲突  R2 模块 code 前缀错  R4 Route 菜单无入口',
      '                 G1 未分配 NavGroup     O1 order 冲突    C1 缺 code',
      '                 M1 空壳模块',
      '',
      'EXIT CODES: 0=通过  1=--fail-fast 违规超限  2=CLI 参数错误',
      '',
      'EXAMPLES:',
      '  node scripts/analyze-menu.cjs',
      '  node scripts/analyze-menu.cjs --summary',
      '  node scripts/analyze-menu.cjs --fail-fast --report-json=/tmp/m.json',
    ].join('\n') + '\n';
  process.stdout.write(USAGE);
  process.exit(0);
}

const FAIL_FAST = ARGS.includes('--fail-fast');
const QUIET = ARGS.includes('--quiet');
const SUMMARY_ONLY = ARGS.includes('--summary');
const REPORT_JSON_RAW = getArgValue(ARGS, '--report-json');
const REPORT_JSON_PATH = REPORT_JSON_RAW ? path.resolve(REPORT_JSON_RAW) : null;
const THRESHOLDS_RAW = getArgValue(ARGS, '--thresholds');
let CUSTOM_THRESHOLDS = null;
if (THRESHOLDS_RAW) {
  try {
    CUSTOM_THRESHOLDS = JSON.parse(THRESHOLDS_RAW);
    if (typeof CUSTOM_THRESHOLDS !== 'object' || CUSTOM_THRESHOLDS === null) throw new Error('not object');
  } catch (e) {
    process.stderr.write(`[analyze-menu] ERROR: --thresholds 不是合法 JSON 对象: ${THRESHOLDS_RAW}\n`);
    process.exit(2);
  }
}

// FAIL 级规则永久 0 容忍（项目基线）
const DEFAULT_FAIL_THRESHOLDS = { T1: 0, T2: 0, P1: 0, R3: 0 };
const FAIL_RULE_IDS = new Set(['T1', 'T2', 'P1', 'R3']);

function buildThresholdsMap(issuesList) {
  // 对每个 issue，结合默认阈值和自定义阈值，得到最大允许数
  const m = {};
  for (const it of issuesList) {
    const id = it.id;
    if (CUSTOM_THRESHOLDS && CUSTOM_THRESHOLDS[id] !== undefined) {
      m[id] = Number(CUSTOM_THRESHOLDS[id]);
    } else if (FAIL_RULE_IDS.has(id)) {
      m[id] = DEFAULT_FAIL_THRESHOLDS[id] !== undefined ? DEFAULT_FAIL_THRESHOLDS[id] : 0;
    } else {
      m[id] = Infinity; // WARN 级永不阻断
    }
  }
  return m;
}

function getIssueCount(issueMsg) {
  const m = issueMsg.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : issueMsg.includes('空壳') ? 1 : 1;
}

// ---------- 主程序 ----------
(function main() {
  const result = analyze();
  const { text, summary, stats, modules, issues, orphanRoutes, orphanNavItems } = result;

  // 1. 文本输出
  if (!QUIET) {
    if (SUMMARY_ONLY && summary) {
      console.log(summary);
    } else {
      console.log(text);
    }
  }

  // 2. 报告 JSON 落盘
  if (REPORT_JSON_PATH) {
    const report = {
      generatedAt: new Date().toISOString(),
      mode: FAIL_FAST ? 'fail-fast' : 'dry-run',
      registeredPermissionsCount: registeredPermissions.size,
      stats,
      issues: issues.map((x) => ({
        level: x.level,
        rule: x.rule || x.id,
        id: x.id,
        count: getIssueCount(x.msg),
        message: x.msg,
        isFail: FAIL_RULE_IDS.has(x.id),
        threshold: FAIL_RULE_IDS.has(x.id)
          ? CUSTOM_THRESHOLDS && CUSTOM_THRESHOLDS[x.id] !== undefined
            ? Number(CUSTOM_THRESHOLDS[x.id])
            : (DEFAULT_FAIL_THRESHOLDS[x.id] ?? 0)
          : null,
      })),
      failLevelIssues: issues
        .filter((x) => FAIL_RULE_IDS.has(x.id))
        .map((x) => ({
          id: x.id,
          rule: x.rule || x.id,
          level: x.level,
          count: getIssueCount(x.msg),
          message: x.msg,
        })),
      warnLevelIssues: issues
        .filter((x) => !FAIL_RULE_IDS.has(x.id))
        .map((x) => ({
          id: x.id,
          rule: x.rule || x.id,
          level: x.level,
          count: getIssueCount(x.msg),
          message: x.msg,
        })),
      orphanRoutesCount: orphanRoutes.length,
      orphanRoutes: orphanRoutes,
      orphanNavItemsCount: orphanNavItems.length,
      orphanNavItems: orphanNavItems,
      emptyModules: modules
        .filter((m) => m.routes.length === 0 && flattenNavItems(m.navItems).length === 0)
        .map((m) => m.module.code),
      modulesSummary: modules.map((m) => ({
        code: m.module.code,
        source: m.module.source,
        suite: m.module.suite,
        order: m.module.order,
        routesCount: m.routes.length,
        navItemsCount: flattenNavItems(m.navItems).length,
        hasNameKey: !!m.module.nameKey,
      })),
    };
    try {
      fs.mkdirSync(path.dirname(REPORT_JSON_PATH), { recursive: true });
      fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2), 'utf8');
      if (!QUIET) process.stderr.write(`[analyze-menu] JSON 报告已写入: ${REPORT_JSON_PATH}\n`);
    } catch (e) {
      process.stderr.write(`[analyze-menu] ERROR: 写入 report-json 失败 (${REPORT_JSON_PATH}): ${e.message}\n`);
      process.exit(2);
    }
  }

  // 3. --fail-fast 判定
  if (FAIL_FAST) {
    const thresholds = buildThresholdsMap(issues);
    let failed = false;
    const failLines = [];
    for (const it of issues) {
      const id = it.id;
      if (!FAIL_RULE_IDS.has(id)) continue;
      const count = getIssueCount(it.msg);
      const max = thresholds[id];
      if (count > max) {
        failed = true;
        failLines.push(`  ❌ ${id}: count=${count} > threshold=${max}  →  ${it.msg}`);
      } else {
        failLines.push(`  ✅ ${id}: count=${count} ≤ threshold=${max}  →  OK`);
      }
    }
    process.stderr.write('\n[analyze-menu] FAIL-FAST Gate Check:\n');
    if (failLines.length === 0) {
      process.stderr.write('  (无 FAIL 级规则)\n');
    } else {
      failLines.forEach((l) => process.stderr.write(l + '\n'));
    }
    if (failed) {
      process.stderr.write('\n[analyze-menu] ❌ FAIL-FAST 不通过，退出码=1\n');
      process.exit(1);
    } else {
      process.stderr.write('\n[analyze-menu] ✅ FAIL-FAST 通过\n');
    }
  } else if (!QUIET) {
    process.stderr.write('[analyze-menu] DRY-RUN 模式（未传 --fail-fast），所有问题均不阻断。\n');
  }

  process.exit(0);
})();
