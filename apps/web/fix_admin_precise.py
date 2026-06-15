import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 1. 修复 Typography 重复 sx prop
content = re.sub(
    r'<Typography([^>]*)sx=\{\{[^}]+\}\}\s+sx=\{\{([^}]+\}\})',
    lambda m: f'<Typography{m.group(1)}sx={{{m.group(2)}',
    content
)

# 2. 修复 Stack 重复 sx prop  
content = re.sub(
    r'<Stack([^>]*)sx=\{\{[^}]+\}\}\s+sx=\{\{([^}]+\}\})',
    lambda m: f'<Stack{m.group(1)}sx={{{m.group(2)}',
    content
)

# 3. 修复 Grid size={{...}} -> 单独属性
content = re.sub(
    r'<Grid\s*(key=\{[^}]+\})?\s*size=\{\s*(\{[^}]+\})\s*\}',
    lambda m: f'<Grid{m.group(1) or ""} {", ".join([f"{p}={{{v}}}" for p, v in re.findall(r"(xs|sm|md|lg|xl):\s*([0-9.]+)", m.group(2))])}',
    content
)

# 4. 移除 Grid item prop (MUI v9 默认就是 item)
content = re.sub(
    r'<Grid\s+item(\s+)',
    r'<Grid\1',
    content
)

# 5. 修复 Button size="small"
content = re.sub(
    r'<Button([^>]*) size="small"([^>]*)>',
    lambda m: f'<Button{m.group(1)} sx={{ px: 2, py: 1, fontSize: 14 }}{m.group(2)}>',
    content
)

# 6. 修复 IconButton size="small"
content = re.sub(
    r'<IconButton([^>]*) size="small"([^>]*)>',
    lambda m: f'<IconButton{m.group(1)} sx={{ width: 32, height: 32 }}{m.group(2)}>',
    content
)

# 7. 修复 Chip size="small"
content = re.sub(
    r'<Chip([^>]*) size="small"([^>]*)>',
    lambda m: f'<Chip{m.group(1)} sx={{ px: 2, py: 0.5, fontSize: 12 }}{m.group(2)}>',
    content
)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
