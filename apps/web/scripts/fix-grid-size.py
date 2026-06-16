import os
import re

def extract_balanced_braces(s, start):
    depth = 0
    for i in range(start, len(s)):
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
            if depth == 0:
                return s[start:i+1]
    return None

def fix_grid_size(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    fixed = False
    
    pattern = re.compile(r'(<Grid\s+)size=')
    matches = list(pattern.finditer(content))
    
    for match in reversed(matches):
        prefix = match.group(1)
        size_start = match.end()
        
        if size_start < len(content) and content[size_start] == '{':
            size_value = extract_balanced_braces(content, size_start)
            if size_value:
                value_end = size_start + len(size_value)
                
                if size_value.startswith('{{') and size_value.endswith('}}'):
                    inner = size_value[2:-2]
                    parts = []
                    for part in inner.split(','):
                        part = part.strip()
                        if ':' in part:
                            key, value = part.split(':', 1)
                            key = key.strip()
                            value = value.strip()
                            parts.append(f'{key}={{{value}}}')
                    replacement = f'{prefix}{" ".join(parts)}'
                else:
                    inner = size_value[1:-1]
                    replacement = f'{prefix}xs={{{inner}}}'
                
                new_content = new_content[:match.start()] + replacement + new_content[value_end:]
                fixed = True
    
    if fixed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed: {file_path}')
        return True
    return False

def main():
    src_dir = os.path.join(os.path.dirname(__file__), '../src')
    fixed_count = 0
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx'):
                file_path = os.path.join(root, file)
                if fix_grid_size(file_path):
                    fixed_count += 1
    
    print(f'\nTotal files fixed: {fixed_count}')

if __name__ == '__main__':
    main()