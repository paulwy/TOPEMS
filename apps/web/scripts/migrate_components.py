#!/usr/bin/env python3
import os
import re

# 目标目录
TARGET_DIR = "/Users/air/TOPEMS/apps/web/src"

# 组件映射规则
COMPONENT_MAPPING = {
    # Button variants
    'Button variant="outline"': 'Button variant="outlined"',
    'Button variant=\'outline\'': "Button variant='outlined'",
    'Button variant="ghost"': 'Button variant="text"',
    'Button variant=\'ghost\'': "Button variant='text'",
    'Button variant="secondary"': 'Button variant="outlined"',
    'Button variant=\'secondary\'': "Button variant='outlined'",
    'Button variant="default"': 'Button variant="contained"',
    'Button variant=\'default\'': "Button variant='contained'",
    # Button size
    'size="sm"': 'size="small"',
    'size=\'sm\'': "size='small'",
}

def find_files_with_components():
    """查找所有使用 shadcn/ui Button、Badge、Card 的文件"""
    files = []
    for root, dirs, filenames in os.walk(TARGET_DIR):
        for filename in filenames:
            if filename.endswith('.tsx'):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if (
                        'from "@/components/ui/button"' in content or
                        'from "@/components/ui/badge"' in content or
                        'from "@/components/ui/card"' in content
                    ):
                        files.append(filepath)
    return files

def migrate_imports(content):
    """迁移导入语句"""
    # 移除 shadcn/ui 的导入
    content = re.sub(r'import \{[^}]*Button[^}]*\} from "@/components/ui/button";?\n', '', content)
    content = re.sub(r'import \{[^}]*Badge[^}]*\} from "@/components/ui/badge";?\n', '', content)
    content = re.sub(r'import \{[^}]*Card[^}]*\} from "@/components/ui/card";?\n', '', content)
    
    # 检查是否已经有 @mui/material 的导入
    if 'from "@mui/material"' in content:
        # 如果已有，添加缺失的组件
        content = re.sub(
            r'import \{([^}]*)\} from "@mui/material";',
            lambda match: add_missing_components(match.group(1)),
            content
        )
    else:
        # 如果没有，在文件开头添加新的导入
        # 在第一个 import 语句之后添加
        mui_import = 'import { Button, Chip, Card, CardContent, CardHeader, Typography } from "@mui/material";\n'
        content = mui_import + content
    
    return content

def add_missing_components(existing_components):
    """添加缺失的 MUI 组件"""
    needed = {'Button', 'Chip', 'Card', 'CardContent', 'CardHeader', 'Typography'}
    existing = set(c.strip() for c in existing_components.split(','))
    missing = needed - existing
    
    if missing:
        new_components = existing_components + ', ' + ', '.join(sorted(missing))
    else:
        new_components = existing_components
    
    return f'import {{ {new_components} }} from "@mui/material";'

def migrate_button(content):
    """迁移 Button 组件"""
    for old, new in COMPONENT_MAPPING.items():
        content = content.replace(old, new)
    return content

def migrate_badge(content):
    """迁移 Badge 组件为 Chip"""
    # Badge 的 children 是文本，Chip 使用 label 属性
    # 需要处理多种情况
    
    # 处理 <Badge>text</Badge> -> <Chip size="small" label="text" />
    content = re.sub(r'<Badge([^>]*)>([^<]*)</Badge>', r'<Chip size="small"\1 label="\2" />', content)
    
    # 处理 <Badge variant="xxx">text</Badge>
    content = re.sub(r'<Badge variant="default"([^>]*)>([^<]*)</Badge>', r'<Chip size="small"\1 label="\2" />', content)
    content = re.sub(r'<Badge variant=\'default\'([^>]*)>([^<]*)</Badge>', r"<Chip size='small'\1 label='\2' />", content)
    
    content = re.sub(r'<Badge variant="secondary"([^>]*)>([^<]*)</Badge>', r'<Chip size="small" variant="outlined"\1 label="\2" />', content)
    content = re.sub(r'<Badge variant=\'secondary\'([^>]*)>([^<]*)</Badge>', r"<Chip size='small' variant='outlined'\1 label='\2' />", content)
    
    content = re.sub(r'<Badge variant="destructive"([^>]*)>([^<]*)</Badge>', r'<Chip size="small" color="error"\1 label="\2" />', content)
    content = re.sub(r'<Badge variant=\'destructive\'([^>]*)>([^<]*)</Badge>', r"<Chip size='small' color='error'\1 label='\2' />", content)
    
    content = re.sub(r'<Badge variant="outline"([^>]*)>([^<]*)</Badge>', r'<Chip size="small" variant="outlined"\1 label="\2" />', content)
    content = re.sub(r'<Badge variant=\'outline\'([^>]*)>([^<]*)</Badge>', r"<Chip size='small' variant='outlined'\1 label='\2' />", content)
    
    # 移除 Badge 的 variant 属性（如果还有剩余的）
    content = re.sub(r' variant="[^"]*"', '', content)
    content = re.sub(r" variant='[^']*'", '', content)
    
    return content

def migrate_card(content):
    """迁移 Card 组件"""
    # CardTitle 和 CardDescription 需要替换为 Typography
    content = content.replace('<CardTitle', '<Typography variant="h6" sx={{ fontWeight: 600 }}')
    content = content.replace('</CardTitle>', '</Typography>')
    content = content.replace('<CardDescription', '<Typography variant="body2" sx={{ color: "grey.500" }}')
    content = content.replace('</CardDescription>', '</Typography>')
    
    return content

def remove_duplicate_imports(content):
    """移除重复的导入语句"""
    lines = content.split('\n')
    seen = set()
    result = []
    
    for line in lines:
        if 'from "@mui/material"' in line:
            if line not in seen:
                seen.add(line)
                result.append(line)
        else:
            result.append(line)
    
    return '\n'.join(result)

def process_file(filepath):
    """处理单个文件"""
    print(f"Processing: {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 迁移导入
    content = migrate_imports(content)
    
    # 移除重复导入
    content = remove_duplicate_imports(content)
    
    # 迁移 Button
    content = migrate_button(content)
    
    # 迁移 Badge
    content = migrate_badge(content)
    
    # 迁移 Card
    content = migrate_card(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⏭️ No changes needed")

def main():
    """主函数"""
    print("Finding files with shadcn/ui components...")
    files = find_files_with_components()
    print(f"Found {len(files)} files to process")
    
    for filepath in files:
        process_file(filepath)
    
    print("\nMigration complete!")

if __name__ == "__main__":
    main()