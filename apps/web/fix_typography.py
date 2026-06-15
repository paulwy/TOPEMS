import re
import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    changes = 0
    
    # 修复 <Typography ... bold> -> <Typography ... sx={{ fontWeight: "bold" }}>
    content, count = re.subn(
        r'<Typography([^>]*)\s+bold>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "bold" }}>',
        content
    )
    changes += count
    
    # 修复 <Typography ... medium> -> <Typography ... sx={{ fontWeight: "medium" }}>
    content, count = re.subn(
        r'<Typography([^>]*)\s+medium>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "medium" }}>',
        content
    )
    changes += count
    
    # 修复 <Typography ...  bold> (带空格)
    content, count = re.subn(
        r'<Typography([^>]*)\s+\s+bold>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "bold" }}>',
        content
    )
    changes += count
    
    # 修复 <Typography ...  medium> (带空格)
    content, count = re.subn(
        r'<Typography([^>]*)\s+\s+medium>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "medium" }}>',
        content
    )
    changes += count
    
    if changes > 0:
        with open(filepath, 'w') as f:
            f.write(content)
    
    return changes

# 修复 AdministrationPage.tsx
filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'
changes = fix_file(filepath)
print(f'{os.path.basename(filepath)}: {changes} changes')

print('Done!')
