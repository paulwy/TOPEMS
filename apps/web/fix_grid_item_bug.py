import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 把 GridItem 变回 Grid
content = re.sub(
    r'<GridItem(\s+)',
    r'<Grid\1',
    content
)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
