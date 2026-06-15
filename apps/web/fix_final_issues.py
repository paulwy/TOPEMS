import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 1. 移除 Grid item prop (MUI v9 默认就是 item)
content = re.sub(
    r'<Grid\s+item(\s+)',
    r'<Grid\1',
    content
)

# 2. 修复 Typography fontWeight 属性 - 应该放在 sx 里面
content = re.sub(
    r'<Typography([^>]*) fontWeight="bold"([^>]*)>',
    lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "bold" }}{m.group(2)}>',
    content
)

# 3. 修复 Typography fontWeight="medium"
content = re.sub(
    r'<Typography([^>]*) fontWeight="medium"([^>]*)>',
    lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "medium" }}{m.group(2)}>',
    content
)

# 4. 如果已经有 sx，合并 fontWeight
content = re.sub(
    r'<Typography([^>]*)sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+)\}\}([^>]*)>',
    lambda m: f'<Typography{m.group(1)}sx={{{m.group(2)}, {m.group(3)}}}{m.group(4)}>',
    content
)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
