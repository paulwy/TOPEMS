#!/usr/bin/env python3
"""
Add all new translation keys for manual fixes to zh.json/en.json
BULK ADD SCRIPT - safe for all new keys we manually added
"""
import json, os

ZH = '/Users/air/TOPEMS/apps/web/src/i18n/locales/zh.json'
EN = '/Users/air/TOPEMS/apps/web/src/i18n/locales/en.json'

zh = json.load(open(ZH, 'r', encoding='utf-8'))
en = json.load(open(EN, 'r', encoding='utf-8'))

if 'pages' not in zh: zh['pages'] = {}
if 'pages' not in en: en['pages'] = {}

def add(scope, key, zh_val, en_val):
    """Scope like 'shared.v4demopage' """
    parts = scope.split('.')
    zc = zh['pages']; ec = en['pages']
    for p in parts:
        if p not in zc or not isinstance(zc[p], dict):
            zc[p] = {}
        if p not in ec or not isinstance(ec[p], dict):
            ec[p] = {}
        zc = zc[p]; ec = ec[p]
    zc[key] = zh_val
    ec[key] = en_val

# ============ shared.v4demopage ==============
S = 'shared.v4demopage'
add(S, 'key_intro_line1', '本页面展示 V4.0', 'This page showcases V4.0')
add(S, 'key_intro_line2',
    '架构重整后的导航系统效果，包括侧边栏分组、面包屑自动生成、路由-导航联动等特性。',
    'Navigation system after architectural restructuring: sidebar grouping, auto breadcrumbs, route-navigation integration.')
add(S, 'key_iam_sidebar', 'IAM 模块侧边栏', 'IAM Module Sidebar')
add(S, 'key_5_std_groups', '5大标准分组', '5 Standard Groups')
add(S, 'key_5_std_groups_2', '5大标准分组', '5 Standard Groups')
add(S, 'key_click_sidebar', '点击侧边栏菜单项查看效果', 'Click sidebar menu items to preview')
add(S, 'key_breadcrumb_auto', '面包屑层级自动生成', 'Auto Breadcrumb Generation')
add(S, 'key_current_path', '当前路径', 'Current Path')
add(S, 'key_module_info', '模块信息', 'Module Info')
add(S, 'key_module_code', '模块编码', 'Module Code')
add(S, 'key_module_name', '模块名称', 'Module Name')
add(S, 'key_module_source', '模块来源', 'Module Source')
add(S, 'key_entry_path', '入口路径', 'Entry Path')
add(S, 'key_navitem_config', 'NavItemConfig 数据结构', 'NavItemConfig Data Structure')
add(S, 'key_items', '项', 'items')
add(S, 'key_8_core_templates', '8大核心页面模板', '8 Core Page Templates')

# ============ rd.rsexperimentdetailpage (we manually edited) ==============
S = 'rd.rsexperimentdetailpage'
add(S, 'key_not_found', '试验不存在或已删除', 'Experiment not found or deleted')
add(S, 'key_code', '编码', 'Code')
add(S, 'key_project', '项目', 'Project')
add(S, 'key_experimenter', '实验员', 'Experimenter')
add(S, 'key_edit', '编辑', 'Edit')
add(S, 'key_objective', '试验目标', 'Experiment Objective')
add(S, 'key_method', '实验方法', 'Experiment Method')
add(S, 'key_conclusion', '试验结论', 'Experiment Conclusion')
add(S, 'key_add_record', '添加记录', 'Add Record')
add(S, 'key_no_records', '暂无实验记录', 'No experiment records')
add(S, 'key_recorder', '记录人', 'Recorder')
add(S, 'key_time', '时间', 'Time')
add(S, 'key_result_data', '试验结果数据', 'Experiment Result Data')
add(S, 'key_no_result_data', '暂无结果数据', 'No result data')
add(S, 'key_batch_info', '批次追溯信息', 'Batch Traceability Info')
add(S, 'key_no_batch', '暂无批次信息', 'No batch info')
add(S, 'key_batchno', '批次号', 'Batch Number')
add(S, 'key_completion_date', '完成日期', 'Completion Date')
add(S, 'key_scale', '试验规模', 'Experiment Scale')

# ============ shared.pluginmarketplacepage (grep said large amount remaining) ==============
S = 'shared.pluginmarketplacepage'
add(S, 'key_market_title', '插件市场', 'Plugin Marketplace')
add(S, 'key_market_subtitle',
    '发现和安装强大的插件，扩展您的 TOPEMS 功能，打造专属的企业管理平台',
    'Discover and install powerful plugins to extend TOPEMS and build your dedicated enterprise management platform')
add(S, 'key_plugin_categories', '插件分类', 'Plugin Categories')

# ============ help.guidepage ==============
S = 'help.guidepage'
add(S, 'key_back_to_center', '返回帮助中心', 'Back to Help Center')
add(S, 'key_learning_progress', '学习进度', 'Learning Progress')
add(S, 'key_completed', '已完成', 'Completed')
add(S, 'key_courses', '个课程', 'courses')

# ============ performance.performancetestpage ==============
S = 'performance.performancetestpage'
add(S, 'key_benchmark_title', 'TOPEMS 性能测试基准页', 'TOPEMS Performance Test Benchmark')
add(S, 'key_benchmark_desc1', '此页面用于Lighthouse性能测试，无需认证，独立运行。',
    'For Lighthouse performance testing. Runs independently without authentication.')
add(S, 'key_benchmark_desc2', '包含完整的页面结构、组件渲染和交互元素。',
    'Contains full page structure, component rendering, and interactive elements.')

# ============ gis.gisfencepage + gistracking + gisindex ==============
for S, mappings in [
  ('gis.gisfencepage', [
    ('key_type', '类型', 'Type'),
    ('key_trigger_count', '触发次数', 'Trigger Count'),
    ('key_marker_type', '类型', 'Type'),
  ]),
  ('gis.gistrackingpage', [
    ('key_status', '状态', 'Status'),
    ('key_device_type', '类型', 'Type'),
    ('key_track_tracing', '轨迹追踪', 'Track Tracing'),
  ]),
  ('gis.gisindex', [
    ('key_name', '名称', 'Name'),
    ('key_type', '类型', 'Type'),
    ('key_coord', '坐标', 'Coordinates'),
  ]),
  ('asset.assetlistpage', [
    ('key_total_assets', '资产总数', 'Total Assets'),
    ('key_in_use', '在用', 'In Use'),
    ('key_under_repair', '维修中', 'Under Repair'),
  ]),
  ('im.mailpage.createtemplatedialog', [
    ('key_create_template_desc', '创建新的邮件模板，支持变量替换', 'Create a new email template with variable substitution support'),
    ('key_select_category', '选择分类', 'Select Category'),
    ('key_var_usage', '变量使用说明', 'Variable Usage Guide'),
  ]),
  ('im.mailpage.emaillist', [
    ('key_selected', '已选择', 'Selected'),
    ('key_records', '条记录', 'records'),
    ('key_batch_resend', '批量重发', 'Batch Resend'),
    ('key_batch_delete', '批量删除', 'Batch Delete'),
  ]),
  ('im.mailpage.emaildetaildialog', [
    ('key_sender', '发件人', 'Sender'),
    ('key_recipient', '收件人', 'Recipient'),
    ('key_cc', '抄送', 'CC'),
  ]),
  ('im.mailpage.confirmdialogs', [
    ('key_confirm_delete_prefix', '确定要删除选中的', 'Are you sure you want to delete the selected'),
    ('key_confirm_delete_suffix', '条邮件记录吗？', 'email records?'),
    ('key_confirm_resend_prefix', '确定要重新发送选中的', 'Are you sure you want to resend the selected'),
    ('key_confirm_resend_suffix', '条邮件吗？', 'emails?'),
  ]),
  ('im.mailpage.templatepreviewdialog', [
    ('key_template_preview', '模板预览', 'Template Preview'),
    ('key_render_effect', '以下是模板渲染后的预览效果', 'Below is the rendered preview of the template'),
    ('key_subject', '主题', 'Subject'),
  ]),
  ('im.mailpage.index', [
    ('key_mail_management', '邮件管理', 'Email Management'),
    ('key_mail_subtitle', '管理邮件发送和邮件模板', 'Manage email sending and templates'),
    ('key_send_email', '发送邮件', 'Send Email'),
  ]),
  ('im.mailpage.components.templatelist', [
    ('key_name', '名称', 'Name'),
    ('key_code', '编码', 'Code'),
    ('key_category', '分类', 'Category'),
  ]),
  ('help.helpceneterpage', [
    ('key_view_more', '查看更多', 'View more'),
    ('key_articles', '篇文档', ' articles'),
    ('key_browse', '浏览', 'Browse'),
    ('key_views', '查看', 'Views'),
  ]),
  ('finance.consolidationscopepage', [
    ('key_rules', '规则', 'Rules'),
    ('key_scope_list', '合并范围列表', 'Consolidation Scope List'),
  ]),
  ('finance.financebudgetdetailpage', [
    ('key_usage_rate', '使用率', 'Usage Rate'),
    ('key_analysis', '预算执行分析', 'Budget Execution Analysis'),
    ('key_monitor_future', '，请关注后续支出情况。', ', please monitor future spending.'),
  ]),
  ('notification.notificationcenter', [
    ('key_total', '共', 'Total'),
    ('key_notifications', '通知', 'notifications'),
    ('key_mark_read', '标记已读', 'Mark as Read'),
    ('key_delete', '删除', 'Delete'),
  ]),
  ('notification.notificationdetailpage', [
    ('key_no_buttons', '暂无操作按钮', 'No action buttons'),
  ]),
  ('crm.returndetailpage', [
    ('key_approve', '审核通过', 'Approve'),
    ('key_reject', '拒绝', 'Reject'),
    ('key_confirm_receipt', '确认收货', 'Confirm Receipt'),
  ]),
  ('crm.customerdetailpage', [
    ('key_days', '天', 'days'),
    ('key_create_invoice', '新建发票', 'Create Invoice'),
    ('key_create_receipt', '新建收款', 'Create Receipt'),
  ]),
  ('crm.contactdetailpage', [
    ('key_contact_info', '联系方式', 'Contact Info'),
    ('key_related_info', '关联信息', 'Related Info'),
  ]),
  ('crm.dashboardpage', [
    ('key_funnel_overview', '销售漏斗概览', 'Sales Funnel Overview'),
  ]),
  ('crm.crmrecommendationpage', [
    ('key_items', '项', 'items'),
  ]),
  ('help.faqpage', [
    ('key_back_to_center', '返回帮助中心', 'Back to Help Center'),
    ('key_all', '全部', 'All'),
    ('key_views', '查看', 'Views'),
  ]),
  ('rd.rsreportpage', [
    ('key_in_progress', '进行中', 'In Progress'),
    ('key_completed', '已完成', 'Completed'),
    ('key_success_rate', '成功率', 'Success Rate'),
    ('key_published', '已发布', 'Released'),
    ('key_testing', '测试中', 'Testing'),
  ]),
  ('rd.rsreleasepage', [
    ('key_release_notes', '发布说明', 'Release Notes'),
    ('key_release_time', '发布时间', 'Release Time'),
    ('key_publisher', '发布人', 'Publisher'),
  ]),
  ('rd.rsreviewpage', [
    ('key_author', '作者', 'Author'),
    ('key_reviewer', '评审人', 'Reviewer'),
    ('key_system_auto', '系统自动', 'System Auto'),
  ]),
  ('rd.rsformulacreatepage', [
    ('key_composition', '配方组成', 'Formula Composition'),
    ('key_add_component', '添加组分', 'Add Component'),
  ]),
  ('rd.rsprojectdetailpage', [
    ('key_target_date', '目标日期', 'Target Date'),
    ('key_view', '查看', 'View'),
    ('key_code', '编码', 'Code'),
    ('key_type', '类型', 'Type'),
    ('key_leader', '负责人', 'Owner'),
  ]),
  ('rd.rsformuladetailpage', [
    ('key_no_components', '暂无配方组成', 'No formula components'),
    ('key_version_history', '版本历史', 'Version History'),
    ('key_approved_by', '审批人', 'Approved By'),
  ]),
  ('im.mailpage.components.sendemaildialog', [
    ('key_send_email', '发送邮件', 'Send Email'),
    ('key_select_template', '选择邮件模板', 'Select Email Template'),
    ('key_cancel', '取消', 'Cancel'),
  ]),
  ('im.mailpage.components.edittemplatedialog', [
    ('key_select_category', '选择分类', 'Select Category'),
    ('key_cancel', '取消', 'Cancel'),
  ]),
  ('im.mailpage.hooks', [
    ('key_invalid_email', '无效的邮箱地址', 'Invalid email address'),
    ('key_invalid_cc_email', '无效的抄送邮箱', 'Invalid CC email'),
    ('key_invalid_bcc_email', '无效的密送邮箱', 'Invalid BCC email'),
  ]),
  ('im.mailpage.components.emailstatscards', [
    ('key_total_emails', '邮件总数', 'Total Emails'),
    ('key_sent', '已发送', 'Sent'),
    ('key_pending', '待发送', 'Pending'),
  ]),
  ('rd.rssettingspage', [
    ('key_system_stats', '系统统计', 'System Statistics'),
    ('key_total_projects', '项目总数', 'Total Projects'),
    ('key_total_experiments', '试验总数', 'Total Experiments'),
  ]),
  ('im.mailpage', [
    # any needed top level for index/hooks/constants...
  ])
]:
  for k, zh_v, en_v in mappings:
    add(S, k, zh_v, en_v)

json.dump(zh, open(ZH, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump(en, open(EN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('Done. Added all translation keys.')
