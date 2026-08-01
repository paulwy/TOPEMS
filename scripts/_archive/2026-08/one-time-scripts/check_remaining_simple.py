#!/usr/bin/env python3
"""Simple count of Chinese per target file"""
import os, re

BASE = '/Users/air/TOPEMS/apps/web/src'
TARGETS = [
    'pages/rd/RsExperimentDetailPage.tsx',
    'pages/rd/RsSettingsPage.tsx',
    'pages/rd/RsProjectDetailPage.tsx',
    'pages/rd/RsExperimentCreatePage.tsx',
    'pages/rd/RsFormulaCreatePage.tsx',
    'pages/rd/RsDocPage.tsx',
    'pages/rd/RsFormulaDetailPage.tsx',
    'pages/rd/RsProjectCreatePage.tsx',
    'pages/rd/RsReviewPage.tsx',
    'pages/rd/RsReleasePage.tsx',
    'pages/rd/RsReportPage.tsx',
    'pages/rd/RsOverviewPage.tsx',
    'pages/gis/GisFencePage.tsx',
    'pages/gis/GisTrackingPage.tsx',
    'pages/gis/index.tsx',
]
# Add CRM
import glob
for p in glob.glob(f'{BASE}/pages/crm/*.tsx'):
    TARGETS.append(os.path.relpath(p, BASE).replace('\\','/'))
# Add IM
for root, dirs, files in os.walk(f'{BASE}/pages/im/MailPage'):
    for f in files:
        if f.endswith(('.ts','.tsx')):
            TARGETS.append(os.path.relpath(os.path.join(root,f), BASE).replace('\\','/'))
for p in [
    'pages/help/HelpCenterPage.tsx',
    'pages/help/GuidePage.tsx',
    'pages/help/FaqPage.tsx',
    'pages/shared/V4DemoPage.tsx',
    'pages/shared/FavoritesPage.tsx',
    'pages/shared/PluginMarketplacePage.tsx',
    'pages/asset/AssetListPage.tsx',
    'pages/asset/TransferPage.tsx',
    'pages/finance/ConsolidationScopePage.tsx',
    'pages/finance/FinanceBudgetDetailPage.tsx',
    'pages/plugin/PluginDetailPage.tsx',
    'pages/plugin/PluginMarketplacePage.tsx',
    'pages/notification/NotificationDetailPage.tsx',
    'pages/notification/NotificationCenter.tsx',
    'pages/performance/PerformanceTestPage.tsx',
]:
    TARGETS.append(p)
# System params
if os.path.isdir(f'{BASE}/pages/system/SystemParamsPage'):
    for root, dirs, files in os.walk(f'{BASE}/pages/system/SystemParamsPage'):
        for f in files:
            if f.endswith(('.ts','.tsx')):
                TARGETS.append(os.path.relpath(os.path.join(root,f), BASE).replace('\\','/'))

RE_CH = re.compile(r'[\u4e00-\u9fff]')

def is_code_line(line):
    """Approximate: check if line is actually code (non-comment, non-JSX-text)"""
    return True

results = []
total_remaining = 0
for rel in TARGETS:
    fp = f'{BASE}/{rel}'
    if not os.path.isfile(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')
    file_count = 0
    file_examples = []
    in_comment = False
    for ln, line in enumerate(lines, 1):
        # Ignore simple cases: pure import statements from i18n etc (check line text)
        stripped = line.strip()
        # Skip pure import/export lines (rarely Chinese)
        if stripped.startswith('import ') or stripped.startswith('export ') or stripped.startswith('//'):
            if stripped.startswith('//') and RE_CH.search(stripped):
                file_count += 1
                if len(file_examples) < 3:
                    file_examples.append(f'L{ln}:{stripped[:80]}')
            continue
        if '/*' in stripped and '*/' in stripped:
            continue
        if '/*' in stripped:
            in_comment = True
            continue
        if in_comment:
            if '*/' in stripped: in_comment = False
            continue
        # Now count Chinese chars
        if RE_CH.search(line):
            # Only report lines outside of pure variable name patterns
            # skip if in path reference (like 'pages/crm/...')
            # basic count
            chinese_chars = sum(1 for c in line if '\u4e00' <= c <= '\u9fff')
            file_count += chinese_chars
            if len(file_examples) < 3:
                file_examples.append(f'L{ln}:{stripped[:100]}')
    results.append((rel, file_count, file_examples))
    total_remaining += file_count

results.sort(key=lambda x: -x[1])
print(f"Remaining Chinese (approx char count) - Total ~{total_remaining}:")
for rel, cnt, ex in results:
    if cnt > 0:
        print(f"{cnt:5d}  {rel}")
        for e in ex:
            print(f"        > {e}")
