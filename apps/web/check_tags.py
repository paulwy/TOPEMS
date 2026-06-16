import re

with open('src/pages/PmProjectDetailPage.tsx', 'r') as f:
    content = f.read()

tags = ['Tabs', 'Tab', 'Card', 'CardContent', 'CardHeader', 'CardTitle', 'Table', 'TableBody', 'TableRow', 'TableCell', 'MuiTableHead']
for tag in tags:
    open_pattern = fr'<{tag}(?!\w)[^>]*>'
    close_pattern = fr'</{tag}>'
    open_tags = re.findall(open_pattern, content)
    close_tags = re.findall(close_pattern, content)
    self_closing = [t for t in open_tags if t.endswith('/>')]
    balance = (len(open_tags) - len(self_closing)) - len(close_tags)
    print(f'{tag}: {len(open_tags)} open, {len(close_tags)} close, {len(self_closing)} self-closing, balance={balance}')
