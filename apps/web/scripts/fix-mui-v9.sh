#!/bin/bash

# MUI v9 Breaking Changes Fix Script
# This script fixes common MUI v5 to v9 migration issues

cd /Users/air/TOPEMS/apps/web/src

echo "Fixing Stack justifyContent..."
find . -name "*.tsx" -exec sed -i '' \
  -E 's/justifyContent="([^"]*)"/sx={{ justifyContent: "\1" }}/g' {} \;

echo "Fixing Stack alignItems..."
find . -name "*.tsx" -exec sed -i '' \
  -E 's/alignItems="([^"]*)"/sx={{ alignItems: "\1" }}/g' {} \;

echo "Fixing Typography fontWeight..."
find . -name "*.tsx" -exec sed -i '' \
  -E 's/fontWeight="([^"]*)"/sx={{ fontWeight: "\1" }}/g' {} \;

echo "Done!"
