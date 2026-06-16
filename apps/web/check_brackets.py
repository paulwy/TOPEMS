with open('src/pages/LimsTaskPage.tsx', 'r') as f:
    content = f.read()

# 检查括号平衡
stack = []
for i, char in enumerate(content):
    if char in '({[':
        stack.append((char, i))
    elif char in ')}]':
        if not stack:
            print(f'Line {content[:i].count(chr(10)) + 1}, col {i - content[:i].rfind(chr(10))}: Unexpected closing bracket {char}')
        else:
            opening, _ = stack.pop()
            if (char == ')' and opening != '(') or \
               (char == '}' and opening != '{') or \
               (char == ']' and opening != '['):
                print(f'Line {content[:i].count(chr(10)) + 1}: Mismatched brackets: {opening} and {char}')

if stack:
    for char, pos in stack:
        line = content[:pos].count(chr(10)) + 1
        print(f'Line {line}: Unclosed bracket {char}')

print('Done checking brackets')
