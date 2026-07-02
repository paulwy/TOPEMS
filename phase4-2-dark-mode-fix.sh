#!/usr/bin/env bash
# =============================================================================
# Phase 4.2 — Dark Mode Fix for BI Charts, GIS Map, Mobile Components
# =============================================================================
# Applies patches to:
#   1. Enhance BIChartColors with a dark-mode series palette
#   2. Create themeUtils.ts with dark-aware helpers
#   3. Add TODO annotations for GIS hardcoded colors
#   4. Annotate GIS files with dark tile-switch guidance
# =============================================================================

set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
BACKUP_SUFFIX=".bak.phase4-2"

echo "=== Phase 4.2 Dark Mode Fix ==="
echo ""

# ─── Helper: backup a file ────────────────────────────────────────────────────
backup() {
  local f="$1"
  if [ ! -f "${f}${BACKUP_SUFFIX}" ]; then
    cp "$f" "${f}${BACKUP_SUFFIX}"
    echo "  [backup] $(basename "$f")"
  else
    echo "  [skip]   $(basename "$f") already backed up"
  fi
}

# ─── Helper: insert after a pattern, only if marker absent ────────────────────
insert_after() {
  local file="$1"
  local pattern="$2"
  local marker="$3"
  local code="$4"

  # Check if marker already present
  if grep -q "$marker" "$file"; then
    echo "  [skip]   $(basename "$file") — marker already present"
    return 0
  fi

  # Use Python for reliable in-place insertion
  python3 -c "
import re
with open('$file', 'r', encoding='utf-8') as fh:
    content = fh.read()

if '$marker' in content:
    exit(0)

idx = content.find('$pattern')
if idx == -1:
    print(f'  [warn]   pattern not found in $(basename "$file")')
    exit(1)

# Advance past the matched line
end_of_line = content.find('\n', idx)
if end_of_line == -1:
    end_of_line = len(content)
else:
    end_of_line += 1  # include the newline

new_content = content[:end_of_line] + '\n' + '$code' + '\n' + content[end_of_line:]

with open('$file', 'w', encoding='utf-8') as fh:
    fh.write(new_content)
print(f'  [patch]  $(basename "$file")')
"
}

# ─── Helper: replace a line containing a pattern ──────────────────────────────
replace_line() {
  local file="$1"
  local pattern="$2"
  local replacement="$3"
  local marker="$4"

  if grep -q "$marker" "$file"; then
    echo "  [skip]   $(basename "$file") — marker already present"
    return 0
  fi

  python3 -c "
with open('$file', 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

new_lines = []
found = False
for line in lines:
    if not found and '$marker' not in line and '$pattern' in line:
        new_lines.append(line.rstrip('\n') + '  // TODO(dark-mode): $marker\n')
        new_lines.append('$replacement\n')
        found = True
    else:
        new_lines.append(line)

if not found:
    print(f'  [warn]   pattern not found in $(basename "$file")')
    exit(1)

with open('$file', 'w', encoding='utf-8') as fh:
    fh.writelines(new_lines)
print(f'  [patch]  $(basename "$file")')
"
}

# =============================================================================
# 1. Enhance chartTheme.ts — Add dark palette & useChartTheme series field
# =============================================================================
CHART_THEME="${PROJECT_ROOT}/apps/web/src/components/charts/chartTheme.ts"
echo "1. Enhancing BIChartColors in chartTheme.ts ..."

backup "$CHART_THEME"

# 1a. Add dark palette block before the closing `} as const`
python3 << 'PYEOF'
import os

file_path = "/Users/air/TOPEMS/apps/web/src/components/charts/chartTheme.ts"
marker = "// ── Dark-mode series palette ──"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if marker in content:
    print("  [skip]   chartTheme.ts — dark palette already present")
    exit(0)

# Insert the dark palette before `} as const;`
target = "} as const;"
replacement = """  // ── Dark-mode series palette (lighter hues for dark backgrounds) ──
  dark: {
    series: [
      '#60a5fa', // Blue (lighter for dark bg)
      '#4ade80', // Emerald
      '#fbbf24', // Amber
      '#f87171', // Red
      '#a78bfa', // Violet
      '#22d3ee', // Cyan
      '#f472b6', // Pink
      '#a3e635', // Lime
    ],
    grid: '#334155',
    text: '#94A3B8',
    background: 'rgba(30, 41, 59, 0.95)',
    border: '#475569',
  },
} as const;"""

content = content.replace(target, replacement, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("  [patch]  chartTheme.ts — dark palette added")
PYEOF

# 1b. Add `series` to ChartThemeColors interface and useChartTheme return value
python3 << 'PYEOF'
file_path = "/Users/air/TOPEMS/apps/web/src/components/charts/chartTheme.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add series to interface
interface_marker = "  /** MUI info, resolved to hex */\n  info: string;\n}"
series_interface_addition = "  /** MUI info, resolved to hex */\n  info: string;\n  /** Series color palette (dark-aware) */\n  series: string[];\n}"

if "series: string[];" not in content:
    content = content.replace(interface_marker, series_interface_addition)

# Add series to useChartTheme return
series_return_marker = "    info: theme.palette.info.main,"
if "seriesColor" not in content:
    # Insert before the closing return brace
    old_return_end = """    info: theme.palette.info.main,
  };
};"""

    new_return_end = """    info: theme.palette.info.main,
    series: isDark ? (BIChartColors as any).dark.series : BIChartColors.series,
  };
};"""
    content = content.replace(old_return_end, new_return_end)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("  [patch]  chartTheme.ts — series field added to useChartTheme")
PYEOF

echo ""

# =============================================================================
# 2. Create themeUtils.ts
# =============================================================================
THEME_UTILS="${PROJECT_ROOT}/apps/web/src/utils/themeUtils.ts"
echo "2. Creating themeUtils.ts ..."

if [ -f "$THEME_UTILS" ]; then
  backup "$THEME_UTILS"
else
  # Ensure directory exists
  mkdir -p "$(dirname "$THEME_UTILS")"
fi

cat > "$THEME_UTILS" << 'TSEOF'
// themeUtils.ts — Dark-mode aware utilities for non-MUI components
// (maps, canvas, SVG, custom renders that bypass MUI's sx prop)

import { useTheme } from '@mui/material/styles';

/**
 * Returns the dark-aware value based on current theme mode.
 * Use in React components for non-MUI elements (e.g. Leaflet styles, D3 SVG).
 *
 * @example
 *   const bg = useDarkAwareValue('#ffffff', '#1e293b');
 */
export function useDarkAwareValue(lightValue: string, darkValue: string): string {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? darkValue : lightValue;
}

/**
 * Simple hex color inversion (r,g,b each become 255-x).
 * Useful for generating quick dark-mode alternatives at render time.
 * For nuanced contrast adjustments prefer theme token values instead.
 *
 * @param hex - 7-character hex string like '#3b82f6'
 */
export function invertColor(hex: string): string {
  const r = 255 - parseInt(hex.slice(1, 3), 16);
  const g = 255 - parseInt(hex.slice(3, 5), 16);
  const b = 255 - parseInt(hex.slice(5, 7), 16);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
TSEOF

echo "  [create] themeUtils.ts"

echo ""

# =============================================================================
# 3. Add TODO annotations to GIS pages for hardcoded colors
# =============================================================================
GIS_TRACKING="${PROJECT_ROOT}/apps/web/src/pages/gis/GisTrackingPage.tsx"
GIS_FENCE="${PROJECT_ROOT}/apps/web/src/pages/gis/GisFencePage.tsx"
echo "3. Adding dark-mode TODO annotations to GIS pages ..."

# 3a. GisTrackingPage — pageGradient
backup "$GIS_TRACKING"
python3 << 'PYEOF'
file_path = "/Users/air/TOPEMS/apps/web/src/pages/gis/GisTrackingPage.tsx"
marker = "TODO(dark-mode): pageGradient hardcoded"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if marker in content:
    print("  [skip]   GisTrackingPage.tsx — TODO already present")
    exit(0)

target = "pageGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',"
replacement = """pageGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',  // TODO(dark-mode): pageGradient hardcoded; consider using useDarkAwareValue() for dark mode variant"""

content = content.replace(target, replacement, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("  [patch]  GisTrackingPage.tsx — pageGradient TODO added")
PYEOF

# 3b. GisFencePage — fence color
backup "$GIS_FENCE"
python3 << 'PYEOF'
file_path = "/Users/air/TOPEMS/apps/web/src/pages/gis/GisFencePage.tsx"
marker = "TODO(dark-mode): fence color hardcoded"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if marker in content:
    print("  [skip]   GisFencePage.tsx — TODO already present")
    exit(0)

target = "color: fence.status === 'active' ? '#f44336' : '#9e9e9e',"
replacement = """color: fence.status === 'active' ? '#f44336' : '#9e9e9e',  // TODO(dark-mode): fence color hardcoded; consider theme semantic tokens for dark mode"""

content = content.replace(target, replacement, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("  [patch]  GisFencePage.tsx — fence color TODO added")
PYEOF

echo ""

# =============================================================================
# 4. Annotate GIS files with dark tile-switch guidance
# =============================================================================
echo "4. Adding dark map tile guidance comments ..."

# 4a. GisTrackingPage — add top-of-file guidance
python3 << 'PYEOF'
file_path = "/Users/air/TOPEMS/apps/web/src/pages/gis/GisTrackingPage.tsx"
marker = "// TODO(dark-mode): map tiles"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if marker in content:
    print("  [skip]   GisTrackingPage.tsx — tile guidance already present")
    exit(0)

guidance = """// TODO(dark-mode): map tiles — When dark mode is enabled, consider switching to a dark
//   basemap tile layer (e.g. CartoDB Dark Matter, Mapbox Dark, or AMAP dark style).
//   This typically requires updating the tile URL in the map SDK configuration:
//     Light: https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
//     Dark:  https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
//   The tile layer config is usually set in GisMapTemplate or a shared map config.
//   Pass `useChartTheme().series` or `useDarkAwareValue()` to select the URL.
"""

# Insert after the last import line
lines = content.split("\n")
insert_idx = 0
for i, line in enumerate(lines):
    if line.startswith("import ") or (line.startswith("}") and i > insert_idx):
        insert_idx = i + 1

# Find the line after all imports end
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped and not stripped.startswith("import") and not stripped.startswith("}") and not stripped.startswith("//"):
        insert_idx = i
        break

content = content[:0] + guidance + "\n" + content

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("  [patch]  GisTrackingPage.tsx — tile guidance comment added")
PYEOF

# 4b. GisFencePage — add top-of-file guidance
python3 << 'PYEOF'
file_path = "/Users/air/TOPEMS/apps/web/src/pages/gis/GisFencePage.tsx"
marker = "// TODO(dark-mode): map tiles"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if marker in content:
    print("  [skip]   GisFencePage.tsx — tile guidance already present")
    exit(0)

guidance = """// TODO(dark-mode): map tiles — When dark mode is enabled, consider switching to a dark
//   basemap tile layer (e.g. CartoDB Dark Matter, Mapbox Dark, or AMAP dark style).
//   This typically requires updating the tile URL in the map SDK configuration:
//     Light: https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
//     Dark:  https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
//   The tile layer config is usually set in GisMapTemplate or a shared map config.
//   Pass `useChartTheme().series` or `useDarkAwareValue()` to select the URL.
"""

content = guidance + "\n" + content

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("  [patch]  GisFencePage.tsx — tile guidance comment added")
PYEOF

echo ""

# =============================================================================
# 5. Add dark-mode TODO to mobile pages
# =============================================================================
echo "5. Adding dark-mode TODO annotations to mobile pages ..."

MOBILE_PAGES=(
  "${PROJECT_ROOT}/apps/web/src/pages/mobile/MobileWorkbenchPage.tsx"
  "${PROJECT_ROOT}/apps/web/src/pages/mobile/ScanSettingsPage.tsx"
  "${PROJECT_ROOT}/apps/web/src/pages/mobile/MobileTaskListPage.tsx"
)

for page in "${MOBILE_PAGES[@]}"; do
  if [ ! -f "$page" ]; then
    echo "  [warn]   $(basename "$page") not found, skipping"
    continue
  fi

  backup "$page"

  python3 -c "
import os
file_path = '$page'
marker = '// TODO(dark-mode): review hardcoded colors for dark mode compatibility'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if marker in content:
    print(f'  [skip]   $(basename \"$page\") — TODO already present')
    exit(0)

# Insert after the last import block
lines = content.split('\n')
insert_idx = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped and not stripped.startswith('import') and not stripped.startswith('}') and not stripped.startswith('//') and not stripped.startswith('/*'):
        insert_idx = i
        break

lines.insert(insert_idx, '')
lines.insert(insert_idx, marker)
lines.insert(insert_idx, '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f'  [patch]  $(basename \"$page\")')
"
done

echo ""

# =============================================================================
# Done
# =============================================================================
echo "Phase 4.2 Dark Mode Fix: DONE"
