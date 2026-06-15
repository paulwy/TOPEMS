import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 修复 Grid size={{...}} -> 单独属性
content = re.sub(
    r'<Grid\s+size=\{\s*(\{[^}]+\})\s*\}\s*key=',
    lambda m: '<Grid ' + ', '.join([f"{p}={{{v}}}" for p, v in re.findall(r"(xs|sm|md|lg|xl):\s*([0-9.]+)", m.group(1))]) + ' key=',
    content
)

# 修复 Typography fontWeight="bold"
content = re.sub(
    r'<Typography([^>]*) fontWeight="bold"([^>]*)>',
    lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "bold" }}{m.group(2)}>',
    content
)

# 修复 Typography fontWeight="medium"
content = re.sub(
    r'<Typography([^>]*) fontWeight="medium"([^>]*)>',
    lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "medium" }}{m.group(2)}>',
    content
)

# 如果已经有 sx，合并 fontWeight
content = re.sub(
    r'<Typography([^>]*)sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+\}\})',
    lambda m: f'<Typography{m.group(1)}sx={{{m.group(2)}, {m.group(3)}',
    content
)

# 修复 Stack alignItems="center" (MUI v9 中需要放在 sx 里)
content = re.sub(
    r'<Stack([^>]*) alignItems="center"([^>]*)>',
    lambda m: f'<Stack{m.group(1)} sx={{ alignItems: "center" }}{m.group(2)}>',
    content
)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
