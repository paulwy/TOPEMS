#!/usr/bin/env python3
"""
Fix Chinese comments in schemas files.
Translates Chinese comment text to English while preserving Chinese in backend values.
Only modifies comment lines (lines starting with *, //, /*, or */).
"""

import os
import re
import sys
from pathlib import Path

SCHEMAS_DIR = "/Users/air/TOPEMS/apps/web/src/schemas"

TRANSLATIONS = {
    # Schema name -> English
    "用户管理": "User Management",
    "物料管理": "Material Management",
    "银行账户管理": "Bank Account Management",
    "资产管理": "Asset Management",
    "车辆管理": "Vehicle Management",
    "办公用品管理": "Office Supplies Management",
    "客户管理": "Customer Management",
    "供应商管理": "Supplier Management",
    "凭证管理": "Voucher Management",
    "公告管理": "Announcement Management",
    "插件管理": "Plugin Management",
    "数据迁移管理": "Data Migration Management",
    "会计科目管理": "Accounting Subject Management",
    "费用审批": "Expense Approval",
    "采购合同评审流程": "Purchase Contract Review Process",
    "客户分群": "Customer Segmentation",
    "审批配置": "Approval Configuration",
    "客户推荐": "Customer Recommendation",
    "商机管理": "Opportunity Management",
    "客户评分": "Customer Scoring",
    "联系人管理": "Contact Management",
    "数据映射": "Data Mapping",
    "集成事件": "Integration Events",
    "集成连接": "Integration Connections",
    "仓库管理": "Warehouse Management",
    "告警规则": "Alert Rule",
    "告警历史": "Alert History",
    "系统日志": "System Log",
    "通知渠道": "Notification Channel",
    "仪器管理": "Instrument Management",
    "检测任务": "Detection Task",
    "仪器维护记录": "Instrument Maintenance Record",
    "样品管理": "Sample Management",
    "检测方法管理": "Test Method Management",
    "条码管理": "Barcode Management",
    "检验任务": "Inspection Task",
    "入库订单": "Inbound Order",
    "出库订单": "Outbound Order",
    "库位": "Location",
    "8D 报告": "8D Report",
    "告警": "Alert",
    "订单": "Order",

    # Full "驱动" phrases - longer matches first
    "驱动 MigrationAdminPage 的服务列表": "drives the service list of MigrationAdminPage",
    "驱动 IntegrationMappingsPage 的 CrudPage": "drives the CrudPage of IntegrationMappingsPage",
    "驱动 IntegrationEventsPage 的 CrudPage": "drives the CrudPage of IntegrationEventsPage",
    "驱动 IntegrationConnectionsPage 的 CrudPage": "drives the CrudPage of IntegrationConnectionsPage",
    "驱动 MonitorLogsPage 的 CrudPage": "drives the CrudPage of MonitorLogsPage",
    "驱动 MonitorNotificationPage 的 CrudPage": "drives the CrudPage of MonitorNotificationPage",
    "驱动 MonitorAlertHistoryPage 的 CrudPage": "drives the CrudPage of MonitorAlertHistoryPage",
    "驱动 MonitorAlertsPage 的 CrudPage": "drives the CrudPage of MonitorAlertsPage",
    "驱动 AlertRulesPage 的完整 CRUD": "drives the full CRUD of AlertRulesPage",
    "驱动 UserManagementPage 的完整 CRUD": "drives the full CRUD of UserManagementPage",
    "驱动 MaterialManagementPage 的完整 CRUD": "drives the full CRUD of MaterialManagementPage",
    "驱动 BankAccountPage 的完整 CRUD": "drives the full CRUD of BankAccountPage",
    "驱动 AssetManagementPage 的完整 CRUD": "drives the full CRUD of AssetManagementPage",
    "驱动 VehiclePage 的完整 CRUD": "drives the full CRUD of VehiclePage",
    "驱动 OfficeSuppliesPage 的完整 CRUD": "drives the full CRUD of OfficeSuppliesPage",
    "驱动 CustomerManagementPage 的完整 CRUD": "drives the full CRUD of CustomerManagementPage",
    "驱动 SupplierManagementPage 的完整 CRUD": "drives the full CRUD of SupplierManagementPage",
    "驱动 VoucherManagementPage 的完整 CRUD": "drives the full CRUD of VoucherManagementPage",
    "驱动 AnnouncementPage 的完整 CRUD": "drives the full CRUD of AnnouncementPage",
    "驱动 BankAccountManagementPage 的完整 CRUD": "drives the full CRUD of BankAccountManagementPage",
    "驱动 AccountManagementPage 的完整 CRUD": "drives the full CRUD of AccountManagementPage",
    "驱动费用审批流程的完整 CRUD": "drives the full CRUD of the expense approval process",
    "驱动 QmsApqpPage 的完整 CRUD": "drives the full CRUD of QmsApqpPage",
    "驱动 QmsEightDPage 的完整 CRUD": "drives the full CRUD of QmsEightDPage",
    "驱动 WarehouseManagementPage 的完整 CRUD": "drives the full CRUD of WarehouseManagementPage",
    "驱动 LimsTaskPage 的完整 CRUD": "drives the full CRUD of LimsTaskPage",
    "驱动 LimsTestMethodPage 的完整 CRUD": "drives the full CRUD of LimsTestMethodPage",
    "驱动 LimsInstrumentMaintenancePage 的完整 CRUD": "drives the full CRUD of LimsInstrumentMaintenancePage",
    "驱动 SampleReceivePage 的完整 CRUD": "drives the full CRUD of SampleReceivePage",
    "驱动 BarcodePage 的完整 CRUD": "drives the full CRUD of BarcodePage",
    "驱动 InspectionTaskPage 的完整 CRUD": "drives the full CRUD of InspectionTaskPage",
    "驱动 InboundOrderPage 的完整 CRUD": "drives the full CRUD of InboundOrderPage",
    "驱动 ContactManagementPage 的完整 CRUD": "drives the full CRUD of ContactManagementPage",
    "驱动 OpportunityManagementPage 的完整 CRUD": "drives the full CRUD of OpportunityManagementPage",
    "驱动 InstrumentPage 的完整 CRUD": "drives the full CRUD of InstrumentPage",
    "驱动 CRMCustomerSegmentationPage 的列表与新建分群表单": "drives the list and new segmentation form of CRMCustomerSegmentationPage",
    "驱动 CRMRecommendationPage 的列表与生成推荐表单": "drives the list and generate recommendation form of CRMRecommendationPage",
    "驱动 CRMCustomerScoringPage 的列表与详情展示": "drives the list and detail display of CRMCustomerScoringPage",
    "驱动 PluginManagementPage 的列表展示": "drives the list display of PluginManagementPage",
    "驱动 FinanceApprovalConfigPage 的 CRUD": "drives the CRUD of FinanceApprovalConfigPage",

    # Feature descriptions (longer first)
    "包含动态选项（角色列表）、批量操作、状态徽章等高级功能": "Includes dynamic options (role list), batch operations, status badges and other advanced features",
    "包含表单分组、状态徽章、多筛选条件等高级功能": "Includes form grouping, status badges, multi-condition filtering and other advanced features",
    "包含表单分组、状态徽章、筛选、自定义头部统计等高级功能": "Includes form grouping, status badges, filtering, custom header statistics and other advanced features",
    "包含表单分组、状态徽章、筛选等高级功能": "Includes form grouping, status badges, filtering and other advanced features",

    # Support descriptions (longer first)
    "支持列表展示、详情查看、确认/解决操作、批量处理等": "Supports list display, detail view, confirm/resolve operations, batch processing etc.",
    "支持列表展示、详情查看、确认/解决操作，以及丰富的统计信息": "Supports list display, detail view, confirm/resolve operations, and rich statistical information",
    "支持列表展示、创建、编辑、删除、测试通知等操作": "Supports list display, creation, editing, deletion, test notification and other operations",
    "支持列表展示、创建、编辑、删除、筛选，支持多级科目结构": "Supports list display, creation, editing, deletion, filtering, and multi-level subject structures",
    "支持列表展示、创建、编辑、删除、筛选等操作": "Supports list display, creation, editing, deletion, filtering and other operations",
    "支持列表展示、详情查看、批量删除、导出等操作": "Supports list display, detail view, batch delete, export and other operations",
    "支持列表展示、创建、编辑、删除等操作": "Supports list display, creation, editing, deletion and other operations",
    "支持创建、编辑、删除、测试等完整 CRUD 操作": "Supports full CRUD operations including creation, editing, deletion, and testing",
    "支持创建、编辑、删除、启停、导入导出等操作": "Supports creation, editing, deletion, enable/disable, import/export and other operations",
    "支持详情查看与失败任务重试": "Supports detail view and retry of failed tasks",
    "支持按事件类型、状态筛选": "supports filtering by event type and status",

    # Split-line support (for multi-line comments)
    "支持创建、编辑、": "Supports creation, editing,",
    "删除、测试等完整 CRUD 操作。": "deletion, testing and other full CRUD operations.",

    # Other descriptions
    "不再需要在页面组件中重复定义": "No need to redefine in page components",
    "一个文件定义列表列、表单字段、筛选、状态徽章": "One file defines list columns, form fields, filters, status badges",
    "加载可用的上级科目（仅总账科目）": "Load available parent subjects (general ledger subjects only)",
    "加载角色列表（动态选项）": "Load role list (dynamic options)",
    "启用/禁用/升级/卸载等操作由页面通过 customRowActions 注入": "Enable/disable/upgrade/uninstall operations are injected by the page via customRowActions",
    "插件通过市场安装，不支持直接创建/编辑/删除": "Plugins are installed through the market, direct create/edit/delete is not supported",
    "节点编辑通过自定义弹窗处理": "Node editing is handled through custom modals",
    "审批节点（ApprovalNode）作为详情视图中的子表格展示": "ApprovalNode is displayed as a sub-table in the detail view",
    "管理字段映射、数据转换、数据过滤、数据验证规则": "Manages field mapping, data transformation, data filtering, data validation rules",
    "管理 ERP/CRM/SCM/WMS/MES 等外部系统连接": "Manages external system connections (ERP/CRM/SCM/WMS/MES)",
    "列表展示由页面的 customColumns 提供（含 Chip / 进度条等自定义渲染）": "List display is provided by the page's customColumns (including custom rendering such as Chip / progress bar)",
    "列表展示由页面的 customColumns 提供（含等级徽章 / 趋势图标等自定义渲染）": "List display is provided by the page's customColumns (including custom rendering such as level badges / trend icons)",
    "列表展示由页面的 customColumns 提供（含分群条件摘要等自定义渲染）": "List display is provided by the page's customColumns (including custom rendering such as segmentation condition summary)",
    "列表展示集成同步事件日志": "List display integrates synchronous event logs",
    "评分为系统自动计算结果，仅支持列表查看与详情展示": "Scores are automatically calculated by the system, only list view and detail display are supported",
    "Schema 字段仅描述新建分群所需表单字段": "Schema fields only describe form fields needed for creating new segments",
    "Schema 字段仅描述生成推荐所需表单字段": "Schema fields only describe form fields needed for generating recommendations",
    "CRUD 操作由页面通过 customRowActions 与自定义弹窗接管": "CRUD operations are handled by the page through customRowActions and custom modals",
    "税务记录为聚合数据，不支持标准 CRUD（仅自定义行操作）": "Tax records are aggregated data, standard CRUD is not supported (custom row operations only)",

    # CrudPage usage descriptions
    "使用 CrudPage 组件实现 schema 驱动的告警管理": "Uses CrudPage component to implement schema-driven alert management",
    "使用 CrudPage 组件实现 schema 驱动的告警规则管理": "Uses CrudPage component to implement schema-driven alert rule management",
    "使用 CrudPage 组件实现 schema 驱动的告警历史查看": "Uses CrudPage component to implement schema-driven alert history view",
    "使用 CrudPage 组件实现 schema 驱动的日志查看管理": "Uses CrudPage component to implement schema-driven log view management",
    "使用 CrudPage 组件实现 schema 驱动的通知渠道管理": "Uses CrudPage component to implement schema-driven notification channel management",

    # Phase 3 patterns (longer first)
    "Phase 3 WizardBuilder 迁移：集成 3 步向导 + 嵌套物料明细子表": "Phase 3 WizardBuilder migration: integrated 3-step wizard + nested material detail sub-table",
    "Phase 3 WizardBuilder 迁移：集成 3 步向导 + 嵌套费用明细子表": "Phase 3 WizardBuilder migration: integrated 3-step wizard + nested expense detail sub-table",
    "Phase 3 扩展：嵌套费用明细子表": "Phase 3 extension: nested expense detail sub-table",
    "Phase 3 扩展：嵌套物料明细子表": "Phase 3 extension: nested material detail sub-table",
    "Phase 3 扩展：5 步向导表单": "Phase 3 extension: 5-step wizard form",
    "Phase 3 扩展：5 个阶段任务子表": "Phase 3 extension: 5 phase task sub-tables",
    "Phase 3 扩展：3 步向导表单": "Phase 3 extension: 3-step wizard form",
    "Phase 3 扩展：树形结构（根因分析）": "Phase 3 extension: tree structure (root cause analysis)",
    "Phase 3 扩展：嵌套子表": "Phase 3 extension: nested sub-table",
    "Phase 3 扩展：向导表单": "Phase 3 extension: wizard form",
    "Phase 3 PoC：集成向导表单 + 嵌套子表": "Phase 3 PoC: integrated wizard form + nested sub-table",

    # PoC patterns
    "PoC：集成 WizardBuilder（5阶段向导）+ NestedTableConfig（阶段任务子表）": "PoC: integrated WizardBuilder (5-phase wizard) + NestedTableConfig (phase task sub-table)",
    "PoC：集成 WizardBuilder（8步向导）+ SubTableBuilder（子表）+ TreeBuilder（原因分析树）": "PoC: integrated WizardBuilder (8-step wizard) + SubTableBuilder (sub-table) + TreeBuilder (root cause analysis tree)",

    # WizardBuilder descriptions (longer first)
    "WizardBuilder：8 步向导（D1 团队 → D2 问题 → D3 临时措施 → D4 根因 → D5 永久措施 → D6 验证 → D7 预防 → D8 认可）": "WizardBuilder: 8-step wizard (D1 Team → D2 Problem → D3 Temporary Measures → D4 Root Cause → D5 Permanent Measures → D6 Verification → D7 Prevention → D8 Recognition)",
    "WizardBuilder：5 步向导（阶段1计划立项 → 阶段2产品设计 → 阶段3过程设计 → 阶段4产品确认 → 阶段5反馈改进）": "WizardBuilder: 5-step wizard (Phase 1 Project Planning → Phase 2 Product Design → Phase 3 Process Design → Phase 4 Product Confirmation → Phase 5 Feedback Improvement)",
    "WizardBuilder：3 步向导（费用填写 → 审批流程 → 确认提交）": "WizardBuilder: 3-step wizard (Expense Filling → Approval Process → Confirmation Submission)",
    "WizardBuilder：3 步向导（合同基本信息 → 条款与明细 → 评审与签署）": "WizardBuilder: 3-step wizard (Contract Basic Info → Terms & Details → Review & Signing)",
    "WizardBuilder：3 步向导（基本信息 → 凭证明细 → 确认提交）": "WizardBuilder: 3-step wizard (Basic Info → Voucher Details → Confirmation Submission)",

    # NestedTableConfig / SubTableBuilder / TreeBuilder descriptions
    "NestedTableConfig：费用明细行（items）的编辑": "NestedTableConfig: editing of expense detail rows (items)",
    "NestedTableConfig：物料明细行（items）的编辑": "NestedTableConfig: editing of material detail rows (items)",
    "NestedTableConfig：每个阶段的任务子表": "NestedTableConfig: task sub-table for each phase",
    "SubTableBuilder：凭证明细行（items）的编辑": "SubTableBuilder: editing of voucher detail rows (items)",
    "SubTableBuilder：团队成员、临时措施、根因分析、永久措施子表": "SubTableBuilder: team members, temporary measures, root cause analysis, permanent measures sub-tables",
    "TreeBuilder：D4 根因分析树形结构": "TreeBuilder: D4 root cause analysis tree structure",

    # Notes
    "注意：本文件为纯 Schema 定义，不含 JSX。自定义渲染函数在 QmsEightDPage.tsx 中定义并注入": "Note: This file is a pure Schema definition, does not contain JSX. Custom rendering functions are defined and injected in QmsEightDPage.tsx",
    "注意：本文件为纯 Schema 定义，不含 JSX": "Note: This file is a pure Schema definition, does not contain JSX",
    "使用前需在 QmsEightDPage.tsx 中注入 D4 的 renderContent": "Before use, inject D4's renderContent in QmsEightDPage.tsx",
    "renderContent 在页面初始化时由 QmsEightDPage.tsx 注入": "renderContent is injected by QmsEightDPage.tsx during page initialization",

    # 8D wizard
    "8D 向导步骤配置": "8D Wizard Step Configuration",

    # Section divider titles (longer first)
    "阶段任务子表通用字段": "Phase Task Sub-table Common Fields",
    "5 个阶段任务子表": "5 Phase Task Sub-tables",
    "D4 根因分析自定义渲染函数类型": "D4 Root Cause Analysis Custom Render Function Type",
    "D4 步骤的 renderContent 延迟注入": "D4 Step renderContent delayed injection",
    "D1 团队成员子表": "D1 Team Member Sub-table",
    "D3 临时措施子表": "D3 Temporary Measures Sub-table",
    "D4 根因分析子表": "D4 Root Cause Analysis Sub-table",
    "D5 永久措施子表": "D5 Permanent Measures Sub-table",
    "凭证明细子表配置": "Voucher Detail Sub-table Configuration",
    "费用明细子表配置": "Expense Detail Sub-table Configuration",
    "物料明细子表配置": "Material Detail Sub-table Configuration",
    "分类与等级配色": "Category and Level Color Scheme",
    "有效期状态": "Validity Status",
    "Schema 定义": "Schema Definition",
    "向导配置": "Wizard Configuration",
    "图标辅助": "Icon Assistance",
    "标签映射": "Label Mapping",
    "格式化工具": "Formatting Utilities",

    # Section headers (──)
    "阶段1：计划与立项": "Phase 1: Planning & Project Initiation",
    "阶段2：产品设计与开发": "Phase 2: Product Design & Development",
    "阶段3：过程设计与开发": "Phase 3: Process Design & Development",
    "阶段4：产品与过程确认": "Phase 4: Product & Process Confirmation",
    "阶段5：反馈、评价与改进": "Phase 5: Feedback, Evaluation & Improvement",
    "评审与签署步骤字段": "Review & Signing Step Fields",
    "审批步骤字段": "Approval Step Fields",
    "D2 问题描述": "D2 Problem Description",
    "D3 临时措施": "D3 Temporary Measures",
    "D5 永久措施": "D5 Permanent Measures",
    "D6 效果验证": "D6 Effect Verification",
    "D7 预防措施": "D7 Prevention Measures",
    "D8 团队认可": "D8 Team Recognition",
    "基础信息": "Basic Information",
    "邮件配置": "Email Configuration",
    "钉钉配置": "DingTalk Configuration",
    "企业微信配置": "WeChat Work Configuration",
    "短信配置": "SMS Configuration",
    "Webhook 配置": "Webhook Configuration",
}

SORTED_TRANSLATIONS = sorted(TRANSLATIONS.items(), key=lambda x: len(x[0]), reverse=True)


def is_comment_line(line: str) -> bool:
    stripped = line.lstrip()
    if stripped.startswith('*') or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*/'):
        return True
    return False


def has_chinese(text: str) -> bool:
    return bool(re.search(r'[\u4e00-\u9fff]{2,}', text))


def translate_line(line: str) -> str:
    if not is_comment_line(line):
        return line
    if not has_chinese(line):
        return line

    result = line
    for zh, en in SORTED_TRANSLATIONS:
        if zh in result:
            result = result.replace(zh, en)

    result = regex_post_process(result)
    return result


def regex_post_process(line: str) -> str:
    result = line
    result = re.sub(
        r'驱动\s*(.+?)\s*的完整 CRUD',
        lambda m: f'drives the full CRUD of {m.group(1)}',
        result
    )
    result = re.sub(
        r'驱动\s*(.+?)\s*的\s*CrudPage',
        lambda m: f'drives the CrudPage of {m.group(1)}',
        result
    )
    result = re.sub(
        r'驱动\s*(.+?)\s*的列表展示',
        lambda m: f'drives the list display of {m.group(1)}',
        result
    )
    result = re.sub(
        r'驱动\s*(.+?)\s*的服务列表',
        lambda m: f'drives the service list of {m.group(1)}',
        result
    )
    result = re.sub(
        r'驱动\s*(.+?)\s*的\s*CRUD',
        lambda m: f'drives the CRUD of {m.group(1)}',
        result
    )
    return result


def process_file(filepath: str) -> int:
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    modified_count = 0
    new_lines = []
    for line in lines:
        new_line = translate_line(line)
        if new_line != line:
            modified_count += 1
        new_lines.append(new_line)

    if modified_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"  {filepath}: {modified_count} comment line(s) translated")

    return modified_count


def main():
    total_files = 0
    total_lines = 0

    for root, dirs, files in os.walk(SCHEMAS_DIR):
        for filename in files:
            if filename.endswith('.ts') or filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                if has_chinese(content):
                    lines_changed = process_file(filepath)
                    if lines_changed > 0:
                        total_files += 1
                        total_lines += lines_changed

    print(f"\n{'='*60}")
    print(f"Summary: {total_files} files modified, {total_lines} comment lines translated.")


if __name__ == '__main__':
    main()