import os
import re

src_dir = '/Users/air/TOPEMS/apps/web/src/pages'

toast_files = []
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
                if "import { toast } from 'react-toastify'" in content:
                    toast_files.append(filepath)

print(f"Found {len(toast_files)} files using react-toastify")

for filepath in toast_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = content.replace(
        "import { toast } from 'react-toastify'",
        "import { useAppStore } from '@/store'"
    )
    
    if 'const [formData, setFormData]' in content:
        content = content.replace(
            'const [formData, setFormData] = useState({',
            'const [formData, setFormData] = useState({\n'
        )
        
        pattern = r'(const \[formData, setFormData\] = useState\(\{[^}]+\}\);)'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            insert_pos = match.end()
            content = content[:insert_pos] + '\n  const addNotification = useAppStore((state) => state.addNotification);' + content[insert_pos:]
    
    content = re.sub(
        r"toast\.success\('([^']+)'\)",
        r"addNotification({ title: '成功', message: '\1', type: 'success' })",
        content
    )
    content = re.sub(
        r"toast\.error\('([^']+)'\)",
        r"addNotification({ title: '错误', message: '\1', type: 'error' })",
        content
    )
    content = re.sub(
        r"toast\.warning\('([^']+)'\)",
        r"addNotification({ title: '警告', message: '\1', type: 'warning' })",
        content
    )
    content = re.sub(
        r"toast\.info\('([^']+)'\)",
        r"addNotification({ title: '提示', message: '\1', type: 'info' })",
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Updated: {filepath}")

print("Done!")
