#!/usr/bin/env python3
"""
Final i18n converter - safe and correct.
Handles: JSX text, JSX props, JSX expression props.
Uses range overlap detection to prevent corruption.
"""

import re
import json
import os

BASE = "/Users/air/TOPEMS/apps/web/src"
I18N_DIR = f"{BASE}/i18n/locales"
zh_path = os.path.join(I18N_DIR, 'zh.json')
en_path = os.path.join(I18N_DIR, 'en.json')

FILES = [
    f"{BASE}/pages/workflow/WorkflowApprovalDetailPage.tsx",
    f"{BASE}/pages/workflow/WorkflowVersionHistoryPage.tsx",
    f"{BASE}/pages/workflow/WorkflowDefinitionsPage.tsx",
    f"{BASE}/pages/workflow/WorkflowSettingsPage/components/GeneralSettings.tsx",
    f"{BASE}/pages/workflow/WorkflowSettingsPage/components/ApprovalSettings.tsx",
    f"{BASE}/pages/workflow/WorkflowSettingsPage/components/PermissionSettings.tsx",
    f"{BASE}/pages/workflow/WorkflowSettingsPage/components/IntegrationSettings.tsx",
    f"{BASE}/pages/workflow/WorkflowSettingsPage/components/FormSettings.tsx",
    f"{BASE}/pages/workflow/WorkflowSettingsPage/components/NotificationSettings.tsx",
    f"{BASE}/pages/workflow/WorkflowDashboardPage.tsx",
    f"{BASE}/pages/workflow/WorkflowMonitorPage.tsx",
    f"{BASE}/pages/workflow/WorkflowTemplatePage.tsx",
    f"{BASE}/pages/workflow/WorkflowDesignerPage.tsx",
    f"{BASE}/pages/pm/PmProjectDetailPage.tsx",
    f"{BASE}/pages/pm/PmTemplatePage.tsx",
    f"{BASE}/pages/pm/PmContractCreatePage.tsx",
    f"{BASE}/pages/pm/ProjectCreateWizardPage.tsx",
    f"{BASE}/pages/pm/ProjectMasterDetailPage.tsx",
    f"{BASE}/pages/pm/ProjectTaskKanbanPage.tsx",
    f"{BASE}/pages/pm/PmContractDetailPage.tsx",
    f"{BASE}/pages/pm/PmProjectCreatePage.tsx",
]

# Complete translation dictionary (exact match only - no substring replacement)
TRANSLATIONS = {
    "保存": "Save", "取消": "Cancel", "删除": "Delete", "编辑": "Edit",
    "创建": "Create", "导入": "Import", "导出": "Export", "刷新": "Refresh",
    "搜索": "Search", "添加": "Add", "移除": "Remove", "确认": "Confirm",
    "提交": "Submit", "返回": "Back", "关闭": "Close",
    "加载中": "Loading", "加载中...": "Loading...", "暂无数据": "No Data",
    "确定": "Confirm", "是": "Yes", "否": "No", "重试": "Retry",
    "错误": "Error", "成功": "Success", "警告": "Warning", "信息": "Info",
    "查看": "View", "复制": "Copy", "下载": "Download", "上传": "Upload",
    "更多": "More", "重置": "Reset", "展开": "Expand", "折叠": "Collapse",
    "全选": "Select All", "清除": "Clear", "应用": "Apply",
    "保存更改": "Save Changes", "放弃更改": "Discard Changes",
    "上一步": "Previous", "下一步": "Next",
    "操作": "Actions",
    "通过": "Approved", "拒绝": "Rejected",
    "已通过": "Approved", "已拒绝": "Rejected", "待审批": "Pending Approval",
    "已完成": "Done", "进行中": "In Progress", "已取消": "Cancelled",
    "已归档": "Archived", "暂停": "Paused", "启动": "Active",
    "高": "High", "中": "Medium", "低": "Low", "紧急": "Urgent",
    "加载审批详情失败": "Failed to load approval details",
    "处理审批失败": "Failed to process approval",
    "转办操作失败": "Delegate operation failed",
    "转办审批任务": "Delegate Approval Task",
    "将该审批任务转办给其他人员处理": "Delegate this approval task to another person",
    "当前任务": "Current Task",
    "转办目标人员": "Delegate Target",
    "请输入目标人员姓名或ID": "Enter target person name or ID",
    "转办原因": "Delegate Reason",
    "请输入转办原因": "Enter delegate reason",
    "确认转办": "Confirm Delegate",
    "提示": "Hint",
    "请输入拒绝原因": "Please enter rejection reason",
    "请输入转办目标人员": "Please enter target person to delegate",
    "审批信息": "Approval Information", "审批ID": "Approval ID",
    "任务名称": "Task Name", "节点ID": "Node ID",
    "审批类型": "Approval Type", "单人审批": "Single Approval",
    "会签审批": "Countersign Approval", "或签审批": "OR Sign Approval",
    "审批人": "Approver", "创建时间": "Created Time",
    "审批时间": "Approval Time", "超时时间": "Timeout Time",
    "审批意见": "Approval Comment", "审批记录": "Approval Records",
    "暂无审批记录": "No approval records",
    "状态变更": "Status Changed",
    "流程时间线": "Workflow Timeline",
    "完整流程审批轨迹追踪": "Complete workflow approval tracking",
    "流程尚未开始处理": "Workflow not yet started",
    "流程发起": "Workflow Initiated",
    "发起人": "Initiator",
    "审批通过": "Approval Approved", "审批拒绝": "Approval Rejected",
    "步骤": "Step", "当前待审批": "Pending Approval",
    "表单数据": "Form Data",
    "当前审批关联的表单数据": "Form data associated with this approval",
    "暂无关联表单数据": "No associated form data",
    "表单数据将在流程发起后自动填充": "Form data auto-filled after initiation",
    "委派": "Delegate", "审批详情": "Approval Details",
    "通过审批": "Approve", "拒绝审批": "Reject",
    "确认通过该审批任务": "Confirm to approve this task",
    "确认拒绝该审批任务": "Confirm to reject this task",
    "任务": "Task", "节点": "Node",
    "拒绝原因": "Rejection Reason", "备注": "Remarks",
    "可选备注": "Optional remarks",
    "确认通过": "Confirm Approve", "确认拒绝": "Confirm Reject",
    "已转办给": "Delegated to",
    "版本历史": "Version History", "创建版本": "Create Version",
    "发布版本": "Publish Version", "回滚版本": "Rollback Version",
    "删除版本": "Delete Version", "版本号": "Version No.",
    "变更说明": "Change Description", "选择版本": "Select Version",
    "取消选择": "Cancel Selection", "当前版本": "Current Version",
    "创建新版本": "Create New Version",
    "版本信息": "Version Information",
    "请输入版本号": "Enter version number",
    "请输入变更描述": "Enter change description",
    "版本创建成功": "Version created successfully",
    "确认回滚到版本": "Confirm rollback to version",
    "此操作将回滚到指定版本，当前版本将被覆盖": "This will rollback to the specified version, current version will be overwritten",
    "回滚成功": "Rollback successful", "回滚失败": "Rollback failed",
    "版本发布成功": "Version published successfully",
    "版本删除成功": "Version deleted successfully",
    "是否确认删除版本": "Confirm delete version",
    "删除后不可恢复，确认继续": "Cannot be restored after deletion, confirm to continue",
    "无变更说明": "No change description",
    "查看详情": "View Details",
    "版本": "Version", "状态": "Status",
    "创建者": "Creator", "更新时间": "Updated Time",
    "全部版本": "All Versions", "已发布": "Published",
    "草稿": "Draft", "已归档": "Archived", "已禁用": "Disabled",
    "激活": "Activate", "激活版本": "Activate Version",
    "版本激活成功": "Version activated successfully",
    "版本已激活": "Version activated", "版本已禁用": "Version disabled",
    "禁用版本": "Disable Version",
    "流程定义": "Workflow Definition", "流程名称": "Workflow Name",
    "流程分类": "Workflow Category", "流程编码": "Workflow Code",
    "流程描述": "Workflow Description",
    "创建流程": "Create Workflow",
    "搜索流程": "Search workflow",
    "全部状态": "All Status", "全部分类": "All Categories",
    "编辑流程": "Edit Workflow", "复制流程": "Copy Workflow",
    "删除流程": "Delete Workflow", "激活流程": "Activate Workflow",
    "禁用流程": "Disable Workflow", "设计流程": "Design Workflow",
    "查看实例": "View Instances", "流程详情": "Workflow Details",
    "确认删除流程": "Confirm delete workflow",
    "流程创建成功": "Workflow created successfully",
    "请输入流程名称": "Enter workflow name",
    "设计": "Design", "实例": "Instances",
    "基础参数": "Basic Parameters", "流程控制": "Flow Control",
    "自动审批": "Auto Approval",
    "启用状态": "Enable Status",
    "自动启用新版本": "Auto enable new version",
    "允许并行审批": "Allow parallel approval",
    "超时动作": "Timeout Action", "自动通过": "Auto approve",
    "自动拒绝": "Auto reject", "自动转办": "Auto delegate",
    "分钟": "minutes", "小时": "hours", "天": "days",
    "通用设置": "General Settings", "高级设置": "Advanced Settings",
    "保存设置": "Save Settings",
    "设置保存成功": "Settings saved successfully",
    "审批策略": "Approval Strategy", "审批模式": "Approval Mode",
    "审批人配置": "Approver Configuration",
    "添加审批人": "Add Approver", "移除审批人": "Remove Approver",
    "选择审批人": "Select Approver", "超时设置": "Timeout Settings",
    "允许加签": "Allow Adding Signer", "允许减签": "Allow Removing Signer",
    "允许转办": "Allow Delegate", "允许撤回": "Allow Withdraw",
    "审批完成条件": "Approval Completion Condition",
    "全部审批人同意": "All approvers agree",
    "任一审批人同意": "Any approver agrees",
    "流程权限": "Workflow Permissions", "审批规则": "Approval Rules",
    "权限配置": "Permission Configuration",
    "添加规则": "Add Rule", "移除规则": "Remove Rule",
    "角色": "Role", "部门": "Department", "人员": "Person",
    "全部数据": "All Data", "本部门": "This Department",
    "本部门及以下": "This Department & Below", "仅本人": "Self Only",
    "自定义": "Custom",
    "查看权限": "View Permission", "编辑权限": "Edit Permission",
    "删除权限": "Delete Permission", "审批权限": "Approval Permission",
    "回调配置": "Callback Configuration",
    "外部系统对接": "External System Integration",
    "回调URL": "Callback URL", "请求方式": "Request Method",
    "认证方式": "Authentication Method", "无认证": "No Auth",
    "请求头": "Request Headers", "请求参数": "Request Parameters",
    "添加头": "Add Header", "添加参数": "Add Parameter",
    "表单字段": "Form Fields", "附件设置": "Attachment Settings",
    "属性配置": "Property Configuration",
    "添加字段": "Add Field", "移除字段": "Remove Field",
    "字段名称": "Field Name", "字段类型": "Field Type",
    "显示名称": "Display Name", "绑定字段": "Bound Field",
    "控件类型": "Control Type", "单行文本": "Single Line Text",
    "多行文本": "Multi Line Text", "数字": "Number",
    "日期": "Date", "时间": "Time", "下拉选择": "Dropdown",
    "单选": "Radio", "复选框": "Checkbox",
    "文件上传": "File Upload", "用户选择": "User Picker",
    "部门选择": "Department Picker", "是否必填": "Required",
    "是否启用": "Enabled", "默认值": "Default Value",
    "占位符": "Placeholder", "最大长度": "Max Length",
    "是否支持附件": "Supports Attachments",
    "允许的文件类型": "Allowed File Types",
    "最大文件大小": "Max File Size",
    "通知渠道": "Notification Channels",
    "通知场景": "Notification Scenarios",
    "邮件通知": "Email Notification", "短信通知": "SMS Notification",
    "站内通知": "In-app Notification",
    "流程发起通知": "Workflow Initiation Notification",
    "流程完成通知": "Workflow Completion Notification",
    "流程超时通知": "Workflow Timeout Notification",
    "审批待办通知": "Approval Pending Notification",
    "审批结果通知": "Approval Result Notification",
    "抄送通知": "CC Notification", "系统通知": "System Notification",
    "启用邮件通知": "Enable Email Notification",
    "启用短信通知": "Enable SMS Notification",
    "启用站内通知": "Enable In-app Notification",
    "收件人": "Recipient", "抄送人": "CC Recipient",
    "通知模板": "Notification Template",
    "运行中流程": "Running Workflows",
    "待我审批": "Pending My Approval",
    "我已审批": "My Approved", "我已发起": "My Initiated",
    "异常流程": "Exception Workflows",
    "总流程数": "Total Workflows", "今日新增": "Today's New",
    "本周统计": "This Week's Stats", "本月统计": "This Month's Stats",
    "通过率": "Approval Rate",
    "我的待办": "My Todo", "快速操作": "Quick Actions",
    "新建流程": "New Workflow", "查看全部": "View All",
    "仪表盘": "Dashboard", "工作台": "Workspace",
    "数据概览": "Data Overview",
    "今日": "Today", "本周": "This Week", "本月": "This Month",
    "异常实例数": "Exception Instances",
    "超时实例": "Timeout Instances",
    "运行时长": "Runtime Duration",
    "执行次数": "Execution Count",
    "成功率": "Success Rate",
    "实例监控": "Instance Monitor",
    "流程实例": "Workflow Instance", "当前状态": "Current Status",
    "启动时间": "Start Time", "结束时间": "End Time",
    "处理人": "Handler",
    "批量重试": "Batch Retry", "批量终止": "Batch Terminate",
    "重试": "Retry", "终止": "Terminate",
    "查看实例": "View Instance",
    "监控概览": "Monitoring Overview",
    "实时监控": "Real-time Monitoring",
    "历史监控": "Historical Monitoring",
    "告警配置": "Alert Configuration",
    "模板名称": "Template Name", "模板类型": "Template Type",
    "模板分类": "Template Category", "模板描述": "Template Description",
    "创建模板": "Create Template",
    "使用模板": "Use Template", "复制模板": "Copy Template",
    "删除模板": "Delete Template", "编辑模板": "Edit Template",
    "模板列表": "Template List",
    "搜索模板": "Search template",
    "请输入模板名称": "Enter template name",
    "请输入模板编码": "Enter template code",
    "模板编码": "Template Code",
    "保存工作流": "Save Workflow",
    "工作流名称": "Workflow Name", "工作流编码": "Workflow Code",
    "工作流设计器": "Workflow Designer",
    "画布": "Canvas", "属性面板": "Properties Panel",
    "节点库": "Node Library", "保存并发布": "Save & Publish",
    "预览": "Preview", "撤销": "Undo", "重做": "Redo",
    "放大": "Zoom In", "缩小": "Zoom Out",
    "重置视图": "Reset View", "自动布局": "Auto Layout",
    "新建工作流": "New Workflow",
    "请输入工作流名称": "Enter workflow name",
    "请输入工作流编码": "Enter workflow code",
    "开始节点": "Start Node", "审批节点": "Approval Node",
    "抄送节点": "CC Node", "条件分支": "Conditional Branch",
    "并行分支": "Parallel Branch", "结束节点": "End Node",
    "连接线": "Connection", "审批配置": "Approval Configuration",
    "节点属性": "Node Properties", "表单绑定": "Form Binding",
    "通知配置": "Notification Configuration",
    "保存成功": "Saved successfully", "保存失败": "Save failed",
    "发布成功": "Published successfully", "发布失败": "Publish failed",
    "草稿已保存": "Draft saved", "校验失败": "Validation failed",
    "请完善所有必填项": "Please fill all required fields",
    "属性编辑": "Property Editor",
    "节点类型": "Node Type",
    "条件表达式": "Condition Expression",
    "默认分支": "Default Branch", "分支条件": "Branch Condition",
    "基本信息": "Basic Information", "关键指标": "Key Metrics",
    "项目进度": "Project Progress", "项目成员": "Project Members",
    "项目风险": "Project Risks", "项目里程碑": "Project Milestones",
    "项目任务": "Project Tasks", "项目概览": "Project Overview",
    "项目详情": "Project Details", "负责人": "Assignee",
    "项目状态": "Project Status", "项目类型": "Project Type",
    "项目预算": "Project Budget", "已使用": "Used",
    "剩余": "Remaining", "总任务数": "Total Tasks",
    "已完成任务": "Completed Tasks", "进行中任务": "In Progress Tasks",
    "逾期任务": "Overdue Tasks", "总工时": "Total Work Hours",
    "项目编号": "Project Code", "项目名称": "Project Name",
    "项目描述": "Project Description", "创建项目": "Create Project",
    "编辑项目": "Edit Project", "删除项目": "Delete Project",
    "统计概览": "Statistics Overview",
    "进度": "Progress",
    "已完成": "Done",
    "已取消": "Cancelled",
    "已归档": "Archived",
    "甘特图": "Gantt Chart", "看板": "Kanban",
    "日历": "Calendar", "列表": "List", "报表": "Report",
    "风险等级": "Risk Level",
    "添加成员": "Add Member", "移除成员": "Remove Member",
    "添加里程碑": "Add Milestone", "添加任务": "Add Task",
    "确认删除项目": "Confirm delete project",
    "项目创建成功": "Project created successfully",
    "项目更新成功": "Project updated successfully",
    "项目删除成功": "Project deleted successfully",
    "项目成本": "Project Cost",
    "人工成本": "Labor Cost", "其他成本": "Other Cost",
    "分包成本": "Subcontract Cost",
    "研发项目模板": "R&D Project Template",
    "施工项目模板": "Construction Project Template",
    "采购项目模板": "Procurement Project Template",
    "市场项目模板": "Marketing Project Template",
    "实施项目模板": "Implementation Project Template",
    "适用场景": "Use Case", "创建方式": "Creation Method",
    "从模板创建": "Create from Template", "空白创建": "Blank Creation",
    "项目模板": "Project Template",
    "请输入模板描述": "Enter template description",
    "模板创建成功": "Template created successfully",
    "模板复制成功": "Template copied successfully",
    "模板删除成功": "Template deleted successfully",
    "模板更新成功": "Template updated successfully",
    "合同编号": "Contract No.", "合同名称": "Contract Name",
    "合同类型": "Contract Type", "合同状态": "Contract Status",
    "合同金额": "Contract Amount", "合同方": "Contract Party",
    "甲方": "Party A", "乙方": "Party B",
    "签订日期": "Sign Date", "生效日期": "Effective Date",
    "到期日期": "Expiry Date", "合同创建": "Contract Creation",
    "合同条款": "Contract Terms", "付款方式": "Payment Method",
    "附件": "Attachments", "上传附件": "Upload Attachment",
    "请输入合同编号": "Enter contract no.",
    "请输入合同名称": "Enter contract name",
    "请选择合同类型": "Select contract type",
    "请输入合同金额": "Enter contract amount",
    "合同创建成功": "Contract created successfully",
    "合同条款不能为空": "Contract terms cannot be empty",
    "分期付款": "Installment",
    "项目配置": "Project Configuration",
    "负责人配置": "Assignee Configuration",
    "确认创建": "Confirm Creation",
    "项目分类": "Project Category",
    "请输入项目名称": "Enter project name",
    "请输入项目编号": "Enter project code",
    "请选择项目类型": "Select project type",
    "请选择项目负责人": "Select project manager",
    "请选择项目成员": "Select project members",
    "请选择开始日期": "Select start date",
    "请选择结束日期": "Select end date",
    "项目名称不能为空": "Project name cannot be empty",
    "项目编号不能为空": "Project code cannot be empty",
    "请完善所有必填信息": "Please fill all required information",
    "配置项目成员": "Configure Project Members",
    "选择项目模板": "Select Project Template",
    "项目总览": "Project Overview",
    "子项目": "Sub Projects",
    "项目报表": "Project Reports", "项目设置": "Project Settings",
    "优先级": "Priority", "时间范围": "Time Range",
    "项目列表": "Project List", "预算": "Budget",
    "待办": "To Do",
    "待办列": "To Do Column", "进行中列": "In Progress Column",
    "已完成列": "Done Column", "已取消列": "Cancelled Column",
    "任务看板": "Task Kanban", "看板视图": "Kanban View",
    "甘特视图": "Gantt View", "列表视图": "List View",
    "任务标题": "Task Title",
    "截止日期": "Due Date",
    "创建任务": "Create Task",
    "编辑任务": "Edit Task", "删除任务": "Delete Task",
    "拖动排序": "Drag to reorder", "总数": "Total",
    "逾期": "Overdue",
    "任务创建成功": "Task created successfully",
    "任务更新成功": "Task updated successfully",
    "任务删除成功": "Task deleted successfully",
    "确认删除任务": "Confirm delete task",
    "合同概览": "Contract Overview",
    "合同里程碑": "Contract Milestones",
    "付款计划": "Payment Plan",
    "合同附件": "Contract Attachments",
    "已支付金额": "Paid Amount",
    "剩余金额": "Remaining Amount",
    "项目关联": "Project Association",
    "关联项目": "Associated Project",
    "添加里程碑": "Add Milestone", "添加付款": "Add Payment",
    "编辑合同": "Edit Contract", "删除合同": "Delete Contract",
    "合同更新成功": "Contract updated successfully",
    "合同删除成功": "Contract deleted successfully",
    "确认删除合同": "Confirm delete contract",
    "里程碑": "Milestone", "付款节点": "Payment Node",
    "金额": "Amount", "日期": "Date",
    "已付款": "Paid", "待付款": "Pending Payment",
}

def sanitize_key(text):
    text = re.sub(r'[^\w]', '_', text)
    text = re.sub(r'_+', '_', text)
    text = text.strip('_')
    if not text:
        text = 'text'
    return text.lower()

def get_namespace(filepath):
    basename = os.path.basename(filepath)
    if '/workflow/' in filepath:
        if 'ApprovalDetail' in basename: return 'workflow.approvalDetail'
        if 'VersionHistory' in basename: return 'workflow.versionHistory'
        if 'Definitions' in basename: return 'workflow.definitions'
        if 'Dashboard' in basename: return 'workflow.dashboard'
        if 'Monitor' in basename: return 'workflow.monitor'
        if 'Template' in basename: return 'workflow.template'
        if 'Designer' in basename: return 'workflow.designer'
        if 'Settings' in basename:
            if 'General' in filepath: return 'workflow.settings.general'
            if 'Approval' in filepath: return 'workflow.settings.approval'
            if 'Permission' in filepath: return 'workflow.settings.permission'
            if 'Integration' in filepath: return 'workflow.settings.integration'
            if 'Form' in filepath: return 'workflow.settings.form'
            if 'Notification' in filepath: return 'workflow.settings.notification'
            return 'workflow.settings'
        return 'workflow'
    elif '/pm/' in filepath:
        if 'ProjectDetail' in basename: return 'pm.projectDetail'
        if 'Template' in basename: return 'pm.template'
        if 'ContractCreate' in basename: return 'pm.contractCreate'
        if 'ContractDetail' in basename: return 'pm.contractDetail'
        if 'CreateWizard' in basename: return 'pm.projectWizard'
        if 'MasterDetail' in basename: return 'pm.masterDetail'
        if 'TaskKanban' in basename: return 'pm.taskKanban'
        if 'ProjectCreate' in basename: return 'pm.projectCreate'
        return 'pm'
    return 'common'

def build_nested_dict(flat_dict):
    result = {}
    for key, value in flat_dict.items():
        parts = key.split('.')
        current = result
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                current[part] = value
            else:
                if part not in current:
                    current[part] = {}
                current = current[part]
    return result

def deep_merge(base, override):
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            deep_merge(base[key], value)
        else:
            base[key] = value

def ranges_overlap(s1, e1, s2, e2):
    """Check if two ranges overlap or are adjacent."""
    return not (e2 <= s1 or e1 <= s2)

def process_file(filepath):
    if not os.path.exists(filepath):
        return 0, 0

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    namespace = get_namespace(filepath)
    local_zh = {}
    local_en = {}

    # Step 1: Add import
    has_import = 'import { useTranslation } from "react-i18next"' in content or \
                 "import { useTranslation } from 'react-i18next'" in content
    if not has_import:
        lines = content.split('\n')
        last_idx = max(i for i, l in enumerate(lines) if l.strip().startswith('import '))
        lines.insert(last_idx + 1, 'import { useTranslation } from "react-i18next";')
        content = '\n'.join(lines)

    # Step 2: Add hook
    has_hook = 'const { t } = useTranslation(' in content
    if not has_hook:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if re.search(r'=\s*\(\)\s*=>\s*\{', line.strip()):
                indent = ' ' * (len(line) - len(line.lstrip()))
                lines.insert(i + 1, f'{indent}  const {{ t }} = useTranslation();')
                content = '\n'.join(lines)
                break

    if not has_import or not has_hook:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 3: Collect replacements with overlap detection
    candidates = []  # (start, end, replacement, priority)
    
    prop_names = r'(?:label|title|placeholder|description|tooltip|emptyText|message|text|header|footer|confirmText|cancelText|okText|errorText|successText|warningText|infoText|alt|badge|subtitle)'

    # Pattern A: JSX text: >文本<
    for m in re.finditer(r'>\s*([^<>{}]*[\u4e00-\u9fff][^<>{}]*)\s*<', content):
        text = m.group(1).strip()
        if text in TRANSLATIONS:
            key = f"{namespace}.{sanitize_key(text)}"
            local_zh[key] = text
            local_en[key] = TRANSLATIONS[text]
            candidates.append((m.start(), m.end(), ">{t('" + key + "')}<", 1))

    # Pattern B: JSX string props: prop="文本"
    for m in re.finditer(prop_names + r'\s*=\s*"([^"]*[\u4e00-\u9fff][^"]*)"', content):
        text = m.group(1)
        if text in TRANSLATIONS:
            key = f"{namespace}.{sanitize_key(text)}"
            local_zh[key] = text
            local_en[key] = TRANSLATIONS[text]
            full = m.group(0)
            prop = full[:full.index('=')]
            candidates.append((m.start(), m.end(), prop + "={t('" + key + "')}", 2))

    # Pattern C: JSX string props: prop='文本'
    for m in re.finditer(prop_names + r"\s*=\s*'([^']*[\u4e00-\u9fff][^']*)'", content):
        text = m.group(1)
        if text in TRANSLATIONS:
            key = f"{namespace}.{sanitize_key(text)}"
            local_zh[key] = text
            local_en[key] = TRANSLATIONS[text]
            full = m.group(0)
            prop = full[:full.index('=')]
            candidates.append((m.start(), m.end(), prop + "={t('" + key + "')}", 2))

    # Pattern D: JSX expression props: prop={'文本'}
    for m in re.finditer(prop_names + r"\s*=\s*\{\s*'([^']*[\u4e00-\u9fff][^']*)'\s*\}", content):
        text = m.group(1)
        if text in TRANSLATIONS:
            key = f"{namespace}.{sanitize_key(text)}"
            local_zh[key] = text
            local_en[key] = TRANSLATIONS[text]
            full = m.group(0)
            prop = full[:full.index('=')]
            candidates.append((m.start(), m.end(), prop + "={t('" + key + "')}", 2))

    # Pattern E: Object property values: { label: '文本' }
    for m in re.finditer(r'(?:label|title|placeholder|description|tooltip|emptyText|message|text)\s*:\s*[\'"]([^\'"]*[\u4e00-\u9fff][^\'"]*)[\'"]', content):
        text = m.group(1)
        if text in TRANSLATIONS:
            key = f"{namespace}.{sanitize_key(text)}"
            local_zh[key] = text
            local_en[key] = TRANSLATIONS[text]
            full = m.group(0)
            prop = full[:full.index(':')]
            candidates.append((m.start(), m.end(), prop + ": t('" + key + "')", 3))

    # Sort by priority (higher first), then by position (right to left)
    candidates.sort(key=lambda x: (-x[3], -x[0]))
    
    # Build final list with overlap detection
    final = []
    for start, end, repl, prio in candidates:
        overlaps = False
        for fs, fe, fr in final:
            if ranges_overlap(start, end, fs, fe):
                overlaps = True
                break
        if not overlaps:
            final.append((start, end, repl))

    # Apply right to left
    final.sort(key=lambda x: -x[0])
    for start, end, repl in final:
        content = content[:start] + repl + content[end:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    return len(final), len(local_zh)


# Process all files
total_r = 0
total_k = 0
all_zh = {}
all_en = {}
for filepath in FILES:
    r, k = process_file(filepath)
    total_r += r
    total_k += k

print(f"Processed 21 files: {total_r} replacements, {total_k} unique keys")

# Now collect all keys from the processed files
zh_used = {}
en_used = {}
for filepath in FILES:
    namespace = get_namespace(filepath)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    # Build a reverse lookup for this namespace
    ns_translations = {}
    for zh, en in TRANSLATIONS.items():
        key = f"{namespace}.{sanitize_key(zh)}"
        ns_translations[key] = (zh, en)
    
    for m in re.finditer(r"t\('([^']+)'\)", content):
        key = m.group(1)
        if key in ns_translations:
            zh_used[key] = ns_translations[key][0]
            en_used[key] = ns_translations[key][1]
        elif key not in zh_used:
            zh_used[key] = key
            en_used[key] = key

zh_nested = build_nested_dict(zh_used)
en_nested = build_nested_dict(en_used)

# Read existing
existing_zh = {}
existing_en = {}
if os.path.exists(zh_path):
    with open(zh_path, 'r', encoding='utf-8') as f:
        existing_zh = json.load(f)
if os.path.exists(en_path):
    with open(en_path, 'r', encoding='utf-8') as f:
        existing_en = json.load(f)

deep_merge(existing_zh, zh_nested)
deep_merge(existing_en, en_nested)

with open(zh_path, 'w', encoding='utf-8') as f:
    json.dump(existing_zh, f, ensure_ascii=False, indent=2)
with open(en_path, 'w', encoding='utf-8') as f:
    json.dump(existing_en, f, ensure_ascii=False, indent=2)

print(f"Written {len(zh_used)} keys to zh.json and en.json")

# Check for missing translations
missing = []
for key in zh_used:
    if key not in en_used or en_used[key] == zh_used.get(key):
        missing.append(key)
if missing:
    print(f"\nMissing translations ({len(missing)}):")
    for k in missing[:20]:
        print(f"  {k}: '{zh_used[k]}'")
    if len(missing) > 20:
        print(f"  ... and {len(missing) - 20} more")