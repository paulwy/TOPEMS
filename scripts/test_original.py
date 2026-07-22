#!/usr/bin/env python3
"""
Test script - use original i18n_converter to process one file and check result.
"""

import sys
sys.path.insert(0, '/Users/air/TOPEMS/scripts')

from i18n_converter import process_file, ZH_JSON_PATH, EN_JSON_PATH
import json
import os
import shutil

TEST_FILE = '/Users/air/TOPEMS/apps/web/src/pages/asset/AssetListPage.tsx'
BACKUP_FILE = TEST_FILE + '.bak'

# Backup original
shutil.copy2(TEST_FILE, BACKUP_FILE)

# Load i18n data
with open(ZH_JSON_PATH, 'r') as f:
    zh_data = json.load(f)
with open(EN_JSON_PATH, 'r') as f:
    en_data = json.load(f)

# Process file
print("Processing AssetListPage.tsx...")
converted, new_keys = process_file(
    TEST_FILE, 
    'asset', 
    'asset_list_page', 
    zh_data, 
    en_data, 
    dry_run=False
)

print(f"\nConverted: {converted}")
print(f"New keys: {len(new_keys)}")

# Check for errors
print("\n" + "="*60)
print("Running TypeScript check...")
os.system("cd /Users/air/TOPEMS/apps/web && npx tsc --noEmit 2>&1 | grep 'AssetListPage' | head -20")

# Restore
print("\n" + "="*60)
print("Restoring original file...")
shutil.copy2(BACKUP_FILE, TEST_FILE)
os.remove(BACKUP_FILE)
print("Done!")
