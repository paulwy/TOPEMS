#!/usr/bin/env node
/**
 * Schema Boundary Gate (V531, 2026-09-07)
 *
 * Scans all services (svc/*) for BARE `sqlx::query*` SQL that references a
 * schema other than the service's own schema or the shared allowlist.
 *
 * Rationale:
 *  - `only_own_schema_query!` (lib/shared-boundary) enforces schema ownership
 *    at compile time, but ONLY for queries wrapped in the macro. Bare
 *    `sqlx::query("...")` string literals bypass it, silently depending on
 *    search_path and eroding service boundaries.
 *  - Baseline (2026-09-07 audit): 0 violations.
 *  - This gate is defensive: any NEW cross-schema bare reference blocks CI.
 *
 * Detection: for each bare sqlx call site, only the string literal content
 * (regular "..." or raw r#"..."#) is scanned for `schema.table` tokens;
 * Rust field access outside strings is never considered.
 *
 * Allowlist (shared/infrastructure schemas):
 *   public / unified_core / pg_catalog / information_schema
 *
 * Usage: node scripts/ci/check-schema-boundary.cjs
 * Exit codes: 0 = pass, 1 = violations found
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SVC_DIR = path.join(REPO_ROOT, 'svc');

const SHARED_SCHEMAS = new Set([
  'public',
  'unified_core',
  'pg_catalog',
  'information_schema',
]);

// Locates a bare sqlx invocation up to the closing ')' that terminates the
// call expression (balanced parens, ignoring string contents).
function findSqlxCalls(text) {
  const calls = [];
  const re = /sqlx::(?:query|query_as|query_scalar|query_file|query_as_file|query_scalar_file)(?!!)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    // Walk forward from the call name to find the first '(' then balance.
    let i = m.index + m[0].length;
    while (i < text.length && text[i] !== '(') i += 1;
    if (i >= text.length) continue;
    let depth = 0;
    let inStr = null; // null | '"' | 'r#'
    for (let j = i; j < text.length; j += 1) {
      const ch = text[j];
      if (inStr === 'r#') {
        if (text.startsWith('"#', j)) { inStr = null; j += 1; }
        continue;
      }
      if (inStr === '"') {
        if (ch === '\\') { j += 1; continue; }
        if (ch === '"') inStr = null;
        continue;
      }
      if (ch === '"') {
        inStr = (text.startsWith('r#"', j)) ? 'r#' : '"';
        if (inStr === 'r#') j += 2;
        continue;
      }
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          calls.push({ start: m.index, end: j + 1, chunk: text.slice(m.index, j + 1) });
          break;
        }
      }
    }
  }
  return calls;
}

function extractStringLiterals(chunk) {
  const strings = [];
  const re = /r#?"([\s\S]*?)"#?/g;
  let m;
  while ((m = re.exec(chunk)) !== null) strings.push(m[1]);
  return strings;
}

// Only `schema.table` appearing right after a SQL keyword counts; alias
// references (u.col) and email-like tokens (user@topems.com) never match.
const SCHEMA_REF_RE =
  /\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM)\s+([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)/gi;

// Services that own more than their directory-named schema.
const EXTRA_OWNED_SCHEMAS = {
  'unified-core': ['unified_core', 'iam', 'core'],
  rd: ['rs'], // rd 启动时经 schema_defense 建 rs schema
};

// Pre-existing bare cross-schema references (see schema-boundary-allowlist.json).
// Keyed by repo-relative file path; any violation outside these keys blocks CI.
const ALLOWLIST = new Set(
  Object.keys(
    JSON.parse(
      fs.readFileSync(path.join(__dirname, 'schema-boundary-allowlist.json'), 'utf8')
    ).entries
  )
);

// plugin_<name> schemas belong to service <name>.
function isOwnedBy(schema, svc) {
  if (schema === svc) return true;
  if (schema.startsWith('plugin_') && schema.slice('plugin_'.length) === svc) return true;
  const extra = EXTRA_OWNED_SCHEMAS[svc];
  return !!extra && extra.includes(schema);
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.rs')) out.push(p);
  }
  return out;
}

function main() {
  if (!fs.existsSync(SVC_DIR)) {
    console.error('svc/ directory not found at', SVC_DIR);
    process.exit(1);
  }

  const services = fs
    .readdirSync(SVC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(SVC_DIR, d.name, 'src')))
    .map((d) => d.name);

  const violations = [];
  const allowlisted = [];
  let filesChecked = 0;
  let callSites = 0;

  for (const svc of services) {
    const files = walk(path.join(SVC_DIR, svc, 'src'), []);
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const call of findSqlxCalls(text)) {
        // Queries already wrapped in only_own_schema_query! are compile-time
        // validated by the macro itself; skip them here.
        if (call.chunk.includes('only_own_schema_query!')) continue;
        callSites += 1;
        const schemas = new Set();
        for (const sql of extractStringLiterals(call.chunk)) {
          let m;
          while ((m = SCHEMA_REF_RE.exec(sql)) !== null) {
            const s = m[1].toLowerCase();
            if (!SHARED_SCHEMAS.has(s) && !isOwnedBy(s, svc)) schemas.add(s);
          }
        }
        if (schemas.size) {
          const rel = file.replace(REPO_ROOT + path.sep, '');
          const entry = { svc, file: rel, line: text.slice(0, call.start).split('\n').length, schemas: [...schemas].join(', ') };
          if (ALLOWLIST.has(rel)) allowlisted.push(entry);
          else violations.push(entry);
        }
      }
      filesChecked += 1;
    }
  }

  console.log(
    `[schema-boundary] checked ${services.length} services / ${filesChecked} files / ${callSites} bare sqlx call sites` +
      (allowlisted.length ? ` / ${allowlisted.length} allowlisted (pre-existing)` : '')
  );

  if (violations.length) {
    console.error(
      `[schema-boundary] FAIL: ${violations.length} cross-schema bare reference(s) found`
    );
    const byFile = {};
    for (const v of violations) {
      const key = `${v.svc}: ${v.file}`;
      byFile[key] = byFile[key] || new Set();
      byFile[key].add(v.schemas);
    }
    for (const [key, set] of Object.entries(byFile)) {
      console.error(`  - ${key} -> references ${[...set].join(' / ')}`);
    }
    console.error(
      '[schema-boundary] Fix: wrap the query in only_own_schema_query!(svc, sql, extra_schema...) or use explicit schema prefix.'
    );
    process.exit(1);
  }

  console.log('[schema-boundary] PASS: no cross-schema bare references');
  process.exit(0);
}

main();
