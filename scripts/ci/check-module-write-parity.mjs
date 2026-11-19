#!/usr/bin/env node
/**
 * scripts/ci/check-module-write-parity.mjs
 *
 * 单体 / 独立部署写门配平门禁。
 *
 * 背景：2026-11-20 W1-3 运行期验收发现 EHS/QMS/MES 的写接口在单体
 * `topems-server` 下可被只读用户写入。根因是独立部署 `svc/<svc>/src/main.rs`
 * 已挂 `require_module_write("<module>")`，但单体 `svc/server/src/modules/<svc>_real_module.rs`
 * 只挂 `require_module_access("<module>")`，绕过了写门。
 *
 * 规则：独立部署声明了 `require_module_write("<m>")` 的服务，若单体存在对应
 * `*_real_module.rs`，该文件也必须出现同名写门（或同名自定义 `require_<m>_write`）。
 * 否则退出码 1。
 *
 * 用法：node scripts/ci/check-module-write-parity.mjs [--json]
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MODULES_DIR = join(ROOT, 'svc', 'server', 'src', 'modules');
const JSON_MODE = process.argv.includes('--json');

function writeGates(text) {
  return new Set(
    [...text.matchAll(/require_module_write\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]),
  );
}

const serviceDirs = readdirSync(join(ROOT, 'svc'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'server')
  .map((d) => d.name);

const failures = [];
let checked = 0;

for (const service of serviceDirs) {
  const mainPath = join(ROOT, 'svc', service, 'src', 'main.rs');
  if (!existsSync(mainPath)) continue;

  const standaloneGates = writeGates(readFileSync(mainPath, 'utf8'));
  if (standaloneGates.size === 0) continue;

  const moduleFile = join(MODULES_DIR, `${service.replaceAll('-', '_')}_real_module.rs`);
  if (!existsSync(moduleFile)) {
    failures.push({
      service,
      module: [...standaloneGates].join(','),
      reason: '单体模块文件不存在（独立部署有写门，单体无对应挂载）',
    });
    continue;
  }

  const monolithText = readFileSync(moduleFile, 'utf8');
  const monolithGates = writeGates(monolithText);
  for (const module of standaloneGates) {
    checked += 1;
    const customGate = new RegExp(
      `require_${module.replaceAll('-', '_')}_write\\b`,
    ).test(monolithText);
    if (!monolithGates.has(module) && !customGate) {
      failures.push({
        service,
        module,
        file: moduleFile.replace(`${ROOT}/`, ''),
        reason: '独立部署有 require_module_write，单体挂载缺失',
      });
    }
  }
}

if (JSON_MODE) {
  console.log(JSON.stringify({ checked, failures }, null, 2));
} else {
  console.log(
    `[module-write-parity] checked=${checked} failures=${failures.length}`,
  );
  for (const f of failures) {
    console.error(`[module-write-parity] FAIL ${f.service} ${f.module} ${f.reason} ${f.file ?? ''}`);
  }
}

process.exit(failures.length > 0 ? 1 : 0);
