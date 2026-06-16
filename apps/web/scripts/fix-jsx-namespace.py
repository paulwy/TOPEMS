import os
import re

def fix_jsx_namespace(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = re.compile(r'(?<!React\.)JSX\.Element')
    new_content = pattern.sub('React.JSX.Element', content)
    
    if new_content != content:
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
                if fix_jsx_namespace(file_path):
                    fixed_count += 1
    
    print(f'\nTotal files fixed: {fixed_count}')

if __name__ == '__main__':
    main()