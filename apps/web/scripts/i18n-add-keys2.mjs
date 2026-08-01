/**
 * 添加额外的 i18n 翻译 key
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

const newKeys = {
  erp: {
    'auditlogpage.创建': '创建',
    'auditlogpage.修改': '修改',
    'auditlogpage.删除': '删除',
    'auditlogpage.查询': '查询',
    'auditlogpage.登录': '登录',
    'auditlogpage.审核': '审核',
    'auditlogpage.导出': '导出',
    'auditlogpage.备份': '备份',
    'vouchermanagementpage.收': '收',
    'vouchermanagementpage.付': '付',
    'vouchermanagementpage.转': '转',
    'vouchermanagementpage.记': '记',
  },
  qms: {
    'qmsstandarddetailpage.有效_key': '有效',
    'qmsstandarddetailpage.草稿_key': '草稿',
    'qmsstandarddetailpage.已过期_key': '已过期',
    'qmsstandarddetailpage.已归档_key': '已归档',
  },
};

for (const [module, keys] of Object.entries(newKeys)) {
  if (Object.keys(keys).length === 0) continue;

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
