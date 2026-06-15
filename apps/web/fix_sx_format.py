import re
import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    changes = 0
    
    # 修复 sx={ ... } 缺少外层大括号的情况
    # sx={ fontWeight: "bold" } -> sx={{ fontWeight: "bold" }}
    content, count = re.subn(
        r'sx=\{\s*(\w+:\s*[^}]+\s*)\}',
        lambda m: f'sx={{{{{m.group(1)}}}}}',
        content
    )
    changes += count
    
    # 修复重复 sx prop 的情况
    # sx={{ a: b }} sx={{ c: d }} -> sx={{ a: b, c: d }}
    content, count = re.subn(
        r'sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'sx={{{m.group(1)}, {m.group(2)}}}',
        content
    )
    changes += count
    
    if changes > 0:
        with open(filepath, 'w') as f:
            f.write(content)
    
    return changes

# 查找所有可能有问题的文件
files = [
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/Limspage.tsx',
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx',
]

for filepath in files:
    changes = fix_file(filepath)
    print(f'{os.path.basename(filepath)}: {changes} changes')

print('Done!')
