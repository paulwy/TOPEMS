#!/usr/bin/env python3
"""
Smart split of notification.rs into multiple submodules
"""

import re

# Read original file
with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification.rs', 'r') as f:
    lines = f.readlines()

total_lines = len(lines)
print(f"Total lines: {total_lines}")

# ============================================================
# Step 1: Find all top-level items and their boundaries
# ============================================================

# We need to find:
# - Doc comments (///) before items
# - derive/attribute macros
# - pub struct/enum/fn definitions
# - The entire block (including braces)

def find_matching_brace(start_line, lines):
    """Find the matching closing brace for an opening brace starting at start_line"""
    brace_count = 0
    for i in range(start_line - 1, len(lines)):
        line = lines[i]
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0 and i >= start_line - 1 and '{' in ''.join(lines[start_line-1:i+1]):
            return i + 1  # 1-indexed
    return len(lines)

def find_item_end(start_line, lines):
    """Find the end line of an item (struct, enum, fn, etc.)"""
    # First check if it's a struct/enum (has { ... })
    i = start_line - 1
    # Skip attributes and doc comments
    while i < len(lines) and (lines[i].strip().startswith('#') or 
                               lines[i].strip().startswith('///') or
                               lines[i].strip() == ''):
        i += 1
    
    # Now we should be at the actual definition
    # Check if it has a body with braces
    rest = ''.join(lines[i:])
    if '{' in rest:
        return find_matching_brace(i + 1, lines)
    else:
        # It's a function without body? No, all functions have bodies
        # Maybe it's just a signature - but in our case all have bodies
        return find_matching_brace(i + 1, lines)

# Find all top-level items (pub struct, pub enum, pub async fn, pub fn, async fn, fn)
items = []
i = 0
while i < len(lines):
    line = lines[i]
    # Check for item definitions
    if re.match(r'^pub (struct|enum|async fn|fn) ', line) or re.match(r'^(async fn|fn) ', line):
        # Find the start of the item (include doc comments and attributes)
        item_start = i + 1  # 1-indexed
        # Look backwards for doc comments and attributes
        j = i - 1
        while j >= 0 and (lines[j].strip().startswith('///') or 
                          lines[j].strip().startswith('#') or
                          lines[j].strip() == ''):
            if lines[j].strip() != '':
                item_start = j + 1
            j -= 1
        
        # Find the end of the item
        item_end = find_item_end(i + 1, lines)
        
        items.append({
            'start': item_start,
            'end': item_end,
            'def_line': i + 1,
            'def': line.strip(),
            'is_pub': line.startswith('pub '),
            'is_async': 'async fn' in line,
            'is_struct': 'struct ' in line,
            'is_enum': 'enum ' in line,
            'is_fn': 'fn ' in line and 'struct' not in line and 'enum' not in line,
        })
        i = item_end
    else:
        i += 1

print(f"\nFound {len(items)} top-level items:")
for item in items:
    print(f"  Lines {item['start']}-{item['end']}: {item['def'][:80]}")

# ============================================================
# Step 2: Classify items into modules
# ============================================================

# Models (structs/enums)
model_items = []
# Handlers (notification CRUD functions + send_notification_email helper)
handler_items = []
# Templates (template management functions)
template_items = []
# Archive (archive + health check functions)
archive_items = []

# Handlers function names
handler_fn_names = [
    'send_notification',
    'broadcast_notification',
    'list_notifications',
    'mark_as_read',
    'mark_all_as_read',
    'get_notifications',
    'get_unread_count',
    'get_unread_notifications',
    'delete_notification',
    'delete_all_notifications',
    'get_notification',
    'mark_as_unread',
    'bulk_mark_read',
    'bulk_delete',
    'get_notification_stats',
    'send_notification_email',  # private helper
]

# Template function names
template_fn_names = [
    'list_templates',
    'get_template',
    'create_template',
    'update_template',
    'delete_template',
]

# Archive function names
archive_fn_names = [
    'archive_notification',
    'unarchive_notification',
    'list_archived_notifications',
    'get_archive_config',
    'update_archive_config',
    'run_auto_archive',
    'get_notification_health_detailed',
]

def get_item_name(def_line):
    """Extract the name from a definition line"""
    match = re.search(r'(struct|enum|fn)\s+(\w+)', def_line)
    if match:
        return match.group(2)
    return None

for item in items:
    name = get_item_name(item['def'])
    if not name:
        continue
    
    if item['is_struct'] or item['is_enum']:
        model_items.append(item)
    elif name in handler_fn_names:
        handler_items.append(item)
    elif name in template_fn_names:
        template_items.append(item)
    elif name in archive_fn_names:
        archive_items.append(item)
    else:
        print(f"WARNING: Unclassified item: {name}")

print(f"\nModel items: {len(model_items)}")
print(f"Handler items: {len(handler_items)}")
print(f"Template items: {len(template_items)}")
print(f"Archive items: {len(archive_items)}")

# ============================================================
# Step 3: Create the directory and files
# ============================================================

import os

base_dir = '/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification'
os.makedirs(base_dir, exist_ok=True)

def extract_lines(start, end, lines):
    """Extract lines from start to end (1-indexed, inclusive)"""
    return ''.join(lines[start-1:end])

# ---- models.rs ----
models_content = "use serde::{Deserialize, Serialize};\nuse uuid::Uuid;\n\n"
for item in model_items:
    models_content += extract_lines(item['start'], item['end'], lines)
    models_content += '\n'

with open(os.path.join(base_dir, 'models.rs'), 'w') as f:
    f.write(models_content.rstrip() + '\n')

print(f"\nmodels.rs: {len(models_content.splitlines())} lines")

# ---- handlers.rs ----
handlers_imports = """use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{
    SendNotificationRequest,
    BroadcastNotificationRequest,
    NotificationQuery,
    BulkIdsRequest,
};

"""

handlers_content = handlers_imports
for item in handler_items:
    handlers_content += extract_lines(item['start'], item['end'], lines)
    handlers_content += '\n'

with open(os.path.join(base_dir, 'handlers.rs'), 'w') as f:
    f.write(handlers_content.rstrip() + '\n')

print(f"handlers.rs: {len(handlers_content.splitlines())} lines")

# ---- templates.rs ----
templates_imports = """use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{
    CreateTemplateRequest,
    UpdateTemplateRequest,
};

"""

templates_content = templates_imports
for item in template_items:
    templates_content += extract_lines(item['start'], item['end'], lines)
    templates_content += '\n'

with open(os.path.join(base_dir, 'templates.rs'), 'w') as f:
    f.write(templates_content.rstrip() + '\n')

print(f"templates.rs: {len(templates_content.splitlines())} lines")

# ---- archive.rs ----
archive_imports = """use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{
    NotificationQuery,
    ArchiveConfig,
};

"""

archive_content = archive_imports
for item in archive_items:
    archive_content += extract_lines(item['start'], item['end'], lines)
    archive_content += '\n'

with open(os.path.join(base_dir, 'archive.rs'), 'w') as f:
    f.write(archive_content.rstrip() + '\n')

print(f"archive.rs: {len(archive_content.splitlines())} lines")

# ---- mod.rs ----
# Collect all public item names
pub_model_names = [get_item_name(item['def']) for item in model_items if item['is_pub']]
pub_handler_names = [get_item_name(item['def']) for item in handler_items if item['is_pub']]
pub_template_names = [get_item_name(item['def']) for item in template_items if item['is_pub']]
pub_archive_names = [get_item_name(item['def']) for item in archive_items if item['is_pub']]

mod_content = '''//! Notification submodule - Notification handlers with database support

pub mod models;
pub mod handlers;
pub mod templates;
pub mod archive;

// Re-export all public types and functions for backward compatibility
pub use models::{
'''

for name in pub_model_names:
    mod_content += f'    {name},\n'

mod_content += '''};

pub use handlers::{
'''

for name in pub_handler_names:
    mod_content += f'    {name},\n'

mod_content += '''};

pub use templates::{
'''

for name in pub_template_names:
    mod_content += f'    {name},\n'

mod_content += '''};

pub use archive::{
'''

for name in pub_archive_names:
    mod_content += f'    {name},\n'

mod_content += '''};
'''

with open(os.path.join(base_dir, 'mod.rs'), 'w') as f:
    f.write(mod_content)

print(f"mod.rs: {len(mod_content.splitlines())} lines")

print("\nDone! All files created.")
