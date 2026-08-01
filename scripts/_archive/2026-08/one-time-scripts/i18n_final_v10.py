#!/usr/bin/env python3
"""
i18n v10 - handles template literals, data arrays, and longer messages.
Focuses on remaining Chinese text after v9.
"""

import json
import os
import re

BASE = '/Users/air/TOPEMS/apps/web/src'
ZH_PATH = os.path.join(BASE, 'i18n/locales/zh.json')
EN_PATH = os.path.join(BASE, 'i18n/locales/en.json')

stats = {'files': 0, 'changed': 0, 'replacements': 0, 'keys_added': 0}


def load_json(p):
    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(p, d):
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)


def nested_set(d, keys, value):
    for k in keys[:-1]:
        if k not in d or not isinstance(d[k], dict):
            d[k] = {}
        d = d[k]
    d[keys[-1]] = value


def nested_get(d, keys):
    for k in keys:
        if not isinstance(d, dict) or k not in d:
            return None
        d = d[k]
    return d


# Additional ZH->EN mappings for remaining text
EXTRA_ZH_EN = {
    # System/AuditLogPage
    '审计日志': ('title_page', 'Audit Logs'),
    '操作日志查询、按时间范围/操作类型/用户筛选': ('subtitle_page', 'Query audit logs by time range, operation type, user'),
    '搜索用户名、操作、实体类型、IP...': ('placeholder_search', 'Search username, operation, entity type, IP...'),
    '用户': ('label_user', 'User'),
    '全部用户': ('option_all_users', 'All Users'),
    '操作类型': ('label_operation_type', 'Operation Type'),
    '失败': ('label_failed', 'Failed'),
    '部分成功': ('label_partial_success', 'Partial Success'),
    '创建': ('label_create', 'Create'),
    '更新': ('label_update', 'Update'),
    '删除': ('label_delete', 'Delete'),
    '读取': ('label_read', 'Read'),
    '批量创建': ('label_batch_create', 'Batch Create'),
    '批量删除': ('label_batch_delete', 'Batch Delete'),
    '导出': ('label_export', 'Export'),
    '导入': ('label_import', 'Import'),
    '登录': ('label_login', 'Login'),
    '登出': ('label_logout', 'Logout'),
    '审核': ('label_approve', 'Approve'),
    '驳回': ('label_reject', 'Reject'),
    '人力资源': ('label_hr', 'HR'),
    '制造执行': ('label_mes', 'MES'),
    '仓储': ('label_wms', 'WMS'),
    '产品数据': ('label_pdm', 'PDM'),
    '财务': ('label_finance', 'Finance'),
    '客户关系': ('label_crm', 'CRM'),
    '供应链': ('label_supply_chain', 'Supply Chain'),
    '办公自动化': ('label_oa', 'OA'),

    # SystemParamsPage/CacheConfigPanel
    '命中率': ('label_hit_rate', 'Hit Rate'),
    '无法获取缓存统计信息': ('error_cache_stats', 'Cannot get cache stats'),
    '缓存未启用，请先启用缓存功能': ('warn_cache_disabled', 'Cache not enabled'),
    '缓存设置': ('label_cache_settings', 'Cache Settings'),
    '缓存引擎和参数配置': ('subtitle_cache_config', 'Cache engine and configuration'),
    '启用缓存': ('label_enable_cache', 'Enable Cache'),

    # MigrationAdminPage
    '迁移执行成功': ('message_migration_success', 'Migration successful'),
    '迁移执行失败': ('message_migration_failed', 'Migration failed'),
    '回滚完成': ('message_rollback_complete', 'Rollback complete'),
    '回滚失败': ('message_rollback_failed', 'Rollback failed'),
    '最近一次迁移': ('label_last_migration', 'Last migration'),
    '迁移？该操作': ('confirm_migration_q', 'migration? This operation'),
    '将对全部': ('label_for_all', 'For all'),
    '个服务执行 schema 迁移': ('label_run_schema', 'services schema migration'),
    '确认继续': ('label_confirm_continue', 'confirm to continue'),
    '迁移失败': ('message_migration_failed', 'Migration failed'),
    '批量迁移完成': ('label_batch_done', 'Batch migration complete'),
    '成功': ('label_success', 'Success'),
    '个，失败': ('label_count_failed', ', failed'),
    '个': ('unit_items', ' items'),
    '服务总数': ('label_total_services', 'Total Services'),
    '待执行迁移': ('label_pending_migrations', 'Pending Migrations'),
    '已完成迁移': ('label_completed_migrations', 'Completed Migrations'),
    '服务名': ('label_service_name', 'Service Name'),
    '状态': ('label_status', 'Status'),
    '操作': ('label_actions', 'Actions'),
    '开始时间': ('label_start_time', 'Start Time'),
    '结束时间': ('label_end_time', 'End Time'),
    '耗时': ('label_duration', 'Duration'),
    '无': ('label_none', 'None'),
    '失败': ('label_failed', 'Failed'),
    '重试': ('action_retry', 'Retry'),
    '回滚': ('action_rollback', 'Rollback'),
    '查看详情': ('action_view_details', 'View Details'),
    '执行 schema 迁移': ('action_run_schema', 'Run Schema Migration'),

    # MonitorPage remaining
    '实时监控系统运行状态和服务健康度': ('subtitle_page', 'Monitor system health in real-time'),
    '服务健康状态': ('label_service_health', 'Service Health'),
    '入库管理': ('label_inbound_management', 'Inbound Management'),
    '天': ('unit_days', 'd'),
    '小时': ('unit_hours', 'h'),
    '分钟': ('unit_minutes', 'm'),
    '序列号': ('label_serial_number', 'Serial Number'),
    '共有': ('label_has_total', 'has total'),
    '条追溯记录': ('label_trace_records', 'trace records'),

    # SystemConfigPanel
    '基本信息': ('label_basic_info', 'Basic Information'),
    '站点名称、描述和图标配置': ('subtitle_site_config', 'Site name, description and icon config'),
    '站点名称': ('label_site_name', 'Site Name'),
    '输入站点名称': ('placeholder_enter_site_name', 'Enter site name'),
    '站点描述': ('label_site_description', 'Site Description'),
    '输入站点描述': ('placeholder_enter_site_desc', 'Enter site description'),
    '外观配置': ('label_appearance', 'Appearance'),
    '主题颜色和界面设置': ('subtitle_theme', 'Theme color and UI settings'),
    '次色调': ('label_secondary_color', 'Secondary Color'),
    '时区': ('label_timezone', 'Timezone'),
    '亚洲/上海 (UTC+8)': ('option_shanghai', 'Shanghai (UTC+8)'),
    '亚洲/东京 (UTC+9)': ('option_tokyo', 'Tokyo (UTC+9)'),
    '欧洲/伦敦 (UTC+0)': ('option_london', 'London (UTC+0)'),
    '美洲/纽约 (UTC-5)': ('option_newyork', 'New York (UTC-5)'),
    '美洲/洛杉矶 (UTC-8)': ('option_losangeles', 'Los Angeles (UTC-8)'),
    '语言': ('label_language', 'Language'),
    '中文 (简体)': ('option_chinese_simplified', 'Chinese (Simplified)'),
    '中文 (繁体)': ('option_chinese_traditional', 'Chinese (Traditional)'),
    '日本語': ('option_japanese', 'Japanese'),
    '安全配置': ('label_security_config', 'Security Configuration'),
    '用户认证和密码策略': ('subtitle_auth_policy', 'User authentication and password policy'),
    '允许用户注册': ('label_allow_registration', 'Allow User Registration'),
    '启用单点登录': ('label_enable_sso', 'Enable SSO'),
    '默认角色': ('label_default_role', 'Default Role'),
    '会话超时(分钟)': ('label_session_timeout', 'Session Timeout (min)'),
    '密码最小长度': ('label_min_password_length', 'Min Password Length'),
    '最大上传大小(MB)': ('label_max_upload_mb', 'Max Upload Size (MB)'),
    '密码复杂度要求': ('label_password_complexity', 'Password Complexity Requirements'),
    '需要大写字母': ('label_require_uppercase', 'Require Uppercase'),
    '需要小写字母': ('label_require_lowercase', 'Require Lowercase'),
    '需要数字': ('label_require_number', 'Require Number'),
    '需要特殊字符': ('label_require_special', 'Require Special Char'),

    # CacheConfigPanel
    '缓存状态': ('label_cache_status', 'Cache Status'),
    '当前缓存使用情况统计': ('subtitle_cache_usage', 'Current cache usage statistics'),
    '缓存键数量': ('label_cache_keys', 'Cache Key Count'),
    '内存使用': ('label_memory_usage', 'Memory Usage'),
    '缓存提供者': ('label_cache_provider', 'Cache Provider'),
    '内存': ('option_memory', 'Memory'),
    '缓存前缀': ('label_cache_prefix', 'Cache Prefix'),
    'Redis 连接配置': ('label_redis_config', 'Redis Connection Config'),
    'Redis 主机': ('label_redis_host', 'Redis Host'),

    # General
    '失败': ('label_failed', 'Failed'),
}


def detect_prefix(filepath):
    rel = os.path.relpath(filepath, BASE)
    parts = rel.replace('/', '.').replace('.tsx', '').split('.')
    module = parts[1]
    remaining = '_'.join(parts[2:]) if len(parts) > 2 else ''
    prefix = f'{module}.{remaining}' if remaining else module
    return prefix


def do_replacements(content, prefix, zh_data, en_data):
    total = 0

    for zh, (key_suffix, en) in EXTRA_ZH_EN.items():
        full_key = f'{prefix}.{key_suffix}'
        parts = full_key.split('.')

        if nested_get(zh_data, parts) is None:
            nested_set(zh_data, parts, zh)
            nested_set(en_data, parts, en)
            stats['keys_added'] += 1

        # Pattern 1: 'Chinese' in data arrays (e.g., { value: 'hrm', label: '人力资源' })
        def repl_data(m, k=full_key):
            nonlocal total
            total += 1
            return f"t('{k}')"
        pat_data = re.compile(
            r"'" + re.escape(zh) + r"'"
            r"(?=[,\s}\]])"
        )
        # Only replace in data array context (after label: or value: or similar)
        # This is too broad, so use a more targeted approach
        # Skip this - it's too aggressive

        # Pattern 2: >Chinese< in JSX
        def repl_jsx(m, k=full_key):
            nonlocal total
            total += 1
            return f">{{t('{k}')}}<"
        pat_jsx = re.compile(r'(>)\s*(' + re.escape(zh) + r')\s*(<)')
        content = pat_jsx.sub(repl_jsx, content)

        # Pattern 3: prop='Chinese'
        def repl_prop(m, k=full_key):
            nonlocal total
            total += 1
            return f"{m.group(1)}{{t('{k}')}}"
        pat_prop = re.compile(
            r"([a-zA-Z_][a-zA-Z0-9_]*\s*=\s*)"
            r"'" + re.escape(zh) + r"'"
            r"(?=[\s/>])"
        )
        content = pat_prop.sub(repl_prop, content)

        # Pattern 4: Inline 'Chinese' in ternary
        def repl_tern(m, k=full_key):
            nonlocal total
            total += 1
            return f"{m.group(1)}t('{k}')"
        pat_tern = re.compile(
            r"([?:])\s*"
            r"'" + re.escape(zh) + r"'"
        )
        content = pat_tern.sub(repl_tern, content)

        # Pattern 5: label: 'Chinese' in arrays
        def repl_label(m, k=full_key):
            nonlocal total
            total += 1
            return f"label: t('{k}')"
        pat_label = re.compile(
            r"(label\s*:\s*)"
            r"'" + re.escape(zh) + r"'"
        )
        content = pat_label.sub(repl_label, content)

    return content, total


def process_file(filepath, zh_data, en_data):
    rel = os.path.relpath(filepath, BASE)
    print(f'\nProcessing: {rel}')

    prefix = detect_prefix(filepath)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content

    content, repl = do_replacements(content, prefix, zh_data, en_data)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        stats['changed'] += 1
        stats['replacements'] += repl
        print(f'  -> {repl} replacements')
    else:
        print(f'  -> No changes')

    stats['files'] += 1


def main():
    zh_data = load_json(ZH_PATH)
    en_data = load_json(EN_PATH)

    targets = [
        'system/AuditLogPage.tsx',
        'system/SystemParamsPage/components/CacheConfigPanel.tsx',
        'system/SystemParamsPage/components/SystemConfigPanel.tsx',
        'system/SystemParamsPage/index.tsx',
        'admin/MigrationAdminPage.tsx',
        'admin/MonitorPage.tsx',
        'admin/DictionaryManagementPage.tsx',
        'admin/TenantSettingsPage.tsx',
        'admin/CompanyStructurePage.tsx',
        'admin/DatabaseStructurePage.tsx',
        'admin/OperationAuditLogPage.tsx',
        'admin/MonitoringAlertPage.tsx',
        'admin/AccountManagementPage.tsx',
        'admin/PermissionManagementPage.tsx',
        'admin/DashboardPage.tsx',
        'wms/StockTakePage.tsx',
        'wms/InventoryReportPage.tsx',
        'wms/ReplenishmentPage.tsx',
        'wms/InboundPage.tsx',
        'wms/SerialNumberPage.tsx',
        'wms/TransferPage.tsx',
        'wms/InventoryPage.tsx',
        'wms/WarehouseManagementPage.tsx',
        'wms/OutboundPage.tsx',
        'wms/InboundOrderPage.tsx',
    ]

    for rel in targets:
        fp = os.path.join(BASE, 'pages', rel)
        if not os.path.exists(fp):
            continue
        try:
            process_file(fp, zh_data, en_data)
        except Exception as e:
            import traceback
            print(f'ERROR: {rel}: {e}')
            traceback.print_exc()

    save_json(ZH_PATH, zh_data)
    save_json(EN_PATH, en_data)

    print(f'\n{"="*60}')
    print(f'SUMMARY:')
    print(f'  Files processed: {stats["files"]}')
    print(f'  Files changed: {stats["changed"]}')
    print(f'  Total replacements: {stats["replacements"]}')
    print(f'  Keys added to JSON: {stats["keys_added"]}')


if __name__ == '__main__':
    main()
