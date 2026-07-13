const pluginMock = require('./plugin.mock.cjs');

console.log('========================================');
console.log('  插件升级和卸载流程测试');
console.log('========================================\n');

console.log('--- 初始状态 ---');
console.log('已安装插件:');
pluginMock.getInstalledPlugins().forEach(p => {
  console.log(`  - ${p.plugin_name} (${p.plugin_code})`);
  console.log(`    版本: ${p.installed_version} | 状态: ${p.runtime_status} | 激活: ${p.isactive}`);
});
console.log();

console.log('插件市场插件:');
pluginMock.getMarketplacePlugins().forEach(p => {
  const price = p.is_free ? '(免费)' : `($${(p.price_cents || 0) / 100})`;
  console.log(`  - ${p.name} (${p.code}) v${p.version} ${price}`);
});
console.log();

console.log('--- 测试1: 检测可升级插件 ---');
const installedPlugins = pluginMock.getInstalledPlugins();
const marketplacePlugins = pluginMock.getMarketplacePlugins();

installedPlugins.forEach(installed => {
  const marketplace = marketplacePlugins.find(p => p.code === installed.plugin_code);
  if (marketplace && marketplace.version !== installed.installed_version) {
    console.log(`  ⚠️ ${installed.plugin_name}: 当前 v${installed.installed_version}, 最新 v${marketplace.version}`);
  } else if (marketplace) {
    console.log(`  ✅ ${installed.plugin_name}: 当前已是最新版本 v${installed.installed_version}`);
  }
});
console.log();

console.log('--- 测试2: 升级 HRM 插件 (1.8.0 -> 2.0.0) ---');
const hrmBefore = pluginMock.getInstalledPlugin('hrm');
console.log(`  升级前: ${hrmBefore?.plugin_name} v${hrmBefore?.installed_version}`);

const hrmAfter = pluginMock.upgradePlugin('hrm');
console.log(`  升级后: ${hrmAfter?.plugin_name} v${hrmAfter?.installed_version}`);
console.log(`  ${hrmAfter?.installed_version === '2.0.0' ? '✅ 升级成功' : '❌ 升级失败'}`);
console.log();

console.log('--- 测试3: 升级 ERP 插件 (2.9.0 -> 3.1.0) ---');
const erpBefore = pluginMock.getInstalledPlugin('erp');
console.log(`  升级前: ${erpBefore?.plugin_name} v${erpBefore?.installed_version}`);

const erpAfter = pluginMock.upgradePlugin('erp');
console.log(`  升级后: ${erpAfter?.plugin_name} v${erpAfter?.installed_version}`);
console.log(`  ${erpAfter?.installed_version === '3.1.0' ? '✅ 升级成功' : '❌ 升级失败'}`);
console.log();

console.log('--- 测试4: 升级 AI 插件到指定版本 (1.0.0 -> 1.2.0) ---');
const aiBefore = pluginMock.getInstalledPlugin('ai');
console.log(`  升级前: ${aiBefore?.plugin_name} v${aiBefore?.installed_version}`);

const aiAfter = pluginMock.upgradePlugin('ai', '1.2.0');
console.log(`  升级后: ${aiAfter?.plugin_name} v${aiAfter?.installed_version}`);
console.log(`  ${aiAfter?.installed_version === '1.2.0' ? '✅ 升级成功' : '❌ 升级失败'}`);
console.log();

console.log('--- 测试5: 三阶段卸载策略测试 ---');

console.log('\n  5.1 测试禁用(DISABLE): AI 插件');
const disableResult = pluginMock.uninstallPlugin('ai', 'disable');
console.log(`  禁用结果: ${disableResult ? '✅ 成功' : '❌ 失败'}`);
const aiDisabled = pluginMock.getInstalledPlugin('ai');
const aiStatus = aiDisabled?.isactive ? '激活' : '已禁用';
console.log(`  AI 插件状态: ${aiStatus}, 运行状态: ${aiDisabled?.runtime_status}`);
console.log();

console.log('  5.2 测试卸载(UNINSTALL): CRM 插件');
const uninstallResult = pluginMock.uninstallPlugin('crm', 'uninstall');
console.log(`  卸载结果: ${uninstallResult ? '✅ 成功' : '❌ 失败'}`);
const crmAfterUninstall = pluginMock.getInstalledPlugin('crm');
console.log(`  CRM 插件是否仍存在: ${crmAfterUninstall ? '是' : '否'}`);
console.log();

console.log('  5.3 测试彻底删除(DELETE): ERP 插件');
const deleteResult = pluginMock.uninstallPlugin('erp', 'delete');
console.log(`  删除结果: ${deleteResult ? '✅ 成功' : '❌ 失败'}`);
const erpAfterDelete = pluginMock.getInstalledPlugin('erp');
console.log(`  ERP 插件是否仍存在: ${erpAfterDelete ? '是' : '否'}`);
console.log();

console.log('--- 测试6: 安装新插件 ---');
console.log('  安装 WMS 仓储管理系统');
const installedWms = pluginMock.installPlugin('wms');
console.log(`  安装结果: ${installedWms ? '✅ 成功' : '❌ 失败'}`);
if (installedWms) {
  console.log(`  已安装: ${installedWms.plugin_name} v${installedWms.installed_version}`);
}
console.log();

console.log('  安装 BI 商业智能');
const installedBi = pluginMock.installPlugin('bi');
console.log(`  安装结果: ${installedBi ? '✅ 成功' : '❌ 失败'}`);
if (installedBi) {
  console.log(`  已安装: ${installedBi.plugin_name} v${installedBi.installed_version}`);
}
console.log();

console.log('--- 测试7: 启用已禁用插件 ---');
console.log('  启用 AI 插件');
const aiEnabled = pluginMock.enablePlugin('ai');
console.log(`  启用结果: ${aiEnabled ? '✅ 成功' : '❌ 失败'}`);
const aiAfterEnable = pluginMock.getInstalledPlugin('ai');
const aiEnableStatus = aiAfterEnable?.isactive ? '激活' : '已禁用';
console.log(`  AI 插件状态: ${aiEnableStatus}, 运行状态: ${aiAfterEnable?.runtime_status}`);
console.log();

console.log('--- 最终状态 ---');
console.log('剩余已安装插件:');
const finalPlugins = pluginMock.getInstalledPlugins();
finalPlugins.forEach(p => {
  console.log(`  - ${p.plugin_name} (${p.plugin_code})`);
  console.log(`    版本: ${p.installed_version} | 状态: ${p.runtime_status} | 激活: ${p.isactive}`);
});
console.log();

console.log('========================================');
console.log('  测试完成!');
console.log('========================================');
