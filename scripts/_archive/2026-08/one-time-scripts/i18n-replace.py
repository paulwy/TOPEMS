import re
import sys

V55_KEYS = {
    'V55.0 全栈自动化平台': 'fullstackAutomation.panelTitle',
    'CI/CD · 智能部署 · 自动回滚 · 健康监控': 'fullstackAutomation.panelSubtitle',
    '流水线总数': 'fullstackAutomation.pipelineTotal',
    '运行中': 'fullstackAutomation.running',
    '成功': 'fullstackAutomation.success',
    '失败': 'fullstackAutomation.failed',
    '部署总数': 'fullstackAutomation.deploymentTotal',
    '进行中': 'fullstackAutomation.inProgress',
    '已回滚': 'fullstackAutomation.rolledBack',
    '自动回滚': 'fullstackAutomation.autoRollback',
    '触发条件': 'fullstackAutomation.triggerConditions',
    '回滚事件': 'fullstackAutomation.rollbackEvent',
    '最近回滚': 'fullstackAutomation.recentRollback',
    '健康实例': 'fullstackAutomation.healthyInstances',
    '健康检查': 'fullstackAutomation.healthCheck',
    '告警数': 'fullstackAutomation.alertCount',
    '平均响应': 'fullstackAutomation.avgResponse',
    '智能部署': 'fullstackAutomation.tabDeployment',
    '健康监控': 'fullstackAutomation.tabHealth',
    '流水线': 'fullstackAutomation.pipeline',
    '环境': 'fullstackAutomation.environment',
    '名称': 'fullstackAutomation.name',
    '状态': 'fullstackAutomation.status',
    '阶段': 'fullstackAutomation.stage',
    '创建时间': 'fullstackAutomation.createdAt',
    '操作': 'fullstackAutomation.actions',
    '运行ID': 'fullstackAutomation.runId',
    '开始时间': 'fullstackAutomation.startTime',
    '耗时': 'fullstackAutomation.duration',
    '阶段进度': 'fullstackAutomation.stageProgress',
    '服务': 'fullstackAutomation.service',
    '版本': 'fullstackAutomation.version',
    '策略': 'fullstackAutomation.strategy',
    '流量分配': 'fullstackAutomation.trafficDistribution',
    '回滚次数': 'fullstackAutomation.rollbackCount',
    '指标': 'fullstackAutomation.metric',
    '比较方式': 'fullstackAutomation.comparisonMethod',
    '阈值': 'fullstackAutomation.threshold',
    '持续时间(分钟)': 'fullstackAutomation.durationMinutes',
    '事件ID': 'fullstackAutomation.eventId',
    '部署ID': 'fullstackAutomation.deployId',
    '触发原因': 'fullstackAutomation.triggerReason',
    '健康状态': 'fullstackAutomation.healthStatus',
    '最近检查': 'fullstackAutomation.lastCheck',
    '实例详情': 'fullstackAutomation.instanceDetail',
    '构建': 'fullstackAutomation.build',
    '测试': 'fullstackAutomation.test',
    '部署': 'fullstackAutomation.deploy',
    '通知': 'fullstackAutomation.notify',
    '取消': 'fullstackAutomation.cancel',
    '创建': 'fullstackAutomation.create',
    '运行': 'fullstackAutomation.run',
    '回滚': 'fullstackAutomation.rollback',
    '提升候选': 'fullstackAutomation.promoteCandidate',
    '蓝绿部署': 'fullstackAutomation.blueGreen',
    '金丝雀发布': 'fullstackAutomation.canary',
    '滚动更新': 'fullstackAutomation.rolling',
    '自动选择': 'fullstackAutomation.autoSelect',
    '开始部署': 'fullstackAutomation.startDeploy',
    '开发': 'fullstackAutomation.dev',
    '预发布': 'fullstackAutomation.staging',
    '生产': 'fullstackAutomation.prod',
    '类型': 'fullstackAutomation.type',
    '描述': 'fullstackAutomation.description',
    '重置条件': 'fullstackAutomation.resetConditions',
    '暂无运行记录': 'fullstackAutomation.noRuns',
    '暂无流水线，点击右上角创建': 'fullstackAutomation.noPipelines',
    '暂无部署记录': 'fullstackAutomation.noDeployments',
    '暂无配置条件': 'fullstackAutomation.noConditions',
    '暂无回滚事件': 'fullstackAutomation.noRollbackEvents',
    '运行历史': 'fullstackAutomation.runHistory',
    '阶段配置': 'fullstackAutomation.stageConfig',
    '最近运行': 'fullstackAutomation.recentRuns',
    '所有流水线的最近运行记录': 'fullstackAutomation.recentRunsSubtitle',
    '部署控制台': 'fullstackAutomation.deployConsole',
    '智能部署管理': 'fullstackAutomation.deploySubtitle',
    '部署策略说明': 'fullstackAutomation.strategyGuide',
    '回滚事件历史': 'fullstackAutomation.rollbackHistory',
    '服务健康监控': 'fullstackAutomation.healthMonitor',
    '实时健康检查与告警': 'fullstackAutomation.healthMonitorSubtitle',
    '健康监控说明': 'fullstackAutomation.healthGuide',
    '危险': 'fullstackAutomation.danger',
    '警告': 'fullstackAutomation.warning',
    '危险：指标超过临界值，将触发自动回滚': 'fullstackAutomation.dangerDesc',
    '通过同时维护两套环境实现零停机切换，适用于生产环境重大变更': 'fullstackAutomation.blueGreenDesc',
    '逐步将流量切换到新版本，小范围验证后全量发布，降低风险': 'fullstackAutomation.canaryDesc',
    '逐个替换实例，保证服务持续可用，适用于开发/测试环境': 'fullstackAutomation.rollingDesc',
    '如：生产环境部署流水线': 'fullstackAutomation.e.gProdPipeline',
    '流水线描述（可选）': 'fullstackAutomation.pipelineDescOptional',
    '如：api-gateway': 'fullstackAutomation.e.gApiGateway',
    '如：v1.0.0': 'fullstackAutomation.e.gV1',
    '如：build': 'fullstackAutomation.e.gBuild',
    '启用': 'fullstackAutomation.enabled',
    '禁用': 'fullstackAutomation.disabled',
    '大于': 'fullstackAutomation.greaterThan',
    '小于': 'fullstackAutomation.lessThan',
    '等于': 'fullstackAutomation.equals',
    '新建流水线': 'fullstackAutomation.createPipeline',
    '新建部署': 'fullstackAutomation.createDeployment',
    'CI/CD 流水线': 'fullstackAutomation.tabCiCd',
    '流水线详情': 'fullstackAutomation.pipelineDetail',
    '时间': 'fullstackAutomation.time',
    '错误率': 'fullstackAutomation.errorRate',
    'P99 延迟': 'fullstackAutomation.p99Latency',
    'CPU 使用率': 'fullstackAutomation.cpuUsage',
    '内存使用率': 'fullstackAutomation.memoryUsage',
    '请求速率': 'fullstackAutomation.requestRate',
    '实时指标监控': 'fullstackAutomation.realtimeMetrics',
    '模拟和监控关键指标': 'fullstackAutomation.simulateMetrics',
    '服务健康状态': 'fullstackAutomation.serviceHealth',
    '部署实例的健康检查结果': 'fullstackAutomation.healthCheckResult',
    '健康': 'fullstackAutomation.healthy',
    '添加阶段': 'fullstackAutomation.addStage',
    '健康：': 'fullstackAutomation.healthyLabel',
    '所有指标在正常范围内': 'fullstackAutomation.healthyDesc',
    '警告：': 'fullstackAutomation.warningLabel',
    '部分指标接近阈值，需关注': 'fullstackAutomation.warningDesc',
    '危险：': 'fullstackAutomation.dangerLabel',
    '部署策略': 'fullstackAutomation.deploymentStrategyLabel',
    '流水线名称': 'fullstackAutomation.pipelineName',
    '服务名称': 'fullstackAutomation.serviceName',
    '耗时(ms)': 'fullstackAutomation.durationMs',
    '失败率': 'fullstackAutomation.failRate',
    '依赖(逗号分隔)': 'fullstackAutomation.dependsOn',
    '次': 'fullstackAutomation.timesSuffix',
}

V57_KEYS = {
    'AI 自动化测试': 'automation.panelTitle',
    '智能测试 · CI 流水线 · 质量门禁 · 趋势分析': 'automation.panelSubtitle',
    '筛选': 'automation.filter',
    '类型': 'automation.type',
    '全部': 'automation.all',
    '单元测试': 'automation.unitTest',
    '集成测试': 'automation.integrationTest',
    '端到端': 'automation.e2e',
    '名称': 'automation.name',
    '优先级': 'automation.priority',
    '状态': 'automation.status',
    '步骤': 'automation.steps',
    '模块': 'automation.module',
    '操作': 'automation.actions',
    '失败类型': 'automation.failureType',
    '根因': 'automation.rootCause',
    '建议': 'automation.suggestion',
    'Provider': 'automation.provider',
    '触发': 'automation.trigger',
    '分支': 'automation.branch',
    '阶段': 'automation.stage',
    '环境': 'automation.environment',
    '运行 ID': 'automation.runId',
    '流水线': 'automation.pipeline',
    '耗时': 'automation.duration',
    '产物': 'automation.artifact',
    '测试场景': 'automation.testScenario',
    '通过率': 'automation.passRate',
    '失败数': 'automation.failureCount',
    '行覆盖率': 'automation.lineCoverage',
    '代码质量': 'automation.codeQuality',
    '安全扫描': 'automation.securityScan',
    '性能测试': 'automation.performanceTest',
    '创建新流水线': 'automation.createPipeline',
    '新建部署': 'automation.createDeployment',
    '构建': 'automation.build',
    '测试': 'automation.test',
    '部署': 'automation.deploy',
    '通知': 'automation.notify',
    '取消': 'automation.cancel',
    '智能测试': 'automation.tabIntelligentTesting',
    'CI 流水线': 'automation.tabCiPipeline',
    '质量门禁': 'automation.tabQualityGate',
    '趋势分析': 'automation.tabTrendAnalysis',
}

def replace_chinese(content, mappings):
    total = 0
    
    sorted_mappings = sorted(mappings.items(), key=lambda x: len(x[0]), reverse=True)
    
    for zh, key in sorted_mappings:
        replacements_for_this = 0
        
        # Pattern 1: JSX text nodes >text<
        p1 = f'>{zh}<'
        r1 = f">{{t('{key}')}}<"
        count = content.count(p1)
        if count > 0:
            content = content.replace(p1, r1)
            replacements_for_this += count
        
        # Pattern 2: label="text" (JSX attribute)
        p2 = f'label="{zh}"'
        r2 = f'label={{t(\'{key}\')}}'
        count = content.count(p2)
        if count > 0:
            content = content.replace(p2, r2)
            replacements_for_this += count
        
        # Pattern 3: title="text"
        p3 = f'title="{zh}"'
        r3 = f'title={{t(\'{key}\')}}'
        count = content.count(p3)
        if count > 0:
            content = content.replace(p3, r3)
            replacements_for_this += count
        
        # Pattern 4: subtitle="text"
        p4 = f'subtitle="{zh}"'
        r4 = f'subtitle={{t(\'{key}\')}}'
        count = content.count(p4)
        if count > 0:
            content = content.replace(p4, r4)
            replacements_for_this += count
        
        # Pattern 5: description="text"
        p5 = f'description="{zh}"'
        r5 = f'description={{t(\'{key}\')}}'
        count = content.count(p5)
        if count > 0:
            content = content.replace(p5, r5)
            replacements_for_this += count
        
        # Pattern 6: label: 'text' (object property)
        p6 = f"label: '{zh}'"
        r6 = f"label: t('{key}')"
        count = content.count(p6)
        if count > 0:
            content = content.replace(p6, r6)
            replacements_for_this += count
        
        # Pattern 7: value in ternary or expression like ? 'text' : 'text'
        p7 = f"'{zh}'"
        # Only replace in ternary context: ? 'text' or : 'text'
        # We do this carefully - replace standalone occurrences in expressions
        
        if replacements_for_this > 0:
            total += replacements_for_this
            print(f"  '{zh}' -> '{key}': {replacements_for_this} replacements (patterns 1-6)")
    
    # Handle ternary patterns: ? 'text' and : 'text'
    for zh, key in sorted_mappings:
        p_true = f"? '{zh}'"
        r_true = f"? t('{key}')"
        count = content.count(p_true)
        if count > 0:
            content = content.replace(p_true, r_true)
            total += count
            print(f"  '{zh}' -> '{key}': {count} replacements (ternary ?)")
        
        p_false = f": '{zh}'"
        r_false = f": t('{key}')"
        count = content.count(p_false)
        if count > 0:
            content = content.replace(p_false, r_false)
            total += count
            print(f"  '{zh}' -> '{key}': {count} replacements (ternary :)")
    
    # Handle template strings with Chinese text
    for zh, key in sorted_mappings:
        # Pattern: `...${...} 中文...`
        p_template = f'}}{zh}'
        if p_template in content:
            print(f"  [TEMPLATE] '{zh}' may need manual replacement")
    
    return content, total

def process_file(filepath, mappings):
    print(f'\n=== Processing {filepath} ===')
    with open(filepath, 'r') as f:
        content = f.read()
    
    content, total = replace_chinese(content, mappings)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f'Total: {total} replacements')
    return total

if __name__ == '__main__':
    v55_total = process_file(
        '/Users/air/TOPEMS/apps/web/src/fullstack-automation/v55-automation-panel.tsx',
        V55_KEYS
    )
    v57_total = process_file(
        '/Users/air/TOPEMS/apps/web/src/ai-automation/v57-automation-panel.tsx',
        V57_KEYS
    )
    print(f'\n=== Summary ===')
    print(f'V55: {v55_total} replacements')
    print(f'V57: {v57_total} replacements')
    print(f'Total: {v55_total + v57_total} replacements')