#!/usr/bin/env python3
import re

filepath = '/Users/air/TOPEMS/apps/web/src/pages/bi/DataAnalysisPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix useMemo endings: lines that are "  ];" and follow a useMemo block
# We need to find patterns where useMemo(() => [ is opened but closed with ]; instead of ], [t]);

# Let's just do simple string replacements for the known ones
replacements = [
    # mockSalesData
    ("  const mockSalesData = useMemo(() => [", "  const mockSalesData = useMemo(() => [", False),
]

# Better approach: find lines with "  ];" that are inside useMemo blocks
# Actually, let's just look for the pattern of useMemo arrays that end with ];

lines = content.split('\n')
new_lines = []
in_use_memo = False
use_memo_depth = 0

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Check if this line starts a useMemo with array
    if 'useMemo(() => [' in line:
        in_use_memo = True
        use_memo_depth = 1
        new_lines.append(line)
        continue
    
    if in_use_memo:
        # Track array depth (simplified)
        if stripped == '];':
            # This is the end of useMemo array
            new_lines.append('  ], [t]);')
            in_use_memo = False
            use_memo_depth = 0
            continue
    
    new_lines.append(line)

final_content = '\n'.join(new_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Done!")
