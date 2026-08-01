import re

# V55 remaining mappings (text that appears on its own line between > and <)
V55_MULTILINE = [
    ('V55.0 全栈自动化平台', 'fullstackAutomation.panelTitle'),
    ('CI/CD · 智能部署 · 自动回滚 · 健康监控', 'fullstackAutomation.panelSubtitle'),
    ('新建流水线', 'fullstackAutomation.createPipeline'),
    ('新建部署', 'fullstackAutomation.createDeployment'),
    ('重置条件', 'fullstackAutomation.resetConditions'),
    ('暂无部署', 'fullstackAutomation.noDeployments'),
    ('创建新流水线', 'fullstackAutomation.createPipeline'),
    ('添加阶段', 'fullstackAutomation.addStage'),
    ('创建', 'fullstackAutomation.create'),
    ('开始部署', 'fullstackAutomation.startDeploy'),
    ('开发 (dev)', 'fullstackAutomation.devWithLabel'),
    ('预发布 (staging)', 'fullstackAutomation.stagingWithLabel'),
    ('生产 (prod)', 'fullstackAutomation.prodWithLabel'),
    ('所有指标在正常范围内', 'fullstackAutomation.healthyDesc'),
    ('部分指标接近阈值，需关注', 'fullstackAutomation.warningDesc'),
    ('指标超过临界值，将触发自动回滚', 'fullstackAutomation.dangerDesc'),
]

V57_MULTILINE = [
    ('AI 前端自动化', 'automation.panelTitleV57'),
    ('智能测试 · CI/CD · 质量门禁 · 趋势分析', 'automation.panelSubtitle'),
    ('测试场景', 'automation.testScenario'),
    ('通过率', 'automation.passRate'),
    ('失败数', 'automation.failureCount'),
    ('行覆盖率', 'automation.lineCoverage'),
    ('类型', 'automation.type'),
    ('AI 生成', 'automation.aiGenerate'),
    ('运行全部', 'automation.runAll'),
    ('暂无测试场景', 'automation.noTestScenarios'),
    ('执行步骤', 'automation.execSteps'),
    ('失败分析', 'automation.failureAnalysis'),
    ('失败类型:', 'automation.failureType'),
    ('根因:', 'automation.rootCause'),
    ('建议:', 'automation.suggestion'),
    ('分支覆盖率', 'automation.branchCoverage'),
    ('函数覆盖率', 'automation.functionCoverage'),
    ('流水线', 'automation.pipeline'),
    ('新建流水线', 'automation.createPipeline'),
    ('暂无流水线配置', 'automation.noPipelineConfig'),
    ('暂无运行记录，点击上方"触发"按钮启动流水线', 'automation.noRunsWithHint'),
    ('总规则', 'automation.totalRules'),
    ('通过', 'automation.passed'),
    ('E2E 测试', 'automation.e2eTest'),
    ('运行中', 'automation.running'),
    ('成功', 'automation.success'),
    ('失败', 'automation.failed'),
    ('触发运行', 'automation.triggerRun'),
]

def process_multiline(filepath, mappings):
    with open(filepath, 'r') as f:
        content = f.read()
    
    total = 0
    for zh, key in sorted(mappings, key=lambda x: len(x[0]), reverse=True):
        count = 0
        
        # Pattern 1: text on its own line (common JSX pattern)
        # Line starts with whitespace, then Chinese text, then end of line
        # The preceding line ends with > (possibly with whitespace)
        # The following line starts with < (possibly with whitespace)
        
        # Try: >\n<whitespace>text\n<
        pattern1 = re.compile(r'>\s*\n(\s*)' + re.escape(zh) + r'\s*\n(\s*)<')
        def repl1(m):
            return f">{{t('{key}')}}<"
        
        new_content = pattern1.sub(repl1, content)
        count += len(pattern1.findall(content))
        
        # Pattern 2: text directly on line but with surrounding whitespace
        # e.g., <DialogTitle>创建新流水线</DialogTitle>
        pattern2 = re.compile(r'>\s*' + re.escape(zh) + r'\s*<')
        def repl2(m):
            return f">{{t('{key}')}}<"
        
        new_content2 = pattern2.sub(repl2, new_content)
        count += len(pattern2.findall(new_content))
        
        # Only update if we made changes
        if count > 0:
            content = new_content2
            total += count
            print(f"  '{zh}' -> '{key}': {count} replacements")
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f'Total: {total} replacements in {filepath}')
    return total

# Process V55
process_multiline(
    '/Users/air/TOPEMS/apps/web/src/fullstack-automation/v55-automation-panel.tsx',
    V55_MULTILINE
)

# Process V57
process_multiline(
    '/Users/air/TOPEMS/apps/web/src/ai-automation/v57-automation-panel.tsx',
    V57_MULTILINE
)