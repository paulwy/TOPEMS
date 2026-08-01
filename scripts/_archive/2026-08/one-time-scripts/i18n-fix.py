import re
import json

v55_path = '/Users/air/TOPEMS/apps/web/src/fullstack-automation/v55-automation-panel.tsx'
v57_path = '/Users/air/TOPEMS/apps/web/src/ai-automation/v57-automation-panel.tsx'

# V55 remaining Chinese -> key mapping
# Format: (search_text, key, context)
v55_remaining = [
    # Tab labels in config
    ("label: '智能部署'", "label: t('fullstackAutomation.tabDeployment')"),
    ("label: '健康监控'", "label: t('fullstackAutomation.tabHealth')"),
    ("label: 'CI/CD 流水线'", "label: t('fullstackAutomation.tabCiCd')"),
    
    # Header text (on separate lines)
    ("V55.0 全栈自动化平台", "V55.0 {t('fullstackAutomation.panelTitleText')}"),
    ("CI/CD · 智能部署 · 自动回滚 · 健康监控", "{t('fullstackAutomation.panelSubtitle')}"),
    
    # Pipelines tab - need to handle indented text
    ("subtitle={`${pipelines.length} 个流水线`", "subtitle={t('fullstackAutomation.pipelineCount', { count: pipelines.length })}"),
    
    # Table headers with Chinese
    ("<TableCell sx={{ fontWeight: 600 }}>开始时间</TableCell>", "<TableCell sx={{ fontWeight: 600 }}>{t('fullstackAutomation.startTime')}</TableCell>"),
    ("<TableCell sx={{ fontWeight: 600 }}>时间</TableCell>", "<TableCell sx={{ fontWeight: 600 }}>{t('fullstackAutomation.time')}</TableCell>"),
    
    # Button/link text
    (">新建流水线<", ">{t('fullstackAutomation.createPipeline')}<"),
    (">新建部署<", ">{t('fullstackAutomation.createDeployment')}<"),
    (">阶段配置<", ">{t('fullstackAutomation.stageConfig')}<"),
    (">运行历史<", ">{t('fullstackAutomation.runHistory')}<"),
    (">暂无运行记录<", ">{t('fullstackAutomation.noRuns')}<"),
    (">暂无流水线，点击右上角创建<", ">{t('fullstackAutomation.noPipelines')}<"),
    (">暂无部署记录<", ">{t('fullstackAutomation.noDeployments')}<"),
    (">暂无配置条件<", ">{t('fullstackAutomation.noConditions')}<"),
    (">暂无回滚事件<", ">{t('fullstackAutomation.noRollbackEvents')}<"),
    (">暂无部署<", ">{t('fullstackAutomation.noDeploymentsHealth')}<"),
    (">重置条件<", ">{t('fullstackAutomation.resetConditions')}<"),
    (">添加阶段<", ">{t('fullstackAutomation.addStage')}<"),
    
    # Value expressions
    ("${d.rollback_count}次", "${d.rollback_count}{t('fullstackAutomation.timesSuffix')}"),
    
    # Comparison text
    ("'大于' : c.comparison === 'lt' ? '小于' : '等于'", 
     "t('fullstackAutomation.greaterThan') : c.comparison === 'lt' ? t('fullstackAutomation.lessThan') : t('fullstackAutomation.equals')"),
    
    # Enabled/Disabled values
    ("value={autoEnabled ? '启用' : '禁用'}", 
     "value={autoEnabled ? t('fullstackAutomation.enabled') : t('fullstackAutomation.disabled')}"),
    ("label={c.enabled ? '启用' : '禁用'}", 
     "label={c.enabled ? t('fullstackAutomation.enabled') : t('fullstackAutomation.disabled')}"),
    
    # Metric labels in health tab
    ("label: '错误率'", "label={t('fullstackAutomation.errorRate')}"),
    ("label: 'P99 延迟'", "label={t('fullstackAutomation.p99Latency')}"),
    ("label: 'CPU 使用率'", "label={t('fullstackAutomation.cpuUsage')}"),
    ("label: '内存使用率'", "label={t('fullstackAutomation.memoryUsage')}"),
    ("label: '请求速率'", "label={t('fullstackAutomation.requestRate')}"),
    ("label: '危险'", "label={t('fullstackAutomation.danger')}"),
    ("label: '警告'", "label={t('fullstackAutomation.warning')}"),
    
    # Title/subtitle
    ("title='实时指标监控'", "title={t('fullstackAutomation.realtimeMetrics')}"),
    ("subtitle='模拟和监控关键指标'", "subtitle={t('fullstackAutomation.simulateMetrics')}"),
    ("title='服务健康状态'", "title={t('fullstackAutomation.serviceHealth')}"),
    ("subtitle='部署实例的健康检查结果'", "subtitle={t('fullstackAutomation.healthCheckResult')}"),
    
    # Health guide text
    ("<strong>健康：</strong>所有指标在正常范围内", "<strong>{t('fullstackAutomation.healthy')}:</strong> {t('fullstackAutomation.healthyDesc')}"),
    ("<strong>警告：</strong>部分指标接近阈值，需关注", "<strong>{t('fullstackAutomation.warningLabel')}:</strong> {t('fullstackAutomation.warningDesc')}"),
    ("<strong>危险：</strong>指标超过临界值，将触发自动回滚", "<strong>{t('fullstackAutomation.dangerLabel')}:</strong> {t('fullstackAutomation.dangerDesc')}"),
    
    # Pipeline detail title
    ("title={`流水线详情: ${selectedPipeline.name}`}", "title={`${t('fullstackAutomation.pipelineDetail')}: ${selectedPipeline.name}`}"),
    
    # Menu items
    (">开发 (dev)<", ">{t('fullstackAutomation.dev')} (dev)<"),
    (">预发布 (staging)<", ">{t('fullstackAutomation.staging')} (staging)<"),
    (">生产 (prod)<", ">{t('fullstackAutomation.prod')} (prod)<"),
    
    # CreatePipelineDialog
    ("placeholder='如：生产环境部署流水线'", "placeholder={t('fullstackAutomation.e.gProdPipeline')}"),
    ("label='流水线名称'", "label={t('fullstackAutomation.pipelineName')}"),
    ("label='描述'", "label={t('fullstackAutomation.description')}"),
    ("placeholder='流水线描述（可选）'", "placeholder={t('fullstackAutomation.pipelineDescOptional')}"),
    ("label='名称'", "label={t('fullstackAutomation.name')}"),
    ("label='类型'", "label={t('fullstackAutomation.type')}"),
    ("label='耗时(ms)'", "label={t('fullstackAutomation.durationMs')}"),
    ("label='失败率'", "label={t('fullstackAutomation.failRate')}"),
    ("label='依赖(逗号分隔)'", "label={t('fullstackAutomation.dependsOn')}"),
    ("placeholder='如：build'", "placeholder={t('fullstackAutomation.e.gBuild')}"),
    (">取消<", ">{t('fullstackAutomation.cancel')}<"),
    (">创建<", ">{t('fullstackAutomation.create')}<"),
    ("<DialogTitle sx={{ fontWeight: 600 }}>创建新流水线</DialogTitle>", "<DialogTitle sx={{ fontWeight: 600 }}>{t('fullstackAutomation.createPipelineTitle')}</DialogTitle>"),
    
    # DeployDialog
    ("label='服务名称'", "label={t('fullstackAutomation.serviceName')}"),
    ("placeholder='如：api-gateway'", "placeholder={t('fullstackAutomation.e.gApiGateway')}"),
    ("label='版本'", "label={t('fullstackAutomation.version')}"),
    ("placeholder='如：v1.0.0'", "placeholder={t('fullstackAutomation.e.gV1')}"),
    ("label='部署策略'", "label={t('fullstackAutomation.deploymentStrategy')}"),
    ("label='策略'", "label={t('fullstackAutomation.strategy')}"),
    (">自动选择<", ">{t('fullstackAutomation.autoSelect')}<"),
    (">开始部署<", ">{t('fullstackAutomation.startDeploy')}<"),
    ("<DialogTitle sx={{ fontWeight: 600 }}>新建部署</DialogTitle>", "<DialogTitle sx={{ fontWeight: 600 }}>{t('fullstackAutomation.createDeploymentTitle')}</DialogTitle>"),
    
    # Stat card labels (not caught before)
    ("label='已回滚'", "label={t('fullstackAutomation.rolledBack')}"),
    ("label='进行中'", "label={t('fullstackAutomation.inProgress')}"),
]

with open(v55_path, 'r') as f:
    v55_content = f.read()

v55_applied = []
for search, replace in v55_remaining:
    if search in v55_content:
        v55_content = v55_content.replace(search, replace)
        v55_applied.append(search)

# Add useTranslation to components that don't have it
def add_use_translation(content, component_name):
    # Check if already has it
    pattern_check = rf'const {component_name}:.*?=>\s*\{{\s*const\s*\{{\s*t\s*\}}\s*=\s*useTranslation'
    if re.search(pattern_check, content, re.DOTALL):
        print(f"  [SKIP] {component_name} already has useTranslation")
        return content
    
    # Try explicit return: const Name: ... = (...) => {
    pattern_explicit = rf'(const {component_name}:[^=]*=\s*(?:\([^)]*\)|\w+)\s*=>\s*\{{)'
    match = re.search(pattern_explicit, content)
    if match:
        content = content.replace(match.group(1), match.group(1) + '\n  const { t } = useTranslation();')
        print(f"  [ADD] {component_name} - explicit return")
        return content
    
    # Try implicit return: const Name: ... = (...) => (
    pattern_implicit = rf'(const {component_name}:[^=]*=\s*(?:\([^)]*\)|\w+)\s*=>\s*\()'
    match = re.search(pattern_implicit, content)
    if match:
        content = content.replace(match.group(1), match.group(1) + '\n  const { t } = useTranslation();\n  return (')
        print(f"  [ADD] {component_name} - implicit return")
        return content
    
    print(f"  [WARN] {component_name} - pattern not found")
    return content

v55_components = [
    'V55AutomationPanel',
    'V55PanelHeader', 
    'PipelinesTab',
    'DeploymentsTab',
    'RollbacksTab',
    'HealthTab',
    'CreatePipelineDialog',
    'DeployDialog',
]

for comp in v55_components:
    v55_content = add_use_translation(v55_content, comp)

with open(v55_path, 'w') as f:
    f.write(v55_content)

print(f"V55: Applied {len(v55_applied)} text replacements")
for a in v55_applied:
    print(f"  - {a[:50]}")

# ======= V57 =======
v57_remaining = [
    # Tab labels in config
    ("label: '智能测试'", "label: t('automation.tabIntelligentTesting')"),
    ("label: 'CI 流水线'", "label: t('automation.tabCiPipeline')"),
    ("label: '质量门禁'", "label: t('automation.tabQualityGate')"),
    ("label: '趋势分析'", "label: t('automation.tabTrendAnalysis')"),
    
    # Header text
    (">AI 自动化测试<", ">{t('automation.panelTitle')}<"),
    (">筛选<", ">{t('automation.filter')}<"),
    ("label='类型'", "label={t('automation.type')}"),
    (">全部<", ">{t('automation.all')}<"),
    (">单元测试<", ">{t('automation.unitTest')}<"),
    (">集成测试<", ">{t('automation.integrationTest')}<"),
    (">端到端<", ">{t('automation.e2e')}<"),
    (">名称<", ">{t('automation.name')}<"),
    (">优先级<", ">{t('automation.priority')}<"),
    (">状态<", ">{t('automation.status')}<"),
    (">步骤<", ">{t('automation.steps')}<"),
    (">模块<", ">{t('automation.module')}<"),
    (">操作<", ">{t('automation.actions')}<"),
    (">失败类型<", ">{t('automation.failureType')}<"),
    (">根因<", ">{t('automation.rootCause')}<"),
    (">建议<", ">{t('automation.suggestion')}<"),
    (">Provider<", ">{t('automation.provider')}<"),
    (">触发<", ">{t('automation.trigger')}<"),
    (">分支<", ">{t('automation.branch')}<"),
    (">阶段<", ">{t('automation.stage')}<"),
    (">环境<", ">{t('automation.environment')}<"),
    (">运行 ID<", ">{t('automation.runId')}<"),
    (">流水线<", ">{t('automation.pipeline')}<"),
    (">耗时<", ">{t('automation.duration')}<"),
    (">产物<", ">{t('automation.artifact')}<"),
    (">测试场景<", ">{t('automation.testScenario')}<"),
    (">通过率<", ">{t('automation.passRate')}<"),
    (">失败数<", ">{t('automation.failureCount')}<"),
    (">行覆盖率<", ">{t('automation.lineCoverage')}<"),
    (">代码质量<", ">{t('automation.codeQuality')}<"),
    (">安全扫描<", ">{t('automation.securityScan')}<"),
    (">性能测试<", ">{t('automation.performanceTest')}<"),
    (">创建新流水线<", ">{t('automation.createPipeline')}<"),
    (">新建部署<", ">{t('automation.createDeployment')}<"),
    (">构建<", ">{t('automation.build')}<"),
    (">测试<", ">{t('automation.test')}<"),
    (">部署<", ">{t('automation.deploy')}<"),
    (">通知<", ">{t('automation.notify')}<"),
    (">取消<", ">{t('automation.cancel')}<"),
]

with open(v57_path, 'r') as f:
    v57_content = f.read()

# Ensure import exists
if 'useTranslation' not in v57_content:
    v57_content = v57_content.replace(
        "import { useTranslation } from 'react-i18next';\n",
        "import { useTranslation } from 'react-i18next';\n"
    )
    # Add import
    lines = v57_content.split('\n')
    insert_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('import '):
            insert_idx = i
    lines.insert(insert_idx + 1, "import { useTranslation } from 'react-i18next';")
    v57_content = '\n'.join(lines)

v57_applied = []
for search, replace in v57_remaining:
    if search in v57_content:
        v57_content = v57_content.replace(search, replace)
        v57_applied.append(search)

v57_components = [
    'V57AutomationPanel',
    'V57PanelHeader',
    'TestsTab',
    'CITab',
    'QualityTab',
    'TrendsTab',
]

for comp in v57_components:
    v57_content = add_use_translation(v57_content, comp)

with open(v57_path, 'w') as f:
    f.write(v57_content)

print(f"\nV57: Applied {len(v57_applied)} text replacements")
for a in v57_applied:
    print(f"  - {a[:50]}")

print("\nDone!")