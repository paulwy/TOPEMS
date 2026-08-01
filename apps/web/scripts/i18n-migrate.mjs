#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const projectRoot = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const CHINESE_RE = /[\u4e00-\u9fff]/;

function sanitizeKey(text) {
  const map = {
    '基本': 'basic', '信息': 'info', '项目': 'project', '名称': 'name',
    '描述': 'desc', '负责人': 'manager', '配置': 'config', '团队': 'team',
    '优先级': 'priority', '时间': 'time', '计划': 'plan', '日期': 'date',
    '开始': 'start', '结束': 'end', '预算': 'budget', '确认': 'confirm',
    '填写': 'fill', '选择': 'select', '设置': 'set', '创建': 'create',
    '成功': 'success', '失败': 'fail', '请': '', '输入': 'input',
    '请输入': 'input', '可选': 'optional', '后续': 'later', '修改': 'modify',
    '张三': 'zhangsan', '李四': 'lisi', '王五': 'wangwu', '紧急': 'urgent',
    '高': 'high', '中': 'medium', '低': 'low', '搜索': 'search',
    '模板': 'template', '类型': 'type', '标签': 'tags', '税率': 'tax_rate',
    '返回': 'back', '列表': 'list', '全局': 'global', '报表': 'report',
    '删除': 'delete', '样品': 'sample', '检验': 'inspection', '任务': 'task',
    '统计': 'stats', '加载': 'loading', '取消': 'cancel', '保存': 'save',
    '测试': 'test', '进行': 'in_progress', '首页': 'home', '流程': 'process',
    '检测': 'detection', '方法': 'method', '条码': 'barcode', '扫描': 'scan',
    '正常': 'normal', '打印': 'printed', '已': '', '停用': 'disabled',
    '登记': 'register', '接收': 'receive', '总数': 'total', '部门': 'dept',
    '员工': 'employee', '考勤': 'attendance', '采购': 'purchase',
    '申请': 'request', '供应商': 'supplier', '价格': 'price', '对比': 'comparison',
    '物料': 'material', 'BOM': 'bom', '工艺': 'process', '路线': 'route',
    '质量': 'quality', '控制': 'control', '检查': 'check', '管理': 'manage',
    '不合格': 'nonconformance', '审核': 'audit', '文档': 'document',
    '产品': 'product', '发布': 'release', '财务': 'finance', '凭证': 'voucher',
    '账簿': 'ledger', '资产': 'asset', 'EHS': 'ehs', '计划': 'plan',
    '事故': 'accident', '演练': 'drill', 'GIS': 'gis', '追踪': 'tracking',
    '围栏': 'fence', '分析': 'analytics', '模块': 'module', '详情': 'detail',
  };
  
  let key = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c >= '\u4e00' && c <= '\u9fff') {
      const twoChar = text.substring(i, i + 2);
      key += map[twoChar] || map[c] || c;
    } else {
      key += c;
    }
  }
  
  return key
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '')
    .toLowerCase().slice(0, 40);
}

function fileNameToPrefix(filePath) {
  const basename = path.basename(filePath, '.tsx');
  return basename.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function addImportAndHook(content, moduleName) {
  const importLine = "import { useTranslation } from 'react-i18next';";
  if (!content.includes(importLine)) {
    const reactMatch = content.match(/^import React[^;]*;/m);
    if (reactMatch) {
      content = content.replace(reactMatch[0], `${reactMatch[0]}\n${importLine}`);
    } else {
      const allImports = [...content.matchAll(/^import .+;/gm)];
      if (allImports.length > 0) {
        const last = allImports[allImports.length - 1];
        const pos = last.index + last[0].length;
        content = content.slice(0, pos) + '\n' + importLine + content.slice(pos);
      }
    }
  }

  if (!/const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation/.test(content)) {
    const patterns = [
      /export\s+const\s+(\w+)\s*(?::\s*React\.FC(?:<[^>]*>)?)?\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*(?::\s*[^=)]+)?\s*=>\s*\{/,
      /export\s+function\s+(\w+)\s*\([^)]*\)\s*\{/,
    ];
    for (const pat of patterns) {
      const m = pat.exec(content);
      if (m) {
        const bodyStart = m.index + m[0].length;
        const hookLine = `  const { t } = useTranslation('${moduleName}');\n`;
        content = content.slice(0, bodyStart) + '\n' + hookLine + content.slice(bodyStart);
        break;
      }
    }
  }

  return content;
}

function processFile(filePath, moduleName) {
  const relPath = path.relative(projectRoot, filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!CHINESE_RE.test(content)) return null;

  const prefix = fileNameToPrefix(filePath);
  const newKeys = {};
  const replacements = [];

  content = addImportAndHook(content, moduleName);

  const stringPatterns = [
    { re: /'([^'\n]*[\u4e00-\u9fff][^'\n]*)'/g },
    { re: /"([^"\n]*[\u4e00-\u9fff][^"\n]*)"/g },
  ];

  for (const { re } of stringPatterns) {
    for (const m of content.matchAll(re)) {
      const fullMatch = m[0];
      const text = m[1];
      if (!CHINESE_RE.test(text)) continue;
      if (text.startsWith('//') || text.startsWith('*')) continue;
      if (text.includes('${') || text.includes('{') || text.includes('}')) continue;
      if (text.length < 1) continue;
      if (/useTranslation|i18n|locales/.test(text)) continue;

      const matchStart = m.index;
      const key = `${prefix}.${sanitizeKey(text)}`;
      newKeys[key] = text;
      replacements.push({ fullMatch, key, matchStart });
    }
  }

  if (replacements.length === 0) return null;

  replacements.sort((a, b) => b.matchStart - a.matchStart);
  for (const rep of replacements) {
    const before = content.slice(Math.max(0, rep.matchStart - 5), rep.matchStart);
    const isJsxAttr = /=\s*$/.test(before);
    const replacement = isJsxAttr ? `{t('${rep.key}')}` : `t('${rep.key}')`;
    content = content.slice(0, rep.matchStart) + replacement + content.slice(rep.matchStart + rep.fullMatch.length);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { file: relPath, count: replacements.length, newKeys };
}

function processModule(moduleName) {
  const modulePath = path.join(projectRoot, 'src', 'pages', moduleName);
  if (!fs.existsSync(modulePath)) {
    console.log(`  [SKIP] ${moduleName}: 目录不存在`);
    return null;
  }

  console.log(`\n--- ${moduleName} ---`);
  const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.tsx'));
  let totalCount = 0;
  const processedFiles = [];
  const allKeys = {};

  for (const file of files) {
    const filePath = path.join(modulePath, file);
    const result = processFile(filePath, moduleName);
    if (result) {
      console.log(`  ${result.file}: ${result.count} 处`);
      totalCount += result.count;
      processedFiles.push(result.file);
      Object.assign(allKeys, result.newKeys);
    }
  }

  if (Object.keys(allKeys).length > 0) {
    const localesDir = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh');
    if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir, { recursive: true });
    const localeFile = path.join(localesDir, `${moduleName}.json`);
    let localeContent = {};
    if (fs.existsSync(localeFile)) {
      localeContent = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));
    }
    Object.assign(localeContent, allKeys);
    fs.writeFileSync(localeFile, JSON.stringify(localeContent, null, 2), 'utf-8');
  }

  return { moduleName, files: processedFiles, count: totalCount };
}

function main() {
  const targetModules = process.argv.slice(2);
  const pagesDir = path.join(projectRoot, 'src', 'pages');
  const allModules = [];
  if (fs.existsSync(pagesDir)) {
    const entries = fs.readdirSync(pagesDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('_')) {
        allModules.push(e.name);
      }
    }
  }

  const modules = targetModules.length > 0 ? targetModules : allModules;
  console.log(`=== TOPEMS i18n 迁移工具 ===`);
  console.log(`模块: ${modules.join(', ')}`);

  let grandTotal = 0;
  const results = [];

  for (const moduleName of modules) {
    const result = processModule(moduleName);
    if (result) {
      grandTotal += result.count;
      results.push(result);
    }
  }

  console.log(`\n总计: ${results.reduce((acc, r) => acc + r.files.length, 0)} 文件, ${grandTotal} 处`);
}

main();
