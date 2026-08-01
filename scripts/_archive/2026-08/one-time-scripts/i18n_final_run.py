#!/usr/bin/env python3
"""Final comprehensive cleanup: comments-only, stories, and safe production files"""
import re
import json
import os
import hashlib
import glob

BASE = "/Users/air/TOPEMS/apps/web/src"
ZH = f"{BASE}/i18n/locales/zh.json"
EN = f"{BASE}/i18n/locales/en.json"

with open(ZH, encoding='utf-8') as f: zh = json.load(f)
with open(EN, encoding='utf-8') as f: en = json.load(f)

# ====== FULL DICTIONARY (same as i18n_translate_tests.py + batch) ======
D = {}
# General (from translate tests)
_general = {
    "启用": "Enabled", "激活": "Activated", "自定义": "Custom", "总数": "Total",
    "活跃": "Active", "全部": "All", "已完成": "Completed", "新": "New",
    "搜索...": "Search...", "无数据": "No data", "加载中...": "Loading...",
    "确定": "Confirm", "取消": "Cancel", "确认": "Confirm", "关闭": "Close",
    "重置": "Reset", "创建": "Create", "编辑": "Edit", "删除": "Delete",
    "查看": "View", "详情": "Details", "操作": "Action", "序号": "No.",
    "名称": "Name", "描述": "Description", "状态": "Status", "类型": "Type",
    "创建时间": "Created At", "更新时间": "Updated At", "是否": "Yes/No",
    "是": "Yes", "否": "No", "管理员": "Administrator", "用户": "User",
    "角色": "Role", "权限": "Permission", "部门": "Department",
    "公司": "Company", "员工": "Employee", "客户": "Customer", "供应商": "Supplier",
    "产品": "Product", "订单": "Order", "库存": "Inventory", "仓库": "Warehouse",
    "采购": "Purchase", "销售": "Sales", "财务": "Finance", "报表": "Report",
    "分析": "Analysis", "仪表盘": "Dashboard", "系统": "System", "设置": "Settings",
    "配置": "Configuration", "参数": "Parameters", "日志": "Log", "消息": "Message",
    "通知": "Notification", "公告": "Announcement", "任务": "Task",
    "日程": "Schedule", "事件": "Event", "活动": "Activity", "联系人": "Contact",
    "文件": "File", "文档": "Document", "图片": "Image", "视频": "Video",
    "导入": "Import", "导出": "Export", "打印": "Print", "刷新": "Refresh",
    "提交": "Submit", "保存": "Save", "返回": "Back", "上一页": "Previous",
    "下一页": "Next", "首页": "Home", "末页": "Last", "跳转": "Go to",
    "每页显示": "Per page", "条": " items", "共": "Total", "条记录": " records",
    "筛选条件": "Filter Conditions", "高级筛选": "Advanced Filter",
    "批量操作": "Batch Actions", "全选": "Select All", "反选": "Invert Selection",
    "复制": "Copy", "粘贴": "Paste", "剪切": "Cut", "撤销": "Undo",
    "重做": "Redo", "上传": "Upload", "下载": "Download", "分享": "Share",
    "收藏": "Favorite", "标签": "Tag", "分类": "Category", "分组": "Group",
    "备注": "Remarks", "说明": "Notes", "附加信息": "Additional Info",
    "基本信息": "Basic Info", "详细信息": "Details", "历史记录": "History",
    "操作记录": "Activity Log", "系统日志": "System Log", "审计日志": "Audit Log",
    "成功": "Success", "失败": "Failed", "警告": "Warning", "错误": "Error",
    "信息": "Information", "提示": "Tip", "通知中心": "Notification Center",
    "未读": "Unread", "已读": "Read", "全部标记已读": "Mark All as Read",
    "标记已读": "Mark as Read", "删除通知": "Delete Notification",
    "通知设置": "Notification Settings", "声音提醒": "Sound Alert",
    "桌面提醒": "Desktop Alert", "免打扰模式": "Do Not Disturb Mode",
    "保存设置": "Save Settings", "分钟前": " minutes ago", "小时前": " hours ago",
    "天前": " days ago", "刚刚": "Just now",
    # Stories / Design tokens
    "色板色块组件": "Color Swatch Component", "（点击复制）": " (click to copy)",
    "颜色 Story": "Color Stories", "色彩系统": "Color System",
    "点击色块复制色值。所有颜色源自 ": "Click a swatch to copy the color value. All colors come from ",
    "主色": "Primary", "辅助色": "Secondary", "成功色": "Success",
    "警告色": "Warning", "错误色": "Error", "中性色": "Neutral",
    "背景色": "Background", "表面色": "Surface", "文字颜色": "Text Colors",
    "边框颜色": "Border Colors", "排版系统": "Typography System",
    "字体和字号、字重展示。": "Font, font size, and weight showcase.",
    "字重": "Font Weight", "行高": "Line Height", "字母间距": "Letter Spacing",
    "字号层级": "Type Scale", "间距系统": "Spacing System",
    "统一间距规范，避免魔法数字。": "Unified spacing scale. No magic numbers.",
    "基础间距": "Base Spacing", "组件间距示例": "Component Spacing Example",
    "卡片标题": "Card Title", "卡片内容示例，展示内边距的使用方式。": "Card content example demonstrating padding usage.",
    "阴影系统": "Shadow System", "阴影层级示例：": "Shadow elevation levels:",
    "层级阴影对比（亮/暗模式）": "Elevation shadow comparison (Light/Dark mode)",
    "亮色模式阴影": "Light mode shadow", "暗色模式阴影": "Dark mode shadow",
    "圆角系统": "Border Radius System", "圆角大小示例：": "Border radius size examples:",
    "边框样式": "Border Styles", "语义化圆角映射": "Semantic Border Radius Mapping",
    # FormDrawer comments
    "FormDrawer - 表单抽屉公共组件": "FormDrawer - Form Drawer Public Component",
    "统一 Drawer + Form 提交模式，适用于表单内容较多或移动端场景，": "Unified Drawer + Form submit mode. Ideal for long forms or mobile use cases.",
    "提供比 Dialog 更好的阅读和编辑体验。": "Provides better reading and editing UX than Dialog.",
    "特性：": "Features:",
    "基于 Drawer 组件，提供表单专用的 API": "Built on Drawer component with form-specific APIs",
    "内置 loading 状态（提交按钮自动 disabled + 显示加载状态）": "Built-in loading state (submit button auto-disabled + loading spinner)",
    "支持 Enter 键提交表单": "Supports Enter key to submit form",
    "支持自定义确认/取消按钮文案": "Supports custom confirm/cancel button labels",
    "支持从右侧滑出（默认），也支持左侧": "Right-side slide-out (default); also supports left side",
    "编辑用户": "Edit User",
    # DataTable comments (JSDoc / section headers)
    "统一的DataTable组件": "Unified DataTable Component",
    "整合了根目录和common目录的DataTable组件，以及EnhancedDataTable的功能": "Integrates DataTable from root/common plus EnhancedDataTable features",
    "使用TanStack React Table，支持搜索、排序、筛选、分页、选择、导出等功能": "TanStack React Table based; supports search, sort, filter, pagination, selection, export",
    "增强特性：列配置持久化、行展开功能、虚拟滚动支持、高级筛选、Excel导出": "Enhanced: column config persistence, row expansion, virtual scrolling, advanced filter, Excel export",
    "类型定义": "Type Definitions",
    "行展开内容渲染函数类型": "Row expansion content renderer type",
    "高级筛选配置": "Advanced Filter Configuration",
    "虚拟滚动行数据": "Virtual Scroll Row Data",
    "行内编辑单元格组件": "Inline Edit Cell Component",
    "行内编辑保存回调类型": "Inline edit save callback type",
    # Financial Reports section
    "财务报表": "Financial Reports", "资产负债表": "Balance Sheet",
    "利润表": "Income Statement", "现金流量表": "Cash Flow Statement",
    "经营活动": "Operating Activities", "投资活动": "Investing Activities",
    "筹资活动": "Financing Activities", "流动资产": "Current Assets",
    "非流动资产": "Non-current Assets", "资产总计": "Total Assets",
    "流动负债": "Current Liabilities", "非流动负债": "Non-current Liabilities",
    "负债合计": "Total Liabilities", "所有者权益": "Owner's Equity",
    "负债和所有者权益总计": "Total Liabilities and Owner's Equity",
    "营业收入": "Operating Revenue", "营业成本": "Operating Cost",
    "营业利润": "Operating Profit", "利润总额": "Total Profit",
    "净利润": "Net Profit", "货币资金": "Cash and Cash Equivalents",
    "应收账款": "Accounts Receivable", "存货": "Inventory",
    "固定资产": "Fixed Assets", "无形资产": "Intangible Assets",
    "短期借款": "Short-term Borrowings", "应付账款": "Accounts Payable",
    "长期借款": "Long-term Borrowings", "实收资本": "Paid-in Capital",
    "资本公积": "Capital Reserve", "盈余公积": "Surplus Reserve",
    "未分配利润": "Retained Earnings", "销售商品、提供劳务收到的现金": "Cash from selling goods and rendering services",
    "收到的税费返还": "Tax refunds received",
    "购买商品、接受劳务支付的现金": "Cash paid for goods and services",
    "支付给职工以及为职工支付的现金": "Cash paid to and on behalf of employees",
    "支付的各项税费": "Tax payments", "购建固定资产、无形资产和其他长期资产支付的现金": "Cash to acquire fixed/intangible/other long-term assets",
    "投资支付的现金": "Cash paid for investments", "取得借款收到的现金": "Cash from borrowings",
    "偿还债务支付的现金": "Cash to repay borrowings", "分配股利、利润或偿付利息支付的现金": "Cash for dividends, profit distributions or interest",
    "期初现金及现金等价物余额": "Opening cash and cash equivalents",
    "期末现金及现金等价物余额": "Ending cash and cash equivalents",
    "现金及等价物净增加额": "Net increase in cash and cash equivalents",
    "加：期初现金及现金等价物余额": "Add: Opening cash and cash equivalents",
    "生成报表": "Generate Report", "报表期间": "Report Period",
    "会计期间": "Accounting Period", "所属年度": "Fiscal Year",
    "第一季度": "Q1", "第二季度": "Q2", "第三季度": "Q3", "第四季度": "Q4",
    "半年度": "Half Year", "年度": "Annual", "报表格式": "Report Format",
    "导出报表": "Export Report", "打印报表": "Print Report",
    "报表项目": "Report Item", "行次": "Line No.", "本年金额": "Current Year",
    "上年金额": "Previous Year", "本期金额": "Current Period", "上期金额": "Previous Period",
    "单位：元": "Unit: Yuan", "元": "Yuan", "人民币元": "CNY",
    "项目": "Item", "期末余额": "Ending Balance", "期初余额": "Opening Balance",
    "期末数": "Ending", "期初数": "Opening", "本年累计": "YTD Cumulative",
    "本月金额": "Current Month", "补充资料": "Supplementary Information",
    "将净利润调节为经营活动现金流量：": "Reconcile net profit to operating cash flow:",
    "净利润调节为经营活动现金流量": "Reconcile net profit to operating cash flow",
    "资产减值准备": "Asset impairment provisions",
    "固定资产折旧、油气资产折耗、生产性生物资产折旧": "Depreciation of fixed assets, oil & gas assets, productive biological assets",
    "无形资产摊销": "Amortization of intangible assets",
    "长期待摊费用摊销": "Amortization of long-term prepaid expenses",
    "待摊费用减少": "Decrease in prepaid expenses",
    "预提费用增加": "Increase in accrued expenses",
    "处置固定资产、无形资产和其他长期资产的损失（收益以“－”号填列）": "Loss on disposal of fixed/intangible/long-term assets (gains with “-”)",
    "固定资产报废损失（收益以“－”号填列）": "Loss on scrapping fixed assets (gains with “-”)",
    "公允价值变动损失（收益以“－”号填列）": "Fair value change loss (gains with “-”)",
    "财务费用（收益以“－”号填列）": "Finance costs (income with “-”)",
    "投资损失（收益以“－”号填列）": "Investment loss (gains with “-”)",
    "递延所得税资产减少（增加以“－”号填列）": "Decrease in deferred tax assets (increase with “-”)",
    "递延所得税负债增加（减少以“－”号填列）": "Increase in deferred tax liabilities (decrease with “-”)",
    "存货的减少（增加以“－”号填列）": "Decrease in inventories (increase with “-”)",
    "经营性应收项目的减少（增加以“－”号填列）": "Decrease in operating receivables (increase with “-”)",
    "经营性应付项目的增加（减少以“－”号填列）": "Increase in operating payables (decrease with “-”)",
    "其他": "Other", "经营活动产生的现金流量净额": "Net cash from operating activities",
    "不涉及现金收支的重大投资和筹资活动：": "Significant investing & financing activities not involving cash:",
    "债务转为资本": "Debt converted to capital",
    "一年内到期的可转换公司债券": "Convertible bonds due within one year",
    "融资租入固定资产": "Finance lease of fixed assets",
    "现金及等价物净变动情况：": "Net changes in cash and equivalents:",
    "现金的期末余额": "Ending balance of cash", "减：现金的期初余额": "Less: Opening balance of cash",
    "加：现金等价物的期末余额": "Add: Ending balance of cash equivalents",
    "减：现金等价物的期初余额": "Less: Opening balance of cash equivalents",
    "现金及等价物净增加额": "Net increase in cash and equivalents",
    # AI components
    "AI 助手": "AI Assistant", "智能助手": "Smart Assistant",
    "发送消息": "Send message", "输入您的问题": "Enter your question",
    "新对话": "New Chat", "清空对话": "Clear Chat",
    "导出对话": "Export Chat", "设置": "Settings",
    "模型选择": "Model Selection", "温度参数": "Temperature",
    "最大令牌数": "Max Tokens", "上下文长度": "Context Length",
    "流式输出": "Stream Output", "API密钥": "API Key",
    "代理设置": "Proxy Settings", "正在思考": "Thinking",
    "生成中": "Generating", "复制代码": "Copy Code",
    "插入代码": "Insert Code", "重新生成": "Regenerate",
    "停止生成": "Stop Generating", "代码已复制": "Code copied",
    "复制失败": "Copy failed", "上传文档": "Upload Document",
    "支持格式": "Supported Formats", "文档列表": "Document List",
    "删除文档": "Delete Document", "创建模板": "Create Template",
    "编辑模板": "Edit Template", "删除模板": "Delete Template",
    "模板名称": "Template Name", "模板内容": "Template Content",
    "模板分类": "Template Category", "系统提示词": "System Prompt",
    "用户提示词": "User Prompt", "智能检测": "Smart Detection",
    "建议修正": "Suggested Correction", "开始分析": "Start Analysis",
    "分析结果": "Analysis Results", "生成摘要": "Generate Summary",
    "摘要长度": "Summary Length", "简短": "Short",
    "中等": "Medium", "详细": "Detailed", "智能摘要": "Smart Summary",
    "数据补全": "Data Completion", "异常检测": "Anomaly Detection",
    "代码生成器": "Code Generator", "报告助手": "Report Assistant",
    "流程助手": "Flow Assistant", "文档生成器": "Document Generator",
    "数据补全器": "Data Completer", "异常助手": "Anomaly Assistant",
    "历史对话": "Chat History", "工具面板": "Tools Panel",
    "智能分析": "Smart Analysis", "表单验证": "Form Validation",
    "提示词模板管理": "Prompt Template Management",
    "上传": "Upload", "选择文件": "Select File",
    "拖拽文件到此处": "Drag files here", "或点击选择": "or click to select",
    "处理中...": "Processing...", "完成": "Complete",
    "失败": "Failed", "取消上传": "Cancel Upload", "重试": "Retry",
    "文件列表": "File List", "文件名": "File Name", "大小": "Size",
    "上传时间": "Upload Time", "状态": "Status",
    # Document Preview / Report Builder
    "文档预览": "Document Preview", "预览": "Preview",
    "放大": "Zoom In", "缩小": "Zoom Out", "适应宽度": "Fit Width",
    "适应高度": "Fit Height", "全屏": "Fullscreen",
    "下载文件": "Download File", "打印": "Print", "分享链接": "Share Link",
    "上一页": "Previous Page", "下一页": "Next Page",
    "第 {current} / {total} 页": "Page {current} / {total}",
    "加载文档中...": "Loading document...",
    "文档加载失败，请重试": "Failed to load document. Please try again.",
    "不支持的文档格式": "Unsupported document format",
    "报表构建器": "Report Builder", "选择报表类型": "Select Report Type",
    "选择数据源": "Select Data Source", "配置字段": "Configure Fields",
    "添加筛选条件": "Add Filter Conditions", "设置排序规则": "Set Sort Order",
    "配置图表": "Configure Charts", "预览报表": "Preview Report",
    "保存报表": "Save Report", "报表名称": "Report Name",
    "报表描述": "Report Description", "选择模板": "Select Template",
    "标准报表": "Standard Report", "自定义报表": "Custom Report",
    "数据透视表": "Pivot Table", "趋势分析": "Trend Analysis",
    "对比分析": "Comparative Analysis", "结构分析": "Structural Analysis",
    "环形图": "Donut Chart", "饼图": "Pie Chart",
    "柱形图": "Bar Chart", "折线图": "Line Chart",
    "面积图": "Area Chart", "散点图": "Scatter Chart",
    "雷达图": "Radar Chart", "漏斗图": "Funnel Chart",
    "图表类型": "Chart Type", "X 轴字段": "X-Axis Field",
    "Y 轴字段": "Y-Axis Field", "图表标题": "Chart Title",
    "显示图例": "Show Legend", "显示数据标签": "Show Data Labels",
    "显示网格线": "Show Gridlines", "横向排列": "Horizontal",
    "纵向排列": "Vertical", "堆叠显示": "Stacked",
    "字段列表": "Field List", "可用字段": "Available Fields",
    "已选字段": "Selected Fields", "显示名": "Display Name",
    "汇总方式": "Aggregation", "求和": "Sum", "计数": "Count",
    "平均值": "Average", "最大值": "Max", "最小值": "Min",
    "去重计数": "Distinct Count", "字段格式": "Field Format",
    "数字格式": "Number Format", "日期格式": "Date Format",
    "筛选字段": "Filter Field", "运算符": "Operator",
    "等于": "Equals", "不等于": "Not equals", "大于": "Greater than",
    "小于": "Less than", "大于等于": "Greater or equal",
    "小于等于": "Less or equal", "包含": "Contains",
    "不包含": "Does not contain", "开头是": "Starts with",
    "结尾是": "Ends with", "为空": "Is empty", "不为空": "Is not empty",
    "筛选值": "Filter Value", "添加条件": "Add Condition",
    "删除条件": "Delete Condition", "与": "AND", "或": "OR",
    "升序": "Ascending", "降序": "Descending", "排序字段": "Sort Field",
    "添加排序": "Add Sort", "删除排序": "Delete Sort",
    "正在加载数据...": "Loading data...",
    "暂无数据": "No data available",
    "请选择报表类型": "Please select a report type",
    "请选择数据源": "Please select a data source",
    "请至少选择一个字段": "Please select at least one field",
    "报表保存成功": "Report saved successfully",
    "报表保存失败": "Report save failed",
    "报表生成中...": "Generating report...",
    "报表生成失败": "Report generation failed",
    "报表配置已变更，是否保存？": "Report configuration changed. Save changes?",
    "确定要清空报表配置吗？": "Are you sure you want to clear the report configuration?",
    "确定要删除报表吗？": "Are you sure you want to delete this report?",
    "数据加载中": "Loading data",
    # ChatHistory
    "历史消息": "Chat History", "搜索历史": "Search History",
    "筛选会话": "Filter Sessions", "全部会话": "All Sessions",
    "最近的会话": "Recent Sessions", "已标记的会话": "Starred Sessions",
    "已归档的会话": "Archived Sessions", "固定": "Pin",
    "取消固定": "Unpin", "归档": "Archive",
    "取消归档": "Unarchive", "重命名": "Rename",
    "复制会话ID": "Copy Session ID",
    "会话ID已复制": "Session ID copied",
    "会话名称已更新": "Session name updated",
    "会话已归档": "Session archived",
    "会话已取消归档": "Session unarchived",
    "输入会话名称": "Enter session name",
    "搜索会话...": "Search sessions...",
    "暂无会话历史": "No session history",
    "已加载更多会话": "Loaded more sessions",
    "没有更多历史会话了": "No more session history",
    # FloatingAIHelper / AISettingsModal (partial)
    "AI 设置": "AI Settings", "模型": "Model", "温度": "Temperature",
    "上下文": "Context", "输出长度": "Output Length",
    "系统提示": "System Prompt", "启用AI助手": "Enable AI Assistant",
    "自动保存对话": "Auto-save conversations",
    "显示建议按钮": "Show suggestion buttons",
    "启用代码高亮": "Enable code highlighting",
    "启用Markdown渲染": "Enable Markdown rendering",
    "显示令牌消耗": "Show token usage",
    "启用自动补全": "Enable auto-completion",
    "自动补全触发字符": "Auto-complete trigger character",
    "显示相关文档": "Show related documents",
    "最大显示文档数": "Max related docs to show",
    "重置设置": "Reset Settings", "恢复默认": "Restore defaults",
    # DocumentManager
    "文档管理": "Document Management", "上传新文档": "Upload New Document",
    "文档名称": "Document Name", "文档类型": "Document Type",
    "文档大小": "Document Size", "上传日期": "Upload Date",
    "上传者": "Uploaded By", "最近修改": "Last Modified",
    "文件版本": "File Version", "版本管理": "Version Management",
    "查看版本": "View Version", "恢复版本": "Restore Version",
    "下载当前版本": "Download Current Version",
    "删除文档？": "Delete this document?",
    "确定要删除该文档吗？此操作不可恢复。": "Confirm document deletion? This cannot be undone.",
    "删除成功": "Deleted successfully",
    "删除失败": "Delete failed", "更新成功": "Updated successfully",
    "更新失败": "Update failed", "上传成功": "Uploaded successfully",
    "上传失败": "Upload failed",
    # ErrorBoundary remaining
    "未知错误": "Unknown Error", "网络错误": "Network Error",
    "网络连接异常，请检查您的网络状态。": "Network connection error. Please check your connectivity.",
    "数据加载失败，请稍后重试。": "Failed to load data. Please try again later.",
    "服务器响应超时。": "Server response timed out.",
    "接口返回异常数据。": "API returned invalid data.",
    "未找到资源": "Resource Not Found",
    "您访问的资源不存在或已被删除。": "The resource you requested does not exist or has been deleted.",
    "页面加载失败": "Page load failed",
    "发生了一些意外情况，请尝试刷新页面。": "Something unexpected happened. Please try refreshing the page.",
    "您可以尝试以下操作：": "You can try the following actions:",
    "刷新页面": "Refresh page", "返回首页": "Go Home",
    "重试加载": "Retry loading", "返回上一页": "Go Back",
    "联系技术支持": "Contact Support",
    "查看错误详情": "View error details", "隐藏错误详情": "Hide error details",
    "错误详情：": "Error details:", "堆栈跟踪：": "Stack trace:",
    "页面组件错误：": "Page component error:",
    "模块组件错误：": "Module component error:",
    "功能组件错误：": "Feature component error:",
    "复制错误信息": "Copy error info", "错误信息已复制": "Error info copied",
    "自动上报此错误帮助我们改进产品。": "Auto-reporting this error helps us improve.",
    "正在重新加载...": "Reloading...",
    "操作执行错误": "Action execution error",
    "在执行“{action}”时发生错误。": "An error occurred while executing “{action}”.",
    "请稍后再试，如问题持续存在请联系管理员。": "Please try again later or contact admin if the issue persists.",
}
D.update(_general)

def translate(text):
    """Subroutine: translate short Chinese text (comment or short story string) using D"""
    if not text: return text
    t = text
    # sort by length desc for multi-match
    for zh, en in sorted(D.items(), key=lambda x: -len(x[0])):
        if zh in t:
            t = t.replace(zh, en)
    return t

# ========= PART 1: Comments-only translator for A files =========
def translate_comments_only(content):
    """Translate only comment portions of the source code"""
    result_lines = []
    in_block_comment = False
    for line in content.split('\n'):
        stripped = line.strip()
        new_line = line

        # Handle /** */ style JSDoc block comments
        if '/**' in stripped or in_block_comment:
            in_block_comment = True
            # Translate inside block comments (lines with * pattern)
            star_match = re.match(r'^(\s*\*\s?)(.*)$', stripped)
            # Check if block ends on this line
            block_end = '*/' in stripped
            if star_match:
                # JSDoc line
                ind = star_match.group(1)
                rest = star_match.group(2)
                # Remove trailing */ if present for translate
                rest_clean = rest.replace('*/', '').strip()
                translated = translate(rest_clean)
                # Keep leading spaces from original line
                leading_spaces = len(line) - len(line.lstrip())
                indent = line[:leading_spaces]
                new_line = f"{indent}{ind}{translated}"
                if block_end:
                    new_line += ' */'
            elif stripped.startswith('/**'):
                # opening /** on its own line
                new_line = line
            if block_end:
                in_block_comment = False
            result_lines.append(new_line)
            continue

        # Handle full-line comments: // COMMENT
        full_line_comment = re.match(r'^(\s*)//(.*)$', line)
        if full_line_comment:
            indent = full_line_comment.group(1)
            comment_body = full_line_comment.group(2).strip()
            translated = translate(comment_body)
            result_lines.append(f"{indent}// {translated}")
            continue

        # Handle line-ending comments only (code // comment)
        # Don't touch code strings; only translate part after // which has Chinese
        if '//' in line:
            idx = line.find('//')
            code_part = line[:idx]
            comment_part = line[idx+2:]
            if re.search(r'[\u4e00-\u9fff]', comment_part):
                translated = translate(comment_part.strip())
                result_lines.append(f"{code_part}// {translated}")
                continue

        result_lines.append(new_line)
    return '\n'.join(result_lines)

# ========= PART 2: Stories translator (pure English, no t) =========
def translate_stories_file(content):
    """Translate all strings/comments/JSX in a stories file to plain English"""
    result_lines = []
    for line in content.split('\n'):
        if not re.search(r'[\u4e00-\u9fff]', line):
            result_lines.append(line)
            continue
        # Translate FULL LINE (comments + strings + JSX)
        translated_line = line
        for zh, en in sorted(D.items(), key=lambda x: -len(x[0])):
            if zh in translated_line:
                translated_line = translated_line.replace(zh, en)
        result_lines.append(translated_line)
    return '\n'.join(result_lines)

# ========= PART 3: Safe .tsx production translator =========
def make_key(chinese, component, existing_keys):
    base = f"components.{component}"
    h = hashlib.md5(chinese.encode()).hexdigest()[:6]
    key = f"{base}.k_{h}"
    c = 1
    while key in existing_keys:
        key = f"{base}.k_{h}_{c}"
        c += 1
    existing_keys.add(key)
    return key

def ensure_translation_key(ns, key, zh_val, en_val):
    if ns not in zh: zh[ns] = {}
    if ns not in en: en[ns] = {}
    if isinstance(zh[ns], dict):
        zh[ns][key] = zh_val
        en[ns][key] = en_val

def add_imp_useTranslation(content, fp):
    if is_class_component(content):
        # For class components, add i18n import
        if "import i18n from " not in content and "import { i18n }" not in content and "from '@/i18n'" not in content:
            # Find last import line
            lines = content.split('\n')
            last_imp = 0
            for i, ln in enumerate(lines):
                if ln.strip().startswith('import '):
                    last_imp = i
            i18n_imp = "import i18n from '@/i18n';" if "@/i18n" in content else "import i18n from '../i18n';"
            # Use known correct path for this project
            i18n_imp = "import { i18n } from '@/i18n';"
            lines.insert(last_imp + 1, i18n_imp)
            return '\n'.join(lines)
        return content
    else:
        if 'react-i18next' not in content:
            lines = content.split('\n')
            last_imp = 0
            for i, ln in enumerate(lines):
                if ln.strip().startswith('import '):
                    last_imp = i
            imp = "import { useTranslation } from 'react-i18next';"
            lines.insert(last_imp + 1, imp)
            content = '\n'.join(lines)
        # Add const { t } = useTranslation(); at top of each function component
        return add_t_hook(content)

def is_class_component(content):
    return bool(re.search(r'class\s+\w+\s+extends\s+(React\.)?(Component|PureComponent)', content))

def add_t_hook(content):
    lines = content.split('\n')
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        # Match function-component opening patterns: export function Foo(...) { OR export default function Foo(...) { OR const Foo = () => {
        fn_match = re.search(r'(function\s+(\w+)\s*\(.*\)\s*\{|const\s+(\w+)\s*[:=].*=>\s*\{)', line)
        if fn_match and 'const { t }' not in line:
            # Check if line ends with {
            if '{' in line:
                # Compute indent from next line with content
                indent_candidate = '  '
                for j in range(i+1, min(i+4, len(lines))):
                    nxt = lines[j] if j < len(lines) else ''
                    if nxt.strip():
                        indent_candidate = nxt[:len(nxt)-len(nxt.lstrip())]
                        break
                # Peek forward, check that next 3 lines don't already have useTranslation
                already = False
                for j in range(i+1, min(i+4, len(lines))):
                    if j < len(lines) and 'useTranslation' in lines[j]:
                        already = True; break
                if not already:
                    out.append(f"{indent_candidate}const {{ t }} = useTranslation();")
            else:
                # Multi-line open; continue scanning for the {
                j = i + 1
                while j < len(lines):
                    out.append(lines[j])
                    if '{' in lines[j]:
                        indent_candidate = '  '
                        for k in range(j+1, min(j+4, len(lines))):
                            nxt = lines[k] if k < len(lines) else ''
                            if nxt.strip():
                                indent_candidate = nxt[:len(nxt)-len(nxt.lstrip())]
                                break
                        already = False
                        for k in range(j+1, min(j+4, len(lines))):
                            if k < len(lines) and 'useTranslation' in lines[k]:
                                already = True; break
                        if not already:
                            out.append(f"{indent_candidate}const {{ t }} = useTranslation();")
                        i = j  # will be incremented by end of loop
                        break
                    j += 1
        i += 1
    return '\n'.join(out)

def safe_wrap_runtime_strings(content, filepath, existing_keys):
    """Wrap remaining Chinese strings in t() (or i18n.t() for class), and wrap JSX text in {}"""
    comp = os.path.splitext(os.path.basename(filepath))[0]
    comp = comp[0].lower() + comp[1:]
    is_cls = is_class_component(content)
    is_tsx = filepath.endswith('.tsx')
    lines = content.split('\n')
    out_lines = []

    for line in lines:
        if not re.search(r'[\u4e00-\u9fff]', line):
            out_lines.append(line)
            continue
        # Skip GENERIC DEFAULT lines (contain <Xxx> in function signature line)
        # Pattern: function Foo<T extends X = { label: '中文' }>
        if re.match(r'^\s*(export\s+)?(function|const|type|interface)\b.*<', line) and '{' in line:
            # Skip - could have TypeScript generics with defaults
            out_lines.append(line)
            continue
        # JSDoc /** line OR * line inside block comment (handled above already)
        if line.strip().startswith('*') or line.strip().startswith('/*') or line.strip().startswith('//'):
            out_lines.append(line)
            continue

        # 1) Quoted string literals
        # Need to match '中文' or "中文" that are NOT already inside t('...')
        # Regex for string literals (with quotes)
        str_re = re.compile(r"""(['"])((?:(?!\1)[^\\]|\\.)*[\u4e00-\u9fff]+(?:(?!\1)[^\\]|\\.)*)\1""")
        matches = list(str_re.finditer(line))
        if matches:
            for m in reversed(matches):
                full = m.group(0)
                quote = m.group(1)
                chinese = m.group(2)
                # Check context (before match): inside t(' or i18n.t('?
                start = m.start()
                before = line[max(0, start-12):start]
                if re.search(r'(t|i18n)\(\s*$', before):
                    continue  # already wrapped
                # Generate key
                key = make_key(chinese, comp, existing_keys)
                ensure_translation_key('components', key.split('.', 1)[1], chinese, translate(chinese))
                if is_cls:
                    repl = f"i18n.t('{key}')"
                else:
                    repl = f"t('{key}')"
                line = line[:m.start()] + repl + line[m.end():]

        # 2) JSX text: >中文 between <elem>TEXT</elem>
        jsx_re = re.compile(r'(>)(\s*)([^<>\n]*[\u4e00-\u9fff]+[^<>\n]*)(\s*)(?=<)')
        jsx_matches = list(jsx_re.finditer(line))
        if jsx_matches and is_tsx:
            for m in reversed(jsx_matches):
                text = m.group(3).strip()
                if not text:
                    continue
                ws1 = m.group(2)
                ws2 = m.group(4)
                # Check if already wrapped: before > is { (i.e., }>{text}< would mean no - check pre char of >)
                open_idx = m.start(1)  # position of '>'
                pre_char = line[open_idx-1] if open_idx > 0 else ''
                if pre_char == '{':
                    # Already JSX expression
                    continue
                key = make_key(text, comp, existing_keys)
                ensure_translation_key('components', key.split('.', 1)[1], text, translate(text))
                if is_cls:
                    wrap = f">{ws1}{{i18n.t('{key}')}}{ws2}"
                else:
                    wrap = f">{ws1}{{t('{key}')}}{ws2}"
                line = line[:m.start(1)] + wrap + line[m.end():]

        out_lines.append(line)

    return '\n'.join(out_lines)

# ========== EXECUTION ==========
print("=" * 70)
print("PART 1: Comments-only translator (DataTable / FormDrawer / ErrorBoundary)")
print("=" * 70)
comment_files = [
    "components/common/FormDrawer.tsx",
    "components/common/DataTable.tsx",
    "components/common/ErrorBoundary.tsx",
]
for rel in comment_files:
    fp = f"{BASE}/{rel}"
    if not os.path.exists(fp):
        print(f"  SKIP missing: {fp}")
        continue
    with open(fp, encoding='utf-8') as f: c = f.read()
    before = len([l for l in c.split('\n') if re.search(r'[\u4e00-\u9fff]', l)])
    new_c = translate_comments_only(c)
    after = len([l for l in new_c.split('\n') if re.search(r'[\u4e00-\u9fff]', l)])
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(new_c)
    print(f"  {rel}: {before} -> {after} lines with Chinese")

print("\n" + "=" * 70)
print("PART 2: Stories translator (DesignTokens, MobileButton)")
print("=" * 70)
story_files = [
    "components/common/DesignTokens.stories.tsx",
    "components/mobile/MobileButton.stories.tsx",
]
for rel in story_files:
    fp = f"{BASE}/{rel}"
    if not os.path.exists(fp):
        print(f"  SKIP missing: {fp}")
        continue
    with open(fp, encoding='utf-8') as f: c = f.read()
    before = len([l for l in c.split('\n') if re.search(r'[\u4e00-\u9fff]', l)])
    new_c = translate_stories_file(c)
    after = len([l for l in new_c.split('\n') if re.search(r'[\u4e00-\u9fff]', l)])
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(new_c)
    print(f"  {rel}: {before} -> {after} lines with Chinese")

print("\n" + "=" * 70)
print("PART 3: Production .tsx full i18n processing")
print("=" * 70)
existing_keys = set()

def walk_keys(obj, prefix=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict): walk_keys(v, p)
            else: existing_keys.add(p)
walk_keys(zh)

production_files = [
    ("components/DocumentPreviewModal.tsx", "documentPreviewModal"),
    ("components/ReportBuilder.tsx", "reportBuilder"),
    ("components/finance/FinancialReports.tsx", "financialReports"),
    ("components/ai/ChatHistory.tsx", "chatHistory"),
    ("components/ai/AIReportAssistant.tsx", "aiReportAssistant"),
    ("components/ai/AIFormValidator.tsx", "aiFormValidator"),
    ("components/ai/AIDocumentGenerator.tsx", "aiDocumentGenerator"),
    ("components/ai/FloatingAIHelper.tsx", "floatingAIHelper"),
]

for rel, comp_override in production_files:
    fp = f"{BASE}/{rel}"
    if not os.path.exists(fp):
        print(f"  SKIP missing: {fp}")
        continue
    print(f"\n  Processing {rel} ...")
    with open(fp, encoding='utf-8') as f: c = f.read()
    before = len([l for l in c.split('\n') if re.search(r'[\u4e00-\u9fff]', l)])

    # Step 1: Comments translate (inline comments are translated too)
    c = translate_comments_only(c)

    # Step 2: Add imports + useTranslation hook (or i18n for class)
    c = add_imp_useTranslation(c, rel)

    # Step 3: Wrap runtime strings (skip comments & TS generics)
    c = safe_wrap_runtime_strings(c, rel, existing_keys)

    after = len([l for l in c.split('\n') if re.search(r'[\u4e00-\u9fff]', l)])
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)
    is_cls = is_class_component(c)
    print(f"    before={before} after={after} (class={is_cls})")

# Save JSON
print("\n" + "=" * 70)
print("Saving translation files...")
print("=" * 70)
with open(ZH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)
with open(EN, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
print("  zh.json & en.json saved!")

print("\n=== Final check: lines with Chinese per target file ===")
targets_final = comment_files + story_files + [x[0] for x in production_files]
remaining_total = 0
for rel in targets_final:
    fp = f"{BASE}/{rel}"
    if not os.path.exists(fp): continue
    with open(fp, encoding='utf-8') as f:
        lines = f.readlines()
    r = 0
    for ln in lines:
        if re.search(r'[\u4e00-\u9fff]', ln): r += 1
    if r:
        remaining_total += r
        print(f"  {r:3d} lines remaining: {rel}")
if remaining_total == 0:
    print("  ✅ All target files Chinese-free!")
else:
    print(f"\n  ⚠️  {remaining_total} lines with Chinese remaining")
