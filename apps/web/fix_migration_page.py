#!/usr/bin/env python3

with open('/Users/xingzhai/TOPEMS/apps/web/src/pages/MigrationAdminPage.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # 替换 Button 导入
    if line.strip() == 'import { Button } from "../components/ui/button";':
        new_lines.append('import { Button, Box, Typography, Dialog, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";\n')
        i += 1
        continue
    
    # 跳过旧的 table 导入
    if line.strip() == 'import {' and i+1 < len(lines) and lines[i+1].strip() == 'Table,' and lines[i+2].strip() == 'TableHeader,' and lines[i+3].strip() == 'TableBody,' and lines[i+4].strip() == 'TableRow,' and lines[i+5].strip() == 'TableHead,' and lines[i+6].strip() == 'TableCell,' and lines[i+7].strip() == '} from "../components/ui/table";':
        i += 8
        continue
    
    # 跳过旧的 dialog 导入
    if line.strip() == 'import {' and i+1 < len(lines) and lines[i+1].strip() == 'Dialog,' and lines[i+2].strip() == 'DialogContent,' and lines[i+3].strip() == 'DialogDescription,' and lines[i+4].strip() == 'DialogHeader,' and lines[i+5].strip() == 'DialogTitle,' and lines[i+6].strip() == '} from "../components/ui/dialog";':
        i += 7
        continue
    
    # 修复标签不匹配
    if line.strip() == '</div>' and i+1 < len(lines) and lines[i+1].strip() == ') : (' and i-1 >= 0 and '暂无已执行记录' in lines[i-1]:
        new_lines.append('                </Box>\n')
        i += 1
        continue
    
    if line.strip() == '</div>' and i+1 < len(lines) and lines[i+1].strip() == '</div>' and i+2 < len(lines) and lines[i+2].strip() == ') : (' and i-1 >= 0 and lines[i-1].strip() == '}':
        new_lines.append('              </Box>\n')
        i += 1
        continue
    
    new_lines.append(line)
    i += 1

# 移除文件末尾的 % 符号
if new_lines and new_lines[-1].endswith('%'):
    new_lines[-1] = new_lines[-1][:-1]

with open('/Users/xingzhai/TOPEMS/apps/web/src/pages/MigrationAdminPage.tsx', 'w') as f:
    f.writelines(new_lines)

print("修复完成")