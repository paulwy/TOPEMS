const fs = require('fs');

const V55_PATH = '/Users/air/TOPEMS/apps/web/src/fullstack-automation/v55-automation-panel.tsx';
const V57_PATH = '/Users/air/TOPEMS/apps/web/src/ai-automation/v57-automation-panel.tsx';

// ======= V55 =======
const v55TextReplacements = [
  ['V55.0 全栈自动化平台', 'fullstackAutomation.panelTitle'],
  ['CI/CD · 智能部署 · 自动回滚 · 健康监控', 'fullstackAutomation.panelSubtitle'],
  ['创建新流水线', 'fullstackAutomation.createPipelineTitle'],
  ['新建部署', 'fullstackAutomation.createDeploymentTitle'],
  ['流水线总数', 'fullstackAutomation.pipelineTotal'],
  ['运行中', 'fullstackAutomation.running'],
  ['成功', 'fullstackAutomation.success'],
  ['失败', 'fullstackAutomation.failed'],
  ['部署总数', 'fullstackAutomation.deploymentTotal'],
  ['进行中', 'fullstackAutomation.inProgress'],
  ['已回滚', 'fullstackAutomation.rolledBack'],
  ['自动回滚', 'fullstackAutomation.autoRollback'],
  ['触发条件', 'fullstackAutomation.triggerConditions'],
  ['回滚事件', 'fullstackAutomation.rollbackEvent'],
  ['最近回滚', 'fullstackAutomation.recentRollback'],
  ['健康实例', 'fullstackAutomation.healthyInstances'],
  ['健康检查', 'fullstackAutomation.healthCheck'],
  ['告警数', 'fullstackAutomation.alertCount'],
  ['平均响应', 'fullstackAutomation.avgResponse'],
  ['指标采集', 'fullstackAutomation.metricsCollection'],
  ['比较方式', 'fullstackAutomation.comparisonMethod'],
  ['流水线名称', 'fullstackAutomation.pipelineName'],
  ['服务名称', 'fullstackAutomation.serviceName'],
  ['部署策略', 'fullstackAutomation.deploymentStrategy'],
  ['耗时(ms)', 'fullstackAutomation.durationMs'],
  ['失败率', 'fullstackAutomation.failRate'],
  ['依赖(逗号分隔)', 'fullstackAutomation.dependsOn'],
  ['持续时间(分钟)', 'fullstackAutomation.durationMinutes'],
  ['环境', 'fullstackAutomation.environment'],
  ['状态', 'fullstackAutomation.status'],
  ['名称', 'fullstackAutomation.name'],
  ['阶段', 'fullstackAutomation.stage'],
  ['创建时间', 'fullstackAutomation.createdAt'],
  ['操作', 'fullstackAutomation.actions'],
  ['运行ID', 'fullstackAutomation.runId'],
  ['耗时', 'fullstackAutomation.duration'],
  ['流水线', 'fullstackAutomation.pipeline'],
  ['阶段进度', 'fullstackAutomation.stageProgress'],
  ['服务', 'fullstackAutomation.service'],
  ['版本', 'fullstackAutomation.version'],
  ['策略', 'fullstackAutomation.strategy'],
  ['流量分配', 'fullstackAutomation.trafficDistribution'],
  ['回滚次数', 'fullstackAutomation.rollbackCount'],
  ['指标', 'fullstackAutomation.metric'],
  ['阈值', 'fullstackAutomation.threshold'],
  ['事件ID', 'fullstackAutomation.eventId'],
  ['部署ID', 'fullstackAutomation.deployId'],
  ['触发原因', 'fullstackAutomation.triggerReason'],
  ['健康状态', 'fullstackAutomation.healthStatus'],
  ['最近检查', 'fullstackAutomation.lastCheck'],
  ['实例详情', 'fullstackAutomation.instanceDetail'],
  ['构建', 'fullstackAutomation.build'],
  ['测试', 'fullstackAutomation.test'],
  ['部署', 'fullstackAutomation.deploy'],
  ['通知', 'fullstackAutomation.notify'],
  ['取消', 'fullstackAutomation.cancel'],
  ['创建', 'fullstackAutomation.create'],
  ['运行', 'fullstackAutomation.run'],
  ['回滚', 'fullstackAutomation.rollback'],
  ['提升候选', 'fullstackAutomation.promoteCandidate'],
  ['蓝绿部署', 'fullstackAutomation.blueGreen'],
  ['金丝雀发布', 'fullstackAutomation.canary'],
  ['滚动更新', 'fullstackAutomation.rolling'],
  ['自动选择', 'fullstackAutomation.autoSelect'],
  ['开始部署', 'fullstackAutomation.startDeploy'],
  ['开发', 'fullstackAutomation.dev'],
  ['预发布', 'fullstackAutomation.staging'],
  ['生产', 'fullstackAutomation.prod'],
  ['类型', 'fullstackAutomation.type'],
  ['描述', 'fullstackAutomation.description'],
  ['重置条件', 'fullstackAutomation.resetConditions'],
  ['暂无运行记录', 'fullstackAutomation.noRuns'],
  ['暂无流水线，点击右上角创建', 'fullstackAutomation.noPipelines'],
  ['暂无部署记录', 'fullstackAutomation.noDeployments'],
  ['暂无配置条件', 'fullstackAutomation.noConditions'],
  ['运行历史', 'fullstackAutomation.runHistory'],
  ['阶段配置', 'fullstackAutomation.stageConfig'],
  ['最近运行', 'fullstackAutomation.recentRuns'],
  ['所有流水线的最近运行记录', 'fullstackAutomation.recentRunsSubtitle'],
  ['部署控制台', 'fullstackAutomation.deployConsole'],
  ['智能部署管理', 'fullstackAutomation.deploySubtitle'],
  ['部署策略说明', 'fullstackAutomation.strategyGuide'],
  ['自动回滚配置', 'fullstackAutomation.autoRollbackConfig'],
  ['回滚事件历史', 'fullstackAutomation.rollbackHistory'],
  ['服务健康监控', 'fullstackAutomation.healthMonitor'],
  ['实时健康检查与告警', 'fullstackAutomation.healthMonitorSubtitle'],
  ['健康监控说明', 'fullstackAutomation.healthGuide'],
  ['危险：指标超过临界值，将触发自动回滚', 'fullstackAutomation.dangerDesc'],
  ['通过同时维护两套环境实现零停机切换，适用于生产环境重大变更', 'fullstackAutomation.blueGreenDesc'],
  ['逐步将流量切换到新版本，小范围验证后全量发布，降低风险', 'fullstackAutomation.canaryDesc'],
  ['逐个替换实例，保证服务持续可用，适用于开发/测试环境', 'fullstackAutomation.rollingDesc'],
  ['如：生产环境部署流水线', 'fullstackAutomation.e.gProdPipeline'],
  ['流水线描述（可选）', 'fullstackAutomation.pipelineDescOptional'],
  ['如：api-gateway', 'fullstackAutomation.e.gApiGateway'],
  ['如：v1.0.0', 'fullstackAutomation.e.gV1'],
  ['如：build', 'fullstackAutomation.e.gBuild'],
  ['启用', 'fullstackAutomation.enabled'],
  ['禁用', 'fullstackAutomation.disabled'],
  ['大于', 'fullstackAutomation.greaterThan'],
  ['小于', 'fullstackAutomation.lessThan'],
  ['等于', 'fullstackAutomation.equals'],
  ['新建流水线', 'fullstackAutomation.createPipeline'],
  ['CI/CD 流水线', 'fullstackAutomation.tabCiCd'],
];

// ======= V57 =======
const v57TextReplacements = [
  ['AI 自动化测试', 'automation.panelTitle'],
  ['智能测试 · CI 流水线 · 质量门禁 · 趋势分析', 'automation.panelSubtitle'],
  ['筛选', 'automation.filter'],
  ['类型', 'automation.type'],
  ['全部', 'automation.all'],
  ['单元测试', 'automation.unitTest'],
  ['集成测试', 'automation.integrationTest'],
  ['端到端', 'automation.e2e'],
  ['名称', 'automation.name'],
  ['优先级', 'automation.priority'],
  ['状态', 'automation.status'],
  ['步骤', 'automation.steps'],
  ['模块', 'automation.module'],
  ['操作', 'automation.actions'],
  ['失败类型', 'automation.failureType'],
  ['根因', 'automation.rootCause'],
  ['建议', 'automation.suggestion'],
  ['Provider', 'automation.provider'],
  ['触发', 'automation.trigger'],
  ['分支', 'automation.branch'],
  ['阶段', 'automation.stage'],
  ['环境', 'automation.environment'],
  ['运行 ID', 'automation.runId'],
  ['流水线', 'automation.pipeline'],
  ['耗时', 'automation.duration'],
  ['产物', 'automation.artifact'],
  ['测试场景', 'automation.testScenario'],
  ['通过率', 'automation.passRate'],
  ['失败数', 'automation.failureCount'],
  ['行覆盖率', 'automation.lineCoverage'],
  ['代码质量', 'automation.codeQuality'],
  ['安全扫描', 'automation.securityScan'],
  ['性能测试', 'automation.performanceTest'],
  ['创建新流水线', 'automation.createPipeline'],
  ['新建部署', 'automation.createDeployment'],
  ['构建', 'automation.build'],
  ['测试', 'automation.test'],
  ['部署', 'automation.deploy'],
  ['通知', 'automation.notify'],
  ['取消', 'automation.cancel'],
  ['智能测试', 'automation.tabIntelligentTesting'],
  ['CI 流水线', 'automation.tabCiPipeline'],
  ['质量门禁', 'automation.tabQualityGate'],
  ['趋势分析', 'automation.tabTrendAnalysis'],
];

function applyTextReplacements(content, mappings) {
  let result = content;
  const applied = [];
  // Sort by length descending to ensure longer strings match first
  const sorted = [...mappings].sort((a, b) => b[0].length - a[0].length);
  for (const [zh, key] of sorted) {
    // Match: >text< (JSX text content), or text in label='text', title='text', etc.
    // We use replaceAll for text within JSX: >zh<
    // Also for standalone attribute values: label='zh', title='zh', etc.
    const before = result;
    // Pattern 1: >text< in JSX
    result = result.replaceAll(`>${zh}<`, `>{t('${key}')}<`);
    // Pattern 2: label='text' or title='text' or placeholder='text'
    result = result.replaceAll(`label='${zh}'`, `label={t('${key}')}`);
    result = result.replaceAll(`title='${zh}'`, `title={t('${key}')}`);
    result = result.replaceAll(`subtitle='${zh}'`, `subtitle={t('${key}')}`);
    result = result.replaceAll(`placeholder='${zh}'`, `placeholder={t('${key}')}`);
    result = result.replaceAll(`description='${zh}'`, `description={t('${key}')}`);
    result = result.replaceAll(`label: '${zh}'`, `label: t('${key}')`);
    // Pattern 3: value bindings
    result = result.replaceAll(`'${zh}' : '${zh}'`, `t('${key}') : t('${key}')`);
    if (before !== result) {
      applied.push(zh);
    }
  }
  return { result, applied };
}

function addUseTranslationToComponents(content, componentNames) {
  let result = content;
  for (const name of componentNames) {
    // Skip if already has useTranslation
    const checkRegex = new RegExp(
      `const ${name}:.*?=>\\s*\\{\\s*const\\s*\\{\\s*t\\s*\\}\\s*=\\s*useTranslation`,
      's'
    );
    if (checkRegex.test(result)) {
      console.log(`  [SKIP] ${name} already has useTranslation`);
      continue;
    }

    // Explicit return: const Name: ... = (...) => {
    const explicitRegex = new RegExp(
      `(const ${name}:[^=]*=\\s*(?:\\([^)]*\\)|\\w+)\\s*=>\\s*\\{)`,
      'g'
    );
    if (explicitRegex.test(result)) {
      result = result.replace(explicitRegex, `$1\n  const { t } = useTranslation();`);
      console.log(`  [ADD] ${name} - explicit return`);
    } else {
      // Implicit return: const Name: ... = (...) => (
      const implicitRegex = new RegExp(
        `(const ${name}:[^=]*=\\s*(?:\\([^)]*\\)|\\w+)\\s*=>\\s*\\()`,
        'g'
      );
      if (implicitRegex.test(result)) {
        result = result.replace(implicitRegex, `$1\n  const { t } = useTranslation();\n  return (`);
        console.log(`  [ADD] ${name} - implicit return`);
      } else {
        console.log(`  [WARN] ${name} - pattern not found`);
      }
    }
  }
  return result;
}

// ============ Process V55 ============
console.log('=== Processing V55 ===');
let v55Content = fs.readFileSync(V55_PATH, 'utf8');
const { result: v55Transformed, applied: v55Applied } = applyTextReplacements(v55Content, v55TextReplacements);
console.log(`Applied ${v55Applied.length} text replacements:`);
v55Applied.forEach(r => console.log(`  - ${r}`));

const v55Components = [
  'V55AutomationPanel',
  'V55PanelHeader',
  'PipelinesTab',
  'DeploymentsTab',
  'RollbacksTab',
  'HealthTab',
  'CreatePipelineDialog',
  'DeployDialog',
];
const v55Final = addUseTranslationToComponents(v55Transformed, v55Components);
fs.writeFileSync(V55_PATH, v55Final, 'utf8');
console.log('V55 written.');

// ============ Process V57 ============
console.log('\n=== Processing V57 ===');
let v57Content = fs.readFileSync(V57_PATH, 'utf8');

// Add import if not present
if (!v57Content.includes('useTranslation')) {
  // Find the last import statement and add after it
  const lastImportMatch = v57Content.lastIndexOf("import ");
  const lastSemicolon = v57Content.indexOf("\n", v57Content.indexOf("import React"));
  // Find end of import block
  let importEnd = v57Content.indexOf("import {", 1);
  let nextImport = v57Content.indexOf("import ", importEnd + 1);
  while (nextImport !== -1) {
    importEnd = nextImport;
    nextImport = v57Content.indexOf("import ", importEnd + 1);
  }
  // Find the end of this import line
  const importLineEnd = v57Content.indexOf("\n", importEnd);
  v57Content = v57Content.slice(0, importLineEnd + 1) + 
               "import { useTranslation } from 'react-i18next';\n" + 
               v57Content.slice(importLineEnd + 1);
  console.log('Added useTranslation import to V57');
} else {
  console.log('V57 already has useTranslation import');
}

const { result: v57Transformed, applied: v57Applied } = applyTextReplacements(v57Content, v57TextReplacements);
console.log(`Applied ${v57Applied.length} text replacements:`);
v57Applied.forEach(r => console.log(`  - ${r}`));

const v57Components = [
  'V57AutomationPanel',
  'V57PanelHeader',
  'TestsTab',
  'CITab',
  'QualityTab',
  'TrendsTab',
];
const v57Final = addUseTranslationToComponents(v57Transformed, v57Components);
fs.writeFileSync(V57_PATH, v57Final, 'utf8');
console.log('V57 written.');

console.log('\nDone!');