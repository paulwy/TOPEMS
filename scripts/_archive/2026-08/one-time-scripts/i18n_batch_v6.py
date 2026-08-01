#!/usr/bin/env python3
"""
i18n batch transformer v6 - final pass for remaining Chinese text.
"""

import json
import os
import re

BASE = '/Users/air/TOPEMS/apps/web/src'
ZH_PATH = os.path.join(BASE, 'i18n/locales/zh.json')
EN_PATH = os.path.join(BASE, 'i18n/locales/en.json')

stats = {'files': 0, 'changed': 0, 'replacements': 0, 'keys_added': 0}

ZH_EN = {
    '高': 'High',
    '中': 'Medium',
    '低': 'Low',
    '辅助色': 'Secondary Color',
    '配置自定义域名需要在 DNS 服务商添加 CNAME 记录':
        'To configure a custom domain, add a CNAME record with your DNS provider',
    '限制只能从指定 IP 范围访问': 'Restrict access to specified IP range only',
    '会话超时时间': 'Session Timeout',
    '用户无操作多长时间后自动登出': 'Auto-logout after period of inactivity',
    '成员管理': 'Member Management',
    '活跃': 'Active',
    '已邀请': 'Invited',
    '已停用': 'Deactivated',
    '通知设置': 'Notification Settings',
    '邮件通知': 'Email Notifications',
    '接收重要系统通知和账单信息':
        'Receive important system notifications and billing information',
    '持股': 'Ownership',
    '个字段': ' fields',
    '字段': 'Field',
    '请选择数据表': 'Please select a data table',
    '预览 SQL': 'Preview SQL',
    '暂无操作审计日志': 'No operation audit logs',
    '操作审计日志详情': 'Operation Audit Log Details',
    '基础信息': 'Basic Information',
    '用户名': 'Username',
    'IP 地址': 'IP Address',
    '请求数据快照': 'Request Data Snapshot',
    '最后检查': 'Last Check',
    '降级': 'Degraded',
    '已解决': 'Resolved',
    '已确认': 'Acknowledged',
    '万': '10K',
    '总价值': 'Total Value',
    '数量': 'Quantity',
    '准确率': 'Accuracy',
    '差异数量': 'Difference Count',
    '盘点明细': 'Stocktake Details',
    '录入盘点数量': 'Enter Stocktake Quantity',
    '物料编码': 'Material Code',
    '物料名称': 'Material Name',
    '盘点数量': 'Stocktake Quantity',
    '差异': 'Difference',
    '差异类型': 'Difference Type',
    '差异原因': 'Difference Reason',
    '暂无盘点明细': 'No stocktake details',
    '完成盘点': 'Complete Stocktake',
    '已生成': 'Generated',
    '条补货建议': 'replenishment suggestions',
    '建议总数': 'Suggestion Count',
    '补货单总数': 'Replenishment Order Count',
    '生成补货建议': 'Generate Suggestions',
    '补货建议': 'Replenishment Suggestions',
    '补货单': 'Replenishment Orders',
    '入库单已确认': 'Inbound order confirmed',
    '确认入库单失败': 'Failed to confirm inbound order',
    '入库单已完成': 'Inbound order completed',
    '完成入库单失败': 'Failed to complete inbound order',
    '获取科目余额失败': 'Failed to get account balance',
}


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


def semantic_key(zh):
    mapping = {
        '高': 'high', '中': 'medium', '低': 'low',
        '辅助色': 'secondary_color',
        '配置自定义域名需要在 DNS 服务商添加 CNAME 记录': 'helper_custom_domain_dns',
        '限制只能从指定 IP 范围访问': 'secondary_restrict_ip',
        '会话超时时间': 'label_session_timeout',
        '用户无操作多长时间后自动登出': 'secondary_auto_logout',
        '成员管理': 'label_member_management',
        '活跃': 'label_active',
        '已邀请': 'label_invited',
        '已停用': 'label_deactivated',
        '通知设置': 'label_notification_settings',
        '邮件通知': 'label_email_notifications',
        '接收重要系统通知和账单信息': 'secondary_receive_notifications',
        '持股': 'label_ownership',
        '个字段': 'unit_fields',
        '字段': 'label_field',
        '请选择数据表': 'placeholder_select_table',
        '预览 SQL': 'action_preview_sql',
        '暂无操作审计日志': 'no_audit_logs',
        '操作审计日志详情': 'label_audit_log_details',
        '基础信息': 'label_basic_info',
        '用户名': 'label_username',
        'IP 地址': 'label_ip_address',
        '请求数据快照': 'label_request_snapshot',
        '最后检查': 'label_last_check',
        '降级': 'label_degraded',
        '已解决': 'label_resolved',
        '已确认': 'label_acknowledged',
        '万': 'unit_ten_thousand',
        '总价值': 'label_total_value',
        '数量': 'label_quantity',
        '准确率': 'label_accuracy',
        '差异数量': 'label_diff_count',
        '盘点明细': 'label_stocktake_details',
        '录入盘点数量': 'label_enter_stocktake_qty',
        '物料编码': 'label_material_code',
        '物料名称': 'label_material_name',
        '盘点数量': 'label_stocktake_qty',
        '差异': 'label_difference',
        '差异类型': 'label_diff_type',
        '差异原因': 'label_diff_reason',
        '暂无盘点明细': 'no_stocktake_details',
        '完成盘点': 'action_complete_stocktake',
        '已生成': 'prefix_generated',
        '条补货建议': 'suffix_suggestions',
        '建议总数': 'label_suggestion_count',
        '补货单总数': 'label_replenishment_count',
        '生成补货建议': 'action_generate_suggestions',
        '补货建议': 'label_replenishment_suggestions',
        '补货单': 'label_replenishment_orders',
        '入库单已确认': 'message_inbound_confirmed',
        '确认入库单失败': 'message_inbound_confirm_failed',
        '入库单已完成': 'message_inbound_completed',
        '完成入库单失败': 'message_inbound_complete_failed',
        '获取科目余额失败': 'error_get_balance_failed',
    }
    return mapping.get(zh, 'unknown')


def has_use_translation(content):
    return ("import { useTranslation } from 'react-i18next'" in content and
            'useTranslation' in content)


def add_use_translation(content):
    """Add useTranslation import and hook if not present."""
    if has_use_translation(content):
        return content, False

    changed = False
    lines = content.split('\n')

    # Add import after last existing import
    last_import = -1
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import = i
    if last_import >= 0:
        lines.insert(last_import + 1, "import { useTranslation } from 'react-i18next';")
        changed = True
    content = '\n'.join(lines)

    # Add t hook
    if 'const { t } = useTranslation()' not in content:
        # Find component function opening brace
        patterns = [
            r'(const\s+\w+\s*=\s*\(\))',
            r'(const\s+\w+\s*=\s*\((?:[^)]*)\)\s*=>\s*\{)',
            r'(function\s+\w+\s*\([^)]*\)\s*\{)',
        ]
        best_pos = -1
        best_indent = ''
        for pat in patterns:
            m = re.search(pat, content)
            if m:
                brace_pos = content.find('{', m.end())
                if brace_pos >= 0:
                    # Get indentation of the line with the brace
                    line_start = content.rfind('\n', 0, brace_pos) + 1
                    orig_indent = content[line_start:brace_pos]
                    next_nl = content.find('\n', brace_pos)
                    if next_nl >= 0:
                        # Find next non-empty line's indent
                        rest = content[next_nl+1:]
                        for j, rline in enumerate(rest.split('\n')):
                            if rline.strip():
                                best_indent = rline[:len(rline) - len(rline.lstrip())]
                                best_pos = next_nl + 1
                                break
                    if best_pos >= 0:
                        break

        if best_pos >= 0:
            new_line = f'{best_indent}const {{ t }} = useTranslation();\n'
            content = content[:best_pos] + new_line + content[best_pos:]
            changed = True

    return content, changed


def replace_in_text(content, prefix, zh_data, en_data):
    total_repl = 0

    for zh, en in ZH_EN.items():
        key_suffix = semantic_key(zh)
        full_key = f'{prefix}.{key_suffix}'
        parts = full_key.split('.')

        # Add to JSON
        if nested_get(zh_data, parts) is None:
            nested_set(zh_data, parts, zh)
            nested_set(en_data, parts, en)
            stats['keys_added'] += 1

        # 1. JSX text: >Chinese<
        def repl_jsx(m, k=full_key):
            nonlocal total_repl
            total_repl += 1
            return f">{{t('{k}')}}<"
        pat_jsx = re.compile(r'(>)\s*(' + re.escape(zh) + r')\s*(<)')
        content = pat_jsx.sub(repl_jsx, content)

        # 2. Prop with = : propName='Chinese'
        def repl_prop(m, k=full_key):
            nonlocal total_repl
            total_repl += 1
            return f"{m.group(1)}{{t('{k}')}}"
        pat_prop = re.compile(
            r"((?:placeholder|label|title|subtitle|helperText|emptyText|message|secondary)\s*[:=]\s*)"
            r"'" + re.escape(zh) + r"'"
        )
        content = pat_prop.sub(repl_prop, content)

        # 3. showNotification calls
        def repl_notif(m, k=full_key):
            nonlocal total_repl
            total_repl += 1
            return f"{m.group(1)}t('{k}')"
        pat_notif = re.compile(
            r"(showNotification\(\s*'[^']*'\s*,\s*)"
            r"'" + re.escape(zh) + r"'"
        )
        content = pat_notif.sub(repl_notif, content)

        # 4. addNotification message field
        def repl_msg(m, k=full_key):
            nonlocal total_repl
            total_repl += 1
            return f"{m.group(1)}t('{k}')"
        pat_msg = re.compile(
            r"(message\s*:\s*)"
            r"'" + re.escape(zh) + r"'"
        )
        content = pat_msg.sub(repl_msg, content)

        # 5. Template literal: ${zh}
        def repl_tmpl(m, k=full_key):
            nonlocal total_repl
            total_repl += 1
            return f"${{t('{k}')}}"
        pat_tmpl = re.compile(r'\$\{' + re.escape(zh) + r'\}')
        content = pat_tmpl.sub(repl_tmpl, content)

        # 6. Free text in backtick templates (e.g., `数量: ...`)
        def repl_backtick(m, k=full_key):
            nonlocal total_repl
            total_repl += 1
            return f"{{t('{k}')}}"
        # Handle `prefixChinese` pattern - this is tricky
        # Skip this for now to avoid breaking things

    return content, total_repl


def fix_broken_code(filepath):
    """Fix known broken code patterns from previous runs."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    fixed = False

    # Fix patterns like: t('...')textt('...') - overlapping replacements
    # Pattern: t('key')textt('key2') where text should be between
    # These are broken and need manual review
    # For now, just flag them
    broken = re.findall(r"t\('[^']*'\)[^t]*t\('[^']*'\)", content)
    if broken:
        print(f'  WARNING: Potential broken t() calls found: {len(broken)}')
        for b in broken[:3]:
            print(f'    Pattern: {b[:80]}')

    return content, fixed


def process_file(filepath, prefix, zh_data, en_data):
    rel = os.path.relpath(filepath, BASE)
    print(f'\nProcessing: {rel}')

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    file_repl = 0

    # Step 1: Fix broken code patterns
    content, was_fixed = fix_broken_code(filepath)

    # Step 2: Add useTranslation if needed
    content, added_hook = add_use_translation(content)
    if added_hook:
        print(f'  -> Added useTranslation hook')

    # Step 3: Replace Chinese text
    content, repl = replace_in_text(content, prefix, zh_data, en_data)
    file_repl += repl

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        stats['changed'] += 1
        stats['replacements'] += file_repl
        print(f'  -> {file_repl} replacements')
    else:
        print(f'  -> No changes')

    stats['files'] += 1


def main():
    zh_data = load_json(ZH_PATH)
    en_data = load_json(EN_PATH)

    targets = [
        ('admin/MonitoringAlertPage.tsx', 'admin.monitoring_alert'),
        ('admin/DictionaryManagementPage.tsx', 'admin.dictionary_management'),
        ('admin/TenantSettingsPage.tsx', 'admin.tenant_settings'),
        ('admin/CompanyStructurePage.tsx', 'admin.company_structure'),
        ('admin/DatabaseStructurePage.tsx', 'admin.database_structure'),
        ('admin/OperationAuditLogPage.tsx', 'admin.operation_audit_log'),
        ('admin/MigrationAdminPage.tsx', 'admin.migration_admin'),
        ('admin/AccountManagementPage.tsx', 'admin.account_management'),
        ('admin/MonitorPage.tsx', 'admin.monitor_page'),
        ('admin/PermissionManagementPage.tsx', 'admin.permission_management'),
        ('admin/DashboardPage.tsx', 'admin.dashboard_page'),
        ('wms/TransferPage.tsx', 'wms.transfer_page'),
        ('wms/InventoryReportPage.tsx', 'wms.inventory_report_page'),
        ('wms/StockTakePage.tsx', 'wms.stocktake_page'),
        ('wms/ReplenishmentPage.tsx', 'wms.replenishment_page'),
        ('wms/InboundPage.tsx', 'wms.inbound_page'),
        ('wms/SerialNumberPage.tsx', 'wms.serial_number_page'),
        ('wms/InventoryPage.tsx', 'wms.inventory_page'),
        ('wms/WarehouseManagementPage.tsx', 'wms.warehouse_management_page'),
        ('wms/OutboundPage.tsx', 'wms.outbound_page'),
        ('wms/InboundOrderPage.tsx', 'wms.inbound_order_page'),
        ('system/AuditLogPage.tsx', 'system.audit_log_page'),
        ('system/SystemParamsPage/index.tsx', 'system.config_page'),
        ('system/SystemParamsPage/components/SystemConfigPanel.tsx', 'system.config_panel'),
        ('system/SystemParamsPage/components/CacheConfigPanel.tsx', 'system.cache_panel'),
    ]

    for rel, prefix in targets:
        fp = os.path.join(BASE, 'pages', rel)
        if not os.path.exists(fp):
            print(f'SKIP: {rel}')
            continue
        try:
            process_file(fp, prefix, zh_data, en_data)
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
