/**
 * 添加新的 i18n 翻译 key 到 zh.json 和 zh/{module}.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

// 新增的 key: { module: { key: value } }
const newKeys = {
  workflow: {
    'workflowapprovaldetailpage.状态变更: {{v0}} → {{v1}}': '状态变更: {{v0}} → {{v1}}',
    'workflowapprovaldetailpage.发起人: {{v0}}': '发起人: {{v0}}',
    'workflowapprovaldetailpage.审批人: {{v0}}': '审批人: {{v0}}',
    'workflowapprovaldetailpage.超时时间: {{v0}}': '超时时间: {{v0}}',
    'workflowapprovaldetailpage.任务: {{v0}}': '任务: {{v0}}',
    'workflowapprovaldetailpage.节点: {{v0}}': '节点: {{v0}}',
    'workflowapprovaldetailpage.当前任务: {{v0}}': '当前任务: {{v0}}',
    'workflowapprovalspage.确定要驳回「{{v0}}」的审批吗？': '确定要驳回「{{v0}}」的审批吗？',
    'workflowinstancedetailpage.节点: {{v0}}': '节点: {{v0}}',
    'workflowinstancedetailpage.审批人: {{v0}}': '审批人: {{v0}}',
    'workflowinstancedetailpage.创建: {{v0}}': '创建: {{v0}}',
    'workflowinstancedetailpage.处理: {{v0}}': '处理: {{v0}}',
    'workflowversionhistorypage.回滚到 v{{v0}}': '回滚到 v{{v0}}',
  },
  erp: {
    'financialanalysispage.¥{{v0}}万': '¥{{v0}}万',
    'financialanalysispage.金额(元)': '金额(元)',
    'financialanalysispage.{{v0}} - 可视化图表': '{{v0}} - 可视化图表',
    'financialanalysispage.{{v0}} - 明细数据': '{{v0}} - 明细数据',
    'financialreportpage.占比(%)': '占比(%)',
    'databasemanagementpage.表结构 - {{v0}}': '表结构 - {{v0}}',
  },
  wms: {
    'batchmanagementpage.可用: {{v0}}': '可用: {{v0}}',
    'batchmanagementpage.剩余 {{v0}} 天': '剩余 {{v0}} 天',
    'inventoryreportpage.当前周转率 (次/年)': '当前周转率 (次/年)',
    'inventoryreportpage.总价值: ¥{{v0}}': '总价值: ¥{{v0}}',
    'inventoryreportpage.数量: {{v0}}': '数量: {{v0}}',
  },
  qms: {},
};

for (const [module, keys] of Object.entries(newKeys)) {
  if (Object.keys(keys).length === 0) continue;

  // 更新 zh/{module}.json
  const moduleJsonPath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh', `${module}.json`);
  const moduleObj = readJson(moduleJsonPath);
  let moduleNew = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (!(k in moduleObj)) {
      moduleObj[k] = v;
      moduleNew++;
    }
  }
  writeJson(moduleJsonPath, moduleObj);

  // 更新 zh.json
  const zhJsonPath = path.join(projectRoot, 'src', 'i18n', 'locales', 'zh.json');
  const zhObj = readJson(zhJsonPath);
  if (!zhObj[module]) zhObj[module] = {};
  let zhNew = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (!(k in zhObj[module])) {
      zhObj[module][k] = v;
      zhNew++;
    }
  }
  writeJson(zhJsonPath, zhObj);

  console.log(`${module}: zh/${module}.json +${moduleNew}, zh.json +${zhNew}`);
}
