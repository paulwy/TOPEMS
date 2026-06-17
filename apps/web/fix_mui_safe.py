#!/usr/bin/env python3
import re
import os
import glob

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix 1: 移除 TextField 的 InputProps 属性
    # 匹配 InputProps={{...}} 模式并移除
    content = re.sub(r',?\s*InputProps=\{\{[^}]+\}\}', '', content)
    
    # Fix 2: 移除 Menu 的 PaperProps 属性
    content = re.sub(r',?\s*PaperProps=\{\{[^}]+\}\}', '', content)
    
    # Fix 3: 移除 Dialog 的 PaperProps 属性
    content = re.sub(r',?\s*PaperProps=\{\s*sx:\s*\{\s*maxHeight:\s*"[^"]+"\s*\}\s*\}', '', content)
    
    # Fix 4: 移除 ListItemText 的 primaryTypographyProps 属性
    content = re.sub(r',?\s*primaryTypographyProps=\{\{[^}]+\}\}', '', content)
    
    # Fix 5: 将 Typography 的 fontWeight 属性移到 sx 中
    # 处理没有 sx 的情况
    content = re.sub(
        r'<Typography([^>]*?)\s+fontWeight="([^"]+)"([^>]*)>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "{m.group(2)}" }}{m.group(3)}>',
        content
    )
    
    # Fix 6: 将 Stack 的 alignItems 属性移到 sx 中
    content = re.sub(
        r'<Stack([^>]*?)\s+alignItems="([^"]+)"([^>]*)>',
        lambda m: f'<Stack{m.group(1)} sx={{ alignItems: "{m.group(2)}" }}{m.group(3)}>',
        content
    )
    
    # Fix 7: 将 Stack 的 justifyContent 属性移到 sx 中
    content = re.sub(
        r'<Stack([^>]*?)\s+justifyContent="([^"]+)"([^>]*)>',
        lambda m: f'<Stack{m.group(1)} sx={{ justifyContent: "{m.group(2)}" }}{m.group(3)}>',
        content
    )
    
    # Fix 8: 将 Stack 的 flexWrap 属性移到 sx 中
    content = re.sub(
        r'<Stack([^>]*?)\s+flexWrap="([^"]+)"([^>]*)>',
        lambda m: f'<Stack{m.group(1)} sx={{ flexWrap: "{m.group(2)}" }}{m.group(3)}>',
        content
    )
    
    # Fix 9: 移除 TextField 的 inputProps 属性
    content = re.sub(r',?\s*inputProps=\{\{[^}]+\}\}', '', content)
    
    # Fix 10: 移除 Typography 的 duplicate sx 属性
    # 将重复的 sx={{...}} sx={{...}} 合并
    content = re.sub(
        r'sx=\{\{([^}]+)\}\}\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'sx={{{m.group(1)}, {m.group(2)}}}',
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
        return True
    return False

def main():
    src_dir = "/Users/air/TOPEMS/apps/web/src"
    
    for filepath in glob.glob(os.path.join(src_dir, "**/*.tsx"), recursive=True):
        if filepath.endswith(".bak"):
            continue
        
        fix_file(filepath)

if __name__ == "__main__":
    main()