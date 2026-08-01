import os
import json
import re

ROOT = '/Users/air/TOPEMS/apps/web/src'
SCHEMAS_DIR = os.path.join(ROOT, 'schemas')
HAN_RE = re.compile(r'[\u4e00-\u9fa5]')

TARGET_DIRS = ['srm', 'workflow', 'scm', 'ticket', 'report', 'crm', 'bi', 'admin', 'qms', 'monitor', 'pm']

def find_chinese_strings(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    strings = set()
    # Find all single-quoted strings containing Chinese
    for match in re.finditer(r"'([^']*[\u4e00-\u9fa5][^']*)'", content):
        strings.add(match.group(1))
    
    return sorted(strings)

# Collect all Chinese strings by file
all_strings = {}
for d in TARGET_DIRS:
    dir_path = os.path.join(SCHEMAS_DIR, d)
    if not os.path.exists(dir_path):
        continue
    
    for fn in sorted(os.listdir(dir_path)):
        if not fn.endswith('.ts'):
            continue
        
        file_path = os.path.join(dir_path, fn)
        strings = find_chinese_strings(file_path)
        if strings:
            file_key = f"{d}/{os.path.splitext(fn)[0]}"
            all_strings[file_key] = strings
            print(f"  {file_key}: {len(strings)} strings")

# Write to a JSON file for manual review
output_path = os.path.join('/Users/air/TOPEMS/scripts', 'extracted-strings.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_strings, f, ensure_ascii=False, indent=2)

print(f"\nTotal: {len(all_strings)} files")
print(f"Written to: {output_path}")
