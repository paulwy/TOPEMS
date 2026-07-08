import os
import re

COLOR_MAP = {
    '#14B8A6': 'teal.main',
    '#0D9488': 'teal.dark',
    '#0891b2': 'cyan.dark',
    '#06B6D4': 'cyan.main',
    '#00C897': 'emerald.main',
    '#059669': 'emerald.dark',
    '#10B981': 'emerald.main',
    '#6366F1': 'indigo.main',
    '#6366f1': 'indigo.main',
    '#9333ea': 'secondary.main',
    '#8B5CF6': 'secondary.light',
    '#8b5cf6': 'secondary.light',
    '#7e22ce': 'secondary.dark',
    '#7C3AED': 'secondary.dark',
    '#eef2ff': 'indigo.light',
    '#EEF2FF': 'indigo.light',
    '#ec4899': 'pink.main',
    '#f97316': 'orange.main',
    '#ea580c': 'orange.dark',
    '#ecfeff': 'cyan.light',
    '#f0fdfa': 'teal.light',
}

def find_sx_prop_ranges(content):
    ranges = []
    i = 0
    n = len(content)
    
    while i < n:
        if i + 3 <= n and content[i:i+3] == 'sx=':
            i += 3
            
            while i < n and content[i].isspace():
                i += 1
            
            if i < n and content[i] == '{':
                brace_count = 1
                start_pos = i
                i += 1
                
                in_string = False
                string_char = ''
                in_template = False
                
                while i < n and brace_count > 0:
                    if content[i] == '"' or content[i] == "'":
                        if not in_template:
                            if in_string and string_char == content[i]:
                                in_string = False
                            elif not in_string:
                                in_string = True
                                string_char = content[i]
                        i += 1
                        continue
                    
                    if content[i] == '`':
                        if in_template:
                            in_template = False
                        else:
                            in_template = True
                        i += 1
                        continue
                    
                    if in_string or in_template:
                        i += 1
                        continue
                    
                    if content[i] == '{':
                        brace_count += 1
                    elif content[i] == '}':
                        brace_count -= 1
                    
                    i += 1
                
                if brace_count == 0:
                    ranges.append((start_pos, i - 1))
            else:
                i += 1
        else:
            i += 1
    
    return ranges

def is_hex_color_in_gradient(color_hex, content, pos):
    search_start = max(0, pos - 50)
    search_end = min(len(content), pos + 50)
    context = content[search_start:search_end]
    
    gradient_patterns = ['linear-gradient', 'radial-gradient', 'conic-gradient']
    for pattern in gradient_patterns:
        if pattern in context:
            return True
    return False

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    sx_ranges = find_sx_prop_ranges(content)
    if not sx_ranges:
        return False
    
    modified = False
    
    for color_hex, token in COLOR_MAP.items():
        if color_hex not in content:
            continue
        
        for start, end in sx_ranges:
            sx_content = content[start:end+1]
            
            if color_hex not in sx_content:
                continue
            
            parts = []
            last_idx = 0
            
            while True:
                idx = sx_content.find(color_hex, last_idx)
                if idx == -1:
                    parts.append(sx_content[last_idx:])
                    break
                
                if is_hex_color_in_gradient(color_hex, sx_content, idx):
                    parts.append(sx_content[last_idx:idx + len(color_hex)])
                    last_idx = idx + len(color_hex)
                else:
                    parts.append(sx_content[last_idx:idx])
                    parts.append(token)
                    last_idx = idx + len(color_hex)
                    modified = True
            
            new_sx_content = ''.join(parts)
            content = content[:start] + new_sx_content + content[end+1:]
    
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Modified: {file_path}")
        return True
    return False

def main():
    src_dir = '/Users/air/TOPEMS/apps/web/src'
    total_modified = 0
    
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in ['__tests__', 'stories', 'test']]
        
        for file in files:
            if file.endswith(('.tsx', '.ts')) and not (file.startswith('test') or file.endswith('.test.ts') or file.endswith('.test.tsx')):
                file_path = os.path.join(root, file)
                if process_file(file_path):
                    total_modified += 1
    
    print(f"\nTotal files modified: {total_modified}")

if __name__ == '__main__':
    main()