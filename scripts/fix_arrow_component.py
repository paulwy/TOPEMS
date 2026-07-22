#!/usr/bin/env python3
import re

filepath = '/Users/air/TOPEMS/apps/web/src/pages/hrm/HrmEmployeePage/components/EmployeeFormDialog.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with }) => (
arrow_line_idx = None
for i, line in enumerate(lines):
    if line.strip() == '}) => (':
        arrow_line_idx = i
        break

print(f"Arrow function at line {arrow_line_idx + 1}")

# Find the closing ); at the end (before export default)
close_line_idx = None
for i in range(len(lines) - 1, -1, -1):
    if lines[i].strip() == ');':
        close_line_idx = i
        break

print(f"Closing at line {close_line_idx + 1}")

# Modify:
# 1. Change }) => ( to }) => {
lines[arrow_line_idx] = lines[arrow_line_idx].replace('}) => (', '}) => {')

# 2. Insert useTranslation and return after the arrow line
insert_lines = [
    '  const { t } = useTranslation();\n',
    '\n',
    '  return (\n',
]
for i, line in enumerate(insert_lines):
    lines.insert(arrow_line_idx + 1 + i, line)

# 3. The closing ); now needs to be ); followed by }
# Since we inserted 3 lines, the close line index shifted by 3
close_line_idx += 3
lines[close_line_idx] = lines[close_line_idx].rstrip() + '\n'  # keep );
lines.insert(close_line_idx + 1, ');\n')
lines.insert(close_line_idx + 2, '};\n')

# Wait, let me think again. The original was:
#   </Dialog>
# );
# 
# export default...

# After change, it should be:
#   </Dialog>
#   );
# };
#
# export default...

# Actually, the closing ); line is the line with just );
# Let's just replace it properly

# Let me rewrite this more carefully
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the arrow function start
start_match = re.search(r'\}\) => \(\n', content)
if not start_match:
    print("Could not find arrow function start")
    exit(1)

start_pos = start_match.end()

# Find the end: ); followed by newline and export default (or just end of component)
# The component ends with </Dialog>\n);\n\nexport default
end_match = re.search(r'\n  </Dialog>\n\);\n', content)
if not end_match:
    print("Could not find component end")
    exit(1)

end_pos = end_match.start() + len('\n  </Dialog>\n')

print(f"Content between: {start_pos} to {end_pos}")

# Build new content
new_content = (
    content[:start_match.start()] + '}) => {\n'
    + '  const { t } = useTranslation();\n'
    + '\n'
    + '  return ('
    + content[start_pos:end_pos]
    + '  );\n'
    + '};\n'
    + content[end_match.end():]
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done!")
