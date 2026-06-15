import re
import os

def fix_stack_alignitems(content):
    # 修复 Stack 组件的 alignItems 属性（不在 sx 中）
    # 模式: <Stack ... alignItems="xxx" ...>
    
    # 找到所有 Stack 标签
    stack_pattern = r'<Stack(\s[^>]*?)>'
    
    def replace_stack(match):
        attrs = match.group(1)
        
        # 检查是否已经有 sx 属性
        sx_match = re.search(r'sx=\{\{([^}]+)\}\}', attrs)
        
        # 找到 alignItems 属性
        alignitems_match = re.search(r'\salignItems="([^"]+)"', attrs)
        
        if alignitems_match:
            alignitems_value = alignitems_match.group(1)
            
            # 从 attrs 中移除 alignItems
            attrs = re.sub(r'\salignItems="[^"]+"', '', attrs)
            
            if sx_match:
                # 如果已经有 sx，添加 alignItems 到现有 sx
                sx_content = sx_match.group(1)
                new_sx_content = sx_content.strip()
                if new_sx_content and not new_sx_content.endswith(','):
                    new_sx_content += ', '
                new_sx_content += f'alignItems: "{alignitems_value}"'
                attrs = re.sub(r'sx=\{\{[^}]+\}\}', f'sx={{{{{new_sx_content}}}}}', attrs)
            else:
                # 如果没有 sx，添加新的 sx
                attrs += f' sx={{{{{{ alignItems: "{alignitems_value}" }}}}}}'
        
        return f'<Stack{attrs}>'
    
    return re.sub(stack_pattern, replace_stack, content)

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = fix_stack_alignitems(content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f'修复: {filepath}')
    else:
        print(f'无需修复: {filepath}')

# 获取所有需要修复的文件
import subprocess
result = subprocess.run(
    ['grep', '-r', 'Stack.*alignItems', '/Users/xingzhai/TOPEMS/apps/web/src', '--include=*.tsx'],
    capture_output=True, text=True
)

files = set()
for line in result.stdout.split('\n'):
    if line:
        filepath = line.split(':')[0]
        files.add(filepath)

for filepath in files:
    process_file(filepath)

print('\n处理完成')