import os

src_dir = '/Users/air/TOPEMS/apps/web/src/pages'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            if 'success(' not in content and 'error(' not in content and 'addNotification(' not in content:
                continue
            
            has_use_app_store = 'useAppStore' in content
            
            if not has_use_app_store and ('success(' in content or 'error(' in content):
                lines = content.split('\n')
                new_lines = []
                added_import = False
                added_add_notification = False
                
                for i, line in enumerate(lines):
                    if 'import {' in line and '@/store' in line:
                        added_import = True
                    elif not added_import and 'import' in line and '@/' in line:
                        if 'import { useAppStore } from' not in line:
                            new_lines.append("import { useAppStore } from '@/store';")
                            added_import = True
                    
                    if 'const ' in line and '= useState' in line and 'formData' in line and not added_add_notification:
                        new_lines.append(line)
                        new_lines.append('  const addNotification = useAppStore((state) => state.addNotification);')
                        added_add_notification = True
                    elif 'const {' in line and 'useState' in line and not added_add_notification:
                        if lines[i].strip().endswith('};'):
                            new_lines.append(line)
                            new_lines.append('  const addNotification = useAppStore((state) => state.addNotification);')
                            added_add_notification = True
                        else:
                            new_lines.append(line)
                    else:
                        new_lines.append(line)
                
                content = '\n'.join(new_lines)
            
            content = content.replace("success('", "addNotification({ title: '成功', message: '")
            content = content.replace("error('", "addNotification({ title: '错误', message: '")
            
            content = content.replace("')", "', type: 'success' });")
            content = content.replace(", type: 'success' });)", ", type: 'success' });")
            content = content.replace("', type: 'success' });', type: 'error' });", "', type: 'error' });")
            
            with open(filepath, 'w') as f:
                f.write(content)
            
            print(f"Fixed notifications: {filepath}")

print("Done!")
