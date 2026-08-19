#!/usr/bin/env node
/**
 * V211-B2 · OpenAPI 覆盖率对照脚本
 *
 * 对照「#[utoipa::path] 宏数」vs「openapi.rs paths() 注册数」，
 * 计算每服务 OpenAPI 注解覆盖率，目标 ≥95%。
 *
 * 用法:
 *   node scripts/audit/check-openapi-coverage.mjs              # 控制台 + Markdown
 *   node scripts/audit/check-openapi-coverage.mjs --json        # 仅输出 JSON
 *   node scripts/audit/check-openapi-coverage.mjs --ci          # CI 模式（低于阈值 exit 1）
 *
 * 输出:
 *   - 控制台彩色报告
 *   - docs/audit/openapi-coverage-report.md
 *   - docs/audit/openapi-coverage-result.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.env.TOPEMS_ROOT || '/Users/air/TOPEMS';
const SVC_DIR = join(ROOT, 'svc');
const AUDIT_DIR = join(ROOT, 'docs/audit');
const MD_OUTPUT = join(AUDIT_DIR, 'openapi-coverage-report.md');
const JSON_OUTPUT = join(AUDIT_DIR, 'openapi-coverage-result.json');
const COVERAGE_THRESHOLD = 95; // %

// 四服务目标
const TARGET_SERVICES = ['erp', 'finance', 'wms', 'analytics'];

// ─── 工具函数 ───

/** 递归遍历目录，返回所有 .rs 文件路径 */
function walkRs(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkRs(full));
    } else if (extname(entry) === '.rs') {
      results.push(full);
    }
  }
  return results;
}

/** 统计文件中 #[utoipa::path(...)] 宏的数量（含跨行） */
function countUtoipaPaths(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  // 匹配 #[utoipa::path( ... )] 包括跨行
  const matches = content.matchAll(/#\[utoipa::path\s*\(/g);
  return [...matches].length;
}

/** 统计文件中 #[utoipa::path(...)] 宏的 operation_id（若有） */
function extractUtoipaPathInfo(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const infos = [];
  // 匹配整个宏块 #[utoipa::path( ... )] 跨行
  const macroRegex = /#\[utoipa::path\s*\(([\s\S]*?)\)\s*\]/g;
  let match;
  while ((match = macroRegex.exec(content)) !== null) {
    const body = match[1];
    const opIdMatch = body.match(/operation_id\s*=\s*"([^"]+)"/);
    const pathMatch = body.match(/path\s*=\s*"([^"]+)"/);
    const tagMatch = body.match(/tag\s*=\s*"([^"]+)"/);
    infos.push({
      operation_id: opIdMatch ? opIdMatch[1] : null,
      path: pathMatch ? pathMatch[1] : null,
      tag: tagMatch ? tagMatch[1] : null,
    });
  }
  return infos;
}

/** 从 openapi.rs 中提取 paths(...) 注册的条目 */
function extractRegisteredPaths(openapiRsContent) {
  // 提取 paths( ... ) 块内容（匹配到第一个 ), 结尾）
  const pathsMatch = openapiRsContent.match(/paths\s*\(([\s\S]*?)\n\s*\)/);
  if (!pathsMatch) return [];
  const block = pathsMatch[1];
  // 匹配任何形式的路径注册行：
  //   crate::modules::xxx::yyy
  //   modules::bi::xxx::yyy
  //   crate::xxx::yyy
  // 跳过注释行和空行
  const entries = [];
  const lines = block.split('\n');
  let currentGroup = null;
  for (const line of lines) {
    const trimmed = line.trim();
    // 检测注释组标题（如 // Assets）
    const commentMatch = trimmed.match(/^\/\/\s*(.+)/);
    if (commentMatch) {
      currentGroup = commentMatch[1].trim();
      continue;
    }
    // 匹配路径注册（crate:: 或 modules:: 开头，以逗号结尾）
    const pathMatch = trimmed.match(
      /^((?:crate::)?modules?::[a-zA-Z0-9_:]+::[a-zA-Z0-9_]+|crate::[a-zA-Z0-9_:]+::[a-zA-Z0-9_]+)/
    );
    if (pathMatch) {
      entries.push({
        group: currentGroup,
        path: pathMatch[1].trim(),
      });
    }
  }
  return entries;
}

// ─── 主逻辑 ───

function analyzeService(serviceName) {
  const svcPath = join(SVC_DIR, serviceName);
  if (!existsSync(svcPath)) {
    return { service: serviceName, error: `service directory not found: ${svcPath}` };
  }

  const srcDir = join(svcPath, 'src');
  const rsFiles = walkRs(srcDir);

  // 1. 统计 #[utoipa::path] 宏总数
  let annotatedCount = 0;
  const annotationDetails = [];
  for (const file of rsFiles) {
    const count = countUtoipaPaths(file);
    if (count > 0) {
      annotatedCount += count;
      const infos = extractUtoipaPathInfo(file);
      for (const info of infos) {
        annotationDetails.push({ file: relative(ROOT, file), ...info });
      }
    }
  }

  // 2. 统计 openapi.rs paths() 注册数
  //    尝试两个位置: src/openapi.rs 和 src/modules/openapi.rs
  let openapiRsPath = null;
  const candidates = [join(srcDir, 'modules', 'openapi.rs'), join(srcDir, 'openapi.rs')];
  for (const c of candidates) {
    if (existsSync(c)) {
      openapiRsPath = c;
      break;
    }
  }

  let registeredCount = 0;
  let registeredEntries = [];
  let openapiFile = null;
  if (openapiRsPath) {
    openapiFile = relative(ROOT, openapiRsPath);
    const content = readFileSync(openapiRsPath, 'utf-8');
    registeredEntries = extractRegisteredPaths(content);
    registeredCount = registeredEntries.length;
  }

  // 3. 计算覆盖率
  //    coverage = registered / annotated （注册了多少 annotated handler）
  //    如果 annotated > 0 且 registered >= annotated，coverage = min(100, ...)
  const coverage = annotatedCount > 0 ? Math.min(100, Math.round((registeredCount / annotatedCount) * 100)) : 0;

  // 4. 找出 annotated 但未 registered 的 handler
  const registeredSet = new Set(registeredEntries.map((e) => e.path.split('::').pop()));
  const unregistered = annotationDetails.filter((a) => {
    const fnName = a.operation_id;
    return fnName && !registeredSet.has(fnName);
  });

  return {
    service: serviceName,
    openapi_file: openapiFile,
    annotated_count: annotatedCount,
    registered_count: registeredCount,
    coverage_pct: coverage,
    pass: coverage >= COVERAGE_THRESHOLD,
    unregistered_count: unregistered.length,
    unregistered_sample: unregistered.slice(0, 10).map((u) => ({
      operation_id: u.operation_id,
      file: u.file,
    })),
    annotation_sample: annotationDetails.slice(0, 5).map((a) => ({
      operation_id: a.operation_id,
      path: a.path,
      tag: a.tag,
    })),
  };
}

// ─── 输出 ───

function generateMarkdown(results) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const allPass = results.every((r) => r.pass);

  let md = `# OpenAPI 覆盖率对照报告\n\n`;
  md += `> **生成时间**: ${now} | **阈值**: ≥${COVERAGE_THRESHOLD}% | **总体**: ${allPass ? '✅ PASS' : '❌ FAIL'}\n\n`;
  md += `## 四服务覆盖率总览\n\n`;
  md += `| 服务 | #[utoipa::path] 宏数 | paths() 注册数 | 覆盖率 | 状态 | 未注册数 |\n`;
  md += `|------|------:|------:|------:|:----:|------:|\n`;
  for (const r of results) {
    md += `| ${r.service} | ${r.annotated_count} | ${r.registered_count} | ${r.coverage_pct}% | ${r.pass ? '✅' : '❌'} | ${r.unregistered_count} |\n`;
  }

  md += `\n## 详细信息\n\n`;
  for (const r of results) {
    md += `### ${r.service} — ${r.coverage_pct}% ${r.pass ? '✅' : '❌'}\n\n`;
    md += `- **openapi.rs**: \`${r.openapi_file || 'N/A'}\`\n`;
    md += `- **#[utoipa::path] 宏数**: ${r.annotated_count}\n`;
    md += `- **paths() 注册数**: ${r.registered_count}\n`;
    md += `- **未注册数**: ${r.unregistered_count}\n`;
    if (r.unregistered_sample.length > 0) {
      md += `\n**未注册 handler 样本（前 10）:**\n\n`;
      md += `| operation_id | 文件 |\n|------|------|\n`;
      for (const u of r.unregistered_sample) {
        md += `| ${u.operation_id} | ${u.file} |\n`;
      }
    }
    md += `\n`;
  }

  md += `---\n\n*由 \`scripts/audit/check-openapi-coverage.mjs\` 自动生成*\n`;
  return md;
}

// ─── 入口 ───

const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const ciMode = args.includes('--ci');

const results = TARGET_SERVICES.map(analyzeService);
const allPass = results.every((r) => r.pass);
const summary = {
  generated_at: new Date().toISOString(),
  threshold_pct: COVERAGE_THRESHOLD,
  overall_pass: allPass,
  services: results,
};

if (jsonOnly) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  // 控制台输出
  console.log('\n┌─ OpenAPI 覆盖率对照 ─────────────────────────────┐');
  console.log(`│  阈值: ≥${COVERAGE_THRESHOLD}%${' '.repeat(Math.max(0, 26 - String(COVERAGE_THRESHOLD).length))}│`);
  console.log('├──────────────────────────────────────────────────┤');
  for (const r of results) {
    const status = r.pass ? '✅' : '❌';
    const line = `│  ${r.service.padEnd(10)} ${String(r.annotated_count).padStart(4)} 宏 / ${String(r.registered_count).padStart(4)} 注册 = ${String(r.coverage_pct).padStart(3)}% ${status}`;
    console.log(line.padEnd(52) + '│');
  }
  console.log('├──────────────────────────────────────────────────┤');
  console.log(`│  总体: ${allPass ? '✅ PASS' : '❌ FAIL'}${' '.repeat(allPass ? 36 : 35)}│`);
  console.log('└──────────────────────────────────────────────────┘\n');

  if (!allPass) {
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  ⚠ ${r.service}: ${r.unregistered_count} 个 handler 未注册`);
      for (const u of r.unregistered_sample.slice(0, 5)) {
        console.log(`    - ${u.operation_id} (${u.file})`);
      }
    }
  }

  // 写文件
  writeFileSync(MD_OUTPUT, generateMarkdown(results));
  writeFileSync(JSON_OUTPUT, JSON.stringify(summary, null, 2));
  console.log(`  📄 Markdown: ${relative(ROOT, MD_OUTPUT)}`);
  console.log(`  📄 JSON:     ${relative(ROOT, JSON_OUTPUT)}`);
  console.log('');
}

if (ciMode && !allPass) {
  process.exit(1);
}
