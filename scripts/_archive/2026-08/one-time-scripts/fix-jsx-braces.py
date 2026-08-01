#!/usr/bin/env python3
"""Fix JSX props missing curly braces: =t(...) -> ={t(...)}"""

import re

files = [
    "/Users/air/TOPEMS/apps/web/src/pages/monitor/MonitorSettingsPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/monitor/MonitorNotificationPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/monitor/MetricsDashboardPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/monitor/SLOStatusPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/monitor/MonitorMetricsPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationSettingsPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationDashboardPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationListPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationDetailPage.tsx",
    "/Users/air/TOPEMS/apps/web/src/pages/notification/NotificationCenter.tsx",
]

def fix_jsx_props(content):
    """Fix =t(...) -> ={t(...)} for JSX props by finding matching close paren."""
    result = []
    i = 0
    fixes = 0
    while i < len(content):
        # Look for =t( that's not preceded by {
        if (content[i] == '=' and i + 1 < len(content) and content[i+1] == 't' 
            and i + 2 < len(content) and content[i+2] == '('
            and (i == 0 or content[i-1] != '{')):
            # Find matching close paren
            depth = 1
            j = i + 3  # position after =t(
            while j < len(content) and depth > 0:
                if content[j] == '(':
                    depth += 1
                elif content[j] == ')':
                    depth -= 1
                elif content[j] in ('"', "'", '`'):
                    # Skip string
                    quote = content[j]
                    j += 1
                    while j < len(content) and content[j] != quote:
                        if content[j] == '\\':
                            j += 1
                        j += 1
                j += 1
            # j is now past the matching )
            # content[i:i+3] is =t(
            # content[j-1] is )
            # Replace =t(...) with ={t(...)}
            result.append('={t(')
            result.append(content[i+3:j-1])
            result.append(')}')
            fixes += 1
            i = j
        else:
            result.append(content[i])
            i += 1
    return ''.join(result), fixes

total = 0
for f in files:
    c = open(f).read()
    fixed, n = fix_jsx_props(c)
    if n > 0:
        open(f, 'w').write(fixed)
        total += n
        print(f"[{f.split('/')[-1]}] Fixed {n} props")

print(f"\nTotal fixed: {total} JSX props")
