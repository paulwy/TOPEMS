#!/usr/bin/env python3
import re
import os
import glob

def count_braces(s, start):
    """Count matching braces from a starting position"""
    count = 1
    i = start + 1
    while i < len(s) and count > 0:
        if s[i] == '{':
            count += 1
        elif s[i] == '}':
            count -= 1
        i += 1
    return i - 1

def fix_sx_braces(content):
    """Fix sx={ ... } to sx={{ ... }}"""
    result = []
    i = 0
    while i < len(content):
        # Look for sx={ without proper double braces
        match = re.match(r'sx=\{\s*([a-zA-Z])', content[i:])
        if match:
            # Found sx={ something that starts with a letter (not another {)
            # This is likely missing the double braces
            result.append(content[i:i+4])  # Add "sx={"
            i += 4
            # Find matching closing brace
            end = count_braces(content, i-1)
            # Extract the content between braces
            inner_content = content[i:end]
            # Wrap it in another set of braces
            result.append('{' + inner_content + '}')
            i = end + 1
        else:
            result.append(content[i])
            i += 1
    return ''.join(result)

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # First pass: Remove unsupported props
    props_to_remove = ['InputProps', 'PaperProps', 'inputProps', 'primaryTypographyProps', 'InputLabelProps']
    for prop in props_to_remove:
        # Find prop= and remove it along with its value
        content = re.sub(r',?\s*' + prop + r'=\{\{[^}]+\}\}', '', content)
    
    # Second pass: Fix Typography fontWeight
    content = re.sub(
        r'<Typography([^>]*?)\s+fontWeight="([^"]+)"\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'<Typography{m.group(1)} sx={{{m.group(3)}, fontWeight: "{m.group(2)}"}}>',
        content
    )
    content = re.sub(
        r'<Typography([^>]*?)\s+fontWeight="([^"]+)">',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "{m.group(2)}" }}>',
        content
    )
    
    # Third pass: Fix Stack alignItems
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
    
    # Fourth pass: Fix Stack flexWrap  
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
    
    # Fifth pass: Fix Stack justifyContent
    content = re.sub(
        r'<Stack([^>]*?)\s+justifyContent="([^"]+)"\s+sx=\{\{([^}]+)\}\}',
        lambda m: f'<Stack{m.group(1)} sx={{{m.group(3)}, justifyContent: "{m.group(2)}"}}>',
        content
    )
    content = re.sub(
        r'<Stack([^>]*?)\s+justifyContent="([^"]+)">',
        lambda m: f'<Stack{m.group(1)} sx={{ justifyContent: "{m.group(2)}" }}>',
        content
    )
    
    # Final pass: Fix any remaining sx={ ... } to sx={{ ... }}
    content = fix_sx_braces(content)
    
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