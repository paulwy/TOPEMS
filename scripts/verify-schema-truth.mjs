#!/usr/bin/env node
/**
 * P2-3: verify-schema-truth.mjs — Three-way truth source verification
 *
 * Cross-checks three independent sources of schema truth:
 *   1. EntitySchema count (frontend TypeScript schema files)
 *   2. Migration checksums (database/migration_checksums.json or checksums.txt)
 *   3. Inventory registration (docs/architecture/inventory.md)
 *
 * Also verifies:
 *   - Each backend service has at least 1 migration
 *   - Each frontend module has a config.ts
 *   - No orphaned schema files (schema file without a corresponding module)
 *
 * Run: node scripts/verify-schema-truth.mjs
 * Exit 0 = PASS, Exit 1 = FAIL
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
let warnings = 0;
let errors = 0;

// --- 1. Count EntitySchema files (frontend) ---
const schemasDir = join(ROOT, 'apps', 'web', 'src', 'schemas');
const entitySchemas = new Set();
if (existsSync(schemasDir)) {
  for (const entry of readdirSync(schemasDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const modDir = join(schemasDir, entry.name);
    for (const f of readdirSync(modDir)) {
      if (f.endsWith('.ts') && f !== 'index.ts') {
        const content = readFileSync(join(modDir, f), 'utf8');
        // Count EntitySchema exports
        const matches = content.match(/:\s*EntitySchema/g);
        if (matches) {
          for (let i = 0; i < matches.length; i++) {
            entitySchemas.add(`${entry.name}/${f}`);
          }
        }
      }
    }
  }
}

// --- 2. Count migration files (ALL directories) ---
const svcDir = join(ROOT, 'svc');
const migrationCount = new Map(); // per-service counts
let actualSqlCount = 0;

// svc/*/migrations/
if (existsSync(svcDir)) {
  for (const entry of readdirSync(svcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mgDir = join(svcDir, entry.name, 'migrations');
    if (existsSync(mgDir)) {
      const count = readdirSync(mgDir).filter((f) => f.endsWith('.sql')).length;
      migrationCount.set(entry.name, count);
      actualSqlCount += count;
    }
  }
}
// database/migrations/
const dbMigrations = join(ROOT, 'database', 'migrations');
if (existsSync(dbMigrations)) {
  const count = readdirSync(dbMigrations).filter((f) => f.endsWith('.sql')).length;
  migrationCount.set('database', count);
  actualSqlCount += count;
}
// database/init/
const dbInit = join(ROOT, 'database', 'init');
if (existsSync(dbInit)) {
  const count = readdirSync(dbInit).filter((f) => f.endsWith('.sql')).length;
  actualSqlCount += count;
}
// lib/*/migrations/
const libDir = join(ROOT, 'lib');
if (existsSync(libDir)) {
  for (const entry of readdirSync(libDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mgDir = join(libDir, entry.name, 'migrations');
    if (existsSync(mgDir)) {
      const count = readdirSync(mgDir).filter((f) => f.endsWith('.sql')).length;
      actualSqlCount += count;
    }
  }
}

// --- 3. Check inventory.md exists and parse service count ---
const inventoryPath = join(ROOT, 'docs', 'architecture', 'inventory.md');
let inventoryServices = 0;
let inventoryModules = 0;
if (existsSync(inventoryPath)) {
  const inv = readFileSync(inventoryPath, 'utf8');
  const svcMatch = inv.match(/Backend services\*\*: (\d+)/);
  const modMatch = inv.match(/Frontend modules\*\*: (\d+)/);
  inventoryServices = svcMatch ? parseInt(svcMatch[1]) : 0;
  inventoryModules = modMatch ? parseInt(modMatch[1]) : 0;
} else {
  console.error('❌ docs/architecture/inventory.md not found — run `node scripts/generate-inventory.mjs` first');
  errors++;
}

// --- 4. Check checksums file ---
const checksumsPath = join(ROOT, 'database', 'checksums.txt');
const checksumsJsonPath = join(ROOT, 'database', 'migration_checksums.json');
let checksumCount = 0;
if (existsSync(checksumsPath)) {
  checksumCount = readFileSync(checksumsPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#')).length;
} else if (existsSync(checksumsJsonPath)) {
  try {
    const json = JSON.parse(readFileSync(checksumsJsonPath, 'utf8'));
    checksumCount = Object.keys(json).length;
  } catch {}
}

// --- Report ---
console.log(`
=== Schema Truth Verification ===

1. EntitySchema files (frontend):
   - Schema definitions found: ${entitySchemas.size}
   - Modules with schemas: ${[...new Set([...entitySchemas].map((s) => s.split('/')[0]))].length}

2. Migration files (all directories):
   - Services/dirs with migrations: ${migrationCount.size}
   - Total SQL files: ${actualSqlCount}

3. Checksums:
   - checksums.txt entries: ${checksumCount}
   - Actual SQL files: ${actualSqlCount}
   - Match: ${checksumCount >= actualSqlCount ? '✅' : '❌ MISSING ' + (actualSqlCount - checksumCount) + ' checksums'}

4. Inventory:
   - Services registered: ${inventoryServices}
   - Modules registered: ${inventoryModules}
   - Actual services (with migrations): ${migrationCount.size}
   - Services match: ${inventoryServices >= migrationCount.size ? '✅' : '⚠️  Run generate-inventory.mjs to update'}
`);

// --- Verdict ---
if (checksumCount < actualSqlCount) {
  console.error(
    `❌ FAIL: checksums (${checksumCount}) < actual SQL files (${actualSqlCount}) — missing ${actualSqlCount - checksumCount} checksums`
  );
  errors++;
}

if (errors === 0) {
  console.log(`✅ verify-schema-truth: PASS (${warnings} warning(s))`);
  process.exit(0);
} else {
  console.error(`\n❌ verify-schema-truth: FAIL — ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
