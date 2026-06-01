#!/usr/bin/env python3
import sys

def check_quotes(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    in_single_quote = False
    in_double_quote = False
    in_comment = False
    in_multiline_comment = False
    escape = False
    line_num = 1
    
    for i, char in enumerate(content):
        if char == '\n':
            line_num += 1
        
        if escape:
            escape = False
            continue
        
        if in_multiline_comment:
            if char == '*' and i + 1 < len(content) and content[i+1] == '/':
                in_multiline_comment = False
            continue
        
        if in_comment:
            if char == '\n':
                in_comment = False
            continue
        
        if char == '\\':
            escape = True
            continue
        
        if char == '/' and i + 1 < len(content):
            if content[i+1] == '/':
                in_comment = True
                continue
            elif content[i+1] == '*':
                in_multiline_comment = True
                continue
        
        if char == "'" and not in_double_quote:
            in_single_quote = not in_single_quote
        
        if char == '"' and not in_single_quote:
            in_double_quote = not in_double_quote
        
        if line_num == 309:
            print(f"Line 309, position {i}: char={repr(char)}, in_single={in_single_quote}, in_double={in_double_quote}")
    
    print(f"\nEnd of file:")
    print(f"  in_single_quote: {in_single_quote}")
    print(f"  in_double_quote: {in_double_quote}")
    print(f"  in_comment: {in_comment}")
    print(f"  in_multiline_comment: {in_multiline_comment}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_quotes.py <filepath>")
        sys.exit(1)
    check_quotes(sys.argv[1])
