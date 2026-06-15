import re
import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # 修复 sx={ ... } 缺少外层大括号的情况
    # sx={ width: 32 } -> sx={{ width: 32 }}
    content = re.sub(
        r'sx=\{\s*([^}]+)\s*\}',
        lambda m: f'sx={{{{{m.group(1)}}}}}',
        content
    )
    
    # 修复重复 sx prop 的情况
    # sx={{ a }} sx={{ b }} -> sx={{ a, b }}
    content = re.sub(
        r'sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'sx={{{m.group(1)}, {m.group(2)}}}',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)

# 修复所有有问题的文件
files = [
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx',
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/Limspage.tsx',
]

for filepath in files:
    fix_file(filepath)
    print(f'Fixed: {os.path.basename(filepath)}')

print('Done!')
