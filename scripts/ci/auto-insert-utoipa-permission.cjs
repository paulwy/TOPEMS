#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SVC_DIR = path.join(ROOT, 'svc');
const MAPPING_PATH = path.join(__dirname, 'perm-code-mapping.json');

/** @type {Record<string, Record<string, string>> | null} */
let MAPPING_CACHE = null;
function loadMapping() {
  if (MAPPING_CACHE === null) {
    if (fs.existsSync(MAPPING_PATH)) {
      MAPPING_CACHE = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
    } else {
      MAPPING_CACHE = {};
    }
  }
  return MAPPING_CACHE;
}

/**
 * Convert glob-style pattern ("*_audit_*", "create_*", "bom") to regex.
 * Only supports * as wildcard (matches 0+ chars except '_' boundary is loose).
 *   "create_*"     → /^create_.*$/
 *   "*_audit_*"    → /^.*_audit_.*$/
 *   "get_*_by_id"  → /^get_.*_by_id$/
 *   "bom"          → /^bom$/ (exact)
 */
function globToRegex(pattern) {
  if (pattern === '*') return /^.*$/;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + '$');
}

/**
 * Resolve perm code via mapping.json (new fine-grained) or fallback to old coarse-grained {module}:{action}.
 * @param {string} svcName    e.g. "finance" / "topems-finance" (we also accept normalized dashed)
 * @param {string} handlerName raw fn name like "create_invoice_handler" / "list_approval_configs_handler"
 * @param {string} action     derived from HTTP method: "read"/"write"/"update"/"delete"
 * @param {string} module     from svcName.replace(/-/g, '_')
 * @param {object} opts       { enableMapping: boolean }
 * @returns {string} resolved permission code (e.g. "finance:invoice:write", fallback "finance:write")
 */
function resolvePermCode(svcName, handlerName, action, module, opts) {
  let resolved;
  // normalize svc key for mapping lookup: "topems-finance" → "finance"; "finance" → "finance"
  const mapKey = svcName.startsWith('topems-') ? svcName.slice(7) : svcName;
  if (opts.enableMapping) {
    const mapping = loadMapping();
    const svcMap = mapping[mapKey];
    if (svcMap) {
      // strip trailing "_handler" (common Rust naming pattern): create_invoice_handler → create_invoice
      let baseFn = handlerName || '';
      if (baseFn.endsWith('_handler')) baseFn = baseFn.slice(0, -'_handler'.length);

      // collect candidate patterns:
      //   priority: 1) exact key matches (non-glob) on full fn or substring match
      //             2) glob patterns ordered by length desc (most specific first)
      //             3) "default" key
      const candidates = [];
      for (const [k, v] of Object.entries(svcMap)) {
        if (k === 'default' || k.startsWith('_')) continue;
        const hasGlob = k.includes('*');
        candidates.push({
          pattern: k, value: v, hasGlob,
          regex: hasGlob ? globToRegex(k) : null,
          len: k.length
        });
      }
      candidates.sort((a, b) => {
        if (a.hasGlob !== b.hasGlob) return a.hasGlob ? 1 : -1;
        return b.len - a.len;
      });

      let found = null;
      // non-glob: exact match first, then short-key substring hit
      for (const c of candidates) {
        if (!c.hasGlob) {
          if (baseFn === c.pattern) { found = c.value; break; }
          if (c.pattern.length <= 12 && baseFn.includes(c.pattern)) { found = c.value; break; }
        }
      }
      if (!found) {
        for (const c of candidates) {
          if (c.hasGlob && c.regex && c.regex.test(baseFn)) { found = c.value; break; }
        }
      }
      if (!found) {
        const def = svcMap.default;
        if (typeof def === 'string') {
          found = (def === '__action__') ? `${module}:${action}` : def;
        }
      }
      resolved = found;
    }
  }
  if (!resolved) resolved = `${module}:${action}`; // fallback coarse-grained

  // HTTP-method consistency guard:
  //   Avoid "GET fn_contains_voucher → finance:voucher:write" (read→write upgrade unsafe).
  //   If HTTP action == 'read' but resolved perm ends with ':write'/':admin',
  //   normalize the tail to ':read' preserving the fine-grained prefix (voucher, payment, …).
  //   If HTTP action is write/update/delete but perm ends with ':read' (e.g. compliance search POST) we keep it:
  //   POST for reporting is a legit "read operation via POST body" pattern.
  if (action === 'read') {
    if (resolved.endsWith(':write')) {
      resolved = resolved.slice(0, -':write'.length) + ':read';
    } else if (resolved.endsWith(':admin')) {
      resolved = resolved.slice(0, -':admin'.length) + ':read';
    }
  }
  // Symmetric safety (less urgent but keeps consistency): DELETE → xx:read doesn't make sense.
  //   If HTTP action == 'delete'/'update'/'write' and perm ends with ':read', keep as-is for now
  //   (report_* POST legit returns :read; DELETE for "delete_readonly_item" rare but acceptable).
  return resolved;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { svc: [], apply: false, format: 'security', enableMapping: false, rewriteExisting: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--svc') {
      const val = args[++i];
      if (val) opts.svc = val.split(',').map(s => s.trim()).filter(Boolean);
    } else if (a.startsWith('--svc=')) {
      opts.svc = a.slice(6).split(',').map(s => s.trim()).filter(Boolean);
    } else if (a === '--apply') {
      opts.apply = true;
    } else if (a === '--format') {
      const val = args[++i];
      if (val) opts.format = val;
    } else if (a.startsWith('--format=')) {
      opts.format = a.slice(9);
    } else if (a === '--enable-mapping') {
      opts.enableMapping = true;
    } else if (a === '--rewrite-existing') {
      opts.rewriteExisting = true;
    }
  }
  return opts;
}

function extractUtoipaPathMacros(content) {
  const macros = [];
  const prefix = '#[utoipa::path';
  let idx = 0;
  while (idx < content.length) {
    const start = content.indexOf(prefix, idx);
    if (start === -1) break;
    let p = start + prefix.length;
    while (p < content.length && /\s/.test(content[p])) p++;
    if (p >= content.length || content[p] !== '(') {
      idx = start + prefix.length;
      continue;
    }
    let depth = 1;
    const bodyStart = p + 1;
    let i = bodyStart;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0) break;
      i++;
    }
    if (depth !== 0) {
      console.error(`[WEAK_PASS] unbalanced #[utoipa::path( at offset ${start}`);
      idx = start + prefix.length;
      continue;
    }
    macros.push({ start, end: i, bodyStart, body: content.slice(bodyStart, i) });
    idx = i + 1;
  }
  return macros;
}

function walkRsFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRsFiles(fullPath, result);
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      result.push(fullPath);
    }
  }
  return result;
}

function httpMethodToAction(method) {
  const m = method.toLowerCase();
  if (m === 'get') return 'read';
  if (m === 'post') return 'write';
  if (m === 'put' || m === 'patch') return 'update';
  if (m === 'delete') return 'delete';
  return 'read';
}

function extractHttpMethod(body) {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
  for (const m of methods) {
    const re = new RegExp('(?:^|[,\\s])(' + m + ')(?:[,\\s]|$)', 'i');
    const match = body.match(re);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

/**
 * Scan backwards from a #[utoipa::path(...)] macro start position to find the handler fn name.
 * Typical Rust patterns (we accept fn signature occurring AFTER the macro; if not found look before):
 *   #[utoipa::path(...)]
 *   pub async fn list_approval_configs_handler(...) -> Result<...> { ... }
 *   pub(crate) async fn get_payment_by_id(...) -> ... { ... }
 *   async fn create_invoice_handler(...) -> ... { ... }
 *   pub fn list_foo(...) -> ... { ... }
 */
function extractHandlerName(content, macroStart, macroEnd = -1) {
  // Strategy: look AFTER the macro first (most common order: #[utoipa::path] → fn decl)
  const searchFrom = macroEnd > macroStart ? macroEnd : macroStart;
  const afterChunk = content.slice(searchFrom, searchFrom + 1500);
  // Limit depth: only capture first fn name within ~1500 chars (stop at opening '{')
  const fnRegex = /(?:^|[;}\s])(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
  let m = afterChunk.match(fnRegex);
  if (m) return m[1];

  // Fallback: look BEFORE macro (some code style put doc comments or utoipa macro inline after fn)
  const beforeChunk = content.slice(Math.max(0, macroStart - 1500), macroStart);
  const reversed = beforeChunk.split('').reverse().join('');
  // Find last fn in before chunk: look for ") ( nf  ..." pattern reversed
  const m2 = beforeChunk.match(/fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{[^{]*$/);
  if (m2) return m2[1];
  // Simpler fallback: last fn name in before chunk
  const all = [...beforeChunk.matchAll(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)];
  if (all.length > 0) return all[all.length - 1][1];
  return '';
}

/**
 * Check if macro body has permission attr, and optionally extract existing attr for rewrite.
 * Returns { has: bool, kind: 'security'|'permissions'|null, matchStart:number, matchEnd:number, oldPerm:string|null }
 *   matchStart/matchEnd are offsets in body (absolute offset later = macro.bodyStart + these)
 */
function analyzePermissionAttr(body, format) {
  // security(("BearerAuth" = ["finance:read"]))
  const secRe = /security\s*\(\s*\(\s*"BearerAuth"\s*=\s*\[([^\]]*)\]\s*\)\s*\)/;
  const mSec = body.match(secRe);
  if (mSec) {
    const inside = mSec[1].trim();
    const permMatch = inside.match(/"([^"]+)"/);
    return {
      has: true, kind: 'security',
      matchStart: mSec.index, matchEnd: mSec.index + mSec[0].length,
      oldPerm: permMatch ? permMatch[1] : null,
      fullMatch: mSec[0]
    };
  }
  // permissions = ("finance:write")  or  permissions("finance:write")
  if (format === 'permissions' || /permissions\s*[=(]/.test(body)) {
    const pEqRe = /permissions\s*=\s*\(\s*"([^"]+)"\s*\)/;
    const mPEq = body.match(pEqRe);
    if (mPEq) {
      return {
        has: true, kind: 'permissions',
        matchStart: mPEq.index, matchEnd: mPEq.index + mPEq[0].length,
        oldPerm: mPEq[1], fullMatch: mPEq[0]
      };
    }
    const pRe = /permissions\s*\(\s*"([^"]+)"\s*\)/;
    const mP = body.match(pRe);
    if (mP) {
      return {
        has: true, kind: 'permissions',
        matchStart: mP.index, matchEnd: mP.index + mP[0].length,
        oldPerm: mP[1], fullMatch: mP[0]
      };
    }
  }
  return { has: false, kind: null, matchStart: -1, matchEnd: -1, oldPerm: null, fullMatch: null };
}

/** Build the replacement text for existing security/permissions attribute. */
function buildReplacementAttr(newPermCode, kind) {
  if (kind === 'permissions') {
    return `permissions = ("${newPermCode}")`;
  }
  return `security(("BearerAuth" = ["${newPermCode}"]))`;
}

function svcNameToModule(svcName) {
  return svcName.replace(/-/g, '_');
}

function hasPermissionAttr(body, format) {
  if (/permissions?\s*\(/.test(body)) return true;
  if (format === 'security' && /security\s*\(/.test(body)) return true;
  return false;
}

function buildInsertLine(indent, permCode, format) {
  if (format === 'permissions') {
    return `\n${indent}permissions = (\"${permCode}\"),`;
  }
  return `\n${indent}security((\"BearerAuth\" = [\"${permCode}\"])),`;
}

function findInsertionPoint(body) {
  const lines = body.split('\n');
  let methodLineIdx = -1;
  let pathLineIdx = -1;
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (methodLineIdx === -1) {
      for (const m of methods) {
        const re = new RegExp('(?:^|[,\\s])(' + m + ')(?:[,\\s]|$)', 'i');
        if (re.test(line)) {
          methodLineIdx = i;
          break;
        }
      }
    }
    if (pathLineIdx === -1 && /^\s*path\s*=/.test(line)) {
      pathLineIdx = i;
    }
  }

  if (methodLineIdx !== -1 && pathLineIdx !== -1 && methodLineIdx < pathLineIdx) {
    return { afterLineIdx: methodLineIdx, lines };
  }
  if (methodLineIdx !== -1) {
    return { afterLineIdx: methodLineIdx, lines };
  }
  return null;
}

function processFile(file, svcName, apply, format, opts) {
  const module = svcNameToModule(svcName);
  const content = fs.readFileSync(file, 'utf8');
  const macros = extractUtoipaPathMacros(content);

  /** @type {{pos:number, end?:number, text:string, file:string, method:string, permCode:string, kind:'insert'|'rewrite', oldPerm?:string|null}[]} */
  const operations = [];

  for (const macro of macros) {
    // New: extract handler name (search after macro first, then fallback to before)
    const macroEndInContent = macro.end + 1; // macro.end points to closing ')', next char is after
    const handlerName = extractHandlerName(content, macro.start, macroEndInContent);

    const method = extractHttpMethod(macro.body);
    if (!method) continue;
    const action = httpMethodToAction(method);

    // New: resolve fine-grained perm via mapping.json (if enableMapping) else coarse fallback
    const permCode = resolvePermCode(svcName, handlerName, action, module, opts);

    // Analyze existing permission attribute (has + what kind + old perm value + span)
    const ana = analyzePermissionAttr(macro.body, format);

    if (ana.has) {
      if (!opts.rewriteExisting) {
        // Default old behavior: skip macros that already have security/permissions attr
        continue;
      }
      // Rewrite mode: if oldPerm != newPermCode → replace text span inside body
      if (!ana.oldPerm || ana.oldPerm === permCode) {
        // already correct perm → skip (no-op)
        continue;
      }
      const replacementBody = buildReplacementAttr(permCode, ana.kind);
      const absStart = macro.bodyStart + ana.matchStart;
      const absEnd = macro.bodyStart + ana.matchEnd;
      operations.push({
        pos: absStart, end: absEnd, text: replacementBody,
        file: path.relative(ROOT, file), method, permCode,
        kind: 'rewrite', oldPerm: ana.oldPerm
      });
      continue;
    }

    // No existing attr → original INSERT path (single-line / multi-line split)
    const isSingleLine = !macro.body.includes('\n');
    let absInsertPos;
    let insertText;

    if (isSingleLine) {
      absInsertPos = macro.bodyStart + macro.body.length;
      if (format === 'permissions') {
        insertText = `, permissions = ("${permCode}")`;
      } else {
        insertText = `, security(("BearerAuth" = ["${permCode}"]))`;
      }
    } else {
      const insertPoint = findInsertionPoint(macro.body);
      if (!insertPoint) continue;

      const { afterLineIdx, lines } = insertPoint;
      const methodLine = lines[afterLineIdx];
      const indentMatch = methodLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '    ';

      let offsetInBody = 0;
      for (let i = 0; i <= afterLineIdx; i++) {
        if (i === afterLineIdx) {
          offsetInBody += lines[i].length;
        } else {
          offsetInBody += lines[i].length + 1;
        }
      }
      insertText = buildInsertLine(indent, permCode, format);
      absInsertPos = macro.bodyStart + offsetInBody;
    }

    operations.push({
      pos: absInsertPos, text: insertText,
      file: path.relative(ROOT, file), method, permCode,
      kind: 'insert'
    });
  }

  if (operations.length === 0) return { changed: false, count: 0 };

  // Apply ops DESC: rewrites have explicit end, inserts use pos + slice
  operations.sort((a, b) => (b.end ?? b.pos) - (a.end ?? a.pos));

  let newContent = content;
  for (const op of operations) {
    const end = op.end ?? op.pos;
    newContent = newContent.slice(0, op.pos) + op.text + newContent.slice(end);
  }

  if (apply) {
    fs.writeFileSync(file, newContent, 'utf8');
  }

  return { changed: true, count: operations.length, insertions: operations };
}

function main() {
  const opts = parseArgs(process.argv);

  if (!['security', 'permissions'].includes(opts.format)) {
    console.error(`Error: --format must be 'security' or 'permissions' (got: ${opts.format})`);
    process.exit(1);
  }

  if (opts.svc.length === 0) {
    console.error('Usage: node scripts/ci/auto-insert-utoipa-permission.cjs --svc <name>[,<name>] [--apply] [--format=<security|permissions>] [--enable-mapping] [--rewrite-existing]');
    console.error('  --svc ai,search                 Process specific svc(s)');
    console.error('  --apply                         Actually modify files (default: dry-run only)');
    console.error('  --format security               Use utoipa-native security(("BearerAuth" = ["mod:act"]))  [DEFAULT, cargo-check OK]');
    console.error('  --format permissions            Use permissions = ("mod:act")  [POC-only, cargo-check FAIL per V251 A-rail trail]');
    console.error('  --enable-mapping                Enables fine-grained perm lookup via scripts/ci/perm-code-mapping.json (finance/qms/pm/mes svc)');
    console.error('  --rewrite-existing              Rewrite already-existing security/permissions attr when mapping changes perm code (default: skip with attr)');
    process.exit(1);
  }

  const mode = opts.apply ? '[APPLY]' : '[DRY-RUN]';
  const compat = opts.format === 'security' ? '[utoipa-compatible]' : '[POC-only]';
  const flags = [
    opts.enableMapping ? 'enable-mapping' : null,
    opts.rewriteExisting ? 'rewrite-existing' : null,
  ].filter(Boolean).join(',');
  console.log(`${mode} ${compat} auto-insert utoipa permission attrs (format=${opts.format}${flags ? ', flags=' + flags : ''}) for svc: ${opts.svc.join(', ')}`);
  console.log('');

  let totalFiles = 0;
  let totalInsertions = 0;
  let totalRewrites = 0;

  for (const svcName of opts.svc) {
    const svcPath = path.join(SVC_DIR, svcName);
    if (!fs.existsSync(svcPath)) {
      console.error(`[SKIP] svc not found: ${svcName}`);
      continue;
    }
    const srcPath = path.join(svcPath, 'src');
    const rsFiles = walkRsFiles(srcPath);
    let svcFilesChanged = 0;
    let svcInsertions = 0;
    let svcRewrites = 0;

    for (const file of rsFiles) {
      const result = processFile(file, svcName, opts.apply, opts.format, opts);
      if (result.changed) {
        svcFilesChanged++;
        const relFile = path.relative(ROOT, file);
        for (const ins of result.insertions) {
          if (ins.kind === 'rewrite') {
            svcRewrites++;
            console.log(`  ${relFile}: ~rewrite [${ins.method}] ${ins.oldPerm || '???'} → ${ins.permCode}`);
          } else {
            svcInsertions++;
            const label = opts.format === 'security'
              ? `+security((BearerAuth=["${ins.permCode}"]))`
              : `+permissions=("${ins.permCode}")`;
            console.log(`  ${relFile}: ${label} [${ins.method}]`);
          }
        }
      }
    }

    totalFiles += svcFilesChanged;
    totalInsertions += svcInsertions;
    totalRewrites += svcRewrites;
    const parts = [];
    if (svcInsertions > 0) parts.push(`+${svcInsertions} inserts`);
    if (svcRewrites > 0) parts.push(`~${svcRewrites} rewrites`);
    console.log(`[svc/${svcName}] ${svcFilesChanged} files, ${parts.join(', ') || 'no change (already aligned)'}`);
  }

  console.log('');
  const totalParts = [];
  if (totalInsertions > 0) totalParts.push(`${totalInsertions} insertions`);
  if (totalRewrites > 0) totalParts.push(`${totalRewrites} rewrites`);
  console.log(`Total: ${totalFiles} files changed, ${totalParts.length ? totalParts.join(', ') : '0 changes'} (${opts.apply ? 'written' : 'plan only'})`);
}

main();
