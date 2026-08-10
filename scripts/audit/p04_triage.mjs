#!/usr/bin/env node
/**
 * P-04 Triage Script — Categorize unused backend APIs & undocumented frontend APIs
 *
 * Reads the aggregated OpenAPI JSON and frontend API files, performs the same
 * diff as probe-openapi-contract.mjs, but adds rich categorization:
 *
 * For unused backend APIs (471):
 *   - Category A: Health/internal endpoints (health, metrics, info)
 *   - Category B: AI stub functions (prefixed with _)
 *   - Category C: CRUD endpoints that should have frontend bindings
 *   - Category D: Deprecated/legacy paths
 *
 * For undocumented frontend APIs (2559):
 *   - Root Cause 1: Path prefix mismatch (e.g. /api/v1/ vs /api/)
 *   - Root Cause 2: Missing utoipa annotation (path exists in backend but not in OpenAPI)
 *   - Root Cause 3: Path parameter format mismatch (e.g. :id vs {id})
 *   - Root Cause 4: Completely unregistered routes (frontend calls non-existent backend route)
 *   - Root Cause 5: Frontend-internal paths (mock data, local routes)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = '/Users/xingzhai/TOPEMS';
const OPENAPI_JSON = join(ROOT, 'docs/api/openapi-aggregated.json');
const FRONTEND_API_DIR = join(ROOT, 'apps/web/src/api');
const OUTPUT_JSON = join(ROOT, 'docs/audit/p04-triage-result.json');
const OUTPUT_MD = join(ROOT, 'docs/audit/p04-triage-report.md');

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

function normalizeOpenApiPath(path, tag = '') {
  if (path.startsWith('/api/')) return path;
  if (path === '/ai/' || path === '/ai') return '/api/ai/';
  if (path === '/health' || path === '/api/health') return '/api/health';

  const service = String(tag || '').toLowerCase();
  const coreSubmodules = new Set([
    'iam',
    'doc',
    'file',
    'flow',
    'monitor',
    'system',
    'automation',
    'migration',
  ]);
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

const NON_PATH_VARS = new Set([
  'queryString', 'qs', 'params', 'searchParams', 'query', 'search',
  'filter', 'sort', 'page', 'limit', 'offset',
]);

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

function templateExpressionToPath(rawExpression) {
  const expression = rawExpression.trim();
  const leadingIdentifier = expression.match(/^([A-Za-z_$][\w$]*)\b/)?.[1];
  if (NON_PATH_VARS.has(expression) || NON_PATH_VARS.has(leadingIdentifier)) {
    return '';
  }
  return `{${expression}}`;
}

function templateToPath(urlStr) {
  let output = '';
  for (let i = 0; i < urlStr.length; i++) {
    if (urlStr[i] === '$' && urlStr[i + 1] === '{') {
      const end = findTemplateExpressionEnd(urlStr, i + 2);
      if (end === -1) {
        output += urlStr.slice(i);
        break;
      }
      output += templateExpressionToPath(urlStr.slice(i + 2, end));
      i = end;
      continue;
    }
    output += urlStr[i];
  }
  return output;
}

function extractUrlArg(text, startIndex) {
  let i = startIndex;
  while (i < text.length && /\s/.test(text[i])) i++;

  if (text[i] === '`') {
    const end = findTemplateLiteralEnd(text, i);
    if (end === -1) return null;
    return templateToPath(text.slice(i + 1, end));
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

function normalizeFrontendPath(path) {
  let p = path.replace(/\/{2,}/g, '/');
  p = p.replace(/\{[^/}]+\}/g, '{param}');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function parseFrontendApiFiles(files) {
  const calls = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const relFile = relative(ROOT, file);

    const regex = /apiClient\.(\w+)\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const service = match[1];
      const method = match[2].toUpperCase();
      const urlStart = match.index + match[0].length;
      const url = extractUrlArg(content, urlStart);

      if (url === null) continue;

      const prefix = SERVICE_PREFIXES[service];
      if (!prefix) {
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

      let fullPath;
      if (url.startsWith('/')) {
        fullPath = prefix + url;
      } else {
        fullPath = prefix + '/' + url;
      }

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

// ---------------------------------------------------------------------------
// 3. Diff (same as probe)
// ---------------------------------------------------------------------------

function diff(openapiOps, frontendCalls) {
  const openapiByPath = new Map();
  const openapiPathSet = new Set();

  for (const op of openapiOps) {
    const np = normalizeFrontendPath(op.normalizedPath);
    openapiPathSet.add(np);
    if (!openapiByPath.has(np)) {
      openapiByPath.set(np, []);
    }
    openapiByPath.get(np).push(op);
  }

  const frontendByPath = new Map();
  const frontendCallDetails = new Map();
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

  const unusedBackend = [];
  const undocumentedFrontend = [];

  for (const op of openapiOps) {
    const np = normalizeFrontendPath(op.normalizedPath);
    const feMethods = frontendByPath.get(np);
    if (!feMethods) {
      unusedBackend.push({
        operationId: op.operationId,
        method: op.method,
        path: op.path,
        normalizedPath: np,
        tag: op.tag,
      });
    } else if (!feMethods.has(op.method)) {
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

  for (const call of frontendCalls) {
    if (!call.fullPath) continue;
    const np = call.fullPath;
    const oaOps = openapiByPath.get(np);
    if (!oaOps) {
      undocumentedFrontend.push({
        service: call.service,
        method: call.method,
        url: call.url,
        fullPath: np,
        file: call.file,
        line: call.line,
      });
    }
  }

  return { unusedBackend, undocumentedFrontend };
}

// ---------------------------------------------------------------------------
// 4. Triage: Categorize unused backend APIs
// ---------------------------------------------------------------------------

function triageUnusedBackend(unusedBackend) {
  const categories = {
    A_health_internal: [],   // health, metrics, info, plugin endpoints
    B_ai_stubs: [],          // AI stub functions (operationId starts with _)
    C_crud_should_bind: [],  // CRUD endpoints that should have frontend bindings
    D_deprecated_legacy: [], // deprecated or legacy paths
  };

  for (const item of unusedBackend) {
    const opId = item.operationId || '';
    const path = item.normalizedPath || '';
    const tag = item.tag || '';

    // Category A: Health/internal endpoints
    if (path.includes('/health') || path.includes('/metrics') ||
        path.includes('/api-docs') || path.includes('/openapi') ||
        path.includes('/plugin') || opId.includes('health') ||
        opId.includes('plugin_health') || opId.includes('get_plugin')) {
      categories.A_health_internal.push(item);
      continue;
    }

    // Category B: AI stub functions (operationId starts with _)
    if (opId.startsWith('_') || tag === 'ai' && opId.match(/^(document|vector|multimodal|profile|recommend|analysis|code)/)) {
      categories.B_ai_stubs.push(item);
      continue;
    }

    // Category D: Deprecated/legacy paths (analytics/dashboard etc)
    if (path.includes('/api/analytics/') || path.includes('/api/report/') ||
        opId.includes('deprecated') || opId.includes('legacy')) {
      categories.D_deprecated_legacy.push(item);
      continue;
    }

    // Category C: Everything else — CRUD endpoints that should have frontend bindings
    categories.C_crud_should_bind.push(item);
  }

  // Sub-categorize Category C by service tag
  const cByService = {};
  for (const item of categories.C_crud_should_bind) {
    const svc = item.tag || 'unknown';
    if (!cByService[svc]) cByService[svc] = [];
    cByService[svc].push(item);
  }

  return { categories, cByService };
}

// ---------------------------------------------------------------------------
// 5. Triage: Root cause analysis for undocumented frontend APIs
// ---------------------------------------------------------------------------

function triageUndocumentedFrontend(undocumentedFrontend, openapiOps) {
  // Build a set of OpenAPI paths for exact prefix-variant checks.
  // RC1 is intentionally narrow: it only covers real gateway prefix aliases
  // such as /api/v1/* or a missing /api/core/* segment.  Do not classify
  // "same tail path under another service" as RC1; shared resource names like
  // /documents, /projects, /health, or /sync-records are common across services
  // and should remain RC4 unless the target service documents that path.
  const openapiPaths = new Set();

  for (const op of openapiOps) {
    const np = normalizeFrontendPath(op.normalizedPath);
    openapiPaths.add(np);
  }

  const rootCauses = {
    RC1_prefix_mismatch: [],      // /api/v1/ vs /api/ or /api/core/ missing
    RC2_missing_utoipa: [],       // Path exists in backend source but not in OpenAPI spec
    RC3_param_format: [],         // :id vs {id} format mismatch
    RC4_unregistered: [],         // Completely unregistered routes
    RC5_frontend_internal: [],    // Mock/local paths
  };

  for (const item of undocumentedFrontend) {
    const fp = item.fullPath || '';

    // RC1: Check for /api/v1/ prefix (should be /api/)
    if (fp.includes('/api/v1/')) {
      rootCauses.RC1_prefix_mismatch.push(item);
      continue;
    }

    // RC1: Check for missing /api/core/ prefix
    // If path matches an OpenAPI path when /api/core/ is prepended
    const withoutPrefix = fp.replace(/^\/api\//, '');
    const coreVariant = '/api/core/' + withoutPrefix;
    if (openapiPaths.has(coreVariant)) {
      rootCauses.RC1_prefix_mismatch.push(item);
      continue;
    }

    // RC3: Check for :id format (should be {id})
    if (fp.includes('/:')) {
      rootCauses.RC3_param_format.push(item);
      continue;
    }

    // RC5: Frontend-internal paths (mock, local, config)
    if (fp.includes('/mock') || fp.includes('/local') ||
        fp.includes('/config') || fp.includes('/test') ||
        fp.includes('/dev')) {
      rootCauses.RC5_frontend_internal.push(item);
      continue;
    }

    // RC4: Completely unregistered routes
    rootCauses.RC4_unregistered.push(item);
  }

  // Sub-categorize by service
  const byService = {};
  for (const item of undocumentedFrontend) {
    const svc = item.service || 'unknown';
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(item);
  }

  return { rootCauses, byService };
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

console.log('[1/5] Parsing OpenAPI JSON...');
const openapiOps = parseOpenApi(OPENAPI_JSON);
console.log(`  -> ${openapiOps.length} OpenAPI operations`);

console.log('[2/5] Scanning frontend API files...');
const files = walkTs(FRONTEND_API_DIR);
console.log(`  -> ${files.length} .ts files found`);
const frontendCalls = parseFrontendApiFiles(files);
console.log(`  -> ${frontendCalls.length} API calls found`);

console.log('[3/5] Diffing...');
const { unusedBackend, undocumentedFrontend } = diff(openapiOps, frontendCalls);
console.log(`  -> Unused backend APIs: ${unusedBackend.length}`);
console.log(`  -> Undocumented frontend APIs: ${undocumentedFrontend.length}`);

console.log('[4/5] Triaging unused backend APIs...');
const backendTriage = triageUnusedBackend(unusedBackend);
console.log(`  -> A (health/internal): ${backendTriage.categories.A_health_internal.length}`);
console.log(`  -> B (AI stubs): ${backendTriage.categories.B_ai_stubs.length}`);
console.log(`  -> C (CRUD should bind): ${backendTriage.categories.C_crud_should_bind.length}`);
console.log(`  -> D (deprecated/legacy): ${backendTriage.categories.D_deprecated_legacy.length}`);

console.log('[5/5] Triaging undocumented frontend APIs...');
const frontendTriage = triageUndocumentedFrontend(undocumentedFrontend, openapiOps);
console.log(`  -> RC1 (prefix mismatch): ${frontendTriage.rootCauses.RC1_prefix_mismatch.length}`);
console.log(`  -> RC2 (missing utoipa): ${frontendTriage.rootCauses.RC2_missing_utoipa.length}`);
console.log(`  -> RC3 (param format): ${frontendTriage.rootCauses.RC3_param_format.length}`);
console.log(`  -> RC4 (unregistered): ${frontendTriage.rootCauses.RC4_unregistered.length}`);
console.log(`  -> RC5 (frontend internal): ${frontendTriage.rootCauses.RC5_frontend_internal.length}`);

// Build comprehensive result
const result = {
  summary: {
    totalOpenApiOps: openapiOps.length,
    totalFrontendCalls: frontendCalls.length,
    unusedBackendTotal: unusedBackend.length,
    undocumentedFrontendTotal: undocumentedFrontend.length,
  },
  unusedBackend: {
    total: unusedBackend.length,
    categories: {
      A_health_internal: {
        count: backendTriage.categories.A_health_internal.length,
        items: backendTriage.categories.A_health_internal,
      },
      B_ai_stubs: {
        count: backendTriage.categories.B_ai_stubs.length,
        items: backendTriage.categories.B_ai_stubs,
      },
      C_crud_should_bind: {
        count: backendTriage.categories.C_crud_should_bind.length,
        byService: Object.fromEntries(
          Object.entries(backendTriage.cByService).map(([k, v]) => [k, { count: v.length, items: v }])
        ),
      },
      D_deprecated_legacy: {
        count: backendTriage.categories.D_deprecated_legacy.length,
        items: backendTriage.categories.D_deprecated_legacy,
      },
    },
  },
  undocumentedFrontend: {
    total: undocumentedFrontend.length,
    rootCauses: {
      RC1_prefix_mismatch: {
        count: frontendTriage.rootCauses.RC1_prefix_mismatch.length,
        byService: groupByService(frontendTriage.rootCauses.RC1_prefix_mismatch),
        items: frontendTriage.rootCauses.RC1_prefix_mismatch,
        sample: frontendTriage.rootCauses.RC1_prefix_mismatch.slice(0, 30),
      },
      RC2_missing_utoipa: {
        count: frontendTriage.rootCauses.RC2_missing_utoipa.length,
        byService: groupByService(frontendTriage.rootCauses.RC2_missing_utoipa),
        sample: frontendTriage.rootCauses.RC2_missing_utoipa.slice(0, 30),
      },
      RC3_param_format: {
        count: frontendTriage.rootCauses.RC3_param_format.length,
        byService: groupByService(frontendTriage.rootCauses.RC3_param_format),
        sample: frontendTriage.rootCauses.RC3_param_format.slice(0, 30),
      },
      RC4_unregistered: {
        count: frontendTriage.rootCauses.RC4_unregistered.length,
        byService: groupByService(frontendTriage.rootCauses.RC4_unregistered),
        items: frontendTriage.rootCauses.RC4_unregistered,
        sample: frontendTriage.rootCauses.RC4_unregistered.slice(0, 50),
      },
      RC5_frontend_internal: {
        count: frontendTriage.rootCauses.RC5_frontend_internal.length,
        byService: groupByService(frontendTriage.rootCauses.RC5_frontend_internal),
        sample: frontendTriage.rootCauses.RC5_frontend_internal,
      },
    },
    byService: Object.fromEntries(
      Object.entries(frontendTriage.byService).map(([k, v]) => [k, v.length])
    ),
  },
};

function groupByService(items) {
  const map = {};
  for (const item of items) {
    const svc = item.service || 'unknown';
    map[svc] = (map[svc] || 0) + 1;
  }
  return map;
}

writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
console.log(`\nJSON result: ${OUTPUT_JSON}`);

// Generate Markdown report
const md = generateMarkdownReport(result);
writeFileSync(OUTPUT_MD, md);
console.log(`Markdown report: ${OUTPUT_MD}`);

function generateMarkdownReport(r) {
  const lines = [];
  lines.push('# P-04 Triage Report: Unused Backend APIs & Undocumented Frontend APIs');
  lines.push('');
  lines.push('> Auto-generated by p04_triage.mjs');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| OpenAPI operations | ${r.summary.totalOpenApiOps} |`);
  lines.push(`| Frontend API calls | ${r.summary.totalFrontendCalls} |`);
  lines.push(`| Unused backend APIs | ${r.summary.unusedBackendTotal} |`);
  lines.push(`| Undocumented frontend APIs | ${r.summary.undocumentedFrontendTotal} |`);
  lines.push('');

  // Unused Backend
  lines.push('## 1. Unused Backend APIs Triage');
  lines.push('');
  lines.push('| Category | Count | Description |');
  lines.push('|----------|-------|-------------|');
  lines.push(`| A — Health/Internal | ${r.unusedBackend.categories.A_health_internal.count} | Health checks, metrics, plugin endpoints (expected unused) |`);
  lines.push(`| B — AI Stubs | ${r.unusedBackend.categories.B_ai_stubs.count} | AI service stub functions not yet wired to frontend |`);
  lines.push(`| C — CRUD Should Bind | ${r.unusedBackend.categories.C_crud_should_bind.count} | CRUD endpoints that should have frontend bindings |`);
  lines.push(`| D — Deprecated/Legacy | ${r.unusedBackend.categories.D_deprecated_legacy.count} | Deprecated analytics/report paths |`);
  lines.push(`| **Total** | **${r.summary.unusedBackendTotal}** | |`);
  lines.push('');

  // Category C by service
  if (r.unusedBackend.categories.C_crud_should_bind.count > 0) {
    lines.push('### Category C — CRUD Endpoints by Service');
    lines.push('');
    lines.push('| Service | Count | Sample operationIds |');
    lines.push('|---------|-------|---------------------|');
    const sorted = Object.entries(r.unusedBackend.categories.C_crud_should_bind.byService)
      .sort((a, b) => b[1].count - a[1].count);
    for (const [svc, data] of sorted) {
      const samples = data.items.slice(0, 5).map(i => i.operationId).join(', ');
      lines.push(`| ${svc} | ${data.count} | ${samples} |`);
    }
    lines.push('');
  }

  // Category A items
  if (r.unusedBackend.categories.A_health_internal.count > 0) {
    lines.push('### Category A — Health/Internal Endpoints');
    lines.push('');
    lines.push('| # | operationId | Method | Path |');
    lines.push('|---|-------------|--------|------|');
    r.unusedBackend.categories.A_health_internal.items.slice(0, 20).forEach((item, i) => {
      lines.push(`| ${i+1} | ${item.operationId} | ${item.method} | \`${item.path}\` |`);
    });
    if (r.unusedBackend.categories.A_health_internal.count > 20) {
      lines.push(`| ... | *${r.unusedBackend.categories.A_health_internal.count - 20} more* | | |`);
    }
    lines.push('');
  }

  // Category B items
  if (r.unusedBackend.categories.B_ai_stubs.count > 0) {
    lines.push('### Category B — AI Stub Functions');
    lines.push('');
    lines.push('| # | operationId | Method | Path |');
    lines.push('|---|-------------|--------|------|');
    r.unusedBackend.categories.B_ai_stubs.items.slice(0, 20).forEach((item, i) => {
      lines.push(`| ${i+1} | ${item.operationId} | ${item.method} | \`${item.path}\` |`);
    });
    if (r.unusedBackend.categories.B_ai_stubs.count > 20) {
      lines.push(`| ... | *${r.unusedBackend.categories.B_ai_stubs.count - 20} more* | | |`);
    }
    lines.push('');
  }

  // Category D items
  if (r.unusedBackend.categories.D_deprecated_legacy.count > 0) {
    lines.push('### Category D — Deprecated/Legacy Paths');
    lines.push('');
    lines.push('| # | operationId | Method | Path |');
    lines.push('|---|-------------|--------|------|');
    r.unusedBackend.categories.D_deprecated_legacy.items.slice(0, 20).forEach((item, i) => {
      lines.push(`| ${i+1} | ${item.operationId} | ${item.method} | \`${item.path}\` |`);
    });
    lines.push('');
  }

  // Undocumented Frontend
  lines.push('## 2. Undocumented Frontend APIs Triage');
  lines.push('');
  lines.push('| Root Cause | Count | Description |');
  lines.push('|------------|-------|-------------|');
  lines.push(`| RC1 — Prefix Mismatch | ${r.undocumentedFrontend.rootCauses.RC1_prefix_mismatch.count} | Frontend uses wrong API prefix (e.g. /api/v1/ vs /api/) |`);
  lines.push(`| RC2 — Missing utoipa | ${r.undocumentedFrontend.rootCauses.RC2_missing_utoipa.count} | Backend route exists but lacks utoipa annotation |`);
  lines.push(`| RC3 — Param Format | ${r.undocumentedFrontend.rootCauses.RC3_param_format.count} | :id vs {id} format mismatch |`);
  lines.push(`| RC4 — Unregistered | ${r.undocumentedFrontend.rootCauses.RC4_unregistered.count} | Frontend calls non-existent backend route |`);
  lines.push(`| RC5 — Frontend Internal | ${r.undocumentedFrontend.rootCauses.RC5_frontend_internal.count} | Mock/local/test paths |`);
  lines.push(`| **Total** | **${r.summary.undocumentedFrontendTotal}** | |`);
  lines.push('');

  // By service
  lines.push('### Undocumented Frontend APIs by Service');
  lines.push('');
  lines.push('| Service | Total | RC1 | RC2 | RC3 | RC4 | RC5 |');
  lines.push('|---------|-------|-----|-----|-----|-----|-----|');
  const allServices = new Set([
    ...Object.keys(r.undocumentedFrontend.byService),
  ]);
  const sortedServices = [...allServices].sort((a, b) =>
    (r.undocumentedFrontend.byService[b] || 0) - (r.undocumentedFrontend.byService[a] || 0)
  );
  for (const svc of sortedServices) {
    const total = r.undocumentedFrontend.byService[svc] || 0;
    const rc1 = r.undocumentedFrontend.rootCauses.RC1_prefix_mismatch.byService[svc] || 0;
    const rc2 = r.undocumentedFrontend.rootCauses.RC2_missing_utoipa.byService[svc] || 0;
    const rc3 = r.undocumentedFrontend.rootCauses.RC3_param_format.byService[svc] || 0;
    const rc4 = r.undocumentedFrontend.rootCauses.RC4_unregistered.byService[svc] || 0;
    const rc5 = r.undocumentedFrontend.rootCauses.RC5_frontend_internal.byService[svc] || 0;
    lines.push(`| ${svc} | ${total} | ${rc1} | ${rc2} | ${rc3} | ${rc4} | ${rc5} |`);
  }
  lines.push('');

  // RC4 samples (unregistered - most critical)
  if (r.undocumentedFrontend.rootCauses.RC4_unregistered.count > 0) {
    lines.push('### RC4 — Unregistered Routes (Sample)');
    lines.push('');
    lines.push('| # | Service | Method | Path | File |');
    lines.push('|---|---------|--------|------|------|');
    r.undocumentedFrontend.rootCauses.RC4_unregistered.sample.slice(0, 30).forEach((item, i) => {
      lines.push(`| ${i+1} | ${item.service} | ${item.method} | \`${item.fullPath}\` | ${item.file}:${item.line} |`);
    });
    lines.push('');
  }

  // RC1 samples
  if (r.undocumentedFrontend.rootCauses.RC1_prefix_mismatch.count > 0) {
    lines.push('### RC1 — Prefix Mismatch (Sample)');
    lines.push('');
    lines.push('| # | Service | Method | Path | File |');
    lines.push('|---|---------|--------|------|------|');
    r.undocumentedFrontend.rootCauses.RC1_prefix_mismatch.sample.slice(0, 20).forEach((item, i) => {
      lines.push(`| ${i+1} | ${item.service} | ${item.method} | \`${item.fullPath}\` | ${item.file}:${item.line} |`);
    });
    lines.push('');
  }

  // Recommendations
  lines.push('## 3. Recommendations');
  lines.push('');
  lines.push('### Phase 1: Quick Wins (Low Effort, High Impact)');
  lines.push('');
  lines.push(`1. **Mark Category A (${r.unusedBackend.categories.A_health_internal.count}) as exempt** — health/internal endpoints are expected to be unused by frontend`);
  lines.push(`2. **Mark Category B (${r.unusedBackend.categories.B_ai_stubs.count}) as exempt** — AI stub functions are not yet implemented`);
  lines.push(`3. **Mark Category D (${r.unusedBackend.categories.D_deprecated_legacy.count}) as deprecated** — legacy analytics/report paths`);
  lines.push('');
  lines.push('### Phase 2: Prefix Mismatch Fix (RC1)');
  lines.push('');
  lines.push(`4. **Fix RC1 (${r.undocumentedFrontend.rootCauses.RC1_prefix_mismatch.count}) prefix mismatches** — align frontend API paths with backend conventions`);
  lines.push('');
  lines.push('### Phase 3: Missing utoipa Annotations (RC2)');
  lines.push('');
  lines.push(`5. **Add utoipa annotations for RC2 (${r.undocumentedFrontend.rootCauses.RC2_missing_utoipa.count}) routes** — backend routes exist but lack OpenAPI documentation`);
  lines.push('');
  lines.push('### Phase 4: CRUD Bindings (Category C)');
  lines.push('');
  lines.push(`6. **Add frontend bindings for Category C (${r.unusedBackend.categories.C_crud_should_bind.count}) CRUD endpoints** — prioritize high-value services`);
  lines.push('');
  lines.push('### Phase 5: Unregistered Routes (RC4)');
  lines.push('');
  lines.push(`7. **Triage RC4 (${r.undocumentedFrontend.rootCauses.RC4_unregistered.count}) unregistered routes** — determine if backend route needs to be created or frontend call should be removed`);

  return lines.join('\n');
}
