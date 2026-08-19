#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SVC_DIR = path.join(ROOT, 'svc');

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { svc: [], apply: false, format: 'security' };
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

function processFile(file, svcName, apply, format) {
  const module = svcNameToModule(svcName);
  const content = fs.readFileSync(file, 'utf8');
  const macros = extractUtoipaPathMacros(content);

  const insertions = [];

  for (const macro of macros) {
    if (hasPermissionAttr(macro.body, format)) {
      continue;
    }

    const method = extractHttpMethod(macro.body);
    if (!method) continue;

    const action = httpMethodToAction(method);
    const permCode = `${module}:${action}`;

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

    const insertLine = buildInsertLine(indent, permCode, format);
    const absInsertPos = macro.bodyStart + offsetInBody;

    insertions.push({
      pos: absInsertPos,
      text: insertLine,
      file: path.relative(ROOT, file),
      method,
      permCode,
    });
  }

  if (insertions.length === 0) return { changed: false, count: 0 };

  insertions.sort((a, b) => b.pos - a.pos);

  let newContent = content;
  for (const ins of insertions) {
    newContent = newContent.slice(0, ins.pos) + ins.text + newContent.slice(ins.pos);
  }

  if (apply) {
    fs.writeFileSync(file, newContent, 'utf8');
  }

  return { changed: true, count: insertions.length, insertions };
}

function main() {
  const opts = parseArgs(process.argv);

  if (!['security', 'permissions'].includes(opts.format)) {
    console.error(`Error: --format must be 'security' or 'permissions' (got: ${opts.format})`);
    process.exit(1);
  }

  if (opts.svc.length === 0) {
    console.error('Usage: node scripts/ci/auto-insert-utoipa-permission.cjs --svc <name>[,<name>] [--apply] [--format=<security|permissions>]');
    console.error('  --svc ai,search                 Process specific svc(s)');
    console.error('  --apply                         Actually modify files (default: dry-run only)');
    console.error('  --format security               Use utoipa-native security(("BearerAuth" = ["mod:act"]))  [DEFAULT, cargo-check OK]');
    console.error('  --format permissions            Use permissions = ("mod:act")  [POC-only, cargo-check FAIL per V251 A-rail trail]');
    process.exit(1);
  }

  const mode = opts.apply ? '[APPLY]' : '[DRY-RUN]';
  const compat = opts.format === 'security' ? '[utoipa-compatible]' : '[POC-only]';
  console.log(`${mode} ${compat} auto-insert utoipa permission attrs (format=${opts.format}) for svc: ${opts.svc.join(', ')}`);
  console.log('');

  let totalFiles = 0;
  let totalInsertions = 0;

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

    for (const file of rsFiles) {
      const result = processFile(file, svcName, opts.apply, opts.format);
      if (result.changed) {
        svcFilesChanged++;
        svcInsertions += result.count;
        const relFile = path.relative(ROOT, file);
        for (const ins of result.insertions) {
          const label = opts.format === 'security'
            ? `+security((BearerAuth=["${ins.permCode}"]))`
            : `+permissions=("${ins.permCode}")`;
          console.log(`  ${relFile}: ${label} [${ins.method}]`);
        }
      }
    }

    totalFiles += svcFilesChanged;
    totalInsertions += svcInsertions;
    console.log(`[svc/${svcName}] ${svcFilesChanged} files, +${svcInsertions} permission attrs`);
  }

  console.log('');
  console.log(`Total: ${totalFiles} files changed, ${totalInsertions} insertions (${opts.apply ? 'written' : 'plan only'})`);
}

main();
