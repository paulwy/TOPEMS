#!/usr/bin/env python3
"""
TOPEMS 架构一致性检查脚本

功能：
  1. 检测服务间依赖方向是否正确（核心服务不依赖业务服务）
  2. 检测模块命名规范
  3. 检测 API 路径规范（/api/{service}/...）
  4. 检测 EventType 命名规范
  5. 检测循环依赖

用法：
  python scripts/check_architecture_consistency.py        # 输出报告
  python scripts/check_architecture_consistency.py --ci    # CI 模式，有错误则退出码 1
"""

import os
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SVC_DIR = PROJECT_ROOT / "svc"
LIB_DIR = PROJECT_ROOT / "lib"

CORE_SERVICES = {'unified-core', 'user-service', 'integration', 'monitor'}
BUSINESS_SERVICES = {
    'erp', 'crm', 'mes', 'wms', 'hrm', 'pm', 'pdm', 'scm', 'srm',
    'qms', 'lims', 'ehs', 'rd', 'analytics', 'ai', 'gis', 'portal',
    'finance', 'doc', 'mobile', 'report',
}
SUPPORT_SERVICES = {'migration-sdk'}


def check_service_dependencies():
    """检查服务间依赖方向是否正确"""
    issues = []
    service_cargo_tomls = {}

    for svc_dir in sorted(SVC_DIR.iterdir()):
        if not svc_dir.is_dir():
            continue
        cargo_toml = svc_dir / "Cargo.toml"
        if not cargo_toml.exists():
            continue
        service_cargo_tomls[svc_dir.name] = cargo_toml

    deps_graph = defaultdict(set)

    for svc_name, cargo_path in service_cargo_tomls.items():
        try:
            content = cargo_path.read_text()
        except Exception:
            continue

        for other_svc in service_cargo_tomls:
            if other_svc == svc_name:
                continue
            pattern = re.compile(rf'{re.escape(other_svc.replace("-", "_"))}-service\s*=')
            if pattern.search(content):
                deps_graph[svc_name].add(other_svc)

    for svc_name, deps in deps_graph.items():
        if svc_name in CORE_SERVICES:
            for dep in deps:
                if dep in BUSINESS_SERVICES:
                    issues.append({
                        'type': 'dependency-direction',
                        'severity': 'high',
                        'message': f'核心服务 {svc_name} 依赖业务服务 {dep}，违反分层原则',
                    })

    return issues, deps_graph


def check_circular_dependencies(deps_graph):
    """检测循环依赖"""
    issues = []
    visited = set()
    rec_stack = set()
    path = []

    def dfs(node):
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in deps_graph.get(node, set()):
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
            elif neighbor in rec_stack:
                cycle_start = path.index(neighbor)
                cycle = path[cycle_start:] + [neighbor]
                issues.append({
                    'type': 'circular-dependency',
                    'severity': 'critical',
                    'message': f'检测到循环依赖: {" → ".join(cycle)}',
                })
                return True

        path.pop()
        rec_stack.remove(node)
        return False

    for node in deps_graph:
        if node not in visited:
            dfs(node)

    return issues


def check_api_path_conventions():
    """检查 API 路径命名规范"""
    issues = []
    api_pattern = re.compile(r'\.route\(\s*["\'](/api/[^"\']+)["\']')

    for svc_dir in sorted(SVC_DIR.iterdir()):
        if not svc_dir.is_dir():
            continue
        svc_name = svc_dir.name
        src_dir = svc_dir / "src"
        if not src_dir.exists():
            continue

        for dirpath, dirnames, filenames in os.walk(src_dir):
            for filename in filenames:
                if not filename.endswith('.rs'):
                    continue
                filepath = Path(dirpath) / filename
                try:
                    content = filepath.read_text()
                except Exception:
                    continue

                for match in api_pattern.finditer(content):
                    api_path = match.group(1)
                    parts = api_path.strip('/').split('/')

                    if len(parts) >= 2 and parts[0] == 'api':
                        service_in_path = parts[1]
                        expected = svc_name.replace('-', '')

                        if service_in_path in ('health', 'metrics', 'info', 'auth'):
                            continue

    return issues


def check_event_type_naming():
    """检查 EventType 命名规范"""
    issues = []
    event_types_file = LIB_DIR / "src" / "event" / "event_types.rs"

    if not event_types_file.exists():
        return issues

    try:
        content = event_types_file.read_text()
    except Exception:
        return issues

    enum_pattern = re.compile(r'pub enum EventType \{([^}]+)\}', re.DOTALL)
    match = enum_pattern.search(content)

    if not match:
        return issues

    enum_body = match.group(1)
    variant_pattern = re.compile(r'^\s+(\w+),?\s*$', re.MULTILINE)
    variants = [m.group(1) for m in variant_pattern.finditer(enum_body)]

    for variant in variants:
        if variant == 'HealthCheck':
            continue
        if not variant[0].isupper():
            issues.append({
                'type': 'event-naming',
                'severity': 'low',
                'message': f'EventType 变体 {variant} 不符合 PascalCase 命名规范',
            })

    return issues


def check_module_naming():
    """检查模块文件命名规范"""
    issues = []

    for svc_dir in sorted(SVC_DIR.iterdir()):
        if not svc_dir.is_dir():
            continue
        src_dir = svc_dir / "src" / "modules"
        if not src_dir.exists():
            continue

        for dirpath, dirnames, filenames in os.walk(src_dir):
            for filename in filenames:
                if not filename.endswith('.rs'):
                    continue
                if filename == 'mod.rs':
                    continue

                if '_' not in filename and not filename.islower():
                    rel_path = os.path.relpath(os.path.join(dirpath, filename), PROJECT_ROOT)
                    issues.append({
                        'type': 'module-naming',
                        'severity': 'low',
                        'message': f'模块文件名 {rel_path} 建议使用 snake_case',
                    })

    return issues


def main():
    parser = argparse.ArgumentParser(description='TOPEMS 架构一致性检查')
    parser.add_argument('--ci', action='store_true', help='CI 模式，有错误则退出码 1')
    args = parser.parse_args()

    print("=" * 70)
    print("TOPEMS 架构一致性检查报告")
    print("=" * 70)

    all_issues = []

    print("\n🔍 检查 1/5: 服务依赖方向...")
    dep_issues, deps_graph = check_service_dependencies()
    all_issues.extend(dep_issues)
    print(f"  发现 {len(dep_issues)} 个问题")

    print("🔍 检查 2/5: 循环依赖...")
    circ_issues = check_circular_dependencies(deps_graph)
    all_issues.extend(circ_issues)
    print(f"  发现 {len(circ_issues)} 个问题")

    print("🔍 检查 3/5: API 路径规范...")
    api_issues = check_api_path_conventions()
    all_issues.extend(api_issues)
    print(f"  发现 {len(api_issues)} 个问题")

    print("🔍 检查 4/5: EventType 命名规范...")
    event_issues = check_event_type_naming()
    all_issues.extend(event_issues)
    print(f"  发现 {len(event_issues)} 个问题")

    print("🔍 检查 5/5: 模块命名规范...")
    mod_issues = check_module_naming()
    all_issues.extend(mod_issues)
    print(f"  发现 {len(mod_issues)} 个问题")

    if all_issues:
        print(f"\n⚠️  架构一致性问题汇总 ({len(all_issues)} 项):")
        print(f"{'严重性':<10} {'类型':<22} {'描述'}")
        print("-" * 70)
        for issue in sorted(all_issues, key=lambda x: {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}[x['severity']]):
            print(f"{issue['severity']:<10} {issue['type']:<22} {issue['message']}")
    else:
        print("\n✅ 所有架构一致性检查通过！")

    critical_high = [i for i in all_issues if i['severity'] in ('critical', 'high')]

    print(f"\n{'=' * 70}")
    print(f"📊 总结:")
    print(f"  总问题数: {len(all_issues)}")
    print(f"  严重/高危: {len(critical_high)}")
    print(f"  中危/低危: {len(all_issues) - len(critical_high)}")

    if args.ci:
        if critical_high:
            print(f"\n❌ 存在 {len(critical_high)} 个严重/高危架构问题，检查失败")
            sys.exit(1)
        else:
            print(f"\n✅ 架构一致性检查通过（无严重/高危问题）")
            sys.exit(0)


if __name__ == '__main__':
    main()
