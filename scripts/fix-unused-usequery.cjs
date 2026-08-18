#!/usr/bin/env node
/**
 * Phase 3 v3: 删除完全未使用的 useQuery 块
 *
 * 模式: const { data: backendData, isLoading: isBackendLoading } = useQuery({
 *   queryKey: [...],
 *   queryFn: async () => { ... },
 * });
 *
 * 当 backendData 和 isBackendLoading 都未使用时，删除整个 useQuery 调用。
 * 同时清理因此变成未使用的 useQuery 导入。
 *
 * Usage:
 *   node scripts/fix-unused-usequery.cjs [--config <path>] [--dry-run]
 *
 * Options:
 *   --config <path>  Path to targets JSON config (default: scripts/configs/fix-unused-usequery.targets.json)
 *   --dry-run        Preview changes without writing files
 */
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { config: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--config' && i + 1 < argv.length) {
      args.config = argv[++i];
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const baseDir = path.resolve(__dirname, '..', 'apps', 'web', 'src');

const defaultConfigPath = path.resolve(__dirname, 'configs', 'fix-unused-usequery.targets.json');
const configPath = args.config
  ? path.resolve(args.config)
  : defaultConfigPath;

if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  process.exit(1);
}

const targetFiles = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!Array.isArray(targetFiles)) {
  console.error('Config file must contain a JSON array of file paths');
  process.exit(1);
}

if (args.dryRun) {
  console.log(`[DRY RUN] Loaded ${targetFiles.length} target files from ${configPath}`);
  console.log(`[DRY RUN] baseDir: ${baseDir}`);
}

let totalFixed = 0;
let filesFixed = 0;
const failures = [];

for (const relPath of targetFiles) {
  const filePath = path.join(baseDir, relPath);
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    failures.push({ file: relPath, reason: 'read failed', err: e.message });
    continue;
  }

  const lines = content.split('\n');

  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/const\s*\{\s*data:\s*backendData\s*,\s*isLoading:\s*isBackendLoading\s*\}\s*=\s*useQuery\(\{/.test(lines[i])) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) continue;

  let depth = 0;
  let endIdx = -1;
  let foundOpenBrace = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') {
        depth++;
        foundOpenBrace = true;
      } else if (ch === '}') {
        depth--;
      }
    }
    if (foundOpenBrace && depth === 0 && /\}\s*\)\s*;?\s*$/.test(line)) {
      endIdx = i;
      break;
    }
    if (foundOpenBrace && depth === 0 && /^\s*\)\s*;?\s*$/.test(line) && i > startIdx) {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    failures.push({ file: relPath, reason: 'could not find end of useQuery block' });
    continue;
  }

  const removed = lines.splice(startIdx, endIdx - startIdx + 1);

  const newContent = lines.join('\n');
  if (!/useQuery/.test(newContent)) {
    const lines2 = newContent.split('\n');
    for (let i = 0; i < lines2.length; i++) {
      if (/import\s*\{[^}]*\buseQuery\b[^}]*\}\s*from\s*['"]@tanstack\/react-query['"]/.test(lines2[i])) {
        const m = lines2[i].match(/^(\s*import\s*\{)([^}]*)(\}\s*from\s*['"]@tanstack\/react-query['"]\s*;?)\s*$/);
        if (m) {
          const inner = m[2];
          const parts = inner.split(',').map(s => s.trim()).filter(s => s && s !== 'useQuery');
          if (parts.length === 0) {
            lines2.splice(i, 1);
          } else {
            lines2[i] = `${m[1]} ${parts.join(', ')} ${m[3]}`;
          }
        }
        break;
      }
    }
    const finalContent = lines2.join('\n');
    try {
      if (args.dryRun) {
        console.log(`[DRY RUN] Would fix: ${relPath} (remove useQuery block + unused import)`);
      } else {
        fs.writeFileSync(filePath, finalContent);
      }
      filesFixed++;
      totalFixed += 2;
    } catch (e) {
      failures.push({ file: relPath, reason: 'write failed', err: e.message });
    }
  } else {
    try {
      if (args.dryRun) {
        console.log(`[DRY RUN] Would fix: ${relPath} (remove useQuery block)`);
      } else {
        fs.writeFileSync(filePath, newContent);
      }
      filesFixed++;
      totalFixed += 2;
    } catch (e) {
      failures.push({ file: relPath, reason: 'write failed', err: e.message });
    }
  }
}

console.log(`Files fixed: ${filesFixed}`);
console.log(`Violations fixed (estimated): ${totalFixed}`);
console.log(`Failures: ${failures.length}`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  ' + f.file + ': ' + f.reason));
}

if (args.dryRun) {
  console.log('\n[DRY RUN] No files were modified.');
}