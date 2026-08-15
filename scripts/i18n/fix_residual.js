#!/usr/bin/env node
/**
 * 补充修复：处理 batch_translate.js 遗漏的两类残留
 * 1. 单中文字符叶子（852 条）：如 高/低/中/借/贷/至
 * 2. EN: 前缀残留（328 条）：如 EN:已解决 / EN:确认
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');

// ---------- 1. 单中文字符术语表 ----------
const SINGLE_CHAR_MAP = {
  '高': 'High', '低': 'Low', '中': 'Medium',
  '借': 'Debit', '贷': 'Credit',
  '至': 'To', '从': 'From',
  '是': 'Yes', '否': 'No',
  '年': 'Year', '月': 'Month', '日': 'Day',
  '时': 'Hour', '分': 'Minute', '秒': 'Second',
  '个': 'Count',
  '名': 'Name',
  '类': 'Type',
  '量': 'Amount',
  '率': 'Rate',
  '比': 'Ratio',
  '值': 'Value',
  '码': 'Code',
  '号': 'No.',
  '人': 'Person',
  '员': 'Member',
  '工': 'Worker',
  '主': 'Main',
  '次': 'Sub',
  '正': 'Positive',
  '负': 'Negative',
  '增': 'Increase',
  '减': 'Decrease',
  '加': 'Add',
  '除': 'Remove',
  '乘': 'Multiply',
  '开': 'Open',
  '关': 'Close',
  '启': 'Enable',
  '停': 'Stop',
  '上': 'Up',
  '下': 'Down',
  '左': 'Left',
  '右': 'Right',
  '前': 'Previous',
  '后': 'Next',
  '内': 'In',
  '外': 'Out',
  '全': 'All',
  '空': 'Empty',
  '无': 'None',
  '有': 'Available',
  '新': 'New',
  '旧': 'Old',
  '大': 'Large',
  '小': 'Small',
  '多': 'Multiple',
  '少': 'Few',
  '好': 'Good',
  '坏': 'Bad',
  '成': 'Success',
  '败': 'Failed',
  '真': 'True',
  '假': 'False',
  '男': 'Male',
  '女': 'Female',
  '总': 'Total',
  '均': 'Average',
  '和': 'Sum',
  '差': 'Difference',
  '积': 'Product',
  '商': 'Quotient',
  '元': 'Yuan',
  '吨': 'Ton',
  '米': 'Meter',
  '克': 'Gram',
  '升': 'Liter',
  '件': 'PCS',
  '台': 'Unit',
  '套': 'Set',
  '批': 'Batch',
  '箱': 'Box',
  '包': 'Package',
  '卷': 'Roll',
  '块': 'Block',
  '片': 'Piece',
  '条': 'Strip',
  '张': 'Sheet',
  '本': 'Book',
  '页': 'Page',
  '行': 'Row',
  '列': 'Column',
  '层': 'Layer',
  '级': 'Level',
  '步': 'Step',
  '段': 'Segment',
  '期': 'Period',
  '次': 'Time',
  '回': 'Round',
  '轮': 'Cycle',
  '场': 'Session',
  '局': 'Game',
  '组': 'Group',
  '队': 'Team',
  '班': 'Shift',
  '区': 'Zone',
  '域': 'Area',
  '地': 'Location',
  '址': 'Address',
  '街': 'Street',
  '路': 'Road',
  '城': 'City',
  '省': 'Province',
  '国': 'Country',
  '区': 'Region',
  '邮': 'Postal',
  '电': 'Electric',
  '水': 'Water',
  '气': 'Gas',
  '热': 'Heat',
  '冷': 'Cold',
  '温': 'Temperature',
  '湿': 'Humidity',
  '压': 'Pressure',
  '重': 'Weight',
  '长': 'Length',
  '宽': 'Width',
  '高': 'Height',
  '深': 'Depth',
  '厚': 'Thickness',
  '径': 'Diameter',
  '角': 'Angle',
  '度': 'Degree',
  '弧': 'Arc',
  '线': 'Line',
  '面': 'Surface',
  '体': 'Body',
  '点': 'Point',
  '圆': 'Circle',
  '方': 'Square',
  '三': 'Triangle',
};

// ---------- 2. 翻译记忆（重建，用于 EN: 前缀去除后匹配）----------
function buildTM() {
  const tm = new Map();
  const nsNames = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const cjkRe = /[\u4e00-\u9fff]/;
  for (const ns of nsNames) {
    const zhObj = JSON.parse(fs.readFileSync(path.join(ZH_DIR, ns + '.json'), 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(path.join(EN_DIR, ns + '.json'), 'utf8'));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    for (const [p, zhVal] of zhFlat) {
      const zv = (zhVal || '').trim();
      if (!zv || !cjkRe.test(zv)) continue;
      const ev = (enFlat.get(p) || '').trim();
      if (!ev || cjkRe.test(ev)) continue;
      let m = tm.get(zv);
      if (!m) { m = new Map(); tm.set(zv, m); }
      m.set(ev, (m.get(ev) || 0) + 1);
    }
  }
  const tmBest = new Map();
  for (const [zh, ens] of tm) {
    const best = [...ens.entries()].sort((a, b) => b[1] - a[1])[0];
    tmBest.set(zh, best[0]);
  }
  return tmBest;
}

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

function main() {
  console.log('[1/3] 构建翻译记忆库...');
  const tm = buildTM();
  console.log('  翻译记忆条目:', tm.size);

  console.log('[2/3] 扫描残留中文叶子并修复...');
  const cjkRe = /[\u4e00-\u9fff]/;
  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));

  let totalFixed = 0;
  let tmFixed = 0;
  let singleCharFixed = 0;
  let enPrefixFixed = 0;
  let stillPending = 0;
  const pendingByNs = {};

  for (const ns of nsNames) {
    const enPath = path.join(EN_DIR, ns + '.json');
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const enFlat = flatten(enObj);
    let changed = false;

    for (const [p, val] of enFlat) {
      const v = (val || '').trim();
      if (!v || !cjkRe.test(v)) continue;

      let translated = null;

      // 1. EN: 前缀处理：去除前缀后查翻译记忆
      const enMatch = v.match(/^EN[:：]\s*(.+)$/i);
      if (enMatch) {
        const after = enMatch[1].trim();
        const tmHit = tm.get(after);
        if (tmHit) {
          translated = tmHit;
          enPrefixFixed++;
        } else if (SINGLE_CHAR_MAP[after]) {
          translated = SINGLE_CHAR_MAP[after];
          enPrefixFixed++;
        } else {
          // 尝试在翻译记忆里做子串匹配
          // 如果 after 是 "已解决"，查 tm 里 "已解决" 的翻译
          // tm 是精确匹配的，所以如果 after 在 tm 里有就命中，没有就跳过
        }
      }

      // 2. 单中文字符精确匹配
      if (!translated && SINGLE_CHAR_MAP[v]) {
        translated = SINGLE_CHAR_MAP[v];
        singleCharFixed++;
      }

      // 3. 翻译记忆精确匹配（整句，处理上次遗漏的）
      if (!translated) {
        const tmHit = tm.get(v);
        if (tmHit) {
          translated = tmHit;
          tmFixed++;
        }
      }

      // 4. 含模板变量的处理：${xxx} 前后中文部分
      if (!translated && /\$\{.*\}/.test(v)) {
        // 把 ${xxx} 替换成占位符，查翻译记忆
        const placeholder = v.replace(/\$\{[^}]+\}/g, '__VAR__');
        const tmHit = tm.get(placeholder);
        if (tmHit) {
          // 把翻译结果里的 __VAR__ 替换回原始变量
          const origVar = v.match(/\$\{[^}]+\}/);
          if (origVar) {
            translated = tmHit.replace(/__VAR__/g, origVar[0]);
          }
        }
      }

      if (translated) {
        setByPath(enNew, p, translated);
        changed = true;
        totalFixed++;
      } else {
        stillPending++;
        pendingByNs[ns] = (pendingByNs[ns] || 0) + 1;
      }
    }

    if (changed) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }

  console.log('\n========== 修复结果 ==========');
  console.log('  EN: 前缀修复      :', enPrefixFixed);
  console.log('  单中文字符修复    :', singleCharFixed);
  console.log('  翻译记忆补充修复  :', tmFixed);
  console.log('  总修复条数        :', totalFixed);
  console.log('  仍待处理          :', stillPending);
  if (stillPending > 0) {
    console.log('  按命名空间        :');
    for (const [ns, c] of Object.entries(pendingByNs).sort((a, b) => b[1] - a[1])) {
      console.log('    ' + ns + ': ' + c);
    }
  }
}

main();
