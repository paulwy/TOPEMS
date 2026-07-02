#!/usr/bin/env python3
"""
批量标准化 MES 和 LIMS 页面脚本
自动为 PageContainer 添加 headerProps 配置
"""

import json
import re
import os
from pathlib import Path

# 读取配置文件
config_file = Path("/Users/air/TOPEMS/apps/web/scripts/standardize-pages-config.json")
config = json.load(open(config_file))

def get_icon_import(icon_name: str) -> str:
    """获取图标导入语句"""
    return f"import {icon_name} from 'lucide-react';"

def add_header_props_to_page(file_path: str, page_config: dict, module: str) -> bool:
    """为页面添加 headerProps"""
    try:
        content = open(file_path).read()

        # 检查是否已经有 headerProps
        if 'headerProps' in content and 'pageIcon' in content:
            print(f"✓ {file_path} 已经标准化")
            return False

        # 找到 PageContainer 的位置
        pattern = r'<PageContainer\s+([^>]*?)>'
        match = re.search(pattern, content, re.MULTILINE)

        if not match:
            print(f"⚠ {file_path} 未找到 PageContainer")
            return False

        # 获取图标名称
        icon_name = page_config['icon']
        gradient = page_config['gradient']

        # 检查是否需要添加图标导入
        icon_import_pattern = f"import.*{icon_name}.*from 'lucide-react'"
        if not re.search(icon_import_pattern, content):
            # 找到 lucide-react 导入行
            lucide_import_pattern = r"import\s+\{([^}]+)\}\s+from\s+'lucide-react'"
            lucide_match = re.search(lucide_import_pattern, content)

            if lucide_match:
                # 添加图标到现有导入
                imports = lucide_match.group(1)
                new_imports = imports + f",\n  {icon_name}"
                content = content.replace(lucide_match.group(0), f"import {{\n  {new_imports}\n}} from 'lucide-react'")
            else:
                # 添加新的导入行
                import_section_pattern = r"(import.*from '@mui/material';\n)"
                import_match = re.search(import_section_pattern, content)
                if import_match:
                    new_import = f"{import_match.group(0)}import {icon_name} from 'lucide-react';\n"
                    content = content.replace(import_match.group(0), new_import)

        # 构建 headerProps
        header_props = f"""headerProps={{
        pageIcon: <{icon_name} style={{ width: 20, height: 20 }} />,
        pageGradient: '{gradient}',
      }}"""

        # 替换 PageContainer
        old_page_container = match.group(0)
        attrs = match.group(1)

        # 检查是否已经有 title 和 subtitle
        if 'title=' in attrs and 'subtitle=' in attrs:
            # 直接添加 headerProps
            new_attrs = attrs.rstrip() + f"\n      {header_props}"
        else:
            # 添加 title, subtitle 和 headerProps
            title = page_config['title']
            subtitle = page_config['subtitle']
            new_attrs = f"""title='{title}'
      subtitle='{subtitle}'
      {header_props}"""

        new_page_container = f"<PageContainer\n      {new_attrs}\n    >"
        content = content.replace(old_page_container, new_page_container)

        # 写回文件
        open(file_path, 'w').write(content)
        print(f"✓ {file_path} 已标准化")
        return True

    except Exception as e:
        print(f"✗ {file_path} 处理失败: {e}")
        return False

def process_module_pages(module_name: str, pages_dir: Path):
    """处理模块的所有页面"""
    module_config = config.get(module_name, {})
    pages_config = module_config.get('pages', {})

    print(f"\n处理 {module_name} 模块页面...")
    print("="*60)

    success_count = 0
    failed_count = 0
    skipped_count = 0

    for page_file, page_config in pages_config.items():
        page_path = pages_dir / page_file

        if not page_path.exists():
            print(f"⚠ {page_file} 文件不存在")
            failed_count += 1
            continue

        result = add_header_props_to_page(str(page_path), page_config, module_name)

        if result:
            success_count += 1
        elif 'headerProps' in open(page_path).read():
            skipped_count += 1
        else:
            failed_count += 1

    print("="*60)
    print(f"{module_name} 模块处理完成:")
    print(f"  成功: {success_count}")
    print(f"  跳过: {skipped_count}")
    print(f"  失败: {failed_count}")

    return success_count, skipped_count, failed_count

def main():
    """主函数"""
    base_dir = Path("/Users/air/TOPEMS/apps/web/src/pages")

    # 处理 MES 模块
    mes_dir = base_dir / "mes"
    mes_success, mes_skipped, mes_failed = process_module_pages("mes", mes_dir)

    # 处理 LIMS 模块
    lims_dir = base_dir / "lims"
    lims_success, lims_skipped, lims_failed = process_module_pages("lims", lims_dir)

    # 总计
    total_success = mes_success + lims_success
    total_skipped = mes_skipped + lims_skipped
    total_failed = mes_failed + lims_failed

    print("\n" + "="*60)
    print("总计:")
    print(f"  成功改造: {total_success} 个页面")
    print(f"  已标准化: {total_skipped} 个页面")
    print(f"  处理失败: {total_failed} 个页面")
    print("="*60)

if __name__ == "__main__":
    main()