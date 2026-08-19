#!/usr/bin/env node
/**
 * Probe P-04: OpenAPI 前后端契约一致性探针
 *
 * Parses the aggregated OpenAPI JSON to extract all operationId + method + path
 * combinations, scans the frontend API layer for actual HTTP calls, and diffs
 * the two sets to report:
 *   - Paths in OpenAPI but NOT called by frontend (unused backend APIs)
 *   - Paths called by frontend but NOT in OpenAPI (undocumented frontend APIs)
 *   - Method mismatches (frontend calls POST but OpenAPI says PUT)
 *
 * Output: docs/audit/probe-p04-openapi-contract.md
 * Exit code: 0 if no red findings, 1 if red findings exist (mismatch >= 5)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = '/Users/xingzhai/TOPEMS';
const OPENAPI_JSON = join(ROOT, 'docs/api/openapi-aggregated.json');
const FRONTEND_API_DIR = join(ROOT, 'apps/web/src/api');
const OUTPUT_MD = join(ROOT, 'docs/audit/probe-p04-openapi-contract.md');

// --- Service URL prefix mapping (from apps/web/src/config/runtime.ts) ---
const SERVICE_PREFIXES = {
  iam: '/api/core/iam',
  workflow: '/api/core/flow',
  flow: '/api/core/flow',
  file: '/api/core/file',
  master: '/api/master-data',
  'master-data': '/api/master-data',
  migration: '/api/core/migration',
  mail: '/api/communication/mail',
  im: '/api/communication/im',
  notification: '/api/communication/notification',
  search: '/api/search',
  erp: '/api/erp',
  finance: '/api/finance',
  doc: '/api/core/doc',
  ai: '/api/ai',
  hrm: '/api/hrm',
  pm: '/api/pm',
  crm: '/api/crm',
  mes: '/api/mes',
  pdm: '/api/pdm',
  scm: '/api/scm',
  wms: '/api/wms',
  srm: '/api/srm',
  qms: '/api/qms',
  lims: '/api/lims',
  ehs: '/api/ehs',
  rd: '/api/rd',
  bi: '/api/bi',
  analytics: '/api/bi',
  monitor: '/api/core/monitor',
  portal: '/api/portal',
  mobile: '/api/mobile',
  gis: '/api/gis',
  integration: '/api/integration',
  billing: '/api/billing',
  ticket: '/api/ticket',
  feedback: '/api/feedback',
  lowcode: '/api/lowcode',
  automation: '/api/core/automation',
  core: '/api/core',
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// ---------------------------------------------------------------------------
// 1. Parse OpenAPI JSON
// ---------------------------------------------------------------------------

function parseOpenApi(jsonPath) {
  const raw = readFileSync(jsonPath, 'utf-8');
  const spec = JSON.parse(raw);
  const ops = [];

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, def] of Object.entries(methods)) {
      if (!HTTP_METHODS.includes(method)) continue;
      if (typeof def !== 'object' || def === null) continue;
      const tag = (def.tags && def.tags[0]) || '';
      ops.push({
        operationId: def.operationId || '(no-operationId)',
        method: method.toUpperCase(),
        path: path,
        normalizedPath: normalizeOpenApiPath(path, tag),
        tag,
      });
    }
  }
  return ops;
}

/**
 * Normalise an OpenAPI path so it always starts with /api/.
 * Some paths in the aggregated spec omit the /api/ prefix (e.g. "/crm/customers"
 * instead of "/api/crm/customers").  We add it back so comparisons with the
 * frontend-reconstructed paths are consistent.
 */
function normalizeOpenApiPath(path, tag = '') {
  if (path.startsWith('/api/')) return path;
  // Special case: "/ai/" is the root of the AI service
  if (path === '/ai/' || path === '/ai') return '/api/ai/';
  // Skip non-service paths like /health
  if (path === '/health' || path === '/api/health') return '/api/health';

  const service = String(tag || '').toLowerCase();
  const coreSubmodules = new Set(['iam', 'doc', 'file', 'flow', 'monitor', 'system', 'automation', 'migration']);
  const segments = path.split('/').filter(Boolean);
  const first = segments[0] || '';

  if (service === 'unified-core' && coreSubmodules.has(first)) {
    return '/api/core' + path;
  }

  if (service && first === service) {
    return '/api' + path;
  }

  if (service && service !== 'health') {
    return `/api/${service}${path}`;
  }

  return '/api' + path;
}

// ---------------------------------------------------------------------------
// 2. Scan frontend API files
// ---------------------------------------------------------------------------

function walkTs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkTs(full));
    } else if (extname(entry) === '.ts') {
      results.push(full);
    }
  }
  return results;
}

/**
 * Convert a template-literal URL fragment to an OpenAPI-style path.
 *   `/bugs/${id}`            -> /bugs/{id}
 *   `/vouchers/${id}/entries` -> /vouchers/{id}/entries
 *   `/audit/operations${queryString}` -> /audit/operations  (strip non-path vars)
 *
 * Variables that are NOT path parameters (queryString, qs, params, searchParams)
 * are stripped entirely rather than converted to {param} placeholders.
 */
const NON_PATH_VARS = new Set([
  'queryString',
  'qs',
  'params',
  'searchParams',
  'query',
  'search',
  'filter',
  'sort',
  'page',
  'limit',
  'offset',
]);

/**
 * Find the end of a template literal while ignoring nested backticks inside
 * `${...}` expressions, e.g. `${queryString ? `?${queryString}` : ''}`.
 */
function findTemplateLiteralEnd(text, startIndex) {
  let expressionDepth = 0;
  for (let i = startIndex + 1; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '$' && next === '{') {
      expressionDepth++;
      i++;
      continue;
    }
    if (ch === '}' && expressionDepth > 0) {
      expressionDepth--;
      continue;
    }
    if (ch === '`' && expressionDepth === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Find the matching closing brace for a `${...}` template expression. Nested
 * `${...}` blocks inside inner template literals are handled by depth counting.
 */
function findTemplateExpressionEnd(text, startIndex) {
  let expressionDepth = 1;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '$' && next === '{') {
      expressionDepth++;
      i++;
      continue;
    }
    if (ch === '}') {
      expressionDepth--;
      if (expressionDepth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function templateExpressionToPath(rawExpression, constMap) {
  const expression = rawExpression.trim();
  const encodedIdentifier = expression.match(/^encodeURIComponent\(([^)]+)\)$/)?.[1]?.trim();
  if (encodedIdentifier) {
    return templateExpressionToPath(encodedIdentifier, constMap);
  }
  const leadingIdentifier = expression.match(/^([A-Za-z_$][\w$]*)\b/)?.[1];
  if (NON_PATH_VARS.has(expression) || NON_PATH_VARS.has(leadingIdentifier)) {
    return '';
  }
  if (constMap && constMap.has(expression)) {
    return constMap.get(expression);
  }
  return `{${expression}}`;
}

function templateToPath(urlStr, constMap) {
  let output = '';
  for (let i = 0; i < urlStr.length; i++) {
    if (urlStr[i] === '$' && urlStr[i + 1] === '{') {
      const end = findTemplateExpressionEnd(urlStr, i + 2);
      if (end === -1) {
        output += urlStr.slice(i);
        break;
      }
      output += templateExpressionToPath(urlStr.slice(i + 2, end), constMap);
      i = end;
      continue;
    }
    output += urlStr[i];
  }
  return output;
}

/**
 * Extract the URL string from the first argument of an API call.
 * Handles both plain strings ('/bugs') and template literals (`/bugs/${id}`).
 */
function extractUrlArg(text, startIndex, constMap) {
  // Find the opening quote or backtick after the parenthesis
  let i = startIndex;
  // skip whitespace
  while (i < text.length && /\s/.test(text[i])) i++;

  if (text[i] === '`') {
    // Template literal - find matching closing backtick
    const end = findTemplateLiteralEnd(text, i);
    if (end === -1) return null;
    return templateToPath(text.slice(i + 1, end), constMap);
  } else if (text[i] === "'" || text[i] === '"') {
    const quote = text[i];
    let end = i + 1;
    while (end < text.length && text[end] !== quote) {
      if (text[end] === '\\') end++;
      end++;
    }
    return text.slice(i + 1, end);
  }
  return null;
}

function parseFrontendApiFiles(files) {
  const calls = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const relFile = relative(ROOT, file);

    const constMap = new Map();
    const constRegex = /const\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]([^'"`]+)['"`]/g;
    let constMatch;
    while ((constMatch = constRegex.exec(content)) !== null) {
      constMap.set(constMatch[1], constMatch[2]);
    }

    // Match patterns like:
    //   apiClient.<service>.<method>(...)
    //   apiClient.<service>.<method><T>(...)
    // Also handle: this.clients.<service> via getClient - but that's rare
    const regex = /apiClient\.(\w+)\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const service = match[1];
      const method = match[2].toUpperCase();
      const urlStart = match.index + match[0].length;
      const url = extractUrlArg(content, urlStart, constMap);

      if (url === null) continue;

      const prefix = SERVICE_PREFIXES[service];
      if (!prefix) {
        // Unknown service - record without full path
        calls.push({
          service,
          method,
          url,
          fullPath: null,
          file: relFile,
          line: content.slice(0, match.index).split('\n').length,
          warning: `unknown service "${service}"`,
        });
        continue;
      }

      // Build full path: prefix + url
      let fullPath;
      if (url.startsWith('/')) {
        fullPath = prefix + url;
      } else {
        fullPath = prefix + '/' + url;
      }

      // Strip query string from path for comparison
      const qIdx = fullPath.indexOf('?');
      if (qIdx !== -1) fullPath = fullPath.slice(0, qIdx);

      calls.push({
        service,
        method,
        url,
        fullPath: normalizeFrontendPath(fullPath),
        file: relFile,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return calls;
}

/**
 * Normalise frontend-reconstructed path for comparison.
 * Ensures consistent trailing slashes, etc.
 */
function normalizeFrontendPath(path) {
  // Remove double slashes (except after protocol)
  let p = path.replace(/\/{2,}/g, '/');
  // Treat OpenAPI/frontend parameter identifier names as equivalent:
  // /items/{id}, /items/{itemId}, and /items/{item_id} are the same route.
  p = p.replace(/\{[^/}]+\}/g, '{param}');
  // Remove trailing slash unless it's the root "/"
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

// ---------------------------------------------------------------------------
// 2b. Exemption lists — items expected to be unmatched (not real mismatches)
// ---------------------------------------------------------------------------

/** Paths that are expected to be unused by frontend (health, metrics, plugin) */
const EXEMPT_UNUSED_PATH_PATTERNS = [
  /\/health$/,
  /\/health\/detailed$/,
  /\/api-docs/,
  /\/openapi\.json$/,
  /\/api\/plugins\/(health|info)$/,
  /\/plugin-registry\/marketplace/,
  /\/plugin-registry\/tenants/,
  /\/api\/monitor\/metrics/,
  /\/api\/monitor\/health$/,
];

/** operationIds that are stubs or internal (prefixed with _) */
function isStubOperationId(opId) {
  return opId.startsWith('_');
}

/** Paths that are deprecated/legacy aliases */
const DEPRECATED_PATH_PATTERNS = [/^\/analytics\/dashboard/, /^\/analytics\/report/, /^\/analytics\/widget/];

/** Frontend paths that are internal (mock, test, dev) */
const FRONTEND_INTERNAL_PATTERNS = [/\/mock/i, /\/local/i, /\/test/i, /\/dev\//i];

/** Check if a path matches any pattern in a list */
function matchesAny(path, patterns) {
  return patterns.some((p) => p.test(path));
}

// ---------------------------------------------------------------------------
// 3. Diff
// ---------------------------------------------------------------------------

function diff(openapiOps, frontendCalls) {
  // Build lookup maps keyed by normalized path
  const openapiByPath = new Map(); // path -> { method, opId, tag }
  const openapiPathSet = new Set();

  for (const op of openapiOps) {
    const np = normalizeFrontendPath(op.normalizedPath);
    openapiPathSet.add(np);
    if (!openapiByPath.has(np)) {
      openapiByPath.set(np, []);
    }
    openapiByPath.get(np).push(op);
  }

  // Deduplicate frontend calls by (fullPath, method)
  const frontendByPath = new Map(); // path -> Set<method>
  const frontendCallDetails = new Map(); // path+method -> {file, line, service}
  const frontendPathSet = new Set();

  for (const call of frontendCalls) {
    if (!call.fullPath) continue;
    const np = call.fullPath;
    frontendPathSet.add(np);
    if (!frontendByPath.has(np)) {
      frontendByPath.set(np, new Set());
    }
    frontendByPath.get(np).add(call.method);
    const key = `${np}::${call.method}`;
    if (!frontendCallDetails.has(key)) {
      frontendCallDetails.set(key, call);
    }
  }

  const unusedBackend = []; // in OpenAPI but not called by frontend
  const unusedBackendExempt = []; // exempted (health/stub/deprecated)
  const undocumentedFrontend = []; // called by frontend but not in OpenAPI
  const undocumentedFrontendExempt = []; // exempted (mock/test/internal)
  const methodMismatches = []; // path exists in both but method differs

  // 3a. Paths in OpenAPI but NOT called by frontend
  for (const op of openapiOps) {
    const np = normalizeFrontendPath(op.normalizedPath);
    const feMethods = frontendByPath.get(np);
    if (!feMethods) {
      // Check exemptions
      const isExempt =
        matchesAny(np, EXEMPT_UNUSED_PATH_PATTERNS) ||
        isStubOperationId(op.operationId) ||
        matchesAny(op.path, DEPRECATED_PATH_PATTERNS);
      if (isExempt) {
        unusedBackendExempt.push({
          operationId: op.operationId,
          method: op.method,
          path: op.path,
          normalizedPath: np,
          tag: op.tag,
          exemptReason: isStubOperationId(op.operationId)
            ? 'AI stub'
            : matchesAny(op.path, DEPRECATED_PATH_PATTERNS)
              ? 'deprecated'
              : 'health/internal',
        });
      } else {
        unusedBackend.push({
          operationId: op.operationId,
          method: op.method,
          path: op.path,
          normalizedPath: np,
          tag: op.tag,
        });
      }
    } else if (!feMethods.has(op.method)) {
      // Path exists but this method is not called
      unusedBackend.push({
        operationId: op.operationId,
        method: op.method,
        path: op.path,
        normalizedPath: np,
        tag: op.tag,
        note: 'path exists in frontend but method not called',
      });
    }
  }

  // 3b. Paths called by frontend but NOT in OpenAPI
  for (const call of frontendCalls) {
    if (!call.fullPath) continue;
    const np = call.fullPath;
    const oaOps = openapiByPath.get(np);
    if (!oaOps) {
      // Check exemptions (frontend internal paths)
      if (matchesAny(np, FRONTEND_INTERNAL_PATTERNS)) {
        undocumentedFrontendExempt.push({
          service: call.service,
          method: call.method,
          url: call.url,
          fullPath: np,
          file: call.file,
          line: call.line,
          exemptReason: 'frontend internal',
        });
      } else {
        undocumentedFrontend.push({
          service: call.service,
          method: call.method,
          url: call.url,
          fullPath: np,
          file: call.file,
          line: call.line,
        });
      }
    } else {
      // Path exists - check method
      const oaMethods = new Set(oaOps.map((o) => o.method));
      if (!oaMethods.has(call.method)) {
        methodMismatches.push({
          service: call.service,
          frontendMethod: call.method,
          openapiMethods: [...oaMethods].join(', '),
          fullPath: np,
          file: call.file,
          line: call.line,
          openapiOpIds: oaOps.map((o) => o.operationId).join(', '),
        });
      }
    }
  }

  return { unusedBackend, unusedBackendExempt, undocumentedFrontend, undocumentedFrontendExempt, methodMismatches };
}

// ---------------------------------------------------------------------------
// 4. Output markdown report
// ---------------------------------------------------------------------------

function generateReport(openapiOps, frontendCalls, diffResult) {
  const { unusedBackend, unusedBackendExempt, undocumentedFrontend, undocumentedFrontendExempt, methodMismatches } =
    diffResult;

  // Summary stats
  const totalOpenApiOps = openapiOps.length;
  const totalFrontendCalls = frontendCalls.filter((c) => c.fullPath).length;
  const uniqueFrontendPaths = new Set(frontendCalls.filter((c) => c.fullPath).map((c) => c.fullPath)).size;
  const matchedPaths = totalOpenApiOps - unusedBackend.length - unusedBackendExempt.length;
  const totalMismatches = undocumentedFrontend.length + methodMismatches.length;

  // CI rule: mismatch >= 5 -> red
  const isRed = totalMismatches >= 5;

  const lines = [];
  lines.push('# Probe P-04: OpenAPI 前后端契约一致性探针');
  lines.push('');
  lines.push('> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0');
  lines.push('');
  lines.push('## 摘要统计');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('|------|------|');
  lines.push(`| OpenAPI 端点总数 (method+path) | ${totalOpenApiOps} |`);
  lines.push(`| 前端 API 调用总数 (去重前) | ${totalFrontendCalls} |`);
  lines.push(`| 前端唯一路径数 | ${uniqueFrontendPaths} |`);
  lines.push(`| 已匹配端点数 | ${matchedPaths} |`);
  lines.push(`| 未使用后端 API (OpenAPI 有/前端无) | ${unusedBackend.length} |`);
  lines.push(`| 未使用后端 API — 已豁免 | ${unusedBackendExempt.length} |`);
  lines.push(`| 未文档化前端 API (前端有/OpenAPI 无) | ${undocumentedFrontend.length} |`);
  lines.push(`| 未文档化前端 API — 已豁免 | ${undocumentedFrontendExempt.length} |`);
  lines.push(`| 方法不匹配数 | ${methodMismatches.length} |`);
  lines.push(`| **总不匹配数** | **${totalMismatches}** |`);
  lines.push(`| CI 严重度 | ${isRed ? 'RED (mismatch >= 5)' : totalMismatches > 0 ? 'YELLOW' : 'GREEN'} |`);
  lines.push('');

  // Section 1: Unused backend APIs
  lines.push('## 1. 未使用后端 API（OpenAPI 有定义，前端未调用）');
  lines.push('');
  if (unusedBackend.length === 0) {
    lines.push('> 无发现。所有 OpenAPI 端点均被前端调用。');
  } else {
    lines.push(`共 ${unusedBackend.length} 个端点：`);
    lines.push('');
    lines.push('| # | operationId | 方法 | 路径 | Tag | 备注 |');
    lines.push('|---|-------------|------|------|-----|------|');
    unusedBackend.forEach((item, i) => {
      lines.push(
        `| ${i + 1} | ${item.operationId} | ${item.method} | \`${item.normalizedPath}\` | ${item.tag || '-'} | ${item.note || ''} |`
      );
    });
  }
  lines.push('');

  // Section 2: Undocumented frontend APIs
  lines.push('## 2. 未文档化前端 API（前端有调用，OpenAPI 无定义）');
  lines.push('');
  if (undocumentedFrontend.length === 0) {
    lines.push('> 无发现。所有前端 API 调用均在 OpenAPI 中有定义。');
  } else {
    lines.push(`共 ${undocumentedFrontend.length} 个调用：`);
    lines.push('');
    lines.push('| # | 方法 | 完整路径 | 服务 | 文件 | 行号 |');
    lines.push('|---|------|----------|------|------|------|');
    undocumentedFrontend.forEach((item, i) => {
      lines.push(
        `| ${i + 1} | ${item.method} | \`${item.fullPath}\` | ${item.service} | ${item.file} | ${item.line} |`
      );
    });
  }
  lines.push('');

  // Section 3: Method mismatches
  lines.push('## 3. 方法不匹配（路径匹配但 HTTP 方法不一致）');
  lines.push('');
  if (methodMismatches.length === 0) {
    lines.push('> 无发现。所有匹配路径的 HTTP 方法一致。');
  } else {
    lines.push(`共 ${methodMismatches.length} 个不匹配：`);
    lines.push('');
    lines.push('| # | 前端方法 | OpenAPI 方法 | 路径 | operationId | 文件 | 行号 |');
    lines.push('|---|----------|-------------|------|-------------|------|------|');
    methodMismatches.forEach((item, i) => {
      lines.push(
        `| ${i + 1} | ${item.frontendMethod} | ${item.openapiMethods} | \`${item.fullPath}\` | ${item.openapiOpIds} | ${item.file} | ${item.line} |`
      );
    });
  }
  lines.push('');

  // Section 4: Unknown services
  const unknownServices = frontendCalls.filter((c) => !c.fullPath);
  if (unknownServices.length > 0) {
    lines.push('## 4. 未知服务名（无法映射 URL 前缀）');
    lines.push('');
    lines.push(`共 ${unknownServices.length} 个调用：`);
    lines.push('');
    lines.push('| # | 服务名 | 方法 | URL | 文件 | 行号 |');
    lines.push('|---|--------|------|-----|------|------|');
    unknownServices.forEach((item, i) => {
      lines.push(`| ${i + 1} | ${item.service} | ${item.method} | \`${item.url}\` | ${item.file} | ${item.line} |`);
    });
    lines.push('');
  }

  // Methodology
  lines.push('## 5. 方法论');
  lines.push('');
  lines.push('### 数据源');
  lines.push('- OpenAPI 规范: `docs/api/openapi-aggregated.json`');
  lines.push('- 前端 API 调用: `apps/web/src/api/**/*.ts`');
  lines.push('');
  lines.push('### 路径归一化规则');
  lines.push('1. OpenAPI 路径缺少 `/api/` 前缀的自动补全（如 `/crm/customers` -> `/api/crm/customers`）');
  lines.push("2. 前端调用通过服务名映射 URL 前缀（如 `apiClient.rd.get('/bugs')` -> `/api/rd/bugs`）");
  lines.push('3. 模板字面量 `${id}` 转换为 OpenAPI 路径参数 `{id}`');
  lines.push('4. 查询字符串 `?param=value` 在比较时被移除');
  lines.push('');
  lines.push('### 匹配逻辑');
  lines.push('- 路径 + HTTP 方法双重匹配');
  lines.push('- 路径匹配但方法不匹配 -> 方法不匹配');
  lines.push('- OpenAPI 有路径但前端无调用 -> 未使用后端 API');
  lines.push('- 前端有调用但 OpenAPI 无路径 -> 未文档化前端 API');
  lines.push('');
  lines.push('### CI 阻断规则');
  lines.push('- `总不匹配数 >= 5` -> RED (阻断 CI)');
  lines.push('- `0 < 总不匹配数 < 5` -> YELLOW (告警不阻断)');
  lines.push('- `总不匹配数 = 0` -> GREEN');

  return { markdown: lines.join('\n'), isRed, totalMismatches };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[P-04] OpenAPI 前后端契约一致性探针');
  console.log('=====================================\n');

  // 1. Parse OpenAPI
  console.log(`[1/4] 解析 OpenAPI 规范: ${relative(ROOT, OPENAPI_JSON)}`);
  const openapiOps = parseOpenApi(OPENAPI_JSON);
  console.log(`      -> 提取 ${openapiOps.length} 个操作 (method+path)\n`);

  // 2. Scan frontend API files
  console.log(`[2/4] 扫描前端 API 文件: ${relative(ROOT, FRONTEND_API_DIR)}`);
  const tsFiles = walkTs(FRONTEND_API_DIR);
  console.log(`      -> 发现 ${tsFiles.length} 个 .ts 文件`);
  const frontendCalls = parseFrontendApiFiles(tsFiles);
  const validCalls = frontendCalls.filter((c) => c.fullPath);
  console.log(`      -> 提取 ${frontendCalls.length} 个 API 调用 (${validCalls.length} 个有效路径)\n`);

  // 3. Diff
  console.log('[3/4] 执行差异分析...');
  const diffResult = diff(openapiOps, frontendCalls);
  console.log(
    `      -> 未使用后端 API: ${diffResult.unusedBackend.length} (豁免: ${diffResult.unusedBackendExempt?.length || 0})`
  );
  console.log(
    `      -> 未文档化前端 API: ${diffResult.undocumentedFrontend.length} (豁免: ${diffResult.undocumentedFrontendExempt?.length || 0})`
  );
  console.log(`      -> 方法不匹配: ${diffResult.methodMismatches.length}\n`);

  // 4. Generate report
  console.log(`[4/4] 生成报告: ${relative(ROOT, OUTPUT_MD)}`);
  const { markdown, isRed, totalMismatches } = generateReport(openapiOps, frontendCalls, diffResult);
  writeFileSync(OUTPUT_MD, markdown + '\n', 'utf-8');
  console.log(`      -> 报告已写入\n`);

  // Summary
  console.log('=== 摘要 ===');
  console.log(`OpenAPI 端点: ${openapiOps.length}`);
  console.log(`前端调用: ${validCalls.length} (有效)`);
  console.log(`未使用后端 API: ${diffResult.unusedBackend.length}`);
  console.log(`未文档化前端 API: ${diffResult.undocumentedFrontend.length}`);
  console.log(`方法不匹配: ${diffResult.methodMismatches.length}`);
  console.log(`总不匹配: ${totalMismatches}`);
  console.log(`CI 严重度: ${isRed ? 'RED' : totalMismatches > 0 ? 'YELLOW' : 'GREEN'}`);

  process.exit(isRed ? 1 : 0);
}

main();
