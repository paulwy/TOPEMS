import re
import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # 1. 修复 Grid size={{...}} -> 单独属性
    content = re.sub(
        r'<Grid\s+size=\{\s*(\{[^}]+\})\s*\}',
        lambda m: '<Grid ' + ' '.join([f"{p}={{{v}}}" for p, v in re.findall(r"(xs|sm|md|lg|xl):\s*([0-9.]+)", m.group(1))]),
        content
    )
    
    # 2. 移除 Grid item 属性 (MUI v9 默认就是 item)
    content = re.sub(
        r'<Grid\s+item(\s+)',
        r'<Grid\1',
        content
    )
    
    # 3. 修复 Typography fontWeight="bold"
    content = re.sub(
        r'<Typography([^>]*) fontWeight="bold"([^>]*)>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "bold" }}{m.group(2)}>',
        content
    )
    
    # 4. 修复 Typography fontWeight="medium"
    content = re.sub(
        r'<Typography([^>]*) fontWeight="medium"([^>]*)>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "medium" }}{m.group(2)}>',
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
    
    # 7. 修复 TextField size="small"
    content = re.sub(
        r'<TextField([^>]*) size="small"([^>]*)>',
        lambda m: f'<TextField{m.group(1)} sx={{ px: 2, py: 1 }}{m.group(2)}>',
        content
    )
    
    # 8. 修复 Select size="small"
    content = re.sub(
        r'<Select([^>]*) size="small"([^>]*)>',
        lambda m: f'<Select{m.group(1)} sx={{ px: 2, py: 1 }}{m.group(2)}>',
        content
    )
    
    # 9. 修复 Chip size="small"
    content = re.sub(
        r'<Chip([^>]*) size="small"([^>]*)>',
        lambda m: f'<Chip{m.group(1)} sx={{ px: 2, py: 0.5, fontSize: 12 }}{m.group(2)}>',
        content
    )
    
    # 10. 修复 Chip size="medium" - MUI v9 默认就是 medium
    content = re.sub(
        r'<Chip([^>]*) size="medium"([^>]*)>',
        lambda m: f'<Chip{m.group(1)}{m.group(2)}>',
        content
    )
    
    # 11. 合并重复的 sx prop
    content = re.sub(
        r'sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+\}\})',
        lambda m: f'sx={{{m.group(1)}, {m.group(2)}',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)

# 获取所有需要修复的文件
files = []
for root, dirs, filenames in os.walk('/Users/xingzhai/TOPEMS/apps/web/src'):
    for filename in filenames:
        if filename.endswith('.tsx'):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r') as f:
                content = f.read()
                if any([
                    '<Grid size=' in content,
                    '<Grid item' in content,
                    'Typography fontWeight=' in content,
                    'Button size="small"' in content,
                    'IconButton size="small"' in content,
                    'TextField size="small"' in content,
                    'Select size="small"' in content,
                    'Chip size="small"' in content,
                    'Chip size="medium"' in content,
                ]):
                    files.append(filepath)

print(f'Found {len(files)} files to migrate')

# 修复每个文件
for filepath in files:
    fix_file(filepath)
    print(f'Fixed: {os.path.basename(filepath)}')

print('\nMigration completed!')
