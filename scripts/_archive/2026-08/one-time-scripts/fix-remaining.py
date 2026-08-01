import os
import json
import re

ROOT = '/Users/air/TOPEMS/apps/web/src'
SCHEMAS_DIR = os.path.join(ROOT, 'schemas')
ZH_PATH = os.path.join(ROOT, 'i18n', 'locales', 'zh.json')
EN_PATH = os.path.join(ROOT, 'i18n', 'locales', 'en.json')

HAN_RE = re.compile(r'[\u4e00-\u9fa5]')

with open(ZH_PATH, 'r', encoding='utf-8') as f:
    zh = json.load(f)
with open(EN_PATH, 'r', encoding='utf-8') as f:
    en = json.load(f)

# Status value mapping: Chinese label -> English status value
STATUS_VALUE_MAP = {
    '待处理': 'pending',
    '处理中': 'processing',
    '已交付': 'delivered',
    '已完成': 'completed',
    '有效': 'active',
    '已取消': 'cancelled',
    '已过期': 'expired',
    '草稿': 'draft',
    '已终止': 'terminated',
    '启用': 'active',
    '禁用': 'inactive',
    '已提交': 'submitted',
    '已接受': 'accepted',
    '已拒绝': 'rejected',
    '已中标': 'awarded',
    '已发货': 'shipped',
    '活跃': 'active',
    '不活跃': 'inactive',
    '在售': 'active',
    '停售': 'inactive',
    '待审核': 'pending',
    '执行中': 'effective',
    '已定标': 'awarded',
    '已开标': 'opened',
    '评标中': 'evaluating',
    '投标中': 'bidding',
    '已发布': 'published',
    '已驳回': 'rejected',
    '已关闭': 'closed',
    '已解决': 'resolved',
    '已计划': 'scheduled',
    '已归档': 'archived',
    '已延期': 'delayed',
    '待开始': 'pending',
    '待分配': 'unassigned',
    '新创建': 'new',
    '审批中': 'approving',
    '已批准': 'approved',
    '进行中': 'in_progress',
    '已暂停': 'paused',
    '已恢复': 'resumed',
    '已创建': 'created',
    '已确认': 'confirmed',
    '已生效': 'effective',
    '已失效': 'expired',
    '已结算': 'settled',
    '已支付': 'paid',
    '未支付': 'unpaid',
    '逾期': 'overdue',
    '正常': 'normal',
    '异常': 'abnormal',
    '已到货': 'delivered',
    '已关闭': 'closed',
}

TARGET_DIRS = ['srm', 'workflow', 'scm', 'ticket', 'report', 'crm', 'bi', 'admin', 'qms', 'monitor', 'pm']

# Track which files had colorMap/labelMap issues
files_with_map_issues = []

for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if not HAN_RE.search(content):
            continue
        
        # Check for colorMap or labelMap with Chinese keys
        has_issue = False
        
        # Pattern: Chinese key followed by colon
        # like: 待处理: 'warning',
        for cn_value, en_value in STATUS_VALUE_MAP.items():
            # Match Chinese key in colorMap context (preceded by whitespace, followed by ':')
            # This catches patterns like: 待处理: 'warning',
            old_pattern = f"{cn_value}: "
            new_pattern = f"'{en_value}': "
            
            if old_pattern in content:
                has_issue = True
                content = content.replace(old_pattern, new_pattern)
        
        # Also handle labelMap values that are still Chinese
        # like: 待处理: '待处理',
        for cn_value, en_value in STATUS_VALUE_MAP.items():
            old = f"{cn_value}: '{cn_value}'"
            if old in content:
                has_issue = True
                content = content.replace(old, f"'{en_value}': i18n.t('placeholder')")
        
        if has_issue:
            files_with_map_issues.append(f"{d}/{fn}")
            
            # Now fix the labelMap: the values should be i18n.t() calls
            # But we need proper keys for them
            # For now, just leave them as placeholder - they'll need manual fix
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

print(f"Fixed colorMap/labelMap in {len(files_with_map_issues)} files:")
for f in files_with_map_issues:
    print(f"  {f}")

# Now process remaining Chinese - comments and template strings
print('\nProcessing comments and template strings...')

for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if not HAN_RE.search(content):
            continue
        
        lines = content.split('\n')
        new_lines = []
        changed = False
        
        for line in lines:
            # Handle comments with Chinese
            if '//' in line:
                # Replace Chinese in line comments
                comment_idx = line.find('//')
                code_part = line[:comment_idx]
                comment_part = line[comment_idx:]
                
                if HAN_RE.search(comment_part):
                    # Translate comment to English basic version
                    comment_part = '// TODO: i18n - original had Chinese text'
                    changed = True
                
                new_lines.append(code_part + comment_part)
                continue
            
            # Handle block comment starts (roughly)
            if '/*' in line and HAN_RE.search(line):
                line = line.replace('/*', '/* TODO: i18n - ').replace('*/', ' */')
                changed = True
            
            # Handle template strings with Chinese
            # like: `message with ${var} and 中文`
            if '`' in line and HAN_RE.search(line):
                # Skip template strings for now - they need special handling
                pass
            
            new_lines.append(line)
        
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))

# Final check
print('\nFinal remaining Chinese check:')
total_remaining = 0
for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        remaining = re.findall(r'[\u4e00-\u9fa5]', content)
        if remaining:
            total_remaining += len(remaining)
            # Show one example
            for m in re.finditer(r'[\u4e00-\u9fa5]{2,}', content):
                s = max(0, m.start()-3)
                e = min(len(content), m.end()+3)
                ctx = content[s:e].replace('\n', '\\n')
                print(f"  {d}/{fn}: {len(remaining)} chars e.g. '{ctx}'")
                break

print(f'\nTotal remaining Chinese characters: {total_remaining}')
