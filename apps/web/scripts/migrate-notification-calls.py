import os
import re

src_dir = '/Users/air/TOPEMS/apps/web/src/pages'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            if 'addNotification(' in content:
                continue
            
            if 'success(' not in content and 'error(' not in content:
                continue
            
            has_use_app_store = 'useAppStore' in content
            
            if not has_use_app_store:
                lines = content.split('\n')
                new_lines = []
                added_import = False
                
                for i, line in enumerate(lines):
                    if 'import { useAppStore }' in line:
                        added_import = True
                    
                    if not added_import and 'import' in line:
                        if '@/' in line or '../../' in line:
                            new_lines.append(line)
                            new_lines.append("import { useAppStore } from '@/store';")
                            added_import = True
                            continue
                    
                    if 'const ' in line and '= useState' in line and 'formData' in content:
                        new_lines.append(line)
                        if 'addNotification' not in '\n'.join(new_lines):
                            new_lines.append('  const addNotification = useAppStore((state) => state.addNotification);')
                    elif 'const {' in line and 'useState' in line and '}' in line and line.strip().endswith('};'):
                        new_lines.append(line)
                        if 'addNotification' not in '\n'.join(new_lines):
                            new_lines.append('  const addNotification = useAppStore((state) => state.addNotification);')
                    else:
                        new_lines.append(line)
                
                content = '\n'.join(new_lines)
            
            content = re.sub(r"success\('([^']+)'\)", r"addNotification({ title: '成功', message: '\1', type: 'success' })", content)
            content = re.sub(r"error\('([^']+)'\)", r"addNotification({ title: '错误', message: '\1', type: 'error' })", content)
            
            with open(filepath, 'w') as f:
                f.write(content)
            
            print(f"Migrated: {filepath}")

print("Done!")
