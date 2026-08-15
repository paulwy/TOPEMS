#!/usr/bin/env node
/**
 * Phase-3a: Finance 专业术语精修
 * 用"精确 path 映射 + zh 精确匹配 术语表（Finance 专用）"的双重方式，
 * 对 finance.json + vouchers/receivables/payables/periods/balances/reconciliation/expenses/budgets/invoice 子对象做精修。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EN_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const ZH_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'zh');
const DRY_RUN = process.argv.includes('--dry-run');

// ---------- 1. Finance 专用术语表（zh 精确匹配）----------
// 列格式: [zh, standard_en, note/rationale]
const FINANCE_TERMS = [
  // --- 发票类（国标惯例：类别在前 Special VAT / General VAT；行业对照：金蝶 / QuickBooks 中国版）---
  ['增值税专用发票', 'Special VAT Invoice', '国标译法：Special VAT Invoice（类别在前），行业主流替代 VAT Specialized Invoice；旧译 "VAT Special Invoice" 顺序非标准'],
  ['增值税普通发票', 'General VAT Invoice', '与 Special VAT Invoice 对称，类别在前 General'],
  ['增值税电子普通发票', 'Electronic General VAT Invoice', '电子在前'],
  ['增值税专用电子发票', 'Electronic Special VAT Invoice', ''],
  ['电子发票', 'Electronic Invoice', ''],
  ['红字发票', 'Red-letter Invoice', '会计标准译法红冲发票用 Red-letter'],
  ['发票代码', 'Invoice Code', ''],
  ['发票号码', 'Invoice No.', ''],
  ['开票日期', 'Invoice Date', ''],
  ['销售方', 'Seller', '会计语境用 Seller / Buyer（Sales/Party 更口语）'],
  ['购买方', 'Buyer', ''],
  ['价税合计', 'Total (Tax Inclusive)', '比简单 Total Amount 更明确，明确含税款'],
  ['不含税金额', 'Amount (Exclusive of Tax)', ''],
  ['税额', 'Tax Amount', ''],
  ['税率', 'Tax Rate', ''],
  ['认证相符', 'Certified & Matched', ''],

  // --- 科目 / 报表标准译法 ---
  ['累计折旧', 'Accumulated Depreciation', '标准财务译法：Accumulated（累积），首字母大写与科目一致；与 Depreciation 有明确区别'],
  ['累计摊销', 'Accumulated Amortization', ''],
  ['固定资产', 'Fixed Assets', ''],
  ['无形资产', 'Intangible Assets', ''],
  ['流动资产', 'Current Assets', ''],
  ['流动负债', 'Current Liabilities', ''],
  ['长期待摊费用', 'Long-term Prepaid Expenses', ''],
  ['实收资本', 'Paid-in Capital', ''],
  ['资本公积', 'Capital Reserve', ''],
  ['盈余公积', 'Surplus Reserve', ''],
  ['未分配利润', 'Retained Earnings', ''],
  ['主营业务收入', 'Operating Revenue', ''],
  ['其他业务收入', 'Other Operating Revenue', ''],
  ['营业外收入', 'Non-operating Income', ''],
  ['主营业务成本', 'Cost of Goods Sold (COGS)', ''],
  ['资产减值损失', 'Asset Impairment Loss', ''],
  ['公允价值变动损益', 'Fair Value Change Gain/Loss', ''],
  ['资产负债表', 'Balance Sheet', ''],
  ['利润表', 'Income Statement', ''],
  ['现金流量表', 'Cash Flow Statement', ''],
  ['所有者权益变动表', 'Statement of Changes in Equity', ''],
  ['合并资产负债表', 'Consolidated Balance Sheet', ''],
  ['合并利润表', 'Consolidated Income Statement', ''],
  ['合并现金流量表', 'Consolidated Cash Flow Statement', ''],
  ['试算平衡表', 'Trial Balance', ''],
  ['科目余额表', 'Account Balance Report', ''],

  // --- 凭证 / 期间 / 结算 ---
  ['转账凭证', 'Transfer Voucher', '原有正确，此处加 allowed alias 允许'],
  ['付款凭证', 'Payment Voucher', ''],
  ['收款凭证', 'Receipt Voucher', ''],
  ['通用凭证', 'General Journal Voucher', '原有 General Voucher 不够规范；General Journal Voucher 更符合会计通用凭证'],
  ['记账凭证', 'Journal Voucher', '原有 Voucher Posted 里的 Posted 是状态（已过账），此处记账凭证是单据类型 Journal Voucher'],
  ['凭证过账', 'Post Voucher', ''],
  ['凭证审核', 'Review Voucher', ''],
  ['反过账', 'Unpost Voucher', '反过账：取消过账 → Unpost（行业标准）'],
  ['反审核', 'Unreview Voucher', ''],
  ['作废凭证', 'Void Voucher', '会计作废用 Void 比 Cancel 更专业'],
  ['期间损益结转', 'Period P/L Carry-forward', ''],
  ['年末结转', 'Year-end Closing', ''],
  ['期初余额', 'Opening Balance', ''],
  ['期末余额', 'Closing Balance', ''],
  ['本期发生额', 'Current Period Movement', ''],
  ['本年累计', 'Year-to-date (YTD)', ''],
  ['账龄分析', 'Aging Analysis', '原有正确'],
  ['坏账准备', 'Allowance for Doubtful Accounts', ''],

  // --- 对账 / 应收应付 ---
  ['银行对账', 'Bank Reconciliation', ''],
  ['往来对账', 'Intercompany Reconciliation', ''],
  ['内部对账', 'Internal Reconciliation', ''],
  ['账面余额', 'Book Balance', ''],
  ['对账单余额', 'Statement Balance', ''],
  ['应收账款', 'Accounts Receivable', '原有正确'],
  ['应付账款', 'Accounts Payable', '原有正确'],
  ['应收票据', 'Notes Receivable', ''],
  ['应付票据', 'Notes Payable', ''],
  ['预收账款', 'Unearned Revenue', ''],
  ['预付账款', 'Prepaid Expenses', ''],
  ['其他应收款', 'Other Receivables', ''],
  ['其他应付款', 'Other Payables', ''],
  ['账龄', 'Aging', ''],

  // --- 税务 / 成本 ---
  ['应税收入', 'Taxable Revenue', '原有 Taxable Income 是所得税口径，Taxable Revenue 是增值税口径'],
  ['进项税额', 'Input VAT', ''],
  ['销项税额', 'Output VAT', ''],
  ['进项税额转出', 'Input VAT Transfer-out', ''],
  ['应交增值税', 'VAT Payable', ''],
  ['销项税转出', 'Output VAT Transfer-out', ''],
  ['成本中心', 'Cost Center', ''],
  ['利润中心', 'Profit Center', ''],
  ['成本核算', 'Cost Accounting', ''],
  ['成本对象', 'Cost Object', ''],
  ['作业成本法', 'Activity-based Costing (ABC)', ''],

  // --- 固定资产 ---
  ['固定资产卡片', 'Fixed Asset Card', ''],
  ['折旧方法', 'Depreciation Method', ''],
  ['残值率', 'Residual Value Rate', ''],
  ['预计净残值', 'Estimated Net Residual Value', ''],
  ['折旧年限', 'Useful Life (Years)', ''],
  ['计提折旧', 'Charge Depreciation', '原有 Create a Depreciation 不专业，Charge/Accrue Depreciation'],
  ['资产处置', 'Asset Disposal', ''],
  ['资产报废', 'Asset Retirement', ''],
  ['资产减值', 'Asset Impairment', ''],
  ['在建工程', 'Construction in Progress (CIP)', ''],
];

// ---------- 2. Finance 路径级精修（按 path 精确匹配，用于句式类修正，如逗号列表 Oxford comma）----------
// [namespace, dot_path_within_ns, target_new_en]
const PATH_PATCHES = [
  // vouchers.title / vouchers.* 长句加 Oxford comma（风格化）
  // 具体路径从 spot-check 中抽取
  ['finance', 'fixed_asset.k1',
    'Manage enterprise fixed assets including acquisition, depreciation, disposal, and full lifecycle',
    'Manage enterprise fixed assets including acquisition, depreciation, disposal, and full lifecycle'],
  // 累计折旧借方账户的大写一致性（finance.finance_asset_page.e9）
  ['finance', 'finance_asset_page.e9',
    'This operation will create a depreciation voucher with accumulated depreciation account as debit and the asset account as credit.',
    'This operation will create a depreciation voucher with Accumulated Depreciation account as the debit and the asset account as the credit.'],
];

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
  const zhTermMap = new Map(FINANCE_TERMS.map(([zh, en, note]) => [zh, { en, note }]));

  const nsNames = ['finance'];
  // finance.json 本身包含 vouchers/receivables/payables/periods/balances/reconciliation/expenses/budgets/invoice/tax 全部 key 段
  // 另外顶层还有 vouchers.json / receivables.json 等命名空间，也需要处理
  const allNs = fs.readdirSync(ZH_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  // 只对 Finance 领域相关的命名空间做替换：finance + vouchers + receivables + payables + reconciliation + periods + balances + expenses + budgets + invoice（若存在）
  const financeNs = allNs.filter(n => /^(finance|voucher|receivable|payable|reconcili|period|balanc|expense|budget|invoic|tax|asset|ledger|depreciat|consolidat)/i.test(n));

  let totalReplacements = 0;
  const termHits = new Map(); // zh_term -> count
  const perNs = {};

  for (const ns of financeNs) {
    const zhPath = path.join(ZH_DIR, ns + '.json');
    const enPath = path.join(EN_DIR, ns + '.json');
    if (!fs.existsSync(zhPath) || !fs.existsSync(enPath)) continue;
    const zhObj = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enNew = JSON.parse(JSON.stringify(enObj));
    const zhFlat = flatten(zhObj);
    const enFlat = flatten(enObj);
    let changed = false;
    let nsCount = 0;
    const samples = [];

    for (const [p, zv] of zhFlat) {
      const zh = (zv || '').trim();
      if (!zh) continue;
      // --- 术语表精确匹配：zh 整句 = 术语 时 替换（避免子串误伤）---
      const te = zhTermMap.get(zh);
      if (te) {
        const cur = (enFlat.get(p) || '').trim();
        if (cur && cur !== te.en) {
          // 不做大小写差异替换（比如原有 Special VAT Invoice 首字母大写正确就不动）
          if (cur.toLowerCase() === te.en.toLowerCase()) continue;
          setByPath(enNew, p, te.en);
          changed = true; nsCount++; totalReplacements++;
          termHits.set(zh, (termHits.get(zh) || 0) + 1);
          if (samples.length < 5) samples.push({ p, old: cur, new: te.en });
        }
      }
    }

    // --- PATH_PATCHES 路径级补丁 ---
    for (const [patNs, patPath, , newEn] of PATH_PATCHES) {
      if (patNs !== ns) continue;
      const cur = enFlat.get(patPath);
      if (cur && cur !== newEn) {
        setByPath(enNew, patPath, newEn);
        changed = true; nsCount++; totalReplacements++;
        if (samples.length < 10) samples.push({ p: patPath, old: cur, new: newEn, path_patch: true });
      }
    }

    perNs[ns] = { count: nsCount, samples };
    if (changed && !DRY_RUN) {
      fs.writeFileSync(enPath, JSON.stringify(enNew, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] Finance 领域精修完成`);
  console.log('  处理命名空间      :', financeNs.length);
  console.log('  实际发生替换      :', Object.values(perNs).filter(v => v.count > 0).length);
  console.log('  总替换条数        :', totalReplacements);
  const byNs = Object.entries(perNs).sort((a, b) => b[1].count - a[1].count);
  for (const [ns, v] of byNs) {
    if (v.count === 0) continue;
    console.log(`    ${ns}: ${v.count}`);
  }
  const topTerms = [...termHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log('  Top 术语命中      :');
  for (const [zh, c] of topTerms) {
    const en = zhTermMap.get(zh)?.en || '';
    console.log(`    "${zh}" → "${en}"  ×${c}`);
  }
}

main();
