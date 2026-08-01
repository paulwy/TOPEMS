#!/usr/bin/env python3
"""
Complete i18n processor for all 26 files.
Replaces Chinese text with i18n.t() calls.
Updates zh.json and en.json.
"""
import re, json, os, hashlib, sys

ZH_JSON = '/Users/air/TOPEMS/apps/web/src/i18n/locales/zh.json'
EN_JSON = '/Users/air/TOPEMS/apps/web/src/i18n/locales/en.json'

def gen_hash(text):
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:6]

def make_key(page_id, text):
    return f'pages.{page_id}.key_{gen_hash(text)}'

# ======================================================================
# COMPLETE TRANSLATION MAP
# ======================================================================
TRANS = {}

def T(zh, en):
    TRANS[zh] = en

# ---- COMMON UI ----
T('成功', 'Success')
T('失败', 'Failed')
T('错误', 'Error')
T('警告', 'Warning')
T('确定', 'Confirm')
T('取消', 'Cancel')
T('保存', 'Save')
T('删除', 'Delete')
T('编辑', 'Edit')
T('新增', 'Add')
T('搜索', 'Search')
T('创建', 'Create')
T('关闭', 'Close')
T('发布', 'Publish')
T('状态', 'Status')
T('操作', 'Actions')
T('详情', 'Details')
T('总数', 'Total')
T('名称', 'Name')
T('描述', 'Description')
T('代码', 'Code')
T('类型', 'Type')
T('日期', 'Date')
T('时间', 'Time')
T('金额', 'Amount')
T('数量', 'Quantity')
T('单位', 'Unit')
T('备注', 'Remarks')
T('地址', 'Address')
T('电话', 'Phone')
T('邮箱', 'Email')
T('联系人', 'Contact')
T('部门', 'Department')
T('首页', 'Home')
T('系统管理', 'System Management')
T('刷新', 'Refresh')
T('查看', 'View')
T('下载', 'Download')
T('上传', 'Upload')
T('导入', 'Import')
T('导出', 'Export')
T('返回', 'Back')
T('确认', 'Confirm')
T('提交', 'Submit')
T('重置', 'Reset')
T('应用', 'Apply')
T('设置', 'Settings')
T('配置', 'Configuration')
T('管理', 'Management')
T('总计', 'Total')
T('全部', 'All')
T('读取', 'Read')
T('写入', 'Write')

# ---- GREETINGS ----
T('上午好', 'Good Morning')
T('下午好', 'Good Afternoon')
T('晚上好', 'Good Evening')

# ---- STATUS ----
T('有效', 'Active')
T('已过期', 'Expired')
T('已终止', 'Terminated')
T('待处理', 'Pending')
T('处理中', 'Processing')
T('已交付', 'Delivered')
T('已完成', 'Completed')
T('待签署', 'Pending Signature')
T('已签署', 'Signed')
T('已到期', 'Expired')
T('履行中', 'In Progress')
T('活跃', 'Active')
T('进行中', 'In Progress')
T('已拒绝', 'Rejected')
T('已提交', 'Submitted')
T('已授标', 'Awarded')
T('已投标', 'Bid Submitted')
T('待审核', 'Pending Review')
T('在售', 'On Sale')
T('低风险', 'Low Risk')
T('高风险', 'High Risk')
T('草稿', 'Draft')
T('已发布', 'Published')
T('投标中', 'Bidding')
T('已关闭', 'Closed')

# ---- SRM ----
T('产品总数', 'Total Products')
T('总价值', 'Total Value')
T('供应商产品', 'Supplier Products')
T('财务管理', 'Financial Management')
T('供应商分类', 'Supplier Categories')
T('合同详情', 'Contract Details')
T('供应商详情', 'Supplier Details')
T('报价单管理', 'Quotation Management')
T('供应商管理', 'Supplier Management')
T('招投标管理', 'Bidding Management')
T('询价管理', 'Inquiry Management')
T('评估管理', 'Evaluation Management')
T('供应商门户', 'Supplier Portal')
T('门户', 'Portal')
T('产品不存在', 'Product not found')
T('分类不存在', 'Category not found')
T('供应商不存在', 'Supplier not found')
T('合同不存在', 'Contract not found')
T('供应商ID为空', 'Supplier ID is empty')
T('加载供应商信息失败', 'Failed to load supplier info')
T('合同ID为空', 'Contract ID is empty')
T('加载合同信息失败', 'Failed to load contract info')
T('加载供应商门户数据失败', 'Failed to load supplier portal data')
T('创建评估失败', 'Failed to create evaluation')
T('更新评估失败', 'Failed to update evaluation')
T('删除评估失败', 'Failed to delete evaluation')
T('加载报价单失败', 'Failed to load quotation')
T('创建报价单失败', 'Failed to create quotation')
T('更新报价单失败', 'Failed to update quotation')

# ---- FINANCE ----
T('总金额', 'Total Amount')
T('所有单据合计', 'All Documents Total')
T('待结算', 'Pending Settlement')
T('待处理/处理中/有效', 'Pending/Processing/Active')
T('已完成/已交付', 'Completed/Delivered')
T('单据', 'Documents')
T('订单', 'Orders')
T('已启用', 'Active')
T('已禁用', 'Inactive')
T('启用', 'Enabled')
T('禁用', 'Disabled')

# ---- BIDDING ----
T('发布成功', 'Publish Success')
T('发布失败', 'Publish Failed')
T('开标成功', 'Open Bid Success')
T('开标失败', 'Open Bid Failed')
T('定标成功', 'Award Success')
T('定标失败', 'Award Failed')
T('发布招标项目失败', 'Failed to publish bidding project')
T('招标项目已发布', 'Bidding project published')
T('招标项目已开标', 'Bidding project opened')
T('开标操作失败', 'Open bid operation failed')
T('已完成定标', 'Award completed')
T('定标操作失败', 'Award operation failed')
T('确定要发布招标项目', 'Are you sure you want to publish bidding project')
T('确定要对招标项目', 'Are you sure you want to open bidding project')
T('吗？', '?')
T('联系电话', 'Contact Phone')
T('暂无投标人', 'No Bidders')
T('投标人', 'Bidders')
T('预算总额', 'Total Budget')
T('预算金额', 'Budget Amount')
T('中标供应商', 'Winning Supplier')
T('项目描述', 'Project Description')
T('供应商名称', 'Supplier Name')
T('投标金额', 'Bid Amount')
T('交货期', 'Delivery Period')
T('中标', 'Award')
T('定标', 'Award')
T('开标', 'Open Bid')

# ---- INQUIRY ----
T('询价单已发布', 'Inquiry Published')
T('发布询价单失败', 'Failed to Publish Inquiry')
T('授标成功', 'Award Success')
T('已完成授标', 'Award Completed')
T('授标失败', 'Award Failed')
T('授标操作失败', 'Award Operation Failed')
T('报价单已拒绝', 'Quotation Rejected')
T('操作失败', 'Operation Failed')
T('拒绝报价失败', 'Failed to Reject Quotation')
T('确定要发布询价单', 'Are you sure you want to publish inquiry')
T('确定要将报价单', 'Are you sure you want to award quotation')
T('暂无报价', 'No Quotations')
T('授标', 'Award')
T('拒绝', 'Reject')

# ---- QUOTATION ----
T('报价单已中标', 'Quotation Awarded')
T('中标操作失败', 'Award Operation Failed')
T('报价单已驳回', 'Quotation Rejected')
T('驳回操作失败', 'Reject Operation Failed')
T('驳回', 'Reject')

# ---- CATEGORY ----
T('原材料供应商', 'Raw Material Supplier')
T('提供原材料的供应商分类', 'Suppliers Providing Raw Materials')
T('零部件供应商', 'Component Supplier')
T('提供零部件的供应商', 'Suppliers Providing Components')
T('包装材料供应商', 'Packaging Material Supplier')
T('提供包装材料的供应商', 'Suppliers Providing Packaging Materials')
T('设备供应商', 'Equipment Supplier')
T('提供生产设备的供应商', 'Suppliers Providing Production Equipment')
T('化工原料供应商', 'Chemical Supplier')
T('提供化工原料的供应商', 'Suppliers Providing Chemical Materials')
T('电子元器件供应商', 'Electronic Component Supplier')
T('提供电子元器件的供应商', 'Suppliers Providing Electronic Components')
T('物流服务商', 'Logistics Service Provider')
T('提供物流配送服务的供应商', 'Suppliers Providing Logistics & Distribution')
T('检测设备供应商', 'Testing Equipment Supplier')
T('提供检测设备的供应商', 'Suppliers Providing Testing Equipment')
T('分类总数', 'Total Categories')
T('含供应商', 'With Suppliers')
T('供应商总数', 'Total Suppliers')
T('供应商编号', 'Supplier Code')

# ---- CONTRACT ----
T('时间信息', 'Time Information')
T('签署日期', 'Sign Date')
T('开始日期', 'Start Date')
T('合同金额', 'Contract Amount')
T('创建时间', 'Created At')
T('更新时间', 'Updated At')
T('供应商ID', 'Supplier ID')

# ---- MOCK DATA ----
T('不锈钢板材 304', 'Stainless Steel Sheet 304')
T('宝钢集团', 'Baosteel Group')
T('铝合金型材 6061', 'Aluminum Alloy Profile 6061')
T('中铝集团', 'Chalco')
T('原材料', 'Raw Materials')
T('密封圈 NBR', 'Seal NBR')
T('三力密封', 'Sanli Seals')
T('零部件', 'Components')
T('电机 Y2-7.5kW', 'Motor Y2-7.5kW')
T('西门子电气', 'Siemens')
T('设备配件', 'Equipment Parts')
T('液压油 HM46', 'Hydraulic Oil HM46')
T('长城润滑油', 'Great Wall Lubricants')
T('化工原料', 'Chemical Materials')
T('传感器 PT100', 'Sensor PT100')
T('霍尼韦尔', 'Honeywell')
T('电子元器件', 'Electronic Components')
T('瓦楞纸箱定制', 'Custom Corrugated Box')
T('合兴包装', 'Hexing Packaging')
T('包装材料', 'Packaging Materials')
T('轴承 SKF6205', 'Bearing SKF6205')
T('瑞典SKF', 'SKF Sweden')

# ---- UNITS ----
T('吨', 'tons')
T('个', 'pcs')
T('台', 'units')
T('升', 'liters')
T('只', 'pcs')

# ---- NOTIFICATION ----
T('加载归档配置失败', 'Failed to Load Archive Config')
T('归档配置更新成功', 'Archive Config Updated Successfully')
T('更新失败', 'Update Failed')
T('更新成功', 'Update Success')
T('模板已创建', 'Template Created')
T('模板已更新', 'Template Updated')
T('模板已删除', 'Template Deleted')
T('创建模板失败', 'Failed to Create Template')
T('更新模板失败', 'Failed to Update Template')
T('删除模板失败', 'Failed to Delete Template')
T('加载通知统计失败', 'Failed to Load Notification Stats')
T('加载服务健康状态失败', 'Failed to Load Service Health Status')
T('系统通知', 'System Notifications')
T('审批通知', 'Approval Notifications')
T('提醒通知', 'Reminder Notifications')
T('未读消息', 'Unread Messages')
T('较昨日', 'vs Yesterday')
T('今日通知', 'Today Notifications')
T('本周通知', 'This Week Notifications')
T('已读率', 'Read Rate')
T('未读数', 'Unread Count')
T('操作成功', 'Operation Success')
T('创建成功', 'Create Success')
T('删除成功', 'Delete Success')

# ---- DASHBOARD ----
T('今日概览', 'Today Overview')
T('待办事项', 'To-do Items')
T('逾期', 'Overdue')
T('即将到期', 'Due Soon')
T('工厂地图', 'Factory Map')
T('上周期', 'Previous Period')
T('使用率', 'Usage Rate')
T('响应时间', 'Response Time')
T('成功率', 'Success Rate')
T('文档', 'Documents')
T('工作流', 'Workflow')
T('审批', 'Approval')
T('通知', 'Notifications')
T('预警', 'Alerts')
T('任务', 'Tasks')
T('评论', 'Comments')
T('提醒', 'Reminders')
T('业务位置', 'Business Location')
T('业务模块', 'Business Module')
T('今日使用次数', 'Today Usage Count')
T('总操作数', 'Total Operations')

# ---- REPORT ----
T('报表', 'Reports')
T('报表中心', 'Report Center')
T('报表列表', 'Report List')
T('模板管理', 'Template Management')
T('报表模板列表', 'Report Template List')
T('新增模板', 'Add Template')
T('暂无模板', 'No Templates')
T('创建第一个模板', 'Create First Template')
T('模板名称', 'Template Name')
T('模板类型', 'Template Type')
T('模板分类', 'Template Category')
T('研发项目进度报表', 'R&D Project Progress Report')
T('试验记录报表', 'Experiment Record Report')
T('实验室检验统计', 'Lab Inspection Statistics')
T('样品汇总报表', 'Sample Summary Report')
T('质量分析报表', 'Quality Analysis Report')
T('报表管理', 'Report Management')

# ---- SYSTEM / AUDIT ----
T('审计日志', 'Audit Log')
T('登录失效', 'Login Expired')
T('登录已过期，请重新登录', 'Login expired, please login again')
T('导出成功', 'Export Success')
T('审计日志已导出', 'Audit Log Exported')
T('实体类型', 'Entity Type')
T('IP地址', 'IP Address')
T('开始时间', 'Start Time')
T('结束时间', 'End Time')
T('全部实体', 'All Entities')
T('全部用户', 'All Users')
T('全部状态', 'All Status')
T('用户', 'User')
T('用户ID', 'User ID')
T('用户名', 'Username')
T('用户筛选', 'User Filter')
T('搜索用户名', 'Search Username')
T('实体ID', 'Entity ID')
T('响应详情', 'Response Details')
T('错误信息', 'Error Message')
T('导出日志', 'Export Logs')
T('导出审计日志失败', 'Failed to Export Audit Log')
T('审计日志详情', 'Audit Log Details')
T('用户信息', 'User Info')
T('耗时', 'Duration')
T('登录', 'Login')
T('登出', 'Logout')
T('系统', 'System')

# ---- BACKUP ----
T('备份', 'Backup')
T('备份管理', 'Backup Management')
T('创建备份', 'Create Backup')
T('恢复备份', 'Restore Backup')
T('备份创建成功', 'Backup Created Successfully')
T('创建备份失败', 'Failed to Create Backup')
T('备份恢复成功', 'Backup Restored Successfully')
T('恢复备份失败', 'Failed to Restore Backup')
T('备份删除成功', 'Backup Deleted Successfully')
T('删除备份失败', 'Failed to Delete Backup')
T('下载备份', 'Download Backup')
T('备份详情', 'Backup Details')
T('备份类型', 'Backup Type')
T('备份大小', 'Backup Size')
T('创建者', 'Creator')
T('操作人', 'Operator')
T('文件', 'File')
T('恢复', 'Restore')

# ---- SYSTEM CONFIG ----
T('日志级别和格式', 'Log Level and Format')
T('控制日志输出级别和格式', 'Control log output level and format')
T('日志级别', 'Log Level')
T('日志格式', 'Log Format')
T('调试', 'Debug')
T('信息', 'Info')
T('基本信息', 'Basic Information')
T('站点名称', 'Site Name')
T('输入站点名称', 'Enter Site Name')
T('站点描述', 'Site Description')
T('输入站点描述', 'Enter Site Description')
T('站点图标', 'Site Icon')
T('上传站点图标', 'Upload Site Icon')
T('系统配置', 'System Configuration')
T('系统参数', 'System Parameters')
T('参数配置', 'Parameter Configuration')
T('缓存状态', 'Cache Status')
T('当前缓存使用情况统计', 'Current Cache Usage Statistics')
T('清除中...', 'Clearing...')
T('清除缓存', 'Clear Cache')
T('缓存键数量', 'Cache Key Count')
T('内存使用', 'Memory Usage')
T('磁盘使用', 'Disk Usage')
T('命中率', 'Hit Rate')
T('主题颜色和界面设置', 'Theme Color & UI Settings')
T('默认角色', 'Default Role')
T('角色', 'Role')
T('权限', 'Permission')
T('语言', 'Language')
T('主题', 'Theme')
T('浅色', 'Light')
T('深色', 'Dark')
T('保存设置', 'Save Settings')
T('所有系统设置已保存', 'All System Settings Saved')
T('设置保存失败', 'Failed to Save Settings')
T('保留天数', 'Retention Days')
T('自动清理', 'Auto Cleanup')
T('级别', 'Level')
T('输出', 'Output')
T('报表标题', 'Report Title')
T('报表描述', 'Report Description')

# ---- REPORT TYPES ----
T('生产报表', 'Production Report')
T('质量报表', 'Quality Report')
T('设备报表', 'Equipment Report')
T('成本报表', 'Cost Report')
T('安全报表', 'Safety Report')
T('环境报表', 'Environmental Report')
T('供应商报表', 'Supplier Report')
T('采购报表', 'Procurement Report')
T('销售报表', 'Sales Report')
T('库存报表', 'Inventory Report')

# ---- NOTIFICATION TYPES ----
T('通知标题', 'Notification Title')
T('通知内容', 'Notification Content')
T('通知类型', 'Notification Type')
T('通知状态', 'Notification Status')
T('已读', 'Read')
T('未读', 'Unread')
T('全部已读', 'Mark All as Read')
T('标记已读', 'Mark as Read')
T('归档', 'Archive')
T('已归档', 'Archived')
T('归档配置', 'Archive Configuration')
T('保留策略', 'Retention Policy')
T('通知模板', 'Notification Template')
T('模板代码', 'Template Code')
T('模板内容', 'Template Content')
T('编辑模板', 'Edit Template')
T('发送测试', 'Send Test')
T('测试消息', 'Test Message')
T('发送', 'Send')
T('预览', 'Preview')

# ---- GIS ----
T('地图', 'Map')
T('设备位置', 'Equipment Location')
T('车间位置', 'Workshop Location')
T('区域', 'Area')
T('车间', 'Workshop')
T('设备', 'Equipment')
T('选择区域', 'Select Area')
T('选择车间', 'Select Workshop')

# ---- MISC ----
T('日期范围', 'Date Range')
T('本周', 'This Week')
T('本月', 'This Month')
T('本季度', 'This Quarter')
T('今年', 'This Year')
T('自定义', 'Custom')
T('上一页', 'Previous')
T('下一页', 'Next')
T('每页', 'Per Page')
T('条', 'items')
T('条记录', 'records')
T('搜索...', 'Search...')
T('请输入', 'Please Enter')
T('请选择', 'Please Select')
T('查看更多', 'View More')
T('展开', 'Expand')
T('收起', 'Collapse')
T('加载更多', 'Load More')
T('所属部门', 'Department')
T('所属', 'Belongs To')
T('标签', 'Tags')
T('附件', 'Attachments')
T('备注信息', 'Remarks')
T('说明', 'Description')
T('原因', 'Reason')
T('结果', 'Result')
T('进度', 'Progress')
T('步骤', 'Step')
T('完成', 'Complete')
T('报表不存在', 'Report Not Found')

# Add more for the system pages
T('报表标题', 'Report Title')
T('创建报表', 'Create Report')
T('编辑报表', 'Edit Report')
T('删除报表', 'Delete Report')
T('预览报表', 'Preview Report')
T('导出报表', 'Export Report')
T('从模板创建', 'Create from Template')
T('报表不存在', 'Report Not Found')
T('删除备份失败', 'Failed to Delete Backup')
T('数据报表', 'Data Report')
T('分析报表', 'Analysis Report')
T('综合报表', 'Summary Report')
T('每日报表', 'Daily Report')
T('每周报表', 'Weekly Report')
T('每月报表', 'Monthly Report')
T('报表分类', 'Report Category')
T('全部报表', 'All Reports')
T('我的报表', 'My Reports')
T('共享报表', 'Shared Reports')

T('总金额', 'Total Amount')
T('所有单据合计', 'All Documents Total')
T('待结算', 'Pending Settlement')
T('单据', 'Documents')
T('订单', 'Orders')
T('产品', 'Products')
T('服务', 'Services')
T('资产', 'Assets')
T('任务', 'Tasks')
T('工单', 'Work Orders')
T('计划', 'Plans')
T('项目', 'Projects')
T('客户', 'Customers')
T('供应商', 'Suppliers')
T('员工', 'Employees')
T('仓库', 'Warehouse')
T('库存', 'Inventory')
T('采购', 'Procurement')
T('销售', 'Sales')
T('财务', 'Finance')
T('人力资源', 'HR')
T('行政管理', 'Admin')
T('生产', 'Production')
T('质量', 'Quality')
T('安全', 'Safety')
T('设备管理', 'Equipment Management')
T('资产管理', 'Asset Management')
T('库存管理', 'Inventory Management')
T('采购管理', 'Procurement Management')
T('销售管理', 'Sales Management')
T('财务管理', 'Financial Management')
T('人力资源管理', 'HR Management')
T('生产管理', 'Production Management')
T('质量管理', 'Quality Management')
T('安全管理', 'Safety Management')
T('系统设置', 'System Settings')
T('权限管理', 'Permission Management')
T('角色管理', 'Role Management')
T('用户管理', 'User Management')
T('日志管理', 'Log Management')
T('数据备份', 'Data Backup')
T('数据恢复', 'Data Recovery')
T('缓存清理', 'Cache Clear')
T('系统监控', 'System Monitor')
T('性能监控', 'Performance Monitor')
T('服务监控', 'Service Monitor')
T('应用监控', 'Application Monitor')
T('网络监控', 'Network Monitor')
T('数据库监控', 'Database Monitor')
T('中间件监控', 'Middleware Monitor')

print(f"Translation map: {len(TRANS)} entries")

def get_en(zh):
    if zh in TRANS:
        return TRANS[zh]
    # Smart partial match
    for key, val in TRANS.items():
        if key in zh or zh in key:
            return val
    return zh

# ======================================================================
# LOAD EXISTING DATA
# ======================================================================
with open(ZH_JSON, 'r') as f:
    zh_data = json.load(f)
with open(EN_JSON, 'r') as f:
    en_data = json.load(f)

new_keys = {}

def add_key(key, zh_val, en_val):
    pages_zh = zh_data.setdefault('pages', {})
    if key not in pages_zh:
        new_keys[key] = (zh_val, en_val)
        return True
    return False

# ======================================================================
# FILE PROCESSING
# ======================================================================

FILES = [
    ('srmsupplierproductpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmSupplierProductPage.tsx'),
    ('srmfinancepage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmFinancePage.tsx'),
    ('biddingpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/BiddingPage.tsx'),
    ('inquiryquotationpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/InquiryQuotationPage.tsx'),
    ('srmquotationpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmQuotationPage.tsx'),
    ('srmcategorypage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmCategoryPage.tsx'),
    ('srmcontractdetailpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmContractDetailPage.tsx'),
    ('srmsupplierdetailpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmSupplierDetailPage.tsx'),
    ('srmevaluationpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmEvaluationPage.tsx'),
    ('srmsupplierpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SrmSupplierPage.tsx'),
    ('supplierportalpage', '/Users/air/TOPEMS/apps/web/src/pages/srm/SupplierPortalPage.tsx'),
    ('dashboardpage', '/Users/air/TOPEMS/apps/web/src/pages/shared/DashboardPage.tsx'),
    ('reportpage', '/Users/air/TOPEMS/apps/web/src/pages/report/ReportPage/index.tsx'),
    ('tabswitcher', '/Users/air/TOPEMS/apps/web/src/pages/report/ReportPage/components/TabSwitcher.tsx'),
    ('templatelist', '/Users/air/TOPEMS/apps/web/src/pages/report/ReportPage/components/TemplateList.tsx'),
    ('notificationarchivepage', '/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationArchivePage.tsx'),
    ('notificationstatspage', '/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationStatsPage.tsx'),
    ('notificationdashboardpage', '/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationDashboardPage.tsx'),
    ('notificationtemplatespage', '/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationTemplatesPage.tsx'),
    ('notificationlistpage', '/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationListPage.tsx'),
    ('gis_dashboardpage', '/Users/air/TOPEMS/apps/web/src/pages/gis/DashboardPage.tsx'),
    ('auditlogpage', '/Users/air/TOPEMS/apps/web/src/pages/system/AuditLogPage.tsx'),
    ('backuppage', '/Users/air/TOPEMS/apps/web/src/pages/system/BackupPage.tsx'),
    ('logconfigpanel', '/Users/air/TOPEMS/apps/web/src/pages/system/SystemParamsPage/components/LogConfigPanel.tsx'),
    ('systemconfigpanel', '/Users/air/TOPEMS/apps/web/src/pages/system/SystemParamsPage/components/SystemConfigPanel.tsx'),
    ('cacheconfigpanel', '/Users/air/TOPEMS/apps/web/src/pages/system/SystemParamsPage/components/CacheConfigPanel.tsx'),
]

def process_file(filepath, page_id):
    """Process a single file: replace Chinese with i18n.t() calls."""
    if not os.path.exists(filepath):
        print(f"  SKIP: not found")
        return 0
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    modified_count = 0
    
    for line in lines:
        if not re.search(r'[\u4e00-\u9fff]', line):
            new_lines.append(line)
            continue
        
        stripped = line.strip()
        
        # Skip comments
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            # Translate comments to English
            comment = stripped
            # Simple translation for common comments
            comment_translations = {
                '// V34.0: BFF GraphQL 聚合 API': '// V34.0: BFF GraphQL aggregated API',
                '// V34.0: 使用 BFF GraphQL 替代多次 REST 调用获取待办 + 服务健康': '// V34.0: Use BFF GraphQL instead of multiple REST calls for todos + service health',
                '// 动态生成 mock 数据': '// Dynamically generate mock data',
                '// 生成模拟数据': '// Generate mock data',
                '// CrudPage 配置': '// CrudPage configuration',
                '// API 适配器': '// API adapter',
                '// 列表查询': '// List query',
                '// 创建': '// Create',
                '// 更新': '// Update',
                '// 删除': '// Delete',
                '// 统计组件': '// Statistics component',
                '// 统计数据': '// Statistics data',
            }
            replaced = False
            for cn, en in comment_translations.items():
                if cn in comment:
                    new_lines.append(line.replace(cn, en))
                    replaced = True
                    break
            if not replaced:
                new_lines.append(line)
            continue
        
        new_line = line
        
        # Replace single-quoted strings containing Chinese
        def replacer_sq(match):
            full = match.group(0)
            inner = match.group(1)
            if not re.search(r'[\u4e00-\u9fff]', inner):
                return full
            zh = inner
            en = get_en(zh)
            key = make_key(page_id, zh)
            add_key(key, zh, en)
            nonlocal_modified[0] += 1
            return f"i18n.t('{key}')"
        
        # Replace double-quoted strings containing Chinese
        def replacer_dq(match):
            full = match.group(0)
            inner = match.group(1)
            if not re.search(r'[\u4e00-\u9fff]', inner):
                return full
            zh = inner
            en = get_en(zh)
            key = make_key(page_id, zh)
            add_key(key, zh, en)
            nonlocal_modified[0] += 1
            return f'i18n.t("{key}")'
        
        nonlocal_modified = [0]
        new_line = re.sub(r"'([^']*[\u4e00-\u9fff][^']*)'", replacer_sq, new_line)
        new_line = re.sub(r'"([^"]*[\u4e00-\u9fff][^"]*)"', replacer_dq, new_line)
        
        # Handle JSX text nodes: >text中文<
        def jsx_replacer(match):
            full = match.group(0)
            text = match.group(1)
            if not re.search(r'[\u4e00-\u9fff]', text):
                return full
            zh = text.strip()
            en = get_en(zh)
            key = make_key(page_id, zh)
            add_key(key, zh, en)
            nonlocal_modified[0] += 1
            return '{' + f"i18n.t('{key}')" + '}'
        
        new_line = re.sub(r'>\s*([^<>]*[\u4e00-\u9fff][^<>]*)\s*<', jsx_replacer, new_line)
        
        new_lines.append(new_line)
        modified_count += nonlocal_modified[0]
    
    new_content = '\n'.join(new_lines)
    
    # Add i18n import if not present
    if "import i18n from '@/i18n'" not in new_content:
        # Add after the last import
        import_idx = 0
        for idx, line in enumerate(new_lines):
            if line.startswith('import '):
                import_idx = idx
        new_lines.insert(import_idx + 1, "import i18n from '@/i18n';")
        new_content = '\n'.join(new_lines)
    
    # Write back
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    print(f"  OK: {modified_count} replacements made")
    return modified_count

# Process all files
print("\n" + "=" * 60)
print("PROCESSING FILES")
print("=" * 60)

total_replacements = 0
for page_id, filepath in FILES:
    file_name = os.path.basename(filepath)
    print(f"\n--- {file_name} ({page_id}) ---")
    n = process_file(filepath, page_id)
    total_replacements += n

# Update JSON files
print("\n" + "=" * 60)
print("UPDATING JSON FILES")
print("=" * 60)

# Add new keys to zh.json and en.json
pages_zh = zh_data.setdefault('pages', {})
pages_en = en_data.setdefault('pages', {})

added = 0
for key, (zh_val, en_val) in new_keys.items():
    if key not in pages_zh:
        pages_zh[key] = zh_val
        pages_en[key] = en_val
        added += 1

# Save zh.json
with open(ZH_JSON, 'w') as f:
    json.dump(zh_data, f, ensure_ascii=False, indent=4)
print(f"Updated zh.json: {added} new keys added")

# Save en.json  
with open(EN_JSON, 'w') as f:
    json.dump(en_data, f, ensure_ascii=False, indent=4)
print(f"Updated en.json: {added} new keys added")

# Final report
print("\n" + "=" * 60)
print("FINAL REPORT")
print("=" * 60)
print(f"Total files processed: {len(FILES)}")
print(f"Total replacements: {total_replacements}")
print(f"Total new i18n keys: {len(new_keys)}")

# Check for remaining Chinese text
print("\nChecking for remaining Chinese text...")
remaining_total = 0
for page_id, filepath in FILES:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    lines = content.split('\n')
    remaining = []
    for i, line in enumerate(lines):
        if re.search(r'[\u4e00-\u9fff]', line):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*'):
                continue
            if 'i18n.t(' in line or "t('" in line:
                continue
            remaining.append((i+1, stripped[:100]))
    if remaining:
        remaining_total += len(remaining)
        print(f"  {os.path.basename(filepath)}: {len(remaining)} remaining")
        for ln, text in remaining[:3]:
            print(f"    L{ln}: {text}")
        if len(remaining) > 3:
            print(f"    ... and {len(remaining) - 3} more")

if remaining_total > 0:
    print(f"\nTotal remaining Chinese text: {remaining_total} lines")
else:
    print("\nAll Chinese text has been replaced!")

# Show new keys sample
print(f"\nSample new keys (first 20 of {len(new_keys)}):")
for key, (zh_val, en_val) in sorted(new_keys.items())[:20]:
    print(f"  {key}: '{zh_val}' -> '{en_val}'")

print("\nDone!")
