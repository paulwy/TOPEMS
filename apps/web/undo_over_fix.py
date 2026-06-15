import re
import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # 把 sx={{{...}}} 变回 sx={{...}}
    content = re.sub(
        r'sx=\{\{\{([^}]+)\}\}\}',
        lambda m: f'sx={{{m.group(1)}}}',
        content
    )
    
    # 把 sx={{{{...}}}}} 变回 sx={{...}}
    content = re.sub(
        r'sx=\{\{\{\{([^}]+)\}\}\}\}',
        lambda m: f'sx={{{m.group(1)}}}',
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
