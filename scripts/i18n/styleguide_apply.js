#!/usr/bin/env node
/**
 * Phase-4b: UI English Style Guide 口吻一致性批量修正脚本
 * 针对 en.json 叶子字符串，按照 Style Guide §1-§5 做正则批量修正。
 * 重点覆盖：
 *  1) 驼峰+空格合并型（如 "CreateFailed" / "DeleteFailed" / "NoData" / "BasicInformation"）
 *  2) 大小写规范问题（如 "no data" → "No data"，但 "No Data" → 也统一到 "No data" [首词大写其余小写]）
 *  3) 校验错误用 "X is required" 而非 "Please input X"
 *  4) 时间 CreatedAt / UpdateTime 等 → 空格规范
 *  5) 缩写 No./Qty. 缺句点
 *  6) Toast 结果句式 CamelCase 展开（DeleteSuccess → Deleted successfully 等）
 *  7) placeholder "请输入"残留中文（需先对照 zh 才能识别，此处仅扫描空字符串占位符）
 *  8) Oxford comma（列表内 "X, Y and Z" → "X, Y, and Z"）
 *  9) XXX Date / XXX No. / XXX Qty. 结尾名词大小写规范
 * 10) 错误结果 "TODO: translate" / "EN:" 前缀残留的机器翻译痕迹（仅标记为审计告警，不替换）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const DRY_RUN = process.argv.includes('--dry-run');

// ---------- 修正规则组 ----------
// 每条规则: { id, match (regex on en leaf value), replace (function|string), category, rationale }
// 仅对字符串叶子值（非空）执行
const RULES = [
  // ========== 1. 驼峰展开（机器翻译最常见的问题：把中文空格去掉后拼 CamelCase）==========
  // 动作结果 CamelCase（CreateFailed / DeleteFailed / UpdateFailed / LoadFailed）
  {
    id: 'action-result-camelcase',
    category: '§2 Buttons & Toasts',
    rationale: 'V227 Style Guide §2：失败结果统一 "X failed"，成功 "X successfully"，空格分隔小写',
    rules: [
      [/^CreateFailed$/, 'Create failed'],
      [/^DeleteFailed$/, 'Delete failed'],
      [/^UpdateFailed$/, 'Update failed'],
      [/^LoadFailed$/, 'Load failed'],
      [/^ActionFailed$/, 'Operation failed'],
      [/^PostFailed$/, 'Post failed'],
      [/^ExportFailed$/, 'Export failed'],
      [/^ImportFailed$/, 'Import failed'],
      [/^SubmitFailed$/, 'Submit failed'],
      [/^CreateSuccess$/, 'Created successfully'],
      [/^DeleteSuccess$/, 'Deleted successfully'],
      [/^UpdateSuccess$/, 'Updated successfully'],
      [/^LoadSuccess$/, 'Loaded successfully'],
      [/^ActionSuccess$/, 'Operation succeeded'],
      [/^ActionsSuccess$/, 'Operation succeeded'],
      [/^PostSuccess$/, 'Posted successfully'],
      [/^ExportSuccess$/, 'Exported successfully'],
      [/^ImportSuccess$/, 'Imported successfully'],
      [/^SubmitSuccess$/, 'Submitted successfully'],
      [/^SaveSuccess$/, 'Saved successfully'],
    ],
  },
  // UI 常见词 CamelCase 合并型
  {
    id: 'ui-camelcase-merge',
    category: '§1 Labels & Columns',
    rationale: '标签不得使用两个词直接拼 CamelCase 代替空格',
    rules: [
      [/^AllStatus$/, 'All Statuses'],
      [/^AllType$/, 'All Types'],
      [/^AllData$/, 'All Data'],
      [/^AllTypes$/, 'All Types'], // 已对（允许但应复数）
      [/^BasicInformation$/, 'Basic Info'],
      [/^ViewDetails$/, 'View Details'],
      [/^ViewDetail$/, 'View Details'],
      [/^CreateTime$/, 'Created At'], // 旧 CreateTime 应规范为 Created At（§1 时间字段）
      [/^UpdateTime$/, 'Updated At'],
      [/^StartTime$/, 'Start Date'], // 视语境；Start Date 用在大多数中文"开始时间"
      [/^EndTime$/, 'End Date'],
      [/^ConfirmDelete$/, 'Confirm Delete'],
      [/^NoData$/, 'No data'], // §4 空态小写 data
      [/^ConfirmCancel$/, 'Confirm Cancel'],
    ],
  },

  // ========== 2. 时间/日期/列头规范 ==========
  {
    id: 'headers-capitalization',
    category: '§1 Labels & Columns',
    rationale: '§1 时间字段 Created At / Updated At 两词首字母大写 + 空格；日期 Start Date / End Date；列头实词首字母大写',
    rules: [
      [/^create time$/i, 'Created At'],
      [/^update[dt]\s*time$/i, 'Updated At'],
      [/^Creation\s+Time$/i, 'Created At'],
      [/^Updat(?:e|ed)\s+Time$/i, 'Updated At'],
      [/^Start\s+Time$/i, 'Start Date'],
      [/^End\s+Time$/i, 'End Date'],
      [/^Invoice\s+no\.?$/i, 'Invoice No.'],
      [/^Employee\s+no\.?$/i, 'Employee No.'],
      [/^Voucher\s+no\.?$/i, 'Voucher No.'],
      [/^Receivable\s+no\.?$/i, 'Receivable No.'],
      [/^Expense\s+no\.?$/i, 'Expense No.'],
      [/^Qty$/i, 'Qty.'],
      [/^Amount\(s\)$/i, 'Amount'],
      [/^Contract\s+Start\s+Date$/i, 'Contract Start Date'],
      [/^Contract\s+End\s+Date$/i, 'Contract End Date'],
      // 'StartDate' / 'EndDate' 驼峰（如果没有通过 ui-camelcase-merge 已命中的就补一次）
      [/^StartDate$/, 'Start Date'],
      [/^EndDate$/, 'End Date'],
    ],
  },

  // ========== 3. 校验错误句式修正（Please input X → "X is required"）==========
  {
    id: 'validation-sentence',
    category: '§4 Hints & Validation',
    rationale: '§4：校验错误不能用 Please input / Please enter，应直接陈述字段 + is required / is invalid',
    // 函数形式：捕获组做大写化
    custom: true,
    apply(value) {
      let v = value;
      // 中文残留 "请输入/请选择/请填写" + 英文混合的，直接改成标准句式
      v = v.replace(/^请输入\s*(.+)$/i, (_, after) => {
        const noun = capitalizeWords(after.trim());
        return `Enter ${noun}...`;
      });
      v = v.replace(/^请选择\s*(.+)$/i, (_, after) => {
        const noun = capitalizeWords(after.trim());
        return `Select ${noun}...`;
      });
      v = v.replace(/^请填写\s*(.+)$/i, (_, after) => {
        const noun = capitalizeWords(after.trim());
        return `${noun} is required`;
      });
      // Please input X... / Please enter X... / Please select X... 标准 placeholder 规范
      // placeholder → Enter / Search / Select 动词原形首字母大写 + ...省略号
      v = v.replace(/^Please input (.+)$/i, (_, m) => `Enter ${capitalizeWords(m.trim())}...`);
      v = v.replace(/^Please enter (.+)$/i, (_, m) => `Enter ${capitalizeWords(m.trim())}...`);
      v = v.replace(/^Please select (.+)$/i, (_, m) => `Select ${capitalizeWords(m.trim())}...`);
      v = v.replace(/^Please search (.+)$/i, (_, m) => `Search ${capitalizeWords(m.trim())}...`);
      // "... is required" 句式
      // "X 为必填项" 中文残留：只在残留中文的叶子上做，纯英文 leave alone
      v = v.replace(/^(.+)为必填项$/i, (_, m) => {
        // 如果 m 是中文，没被翻译——这里仅标记返回原值（不翻译）
        if (/[\u4e00-\u9fff]/.test(m)) return value;
        const noun = capitalizeWords(m.trim().replace(/[为是].*/, ''));
        return `${noun} is required`;
      });
      // "X is required" 如果主语没大写则修正
      v = v.replace(/^([a-z]\w*(?:\s+[a-z]\w+)*)\s+is\s+required$/i, (_, m) => {
        return `${capitalizeWords(m)} is required`;
      });
      return v;
    },
  },

  // ========== 4. 空态规范 ==========
  {
    id: 'empty-state-format',
    category: '§4 Empty States',
    rationale: '§4：空态统一 "No {noun}"，No 大写，名词小写首字母（普通名词）；不加标点',
    rules: [
      [/^No Data$/, 'No data'],
      [/^NoData$/, 'No data'], // 冗余，应被上面命中
      [/^No\s+data\s+yet$/i, 'No data yet'],
      [/^No\s+data\s+available$/i, 'No data'],
      [/^No\s+result$/i, 'No results'],
      [/^No\s+Records$/i, 'No records'],
      [/^No\s+employee$/i, 'No employees'],
      [/^No\s+user$/i, 'No users'],
      [/^No\s+item$/i, 'No items'],
      [/^Nothing$/i, 'No data'], // "Nothing" 太泛
      [/^N\/A$/, '—'], // N/A 在空态用 em-dash，更专业
    ],
  },

  // ========== 5. 缩写句点 ==========
  {
    id: 'abbreviation-dots',
    category: '§1 Labels & Columns',
    rationale: '§1：No. / Qty. / Dept. / Avg. / Min. / Max. / Est. 必须带句点',
    rules: [
      // 列头结尾的 Invoice No / Voucher No 要加句点
      [/(^|\s)(Invoice|Voucher|Employee|Receivable|Expense|Contract)\s+No(?!\.)\s*$/i,
        (_, sep, noun) => `${sep}${capitalizeWords(noun)} No.`],
      [/^Qty(?!\.)$/, 'Qty.'],
      [/^Dept(?!\.)$/, 'Dept.'],
      [/^Avg(?!\.)$/, 'Avg.'],
      [/^Min(?!\.)$/, 'Min.'],
      [/^Max(?!\.)$/, 'Max.'],
      [/^Est(?!\.)$/, 'Est.'],
    ],
  },

  // ========== 6. Oxford comma 追加 ==========
  {
    id: 'oxford-comma',
    category: '§5 Grammar & Format',
    rationale: '§5：A, B, and C 必须保留最后逗号；A, B and C → 补逗号',
    custom: true,
    apply(value) {
      // 仅对长度 ≥ 15 的句子做，避免误伤短列表
      if (value.length < 15) return value;
      // "X, Y and Z" → "X, Y, and Z"（双名词以上且最后缺 comma）
      let v = value;
      // 模式：两个实词 + and + 第三个，前一个是逗号+空格+词，后没加逗号
      v = v.replace(/([A-Za-z][A-Za-z]+),\s*([A-Za-z][A-Za-z]+)\s+and\s+([A-Za-z][A-Za-z]+)/g,
        (match, a, b, c) => `${a}, ${b}, and ${c}`);
      return v;
    },
  },

  // ========== 7. 机器翻译痕迹清理（仅审计标记不改，输出 audit）==========
  {
    id: 'audit-only-placeholder-residue',
    category: '§AUDIT-ONLY（不改动）',
    rationale: '残留机器翻译占位痕迹，仅审计输出为报告；暂不做自动替换',
    auditOnly: true,
    custom: true,
    apply(value, { audit, p }) {
      const patterns = [
        [/TODO:\s*translate/i, 'TODO: translate 机器翻译占位符'],
        [/^EN[:：]/, '"EN:" 前缀残留'],
        // 残留中文：整段中文 ≥ 2 个 CJK 连续 char，且不含变量插值 ${xxx}
        [/(?=.*[\u4e00-\u9fff]{2,})^[^$]*[\u4e00-\u9fff]{2,}[^$]*$/, '英文叶子中残留中文短语（非模板变量）'],
      ];
      for (const [re, note] of patterns) {
        if (re.test(value)) {
          audit.push({ rule: note, path: p, old: value });
          break;
        }
      }
      return value;
    },
  },
];

function capitalizeWords(s) {
  if (!s) return s;
  return s.replace(/\b[a-z]/g, c => c.toUpperCase());
}

// ---------- 工具 ----------
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
  const audit = [];
  const catStats = {};
  let totalChanged = 0;
  const nsNames = fs.readdirSync(EN_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  const perNs = {};

  for (const ns of nsNames) {
    const enPath = path.join(EN_DIR, ns + '.json');
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const enFlat = flatten(enObj);
    let changed = false, count = 0;

    for (const [p, val] of enFlat) {
      const v = (val || '').trim();
      if (!v) continue;
      let newVal = v;
      for (const ruleGroup of RULES) {
        if (ruleGroup.rules) {
          for (const [re, replacement] of ruleGroup.rules) {
            if (re.test(newVal)) {
              const before = newVal;
              newVal = typeof replacement === 'function' ? newVal.replace(re, replacement) : newVal.replace(re, replacement);
              if (newVal !== before && !ruleGroup.auditOnly) {
                catStats[ruleGroup.category] = (catStats[ruleGroup.category] || 0) + 1;
              }
            }
          }
        } else if (ruleGroup.custom) {
          const before = newVal;
          newVal = ruleGroup.apply(newVal, { audit, p });
          if (newVal !== before && !ruleGroup.auditOnly) {
            catStats[ruleGroup.category] = (catStats[ruleGroup.category] || 0) + 1;
          }
        }
      }
      if (newVal !== v) {
        setByPath(enNew, p, newVal);
        count++; totalChanged++; changed = true;
      }
    }

    perNs[ns] = count;
    if (changed && !DRY_RUN) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }

  // 审计报告
  const auditReport = path.join(__dirname, 'styleguide_audit_report.json');
  fs.writeFileSync(auditReport, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_changed: totalChanged,
    by_category: catStats,
    by_namespace: Object.fromEntries(Object.entries(perNs).sort((a, b) => b[1] - a[1])),
    audit_issues_total: audit.length,
    audit_issues: audit.slice(0, 200),
  }, null, 2), 'utf8');

  console.log(`[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] Style Guide 口吻修正确认完成`);
  console.log('  总修正条数        :', totalChanged);
  console.log('  按分类统计        :', JSON.stringify(catStats, null, 2).replace(/\n/g, '\n    '));
  const nsSorted = Object.entries(perNs).sort((a, b) => b[1] - a[1]);
  console.log('  Top 受影响命名空间:');
  for (const [ns, c] of nsSorted.slice(0, 15)) {
    if (c === 0) break;
    console.log(`    ${ns}: ${c}`);
  }
  console.log('  审计发现机器翻译痕迹问题数:', audit.length);
  if (audit.length) {
    console.log('  审计 Top 10 问题:');
    for (let i = 0; i < Math.min(10, audit.length); i++) {
      const a = audit[i];
      console.log(`    [${a.rule}] ${a.path}: "${a.old.slice(0, 80)}"`);
    }
  }
  console.log('\n审计报告:', auditReport);
}

main();
