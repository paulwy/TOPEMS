#!/usr/bin/env python3
"""分析内联样式中 MUI 主题变量所在的组件类型"""

import os
import re

src_dir = 'apps/web/src'

# MUI 组件列表（常见的）
MUI_COMPONENTS = {
    'Box', 'Typography', 'Button', 'IconButton', 'TextField', 'Paper', 'Card', 'CardContent',
    'Grid', 'Stack', 'Divider', 'AppBar', 'Toolbar', 'Drawer', 'List', 'ListItem',
    'ListItemText', 'Avatar', 'Chip', 'Badge', 'Tooltip', 'Modal', 'Dialog', 'DialogTitle',
    'DialogContent', 'DialogActions', 'Snackbar', 'Alert', 'Tab', 'Tabs', 'Accordion',
    'AccordionSummary', 'AccordionDetails', 'Menu', 'MenuItem', 'Select', 'InputLabel',
    'FormControl', 'FormHelperText', 'Checkbox', 'Radio', 'Switch', 'Slider', 'Table',
    'TableHead', 'TableBody', 'TableRow', 'TableCell', 'Pagination', 'CircularProgress',
    'LinearProgress', 'Skeleton', 'Backdrop', 'Fade', 'Grow', 'Slide', 'Zoom',
    'Fab', 'SpeedDial', 'SpeedDialAction', 'BottomNavigation', 'BottomNavigationAction',
    'Breadcrumbs', 'Link', 'Stepper', 'Step', 'StepLabel', 'StepContent',
    'Tabs', 'Tab', 'TabPanel', 'TabContext',
    'ImageListItem', 'ImageList',
    'Masonry',
}

# lucide-react 图标组件（常见的）
LUCIDE_PATTERN = re.compile(r'^[A-Z][a-zA-Z]+$')

results = {
    'mui_component': 0,
    'lucide_icon': 0,
    'native_element': 0,
    'other': 0,
}

by_type = {
    'mui_component': [],
    'lucide_icon': [],
    'native_element': [],
    'other': [],
}


def find_mui_vars_in_style(content: str, filepath: str):
    """查找内联样式中的 MUI 主题变量，并记录所在的元素类型"""
    lines = content.split('\n')
    
    for i, line in enumerate(lines, 1):
        # 找 style={{ ... }} 形式
        # 往前找元素名
        style_match = re.search(r'style\s*=\s*\{', line)
        if not style_match:
            continue
        
        style_pos = style_match.start()
        
        # 往前找元素标签名
        before_style = line[:style_pos]
        elem_match = re.search(r'<(\w+)', before_style)
        if not elem_match:
            continue
        
        elem_name = elem_match.group(1)
        
        # 检查是否有 MUI 主题变量在这一行的 style 中
        style_part = line[style_pos:]
        
        has_mui_var = False
        var_name = ''
        
        # 简单检查
        mui_vars = [
            'primary.main', 'primary.light', 'primary.dark',
            'secondary.main', 'secondary.dark',
            'success.main', 'success.light', 'success.dark',
            'warning.main', 'warning.dark',
            'error.main', 'error.light', 'error.dark',
            'info.main',
            'text.primary', 'text.secondary', 'text.disabled',
            'background.default', 'background.paper',
            'divider',
            'action.active', 'action.hover', 'action.selected', 'action.disabled',
            'common.black', 'common.white',
        ]
        
        for var in mui_vars:
            if f"'{var}'" in style_part or f'"{var}"' in style_part:
                has_mui_var = True
                var_name = var
                break
        
        if not has_mui_var:
            # 检查 grey.xxx
            grey_match = re.search(r"['\"]grey\.(\d{2,3})['\"]", style_part)
            if grey_match:
                has_mui_var = True
                var_name = f'grey.{grey_match.group(1)}'
        
        if not has_mui_var:
            continue
        
        # 判断元素类型
        if elem_name in MUI_COMPONENTS:
            results['mui_component'] += 1
            by_type['mui_component'].append((filepath, i, elem_name, var_name))
        elif elem_name[0].isupper() and LUCIDE_PATTERN.match(elem_name):
            # 可能是 lucide 图标或其他组件
            results['lucide_icon'] += 1
            by_type['lucide_icon'].append((filepath, i, elem_name, var_name))
        elif elem_name[0].islower():
            results['native_element'] += 1
            by_type['native_element'].append((filepath, i, elem_name, var_name))
        else:
            results['other'] += 1
            by_type['other'].append((filepath, i, elem_name, var_name))


for root, dirs, files in os.walk(src_dir):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '__tests__', 'test', 'dist', 'build')]
    for f in files:
        if not f.endswith(('.tsx', '.ts', '.jsx', '.js')):
            continue
        filepath = os.path.join(root, f)
        
        try:
            with open(filepath, 'r') as fp:
                content = fp.read()
        except:
            continue
        
        find_mui_vars_in_style(content, filepath)


print('MUI 主题变量使用情况分析:')
print('=' * 60)
total = sum(results.values())
print(f'总计: {total} 处')
print()
print(f'MUI 组件:      {results["mui_component"]} 处 ({results["mui_component"]/total*100:.1f}%)')
print(f'Lucide 图标:   {results["lucide_icon"]} 处 ({results["lucide_icon"]/total*100:.1f}%)')
print(f'原生 HTML 元素: {results["native_element"]} 处 ({results["native_element"]/total*100:.1f}%)')
print(f'其他组件:       {results["other"]} 处 ({results["other"]/total*100:.1f}%)')
print()

print('MUI 组件示例 (前10个):')
for filepath, line, elem, var in by_type['mui_component'][:10]:
    print(f'  {filepath}:{line} <{elem}> style={{ ..., {var} }}')

print()
print('Lucide 图标示例 (前10个):')
for filepath, line, elem, var in by_type['lucide_icon'][:10]:
    print(f'  {filepath}:{line} <{elem}> style={{ ..., {var} }}')

print()
print('原生 HTML 示例 (前10个):')
for filepath, line, elem, var in by_type['native_element'][:10]:
    print(f'  {filepath}:{line} <{elem}> style={{ ..., {var} }}')
