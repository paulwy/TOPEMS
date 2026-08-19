#!/usr/bin/env node
/**
 * P2-2: Auto-generate docs/architecture/inventory.md
 *
 * Scans the codebase to produce a complete module inventory:
 *   - Backend: svc/<service>/Cargo.toml (service name, port, dependencies)
 *   - Frontend: apps/web/src/modules/<module>/config.ts (module name, routes, navItems)
 *   - Database: svc/<service>/migrations/*.sql (table count per service)
 *
 * Output: docs/architecture/inventory.md (overwrites)
 *
 * Run: node scripts/generate-inventory.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SVC_DIR = join(ROOT, 'svc');
const MODULES_DIR = join(ROOT, 'apps', 'web', 'src', 'modules');
const OUT_FILE = join(ROOT, 'docs', 'architecture', 'inventory.md');

// --- Scan backend services ---
const services = [];
if (existsSync(SVC_DIR)) {
  for (const entry of readdirSync(SVC_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const svcPath = join(SVC_DIR, entry.name);
    const cargoPath = join(svcPath, 'Cargo.toml');
    if (!existsSync(cargoPath)) continue;

    const cargo = readFileSync(cargoPath, 'utf8');
    const nameMatch = cargo.match(/^name\s*=\s*"([^"]+)"/m);
    const pkgName = nameMatch ? nameMatch[1] : entry.name;

    // Count migrations
    const mgDir = join(svcPath, 'migrations');
    let migrationCount = 0;
    if (existsSync(mgDir)) {
      migrationCount = readdirSync(mgDir).filter((f) => f.endsWith('.sql')).length;
    }

    // Count Rust source files
    let rustFileCount = 0;
    function countRust(dir) {
      try {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, e.name);
          if (e.isDirectory()) {
            if (e.name !== 'target') countRust(p);
          } else if (e.name.endsWith('.rs')) rustFileCount++;
        }
      } catch {}
    }
    countRust(join(svcPath, 'src'));

    // Extract port from main.rs or Cargo.toml
    const mainPath = join(svcPath, 'src', 'main.rs');
    let port = '?';
    if (existsSync(mainPath)) {
      const mainSrc = readFileSync(mainPath, 'utf8');
      const portMatch = mainSrc.match(/port:\s*(\d+)/);
      if (portMatch) port = portMatch[1];
    }

    services.push({
      dir: entry.name,
      pkgName,
      port,
      migrations: migrationCount,
      rustFiles: rustFileCount,
    });
  }
}

// --- Scan frontend modules ---
const frontendModules = [];
if (existsSync(MODULES_DIR)) {
  for (const entry of readdirSync(MODULES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const modPath = join(MODULES_DIR, entry.name);
    const configPath = join(modPath, 'config.ts');
    if (!existsSync(configPath)) continue;

    const config = readFileSync(configPath, 'utf8');

    // Extract module name
    const nameMatch = config.match(/name:\s*['"]([^'"]+)['"]/);
    const modName = nameMatch ? nameMatch[1] : entry.name;

    // Count routes and navItems
    const routeCount = (config.match(/path:\s*['"]/g) || []).length;
    const navItemCount = (config.match(/label:\s*['"]/g) || []).length;

    // Count .tsx files
    let tsxCount = 0;
    function countTsx(dir) {
      try {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, e.name);
          if (e.isDirectory()) countTsx(p);
          else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) tsxCount++;
        }
      } catch {}
    }
    countTsx(modPath);

    frontendModules.push({
      dir: entry.name,
      name: modName,
      routes: routeCount,
      navItems: navItemCount,
      files: tsxCount,
    });
  }
}

// --- Generate markdown ---
let md = `# TOPEMS Module Inventory

> **Auto-generated**: ${new Date().toISOString().slice(0, 10)}
> **Generator**: \`scripts/generate-inventory.mjs\`
> **Backend services**: ${services.length} | **Frontend modules**: ${frontendModules.length}

---

## Backend Services

| # | Directory | Package | Port | Migrations | Rust Files |
|---|-----------|---------|------|------------|------------|
`;

services
  .sort((a, b) => a.dir.localeCompare(b.dir))
  .forEach((s, i) => {
    md += `| ${i + 1} | ${s.dir} | ${s.pkgName} | ${s.port} | ${s.migrations} | ${s.rustFiles} |\n`;
  });

md += `
**Totals**: ${services.length} services · ${services.reduce((s, x) => s + x.migrations, 0)} migrations · ${services.reduce((s, x) => s + x.rustFiles, 0)} Rust source files

---

## Frontend Modules

| # | Directory | Module Name | Routes (path:) | NavItems (label:) | TS/TSX Files |
|---|-----------|-------------|-----------------|-------------------|--------------|
`;

frontendModules
  .sort((a, b) => a.dir.localeCompare(b.dir))
  .forEach((m, i) => {
    md += `| ${i + 1} | ${m.dir} | ${m.name} | ${m.routes} | ${m.navItems} | ${m.files} |\n`;
  });

md += `
**Totals**: ${frontendModules.length} modules · ${frontendModules.reduce((s, x) => s + x.routes, 0)} routes · ${frontendModules.reduce((s, x) => s + x.navItems, 0)} navItems · ${frontendModules.reduce((s, x) => s + x.files, 0)} TS/TSX files

---

## CI Integration

Regenerate this file with:
\`\`\`bash
node scripts/generate-inventory.mjs
\`\`\`

This file should be re-generated whenever:
- A new backend service is added under \`svc/\`
- A new frontend module is added under \`apps/web/src/modules/\`
- Migration files are added or removed
`;

writeFileSync(OUT_FILE, md);
console.log(`✅ Generated ${OUT_FILE}`);
console.log(`   Backend services: ${services.length}`);
console.log(`   Frontend modules: ${frontendModules.length}`);
console.log(`   Total migrations: ${services.reduce((s, x) => s + x.migrations, 0)}`);
console.log(`   Total Rust files: ${services.reduce((s, x) => s + x.rustFiles, 0)}`);
