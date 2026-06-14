#!/usr/bin/env python3
import os
import re
import glob

def fix_stack_props(content):
    # Fix: <Stack direction="row" alignItems="center" justifyContent="space-between">
    content = re.sub(
        r'<Stack direction="row" alignItems="center" justifyContent="([^"]+)">',
        r'<Stack direction="row" sx={{ alignItems: "center", justifyContent: "\1" }}>',
        content
    )
    
    # Fix: <Stack direction="row" justifyContent="space-between" alignItems="center">
    content = re.sub(
        r'<Stack direction="row" justifyContent="([^"]+)" alignItems="center">',
        r'<Stack direction="row" sx={{ justifyContent: "\1", alignItems: "center" }}>',
        content
    )
    
    # Fix: <Stack direction="row" alignItems="center" spacing={
    content = re.sub(
        r'<Stack direction="row" alignItems="center" spacing=',
        r'<Stack direction="row" sx={{ alignItems: "center" }} spacing=',
        content
    )
    
    # Fix: <Stack direction="row" alignItems="center" sx={
    content = re.sub(
        r'<Stack direction="row" alignItems="center" sx=',
        r'<Stack direction="row" sx={{ alignItems: "center" }} sx=',
        content
    )
    
    # Fix: <Stack direction="row" alignItems="center">
    content = re.sub(
        r'<Stack direction="row" alignItems="center">',
        r'<Stack direction="row" sx={{ alignItems: "center" }}>',
        content
    )
    
    # Fix: <Stack direction="row" justifyContent="space-between" spacing={
    content = re.sub(
        r'<Stack direction="row" justifyContent="([^"]+)" spacing=',
        r'<Stack direction="row" sx={{ justifyContent: "\1" }} spacing=',
        content
    )
    
    # Fix: <Stack direction="row" justifyContent="space-between" sx={
    content = re.sub(
        r'<Stack direction="row" justifyContent="([^"]+)" sx=',
        r'<Stack direction="row" sx={{ justifyContent: "\1" }} sx=',
        content
    )
    
    # Fix: <Stack direction="row" justifyContent="space-between">
    content = re.sub(
        r'<Stack direction="row" justifyContent="([^"]+)">',
        r'<Stack direction="row" sx={{ justifyContent: "\1" }}>',
        content
    )
    
    return content

def main():
    pages_dir = "/Users/air/TOPEMS/apps/web/src/pages"
    
    for filepath in glob.glob(os.path.join(pages_dir, "**/*.tsx"), recursive=True):
        if filepath.endswith(".bak"):
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = fix_stack_props(content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed: {filepath}")

if __name__ == "__main__":
    main()
