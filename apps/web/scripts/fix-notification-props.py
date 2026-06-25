import os

src_dir = '/Users/air/TOPEMS/apps/web/src/pages'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            lines = content.split('\n')
            new_lines = []
            i = 0
            while i < len(lines):
                line = lines[i]
                if 'notifications=' in line or 'onClose=' in line:
                    next_line = lines[i+1].strip() if i+1 < len(lines) else ''
                    if next_line == '/>' or next_line == ' />':
                        i += 2
                        continue
                new_lines.append(line)
                i += 1
            
            new_content = '\n'.join(new_lines)
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Fixed: {filepath}")

print("Done!")
