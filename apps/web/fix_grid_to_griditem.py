import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 把 <Grid xs={...}> 改成 <GridItem xs={...}>
content = re.sub(
    r'<Grid(\s+[^>]*)?\s+(xs|sm|md|lg|xl)=\{[^}]+\}',
    lambda m: f'<GridItem{m.group(1) or ""} {m.group(2)}',
    content
)

# 确保 GridItem 后面的属性格式正确
content = re.sub(
    r'<GridItem(\s+)(xs|sm|md|lg|xl)=\{([^}]+)\}',
    lambda m: f'<GridItem{m.group(1)}{m.group(2)}={{{m.group(3)}}}',
    content
)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
