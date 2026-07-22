#!/usr/bin/env python3
"""
Fix DataAnalysisPage.tsx - move module-level consts into component
and fix computed property names.
"""

import re

filepath = '/Users/air/TOPEMS/apps/web/src/pages/bi/DataAnalysisPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Find module-level consts (between ct = ... and component function)
const_start_idx = None
const_end_idx = None
component_start_idx = None

for i, line in enumerate(lines):
    if line.strip() == 'const ct = designTokens.colors;':
        const_start_idx = i + 1
    if const_start_idx and 'const DataAnalysisPage = () => {' in line:
        const_end_idx = i - 1
        component_start_idx = i
        break

print(f"Module consts: lines {const_start_idx+1}-{const_end_idx+1}")
print(f"Component starts at line {component_start_idx+1}")

# Extract the module consts
module_const_lines = lines[const_start_idx:const_end_idx+1]

# Fix computed property names: t('...'): value -> [t('...')]: value
fixed_const_lines = []
for line in module_const_lines:
    # Match pattern: whitespace + t('...'): number
    fixed = re.sub(
        r"^(\s+)t\('([^']+)'\):\s*(\d+),?$",
        lambda m: f"{m.group(1)}[t('{m.group(2)}')]: {m.group(3)}{',' if m.group(0).endswith(',') else ''}",
        line
    )
    fixed_const_lines.append(fixed)

# Now build the new file
# 1. Lines before const_start (including ct)
new_lines = lines[:const_start_idx]

# 2. Component function line
new_lines.append(lines[component_start_idx])

# 3. Add useTranslation and useMemo wrapped consts
new_lines.append('  const { t } = useTranslation();')
new_lines.append('')

# Wrap each const in useMemo
# Let's parse each const block
current_const = []
current_name = None
const_blocks = []

for line in fixed_const_lines:
    stripped = line.strip()
    if stripped.startswith('const '):
        if current_name:
            const_blocks.append((current_name, current_const))
        # Extract const name
        match = re.match(r'const\s+(\w+)', stripped)
        if match:
            current_name = match.group(1)
            current_const = [line]
        else:
            current_const = []
    elif current_name:
        current_const.append(line)

if current_name and current_const:
    const_blocks.append((current_name, current_const))

# Generate useMemo wrapped versions
import json

for const_name, const_lines_block in const_blocks:
    # Remove 'const X = ' from first line
    first_line = const_lines_block[0]
    match = re.match(r'const\s+\w+\s*[:=]\s*(.*)', first_line)
    if match:
        rest = match.group(1)
        indent = '  '
        
        # Check if it has a type annotation
        type_match = re.match(r'const\s+\w+\s*:\s*([^=]+)=\s*(.*)', first_line)
        if type_match:
            type_anno = type_match.group(1).strip()
            value_start = type_match.group(2)
            new_lines.append(f"  const {const_name}: {type_anno} = useMemo(() => {value_start}")
        else:
            new_lines.append(f"  const {const_name} = useMemo(() => {rest}")
        
        # Add the rest of the lines (excluding last line which has the closing ;)
        for mid_line in const_lines_block[1:-1]:
            new_lines.append('  ' + mid_line)
        
        # Last line - replace ]; with ], [t]); or similar
        last_line = const_lines_block[-1]
        last_stripped = last_line.strip()
        if last_stripped.endswith('];'):
            new_lines.append('  ], [t]);')
        elif last_stripped.endswith(';'):
            new_lines.append('  ' + last_stripped[:-1] + ', [t]);')
        else:
            new_lines.append('  ' + last_line)
        
        new_lines.append('')

# 4. Rest of the component (skip the component function opening line and module consts)
new_lines.extend(lines[component_start_idx+1:])

final_content = '\n'.join(new_lines)

# Also add useMemo to import
if 'useMemo' not in final_content.split('\n')[0]:
    final_content = final_content.replace(
        "import { useState } from 'react';",
        "import { useState, useMemo } from 'react';"
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Done!")
