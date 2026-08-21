#!/usr/bin/env python3
"""Analyze CrudApiAdapter files including generic type pattern CrudApiAdapter<T>."""
import re, os, json

SRC_DIR = "/Users/xingzhai/TOPEMS/apps/web/src/pages"

def find_adapter_files():
    results = []
    for root, dirs, files in os.walk(SRC_DIR):
        for f in files:
            if f.endswith(('.tsx', '.ts')):
                fpath = os.path.join(root, f)
                try:
                    with open(fpath, 'r') as fh:
                        content = fh.read()
                    # Match both CrudApiAdapter = and CrudApiAdapter<T> =
                    if re.search(r':\s*CrudApiAdapter(?:<[^>]*>)?\s*=\s*\{', content):
                        if 'createCrudPageAdapter' not in content or \
                           re.search(r':\s*CrudApiAdapter(?:<[^>]*>)?\s*=\s*\{', content):
                            results.append(fpath)
                except:
                    pass
    return sorted(results)

def extract_adapter_block(content):
    match = re.search(r'(const\s+(\w+)\s*:\s*CrudApiAdapter(?:<[^>]*>)?\s*=\s*\{)', content)
    if not match:
        return None, None, None
    adapter_name = match.group(2)
    start_pos = match.start()
    brace_start = content.index('{', match.start())
    depth = 0
    end_pos = brace_start
    for i in range(brace_start, len(content)):
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                end_pos = i + 1
                if end_pos < len(content) and content[end_pos] == ';':
                    end_pos += 1
                break
    block = content[start_pos:end_pos]
    return block, adapter_name, (start_pos, end_pos)

def is_simple_passthrough(block):
    notes = []
    
    has_list = bool(re.search(r'\.list\w*\s*\(', block))
    has_create = bool(re.search(r'\.create\w*\s*\(', block))
    has_update = bool(re.search(r'\.update\w*\s*\(', block))
    has_delete = bool(re.search(r'\.delete\w*\s*\(', block))
    
    if not (has_list and has_create and has_update and has_delete):
        return False, None, "Missing CRUD methods"
    
    # Extract API object
    list_match = re.search(r'await\s+(\w[\w.]*)\.\w+\s*\(', block)
    if not list_match:
        return False, None, "No API call found"
    api_obj = list_match.group(1)
    
    if '.map(' in block:
        return False, api_obj, "Has .map()"
    if 'Object.assign' in block:
        return False, api_obj, "Has Object.assign"
    if '.filter(' in block:
        return False, api_obj, "Has .filter()"
    if '.reduce(' in block:
        return False, api_obj, "Has .reduce()"
    if '.sort(' in block:
        return False, api_obj, "Has .sort()"
    if re.search(r'\blet\s+\w+', block):
        return False, api_obj, "Has let declaration"
    
    # Check for field transformations in create/update
    create_section = re.search(r'create:\s*async\s*\([^)]*\)\s*=>\s*\{(.+?)\n\s*\},', block, re.DOTALL)
    update_section = re.search(r'update:\s*async\s*\([^)]*\)\s*=>\s*\{(.+?)\n\s*\},', block, re.DOTALL)
    
    for section_name, section in [('create', create_section), ('update', update_section)]:
        if section:
            body = section.group(1)
            if re.search(r'\bString\s*\(', body):
                return False, api_obj, f"{section_name} has String()"
            if re.search(r'\bNumber\s*\(', body):
                return False, api_obj, f"{section_name} has Number()"
            if re.search(r'\bBoolean\s*\(', body):
                return False, api_obj, f"{section_name} has Boolean()"
            if re.search(r'\bMath\.random', body):
                return False, api_obj, f"{section_name} has Math.random()"
    
    # Check for throw in create/update (not supported operations)
    if update_section:
        if 'throw new Error' in update_section.group(1) and 'await' not in update_section.group(1):
            return False, api_obj, "update throws (not supported)"
    if create_section:
        if 'throw new Error' in create_section.group(1) and 'await' not in create_section.group(1):
            return False, api_obj, "create throws (not supported)"
    
    # Check for extra API calls
    await_calls = re.findall(r'await\s+\w[\w.]*\.\w+\s*\(', block)
    method_names = set()
    for c in await_calls:
        m = re.search(r'\.(\w+)\s*\(', c)
        if m:
            method_names.add(m.group(1))
    extra = method_names - {'list', 'create', 'update', 'delete'}
    # Allow listXxx, createXxx, updateXxx, deleteXxx patterns
    real_extra = [m for m in extra if not re.match(r'^(list|create|update|delete)\w+$', m)]
    if real_extra:
        return False, api_obj, f"Extra API calls: {real_extra}"
    
    # Detect items field
    items_field = None
    field_match = re.search(r'data\?\.\w*?\??\.(\w+)', block)
    if field_match:
        field = field_match.group(1)
        if field not in ('items', 'total'):
            items_field = field
            notes.append(f"itemsField: {field}")
    # Also check response.data.xxx
    field_match2 = re.findall(r'response\.data\??\??\.(\w+)', block)
    for f in field_match2:
        if f not in ('items', 'total', 'success', 'data') and not items_field:
            items_field = f
            notes.append(f"itemsField: {f}")
    
    return True, api_obj, "; ".join(notes) if notes else "simple"

def main():
    files = find_adapter_files()
    print(f"Found {len(files)} files with hand-written CrudApiAdapter (including generic)\n")
    candidates = []
    skipped = []
    for fpath in files:
        with open(fpath, 'r') as fh:
            content = fh.read()
        # Skip if already uses createCrudPageAdapter for the adapter
        if 'createCrudPageAdapter' in content:
            # Check if it still has a hand-written adapter block
            block, name, _ = extract_adapter_block(content)
            if not block:
                skipped.append((fpath, "Already uses createCrudPageAdapter (no hand-written block)"))
                continue
        block, adapter_name, _ = extract_adapter_block(content)
        if not block:
            skipped.append((fpath, "No block"))
            continue
        is_simple, api_obj, reason = is_simple_passthrough(block)
        rel = fpath.replace('/Users/xingzhai/TOPEMS/', '')
        if is_simple:
            lines = block.count('\n') + 1
            candidates.append({'file': fpath, 'rel': rel, 'name': adapter_name, 'api': api_obj, 'lines': lines, 'notes': reason})
        else:
            skipped.append((fpath, f"Skip: {reason}"))
    print(f"=== Candidates ({len(candidates)}) ===")
    total = 0
    for c in candidates:
        sav = c['lines'] - 1
        total += sav
        print(f"  {c['rel']}: {c['name']}({c['lines']}L) api={c['api']} save~{sav}")
        if c.get('notes', 'simple') != 'simple':
            print(f"    NOTE: {c['notes']}")
    print(f"\nTotal potential savings: ~{total} lines")
    print(f"\n=== Skipped ({len(skipped)}) ===")
    for fpath, reason in skipped:
        print(f"  {fpath.replace('/Users/xingzhai/TOPEMS/', '')}: {reason}")
    with open('/Users/xingzhai/TOPEMS/scripts/migration_generic.json', 'w') as f:
        json.dump(candidates, f, indent=2)
    print(f"\nSaved to scripts/migration_generic.json")

if __name__ == '__main__':
    main()
