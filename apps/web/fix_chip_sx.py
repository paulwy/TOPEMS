import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 修复 sx={ ... } 缺少外层大括号的情况
content = re.sub(
    r'sx=\{\s*(px:\s*2,\s*py:\s*0.5,\s*fontSize:\s*12)\s*\}',
    r'sx={{\1}}',
    content
)

# 修复 sx={ ... } 缺少外层大括号的其他情况
content = re.sub(
    r'sx=\{\s*(width:\s*32,\s*height:\s*32)\s*\}',
    r'sx={{\1}}',
    content
)

# 修复 sx={ ... } 缺少外层大括号的其他情况
content = re.sub(
    r'sx=\{\s*(px:\s*2,\s*py:\s*1,\s*fontSize:\s*14)\s*\}',
    r'sx={{\1}}',
    content
)

# 修复重复的 sx prop
content = re.sub(
    r'sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+)\}\}',
    lambda m: f'sx={{{m.group(1)}, {m.group(2)}}}',
    content
)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
