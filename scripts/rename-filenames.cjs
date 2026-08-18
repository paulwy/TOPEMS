#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'apps', 'web', 'src');
const DEFAULT_CONFIG = path.resolve(__dirname, 'configs', 'rename-filenames.default.json');

function kebabToCamel(str) {
  return str.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function renameStrategy(relPath) {
  const dir = path.dirname(relPath);
  const ext = path.extname(relPath);
  let base = path.basename(relPath, ext);

  if (base.startsWith('_')) {
    base = base.slice(1);
  } else if (base.includes('-')) {
    base = kebabToCamel(base);
  }

  return path.join(dir, base + ext);
}

function parseArgs(rawArgs) {
  const args = {
    config: null,
    stdin: false,
    reverse: false,
    phase: null,
    dryRun: false,
    help: false,
  };

  const positional = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    switch (arg) {
      case '--config':
        args.config = rawArgs[++i];
        break;
      case '--stdin':
        args.stdin = true;
        break;
      case '--reverse':
        args.reverse = true;
        break;
      case '--phase':
        args.phase = (rawArgs[++i] || '').toUpperCase();
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        positional.push(arg);
    }
  }

  return args;
}

function showHelp() {
  console.log(`
Usage: node scripts/rename-filenames.cjs [options]

Options:
  --config <path>   Load rename mappings from JSON file (default: scripts/configs/rename-filenames.default.json)
  --stdin           Read rename mappings from stdin (JSON array)
  --reverse         Swap from/to in all mappings (for rollback)
  --phase A|B|C     Run specific phase:
                      A - rewrite relative import paths only
                      B - rewrite alias (@/) import paths only
                      C - file rename only
                    Default: all three phases
  --dry-run         Preview changes without modifying files
  --help, -h        Show this help message

Examples:
  node scripts/rename-filenames.cjs --dry-run
  node scripts/rename-filenames.cjs --config custom-mappings.json --dry-run
  node scripts/rename-filenames.cjs --phase C --dry-run
  cat mappings.json | node scripts/rename-filenames.cjs --stdin --reverse --dry-run
  `);
}

function loadMappingsFromFile(configPath) {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    console.error(`ERROR: Config file not found: ${resolved}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  const mappings = JSON.parse(raw);
  validateMappings(mappings, resolved);
  return mappings;
}

function loadMappingsFromStdin() {
  return new Promise((resolve, reject) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => {
      try {
        const mappings = JSON.parse(raw);
        validateMappings(mappings, '<stdin>');
        resolve(mappings);
      } catch (e) {
        reject(new Error(`Failed to parse stdin JSON: ${e.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

function validateMappings(mappings, source) {
  if (!Array.isArray(mappings)) {
    console.error(`ERROR: Mappings must be a JSON array (source: ${source})`);
    process.exit(1);
  }
  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    if (typeof m?.from !== 'string' || typeof m?.to !== 'string') {
      console.error(`ERROR: Invalid mapping at index ${i} (source: ${source}):`, m);
      process.exit(1);
    }
  }
}

function applyReverse(mappings) {
  return mappings.map(({ from, to }) => ({ from: to, to: from }));
}

function collectTsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function rewriteImportsInFile(filePath, mappings, dryRun) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { from, to } of mappings) {
    const fromRel = './' + from;
    const fromRel2 = '../' + from;
    const toRel = './' + to;
    const toRel2 = '../' + to;

    if (content.includes(fromRel)) {
      content = content.split(fromRel).join(toRel);
      changed = true;
    }
    if (content.includes(fromRel2)) {
      content = content.split(fromRel2).join(toRel2);
      changed = true;
    }
  }

  if (changed) {
    const relPath = path.relative(ROOT, filePath);
    if (dryRun) {
      console.log(`[DRY-RUN] Would update relative imports in: ${relPath}`);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated relative imports in: ${relPath}`);
    }
  }

  return changed;
}

function rewriteAliasImportsInFile(filePath, mappings, dryRun) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { from, to } of mappings) {
    const aliasFrom = '@/' + from;
    const aliasTo = '@/' + to;

    if (content.includes(aliasFrom)) {
      content = content.split(aliasFrom).join(aliasTo);
      changed = true;
    }
  }

  if (changed) {
    const relPath = path.relative(ROOT, filePath);
    if (dryRun) {
      console.log(`[DRY-RUN] Would update alias imports in: ${relPath}`);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated alias imports in: ${relPath}`);
    }
  }

  return changed;
}

function renameFiles(mappings, dryRun) {
  let warnCount = 0;
  for (const { from, to } of mappings) {
    const fromPath = path.join(ROOT, from);
    const toPath = path.join(ROOT, to);

    if (!fs.existsSync(fromPath)) {
      console.warn(`WARN: File not found, skipping: ${from}`);
      warnCount++;
      continue;
    }

    const toDir = path.dirname(toPath);
    if (!fs.existsSync(toDir)) {
      if (dryRun) {
        console.log(`[DRY-RUN] Would create directory: ${path.relative(ROOT, toDir)}`);
      } else {
        fs.mkdirSync(toDir, { recursive: true });
      }
    }

    if (dryRun) {
      console.log(`[DRY-RUN] Would rename: ${from} -> ${to}`);
    } else {
      fs.renameSync(fromPath, toPath);
      console.log(`Renamed: ${from} -> ${to}`);
    }
  }
  if (warnCount > 0) {
    console.log(`WARN: ${warnCount} file(s) not found and skipped.`);
  }
}

function runPhaseA(mappings, dryRun, allTsFiles) {
  console.log('Phase A: Rewriting relative imports...');
  let updated = 0;
  for (const file of allTsFiles) {
    if (rewriteImportsInFile(file, mappings, dryRun)) {
      updated++;
    }
  }
  console.log(`Files with relative imports updated: ${updated}`);
  return updated;
}

function runPhaseB(mappings, dryRun, allTsFiles) {
  console.log('Phase B: Rewriting alias imports...');
  let updated = 0;
  for (const file of allTsFiles) {
    if (rewriteAliasImportsInFile(file, mappings, dryRun)) {
      updated++;
    }
  }
  console.log(`Files with alias imports updated: ${updated}`);
  return updated;
}

function runPhaseC(mappings, dryRun) {
  console.log('Phase C: Renaming files...');
  renameFiles(mappings, dryRun);
}

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2));

  if (cliArgs.help) {
    showHelp();
    process.exit(0);
  }

  let mappings;

  if (cliArgs.stdin) {
    mappings = await loadMappingsFromStdin();
  } else if (cliArgs.config) {
    mappings = loadMappingsFromFile(cliArgs.config);
  } else {
    mappings = loadMappingsFromFile(DEFAULT_CONFIG);
  }

  if (cliArgs.reverse) {
    mappings = applyReverse(mappings);
  }

  const phases = {
    A: cliArgs.phase === null || cliArgs.phase.includes('A'),
    B: cliArgs.phase === null || cliArgs.phase.includes('B'),
    C: cliArgs.phase === null || cliArgs.phase.includes('C'),
  };

  console.log(`ROOT: ${ROOT}`);
  console.log(`Mappings: ${mappings.length}`);
  console.log(`Reverse: ${cliArgs.reverse ? 'YES' : 'NO'}`);
  console.log(`Dry run: ${cliArgs.dryRun ? 'ON' : 'OFF'}`);
  console.log(`Phases: ${[phases.A ? 'A' : '', phases.B ? 'B' : '', phases.C ? 'C' : ''].filter(Boolean).join(', ')}`);
  console.log('---');

  const needFileScan = phases.A || phases.B;
  let allTsFiles = [];
  if (needFileScan) {
    allTsFiles = collectTsFiles(ROOT);
    console.log(`Found ${allTsFiles.length} .ts/.tsx files for import scanning`);
    console.log('---');
  }

  if (phases.A) {
    runPhaseA(mappings, cliArgs.dryRun, allTsFiles);
    console.log('---');
  }

  if (phases.B) {
    runPhaseB(mappings, cliArgs.dryRun, allTsFiles);
    console.log('---');
  }

  if (phases.C) {
    runPhaseC(mappings, cliArgs.dryRun);
    console.log('---');
  }

  console.log(cliArgs.dryRun ? 'Dry run complete. No changes made.' : 'Rename complete.');
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});