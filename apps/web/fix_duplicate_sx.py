import re
import os

def fix_duplicate_sx(content):
    lines = content.split('\n')
    modified = False
    
    for i, line in enumerate(lines):
        sx_count = line.count('sx={{')
        if sx_count >= 2:
            # 找到所有 sx={{ 的位置
            positions = []
            pos = line.find('sx={{')
            while pos != -1:
                positions.append(pos)
                pos = line.find('sx={{', pos + 4)
            
            if len(positions) >= 2:
                # 找到第一个和最后一个 sx 的位置
                first_pos = positions[0]
                last_pos = positions[-1]
                
                # 找到最后一个 }} 的位置
                last_end = line.rfind('}}', last_pos) + 2
                
                # 提取第一个 sx 之前的内容和最后一个 }} 之后的内容
                before = line[:first_pos]
                after = line[last_end:]
                
                # 提取所有 sx 的内容
                sx_contents = []
                current_pos = 0
                for pos in positions:
                    # 找到这个 sx={{ 后面的 }}
                    end_pos = line.find('}}', pos)
                    if end_pos != -1:
                        sx_content = line[pos+4:end_pos].strip()
                        sx_contents.append(sx_content)
                
                # 合并 sx 内容
                merged = ', '.join(sx_contents)
                new_line = before + f'sx={{{{{merged}}}}}' + after
                lines[i] = new_line
                modified = True
    
    return '\n'.join(lines), modified

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content, modified = fix_duplicate_sx(content)
    
    if modified:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f'修复: {filepath}')
    else:
        print(f'无需修复: {filepath}')

# 获取所有需要修复的文件
files = [
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/Limspage.tsx',
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/Rspage.tsx',
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/KnowledgeBasePage.tsx',
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/HrmCompanyPage.tsx',
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/HrmOrganizationPage.tsx',
    '/Users/xingzhai/TOPEMS/apps/web/src/pages/ReportBuilder.tsx',
]

for filepath in files:
    process_file(filepath)

print('\n处理完成')