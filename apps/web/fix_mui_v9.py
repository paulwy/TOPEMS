#!/usr/bin/env python3
import re
import sys

def fix_stack_props(content):
    """修复 MUI v9 Stack 组件 API 问题"""
    
    # 1. 修复: <Stack direction="row" alignItems="center" justifyContent="xxx" sx={{...}}>
    # 将 alignItems 和 justifyContent 合并到 sx 中
    def merge_stack_props(match):
        direction = match.group(1)
        align = match.group(2)
        justify = match.group(3)
        sx_content = match.group(4)
        
        # 检查 sx 中是否已有这些属性
        new_sx = sx_content
        if 'alignItems' not in new_sx:
            new_sx = new_sx.rstrip(' }') + f', alignItems: "{align}" }}'
        if 'justifyContent' not in new_sx:
            new_sx = new_sx.rstrip(' }') + f', justifyContent: "{justify}" }}'
        
        return f'<Stack direction="{direction}" sx={{{new_sx}}}>'
    
    content = re.sub(
        r'<Stack direction="(row|column)" alignItems="([^"]+)" justifyContent="([^"]+)" sx=\{\{([^}]+)\}\}>',
        merge_stack_props,
        content
    )
    
    # 2. 修复: <Stack direction="row" justifyContent="xxx" spacing={n} sx={{...}}>
    def merge_justify_props(match):
        direction = match.group(1)
        justify = match.group(2)
        spacing = match.group(3)
        sx_content = match.group(4)
        
        new_sx = sx_content
        if 'justifyContent' not in new_sx:
            new_sx = new_sx.rstrip(' }') + f', justifyContent: "{justify}" }}'
        
        return f'<Stack direction="{direction}" spacing={{{spacing}}} sx={{{new_sx}}}>'
    
    content = re.sub(
        r'<Stack direction="(row|column)" justifyContent="([^"]+)" spacing=\{([^}]+)\} sx=\{\{([^}]+)\}\}>',
        merge_justify_props,
        content
    )
    
    # 3. 修复: <Stack direction="row" alignItems="center" justifyContent="xxx">
    # 没有 sx 属性的情况
    content = re.sub(
        r'<Stack direction="(row|column)" alignItems="([^"]+)" justifyContent="([^"]+)">',
        r'<Stack direction="\1" sx={{ alignItems: "\2", justifyContent: "\3" }}>',
        content
    )
    
    # 4. 修复: <Stack direction="row" justifyContent="xxx">
    content = re.sub(
        r'<Stack direction="(row|column)" justifyContent="([^"]+)">',
        r'<Stack direction="\1" sx={{ justifyContent: "\2" }}>',
        content
    )
    
    # 5. 修复: <Stack direction="row" alignItems="center">
    content = re.sub(
        r'<Stack direction="(row|column)" alignItems="([^"]+)">',
        r'<Stack direction="\1" sx={{ alignItems: "\2" }}>',
        content
    )
    
    # 6. 修复: <Stack direction="row" sx={{ alignItems: "center" }} spacing={n} sx={{ mb: 3 }}>
    # 重复的 sx 属性 - 合并
    def merge_duplicate_sx(match):
        direction = match.group(1)
        sx1 = match.group(2)
        spacing = match.group(3)
        sx2 = match.group(4)
        
        # 合并两个 sx
        combined = sx1.rstrip(' }') + ', ' + sx2.lstrip('{ ').rstrip(' }') + ' }'
        return f'<Stack direction="{direction}" spacing={{{spacing}}} sx={{{combined}}}>'
    
    content = re.sub(
        r'<Stack direction="(row|column)" sx=\{\{([^}]+)\}\} spacing=\{([^}]+)\} sx=\{\{([^}]+)\}\}>',
        merge_duplicate_sx,
        content
    )
    
    # 7. 修复: <Stack direction="row" sx={{ alignItems: "center" }} spacing={n} justifyContent="xxx">
    def merge_sx_and_justify(match):
        direction = match.group(1)
        sx1 = match.group(2)
        spacing = match.group(3)
        justify = match.group(4)
        
        new_sx = sx1.rstrip(' }') + f', justifyContent: "{justify}" }}'
        return f'<Stack direction="{direction}" spacing={{{spacing}}} sx={{{new_sx}}}>'
    
    content = re.sub(
        r'<Stack direction="(row|column)" sx=\{\{([^}]+)\}\} spacing=\{([^}]+)\} justifyContent="([^"]+)">',
        merge_sx_and_justify,
        content
    )
    
    # 8. 修复: flexWrap 和 useFlexGap 属性移到 sx 中
    content = re.sub(
        r'<Stack([^>]*?)\s+flexWrap="([^"]+)"([^>]*)>',
        r'<Stack\1 sx={{ ...(\2), flexWrap: "\2" }}\3>',
        content
    )
    
    return content

def fix_typography_fontweight(content):
    """修复 Typography fontWeight 属性"""
    
    # 修复: <Typography fontWeight="bold"> -> <Typography sx={{ fontWeight: "bold" }}>
    # 但要处理已有 sx 属性的情况
    
    # 简单情况：没有 sx 属性
    content = re.sub(
        r'<Typography([^>]*?)\s+fontWeight="([^"]+)"([^>]*)>',
        lambda m: f'<Typography{m.group(1)} sx={{ fontWeight: "{m.group(2)}" }}{m.group(3)}>',
        content
    )
    
    return content

def fix_textfield_inputprops(content):
    """移除 TextField 的 InputProps 和 InputLabelProps 属性"""
    
    # 移除 InputProps
    content = re.sub(
        r'\s*InputProps=\{\{[^}]+\}\}',
        '',
        content
    )
    
    # 移除 InputLabelProps
    content = re.sub(
        r'\s*InputLabelProps=\{\{[^}]+\}\}',
        '',
        content
    )
    
    return content

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    content = fix_stack_props(content)
    content = fix_typography_fontweight(content)
    content = fix_textfield_inputprops(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python fix_mui_v9.py <file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    if process_file(filepath):
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes: {filepath}")
