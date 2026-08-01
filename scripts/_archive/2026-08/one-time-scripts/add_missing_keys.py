#!/usr/bin/env python3
"""Add missing translation keys from manual fixes"""
import json
from pathlib import Path
from collections import OrderedDict

BASE = Path('/Users/air/TOPEMS/apps/web/src/i18n/locales')

NEW_KEYS = {
    'admin.permission_management.about_title': {
        'zh': '关于权限管理',
        'en': 'About Permission Management'
    },
    'admin.permission_management.about_desc': {
        'zh': '权限是系统级配置，通常由开发人员在后端代码中预先定义。您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。',
        'en': 'Permissions are system-level configs, typically predefined by developers in backend code. You can view all available permissions here and assign them to different roles through the role management page.'
    },
    'admin.dashboard.role_admin': {'zh': '管理员', 'en': 'Admin'},
    'admin.dashboard.role_auditor': {'zh': '审计员', 'en': 'Auditor'},
    'admin.dashboard.role_regular_user': {'zh': '普通用户', 'en': 'Regular User'},
    'admin.dashboard.role_guest': {'zh': '访客', 'en': 'Guest'},
    'admin.dashboard.greeting_morning': {'zh': '上午好', 'en': 'Good morning'},
    'admin.dashboard.greeting_afternoon': {'zh': '下午好', 'en': 'Good afternoon'},
    'admin.dashboard.greeting_evening': {'zh': '晚上好', 'en': 'Good evening'},
    'admin.dashboard.subtitle_auth_access': {
        'zh': '身份认证与访问控制',
        'en': 'Auth & Access Control'
    },
    'admin.dashboard.change_label_vs_last_period': {
        'zh': 'vs 上周期',
        'en': 'vs last period'
    },
    'admin.dashboard.recent_title_recent_active_users': {
        'zh': '最近活跃用户',
        'en': 'Recent Active Users'
    },
    'admin.dashboard.quick_actions_title_quick_actions': {
        'zh': '快速操作',
        'en': 'Quick Actions'
    },
    'admin.monitoring_alert.search_alert_content': {
        'zh': '搜索告警内容...',
        'en': 'Search alert content...'
    },
}

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f, object_pairs_hook=OrderedDict)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def add_nested(data, dotted_key, value):
    parts = dotted_key.split('.')
    current = data
    for part in parts[:-1]:
        if part not in current:
            current[part] = OrderedDict()
        elif not isinstance(current[part], dict):
            current[part] = OrderedDict()
        current = current[part]
    current[parts[-1]] = value

def main():
    for lang in ['zh', 'en']:
        path = BASE / f'{lang}.json'
        print(f'Processing {path}...')
        data = load_json(path)
        
        count = 0
        for key, vals in NEW_KEYS.items():
            value = vals['zh'] if lang == 'zh' else vals['en']
            add_nested(data, key, value)
            count += 1
            print(f'  Added: {key} = {value}')
        
        save_json(path, data)
        print(f'  Saved {count} keys to {path}')

if __name__ == '__main__':
    main()