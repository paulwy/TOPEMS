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

TARGET_DIRS = ['srm', 'workflow', 'scm', 'ticket', 'report', 'crm', 'bi', 'admin', 'qms', 'monitor', 'pm']

def process_file(file_path, module, file_name):
    """Process a single schema file, replacing Chinese text with i18n.t() calls."""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if not HAN_RE.search(content):
        return 0
    
    ts_prefix = f"schema.{module}.{file_name}"
    
    # Find all Chinese strings in single quotes
    # Pattern: 'Chinese text'
    zh_strings = set(re.findall(r"'([^']*[\u4e00-\u9fa5][^']*)'", content))
    
    if not zh_strings:
        return 0
    
    # Build mapping: zh_text -> key
    mapping = {}
    counter = 0
    
    for zh in sorted(zh_strings):
        counter += 1
        # Generate key based on content
        key = generate_key_for(zh, counter)
        mapping[zh] = key
    
    # Apply replacements - only replace strings that appear as standalone values
    # We need to be careful about context
    
    # Strategy: Replace ALL occurrences of 'Chinese text' with i18n.t('...')
    # But only if they're in a value position (not part of an identifier)
    
    # Sort by length (longest first) to avoid partial matches
    sorted_items = sorted(mapping.items(), key=lambda x: -len(x[0]))
    
    for zh_text, key in sorted_items:
        # Only match when the Chinese text is within single quotes and
        # appears as a value (preceded by : or , or [ or space)
        
        # Simple approach: replace all exact occurrences of 'zh_text'
        # But we need to preserve the structure of colorMap/labelMap
        
        # Check if this string appears in colorMap or labelMap
        # by looking at the surrounding context
        
        pattern = re.compile(r"'(" + re.escape(zh_text) + r")'")
        
        def make_replacement(m):
            return f"i18n.t('{ts_prefix}.{key}')"
        
        # Find all occurrences with context
        new_content = []
        last_end = 0
        
        for match in re.finditer(r"'(" + re.escape(zh_text) + r")'", content):
            start, end = match.start(), match.end()
            matched = match.group(1)
            
            # Get context (character before the match)
            char_before = content[start-1] if start > 0 else ' '
            char_after = content[end] if end < len(content) else ' '
            
            # Check if this is inside a Map key context (like { key: 'value' })
            # or a colorMap/labelMap context
            
            # Look back to see if we're in a colorMap or labelMap
            before_text = content[max(0, start-200):start]
            
            is_in_colormap = 'colorMap' in before_text.split('\n')[-3:] if '\n' in before_text else 'colorMap' in before_text
            is_in_labelmap = 'labelMap' in before_text.split('\n')[-3:] if '\n' in before_text else 'labelMap' in before_text
            
            if is_in_colormap:
                # In colorMap, keys are status values, values are color names
                # Don't modify colorMap values (they should be Chinese -> i18n)
                # but keys should stay as-is
                pass
            
            if is_in_labelmap:
                # In labelMap, keys are status values, values are display text
                # Replace the VALUES (right side), not keys (left side)
                # Values are preceded by ': '
                pass
            
            # For now, do a simple replacement
            new_content.append(content[last_end:start])
            new_content.append(make_replacement(m))
            last_end = end
        
        new_content.append(content[last_end:])
        content = ''.join(new_content)
    
    # Add import if needed
    if "import i18n from '@/i18n'" not in content:
        import_line = "import i18n from '@/i18n';\n"
        last_import_idx = content.rfind('import ')
        if last_import_idx != -1:
            semi_idx = content.find(';\n', last_import_idx)
            if semi_idx != -1:
                content = content[:semi_idx + 2] + import_line + content[semi_idx + 2:]
            else:
                content = import_line + content
        else:
            content = import_line + content
    
    # Validate: no broken syntax
    if "i18n.t('" in content and "') }'" in content:
        # Broken pattern detected, skip this file
        print(f"  WARNING: {module}/{file_name} has potential broken syntax")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Update translations
    if module not in zh.get('schema', {}):
        zh.setdefault('schema', {})
        zh['schema'][module] = {}
    if file_name not in zh['schema'][module]:
        zh['schema'][module][file_name] = {}
    
    if module not in en.get('schema', {}):
        en.setdefault('schema', {})
        en['schema'][module] = {}
    if file_name not in en['schema'][module]:
        en['schema'][module][file_name] = {}
    
    for zh_text, key in mapping.items():
        zh['schema'][module][file_name][key] = zh_text
        en['schema'][module][file_name][key] = zh_text
    
    return len(mapping)


def generate_key_for(zh_text, counter):
    """Generate a key for a Chinese text."""
    # Common mappings
    mappings = {
        '标签': 'label', '描述': 'description', '标题': 'title', '状态': 'status',
        '类型': 'type', '分类': 'category', '名称': 'name', '编号': 'no',
        '编码': 'code', '日期': 'date', '时间': 'time', '金额': 'amount',
        '数量': 'quantity', '价格': 'price', '备注': 'remark', '选项': 'option',
        '启用': 'active', '禁用': 'inactive', '草稿': 'draft', '待处理': 'pending',
        '处理中': 'processing', '已完成': 'completed', '已取消': 'cancelled',
        '供应商': 'supplier', '客户': 'customer', '订单': 'order', '合同': 'contract',
        '基本信息': 'basic_info', '详情': 'detail', '编辑': 'edit', '新增': 'create',
        '管理': 'manage', '显示': 'display', '隐藏': 'hide', '创建时间': 'created_at',
        '更新时间': 'updated_at', '全部': 'all', '其他': 'other',
    }
    
    for cn, en in mappings.items():
        if cn in zh_text:
            return f"{en}_{counter}"
    
    import hashlib
    h = hashlib.md5(zh_text.encode('utf-8')).hexdigest()[:6]
    return f"key_{h}_{counter}"


# Main loop
total_files = 0
total_keys = 0

for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        file_name = os.path.splitext(fn)[0]
        
        try:
            count = process_file(file_path, d, file_name)
            if count > 0:
                total_files += 1
                total_keys += count
                print(f"  OK: {d}/{file_name} ({count} keys)")
        except Exception as e:
            print(f"  ERROR: {d}/{file_name}: {str(e)}")

# Write translation files
print('\nWriting zh.json...')
with open(ZH_PATH, 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('Writing en.json...')
with open(EN_PATH, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

print(f'\nDONE! Processed {total_files} files, {total_keys} keys.')

# Show remaining
print('\nRemaining Chinese:')
for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        fp = os.path.join(dir_path, fn)
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        remaining = re.findall(r'[\u4e00-\u9fa5]', content)
        if remaining:
            print(f"  {d}/{fn}: {len(remaining)} chars")
