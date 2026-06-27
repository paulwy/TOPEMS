import re
import os
from typing import Tuple


def find_matching_tag(content: str, start_pos: int) -> Tuple[int, int, str]:
    """
    从 start_pos 开始找到第一个开标签，并找到对应的闭合标签位置
    返回 (标签开始位置, 标签结束位置, 标签名)
    """
    # 找到第一个开标签
    tag_pattern = r'<(\w+)([^>]*?)\s*>'
    tag_match = re.search(tag_pattern, content[start_pos:])
    if not tag_match:
        return -1, -1, ''
    
    tag_name = tag_match.group(1)
    tag_start = start_pos + tag_match.start()
    tag_end = start_pos + tag_match.end()
    
    # 检查是否是自闭合标签
    if tag_match.group(0).endswith('/>'):
        return tag_start, tag_end, tag_name
    
    # 寻找匹配的闭合标签
    depth = 1
    pos = tag_end
    
    while pos < len(content) and depth > 0:
        # 找下一个开标签或闭标签
        next_open = content.find(f'<{tag_name}', pos)
        next_close = content.find(f'</{tag_name}', pos)
        
        if next_close == -1:
            break
        
        if next_open != -1 and next_open < next_close:
            # 检查是不是自闭合
            open_end = content.find('>', next_open)
            if open_end != -1:
                if content[open_end-1] == '/':
                    # 自闭合，深度不变
                    pos = open_end + 1
                    continue
            depth += 1
            pos = next_open + 1
        else:
            depth -= 1
            if depth == 0:
                # 找到匹配的闭合标签
                close_end = content.find('>', next_close)
                if close_end != -1:
                    return tag_start, close_end + 1, tag_name
            pos = next_close + 1
    
    return tag_start, tag_end, tag_name


def migrate_page(file_path: str) -> Tuple[bool, str]:
    """
    迁移单个页面到 PageContainer 布局
    返回 (是否成功, 消息)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 检查是否已经使用了 PageContainer
        if 'PageContainer' in content:
            return False, "已使用 PageContainer，跳过"
        
        # 检查是否使用了 ListPageTemplate
        if 'ListPageTemplate' not in content:
            return False, "未使用 ListPageTemplate，跳过"
        
        # 找到 ListPageTemplate 标签的位置
        lpt_pattern = r'<ListPageTemplate\b'
        lpt_match = re.search(lpt_pattern, content)
        if not lpt_match:
            return False, "未找到 ListPageTemplate 标签"
        
        lpt_pos = lpt_match.start()
        
        # 找到 ListPageTemplate 标签内部的 title 和 subtitle
        # 先找到 ListPageTemplate 标签的结束位置（可能是自闭合或有子元素）
        lpt_tag_start = lpt_pos
        
        # 判断是自闭合还是有子元素
        # 先找标签结束的 >
        lpt_tag_content_end = lpt_pos
        in_string = False
        string_char = ''
        brace_depth = 0
        
        i = lpt_pos + len('<ListPageTemplate')
        while i < len(content):
            c = content[i]
            
            if in_string:
                if c == string_char and content[i-1] != '\\':
                    in_string = False
                i += 1
                continue
            
            if c in ('"', "'", '`'):
                in_string = True
                string_char = c
            elif c == '{':
                brace_depth += 1
            elif c == '}':
                brace_depth -= 1
            elif c == '>' and brace_depth == 0:
                # 检查是不是自闭合
                if content[i-1] == '/':
                    # 自闭合标签
                    lpt_tag_content_end = i + 1
                    break
                else:
                    # 有子元素，需要找 </ListPageTemplate>
                    close_tag = '</ListPageTemplate>'
                    close_pos = content.find(close_tag, i)
                    if close_pos != -1:
                        lpt_tag_content_end = close_pos + len(close_tag)
                    break
            i += 1
        
        lpt_tag_content = content[lpt_tag_start:lpt_tag_content_end]
        
        # 提取 title 和 subtitle（支持字符串字面量和简单表达式）
        # 匹配 title='...' 或 title="..." 或 title={`...`}
        title_pattern = r"title\s*=\s*['\"`]([^'\"`]*)['\"`]"
        subtitle_pattern = r"subtitle\s*=\s*['\"`]([^'\"`]*)['\"`]"
        
        title_match = re.search(title_pattern, lpt_tag_content)
        subtitle_match = re.search(subtitle_pattern, lpt_tag_content)
        
        title_value = title_match.group(1) if title_match else ''
        subtitle_value = subtitle_match.group(1) if subtitle_match else ''
        
        if not title_value and not subtitle_value:
            return False, "未找到字符串字面量的 title 或 subtitle，跳过"
        
        # 1. 添加 PageContainer import
        common_import_pattern = r"import\s*\{([^}]*)\}\s*from\s*['\"]@/components/common['\"]"
        match = re.search(common_import_pattern, content)
        
        if match:
            imports = match.group(1)
            if 'PageContainer' not in imports:
                new_imports = imports.strip() + ', PageContainer'
                content = content[:match.start(1)] + new_imports + content[match.end(1):]
                # 更新 lpt_pos
                lpt_pos += len(', PageContainer')
                lpt_tag_start += len(', PageContainer')
        else:
            # 找到第一个 import 语句后添加
            import_pattern = r"(import\s+.*?from\s+['\"].*?['\"];?\n)"
            match = re.search(import_pattern, content)
            if match:
                page_container_import = "import { PageContainer } from '@/components/common';\n"
                insert_pos = match.end()
                content = content[:insert_pos] + page_container_import + content[insert_pos:]
                lpt_pos += len(page_container_import)
                lpt_tag_start += len(page_container_import)
        
        # 2. 找到 ListPageTemplate 外层的容器
        # 从 ListPageTemplate 向前找，找到 return 语句后的第一个容器标签
        # 先找到包含这个 ListPageTemplate 的 return 语句
        
        # 简单方法：从 ListPageTemplate 向前查找最近的 return ( 或 return <
        return_pos = -1
        
        # 向前找 return 语句
        search_pos = lpt_tag_start
        while search_pos > 0:
            # 找 return (
            return_match1 = content.rfind('return (', 0, search_pos)
            return_match2 = content.rfind('return  (', 0, search_pos)
            return_match3 = content.rfind('return\n(', 0, search_pos)
            
            candidates = [p for p in [return_match1, return_match2, return_match3] if p != -1]
            if candidates:
                return_pos = max(candidates)
                break
            
            search_pos -= 1
            if search_pos < lpt_tag_start - 5000:
                break
        
        if return_pos == -1:
            # 尝试找 return <
            return_match = content.rfind('return <', 0, lpt_tag_start)
            if return_match != -1:
                return_pos = return_match
        
        if return_pos == -1:
            return False, "未找到 return 语句"
        
        # 从 return 语句后找第一个标签
        after_return = content.find('(', return_pos) + 1
        if after_return == 0:
            after_return = content.find('<', return_pos)
        
        # 跳过空白字符
        while after_return < len(content) and content[after_return] in ' \t\n\r':
            after_return += 1
        
        # 找到第一个标签
        outer_tag_start, outer_tag_end, outer_tag_name = find_matching_tag(content, after_return)
        
        if outer_tag_start == -1:
            return False, "未找到最外层容器"
        
        # 提取外层标签的属性
        outer_tag_match = re.match(r'<(\w+)([^>]*?)\s*>', content[outer_tag_start:outer_tag_end])
        if not outer_tag_match:
            return False, "无法解析最外层标签"
        
        outer_attrs = outer_tag_match.group(2)
        
        # 构建 PageContainer 开始标签
        page_container_attrs_parts = []
        
        # 保留 sx 属性
        sx_pattern = r"sx\s*=\s*\{(\{[^}]*\}|[^{}]*)\}"
        sx_match = re.search(sx_pattern, outer_attrs)
        if sx_match:
            page_container_attrs_parts.append(sx_match.group(0))
        
        # 添加 title 和 subtitle
        if title_value:
            page_container_attrs_parts.append(f"title='{title_value}'")
        if subtitle_value:
            page_container_attrs_parts.append(f"subtitle='{subtitle_value}'")
        
        page_container_open = f"<PageContainer {' '.join(page_container_attrs_parts)}>"
        page_container_close = '</PageContainer>'
        
        # 替换开始标签
        content = content[:outer_tag_start] + page_container_open + content[outer_tag_end:]
        
        # 计算偏移量
        offset = len(page_container_open) - (outer_tag_end - outer_tag_start)
        
        # 更新 ListPageTemplate 位置
        lpt_tag_start += offset
        lpt_tag_end_pos = lpt_tag_start + len(lpt_tag_content)
        
        # 找到外层闭合标签并替换
        # 外层闭合标签的位置 = 外层开始标签 + 外层内容长度
        # 先找外层闭合标签
        outer_close_tag = f'</{outer_tag_name}>'
        
        # 从后往前找，找到文件末尾前的最后一个匹配的闭合标签
        # 更准确的方法是从开标签开始计算深度找到匹配的闭标签
        outer_tag_real_start = outer_tag_start
        outer_tag_real_end = outer_tag_end
        
        # 重新计算闭合标签位置（基于修改后的 content）
        depth = 1
        pos = outer_tag_end + offset
        
        while pos < len(content) and depth > 0:
            next_open = content.find(f'<{outer_tag_name}', pos)
            next_close = content.find(f'</{outer_tag_name}', pos)
            
            if next_close == -1:
                break
            
            if next_open != -1 and next_open < next_close:
                # 检查是不是自闭合
                open_end_match = re.match(r'<[^>]+/>', content[next_open:])
                if open_end_match:
                    pos = next_open + len(open_end_match.group(0))
                    continue
                depth += 1
                pos = next_open + 1
            else:
                depth -= 1
                if depth == 0:
                    close_end = content.find('>', next_close)
                    if close_end != -1:
                        # 替换闭合标签
                        content = content[:next_close] + page_container_close + content[close_end + 1:]
                        break
                pos = next_close + 1
        
        # 3. 将 ListPageTemplate 中的 title 和 subtitle 设为空字符串
        # 重新计算 ListPageTemplate 标签内容
        new_lpt_pattern = r'<ListPageTemplate\b'
        new_lpt_match = re.search(new_lpt_pattern, content)
        if new_lpt_match:
            new_lpt_start = new_lpt_match.start()
            
            # 找到 ListPageTemplate 标签结束
            i = new_lpt_start + len('<ListPageTemplate')
            new_lpt_end = -1
            in_string = False
            string_char = ''
            brace_depth = 0
            
            while i < len(content):
                c = content[i]
                if in_string:
                    if c == string_char and content[i-1] != '\\':
                        in_string = False
                    i += 1
                    continue
                if c in ('"', "'", '`'):
                    in_string = True
                    string_char = c
                elif c == '{':
                    brace_depth += 1
                elif c == '}':
                    brace_depth -= 1
                elif c == '>' and brace_depth == 0:
                    if content[i-1] == '/':
                        new_lpt_end = i + 1
                    else:
                        close_tag = '</ListPageTemplate>'
                        close_pos = content.find(close_tag, i)
                        if close_pos != -1:
                            new_lpt_end = close_pos + len(close_tag)
                    break
                i += 1
            
            if new_lpt_end != -1:
                lpt_content = content[new_lpt_start:new_lpt_end]
                
                # 替换 title
                new_lpt_content = re.sub(
                    r"title\s*=\s*['\"`][^'\"`]*['\"`]",
                    "title=''",
                    lpt_content
                )
                
                # 替换 subtitle
                new_lpt_content = re.sub(
                    r"subtitle\s*=\s*['\"`][^'\"`]*['\"`]",
                    "subtitle=''",
                    new_lpt_content
                )
                
                content = content[:new_lpt_start] + new_lpt_content + content[new_lpt_end:]
        
        # 检查是否有变化
        if content == original_content:
            return False, "内容未发生变化"
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True, f"迁移成功 (title: {title_value[:30]}...)"
    
    except Exception as e:
        import traceback
        return False, f"错误: {str(e)}\n{traceback.format_exc()}"


def main():
    base_path = '/Users/air/TOPEMS/apps/web/src/pages'
    
    files_to_migrate = [
        'admin/AccountManagementPage.tsx',
        'admin/BankAccountManagementPage.tsx',
        'admin/DictionaryManagementPage.tsx',
        'admin/MigrationAdminPage.tsx',
        'admin/PermissionManagementPage.tsx',
        'admin/PluginManagementPage.tsx',
        'admin/RoleManagementPage.tsx',
        'admin/UserManagementPage.tsx',
        'asset/AssetManagementPage.tsx',
        'asset/EquipmentInspectionPage.tsx',
        'asset/EquipmentMaintenancePage.tsx',
        'asset/EquipmentManagementPage.tsx',
        'asset/OfficeSuppliesManagementPage.tsx',
        'asset/VehicleManagementPage.tsx',
        'bi/BIDataSourcePage.tsx',
        'bi/BIReportPage.tsx',
        'crm/CRMBillingPage.tsx',
        'crm/CRMCustomerScoringPage.tsx',
        'crm/CRMCustomerSegmentationPage.tsx',
        'crm/CRMRecommendationPage.tsx',
        'crm/ContactManagementPage.tsx',
        'crm/CustomerManagementPage.tsx',
        'crm/InteractionManagementPage.tsx',
        'crm/OpportunityManagementPage.tsx',
        'ehs/EhsAccidentPage.tsx',
        'ehs/EhsDrillPage.tsx',
        'ehs/EhsHazardPage.tsx',
        'ehs/EhsIncidentReportPage.tsx',
        'ehs/EhsPlanPage.tsx',
        'notification/NotificationArchivePage.tsx',
        'notification/NotificationTemplatesPage.tsx',
        'oa/AnnouncementManagementPage.tsx',
        'oa/MeetingRoomManagementPage.tsx',
    ]
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    print("=" * 70)
    print("页面迁移工具 v2 - 迁移到 PageContainer 统一布局")
    print("=" * 70)
    print()
    
    for file_rel in files_to_migrate:
        file_path = os.path.join(base_path, file_rel)
        
        if not os.path.exists(file_path):
            print(f"❌ {file_rel} - 文件不存在")
            error_count += 1
            continue
        
        success, message = migrate_page(file_path)
        
        if success:
            print(f"✅ {file_rel} - {message}")
            success_count += 1
        elif "跳过" in message:
            print(f"⏭️  {file_rel} - {message}")
            skip_count += 1
        else:
            print(f"❌ {file_rel} - {message}")
            error_count += 1
    
    print()
    print("=" * 70)
    print(f"迁移完成: 成功 {success_count}, 跳过 {skip_count}, 错误 {error_count}")
    print("=" * 70)


if __name__ == '__main__':
    main()
