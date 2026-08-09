#!/usr/bin/env node
/**
 * Probe P-07: utoipa schema vs handler signature
 *
 * Scans all svc/ .../src/ .rs files for #[utoipa::path(...)] annotations,
 * extracts method/path/request_body/params, then verifies that the handler
 * function signature immediately following the annotation matches.
 *
 * Reports mismatches:
 *   - Path param declared in utoipa but not in handler signature
 *   - request_body type doesn't match function parameter
 *   - Query param declared in utoipa but no Query extractor in handler
 *
 * Output: docs/audit/probe-p07-utoipa-schema.md
 * Exit code: 0 if no red findings, 1 if red findings exist (mismatch >= 3)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = '/Users/xingzhai/TOPEMS';
const SVC_DIR = join(ROOT, 'svc');
const OUTPUT_MD = join(ROOT, 'docs/audit/probe-p07-utoipa-schema.md');

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

function walkRs(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      results.push(...walkRs(full));
    } else if (entry.endsWith('.rs')) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Balanced bracket extraction
// ---------------------------------------------------------------------------

/**
 * Given text and the index of an opening '(' (or the char before it),
 * return the index just past the matching closing ')'.
 */
function findMatchingClose(text, openIdx, openChar = '(', closeChar = ')') {
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1; // unmatched
}

// ---------------------------------------------------------------------------
// Parse #[utoipa::path(...)] annotations
// ---------------------------------------------------------------------------

function parseUtoipaAnnotations(content, filePath) {
  const annotations = [];
  const marker = '#[utoipa::path';

  let searchFrom = 0;
  while (true) {
    const idx = content.indexOf(marker, searchFrom);
    if (idx === -1) break;

    // Find the opening '(' after the marker
    const parenIdx = content.indexOf('(', idx);
    if (parenIdx === -1) break;

    // Find the matching closing ')'
    const closeIdx = findMatchingClose(content, parenIdx);
    if (closeIdx === -1) break;

    const annotationBody = content.slice(parenIdx + 1, closeIdx - 1);
    const lineNum = content.slice(0, idx).split('\n').length;

    // Find the handler function that follows
    const afterAnnotation = content.slice(closeIdx);
    const handlerMatch = afterAnnotation.match(
      /\n\s*((?:pub\s+)?(?:async\s+)?fn\s+(\w+))/
    );

    let handlerName = null;
    let handlerSig = '';
    let isStub = false;
    if (handlerMatch) {
      handlerName = handlerMatch[2];
      // Extract the full function signature up to the opening '{'
      const sigStart = closeIdx + handlerMatch.index + 1; // +1 to skip the \n
      const braceIdx = findMatchingClose(content.slice(sigStart), content.indexOf('{', sigStart) - sigStart, '{', '}');
      // Actually, just find the first '{' after the fn keyword
      const fnText = content.slice(sigStart);
      const openBrace = fnText.indexOf('{');
      if (openBrace !== -1) {
        handlerSig = fnText.slice(0, openBrace).trim();
        // Detect stub functions: name starts with '_' and body is empty {}
        const bodyAfterBrace = fnText.slice(openBrace + 1).trimStart();
        if (handlerName.startsWith('_') && bodyAfterBrace.startsWith('}')) {
          isStub = true;
        }
      }
    }

    const parsed = parseAnnotationBody(annotationBody);

    annotations.push({
      ...parsed,
      handlerName,
      handlerSig,
      isStub,
      rawAnnotation: annotationBody,
      file: relative(ROOT, filePath),
      line: lineNum,
    });

    searchFrom = closeIdx;
  }

  return annotations;
}

/**
 * Parse the body of #[utoipa::path( ... )] to extract fields.
 */
function parseAnnotationBody(body) {
  const result = {
    method: null,
    path: null,
    tag: null,
    requestBody: null,
    pathParams: [], // [{ name, type }]
    queryParams: [], // [{ name, type }]
    responseTypes: [], // [string]
  };

  // Extract HTTP method - first positional argument (get, post, put, delete, patch)
  const methodMatch = body.match(/^\s*(get|post|put|delete|patch)\b/i);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
  }

  // Extract path = "..."
  const pathMatch = body.match(/path\s*=\s*"([^"]+)"/);
  if (pathMatch) {
    result.path = pathMatch[1];
  }

  // Extract tag = "..."
  const tagMatch = body.match(/tag\s*=\s*"([^"]+)"/);
  if (tagMatch) {
    result.tag = tagMatch[1];
  }

  // Extract request_body = Type
  // request_body = CreateProjectRequest
  // request_body = inline(CreateProjectRequest)
  // request_body = serde_json::Value
  // request_body = crate::services::AgentRequest
  const rbMatch = body.match(/request_body\s*=\s*(?:inline\()?([\w:]+)\)?/);
  if (rbMatch) {
    result.requestBody = rbMatch[1];
  }

  // Extract params(...) block
  const paramsIdx = body.indexOf('params(');
  if (paramsIdx !== -1) {
    const paramsClose = findMatchingClose(body, paramsIdx + body.slice(paramsIdx).indexOf('('));
    if (paramsClose !== -1) {
      const paramsContent = body.slice(
        paramsIdx + body.slice(paramsIdx).indexOf('(') + 1,
        paramsClose - 1
      );
      parseParamsBlock(paramsContent, result);
    }
  }

  // Extract response body types from responses(...)
  const responsesIdx = body.indexOf('responses(');
  if (responsesIdx !== -1) {
    const respParenIdx = responsesIdx + body.slice(responsesIdx).indexOf('(');
    const respClose = findMatchingClose(body, respParenIdx);
    if (respClose !== -1) {
      const respContent = body.slice(respParenIdx + 1, respClose - 1);
      // Match body = SomeType
      const bodyRegex = /body\s*=\s*([A-Za-z_][\w<>,\s\(\)::\[\]&'*]*)/g;
      let bm;
      while ((bm = bodyRegex.exec(respContent)) !== null) {
        result.responseTypes.push(bm[1].trim());
      }
    }
  }

  return result;
}

/**
 * Parse the params(...) block to extract path and query parameters.
 * Each param looks like:
 *   ("name" = Type, Path, description = "...")
 *   ("name" = Type, Query, description = "...")
 */
function parseParamsBlock(paramsContent, result) {
  // Split by top-level commas (respecting nested parens)
  const entries = splitTopLevelCommas(paramsContent);

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed.startsWith('(')) continue;

    // Find the matching close paren for this entry
    const openIdx = trimmed.indexOf('(');
    const closeIdx = findMatchingClose(trimmed, openIdx);
    if (closeIdx === -1) continue;

    const inner = trimmed.slice(openIdx + 1, closeIdx - 1);

    // Extract param name
    const nameMatch = inner.match(/"([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    // Extract type (between = and ,)
    const typeMatch = inner.match(/=\s*([^,]+)/);
    const type = typeMatch ? typeMatch[1].trim() : 'unknown';

    // Determine if Path or Query
    if (inner.includes('Path')) {
      result.pathParams.push({ name, type });
    } else if (inner.includes('Query')) {
      result.queryParams.push({ name, type });
    }
  }
}

/**
 * Split a string by top-level commas (not inside nested parens/brackets).
 */
function splitTopLevelCommas(str) {
  const parts = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth--;

    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// ---------------------------------------------------------------------------
// Parse handler function signature
// ---------------------------------------------------------------------------

function parseHandlerSignature(sig) {
  const result = {
    pathExtractors: [], // [{ rawType, innerType }]
    queryExtractor: null, // { rawType, innerType }
    jsonBodyType: null, // string
    rawParams: [],
  };

  if (!sig) return result;

  // Extract the parameter list from fn name(...) -> ...
  const parenMatch = sig.match(/\(([\s\S]*)\)\s*(?:->|$)/);
  if (!parenMatch) return result;

  const paramsStr = parenMatch[1];
  const params = splitTopLevelCommas(paramsStr);
  result.rawParams = params.map((p) => p.trim());

  for (const param of result.rawParams) {
    // Look for Path<...> extractor
    // Pattern: Path(name): Path<Type>  or  Path((id, sub)): Path<(Uuid, String)>
    const pathMatch = param.match(/Path\s*<\s*([^>]+)\s*>/);
    if (pathMatch) {
      // Could be Path<Uuid> or Path<(Uuid, String)>
      const inner = pathMatch[1].trim();
      result.pathExtractors.push({
        rawType: 'Path',
        innerType: inner,
      });
    }

    // Look for Query<...> extractor
    const queryMatch = param.match(/Query\s*<\s*([^>]+)\s*>/);
    if (queryMatch) {
      result.queryExtractor = {
        rawType: 'Query',
        innerType: queryMatch[1].trim(),
      };
    }

    // Look for Json<...> extractor (request body)
    const jsonMatch = param.match(/Json\s*<\s*([\s\S]+?)\s*>/);
    if (jsonMatch) {
      result.jsonBodyType = jsonMatch[1].trim();
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Compare utoipa annotation vs handler signature
// ---------------------------------------------------------------------------

function compareAnnotationVsHandler(ann) {
  const handler = parseHandlerSignature(ann.handlerSig);
  const mismatches = [];

  // 1. Check path params
  // utoipa declares path params -> handler should have Path<> extractor
  const utoipaPathParamCount = ann.pathParams.length;
  const handlerPathParamCount = handler.pathExtractors.length;

  if (utoipaPathParamCount > 0 && handlerPathParamCount === 0) {
    mismatches.push({
      type: 'PATH_PARAM_MISSING',
      severity: 'error',
      detail: `utoipa declares ${utoipaPathParamCount} path param(s) [${ann.pathParams.map((p) => p.name).join(', ')}] but handler has no Path<> extractor`,
    });
  }

  if (utoipaPathParamCount === 0 && handlerPathParamCount > 0) {
    mismatches.push({
      type: 'PATH_PARAM_EXTRA',
      severity: 'warn',
      detail: `handler has Path<> extractor but utoipa declares no path params`,
    });
  }

  // Check individual path param names
  // Extract path params from the path template
  const pathTemplateParams = (ann.path || '').match(/\{(\w+)\}/g);
  const pathTemplateParamNames = (pathTemplateParams || []).map((p) =>
    p.slice(1, -1)
  );

  for (const param of ann.pathParams) {
    // Check if this param name appears in the path template
    if (!pathTemplateParamNames.includes(param.name)) {
      mismatches.push({
        type: 'PATH_PARAM_NOT_IN_TEMPLATE',
        severity: 'error',
        detail: `utoipa path param "${param.name}" is not found in path template "${ann.path}"`,
      });
    }
  }

  // Check if path template has params not declared in utoipa
  for (const tplParam of pathTemplateParamNames) {
    const declared = ann.pathParams.some((p) => p.name === tplParam);
    if (!declared) {
      mismatches.push({
        type: 'PATH_PARAM_UNDECLARED',
        severity: 'warn',
        detail: `path template has "{${tplParam}}" but utoipa params() does not declare it`,
      });
    }
  }

  // 2. Check request_body vs Json<>
  if (ann.requestBody && !handler.jsonBodyType) {
    mismatches.push({
      type: 'REQUEST_BODY_MISSING',
      severity: 'error',
      detail: `utoipa declares request_body = ${ann.requestBody} but handler has no Json<> parameter`,
    });
  }

  if (!ann.requestBody && handler.jsonBodyType) {
    mismatches.push({
      type: 'REQUEST_BODY_EXTRA',
      severity: 'warn',
      detail: `handler has Json<${handler.jsonBodyType}> parameter but utoipa declares no request_body`,
    });
  }

  if (ann.requestBody && handler.jsonBodyType) {
    // Check type match (strip generics for comparison)
    const utoipaType = ann.requestBody.replace(/[<>&]/g, '').trim();
    const handlerType = handler.jsonBodyType.replace(/[<>&]/g, '').trim();

    if (utoipaType !== handlerType) {
      mismatches.push({
        type: 'REQUEST_BODY_TYPE_MISMATCH',
        severity: 'error',
        detail: `utoipa request_body = ${ann.requestBody} but handler accepts Json<${handler.jsonBodyType}>`,
      });
    }
  }

  // 3. Check query params
  if (ann.queryParams.length > 0 && !handler.queryExtractor) {
    mismatches.push({
      type: 'QUERY_PARAM_MISSING',
      severity: 'error',
      detail: `utoipa declares ${ann.queryParams.length} query param(s) [${ann.queryParams.map((p) => p.name).join(', ')}] but handler has no Query<> extractor`,
    });
  }

  return { mismatches, handler };
}

// ---------------------------------------------------------------------------
// Generate report
// ---------------------------------------------------------------------------

function generateReport(annotations, allMismatches, checkedCount, matchCount) {
  const errorCount = allMismatches.filter(
    (m) => m.mismatch.severity === 'error'
  ).length;
  const warnCount = allMismatches.filter(
    (m) => m.mismatch.severity === 'warn'
  ).length;
  const totalMismatches = allMismatches.length;
  const isRed = errorCount >= 3;

  const lines = [];
  lines.push('# Probe P-07: utoipa schema vs handler 签名一致性探针');
  lines.push('');
  lines.push('> V71 第六轮架构审计 | 自动生成 | 探针版本 v0.1.0');
  lines.push('');
  lines.push('## 摘要统计');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('|------|------|');
  lines.push(`| 扫描 .rs 文件数 | ${annotations.reduce((acc, a) => acc.add(a.file), new Set()).size} |`);
  lines.push(`| utoipa::path 注解总数 | ${checkedCount} |`);
  lines.push(`| 签名匹配数 | ${matchCount} |`);
  lines.push(`| 不匹配总数 | ${totalMismatches} |`);
  lines.push(`| - error 级 | ${errorCount} |`);
  lines.push(`| - warn 级 | ${warnCount} |`);
  lines.push(
    `| CI 严重度 | ${isRed ? 'RED (error >= 3)' : errorCount > 0 ? 'YELLOW' : 'GREEN'} |`
  );
  lines.push('');

  // Group mismatches by type
  const byType = {};
  for (const m of allMismatches) {
    const t = m.mismatch.type;
    if (!byType[t]) byType[t] = [];
    byType[t].push(m);
  }

  // Section 1: Error-level mismatches
  lines.push('## 1. Error 级不匹配（阻断级）');
  lines.push('');
  const errors = allMismatches.filter((m) => m.mismatch.severity === 'error');
  if (errors.length === 0) {
    lines.push('> 无 error 级发现。');
  } else {
    lines.push(`共 ${errors.length} 个：`);
    lines.push('');
    lines.push('| # | 类型 | 方法 | 路径 | handler | 文件 | 行号 | 详情 |');
    lines.push('|---|------|------|------|---------|------|------|------|');
    errors.forEach((m, i) => {
      lines.push(
        `| ${i + 1} | ${m.mismatch.type} | ${m.method || '-'} | \`${m.path || '-'}\` | ${m.handlerName || '-'} | ${m.file} | ${m.line} | ${m.mismatch.detail} |`
      );
    });
  }
  lines.push('');

  // Section 2: Warn-level mismatches
  lines.push('## 2. Warn 级不匹配（告警级）');
  lines.push('');
  const warns = allMismatches.filter((m) => m.mismatch.severity === 'warn');
  if (warns.length === 0) {
    lines.push('> 无 warn 级发现。');
  } else {
    lines.push(`共 ${warns.length} 个：`);
    lines.push('');
    lines.push('| # | 类型 | 方法 | 路径 | handler | 文件 | 行号 | 详情 |');
    lines.push('|---|------|------|------|---------|------|------|------|');
    warns.forEach((m, i) => {
      lines.push(
        `| ${i + 1} | ${m.mismatch.type} | ${m.method || '-'} | \`${m.path || '-'}\` | ${m.handlerName || '-'} | ${m.file} | ${m.line} | ${m.mismatch.detail} |`
      );
    });
  }
  lines.push('');

  // Section 3: All annotations checked (summary table)
  lines.push('## 3. 全部注解检查清单');
  lines.push('');
  lines.push(`共 ${checkedCount} 个 utoipa::path 注解：`);
  lines.push('');
  lines.push('| # | 方法 | 路径 | handler | request_body | pathParams | queryParams | 状态 | 文件 | 行号 |');
  lines.push('|---|------|------|---------|--------------|------------|-------------|------|------|------|');
  annotations.forEach((ann, i) => {
    const ms = allMismatches.filter(
      (m) => m.file === ann.file && m.line === ann.line
    );
    const status =
      ms.length === 0
        ? 'OK'
        : ms.some((m) => m.mismatch.severity === 'error')
          ? 'ERROR'
          : 'WARN';
    lines.push(
      `| ${i + 1} | ${ann.method || '-'} | \`${ann.path || '-'}\` | ${ann.handlerName || '-'} | ${ann.requestBody || '-'} | ${ann.pathParams.map((p) => p.name).join(', ') || '-'} | ${ann.queryParams.map((p) => p.name).join(', ') || '-'} | ${status} | ${ann.file} | ${ann.line} |`
    );
  });
  lines.push('');

  // Section 4: Mismatch type breakdown
  lines.push('## 4. 不匹配类型分布');
  lines.push('');
  if (Object.keys(byType).length === 0) {
    lines.push('> 无不匹配。');
  } else {
    lines.push('| 类型 | 数量 | 严重度 | 说明 |');
    lines.push('|------|------|--------|------|');
    const typeDescriptions = {
      PATH_PARAM_MISSING: 'utoipa 声明了路径参数但 handler 无 Path<> 提取器',
      PATH_PARAM_EXTRA: 'handler 有 Path<> 提取器但 utoipa 未声明路径参数',
      PATH_PARAM_NOT_IN_TEMPLATE: 'utoipa 声明的路径参数不在路径模板中',
      PATH_PARAM_UNDECLARED: '路径模板有参数但 utoipa params() 未声明',
      REQUEST_BODY_MISSING: 'utoipa 声明了 request_body 但 handler 无 Json<> 参数',
      REQUEST_BODY_EXTRA: 'handler 有 Json<> 参数但 utoipa 未声明 request_body',
      REQUEST_BODY_TYPE_MISMATCH: 'request_body 类型与 handler Json<> 参数类型不匹配',
      QUERY_PARAM_MISSING: 'utoipa 声明了查询参数但 handler 无 Query<> 提取器',
    };
    for (const [type, items] of Object.entries(byType)) {
      const severity = items[0].mismatch.severity;
      lines.push(
        `| ${type} | ${items.length} | ${severity} | ${typeDescriptions[type] || ''} |`
      );
    }
  }
  lines.push('');

  // Methodology
  lines.push('## 5. 方法论');
  lines.push('');
  lines.push('### 数据源');
  lines.push('- Rust 源码: `svc/*/src/**/*.rs`');
  lines.push('');
  lines.push('### 解析逻辑');
  lines.push('1. 扫描所有 `#[utoipa::path(...)]` 注解，提取 method/path/params/request_body/responses');
  lines.push('2. 定位注解后紧跟的 handler 函数签名');
  lines.push('3. 从签名中提取 `Path<>`, `Query<>`, `Json<>` 提取器类型');
  lines.push('4. 对比 utoipa 声明与 handler 签名：');
  lines.push('   - 路径参数：utoipa `params()` 中 `Path` 类型 vs handler `Path<>` 提取器');
  lines.push('   - 请求体：utoipa `request_body` vs handler `Json<>` 参数类型');
  lines.push('   - 查询参数：utoipa `params()` 中 `Query` 类型 vs handler `Query<>` 提取器');
  lines.push('   - 路径模板：`{param}` 占位符与 `params()` 声明一致性');
  lines.push('');
  lines.push('### CI 阻断规则');
  lines.push('- `error >= 3` -> RED (阻断 CI)');
  lines.push('- `0 < error < 3` -> YELLOW (告警不阻断)');
  lines.push('- `error = 0` -> GREEN');

  return { markdown: lines.join('\n'), isRed, errorCount, totalMismatches };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[P-07] utoipa schema vs handler 签名一致性探针');
  console.log('===============================================\n');

  // 1. Find all .rs files under svc/*/src/
  console.log(`[1/4] 扫描 Rust 源码: ${relative(ROOT, SVC_DIR)}`);
  const rsFiles = walkRs(SVC_DIR);
  console.log(`      -> 发现 ${rsFiles.length} 个 .rs 文件\n`);

  // 2. Parse utoipa::path annotations
  console.log('[2/4] 解析 utoipa::path 注解...');
  let allAnnotations = [];
  for (const file of rsFiles) {
    const content = readFileSync(file, 'utf-8');
    if (!content.includes('#[utoipa::path')) continue;
    const anns = parseUtoipaAnnotations(content, file);
    allAnnotations.push(...anns);
  }
  console.log(`      -> 提取 ${allAnnotations.length} 个 utoipa::path 注解\n`);

  // 3. Compare annotations vs handler signatures
  console.log('[3/4] 执行签名比对...');
  const allMismatches = [];
  let matchCount = 0;

  for (const ann of allAnnotations) {
    // Skip stub functions (placeholder functions in openapi.rs that carry utoipa annotations)
    if (ann.isStub) {
      matchCount++;
      continue;
    }
    const { mismatches } = compareAnnotationVsHandler(ann);
    if (mismatches.length === 0) {
      matchCount++;
    } else {
      for (const m of mismatches) {
        allMismatches.push({
          mismatch: m,
          file: ann.file,
          line: ann.line,
          method: ann.method,
          path: ann.path,
          handlerName: ann.handlerName,
        });
      }
    }
  }

  const errorCount = allMismatches.filter(
    (m) => m.mismatch.severity === 'error'
  ).length;
  const warnCount = allMismatches.filter(
    (m) => m.mismatch.severity === 'warn'
  ).length;
  console.log(`      -> 匹配: ${matchCount}`);
  console.log(`      -> 不匹配: ${allMismatches.length} (error: ${errorCount}, warn: ${warnCount})\n`);

  // 4. Generate report
  console.log(`[4/4] 生成报告: ${relative(ROOT, OUTPUT_MD)}`);
  const { markdown, isRed } = generateReport(
    allAnnotations,
    allMismatches,
    allAnnotations.length,
    matchCount
  );
  writeFileSync(OUTPUT_MD, markdown + '\n', 'utf-8');
  console.log(`      -> 报告已写入\n`);

  // Summary
  console.log('=== 摘要 ===');
  console.log(`扫描文件: ${rsFiles.length}`);
  console.log(`utoipa::path 注解: ${allAnnotations.length}`);
  console.log(`签名匹配: ${matchCount}`);
  console.log(`不匹配: ${allMismatches.length} (error: ${errorCount}, warn: ${warnCount})`);
  console.log(`CI 严重度: ${isRed ? 'RED' : errorCount > 0 ? 'YELLOW' : 'GREEN'}`);

  process.exit(isRed ? 1 : 0);
}

main();
