#!/usr/bin/env python3
"""unused 第三批部分删删除器——干跑/实删双模式
用法:
  python3 scripts/audit/partial-remove.py --dry  # 干跑打印将删区间
  python3 scripts/audit/partial-remove.py --apply # 实删
"""
import json, subprocess, re, sys, os
from collections import defaultdict

ROOT = '/Users/xingzhai/TOPEMS'

def grep_lines(pattern, path):
    r = subprocess.run(['grep','-rn','-w',pattern,path], capture_output=True, text=True, cwd=ROOT)
    return [l for l in r.stdout.split('\n') if l.strip()]

def build_candidates():
    d = json.load(open(os.path.join(ROOT,'scripts/audit/ts-unused-exports-report.json')))
    l1 = d['L1']
    multi = [x for x in l1 if x.get('anyValueExport') and len(x.get('defFiles',[]))>1]
    deletable = []
    for x in multi:
        n = x['name']
        lines = grep_lines(n, 'apps/web/src')
        agg = [l for l in lines if (f'= {n}' in l or f': {n}' in l or f'{n}.' in l) and 'import' not in l and 'export' not in l]
        if not agg:
            deletable.append((n, x['defFiles']))
    return deletable

def find_block_end(lines, start):
    """括号配平找 export 块结束行（含 template literal 自配平假设）"""
    depth = 0
    in_str = None
    in_block_comment = False
    seen_brace = False
    i = start
    first = lines[start]
    is_func_like = bool(re.match(r'export\s+(?:async\s+)?(?:function|class)\b', first))
    while i < len(lines):
        line = lines[i]
        j = 0
        while j < len(line):
            c = line[j]
            if in_block_comment:
                if line[j:j+2] == '*/':
                    in_block_comment = False
                    j += 2
                else:
                    j += 1
                continue
            if in_str:
                if c == '\\':
                    j += 2; continue
                if c == in_str:
                    in_str = None
                j += 1
                continue
            if c == '/' and j+1 < len(line) and line[j+1] == '/':
                break
            if c == '/' and j+1 < len(line) and line[j+1] == '*':
                in_block_comment = True
                j += 2
                continue
            if c in '"\'':
                in_str = c; j += 1; continue
            if c == '`':
                in_str = '`'; j += 1; continue
            if c == '{':
                depth += 1
                seen_brace = True
            elif c == '}':
                depth -= 1
            j += 1
        if depth == 0:
            stripped = line.rstrip()
            # 结束条件：const 需要行尾 ;；func/class 必须已见过体 {（防跨行签名误判）
            if stripped.endswith(';') or (is_func_like and seen_brace):
                # 归零点可能是「返回类型对象 }」而非函数体结束——
                # 若下一非空行以 { 开头，说明后面还有函数体，继续扫描
                nxt = i + 1
                while nxt < len(lines) and not lines[nxt].strip():
                    nxt += 1
                if nxt < len(lines) and lines[nxt].lstrip().startswith('{'):
                    seen_brace = False
                    i += 1
                    continue
                return i
        i += 1
    return None

def find_export_start(lines, name):
    pat = re.compile(r'^export\s+(?:async\s+)?(?:const|function|class)\s+(' + re.escape(name) + r')\b')
    for i, l in enumerate(lines):
        if pat.match(l):
            return i
    return None

def process_file(path, names):
    """返回 (new_content, removed, notes)"""
    with open(path) as f:
        content = f.read()
    lines = content.split('\n')
    removed = []
    notes = []
    for name in names:
        start = find_export_start(lines, name)
        if start is None:
            # 尝试文件级 `export { A, B };` re-export 行（定义不带 export 前缀）
            handled = False
            for ri, rl in enumerate(lines):
                m = re.match(r'^export\s*\{\s*([^}]*)\}\s*;?$', rl.strip())
                if m:
                    items = [x.strip() for x in m.group(1).split(',') if x.strip()]
                    if name in items:
                        items.remove(name)
                        if items:
                            lines[ri] = rl.replace(m.group(1), ', '.join(items))
                        else:
                            del lines[ri]
                        removed.append((name, ri+1, ri+1, rl.strip()[:60]))
                        handled = True
                        break
            if not handled:
                notes.append(f'!! 未找到 export 定义: {name}')
            continue
        end = find_block_end(lines, start)
        if end is None:
            notes.append(f'!! 块解析失败(未结束), 跳过: {name} @L{start+1}')
            continue
        blk = lines[start:end+1]
        removed.append((name, start+1, end+1, '\n'.join(blk)[:90]))
        del lines[start:end+1]
        for di, dl in enumerate(lines):
            if re.match(r'^export\s+default\s+' + re.escape(name) + r'\s*;?$', dl.strip()):
                del lines[di]
                removed.append((f'default {name}', di+1, di+1, dl[:60]))
                break
    return '\n'.join(lines), removed, notes

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--dry'
    deletable = build_candidates()
    # 定义文件 -> 候选名
    def_files = defaultdict(set)
    for n, fs in deletable:
        for f in fs:
            if not f.endswith('/index.ts') and f.startswith('apps/web/src'):
                def_files[f].add(n)
    # 只保留部分删文件（文件有候选外的其他导出）
    partial = {}
    for f, names in sorted(def_files.items()):
        r = subprocess.run(['grep','-c','^export ', f], capture_output=True, text=True, cwd=ROOT)
        try: tot = int(r.stdout.strip())
        except: tot = 0
        if not (tot > 0 and len(names) >= tot):
            partial[f] = sorted(names)
    print(f'部分删文件: {len(partial)}')
    total_removed = 0
    for f, names in partial.items():
        path = os.path.join(ROOT, f)
        new_content, removed, notes = process_file(path, names)
        for note in notes:
            print(f'  {f}: {note}')
        for name, s, e, snip in removed:
            total_removed += 1
        if mode == '--apply':
            with open(path, 'w') as fh:
                fh.write(new_content)
            print(f'  ✓ 已改 {f} ({len(removed)} 块)')
    print(f'=== 总删除块: {total_removed} ===')
    if mode == '--apply':
        print('APPLY 模式完成')
    else:
        print('DRY 模式（未写盘）——加 --apply 实删')

if __name__ == '__main__':
    main()
