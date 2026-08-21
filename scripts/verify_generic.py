#!/usr/bin/env python3
"""Thorough verification of generic CrudApiAdapter candidates."""
import json, re

with open('/Users/xingzhai/TOPEMS/scripts/migration_generic.json') as f:
    candidates = json.load(f)

def extract_adapter_block(content):
    match = re.search(r'(const\s+\w+\s*:\s*CrudApiAdapter(?:<[^>]*>)?\s*=\s*\{)', content)
    if not match:
        return None
    start = match.start()
    brace_start = content.index('{', match.start())
    depth = 0
    end = brace_start
    for i in range(brace_start, len(content)):
        if content[i] == '{': depth += 1
        elif content[i] == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                if end < len(content) and content[end] == ';': end += 1
                break
    return content[start:end]

def verify(block):
    """Thorough verification - returns (is_simple, reason)."""
    # Extract each method's body
    methods = {}
    for method in ['list', 'create', 'update', 'delete']:
        m = re.search(method + r':\s*async\s*\([^)]*\)\s*=>\s*\{', block)
        if not m:
            return False, f"No {method} method"
        # Find the method body (up to the next method or closing brace)
        start = m.end()
        depth = 1
        end = start
        for i in range(start, len(block)):
            if block[i] == '{': depth += 1
            elif block[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        methods[method] = block[start:end]
    
    # Check list method
    list_body = methods['list']
    # Multiple returns (error + success)
    return_count = list_body.count('return {') + list_body.count('return{')
    if return_count > 1:
        return False, "list has multiple returns"
    # Parameter renaming (keyword instead of search, page+1, etc.)
    if 'keyword' in list_body:
        return False, "list renames search to keyword"
    if 'page + 1' in list_body or 'page+1' in list_body:
        return False, "list offsets page by 1"
    if "'all'" in list_body or '"all"' in list_body:
        return False, "list filters 'all' values"
    # Custom return construction
    if '...' in list_body and 'return' in list_body:
        # Check for spread in return
        if re.search(r'return\s*\{?\s*\.\.\.', list_body):
            return False, "list has spread in return"
    
    # Check create method
    create_body = methods['create']
    # Must return response.data (possibly with fallback to data, but not custom construction)
    if 'response.data ?? data' in create_body:
        return False, "create falls back to input data"
    if '...' in create_body and 'return' in create_body:
        if re.search(r'return\s*\{?\s*\.\.\.', create_body):
            return False, "create has spread in return"
    
    # Check update method
    update_body = methods['update']
    if '...' in update_body and 'return' in update_body:
        if re.search(r'return\s*\{?\s*\.\.\.', update_body):
            return False, "update has spread in return"
    if 'response.data ?? data' in update_body:
        return False, "update falls back to input data"
    # Check if update throws (not supported)
    if 'throw new Error' in update_body and 'await' not in update_body:
        return False, "update throws (not supported)"
    
    # Check delete method
    delete_body = methods['delete']
    if 'throw new Error' in delete_body and 'await' not in delete_body:
        return False, "delete throws (not supported)"
    
    # Check for let declarations in any method
    for method, body in methods.items():
        if re.search(r'\blet\s+\w+', body):
            return False, f"{method} has let declaration"
    
    # Check for .map(), .filter(), .reduce(), .sort()
    for method, body in methods.items():
        for pattern in ['.map(', '.filter(', '.reduce(', '.sort(']:
            if pattern in body:
                return False, f"{method} has {pattern}"
    
    # Check for String(), Number(), Boolean() in create/update
    for method in ['create', 'update']:
        body = methods[method]
        for func in ['String(', 'Number(', 'Boolean(']:
            if func in body:
                return False, f"{method} has {func}"
    
    # Check for Math.random
    for method, body in methods.items():
        if 'Math.random' in body:
            return False, f"{method} has Math.random"
    
    return True, "verified simple passthrough"

qualified = []
disqualified = []

for c in candidates:
    with open(c['file'], 'r') as f:
        content = f.read()
    block = extract_adapter_block(content)
    if not block:
        disqualified.append((c['rel'], "No block"))
        continue
    is_simple, reason = verify(block)
    if is_simple:
        qualified.append(c)
    else:
        disqualified.append((c['rel'], reason))

print(f"=== Qualified ({len(qualified)}) ===")
total = 0
for c in qualified:
    sav = c['lines'] - 1
    total += sav
    print(f"  {c['rel']}: {c['name']}({c['lines']}L) api={c['api']} save~{sav}")
    if c.get('notes', 'simple') != 'simple':
        print(f"    NOTE: {c['notes']}")
print(f"\nTotal potential savings: ~{total} lines")

print(f"\n=== Disqualified ({len(disqualified)}) ===")
for rel, reason in disqualified:
    print(f"  {rel}: {reason}")

with open('/Users/xingzhai/TOPEMS/scripts/migration_generic_qualified.json', 'w') as f:
    json.dump(qualified, f, indent=2)
print(f"\nSaved to scripts/migration_generic_qualified.json")
