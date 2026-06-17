#!/usr/bin/env python3
import re
import os
import glob

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix Typography fontWeight
    # 处理 <Typography variant="xxx" fontWeight="bold" sx={{...}}>
    content = re.sub(
        r'<Typography([^>]*?)\s+fontWeight="([^"]+)"\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'<Typography{m.group(1)} sx={{{m.group(3)}, fontWeight: "{m.group(2)}"}}>',
        content
    )
    
    # 处理 <Typography variant="xxx" fontWeight="bold"> (没有sx的情况)
    content = re.sub(
        r'<Typography([^>]*?)\s+fontWeight="([^"]+)">',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "{m.group(2)}" }}>',
        content
    )
    
    # Fix Stack alignItems
    content = re.sub(
        r'<Stack([^>]*?)\s+alignItems="([^"]+)"\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'<Stack{m.group(1)} sx={{{m.group(3)}, alignItems: "{m.group(2)}"}}>',
        content
    )
    
    content = re.sub(
        r'<Stack([^>]*?)\s+alignItems="([^"]+)">',
        lambda m: f'<Stack{m.group(1)} sx={{ alignItems: "{m.group(2)}" }}>',
        content
    )
    
    # Fix Stack flexWrap
    content = re.sub(
        r'<Stack([^>]*?)\s+flexWrap="([^"]+)"\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'<Stack{m.group(1)} sx={{{m.group(3)}, flexWrap: "{m.group(2)}"}}>',
        content
    )
    
    content = re.sub(
        r'<Stack([^>]*?)\s+flexWrap="([^"]+)">',
        lambda m: f'<Stack{m.group(1)} sx={{ flexWrap: "{m.group(2)}" }}>',
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