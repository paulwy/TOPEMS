import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 全库 schema 列渲染签名护栏（2026-11-27）
 *
 * `toColumnDef` 用 `function.length` 判定语义：单参 → 值渲染器（参数=单元格值），
 * 双参 → 行渲染器（参数=整行）。按「行」书写却只声明一个参数的渲染器
 * 拿到的其实是单元格值，`row.xxx` 全部读空，界面表现为空字段 / Invalid Date。
 * 这类写法曾在 400+ 处存在，此处做源码级扫描，禁止回潮。
 */

const SCHEMA_DIR = join(process.cwd(), 'src', 'schemas');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

/** 从 startIndex 处的 '(' 开始，取出括号内的参数串（跳过 <> 内的逗号） */
function paramListAt(src: string, openIdx: number): string | null {
  let depth = 0;
  let angle = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '<') angle++;
    else if (ch === '>') angle = Math.max(0, angle - 1);
    else if (angle === 0 && ch === '(') depth++;
    else if (angle === 0 && ch === ')') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return null;
}

/** 按顶层逗号切分参数（忽略 <> 与嵌套括号里的逗号） */
function paramCount(params: string): number {
  const trimmed = params.trim();
  if (!trimmed) return 0;
  let angle = 0;
  let paren = 0;
  let count = 1;
  for (const ch of trimmed) {
    if (ch === '<') angle++;
    else if (ch === '>') angle = Math.max(0, angle - 1);
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === ',' && angle === 0 && paren === 0) count++;
  }
  return count;
}

describe('schema renderCell 参数个数', () => {
  const files = walk(SCHEMA_DIR);

  it('扫描到 schema 文件', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('首参名为 row 的 renderCell 必须声明第二个参数', () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf-8');
      let idx = src.indexOf('renderCell:');
      while (idx !== -1) {
        const open = src.indexOf('(', idx);
        const params = open === -1 ? null : paramListAt(src, open);
        if (params !== null) {
          const first = params.trim();
          // 值渲染器写作 (value ...)，不在本规则约束内
          if (/^row\b/.test(first) && paramCount(params) < 2) {
            const line = src.slice(0, idx).split('\n').length;
            violations.push(`${file.split(/[/\\]/).slice(-2).join('/')}:${line} → (${params.trim()})`);
          }
        }
        idx = src.indexOf('renderCell:', idx + 1);
      }
    }
    expect(violations).toEqual([]);
  });
});
