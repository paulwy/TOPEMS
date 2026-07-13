#!/usr/bin/env python3
"""
Mock 数据清理脚本

功能：
1. 扫描项目中所有 mock 数据文件
2. 识别测试创建的临时数据
3. 清理数据库中的测试数据
4. 清理前端 mock 文件

使用方式：
    python scripts/cleanup-mock-data.py [--scan|--clean-db|--clean-files]

选项：
    --scan          扫描项目中的 mock 数据文件（默认）
    --clean-db      清理数据库中的测试数据
    --clean-files   清理前端 mock 文件
    --dry-run       模拟运行，不实际执行删除操作
"""

import os
import re
import argparse
import glob
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

MOCK_FILE_PATTERNS = [
    "**/mock/**/*.ts",
    "**/mock/**/*.js",
    "**/mock.*.ts",
    "**/mock.*.js",
    "**/mockData*.ts",
    "**/mockData*.js",
    "**/*Mock*.ts",
    "**/*Mock*.js",
]

TEST_DATA_MARKERS = [
    "TEST_",
    "_TEST",
    "test_",
    "_test",
    "demo_",
    "_demo",
    "sample_",
    "_sample",
]

def scan_mock_files():
    """扫描项目中的 mock 数据文件"""
    print("🔍 扫描项目中的 mock 数据文件...")
    
    mock_files = []
    for pattern in MOCK_FILE_PATTERNS:
        files = glob.glob(str(PROJECT_ROOT / pattern), recursive=True)
        mock_files.extend(files)
    
    mock_files = sorted(set(mock_files))
    
    print(f"\n📋 找到 {len(mock_files)} 个 mock 数据文件：")
    for i, f in enumerate(mock_files, 1):
        rel_path = os.path.relpath(f, PROJECT_ROOT)
        size = os.path.getsize(f)
        print(f"  {i}. {rel_path} ({size} bytes)")
    
    return mock_files

def analyze_mock_content(file_path):
    """分析 mock 文件内容"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    mock_count = 0
    test_data_count = 0
    
    for line in lines:
        if re.search(r'mock|Mock|MOCK', line, re.IGNORECASE):
            mock_count += 1
        for marker in TEST_DATA_MARKERS:
            if marker.lower() in line.lower():
                test_data_count += 1
                break
    
    return {
        'lines': len(lines),
        'mock_lines': mock_count,
        'test_data_lines': test_data_count,
        'size': os.path.getsize(file_path)
    }

def clean_mock_files(dry_run=True):
    """清理前端 mock 文件"""
    print("🗑️ 清理前端 mock 文件...")
    
    mock_files = scan_mock_files()
    
    print(f"\n⚠️ 即将清理 {len(mock_files)} 个 mock 文件")
    
    if dry_run:
        print("   [DRY RUN] 以下文件将被删除：")
        for f in mock_files:
            rel_path = os.path.relpath(f, PROJECT_ROOT)
            print(f"     - {rel_path}")
        print("\n   请使用 --clean-files --no-dry-run 实际执行删除")
        return
    
    deleted_count = 0
    for f in mock_files:
        try:
            os.remove(f)
            deleted_count += 1
            rel_path = os.path.relpath(f, PROJECT_ROOT)
            print(f"   ✅ 删除: {rel_path}")
        except Exception as e:
            print(f"   ❌ 删除失败: {f} - {e}")
    
    print(f"\n📊 共删除 {deleted_count} 个文件")

def clean_db_test_data(dry_run=True):
    """清理数据库中的测试数据"""
    print("🗄️ 清理数据库中的测试数据...")
    print("\n⚠️ 此功能需要数据库连接配置")
    print("   当前仅支持 PostgreSQL 数据库")
    print("   测试数据通过以下标记识别：")
    print("   " + ", ".join(TEST_DATA_MARKERS))
    
    if dry_run:
        print("\n   [DRY RUN] 数据库清理将在实际运行时执行")
        print("   请配置 DATABASE_URL 环境变量")
        return
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("   ❌ 未配置 DATABASE_URL 环境变量")
        return
    
    print(f"\n   连接数据库: {db_url[:40]}...")
    
    try:
        import psycopg2
        from psycopg2 import sql
        
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """)
        
        tables = [row[0] for row in cur.fetchall()]
        
        deleted_rows = 0
        for table in tables:
            for marker in TEST_DATA_MARKERS:
                try:
                    query = sql.SQL("DELETE FROM {} WHERE id::text LIKE %s").format(
                        sql.Identifier(table)
                    )
                    cur.execute(query, (f"%{marker}%",))
                    deleted = cur.rowcount
                    if deleted > 0:
                        deleted_rows += deleted
                        print(f"   ✅ {table}: 删除 {deleted} 行（{marker}）")
                except Exception as e:
                    pass
        
        conn.commit()
        conn.close()
        
        print(f"\n   📊 共删除 {deleted_rows} 行测试数据")
        
    except ImportError:
        print("   ❌ 需要安装 psycopg2: pip install psycopg2-binary")
    except Exception as e:
        print(f"   ❌ 数据库操作失败: {e}")

def main():
    parser = argparse.ArgumentParser(description="Mock 数据清理脚本")
    parser.add_argument('--scan', action='store_true', help='扫描项目中的 mock 数据文件')
    parser.add_argument('--clean-db', action='store_true', help='清理数据库中的测试数据')
    parser.add_argument('--clean-files', action='store_true', help='清理前端 mock 文件')
    parser.add_argument('--dry-run', action='store_true', default=True, help='模拟运行')
    parser.add_argument('--no-dry-run', action='store_false', dest='dry_run', help='实际执行')
    
    args = parser.parse_args()
    
    if not args.scan and not args.clean_db and not args.clean_files:
        args.scan = True
    
    if args.scan:
        scan_mock_files()
    
    if args.clean_files:
        clean_mock_files(dry_run=args.dry_run)
    
    if args.clean_db:
        clean_db_test_data(dry_run=args.dry_run)

if __name__ == '__main__':
    main()
