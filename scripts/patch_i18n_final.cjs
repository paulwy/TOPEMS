// Final patch script: translates all 540 remaining missing i18n keys.
// Patterns handled:
//  1. Standalone Chinese values (direct dictionary lookup)
//  2. "prefix.中文" values (translate Chinese part, keep prefix)
//  3. "prefix.prefix_中文" self-referential values (translate Chinese part)
//  4. Code snippets containing Chinese (translate Chinese portions)
//  5. Template/description strings
const fs = require('fs');
const path = require('path');

const dir = 'apps/web/src/i18n/locales/';
const files = ['finance', 'hrm', 'mes', 'ehs', 'srm'];

// Master Chinese → English dictionary for standalone values
const D = {
  // === Levels ===
  '一级': 'Level 1', '二级': 'Level 2', '三级': 'Level 3', '四级': 'Level 4',
  // === Status: common ===
  '已拒绝': 'Rejected', '已付款': 'Paid', '已驳回': 'Rejected',
  '待处理': 'Pending', '处理中': 'In Progress', '已完成': 'Completed',
  '已取消': 'Cancelled', '已交付': 'Delivered', '草稿': 'Draft',
  '已启用': 'Enabled', '已禁用': 'Disabled', '待审核': 'Pending Review',
  '已发布': 'Published', '已投标': 'Bid Submitted', '投标中': 'Bidding',
  '已授标': 'Awarded', '已提交': 'Submitted', '授标': 'Award',
  '拒绝': 'Reject', '已过期': 'Expired', '有效': 'Valid',
  '已终止': 'Terminated', '履行中': 'In Performance', '待签署': 'Pending Signature',
  '已签署': 'Signed', '已到期': 'Expired', '执行中': 'In Progress',
  '活跃': 'Active', '停用': 'Disabled', '在售': 'On Sale',
  '低': 'Low', '中': 'Medium', '高': 'High', '重要': 'Important',
  // === Actions ===
  '发布': 'Publish', '发布成功': 'Published Successfully', '发布失败': 'Publish Failed',
  '开标': 'Open Bids', '定标': 'Award', '查看详情': 'View Details',
  '查看订单': 'View Orders', '查看发票': 'View Invoices',
  '查看报价': 'View Quotes', '授标成功': 'Awarded Successfully',
  '授标失败': 'Award Failed', '中标': 'Won Bid', '驳回': 'Reject',
  '启用': 'Enable', '新增明细行': 'Add Detail Line', '添加明细': 'Add Details',
  // === Common nouns ===
  '供应商': 'Supplier', '联系人': 'Contact Person', '联系电话': 'Contact Phone',
  '状态': 'Status', '操作': 'Action', '总金额': 'Total Amount',
  '交货期': 'Delivery Period', '描述': 'Description', '备注': 'Remarks',
  '创建时间': 'Creation Time', '更新时间': 'Update Time',
  '合同信息': 'Contract Information', '合同类型': 'Contract Type',
  '合同金额': 'Contract Amount', '合同详情': 'Contract Details',
  '合同不存在': 'Contract Does Not Exist', '签署日期': 'Signing Date',
  '开始日期': 'Start Date', '结束日期': 'End Date', '时间信息': 'Time Information',
  '联系信息': 'Contact Information', '邮箱': 'Email', '地址': 'Address',
  '官网': 'Website', '基本信息': 'Basic Information', '法定名称': 'Legal Name',
  '税号': 'Tax ID', '品类': 'Category', '风险等级': 'Risk Level',
  '信用等级': 'Credit Rating', '供应商详情': 'Supplier Details',
  '供应商不存在': 'Supplier Does Not Exist', '未知供应商': 'Unknown Supplier',
  '单据总数': 'Total Documents', '所有单据合计': 'All Documents Total',
  '订单数量': 'Order Count', '已记录订单': 'Recorded Orders',
  '合同数量': 'Contract Count', '已记录合同': 'Recorded Contracts',
  '待结算': 'Pending Settlement', '财务管理': 'Financial Management',
  '订单总数': 'Total Orders', '订单总额': 'Total Order Amount',
  '首页': 'Home', '采购订单': 'Purchase Order',
  '综合评分': 'Overall Score', '质量评分': 'Quality Score',
  '交付评分': 'Delivery Score', '准时交付率': 'On-Time Delivery Rate',
  '缺陷率': 'Defect Rate', '供应商总数': 'Total Suppliers',
  '已评估供应商': 'Evaluated Suppliers', '评估覆盖率': 'Evaluation Coverage',
  '平均综合评分': 'Average Overall Score', '绩效概览': 'Performance Overview',
  '最佳供应商': 'Best Supplier', '供应商绩效': 'Supplier Performance',
  '订单金额': 'Order Amount', '维度总数': 'Total Dimensions',
  '权重合计': 'Total Weight', '评分维度配置': 'Scoring Dimension Configuration',
  '报价单管理': 'Quotation Management', '报价单已中标': 'Quotation Won',
  '报价单已驳回': 'Quotation Rejected', '中标操作失败': 'Award Operation Failed',
  '驳回操作失败': 'Reject Operation Failed', '成功': 'Success', '失败': 'Failed',
  '合同管理': 'Contract Management', '合同总数': 'Total Contracts',
  '合同总额': 'Total Contract Amount', '供应商管理': 'Supplier Management',
  '供应商产品': 'Supplier Products', '产品不存在': 'Product Does Not Exist',
  '产品总数': 'Total Products', '总价值': 'Total Value',
  '低风险': 'Low Risk', '高风险': 'High Risk',
  '供应商名称': 'Supplier Name', '供应商id': 'Supplier ID',
  '授标操作失败': 'Award Operation Failed', '报价单已拒绝': 'Quotation Rejected',
  '进行中': 'In Progress', '评估总数': 'Total Evaluations',
  '供应商评估': 'Supplier Evaluation', '已发货': 'Shipped',
  '按时交付率': 'On-Time Delivery Rate', '分': 'pts', '截止': 'Deadline',
  '招投标管理': 'Bidding Management', '询报价管理': 'Inquiry & Quotation Management',
  '投标人': 'Bidder', '投标金额': 'Bid Amount', '中标供应商': 'Winning Supplier',
  '项目描述': 'Project Description', '预算总额': 'Total Budget',
  '预算金额': 'Budget Amount', '招标项目总数': 'Total Bidding Projects',
  '招标项目已发布': 'Bidding Project Published', '招标项目已开标': 'Bidding Project Opened',
  '暂无投标人': 'No Bidders', '已完成定标': 'Award Completed',
  '已完成授标': 'Award Completed', '暂无报价': 'No Quotations',
  '询价单已发布': 'Inquiry Published', '询价单总数': 'Total Inquiries',
  '报价中': 'Quoting', '总报价数': 'Total Quotations', '报价数': 'Quotation Count',
  '截止日期': 'Deadline', '有效期至': 'Valid Until', '报价单号': 'Quotation No.',
  '操作失败': 'Operation Failed', '发布询价单失败': 'Failed to Publish Inquiry',
  '发布招标项目失败': 'Failed to Publish Bidding Project',
  '开标成功': 'Bid Opening Successful', '开标失败': 'Bid Opening Failed',
  '开标操作失败': 'Bid Opening Operation Failed',
  '定标成功': 'Award Successful', '定标失败': 'Award Failed',
  '定标操作失败': 'Award Operation Failed', '拒绝报价失败': 'Failed to Reject Quotation',
  '加载合同信息失败': 'Failed to Load Contract Information',
  '加载订单统计失败': 'Failed to Load Order Statistics',
  '加载订单失败': 'Failed to Load Orders', '创建订单失败': 'Failed to Create Order',
  '更新订单失败': 'Failed to Update Order', '删除订单失败': 'Failed to Delete Order',
  '创建合同失败': 'Failed to Create Contract',
  '更新合同失败': 'Failed to Update Contract',
  '删除合同失败': 'Failed to Delete Contract',
  '创建评估失败': 'Failed to Create Evaluation',
  '更新评估失败': 'Failed to Update Evaluation',
  '删除评估失败': 'Failed to Delete Evaluation',
  '创建报价单失败': 'Failed to Create Quotation',
  '更新报价单失败': 'Failed to Update Quotation',
  '创建评分维度失败': 'Failed to Create Scoring Dimension',
  '更新评分维度失败': 'Failed to Update Scoring Dimension',
  '删除评分维度失败': 'Failed to Delete Scoring Dimension',
  '加载报价单失败': 'Failed to Load Quotation',
  '加载供应商信息失败': 'Failed to Load Supplier Information',
  '加载供应商门户数据失败': 'Failed to Load Supplier Portal Data',
  '加载失败': 'Load Failed', '无法加载供应商门户数据': 'Unable to Load Supplier Portal Data',
  '绩效数据不可创建': 'Performance Data Cannot Be Created',
  '绩效数据不可更新': 'Performance Data Cannot Be Updated',
  '绩效数据不可删除': 'Performance Data Cannot Be Deleted',
  '待处理订单': 'Pending Orders', '累计金额': 'Cumulative Amount',
  '发货管理': 'Shipment Management', '询报价': 'Inquiry & Quotation',
  '示例供应商': 'Sample Supplier', '原材料供应商': 'Raw Material Supplier',
  '最近订单': 'Recent Orders', '待办事项': 'To-Do Items', '公告通知': 'Announcements',
  '绩效指标': 'Performance Indicators', '合作评分': 'Cooperation Score',
  '快速入口': 'Quick Access', '订单管理': 'Order Management',
  '发票管理': 'Invoice Management', '绩效评估': 'Performance Evaluation',
  '消息通知': 'Message Notifications',
  '关于春节期间发货安排的通知': 'Notice on Shipment Arrangements During Spring Festival',
  '新增供应商门户功能上线公告': 'Announcement on New Supplier Portal Features',
  '个': 'pcs', '吨': 'ton', '台': 'unit', '升': 'liter', '只': 'pcs',
  // === Supplier products (names kept as transliteration/translation) ===
  '不锈钢板材_304': 'Stainless Steel Sheet 304', '宝钢集团': 'Baosteel Group',
  '原材料': 'Raw Materials', '铝合金型材_6061': 'Aluminum Alloy Profile 6061',
  '中铝集团': 'Chinalco Group', '密封圈_nbr': 'Seal Ring NBR',
  '三力密封': 'Sanli Seals', '零部件': 'Components',
  '西门子电气': 'Siemens Electric', '设备配件': 'Equipment Parts',
  '液压油_hm46': 'Hydraulic Oil HM46', '长城润滑油': 'Great Wall Lubricants',
  '化工原料': 'Chemical Raw Materials', '传感器_pt100': 'Sensor PT100',
  '霍尼韦尔': 'Honeywell', '电子元器件': 'Electronic Components',
  '瓦楞纸箱定制': 'Custom Corrugated Box', '合兴包装': 'Hexing Packaging',
  '包装材料': 'Packaging Materials', '轴承_skf6205': 'Bearing SKF6205',
  '瑞典skf': 'SKF Sweden',
  // === SRM categories ===
  '提供原材料的供应商分类': 'Supplier Category Providing Raw Materials',
  '零部件供应商': 'Component Supplier', '提供零部件的供应商': 'Supplier Providing Components',
  '包装材料供应商': 'Packaging Material Supplier',
  '提供包装材料的供应商': 'Supplier Providing Packaging Materials',
  '设备供应商': 'Equipment Supplier',
  '提供生产设备的供应商': 'Supplier Providing Production Equipment',
  '化工原料供应商': 'Chemical Raw Material Supplier',
  '提供化工原料的供应商': 'Supplier Providing Chemical Raw Materials',
  '电子元器件供应商': 'Electronic Component Supplier',
  '提供电子元器件的供应商': 'Supplier Providing Electronic Components',
  '物流服务商': 'Logistics Service Provider',
  '提供物流配送服务的供应商': 'Supplier Providing Logistics Distribution Services',
  '检测设备供应商': 'Testing Equipment Supplier',
  '提供检测设备的供应商': 'Supplier Providing Testing Equipment',
  '分类不存在': 'Category Does Not Exist', '分类总数': 'Total Categories',
  '含供应商': 'Including Suppliers', '供应商分类': 'Supplier Category',
  // === SRM contract detail ===
  '合同id为空': 'Contract ID is Empty', '供应商id为空': 'Supplier ID is Empty',
  // === Finance ===
  '总账管理': 'General Ledger Management', '明细': 'Details',
  '管理企业固定资产，计提折旧和处理报废': 'Manage enterprise fixed assets, depreciation and disposal',
  '管理财务凭证、会计科目，支持用友凭证导入': 'Manage financial vouchers and accounts, supports Yonyou voucher import',
  '管理会计科目编码、类别与层级关系': 'Manage account codes, categories and hierarchical relationships',
  '管理企业固定资产，包括购置、折旧、处置等全生命周期': 'Manage enterprise fixed assets including acquisition, depreciation, disposal and full lifecycle',
  '全部分类': 'All Categories', '价值信息': 'Value Information',
  '管理会计科目总账，查看账户余额和发生额': 'Manage general ledger of accounts, view account balances and transaction amounts',
  '管理企业税务申报、缴纳和分析（数据由销售发票与采购发票聚合）': 'Manage enterprise tax filing, payment and analysis (data aggregated from sales and purchase invoices)',
  '管理财务凭证，支持凭证审核、反审核及用友凭证导入': 'Manage financial vouchers, supports voucher review, reverse review and Yonyou voucher import',
  // === HRM ===
  '员工分析': 'Employee Analysis', '人数': 'Headcount',
  '发放人数': 'Payment Headcount', '人': 'Person(s)',
  '发放周期': 'Payment Cycle', '代码': 'Code', '级别': 'Level',
  '申请总数': 'Total Applications', '天数': 'Days',
  '无扣除': 'No Deduction', '身份证号': 'ID Card No.',
  '初始化财务信息': 'Initialize Financial Information', '暂无部门': 'No Departments',
  '管理企业公司信息，包括公司名称、注册号、税号、联系方式等': 'Manage enterprise company information including name, registration number, tax number, contact details, etc.',
  '新增入职': 'New Hires', '负责人': 'Person in Charge',
  '主管评分': 'Supervisor Score', '主管已评': 'Supervisor Reviewed',
  '临时': 'Temporary', '时间与状态': 'Time and Status',
  '生效日期': 'Effective Date', '时间与预算': 'Time and Budget',
  '管理员工请假申请': 'Manage Employee Leave Applications',
  // === MES ===
  '按类型分布': 'Distribution by Type', '暂无趋势数据': 'No Trend Data',
  '启用此规则': 'Enable This Rule', '优化报告': 'Optimization Report',
  '齐套': 'Kit Complete', '缺口数量': 'Shortage Quantity', '延期': 'Delayed',
  '单': 'Unit', '不合格数量': 'Non-Conforming Quantity',
  '追溯详情': 'Traceability Details', '人员不足': 'Insufficient Personnel',
  '延期天数': 'Days Delayed', '环境因素': 'Environmental Factors',
  '返工': 'Rework', '处置分布': 'Disposition Distribution',
  '位置与采购': 'Location and Procurement',
  '管理设备综合效率（OEE）记录，包括可用率、性能率、质量率等指标': 'Manage OEE records including availability, performance, and quality rates',
  '作废': 'Voided', '普通': 'Normal', '原因与状态': 'Reason and Status',
  '流程编号': 'Process No.', '流程名称': 'Process Name',
  '数量与优先级': 'Quantity and Priority', '顺序': 'Sequence',
  '数量信息': 'Quantity Information', '时间信息': 'Time Information',
  '优先级与备注': 'Priority and Remarks', '时间计划': 'Time Plan',
  // === EHS ===
  '等级': 'Level', '粉尘': 'Dust', '致命': 'Fatal',
  '最大人数': 'Max Headcount', '编辑危险源': 'Edit Hazard Source',
  '时间安排': 'Schedule', '发布信息': 'Publication Information',
  '内容与状态': 'Content and Status',
  '管理合规评估记录，包括评估类型、评估人、结果等': 'Manage compliance assessment records including assessment type, assessor, results, etc.',
  '负责人与时间': 'Person in Charge and Time', '结果与内容': 'Results and Content',
  // === SRM misc ===
  '服务': 'Services', '工程': 'Engineering', '单据编号': 'Document No.',
  '创建人': 'Creator', '日期与状态': 'Date and Status', '下单日期': 'Order Date',
  '机械设备': 'Mechanical Equipment', '服务类': 'Service Category',
  '价格与单位': 'Price and Unit',
  '管理供应商报价单，包括报价明细、金额、交付时间等信息': 'Manage supplier quotations including quote details, amounts, delivery time, etc.',
  '待处理_处理中_有效': 'Pending_In Progress_Valid',
  '已完成_已交付': 'Completed_Delivered',
  '确认订单_po_2024_001': 'Confirm Order PO-2024-001',
  '发货提醒_po_2024_002': 'Shipment Reminder PO-2024-002',
  '发票对账_inv_2024_005': 'Invoice Reconciliation INV-2024-005',
};

// Helper: translate a value that may be "prefix.中文" or "中文" or code snippet
function translateValue(zhVal) {
  // Direct dictionary hit
  if (D[zhVal]) return D[zhVal];

  // Check if this is a code snippet or JSX (check BEFORE dot-pattern to avoid misrouting)
  const isCodeSnippet = zhVal.includes('throw new Error') || zhVal.includes('return response') ||
    zhVal.includes('<TableHead') || zhVal.includes('<TableRow') || zhVal.includes('<TableCell') ||
    zhVal.includes('</Typography') || zhVal.includes('<Typography') ||
    zhVal.includes('row.score') || zhVal.includes('measure.deadline') ||
    zhVal.startsWith('[0]') || zhVal.startsWith('[1]') || zhVal.startsWith('>') ||
    zhVal.includes('{row.') || zhVal.includes('{measure.');

  if (isCodeSnippet || /[\u4e00-\u9fff]/.test(zhVal)) {
    let result = zhVal;
    // Replace all known Chinese terms in the snippet (longest first)
    const keys = Object.keys(D).filter(k => /[\u4e00-\u9fff]/.test(k)).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      while (result.includes(k)) {
        result = result.replace(k, D[k]);
      }
    }
    if (result !== zhVal) return result;
  }

  // Pattern: "prefix.中文" — translate Chinese part, keep prefix
  // e.g. "bidding.发布成功" → "bidding.Published Successfully"
  const dotIdx = zhVal.indexOf('.');
  if (dotIdx > 0 && dotIdx < zhVal.length - 1) {
    const prefix = zhVal.substring(0, dotIdx);
    const rest = zhVal.substring(dotIdx + 1);
    // Check if rest is Chinese (contains CJK) AND prefix is a simple word (no spaces/code)
    if (/[\u4e00-\u9fff]/.test(rest) && /^[\w]+$/.test(prefix)) {
      if (D[rest]) return prefix + '.' + D[rest];
      // rest itself might be "prefix2.中文"
      const subDot = rest.indexOf('.');
      if (subDot > 0 && subDot < rest.length - 1) {
        const subPrefix = rest.substring(0, subDot);
        const subRest = rest.substring(subDot + 1);
        if (D[subRest]) return prefix + '.' + subPrefix + '.' + D[subRest];
        if (/^[\w_]+$/.test(subRest)) {
          // like "po_2024_001" — keep as is
          return prefix + '.' + subPrefix + '.' + subRest;
        }
      }
      // Try splitting by underscore: "中文_code"
      const underIdx = rest.indexOf('_');
      if (underIdx > 0) {
        const cnPart = rest.substring(0, underIdx);
        const codePart = rest.substring(underIdx);
        if (D[cnPart]) return prefix + '.' + D[cnPart] + codePart;
      }
    }
  }

  return null; // couldn't translate
}

let totalMissing = 0;
const stillNotFound = new Set();

for (const f of files) {
  const zhPath = path.resolve(dir + 'zh/' + f + '.json');
  const enPath = path.resolve(dir + 'en/' + f + '.json');
  const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  let en;
  try { en = JSON.parse(fs.readFileSync(enPath, 'utf8')); } catch (e) { en = {}; }

  let missCount = 0;

  function translate(zhObj, enObj) {
    for (const k of Object.keys(zhObj)) {
      if (typeof zhObj[k] === 'object' && zhObj[k] !== null) {
        if (!enObj[k] || typeof enObj[k] !== 'object') enObj[k] = {};
        translate(zhObj[k], enObj[k]);
      } else {
        if (!enObj[k] || enObj[k] === zhObj[k]) {
          const zhVal = zhObj[k];
          const translated = translateValue(zhVal);
          if (translated !== null && translated !== zhVal) {
            enObj[k] = translated;
          } else {
            stillNotFound.add(zhVal);
            missCount++;
          }
        }
      }
    }
  }

  translate(zh, en);
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
  console.log(f + '.json: ' + missCount + ' still missing');
  totalMissing += missCount;
}

console.log('\nTotal still missing: ' + totalMissing);
if (stillNotFound.size > 0) {
  console.log('\nUntranslated values (' + stillNotFound.size + '):');
  for (const v of stillNotFound) {
    console.log('  ' + JSON.stringify(v));
  }
}
