#!/usr/bin/env node
'use strict';
/**
 * R12 X-P0 Phase-2B · Fake EN CJK cleanup (admin 388 + bi 33 + pm 22 = 443 HIGHs)
 *
 * 覆盖 409 unique CJK-containing strings（exhaustive Map）。
 * 规则：
 *   1) 命中 EXACT_MAP 字面匹配 → 直接替换（优先）
 *   2) 未命中但含 CJK → 写入未命中报告 + 用通用兜底（不输出 CJK in final string）
 *   3) 严格保留 ${xxx} · {{xxx}} · `xxx` 模板变量语法
 */
const fs = require('fs'),
  path = require('path');
const EN_DIR = path.resolve(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const CJK_RE = /[\u4e00-\u9fff]/;

const EXACT_MAP = new Map([
  // ============================================================
  // admin · 标准 UI 标签 / 消息 (按拼音排序，≈388 条)
  // ============================================================
  [
    '${PLUGIN_DISPLAY_NAMES[code] || code} 服务运行在端口 ${config.port}',
    '${PLUGIN_DISPLAY_NAMES[code] || code} service running on port ${config.port}',
  ],
  [
    "${serviceName} 回滚完成：${result.record ? i18n.t('admin.migrationadminpage.已移除记录') : i18n.t('admin.migrationadminpage.无记录可回滚')}",
    "${serviceName} rollback completed: ${result.record ? i18n.t('admin.migrationadminpage.已移除记录') : i18n.t('admin.migrationadminpage.无记录可回滚')}",
  ],
  [
    '${serviceName} 迁移执行成功，共 ${result.files.length} 个文件',
    '${serviceName} migration succeeded, ${result.files.length} file(s) processed',
  ],
  [
    "${svc.name} 迁移失败：${(err as { message?: string }).message || i18n.t('admin.migrationadminpage.未知错误')}",
    "${svc.name} migration failed: ${(err as { message?: string }).message || i18n.t('admin.migrationadminpage.未知错误')}",
  ],
  [") : i18n.t('admin.migrationadminpage.迁移状态')}", ") : i18n.t('admin.migrationadminpage.迁移状态')}"],
  ['1000 次 API 调用/天', '1,000 API calls / day'],
  ['200 GB 存储空间', '200 GB storage'],
  ['200,000 次 API 调用/天', '200,000 API calls / day'],
  ['5 GB 存储空间', '5 GB storage'],
  ['50 GB 存储空间', '50 GB storage'],
  ['50,000 次 API 调用/天', '50,000 API calls / day'],
  ['7x24 专属支持', '7×24 dedicated support'],
  ['</strong> - 下次计费日期：', '</strong> - Next billing date: '],
  ['AI 智能', 'AI intelligence'],
  ['AI 智能服务', 'AI intelligent service'],
  ['API 平均响应', 'Average API response'],
  ['API 成功率', 'API success rate'],
  ['API 端点', 'API endpoint'],
  ['API 端点和请求配置', 'API endpoints & request configuration'],
  ['API 请求', 'API request'],
  ['API 请求数', 'API request count'],
  ['API 调用历史', 'API call history'],
  ['API 调用（今日）', 'API calls (today)'],
  ['API 配置', 'API configuration'],
  ['CPU 使用率', 'CPU usage'],
  ['IP 地址', 'IP address'],
  ['IP 白名单', 'IP whitelist'],
  ['IP 维度', 'IP dimension'],
  ['IP地址', 'IP address'],
  ['IP地址:', 'IP address:'],
  ['SMTP 服务器', 'SMTP server'],
  ['SMTP 端口', 'SMTP port'],
  ['SQL 预览', 'SQL preview'],
  ['SSO 单点登录', 'SSO single sign-on'],
  [
    'Schema: ${activeService.schema} ｜ 端口: ${activeService.port}',
    'Schema: ${activeService.schema} ｜ Port: ${activeService.port}',
  ],
  ['TOPEMS 企业管理系统', 'TOPEMS enterprise management system'],
  ['TOPEMS 系统', 'TOPEMS system'],
  ['nonce 缓存(秒)', 'Nonce cache (seconds)'],
  ['vs 上周期', 'vs previous period'],
  ['{{config_name}} - 模blocksDetails', '{{config_name}} - module details'],
  ['{{days}}天 {{hours}}小时 {{minutes}}分钟', '{{days}}d {{hours}}h {{minutes}}m'],
  ['| 权限码:', '| Permission code:'],
  ['· 迁移状态', '· Migration status'],
  ['上一步', 'Previous'],
  ['上限', 'Limit'],
  ['下次计费', 'Next billing'],
  ['下载量:', 'Downloads:'],
  ['主色调', 'Primary color'],
  [
    '今日 ${stats.api_requests_today.toLocaleString()} / 上限 ${tenant.settings.max_api_requests_per_day.toLocaleString()}',
    'Today ${stats.api_requests_today.toLocaleString()} / limit ${tenant.settings.max_api_requests_per_day.toLocaleString()}',
  ],
  ['今日变更', 'Changes today'],
  ['今日告警', 'Alerts today'],
  ['今日访问', 'Visits today'],
  [
    '从左侧列表选择一个字典类型查看和管理字典项',
    'Select a dictionary type from the left to view and manage dictionary items',
  ],
  ['会话超时时间', 'Session timeout'],
  ['使用 TLS', 'Use TLS'],
  ['使用情况', 'Usage'],
  ['例如: cpu_usage > 90', 'e.g. cpu_usage > 90'],
  ['例如：crm.yourcompany.com', 'e.g. crm.yourcompany.com'],
  ['保存', 'Save'],
  ['保存中...', 'Saving...'],
  ['保存更改', 'Save changes'],
  ['保存规则失败:', 'Failed to save rule: '],
  ['保存设置:', 'Save settings: '],
  ['保存防重放配置', 'Save replay protection config'],
  ['保存防重放配置失败:', 'Failed to save replay protection config: '],
  ['保存限流配置失败:', 'Failed to save rate-limit config: '],
  ['值', 'Value'],
  ['允许为空 (NULL)', 'Allow NULL'],
  ['兜底限流，保护后端服务的最大吞吐', 'Fallback rate limit, protects backend throughput ceiling'],
  ['关于权限管理', 'About permission management'],
  ['关闭', 'Close'],
  [
    '关闭后所有限流规则将不再生效（防重放仍可独立控制）',
    'When disabled, all rate-limit rules are suspended (replay protection stays independent)',
  ],
  ['内存使用率', 'Memory usage'],
  ['分类:', 'Category: '],
  ['分钟', 'Minutes'],
  ['切换字典项状态失败:', 'Failed to toggle dictionary item status: '],
  ['创建字典类型失败:', 'Failed to create dictionary type: '],
  ['创建字典项失败:', 'Failed to create dictionary item: '],
  ['创建时间', 'Created at'],
  ['创建时间:', 'Created at: '],
  ['创建银行账户:', 'Create bank account: '],
  ['删除', 'Delete'],
  ['删除字典类型失败:', 'Failed to delete dictionary type: '],
  ['删除字典项失败:', 'Failed to delete dictionary item: '],
  ['删除类型', 'Delete type'],
  ['删除规则失败:', 'Failed to delete rule: '],
  ['删除银行账户:', 'Delete bank account: '],
  ['到期 12/2025', 'Expires 12/2025'],
  ['刷新', 'Refresh'],
  ['刷新状态', 'Refresh status'],
  ['前端运行时环境变量', 'Frontend runtime environment variables'],
  ['功能开关', 'Feature toggle'],
  ['加载{{source}}审计日志失败:', 'Failed to load {{source}} audit log: '],
  ['加载中...', 'Loading...'],
  ['加载变更历史失败:', 'Failed to load change history: '],
  ['加载告警列表失败:', 'Failed to load alert list: '],
  ['加载告警规则失败:', 'Failed to load alert rules: '],
  ['加载审计日志参数:', 'Load audit log params: '],
  ['加载服务健康失败:', 'Failed to load service health: '],
  ['加载权限变更记录失败:', 'Failed to load permission change log: '],
  ['加载核心审计日志失败:', 'Failed to load core audit log: '],
  ['加载系统健康状态失败:', 'Failed to load system health status: '],
  ['加载系统指标失败:', 'Failed to load system metrics: '],
  ['加载访问控制日志失败:', 'Failed to load access control log: '],
  ['北京市朝阳区某某路123号', '123 Example Road, Chaoyang District, Beijing'],
  ['升级', 'Upgrade'],
  ['升级告警失败:', 'Failed to upgrade alert: '],
  ['卸载', 'Uninstall'],
  ['卸载级别：', 'Uninstall level: '],
  ['卸载：移除插件安装记录，数据保留90天', 'Uninstall: remove plugin installation record, keep data for 90 days'],
  ['发送邀请', 'Send invitation'],
  ['取消', 'Cancel'],
  ['可用性', 'Availability'],
  ['可用角色', 'Available roles'],
  ['可空', 'Nullable'],
  ['可选权限', 'Available permissions'],
  ['各微服务的连接配置信息', 'Connection configuration for each microservice'],
  ['名称', 'Name'],
  ['名称 *', 'Name *'],
  ['启用限流', 'Enable rate limiting'],
  ['告警列表', 'Alert list'],
  ['告警规则', 'Alert rules'],
  ['告警规则数', 'Alert rule count'],
  ['品牌定制', 'Brand customization'],
  ['品牌设置', 'Brand settings'],
  ['响应状态', 'Response status'],
  ['响应详情', 'Response details'],
  ['回滚失败', 'Rollback failed'],
  ['回滚失败:', 'Rollback failed: '],
  ['在线用户数', 'Online users'],
  ['基本信息', 'Basic information'],
  ['基本设置', 'Basic settings'],
  ['基础信息', 'Basic information'],
  ['处理中...', 'Processing...'],
  ['失败（当前页）', 'Failed (current page)'],
  ['套餐', 'Plan'],
  ['套餐选择', 'Choose a plan'],
  ['套餐配额', 'Plan quota'],
  ["如: 'active' 或 NOW()", "e.g. 'active' or NOW()"],
  ['如: new_field', 'e.g. new_field'],
  ['如: status_type', 'e.g. status_type'],
  ['如: 状态类型', 'e.g. Status type'],
  ['字典管理', 'Dictionary management'],
  ['字段', 'Field'],
  ['字段名', 'Field name'],
  ['存储空间', 'Storage space'],
  ['安全设置', 'Security settings'],
  ['安装', 'Install'],
  ['安装完成！', 'Installation completed!'],
  ['完成', 'Done'],
  ['实体ID:', 'Entity ID: '],
  ['实体类型:', 'Entity type: '],
  ['审计员 · 1小时前', 'Auditor · 1 hour ago'],
  ['审计日志为只读数据，不支持创建', 'Audit log is read-only; creation not allowed'],
  ['审计日志为只读数据，不支持删除', 'Audit log is read-only; deletion not allowed'],
  ['审计日志为只读数据，不支持更新', 'Audit log is read-only; update not allowed'],
  ['审计日志响应:', 'Audit log response: '],
  ['导入', 'Import'],
  ['导出', 'Export'],
  ['导出中...', 'Exporting...'],
  ['导出审计日志失败:', 'Failed to export audit log: '],
  ['导出审计日志成功，blob size:', 'Audit log exported successfully, blob size: '],
  [
    '将对全部 {{services_length}} 个服务执行 schema 迁移，确认继续？',
    'Schema migration will run on all {{services_length}} services. Confirm to continue?',
  ],
  ['将当前字典类型的所有字典项导出为 JSON 文件。', 'Export all items of the current dictionary type to a JSON file.'],
  ['已成功安装。', 'Installed successfully.'],
  ['已执行迁移', 'Executed migrations'],
  ['已执行迁移 (', 'Executed migrations ('],
  ['已有角色', 'Existing roles'],
  [
    '已用 ${stats.storage_used_gb}GB / 上限 ${tenant.settings.max_storage_gb}GB',
    'Used ${stats.storage_used_gb}GB / limit ${tenant.settings.max_storage_gb}GB',
  ],
  ['已解决', 'Resolved'],
  ['平均响应时间', 'Average response time'],
  ['强制启用防重放的路径', 'Paths with forced replay protection'],
  [
    '当前 ${stats.total_users} / 上限 ${tenant.settings.max_users}',
    'Current ${stats.total_users} / limit ${tenant.settings.max_users}',
  ],
  ['当前套餐', 'Current plan'],
  ['当前套餐：<strong>', 'Current plan: <strong>'],
  ['当前订阅', 'Current subscription'],
  ['彻底删除', 'Permanently delete'],
  ['彻底删除：删除所有数据，不可恢复', 'Permanently delete: remove all data, unrecoverable'],
  ['待处理告警', 'Pending alerts'],
  ['待执行迁移', 'Pending migrations'],
  ['待执行迁移 (', 'Pending migrations ('],
  ['总变更数', 'Total changes'],
  ['总访问次数', 'Total visits'],
  ['您即将安装以下插件：', 'You are about to install the following plugin: '],
  [
    '成功导入 ${successCount} 条，失败 ${items.length - successCount} 条',
    'Imported ${successCount} successfully, ${items.length - successCount} failed',
  ],
  ['成功导入 {{successCount}} 个字典项', 'Imported {{successCount}} dictionary items successfully'],
  ['成功（当前页）', 'Succeeded (current page)'],
  ['成员管理', 'Member management'],
  ['所有角色已分配', 'All roles assigned'],
  ['批量迁移', 'Batch migration'],
  [
    '批量迁移完成：成功 ${succeeded} 个，失败 ${failed} 个',
    'Batch migration completed: ${succeeded} succeeded, ${failed} failed',
  ],
  ['拒绝次数', 'Rejection count'],
  ['持股', 'Shareholding'],
  ['按 Trace ID 筛选', 'Filter by Trace ID'],
  ['按客户端 IP', 'By client IP'],
  ['按客户端 IP 限流，抵御自动化攻击', 'Rate limit by client IP, defends against automated attacks'],
  ['按用户 ID 限流，防止单个账号过度请求', 'Rate limit by user ID, prevents single account abuse'],
  ['按租户 ID 限流，控制单租户整体访问频率', 'Rate limit by tenant ID, controls per-tenant overall frequency'],
  ['排序', 'Sort'],
  ['描述', 'Description'],
  ['插件已升级', 'Plugin upgraded'],
  ['插件已卸载', 'Plugin uninstalled'],
  ['插件已启用', 'Plugin enabled'],
  ['插件已彻底删除', 'Plugin permanently deleted'],
  ['插件已禁用', 'Plugin disabled'],
  ['插件市场', 'Plugin marketplace'],
  ['插件通过市场安装，不支持直接创建', 'Plugins are installed via the marketplace; direct creation is not supported'],
  ['搜索公司名称或编码...', 'Search company name or code...'],
  ['搜索字典类型...', 'Search dictionary type...'],
  ['搜索插件...', 'Search plugins...'],
  ['搜索用户、角色或权限', 'Search users, roles, or permissions'],
  ['搜索表名...', 'Search table name...'],
  ['操作', 'Operation'],
  ['操作:', 'Operation: '],
  ['支付方式', 'Payment method'],
  ['新增字典类型', 'New dictionary type'],
  ['新增字典项', 'New dictionary item'],
  ['无限 API 调用', 'Unlimited API calls'],
  ['日志 ID', 'Log ID'],
  ['时间', 'Time'],
  ['时间戳 Header', 'Timestamp header'],
  ['时间戳容差(秒)', 'Timestamp tolerance (seconds)'],
  ['时间范围', 'Time range'],
  ['时间范围:', 'Time range: '],
  ['普通用户 · 2小时前', 'Regular user · 2 hours ago'],
  ['普通用户 · 30分钟前', 'Regular user · 30 minutes ago'],
  ['暂无公司架构数据', 'No company structure data yet'],
  ['暂无分配角色', 'No roles assigned'],
  ['暂无变更历史', 'No change history yet'],
  ['暂无告警规则', 'No alert rules yet'],
  ['暂无告警记录', 'No alerts yet'],
  ['暂无已执行记录', 'No execution records yet'],
  ['暂无待执行的迁移文件', 'No pending migration files'],
  ['暂无操作审计日志', 'No operation audit log yet'],
  ['暂无服务健康数据', 'No service health data'],
  ['暂无自定义规则', 'No custom rules yet'],
  ['更新字典类型失败:', 'Failed to update dictionary type: '],
  ['更新字典项失败:', 'Failed to update dictionary item: '],
  ['更新规则状态失败:', 'Failed to update rule status: '],
  ['更新银行账户:', 'Update bank account: '],
  ['最后检查', 'Final check'],
  ['最多 100 个用户', 'Up to 100 users'],
  ['最多 25 个用户', 'Up to 25 users'],
  ['最多 5 个用户', 'Up to 5 users'],
  ['最近1小时', 'Last 1 hour'],
  ['最近20条告警记录', 'Latest 20 alerts'],
  ['最近24小时', 'Last 24 hours'],
  ['最近6小时', 'Last 6 hours'],
  ['服务', 'Service'],
  ['服务健康状态', 'Service health status'],
  ['服务名称', 'Service name'],
  ['服务总数', 'Total services'],
  ['服务配置', 'Service configuration'],
  ['权限变更', 'Permission changes'],
  ['权限变更记录', 'Permission change log'],
  [
    '查看各服务迁移状态，生成并执行 schema / index / audit 迁移',
    'View migration status per service, generate and run schema / index / audit migrations',
  ],
  [
    '查看和管理数据库表结构，支持添加、修改、删除字段',
    'View and manage database table structure; supports adding, modifying, deleting columns',
  ],
  ['标题', 'Title'],
  ['模块', 'Module'],
  ['次/天', 'times/day'],
  ['正在安装', 'Installing'],
  ['此插件将请求以下权限：', 'This plugin will request the following permissions: '],
  [
    '此操作将修改表结构并记录到变更历史。确定要执行吗？',
    'This will modify the table structure and log to change history. Confirm execution?',
  ],
  ['浏览市场', 'Browse marketplace'],
  ['消息', 'Messages'],
  ['添加', 'Add'],
  ['添加字段', 'Add field'],
  ['添加规则', 'Add rule'],
  ['清除', 'Clear'],
  ['清除筛选', 'Clear filters'],
  ['点击上传 Logo 图片', 'Click to upload logo image'],
  ['版本:', 'Version: '],
  ['状态', 'Status'],
  ['状态:', 'Status: '],
  ['环境变量', 'Environment variables'],
  ['用户 ID', 'User ID'],
  ['用户ID:', 'User ID: '],
  ['用户、角色、权限和系统配置', 'Users, roles, permissions & system config'],
  ['用户与请求信息', 'User & request information'],
  ['用户信息', 'User information'],
  ['用户名', 'Username'],
  ['用户名:', 'Username: '],
  ['用户数', 'User count'],
  ['用户角色管理 -', 'User role management -'],
  ['登录已过期，请重新登录', 'Session expired. Please log in again'],
  ['登录次数', 'Login count'],
  [
    '确定要删除字段 "{{columnName}}" 吗？此操作不可恢复！',
    'Delete column "{{columnName}}"? This action is irreversible!',
  ],
  ['确定要删除此公司关系吗？', 'Delete this company relationship?'],
  [
    '确定要删除此字典类型吗？所有关联的字典项也将被删除。',
    'Delete this dictionary type? All linked dictionary items will also be removed.',
  ],
  ['确定要删除此字典项吗？', 'Delete this dictionary item?'],
  [
    '确定要删除这个字典类型吗？所有字典项也会被删除！',
    'Delete this dictionary type? All dictionary items will also be removed!',
  ],
  ['确定要卸载 "{{pluginCode}}" 插件吗？', 'Uninstall plugin "{{pluginCode}}"?'],
  [
    '确定要卸载 "{{pluginCode}}" 插件吗？数据将保留90天，可重新安装恢复。',
    'Uninstall plugin "{{pluginCode}}"? Data is retained for 90 days and can be restored by reinstalling.',
  ],
  [
    '确定要彻底删除 "{{pluginCode}}" 插件吗？此操作将删除所有相关数据，无法恢复！',
    'Permanently delete plugin "{{pluginCode}}"? All related data will be removed and cannot be restored!',
  ],
  [
    '确定要禁用 "{{pluginCode}}" 插件吗？禁用后数据将保留，可重新启用。',
    'Disable plugin "{{pluginCode}}"? Data will be retained and can be re-enabled.',
  ],
  ['确定要移除成员"{{user_email}}"吗？', 'Remove member "{{user_email}}"?'],
  ['确认', 'Confirm'],
  ['确认告警失败:', 'Failed to confirm alert: '],
  [
    '确认回滚 {{service_name}} 最近一次迁移？该操作不可恢复。',
    'Roll back the latest migration for {{service_name}}? This action is irreversible.',
  ],
  ['确认安装', 'Confirm install'],
  ['确认导入', 'Confirm import'],
  ['确认导出', 'Confirm export'],
  ['确认执行', 'Confirm execution'],
  ['磁盘使用率', 'Disk usage'],
  ['禁用', 'Disable'],
  ['禁用：仅停止插件运行，数据完整保留', 'Disable: only stop the plugin; all data is kept intact'],
  ['租户标识 (Slug)', 'Tenant slug'],
  ['移除', 'Remove'],
  ['管理员 · 10分钟前', 'Administrator · 10 minutes ago'],
  [
    '管理母子公司关系，用于多公司合并报表',
    'Manage parent-subsidiary relationships for multi-entity consolidated reporting',
  ],
  ['管理用户角色、权限配置', 'Manage user roles and permission configuration'],
  [
    '管理系统基础配置、邮件设置、短信设置、日志设置',
    'Manage system base config, email settings, SMS settings, log settings',
  ],
  [
    '管理系统字典、业务字典、基础数据字典',
    'Manage system dictionaries, business dictionaries, and master data dictionaries',
  ],
  ['类型', 'Type'],
  ['系统健康', 'System health'],
  ['系统管理', 'System administration'],
  ['系统运行时间', 'System uptime'],
  ['级别', 'Level'],
  ['统一审计', 'Unified audit'],
  ['编码', 'Code'],
  ['编码 *', 'Code *'],
  ['编辑', 'Edit'],
  ['编辑类型', 'Edit type'],
  ['网络延迟', 'Network latency'],
  ['自动刷新', 'Auto refresh'],
  ['表名', 'Table name'],
  ['角色变更', 'Role changes'],
  ['角色权限 -', 'Role permissions -'],
  ['解决', 'Resolve'],
  ['解决告警失败:', 'Failed to resolve alert: '],
  [
    '记录所有业务写操作（POST/PUT/PATCH/DELETE），区别于登录日志与系统审计日志',
    'Records all business write operations (POST/PUT/PATCH/DELETE), separate from login log and system audit log',
  ],
  ['访问控制日志', 'Access control log'],
  ['请求数据快照', 'Request data snapshot'],
  ['请求详情', 'Request details'],
  ['请选择一个字典类型查看详情', 'Select a dictionary type to view details'],
  ['请选择字典类型', 'Please select a dictionary type'],
  ['请选择数据表', 'Please select a data table'],
  ['资源 ID', 'Resource ID'],
  ['资源类型', 'Resource type'],
  ['路径级自定义规则', 'Path-level custom rules'],
  ['跳过路径', 'Skip paths'],
  ['辅助色', 'Accent color'],
  ['迁移执行失败', 'Migration execution failed'],
  ['迁移执行失败:', 'Migration execution failed: '],
  ['近30天登录', 'Logins in the last 30 days'],
  ['进入管理 →', 'Go to admin →'],
  ['选择 JSON 文件', 'Select JSON file'],
  ['通知设置', 'Notification settings'],
  ['邀请成员', 'Invite members'],
  [
    '配置自定义域名需要在 DNS 服务商添加 CNAME 记录',
    'Configuring a custom domain requires adding a CNAME record at your DNS provider',
  ],
  ['重置为默认', 'Reset to default'],
  ['错误信息', 'Error message'],
  ['错误率', 'Error rate'],
  ['防重放保护', 'Replay protection'],
  ['限制只能从指定 IP 范围访问', 'Restrict access to specified IP ranges only'],
  ['限流维度', 'Rate-limit dimension'],
  ['预览 SQL', 'Preview SQL'],
  ['默认值', 'Default value'],
  ['，身份认证与访问控制', ' — Identity and Access Management'],

  // ============================================================
  // bi · LLM 混合乱码 (33 条)
  // ============================================================
  ['AI 智cancent析', 'AI intelligent analysis'],
  ['安all环保', 'Safety & Environmental'],
  ['安allmatterpcs', 'Safety incident count'],
  ['avg_duration_d66526', 'avg_duration_d66526'],
  ['平均周期(Hour)', 'Average cycle (hours)'],
  ['平均周期(days)', 'Average cycle (days)'],
  ['平均评cent', 'Average rating'],
  ['供should链', 'Supply chain'],
  ['供should链tube理', 'Supply chain management'],
  ['改in', 'Update'],
  ['创new', 'Create'],
  ['2024up半year', 'H1 2024'],
  ['2024down半year', 'H2 2024'],
  ['diagram片', 'Chart'],
  ['Data集', 'Dataset'],
  ['fast速Create', 'Quick create'],
  [
    'ifuse AI 智can助手fast速CreateData Analysis报table',
    'Leverage AI intelligent assistant to quickly build data analysis reports',
  ],
  ['in度', 'Progress'],
  ['already归档', 'Archived'],
  ['Execute频率', 'Execution frequency'],
  ['HRperson力资源库', 'HR human resources database'],
  ['纬度mustmustat -90 to 90 of间', 'Latitude must be between -90 and 90'],
  ['经度mustmustat -180 to 180 of间', 'Longitude must be between -180 and 180'],
  ['MESProduction Data库', 'MES production database'],
  ['WMS仓储Database', 'WMS warehouse database'],
  ['处理Status', 'Processing status'],
  ['质qtyGrade', 'Quality grade'],
  ['评cent', 'Rating'],
  ['bi_index_page.text_e20804', 'Dataset'],
  ['Support CSV format files', 'Support CSV format files'],
  ['支持CSVFormat文pcs', 'Support CSV format files'],
  ['选择CSV文pcs', 'Select CSV file'],

  // ============================================================
  // pm · 项目管理混合词 (22 条)
  // ============================================================
  ['items目A', 'Project A'],
  ['items目B', 'Project B'],
  ['items目C', 'Project C'],
  ['items目D', 'Project D'],
  ['items目E', 'Project E'],
  ['items目', 'Project'],
  ['Contract概览', 'Contract overview'],
  ['items目StartandEnd Time', 'Project start & end time'],
  ['CPI/SPI 趋势cent析', 'CPI / SPI trend analysis'],
  ['CPI/SPI 趋势分析', 'CPI / SPI trend analysis'],
  [
    '适useatProductDesign, UIDesign, BrandDesignetc.Creativeitems目, includes research, concept design, solution confirmation phases',
    'For Product Design, UI Design, Brand Design and other creative projects; includes research, concept design, solution confirmation phases',
  ],
  [
    'Company-wide digital transformation project, 包括ERPSystem Upgrade, Data Analysis平units建设etc.',
    'Company-wide digital transformation project, including ERP system upgrade and data analytics platform build-out',
  ],
  [
    'Next-gen CRM system, 支持multi渠道Customer接inand智cancent析',
    'Next-generation CRM system with multi-channel customer access and intelligent analytics',
  ],
  [
    'Supply chain process optimization, 降Low StockCost, 提High配送效率',
    'Supply chain process optimization: lower inventory cost, improve delivery efficiency',
  ],
  [
    '基atAIofSmart Warehousing System, 实现Auto化InboundOutbound',
    'AI-based smart warehousing system with automated inbound and outbound operations',
  ],
  ['UIDesignandTechnologysquare案Design Completed', 'UI design and technology solution design completed'],
  ['API接口Development', 'API interface development'],
  ['DevelopmentRESTful API接口', 'Develop RESTful API interfaces'],
  ['User模blocksAPI', 'User module API'],
  ['Order模blocksAPI', 'Order module API'],
  ['报table模blocksAPI', 'Report module API'],
  ['No.{{index_1}}期', 'Period No. {{index_1}}'],
  ['API接口开发', 'API interface development'],
]);

// 未命中报告
const misses = [];
let files = 0,
  replaced = 0,
  fallback = 0;

for (const ns of ['admin', 'bi', 'pm']) {
  const p = path.join(EN_DIR, ns + '.json');
  if (!fs.existsSync(p)) continue;
  files++;
  const txt = fs.readFileSync(p, 'utf8');
  let obj;
  try {
    obj = JSON.parse(txt);
  } catch (e) {
    console.error('JSON parse fail:', ns);
    continue;
  }
  let mod = false;
  function walk(o, kpath) {
    if (typeof o === 'string') {
      if (!CJK_RE.test(o)) return;
      if (EXACT_MAP.has(o)) {
        o = EXACT_MAP.get(o);
        mod = true;
        replaced++;
        return o;
      }
      // 通用兜底：尝试用子串正则替换残留中文字符（针对 bi/pm 混合词中嵌入的单字）
      let nv = o
        .replace(/安all/g, 'Safety & ')
        .replace(/环保/g, 'Environmental')
        .replace(/供should/g, 'Supply')
        .replace(/链tube理/g, ' chain management')
        .replace(/链/g, ' chain')
        .replace(/改in/g, 'Update')
        .replace(/创new/g, 'Create')
        .replace(/in度/g, 'Progress')
        .replace(/评cent/g, 'Rating')
        .replace(/质qtyGrade/g, 'Quality grade')
        .replace(/处理Status/g, 'Processing status')
        .replace(/already/g, 'Already ')
        .replace(/归档/g, 'Archived')
        .replace(/Execute/g, 'Execution ')
        .replace(/频率/g, 'frequency')
        .replace(/Data库/g, ' database')
        .replace(/仓储Database/g, ' warehouse database')
        .replace(/person力/g, ' human ')
        .replace(/资源库/g, ' resources database')
        .replace(/维度mustmustat/g, ' must be between ')
        .replace(/of间/g, '')
        .replace(/items目/g, 'Project')
        .replace(/Contract概览/g, 'Contract overview')
        .replace(/cent析/g, 'Analysis')
        .replace(/提High/g, 'improve ')
        .replace(/降Low/g, 'lower ')
        .replace(/配送效率/g, 'delivery efficiency')
        .replace(/基at/g, 'Based on ')
        .replace(/ofSmart/g, ' smart ')
        .replace(/实现Auto/g, 'achieves automated ')
        .replace(/化InboundOutbound/g, ' inbound & outbound')
        .replace(/square案/g, 'solution')
        .replace(/模blocks/g, ' module ')
        .replace(/报table/g, 'Report ')
        .replace(/接口/g, ' interface ')
        .replace(/智can/g, ' intelligently ')
        .replace(/助手fast/g, ' assistant to quickly ')
        .replace(/速Create/g, '-create ')
        .replace(/CreateData/g, ' create data ')
        .replace(/Analysis报/g, ' analysis re')
        .replace(/智cancent/g, ' intelligent an')
        .replace(/ifuse/g, 'Leverage ')
        .replace(/fast/g, ' quick ')
        .replace(/diagram片/g, 'Chart')
        .replace(/\b支持multi\b/g, 'Supports multi-')
        .replace(/渠道Customer/g, '-channel customer ')
        .replace(/接inand/g, ' intake and ')
        .replace(/适useat/g, 'Suitable for ')
        .replace(/etc\.Creative/g, 'etc. creative ')
        .replace(/, includes/g, ', including')
        .replace(/平units/g, ' platform')
        .replace(/建设etc\./g, ' construction, etc.')
        .replace(/包括ERPSystem/g, ', including ERP ')
        .replace(/System Upgrade/g, ' system upgrade')
        .replace(/, Data Analysis/g, ' data analytics')
        .replace(/开发$/g, ' development')
        .replace(/Development$/g, ' development')
        .replace(/^Development/g, 'Develop ')
        .replace(/^API接口/g, 'API interface')
        .replace(/No\.\{\{index_1\}\}期/g, 'Period No. {{index_1}}')
        .replace(/  +/g, ' ')
        .trim();
      if (nv !== o && !CJK_RE.test(nv)) {
        fallback++;
        mod = true;
        return nv;
      }
      // 仍含 CJK → 记录未命中
      misses.push({ ns, path: kpath, raw: o });
      return o;
    }
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) {
        const r = walk(o[i], kpath + `[${i}]`);
        if (r !== undefined) {
          o[i] = r;
        }
      }
      return;
    }
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        const r = walk(o[k], kpath ? kpath + '.' + k : k);
        if (r !== undefined) {
          o[k] = r;
        }
      }
      return;
    }
  }
  walk(obj, '');
  if (mod) fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

console.log(
  'files:',
  files,
  '  exact replaced:',
  replaced,
  '  generic fallback:',
  fallback,
  '  misses:',
  misses.length
);
if (misses.length) {
  console.log('\n=== misses (still CJK) top 30 ===');
  misses.slice(0, 30).forEach((m) => console.log('  [' + m.ns + ':' + m.path + '] ' + JSON.stringify(m.raw)));
  // 写入 misses JSON 供调试
  fs.writeFileSync('/tmp/r12-cjk-misses.json', JSON.stringify(misses, null, 2));
  process.exit(misses.length > 0 ? 1 : 0);
} else {
  process.exit(0);
}
