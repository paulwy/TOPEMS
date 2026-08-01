#!/usr/bin/env python3
"""Find t() calls in JSX text nodes that are not wrapped in {}"""
import re, os

files = [
    "apps/web/src/pages/monitor/MonitorSettingsPage.tsx",
    "apps/web/src/pages/monitor/MonitorNotificationPage.tsx",
    "apps/web/src/pages/monitor/MetricsDashboardPage.tsx",
    "apps/web/src/pages/monitor/SLOStatusPage.tsx",
    "apps/web/src/pages/monitor/MonitorMetricsPage.tsx",
    "apps/web/src/pages/notification/NotificationSettingsPage.tsx",
    "apps/web/src/pages/notification/NotificationDashboardPage.tsx",
    "apps/web/src/pages/notification/NotificationListPage.tsx",
    "apps/web/src/pages/notification/NotificationDetailPage.tsx",
    "apps/web/src/pages/notification/NotificationCenter.tsx",
]

for fname in files:
    with open(fname) as f:
        lines = f.readlines()
    issues = []
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('import '):
            continue
        # Look for t('...') or t("...") that is NOT preceded by {
        # and NOT in a JSX prop context (which would be ={t(...)})
        matches = list(re.finditer(r'(?<![{=])t\(["\']', stripped))
        if matches:
            prev_line = lines[i-2].strip() if i >= 2 else ''
            for m in matches:
                ctx_before = stripped[:m.start()].strip()
                # If preceded by > or in JSX body, it needs wrapping
                if ctx_before.endswith('>') or (ctx_before and not ctx_before.endswith('{') and not ctx_before.endswith('=') and not ctx_before.endswith('(')):
                    issues.append((i, stripped[:100]))
                    break
    if issues:
        print(f"\n=== {os.path.basename(fname)} ===")
        for line_no, text in issues:
            print(f"  L{line_no}: {text}")
