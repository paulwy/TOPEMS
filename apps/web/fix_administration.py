import re

filepath = '/Users/xingzhai/TOPEMS/apps/web/src/pages/AdministrationPage.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# 修复 <Typography ... bold> -> <Typography ... sx={{ fontWeight: "bold" }}>
content = re.sub(r'<Typography([^>]*)\s+bold\s*>', r'<Typography\1 sx={{ fontWeight: "bold" }}>', content)

# 修复 <Typography ...  bold> (多个空格)
content = re.sub(r'<Typography([^>]*)\s+\s+bold\s*>', r'<Typography\1 sx={{ fontWeight: "bold" }}>', content)

# 修复 <Typography ... medium> -> <Typography ... sx={{ fontWeight: "medium" }}>
content = re.sub(r'<Typography([^>]*)\s+medium\s*>', r'<Typography\1 sx={{ fontWeight: "medium" }}>', content)

# 修复 IconButton size="small"
content = re.sub(r'<IconButton([^>]*) size="small"([^>]*)>', r'<IconButton\1 sx={{ width: 32, height: 32 }}\2>', content)

# 修复 Button size="small"
content = re.sub(r'<Button([^>]*) size="small"([^>]*)>', r'<Button\1 sx={{ px: 2, py: 1, fontSize: 14 }}\2>', content)

# 修复 Chip size="small"
content = re.sub(r'<Chip([^>]*) size="small"([^>]*)>', r'<Chip\1 sx={{ px: 2, py: 0.5, fontSize: 12 }}\2>', content)

with open(filepath, 'w') as f:
    f.write(content)

print('Done!')
