#!/usr/bin/env node
/**
 * CI 门禁：禁止仓库内出现硬编码管理员密码 / 默认弱口令常量。
 *
 * 覆盖范围（可执行代码与配置，不含文档/测试夹具）：
 *   - .sh/.bash/.zsh/.ps1/.mjs/.cjs/.js/.ts/.tsx/.jsx/.rs/.py/.toml/.yaml/.yml/.sql/.env*
 *   - 排除 node_modules / target / dist / docs / tests / e2e / __tests__ / testdata / baseline 快照；
 *   - 排除 *.test.* / *.spec.* / *_test.rs / test-*.ts / e2e*.yml（测试与 mock 夹具）；
 *   - Rust 源文件命中 `#[cfg(test)]` 后跳过其余部分（测试模块通常在文件尾部）。
 *   - 纯注释行不扫描（注释里的历史说明不构成默认口令常量）。
 *
 * 用法：
 *   node scripts/ci/check-hardcoded-passwords.mjs [--changed-only]
 * 退出码：0 通过；1 发现硬编码口令。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '../..');

const CODE_EXTENSIONS = new Set([
  '.sh', '.bash', '.zsh', '.ps1', '.mjs', '.cjs', '.js', '.ts', '.tsx', '.jsx',
  '.rs', '.py', '.toml', '.yaml', '.yml', '.sql',
]);

const EXCLUDED_SEGMENTS = new Set([
  'node_modules', 'target', 'dist', 'docs', 'tests', 'e2e', '__tests__',
  'testdata', 'test-fixtures', '.git',
]);

const RULES = [
  { id: 'weak-admin-default', re: /\badmin123\b/i },
  { id: 'weak-admin-default', re: /\bAdmin12345\b/ },
  { id: 'default-admin-password-const', re: /\b(DEFAULT_ADMIN_PASSWORD|ADMIN_DEFAULT_PASSWORD)\b/ },
  { id: 'hardcoded-admin-password', re: /\badmin[_-]?password\b\s*(?::|=)\s*["'][^"']{3,}["']/i },
];

function gitFiles(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isExcluded(path) {
  if (resolve(ROOT, path) === SCRIPT_PATH) return true;
  if (path.startsWith('database/baseline/')) return true;
  // 测试种子数据（非供给资产，且仅用于本地 test 库）
  if (path.startsWith('database/test/')) return true;

  const segments = path.split('/');
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) return true;

  const name = basename(path);
  if (/\.(test|spec)\./.test(name)) return true;
  if (name.endsWith('_test.rs') || /^test[-_]/.test(name)) return true;
  if (/^e2e.*\.(yml|yaml)$/.test(name)) return true;
  if (name.endsWith('.min.js')) return true;
  return false;
}

function isScannable(path) {
  if (isExcluded(path)) return false;
  if (basename(path).startsWith('.env')) return true;
  return CODE_EXTENSIONS.has(extname(path));
}

function isComment(line) {
  const trimmed = line.trim();
  return (
    trimmed === '' ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('<!--') ||
    trimmed.startsWith('--')
  );
}

function scanFile(path) {
  const findings = [];
  let lines;
  try {
    lines = readFileSync(resolve(ROOT, path), 'utf8').split('\n');
  } catch {
    return findings;
  }

  let inRustTestModule = false;
  lines.forEach((line, index) => {
    if (/^\s*#\[cfg\(test\)\]/.test(line) || /^\s*mod tests\s*\{/.test(line)) {
      inRustTestModule = true;
    }
    if (inRustTestModule || isComment(line)) return;

    for (const rule of RULES) {
      if (rule.re.test(line)) {
        findings.push({ path, line: index + 1, rule: rule.id });
        break;
      }
    }
  });
  return findings;
}

const changedOnly = process.argv.includes('--changed-only');
let candidates = gitFiles(['ls-files']);
if (changedOnly) {
  const staged = gitFiles(['diff', '--cached', '--name-only', '--diff-filter=ACM']);
  const unstaged = gitFiles(['diff', '--name-only', '--diff-filter=ACM']);
  candidates = [...new Set([...staged, ...unstaged])];
}

const files = candidates.filter(isScannable);
const findings = files.flatMap(scanFile);

if (findings.length > 0) {
  console.error(`[hardcoded-passwords] FAIL findings=${findings.length}`);
  for (const finding of findings) {
    console.error(`  ${finding.path}:${finding.line}  [${finding.rule}]`);
  }
  console.error('[hardcoded-passwords] 请移除硬编码口令，改用环境变量 / stdin / 随机生成。');
  process.exit(1);
}

console.log(`[hardcoded-passwords] PASS files=${files.length} mode=${changedOnly ? 'changed' : 'full'}`);
