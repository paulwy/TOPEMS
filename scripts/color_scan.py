#!/usr/bin/env python3
import os
import re
import json

HEX_PATTERN = re.compile(r'#([0-9A-Fa-f]{3,8})\b')
RGB_PATTERN = re.compile(r'rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)')
RGBA_PATTERN = re.compile(r'rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\)')
HSL_PATTERN = re.compile(r'hsl\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)')
HSLA_PATTERN = re.compile(r'hsla\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[0-9.]+\s*\)')

NAMED_COLORS = {
    'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink',
    'brown', 'gray', 'grey', 'black', 'white', 'cyan', 'magenta',
    'teal', 'indigo', 'violet', 'gold', 'silver', 'maroon', 'olive',
    'lime', 'aqua', 'fuchsia', 'navy', 'blueviolet', 'darkblue', 'darkgreen',
    'darkred', 'darkgray', 'lightblue', 'lightgreen', 'lightgray',
}

COMMENT_PATTERNS = [
    r'//.*',
    r'/\*.*?\*/',
]

def remove_comments(content):
    for pattern in COMMENT_PATTERNS:
        content = re.sub(pattern, '', content, flags=re.DOTALL)
    return content

def scan_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return {}
    
    cleaned = remove_comments(content)
    
    colors = {}
    
    for match in HEX_PATTERN.findall(cleaned):
        hex_color = '#' + match.lower()
        if len(match) not in [3, 4, 6, 8]:
            continue
        if len(match) == 32 or len(match) == 40:
            continue
        colors[hex_color] = colors.get(hex_color, 0) + 1
    
    for match in RGB_PATTERN.findall(cleaned):
        colors[match.lower()] = colors.get(match.lower(), 0) + 1
    
    for match in RGBA_PATTERN.findall(cleaned):
        colors[match.lower()] = colors.get(match.lower(), 0) + 1
    
    for match in HSL_PATTERN.findall(cleaned):
        colors[match.lower()] = colors.get(match.lower(), 0) + 1
    
    for match in HSLA_PATTERN.findall(cleaned):
        colors[match.lower()] = colors.get(match.lower(), 0) + 1
    
    for word in re.findall(r'\b(\w+)\b', cleaned):
        if word.lower() in NAMED_COLORS:
            colors[word.lower()] = colors.get(word.lower(), 0) + 1
    
    return colors

def main():
    src_dir = '/Users/air/TOPEMS/apps/web/src'
    all_colors = {}
    file_stats = {}
    category_stats = {}
    
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in ['__tests__', 'node_modules', '.git']]
        
        for filename in files:
            if not (filename.endswith('.ts') or filename.endswith('.tsx')):
                continue
            
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, src_dir)
            
            parts = rel_path.split(os.sep)
            category = parts[0] if parts else 'other'
            
            colors = scan_file(filepath)
            if colors:
                file_stats[rel_path] = colors
                category_stats[category] = category_stats.get(category, 0) + sum(colors.values())
                
                for color, count in colors.items():
                    all_colors[color] = all_colors.get(color, 0) + count
    
    sorted_colors = sorted(all_colors.items(), key=lambda x: x[1], reverse=True)
    
    print("=" * 80)
    print("硬编码颜色扫描报告")
    print("=" * 80)
    print(f"\n总颜色出现次数: {sum(all_colors.values())}")
    print(f"总颜色种类: {len(all_colors)}")
    print(f"涉及文件数: {len(file_stats)}")
    
    print("\n" + "=" * 80)
    print("按模块分布")
    print("=" * 80)
    for cat, count in sorted(category_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"{cat:20s}: {count} 处")
    
    print("\n" + "=" * 80)
    print("出现次数最多的100种颜色")
    print("=" * 80)
    for color, count in sorted_colors[:100]:
        print(f"{color:30s}: {count} 次")
    
    print("\n" + "=" * 80)
    print("按颜色格式分类")
    print("=" * 80)
    hex_count = sum(1 for c in all_colors if c.startswith('#'))
    rgb_count = sum(1 for c in all_colors if c.startswith('rgb'))
    hsl_count = sum(1 for c in all_colors if c.startswith('hsl'))
    named_count = sum(1 for c in all_colors if c in NAMED_COLORS)
    
    print(f"十六进制(#xxx): {hex_count} 种, {sum(all_colors[c] for c in all_colors if c.startswith('#'))} 次")
    print(f"rgb/rgba: {rgb_count} 种, {sum(all_colors[c] for c in all_colors if c.startswith('rgb'))} 次")
    print(f"hsl/hsla: {hsl_count} 种, {sum(all_colors[c] for c in all_colors if c.startswith('hsl'))} 次")
    print(f"命名颜色: {named_count} 种, {sum(all_colors[c] for c in all_colors if c in NAMED_COLORS)} 次")
    
    with open('/Users/air/TOPEMS/scripts/color_report.json', 'w', encoding='utf-8') as f:
        json.dump({
            'total_count': sum(all_colors.values()),
            'total_colors': len(all_colors),
            'files_count': len(file_stats),
            'category_stats': category_stats,
            'top_colors': sorted_colors[:100],
            'file_stats': file_stats,
        }, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    main()
