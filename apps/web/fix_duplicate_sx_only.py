import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 修复 Typography 重复 sx prop
content = re.sub(
    r'<Typography([^>]*)sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+\}\})',
    lambda m: f'<Typography{m.group(1)}sx={{{m.group(2)}, {m.group(3)}',
    content
)

# 修复 Stack 重复 sx prop  
content = re.sub(
    r'<Stack([^>]*)sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+\}\})',
    lambda m: f'<Stack{m.group(1)}sx={{{m.group(2)}, {m.group(3)}',
    content
)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
