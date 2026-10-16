import json, os, re, sys

# ---- 翻译映射（zh 值 -> en 值）----
T = {
    # AI 面板
    '暂不可用': 'Currently unavailable',
    'AI 增强': 'AI Enhancement',
    '智能体': 'Agent',
    '原生集成': 'Native Integration',
    'AI 助手': 'AI Assistant',
    'AI 评审': 'AI Review',
    '自动化': 'Automation',
    'AI 治理': 'AI Governance',
    'AI 进化': 'AI Evolution',
    '交互体验': 'Interaction Experience',
    '开发者体验': 'Developer Experience',
    'AI 安全': 'AI Security',
    'AI 伦理': 'AI Ethics',
    'AI 质量': 'AI Quality',
    # 通用
    '确定要删除该规则吗？': 'Are you sure you want to delete this rule?',
    '数据源加载中...': 'Loading data sources...',
    '暂无数据源（请先在数据源管理中创建）': 'No data sources yet (create one in Data Source Management first)',
    '基本信息': 'Basic Information',
    '首页': 'Home',
    '当前页': 'Current page',
    '是': 'Yes',
    '否': 'No',
    '导出完成': 'Export completed',
    '导出中...': 'Exporting...',
    '导出': 'Export',
    '切换为卡片视图': 'Switch to card view',
    '切换为表格视图': 'Switch to table view',
    # CRM
    '合同创建失败': 'Contract creation failed',
    '合同创建成功': 'Contract created successfully',
    '合同删除失败': 'Contract deletion failed',
    '合同删除成功': 'Contract deleted successfully',
    '合同更新失败': 'Contract update failed',
    '合同更新成功': 'Contract updated successfully',
    '商机创建失败': 'Opportunity creation failed',
    '商机创建成功': 'Opportunity created successfully',
    '商机删除失败': 'Opportunity deletion failed',
    '商机删除成功': 'Opportunity deleted successfully',
    '商机更新失败': 'Opportunity update failed',
    '商机更新成功': 'Opportunity updated successfully',
    # Dashboard
    '环境健康安全管理系统': 'Environment, Health & Safety Management System',
    'EHS 安全管理': 'EHS Safety Management',
    '实验室信息管理系统': 'Laboratory Information Management System',
    'LIMS 实验室管理': 'LIMS Laboratory Management',
    '产品数据管理系统': 'Product Data Management System',
    'PDM 产品数据管理': 'PDM Product Data Management',
    '研发项目与文档管理': 'R&D Projects & Document Management',
    '研发管理': 'R&D Management',
    '供应商关系管理系统': 'Supplier Relationship Management System',
    'SRM 供应商管理': 'SRM Supplier Management',
    # dev_platform
    '暂无项目数据': 'No project data',
    '开发环境': 'Development environment',
    '生产环境': 'Production environment',
    '预发布环境': 'Staging environment',
    '个': 'items',
    '主题模式': 'Theme mode',
    '版本': 'Version',
    '已验证': 'Verified',
    '已安装插件': 'Installed plugins',
    '未启用': 'Not enabled',
    '已启用': 'Enabled',
    '流水线运行记录': 'Pipeline run history',
    '流水线': 'Pipeline',
    '状态': 'Status',
    '阶段': 'Stage',
    '耗时': 'Duration',
    '详情': 'Details',
    '快速运行': 'Quick run',
    '活动记录': 'Activity log',
    '从创建第一个项目开始': 'Start by creating your first project',
    # HRM
    '财务部': 'Finance Department',
    'HR 仪表盘': 'HR Dashboard',
    '人力资源部': 'Human Resources Department',
    '实习': 'Internship',
    '入职趋势': 'Onboarding trend',
    '正式': 'Regular',
    '技术部': 'Technology Department',
    '缺勤人数': 'Absence count',
    '通过': 'Approve',
    '已通过': 'Approved',
    '出勤人数': 'Attendance count',
    '出勤统计': 'Attendance statistics',
    '迟到人数': 'Late count',
    '驳回': 'Reject',
    '已驳回': 'Rejected',
    '员工总数': 'Total employees',
    '合同 ID 不能为空': 'Contract ID cannot be empty',
    '日薪': 'Daily salary',
    '员工': 'Employee',
    '时薪': 'Hourly salary',
    '实习协议': 'Internship agreement',
    '劳动合同': 'Labor contract',
    '月薪': 'Monthly salary',
    '外包合同': 'Outsourcing contract',
    '兼职协议': 'Part-time agreement',
    '项目合同': 'Project contract',
    '续签': 'Renew',
    '合同续签申请': 'Contract renewal application',
    '无固定期限': 'Indefinite term',
    '如无变化请留空': 'Leave blank if no change',
    '创建员工': 'Create employee',
    '部门': 'Department',
    '员工编号': 'Employee No.',
    '人力资源': 'Human Resources',
    '手机号': 'Mobile No.',
    '姓名': 'Name',
    '职位': 'Position',
    '已离职': 'Resigned',
    '员工 ID 不能为空': 'Employee ID cannot be empty',
    '中专/技校': 'Technical secondary school',
    '请假': 'Leave',
    '已终止': 'Terminated',
    '调岗': 'Transfer',
    '员工 ID 无效': 'Invalid employee ID',
    '待审批': 'Pending approval',
    '申请总数': 'Total applications',
    '申请 5 天年假': 'Applying for 5 days of annual leave',
    '平均绩效': 'Average performance',
    '部门人数分布': 'Department headcount distribution',
    '人力资源管理系统': 'HR Management System',
    '迟到 15 分钟': '15 minutes late',
    '李四的年假申请': "Li Si's annual leave application",
    '月度入职与离职': 'Monthly onboarding and turnover',
    '有待改进': 'Needs improvement',
    '新员工培训（第三期）': 'New hire training (Session 3)',
    '新员工王五入职': 'New hire Wang Wu onboarded',
    '薪资管理': 'Payroll management',
    '待审批请假': 'Pending leave',
    '绩效评估': 'Performance review',
    '技术高级前端工程师': 'Senior frontend engineer',
    '基本工资合计': 'Base salary total',
    '奖金': 'Bonus',
    '奖金合计': 'Bonus total',
    '计算工资': 'Calculate salary',
    '已计算': 'Calculated',
    '已发放': 'Distributed',
    '执行发放': 'Execute disbursement',
    '个人所得税': 'Individual income tax',
    '实发工资合计': 'Net salary total',
    '发放人数': 'Payment headcount',
    '待计算批次': 'Pending calculation batches',
    '待计算': 'Pending calculation',
    '晋升调薪': 'Promotion adjustment',
    '社保公积金': 'Social insurance & housing fund',
    '在职人数': 'Active headcount',
    '出勤率': 'Attendance rate',
    '平均薪资': 'Average salary',
    '平均司龄（天）': 'Average tenure (days)',
    '合同到期统计': 'Contract expiry statistics',
    '员工分析': 'Employee analysis',
    '已到期': 'Expired',
    '人力资源数据报表': 'HR Data Report',
    '最高薪资': 'Maximum salary',
    '5月': 'May',
    '最低薪资': 'Minimum salary',
    '新入职': 'New hire',
    '总览': 'Overview',
    '绩效奖金': 'Performance bonus',
    '占比（%）': 'Proportion (%)',
    '留存率（%）': 'Retention rate (%)',
    '薪资 15K 以上': 'Salary above 15K',
    '薪资分析': 'Salary analysis',
    '薪资 5K 以下': 'Salary below 5K',
    '薪资明细': 'Salary details',
    '薪资区间分布': 'Salary range distribution',
    '薪资结构分析': 'Salary structure analysis',
    '本季度': 'This quarter',
    '总课程数': 'Total courses',
    '总人数': 'Total headcount',
    '总记录数': 'Total records',
    '薪资总额': 'Total salary',
    '培训分析': 'Training analysis',
    '培训课程': 'Training course',
    '福利补贴': 'Welfare subsidy',
    '审批': 'Approval',
    '员工调薪管理': 'Employee salary adjustment management',
    '调薪': 'Salary adjustment',
    # intelligent_ops / qms / shared / system
    '涉及组件': 'Involved components',
    '创建应急预案': 'Create emergency plan',
    '严重': 'Critical',
    '信息': 'Info',
    '问题详情': 'Issue details',
    '请输入问题详情': 'Please enter issue details',
    '请输入数量': 'Please enter quantity',
    '数据加载失败': 'Failed to load data',
    '结束日期': 'End date',
    '开始日期': 'Start date',
}

SRC = 'apps/web/src/i18n/locales'

def collect(dirp):
    keys = {}
    for fn in os.listdir(dirp):
        if not fn.endswith('.json'): continue
        d = json.load(open(f'{dirp}/{fn}', encoding='utf-8'))
        def walk(o, prefix=''):
            if isinstance(o, dict):
                for k, v in o.items():
                    p = f'{prefix}.{k}' if prefix else k
                    if isinstance(v, dict): walk(v, p)
                    elif isinstance(v, str): keys[p] = v
        walk(d)
    return keys

zh = collect(f'{SRC}/zh')
en = collect(f'{SRC}/en')

# 被引用且 en 缺
used = set()
for root, _, files in os.walk(f'{SRC}/../..'):
    root = os.path.normpath(root)
    if 'node_modules' in root or 'locales' in root or '__tests__' in root: continue
    for fn in files:
        if not fn.endswith(('.tsx', '.ts')): continue
        try: s = open(os.path.join(root, fn), encoding='utf-8', errors='ignore').read()
        except Exception: continue
        for m in re.findall(r"(?:i18n\.t|t)\('([^']+)'\)", s): used.add(m)
        for m in re.findall(r'(?:i18n\.t|t)\("([^"]+)"\)', s): used.add(m)

missing_used = {k: zh[k] for k in zh if k not in en and k in used}
print(f'被引用缺失 key: {len(missing_used)}')

# 组: key -> (命名空间文件, key 尾段)
# en 文件按 key 前缀的顶层命名空间分组（扁平文件，key 完整路径）
from collections import defaultdict
by_file = defaultdict(dict)
untranslated = []
for k, zv in missing_used.items():
    ns = k.split('.')[0]
    ev = T.get(zv)
    if ev is None:
        untranslated.append((k, zv))
        continue
    by_file[ns][k] = ev

print(f'可翻译写入: {sum(len(v) for v in by_file.values())}, 缺翻译: {len(untranslated)}')
for k, v in untranslated: print('  NO-TRANS:', k, '=', v)

# 写入 en 对应文件（en/{ns}.json 若存在；否则 en.json）
for ns, entries in by_file.items():
    path = f'{SRC}/en/{ns}.json'
    if not os.path.exists(path):
        path = f'{SRC}/en.json'
        print(f'  (fallback to en.json for ns={ns})')
    d = json.load(open(path, encoding='utf-8'))
    added = 0
    for k, ev in entries.items():
        if k not in d:
            d[k] = ev
            added += 1
        else:
            # 已存在但值可能是假占位（Text xxx）——仅当 key 值不含真实英文时更新
            if d[k].startswith('Text ') or d[k] == '':
                d[k] = ev; added += 1
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'  wrote {added} keys -> {path}')
