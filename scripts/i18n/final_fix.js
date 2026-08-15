#!/usr/bin/env node
/**
 * 最终修复：处理 4 类残留
 * 1. 中英混杂短语（残留单字如 数/期/行/页 等）
 * 2. 路径前缀混入值（"ns.key" 格式混入 value）
 * 3. 中文标点/单位（如/按/次/秒/月 等）
 * 4. JSX 代码片段（标记为 Code Snippet 不翻译）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');

// ---------- 1. 中文残字→英文映射（用于中英混杂短语里的单字替换）----------
const CHAR_MAP = {
  '数': 'Count', '期': 'Period', '行': 'Line', '页': 'Page',
  '个': 'Items', '条': 'Records', '名': 'Members',
  '量': 'Amount', '率': 'Rate', '比': 'Ratio',
  '类': 'Type', '级': 'Level', '层': 'Layer',
  '表': 'Table', '图': 'Chart', '树': 'Tree',
  '值': 'Value', '码': 'Code', '号': 'No.',
  '人': 'Person', '员': 'Member', '工': 'Worker',
  '组': 'Group', '队': 'Team', '班': 'Shift',
  '区': 'Zone', '域': 'Area', '地': 'Location',
  '年': 'Year', '月': 'Month', '日': 'Day',
  '时': 'Hour', '分': 'Minute', '秒': 'Seconds',
  '次': 'times', '回': 'Round', '轮': 'Cycle',
  '批': 'Batch', '套': 'Set', '件': 'PCS',
  '台': 'Unit', '箱': 'Box', '包': 'Package',
  '吨': 'Ton', '米': 'Meter', '克': 'Gram',
  '升': 'Liter', '元': 'Yuan',
  '高': 'High', '低': 'Low', '中': 'Medium',
  '大': 'Large', '小': 'Small', '多': 'Multiple', '少': 'Few',
  '上': 'Up', '下': 'Down', '前': 'Previous', '后': 'Next',
  '内': 'In', '外': 'Out', '全': 'All', '空': 'Empty',
  '无': 'None', '有': 'Available', '新': 'New', '旧': 'Old',
  '总': 'Total', '均': 'Average', '和': 'Sum',
  '正': 'Positive', '负': 'Negative',
  '增': 'Increase', '减': 'Decrease',
  '开': 'Open', '关': 'Close', '启': 'Enable', '停': 'Stop',
  '是': 'Yes', '否': 'No', '真': 'True', '假': 'False',
  '男': 'Male', '女': 'Female',
  '借': 'Debit', '贷': 'Credit',
  '至': 'To', '从': 'From',
  '主': 'Main', '次': 'Sub',
  '好': 'Good', '坏': 'Bad',
  '成': 'Success', '败': 'Failed',
  '重': 'Weight', '长': 'Length', '宽': 'Width',
  '深': 'Depth', '厚': 'Thickness',
  '线': 'Line', '面': 'Surface', '体': 'Body', '点': 'Point',
  '圆': 'Circle', '方': 'Square',
};

// ---------- 2. 中文短语→英文映射 ----------
const PHRASE_MAP = {
  '如:': 'e.g.:', '例如:': 'e.g.:', '例如': 'e.g.',
  '按': 'By', '每': 'Per',
  '共': 'Total', '合计': 'Total',
  '待': 'Pending',
  '已': '',
  '未': 'Not',
  '非': 'Non-',
  '其他': 'Other', '其它': 'Other',
  '所有': 'All',
  '当前': 'Current',
  '历史': 'History',
  '相关': 'Related',
  '可用': 'Available',
  '不可用': 'Unavailable',
  '成功': 'Success',
  '失败': 'Failed',
  '错误': 'Error',
  '警告': 'Warning',
  '信息': 'Info',
  '确认': 'Confirm',
  '取消': 'Cancel',
  '保存': 'Save',
  '删除': 'Delete',
  '编辑': 'Edit',
  '查看': 'View',
  '搜索': 'Search',
  '加载': 'Loading',
  '导出': 'Export',
  '导入': 'Import',
  '提交': 'Submit',
  '重置': 'Reset',
  '刷新': 'Refresh',
  '返回': 'Back',
  '下一步': 'Next',
  '上一步': 'Previous',
  '完成': 'Complete',
  '关闭': 'Close',
  '打开': 'Open',
  '启用': 'Enable',
  '禁用': 'Disable',
  '添加': 'Add',
  '移除': 'Remove',
  '上传': 'Upload',
  '下载': 'Download',
  '复制': 'Copy',
  '粘贴': 'Paste',
  '剪切': 'Cut',
  '全选': 'Select All',
  '清空': 'Clear',
  '打印': 'Print',
  '预览': 'Preview',
  '展开': 'Expand',
  '折叠': 'Collapse',
  '排序': 'Sort',
  '过滤': 'Filter',
  '分组': 'Group',
  '统计': 'Statistics',
};

function flatten(obj, prefix = '', out = new Map()) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else if (typeof v === 'string') out.set(p, v);
  }
  return out;
}
function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function fixValue(v) {
  let result = v;
  const cjkRe = /[\u4e00-\u9fff]/;

  // 0. JSX 代码片段检测：含 </ 或 /> 或 \n  > 的多行代码
  if (/(<\/|\/>|\n\s*>)/.test(result) && result.length > 50) {
    // 这是 JSX 代码片段，不翻译，标记为 [Code Snippet]
    return null; // 返回 null 表示跳过
  }

  // 1. 路径前缀混入值检测：值以 "xxx." 开头且后面有中文
  const prefixMatch = result.match(/^([a-z_]+)\.([\s\S]+)$/);
  if (prefixMatch && cjkRe.test(prefixMatch[2])) {
    // 去掉路径前缀，只处理后面的值
    result = prefixMatch[2];
  }

  // 2. 中文短语替换（长词优先）
  const sortedPhrases = Object.keys(PHRASE_MAP).sort((a, b) => b.length - a.length);
  for (const zh of sortedPhrases) {
    if (result.includes(zh)) {
      result = result.split(zh).join(PHRASE_MAP[zh]);
    }
  }

  // 3. 中文单字替换（仅替换残留的中文字符）
  // 找到所有中文字符，逐个替换
  const cjkChars = [...result.matchAll(/[\u4e00-\u9fff]/g)];
  for (const m of cjkChars) {
    const ch = m[0];
    if (CHAR_MAP[ch]) {
      result = result.split(ch).join(CHAR_MAP[ch]);
    }
  }

  // 4. 清理多余空格
  result = result.replace(/\s+/g, ' ').trim();

  // 5. 如果仍有中文，返回 null（无法自动修复）
  if (cjkRe.test(result)) {
    return null;
  }

  return result;
}

function main() {
  const cjkRe = /[\u4e00-\u9fff]/;
  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

  let totalFixed = 0;
  let skippedJSX = 0;
  let stillPending = 0;
  const pendingByNs = {};
  const pendingSamples = [];

  for (const ns of nsNames) {
    const enPath = path.join(EN_DIR, ns + '.json');
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const enFlat = flatten(enObj);
    let changed = false;

    for (const [p, val] of enFlat) {
      const v = (val || '').trim();
      if (!v || !cjkRe.test(v)) continue;

      const fixed = fixValue(v);
      if (fixed === null) {
        // JSX 代码或无法修复
        if (/(<\/|\/>|\n\s*>)/.test(v) && v.length > 50) {
          skippedJSX++;
        } else {
          stillPending++;
          pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
          if (pendingSamples.length < 20) pendingSamples.push({ ns, p, v });
        }
        continue;
      }

      setByPath(enNew, p, fixed);
      changed = true;
      totalFixed++;
    }

    if (changed) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }

  console.log('========== 最终修复结果 ==========');
  console.log('  修复条数          :', totalFixed);
  console.log('  跳过（JSX 代码）  :', skippedJSX);
  console.log('  仍待处理          :', stillPending);
  if (stillPending > 0) {
    console.log('  按命名空间        :');
    for (const [ns, c] of Object.entries(pendingByNs).sort((a, b) => b[1] - a[1])) {
      console.log('    ' + ns + ': ' + c);
    }
    console.log('  样本              :');
    for (const s of pendingSamples) {
      console.log('    [' + s.ns + '.' + s.p + '] ' + JSON.stringify(s.v.slice(0, 80)));
    }
  }
}

main();
