#!/usr/bin/env python3
import re

filepath = '/Users/air/TOPEMS/apps/web/src/pages/bi/DataAnalysisPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Find the start and end of module-level consts that use t()
# Keep ct = designTokens.colors
const_start = None
const_end = None

for i, line in enumerate(lines):
    if line.strip() == 'const ct = designTokens.colors;':
        const_start = i + 1  # start after ct
    if const_start and i > const_start and line.startswith('const DataAnalysisPage'):
        const_end = i - 1  # end before component
        break

print(f"Module consts: lines {const_start+1}-{const_end+1}")

# Extract the module consts to move them inside component
module_consts = lines[const_start:const_end+1]
module_consts_text = '\n'.join(module_consts)

# Fix mockPivotData: add [] around t() calls for object keys
# Pattern: t('...'): number -> [t('...')]: number
module_consts_text = re.sub(
    r"(\s+)t\('([^']+)'\):\s*(\d+)",
    r"\1[t('\2')]: \3",
    module_consts_text
)

# Build new file
# 1. Lines before const_start (keep ct)
new_lines = lines[:const_start]

# 2. Add component line
new_lines.extend(lines[const_end+1:])  # from component definition onward

# Now find the component body start and insert useTranslation + useMemo
component_body_start = None
for i, line in enumerate(new_lines):
    if line.startswith('const DataAnalysisPage = () => {'):
        component_body_start = i + 1
        break

print(f"Component body starts at line {component_body_start+1}")

# Insert at beginning of component body
insert_lines = [
    "  const { t } = useTranslation();",
    "",
    "  const mockSalesData = useMemo(() => [",
]

# Parse and transform module consts
# We need to convert them to useMemo

# Actually, let's just wrap them properly
# Let's find each const and wrap it

# Easier approach: build the useMemo wrapped versions
lines_to_insert = []

lines_to_insert.append("  const { t } = useTranslation();")
lines_to_insert.append("")

# mockSalesData
lines_to_insert.append("  const mockSalesData = useMemo(() => [")
in_sales = False
for line in module_consts:
    stripped = line.strip()
    if stripped.startswith('const mockSalesData'):
        in_sales = True
        continue
    if in_sales:
        if stripped == '];':
            break
        lines_to_insert.append('  ' + line)
lines_to_insert.append("  ], [t]);")
lines_to_insert.append("")

# mockRegionData
lines_to_insert.append("  const mockRegionData = useMemo(() => [")
in_region = False
for line in module_consts:
    stripped = line.strip()
    if stripped.startswith('const mockRegionData'):
        in_region = True
        continue
    if in_region:
        if stripped == '];':
            break
        lines_to_insert.append('  ' + line)
lines_to_insert.append("  ], [t]);")
lines_to_insert.append("")

# mockPivotData (needs computed property names)
lines_to_insert.append("  const mockPivotData = useMemo(() => [")
in_pivot = False
for line in module_consts:
    stripped = line.strip()
    if stripped.startswith('const mockPivotData'):
        in_pivot = True
        continue
    if in_pivot:
        if stripped == '];':
            break
        # Fix object keys: t('...'): number -> [t('...')]: number
        fixed_line = re.sub(
            r"^(\s+)t\('([^']+)'\):\s*(\d+),?$",
            lambda m: f"{m.group(1)}[t('{m.group(2)}')]: {m.group(3)}{',' if m.group(0).endswith(',') else ''}",
            line
        )
        lines_to_insert.append('  ' + fixed_line)
lines_to_insert.append("  ], [t]);")
lines_to_insert.append("")

# filters
lines_to_insert.append("  const filters: FilterConfig[] = useMemo(() => [")
in_filters = False
for line in module_consts:
    stripped = line.strip()
    if stripped.startswith('const filters'):
        in_filters = True
        continue
    if in_filters:
        if stripped == '];':
            break
        lines_to_insert.append('  ' + line)
lines_to_insert.append("  ], [t]);")
lines_to_insert.append("")

# Insert into new_lines
final_lines = new_lines[:component_body_start] + lines_to_insert + new_lines[component_body_start:]

final_content = '\n'.join(final_lines)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Done!")
