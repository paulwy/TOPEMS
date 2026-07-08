#!/usr/bin/env python3
import os
import re
import json

COLOR_MAP = {
    '#3b82f6': 'primary.main',
    '#2563eb': 'primary.dark',
    '#1d4ed8': 'primary.700',
    '#60a5fa': 'primary.light',
    '#bfdbfe': 'primary.200',
    '#dbeafe': 'primary.100',
    '#eff6ff': 'primary.50',
    '#e0e7ff': 'secondary.100',
    '#1976d2': 'primary.main',
    
    '#8b5cf6': 'secondary.main',
    '#7c3aed': 'secondary.dark',
    '#6d28d9': 'secondary.700',
    '#a78bfa': 'secondary.light',
    '#ddd6fe': 'secondary.200',
    '#ede9fe': 'secondary.100',
    '#f5f3ff': 'secondary.50',
    
    '#22c55e': 'success.main',
    '#16a34a': 'success.dark',
    '#15803d': 'success.700',
    '#4ade80': 'success.light',
    '#86efac': 'success.light',
    '#bbf7d0': 'success.200',
    '#dcfce7': 'success.100',
    '#f0fdf4': 'success.50',
    
    '#f59e0b': 'warning.main',
    '#d97706': 'warning.dark',
    '#b45309': 'warning.700',
    '#fbbf24': 'warning.light',
    '#fde68a': 'warning.light',
    '#fef3c7': 'warning.100',
    '#fffbeb': 'warning.50',
    
    '#ef4444': 'error.main',
    '#dc2626': 'error.dark',
    '#b91c1c': 'error.700',
    '#f87171': 'error.light',
    '#fecaca': 'error.200',
    '#fee2e2': 'error.100',
    '#fef2f2': 'error.50',
    
    '#0ea5e9': 'info.main',
    '#0284c7': 'info.dark',
    '#7dd3fc': 'info.light',
    
    '#f8fafc': 'background.default',
    '#f9fafb': 'grey.50',
    '#f1f5f9': 'grey.100',
    '#e5e7eb': 'grey.200',
    '#d1d5db': 'grey.300',
    '#9ca3af': 'grey.400',
    '#6b7280': 'grey.500',
    '#4b5563': 'grey.600',
    '#374151': 'grey.700',
    '#1f2937': 'grey.800',
    '#111827': 'grey.900',
    '#030712': 'grey.950',
    
    '#1e293b': 'text.primary',
    '#64748b': 'text.secondary',
    '#94a3b8': 'text.disabled',
    '#cbd5e1': 'text.disabled',
    '#e2e8f0': 'border.main',
    
    '#ffffff': 'common.white',
    '#fff': 'common.white',
}

GRADIENT_PATTERN = re.compile(r'linear-gradient\s*\([^)]+\)')

def replace_in_file(filepath: str):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False, 0
    
    original_content = content
    replacements = 0
    
    gradients = GRADIENT_PATTERN.findall(content)
    gradient_placeholders = []
    
    for i, gradient in enumerate(gradients):
        placeholder = f'__GRADIENT_PLACEHOLDER_{i}__'
        gradient_placeholders.append((placeholder, gradient))
        content = content.replace(gradient, placeholder, 1)
    
    hex_pattern = re.compile(r'#([0-9A-Fa-f]{3,8})\b')
    
    to_replace = []
    
    for match in hex_pattern.finditer(content):
        hex_color = '#' + match.group(1).lower()
        if len(match.group(1)) not in [3, 4, 6, 8]:
            continue
        if len(match.group(1)) == 32 or len(match.group(1)) == 40:
            continue
        
        if hex_color not in COLOR_MAP:
            continue
        
        replacement = COLOR_MAP[hex_color]
        if replacement == hex_color:
            continue
        
        to_replace.append((match.start(), match.end(), replacement))
    
    to_replace.sort(reverse=True, key=lambda x: x[0])
    
    for start, end, replacement in to_replace:
        content = content[:start] + replacement + content[end:]
        replacements += 1
    
    rgb_pattern = re.compile(r'rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\)')
    
    to_replace = []
    
    for match in rgb_pattern.finditer(content):
        rgb_color = match.group(0).lower()
        if rgb_color not in COLOR_MAP:
            continue
        
        replacement = COLOR_MAP[rgb_color]
        if replacement == rgb_color:
            continue
        
        to_replace.append((match.start(), match.end(), replacement))
    
    to_replace.sort(reverse=True, key=lambda x: x[0])
    
    for start, end, replacement in to_replace:
        content = content[:start] + replacement + content[end:]
        replacements += 1
    
    for placeholder, gradient in gradient_placeholders:
        content = content.replace(placeholder, gradient)
    
    if content != original_content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, replacements
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
            return False, 0
    return False, replacements

def main():
    src_dir = '/Users/air/TOPEMS/apps/web/src'
    report_file = '/Users/air/TOPEMS/scripts/color_report.json'
    
    with open(report_file, 'r', encoding='utf-8') as f:
        report = json.load(f)
    
    modules = {}
    for rel_path, _ in report['file_stats'].items():
        parts = rel_path.split(os.sep)
        module = parts[0]
        if module not in modules:
            modules[module] = []
        modules[module].append(rel_path)
    
    print("=" * 80)
    print("按模块分批替换硬编码颜色")
    print("=" * 80)
    print(f"\n共发现 {report['files_count']} 个文件涉及硬编码颜色")
    print(f"分布在 {len(modules)} 个模块中\n")
    
    total_replacements = 0
    
    for module, files in sorted(modules.items()):
        print(f"\n处理模块: {module} ({len(files)} 个文件)")
        print("-" * 60)
        
        module_replaced = 0
        for rel_path in files:
            filepath = os.path.join(src_dir, rel_path)
            changed, count = replace_in_file(filepath)
            if changed:
                print(f"  ✓ {rel_path}: 替换 {count} 处")
                module_replaced += count
            else:
                print(f"  - {rel_path}: 无替换")
        
        print(f"  总计: {module_replaced} 处替换")
        total_replacements += module_replaced
    
    print("\n" + "=" * 80)
    print(f"替换完成！共替换 {total_replacements} 处")
    print("=" * 80)
    print("\n建议：运行 npm run typecheck 验证替换后的代码")

if __name__ == '__main__':
    main()
