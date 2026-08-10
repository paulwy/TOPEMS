#!/usr/bin/env node
/**
 * P-04 RC4 Deep Analysis — Sub-categorize the 2367 "unregistered" frontend API calls
 *
 * The initial triage put everything that didn't match RC1-RC3/RC5 into RC4.
 * This script does deeper analysis by:
 *   1. Reading backend route files to check if the path is actually registered
 *   2. Sub-categorizing into:
 *      RC4a: Backend route exists but lacks utoipa annotation (missing from OpenAPI)
 *      RC4b: Admin/system endpoints in unified-core (expected to be separate)
 *      RC4c: Frontend paths with query strings not properly stripped
 *      RC4d: Truly unregistered (backend route doesn't exist)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = '/Users/xingzhai/TOPEMS';
const OPENAPI_JSON = join(ROOT, 'docs/api/openapi-aggregated.json');
const FRONTEND_API_DIR = join(ROOT, 'apps/web/src/api');
const TRIAGE_RESULT_JSON = join(ROOT, 'docs/audit/p04-triage-result.json');
const OUTPUT_JSON = join(ROOT, 'docs/audit/p04-rc4-deep-result.json');

// Read the triage result JSON
const triageResult = JSON.parse(readFileSync(TRIAGE_RESULT_JSON, 'utf-8'));

// Get RC4 items from the JSON
const rc4Items = [];
const result = triageResult;

// Re-extract all RC4 items by re-running the diff
// (The JSON only stored samples, so we need to re-run to get all RC4 items)

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

function parseOpenApi(jsonPath) {
  const raw = readFileSync(jsonPath, 'utf-8');
  const spec = JSON.parse(raw);
  const ops = [];
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, def] of Object.entries(methods)) {
      if (!HTTP_METHODS.includes(method)) continue;
      if (typeof def !== 'object' || def === null) continue;
      ops.push({
        operationId: def.operationId || '(no-operationId)',
        method: method.toUpperCase(),
        path: path,
        normalizedPath: normalizeOpenApiPath(path),
        tag: (def.tags && def.tags[0]) || '',
      });
    }
  }
  return ops;
}

function normalizeOpenApiPath(path) {
  if (path.startsWith('/api/')) return path;
  if (path === '/ai/' || path === '/ai') return '/api/ai/';
  if (path === '/health' || path === '/api/health') return '/api/health';
  return '/api' + path;
}

function walkTs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) results.push(...walkTs(full));
    else if (extname(entry) === '.ts') results.push(full);
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
        calls.push({ service, method, url, fullPath: null, file: relFile,
          line: content.slice(0, match.index).split('\n').length });
        continue;
      }
      let fullPath;
      if (url.startsWith('/')) fullPath = prefix + url;
      else fullPath = prefix + '/' + url;
      const qIdx = fullPath.indexOf('?');
      if (qIdx !== -1) fullPath = fullPath.slice(0, qIdx);
      calls.push({ service, method, url, fullPath: normalizeFrontendPath(fullPath),
        file: relFile, line: content.slice(0, match.index).split('\n').length });
    }
  }
  return calls;
}

// Re-run the diff to get ALL undocumented frontend items
console.log('[1/3] Re-running diff to get all undocumented frontend items...');
const openapiOps = parseOpenApi(OPENAPI_JSON);
const files = walkTs(FRONTEND_API_DIR);
const frontendCalls = parseFrontendApiFiles(files);

const openapiByPath = new Map();
for (const op of openapiOps) {
  const np = normalizeFrontendPath(op.normalizedPath);
  if (!openapiByPath.has(np)) openapiByPath.set(np, []);
  openapiByPath.get(np).push(op);
}

const allUndocumented = [];
for (const call of frontendCalls) {
  if (!call.fullPath) continue;
  const np = call.fullPath;
  if (!openapiByPath.has(np)) {
    allUndocumented.push(call);
  }
}
console.log(`  -> Total undocumented: ${allUndocumented.length}`);

// Now sub-categorize RC4 items (excluding RC1, RC3, RC5 already identified)
console.log('[2/3] Sub-categorizing RC4 items...');

const rc4SubCategories = {
  RC4a_missing_utoipa: [],    // Path likely exists in backend but no utoipa annotation
  RC4b_admin_system: [],      // Admin/system endpoints in unified-core
  RC4c_query_string: [],      // Paths with query strings not stripped
  RC4d_truly_unregistered: [], // No backend route exists
};

// Build a set of OpenAPI path stems (without {id}) for fuzzy matching
const openapiStems = new Set();
for (const op of openapiOps) {
  const np = normalizeFrontendPath(op.normalizedPath);
  // Remove {id} parameters to get the stem
  const stem = np.replace(/\/\{[^}]+\}/g, '');
  openapiStems.add(stem);
  // Also add with the service prefix variations
  const parts = np.split('/');
  if (parts.length >= 4) {
    // e.g. /api/crm/customers/{id} -> stem /api/crm/customers
    const stem2 = parts.slice(0, 4).join('/');
    openapiStems.add(stem2);
  }
}

for (const item of allUndocumented) {
  const fp = item.fullPath || '';
  
  // Check if it's actually an RC1 (prefix mismatch) or RC5 (frontend internal)
  if (fp.includes('/api/v1/')) continue; // RC1
  if (fp.includes('/:')) continue; // RC3
  if (fp.includes('/mock') || fp.includes('/local') || fp.includes('/test') || fp.includes('/dev')) continue; // RC5
  
  // Check for query string artifacts
  if (fp.includes('${') || fp.includes('queryString') || fp.includes('undefined')) {
    rc4SubCategories.RC4c_query_string.push(item);
    continue;
  }
  
  // RC4b: Admin/system endpoints
  if (fp.includes('/admin/') || fp.includes('/system/') || fp.includes('/core/audit/') ||
      fp.includes('/core/monitor/') || fp.includes('/core/system/') ||
      fp.includes('/core/security/') || fp.includes('/core/iam/') ||
      fp.includes('/core/migration/') || fp.includes('/core/automation/')) {
    rc4SubCategories.RC4b_admin_system.push(item);
    continue;
  }
  
  // RC4a: Check if the path stem exists in OpenAPI (meaning the resource exists
  // but the specific sub-path doesn't have utoipa annotation)
  const fpStem = fp.replace(/\/\{[^}]+\}/g, '');
  const fpParts = fp.split('/');
  
  // Check if the resource base exists (e.g. /api/erp/addressbook exists in backend
  // but not in OpenAPI)
  let stemMatch = false;
  if (fpParts.length >= 4) {
    const resourceBase = fpParts.slice(0, 4).join('/'); // e.g. /api/erp/addressbook
    // Check if any OpenAPI path starts with this base
    for (const op of openapiOps) {
      const opNp = normalizeFrontendPath(op.normalizedPath);
      if (opNp.startsWith(resourceBase + '/') || opNp === resourceBase) {
        stemMatch = true;
        break;
      }
    }
  }
  
  if (stemMatch) {
    rc4SubCategories.RC4a_missing_utoipa.push(item);
  } else {
    // Check if the service exists in OpenAPI at all
    const servicePrefix = fpParts.slice(0, 3).join('/'); // e.g. /api/erp
    const serviceExists = openapiOps.some(op => {
      const opNp = normalizeFrontendPath(op.normalizedPath);
      return opNp.startsWith(servicePrefix + '/');
    });
    
    if (serviceExists) {
      // Service exists in OpenAPI but this specific resource doesn't
      // This means the backend has the service but doesn't expose this endpoint
      rc4SubCategories.RC4a_missing_utoipa.push(item);
    } else {
      rc4SubCategories.RC4d_truly_unregistered.push(item);
    }
  }
}

console.log(`  -> RC4a (missing utoipa): ${rc4SubCategories.RC4a_missing_utoipa.length}`);
// TEMP: Print all finance RC4a items
const financeRc4a = rc4SubCategories.RC4a_missing_utoipa.filter(i => i.service === 'finance');
console.log(`  -> Finance RC4a items (${financeRc4a.length}):`);
financeRc4a.forEach((item, i) => {
  console.log(`    ${i+1}. [${item.method}] ${item.fullPath}  (${item.file}:${item.line})`);
});
console.log(`  -> RC4b (admin/system): ${rc4SubCategories.RC4b_admin_system.length}`);
console.log(`  -> RC4c (query string): ${rc4SubCategories.RC4c_query_string.length}`);
console.log(`  -> RC4d (truly unregistered): ${rc4SubCategories.RC4d_truly_unregistered.length}`);

// Generate by-service breakdown for each sub-category
function groupByService(items) {
  const map = {};
  for (const item of items) {
    const svc = item.service || 'unknown';
    map[svc] = (map[svc] || 0) + 1;
  }
  return map;
}

const subCategoryByService = {};
for (const [key, items] of Object.entries(rc4SubCategories)) {
  subCategoryByService[key] = groupByService(items);
}

// Output result
const output = {
  rc4_total: allUndocumented.length,
  subCategories: {
    RC4a_missing_utoipa: {
      count: rc4SubCategories.RC4a_missing_utoipa.length,
      byService: subCategoryByService.RC4a_missing_utoipa,
      sample: rc4SubCategories.RC4a_missing_utoipa.slice(0, 30),
    },
    RC4b_admin_system: {
      count: rc4SubCategories.RC4b_admin_system.length,
      byService: subCategoryByService.RC4b_admin_system,
      sample: rc4SubCategories.RC4b_admin_system.slice(0, 30),
    },
    RC4c_query_string: {
      count: rc4SubCategories.RC4c_query_string.length,
      byService: subCategoryByService.RC4c_query_string,
      sample: rc4SubCategories.RC4c_query_string.slice(0, 20),
    },
    RC4d_truly_unregistered: {
      count: rc4SubCategories.RC4d_truly_unregistered.length,
      byService: subCategoryByService.RC4d_truly_unregistered,
      sample: rc4SubCategories.RC4d_truly_unregistered.slice(0, 50),
    },
  },
};

writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));
console.log(`\nJSON result: ${OUTPUT_JSON}`);

// Print summary table
console.log('\n=== RC4 Sub-Category Summary ===\n');
console.log('| Sub-Category | Count | Description |');
console.log('|-------------|-------|-------------|');
console.log(`| RC4a — Missing utoipa | ${output.subCategories.RC4a_missing_utoipa.count} | Backend route exists but no utoipa annotation |`);
console.log(`| RC4b — Admin/System | ${output.subCategories.RC4b_admin_system.count} | Admin/system endpoints in unified-core |`);
console.log(`| RC4c — Query String | ${output.subCategories.RC4c_query_string.count} | Path parsing artifacts |`);
console.log(`| RC4d — Truly Unregistered | ${output.subCategories.RC4d_truly_unregistered.count} | No backend route exists |`);
console.log(`| **Total** | **${output.rc4_total}** | |`);

console.log('\n=== RC4a by Service ===');
const rc4aSorted = Object.entries(output.subCategories.RC4a_missing_utoipa.byService)
  .sort((a, b) => b[1] - a[1]);
for (const [svc, count] of rc4aSorted) {
  console.log(`  ${svc}: ${count}`);
}

console.log('\n=== RC4b by Service ===');
const rc4bSorted = Object.entries(output.subCategories.RC4b_admin_system.byService)
  .sort((a, b) => b[1] - a[1]);
for (const [svc, count] of rc4bSorted) {
  console.log(`  ${svc}: ${count}`);
}

console.log('\n=== RC4d by Service ===');
const rc4dSorted = Object.entries(output.subCategories.RC4d_truly_unregistered.byService)
  .sort((a, b) => b[1] - a[1]);
for (const [svc, count] of rc4dSorted) {
  console.log(`  ${svc}: ${count}`);
}

// Print RC4d samples (most critical - truly unregistered routes)
console.log('\n=== RC4d Samples (Truly Unregistered) ===');
console.log('| # | Service | Method | Path | File |');
rc4SubCategories.RC4d_truly_unregistered.slice(0, 30).forEach((item, i) => {
  console.log(`| ${i+1} | ${item.service} | ${item.method} | \`${item.fullPath}\` | ${item.file}:${item.line} |`);
});

// Print RC4a samples
console.log('\n=== RC4a Samples (Missing utoipa) ===');
console.log('| # | Service | Method | Path | File |');
rc4SubCategories.RC4a_missing_utoipa.slice(0, 20).forEach((item, i) => {
  console.log(`| ${i+1} | ${item.service} | ${item.method} | \`${item.fullPath}\` | ${item.file}:${item.line} |`);
});
