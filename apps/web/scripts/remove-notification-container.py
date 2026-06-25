import os

src_dir = '/Users/air/TOPEMS/apps/web/src/pages'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            if 'NotificationContainer' in content:
                lines = content.split('\n')
                new_lines = []
                for line in lines:
                    if 'NotificationContainer' not in line:
                        new_lines.append(line)
                
                new_content = '\n'.join(new_lines)
                
                with open(filepath, 'w') as f:
                    f.write(new_content)
                
                print(f"Updated: {filepath}")

print("Done!")
