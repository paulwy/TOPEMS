#!/usr/bin/env python3
"""
TOPEMS 路径校验脚本

功能：
  1. 死链检测：扫描组件中的路径引用，验证是否存在于路由配置中
  2. 硬编码检测：扫描组件中是否存在硬编码路径（未引用路径常量）
  3. 命名规范检测：验证路径是否符合命名规范
  4. 路径常量覆盖率：统计路径常量引用率

用法：
  python scripts/check-route-paths.py              # 死链检测（默认）
  python scripts/check-route-paths.py --hardcoded   # 硬编码检测
  python scripts/check-route-paths.py --naming      # 命名规范检测
  python scripts/check-route-paths.py --coverage    # 路径常量覆盖率
  python scripts/check-route-paths.py --ci          # CI 模式（全部检测，有错误则退出码 1）

关联文档：
  - docs/superpowers/specs/2026-07-11-path-refactor-implementation-plan.md
"""

import os
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict

# 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEB_SRC = PROJECT_ROOT / "apps" / "web" / "src"

# 已迁移的模块列表（config.ts 中导出 {MODULE}_PATHS）
MIGRATED_MODULES = {
    "hrm": "HRM_PATHS",
}

# 所有模块列表
ALL_MODULES = [
    "iam", "admin", "workflow", "notification", "doc", "report", "monitor",
    "integration", "ai", "mobile", "hrm", "finance", "crm", "mes", "qms",
    "lims", "ehs", "scm", "erp", "wms", "pm", "pdm", "srm", "oa", "lowcode",
    "rs", "asset", "plugin", "im", "bi", "gis",
]

# 路径命名规范正则
NAMING_PATTERNS = {
    "root": re.compile(r"^/[a-z][-a-z]*$"),
    "dashboard": re.compile(r"^/[a-z][-a-z]*/dashboard$"),
    "overview": re.compile(r"^/[a-z][-a-z]*/overview$"),
    "list": re.compile(r"^/[a-z][-a-z]*/[a-z][-a-z]*s$"),  # 复数
    "detail": re.compile(r"^/[a-z][-a-z]*/[a-z][-a-z]*s/:id$"),
    "create": re.compile(r"^/[a-z][-a-z]*/[a-z][-a-z]*s/create$"),
    "edit": re.compile(r"^/[a-z][-a-z]*/[a-z][-a-z]*s/:id/edit$"),
    "settings": re.compile(r"^/[a-z][-a-z]*/settings$"),
    "reports": re.compile(r"^/[a-z][-a-z]*/reports$"),
}

# 硬编码路径正则（匹配组件中的路径字符串）
HARDCODED_PATH_PATTERNS = [
    # navigate('/xxx/yyy')
    re.compile(r"navigate\(\s*['\"`]/[a-z]"),
    # to="/xxx/yyy"
    re.compile(r"to=['\"](/[a-z][^'\"]*)['\"]"),
    # href="/xxx/yyy"
    re.compile(r"href=['\"](/[a-z][^'\"]*)['\"]"),
    # backHref="/xxx/yyy"
    re.compile(r"backHref=['\"](/[a-z][^'\"]*)['\"]"),
    # navigate(`/xxx/${id}`)
    re.compile(r"navigate\(\s*`/[a-z]"),
]

# 跳过的目录
SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", ".cache", "coverage",
    "__tests__", "__mocks__", ".vite",
}

# 跳过的文件
SKIP_FILES = {
    "compatibility.tsx",  # 兼容层，迁移完成后删除
}


def collect_routes():
    """从路由配置文件中收集所有有效路径"""
    routes = set()

    # 从 routes/v2/*.ts 收集
    routes_v2_dir = WEB_SRC / "routes" / "v2"
    for ts_file in routes_v2_dir.glob("*.ts"):
        if ts_file.name in ("index.ts", "dynamic.ts", "lazyLoader.ts", "types.ts"):
            continue
        content = ts_file.read_text(encoding="utf-8")
        # 匹配 path: '/xxx/yyy'
        for match in re.finditer(r"path:\s*['\"`]([^'\"`]+)['\"`]", content):
            path = match.group(1)
            if path.startswith("/"):
                routes.add(path)

    # 从 modules/*/config.ts 收集
    modules_dir = WEB_SRC / "modules"
    if modules_dir.exists():
        for config_file in modules_dir.glob("*/config.ts"):
            content = config_file.read_text(encoding="utf-8")
            # 匹配 PATHS 常量中的路径
            for match in re.finditer(r":\s*['\"`]([^'\"`]+)['\"`]", content):
                path = match.group(1)
                if path.startswith("/") and ":id" not in path:
                    routes.add(path)
                elif path.startswith("/") and ":id" in path:
                    # 动态路径，转换为正则模式
                    routes.add(path)
            # 匹配 path: '/xxx/yyy'
            for match in re.finditer(r"path:\s*['\"`]([^'\"`]+)['\"`]", content):
                path = match.group(1)
                if path.startswith("/"):
                    routes.add(path)

    return routes


def collect_nav_paths():
    """从导航配置文件中收集所有导航路径"""
    nav_paths = set()

    # 从 lib/navigation/modules/*.nav.ts 收集
    nav_dir = WEB_SRC / "lib" / "navigation" / "modules"
    for nav_file in nav_dir.glob("*.nav.ts"):
        content = nav_file.read_text(encoding="utf-8")
        for match in re.finditer(r"path:\s*['\"`]([^'\"`]+)['\"`]", content):
            path = match.group(1)
            if path.startswith("/"):
                nav_paths.add(path)

    # 从 modules/*/config.ts 收集 navItems 中的 path
    modules_dir = WEB_SRC / "modules"
    if modules_dir.exists():
        for config_file in modules_dir.glob("*/config.ts"):
            content = config_file.read_text(encoding="utf-8")
            for match in re.finditer(r"path:\s*['\"`]([^'\"`]+)['\"`]", content):
                path = match.group(1)
                if path.startswith("/"):
                    nav_paths.add(path)

    return nav_paths


def find_tsx_files():
    """查找所有 .tsx 和 .ts 文件（排除测试和配置文件）"""
    files = []
    for root, dirs, filenames in os.walk(WEB_SRC):
        # 跳过排除目录
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in filenames:
            if filename in SKIP_FILES:
                continue
            if filename.endswith((".tsx", ".ts")) and not filename.endswith((".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx")):
                # 排除 routes/v2/*.ts（路由定义文件）和 modules/*/config.ts（配置文件）
                filepath = Path(root) / filename
                rel_path = filepath.relative_to(WEB_SRC)
                if str(rel_path).startswith("routes/v2/") and rel_path.name not in ("index.ts", "dynamic.ts", "lazyLoader.ts"):
                    continue
                if str(rel_path).startswith("modules/") and rel_path.name == "config.ts":
                    continue
                if str(rel_path).startswith("lib/navigation/modules/"):
                    continue
                files.append(filepath)
    return files


def check_dead_links(valid_routes):
    """死链检测：扫描组件中的路径引用，验证是否存在于路由配置中"""
    errors = []
    warnings = []
    tsx_files = find_tsx_files()

    # 将动态路径（含 :id）转为正则
    route_patterns = []
    static_routes = set()
    for route in valid_routes:
        if ":id" in route:
            pattern = re.compile("^" + re.escape(route).replace("\\:id", "[^/]+") + "$")
            route_patterns.append((route, pattern))
        else:
            static_routes.add(route)

    for filepath in tsx_files:
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception:
            continue

        rel_path = filepath.relative_to(PROJECT_ROOT)

        # 检查 to="/xxx", href="/xxx", navigate('/xxx'), backHref="/xxx"
        path_patterns = [
            (re.compile(r"to=['\"]([^'\"]+)['\"]"), "to"),
            (re.compile(r"href=['\"]([^'\"]+)['\"]"), "href"),
            (re.compile(r"backHref=['\"]([^'\"]+)['\"]"), "backHref"),
            (re.compile(r"navigate\(\s*['\"`]([^'\"`]+)['\"`]"), "navigate"),
        ]

        for pattern, prop in path_patterns:
            for match in pattern.finditer(content):
                path = match.group(1)
                # 跳过非路由路径
                if not path.startswith("/"):
                    continue
                # 跳过 API 路径
                if path.startswith("/api/"):
                    continue
                # 跳过锚点和特殊路径
                if path in ("#", "/", "/login", "/logout", "/404", "/403", "/500"):
                    continue
                # 跳过 mailto:, tel:
                if path.startswith(("mailto:", "tel:")):
                    continue

                # 替换动态参数为 :id 格式进行匹配
                check_path = re.sub(r"/[a-f0-9-]{8,}", "/:id", path)
                check_path = re.sub(r"/\d+", "/:id", check_path)

                # 检查路径是否有效
                is_valid = check_path in static_routes
                if not is_valid:
                    for route, pattern in route_patterns:
                        if pattern.match(check_path):
                            is_valid = True
                            break

                if not is_valid:
                    # 获取行号
                    line_num = content[:match.start()].count("\n") + 1
                    errors.append(f"{rel_path}:{line_num} [{prop}] 无效路径: {path}")

    return errors, warnings


def check_hardcoded_paths():
    """硬编码检测：扫描组件中是否存在硬编码路径（未引用路径常量）"""
    errors = []
    tsx_files = find_tsx_files()

    # 已迁移模块的路径常量
    migrated_constants = set(MIGRATED_MODULES.values())

    for filepath in tsx_files:
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception:
            continue

        rel_path = filepath.relative_to(PROJECT_ROOT)

        # 检查是否引用了路径常量
        has_path_import = any(
            f"{{{const_name}}}" in content
            for const_name in migrated_constants
        )

        # 对于已迁移模块的页面，检查硬编码路径
        for module_code, const_name in MIGRATED_MODULES.items():
            # 只检查已迁移模块的页面文件
            if f"/pages/{module_code}/" not in str(rel_path):
                continue

            for pattern in HARDCODED_PATH_PATTERNS:
                for match in pattern.finditer(content):
                    path_str = match.group(0)
                    # 跳过 API 路径
                    if "/api/" in path_str:
                        continue
                    # 跳过 # 和特殊路径
                    if "#" in path_str and "/#" not in path_str:
                        continue
                    line_num = content[:match.start()].count("\n") + 1
                    errors.append(
                        f"{rel_path}:{line_num} 硬编码路径: {path_str.strip()} "
                        f"(应引用 {const_name})"
                    )

    return errors


def check_naming_conventions(valid_routes):
    """命名规范检测：验证路径是否符合命名规范"""
    errors = []
    module_paths = defaultdict(list)

    # 按模块分组
    for route in valid_routes:
        if ":id" in route:
            continue
        parts = route.strip("/").split("/")
        if len(parts) >= 1:
            module_paths[parts[0]].append(route)

    for module, paths in module_paths.items():
        for path in paths:
            # 检查是否全小写
            if path != path.lower() and not any(c.isupper() for c in path.split("/")[-1]):
                # 允许 :id
                continue

            # 检查驼峰命名（应该用连字符）
            segments = path.strip("/").split("/")
            for seg in segments:
                if seg == ":id" or seg == "create" or seg == "edit":
                    continue
                if any(c.isupper() for c in seg):
                    errors.append(f"路径 {path} 包含大写字母，应使用连字符: {seg}")

    return errors


def check_coverage():
    """路径常量覆盖率统计"""
    stats = {}
    tsx_files = find_tsx_files()

    for module_code, const_name in MIGRATED_MODULES.items():
        total_refs = 0
        constant_refs = 0
        hardcoded_refs = 0

        for filepath in tsx_files:
            if f"/pages/{module_code}/" not in str(filepath):
                continue
            try:
                content = filepath.read_text(encoding="utf-8")
            except Exception:
                continue

            # 统计路径引用总数
            for pattern in HARDCODED_PATH_PATTERNS:
                matches = pattern.findall(content)
                for m in matches:
                    if "/api/" in m:
                        continue
                    total_refs += 1
                    if const_name in content:
                        # 文件中有常量引用，但这个具体引用可能是硬编码
                        hardcoded_refs += 1
                    else:
                        hardcoded_refs += 1

            # 统计常量引用数
            constant_refs += content.count(const_name + ".")

        coverage = (constant_refs / total_refs * 100) if total_refs > 0 else 100
        stats[module_code] = {
            "total": total_refs,
            "constant": constant_refs,
            "hardcoded": hardcoded_refs,
            "coverage": coverage,
        }

    return stats


def main():
    parser = argparse.ArgumentParser(description="TOPEMS 路径校验脚本")
    parser.add_argument("--hardcoded", action="store_true", help="硬编码检测")
    parser.add_argument("--naming", action="store_true", help="命名规范检测")
    parser.add_argument("--coverage", action="store_true", help="路径常量覆盖率")
    parser.add_argument("--ci", action="store_true", help="CI 模式（全部检测）")
    args = parser.parse_args()

    # 如果没有指定参数，默认执行死链检测
    run_all = args.ci
    run_dead_links = run_all or (not args.hardcoded and not args.naming and not args.coverage)
    run_hardcoded = run_all or args.hardcoded
    run_naming = run_all or args.naming
    run_coverage = run_all or args.coverage

    exit_code = 0

    if run_dead_links:
        print("=" * 60)
        print("死链检测")
        print("=" * 60)
        valid_routes = collect_routes()
        nav_paths = collect_nav_paths()
        all_valid = valid_routes | nav_paths
        print(f"已收集 {len(valid_routes)} 个路由路径, {len(nav_paths)} 个导航路径")
        errors, warnings = check_dead_links(all_valid)
        if errors:
            print(f"\n❌ 发现 {len(errors)} 个死链:")
            for err in errors:
                print(f"  {err}")
            exit_code = 1
        else:
            print("\n✅ 死链检测通过，0 个死链")

    if run_hardcoded:
        print("\n" + "=" * 60)
        print("硬编码路径检测")
        print("=" * 60)
        errors = check_hardcoded_paths()
        if errors:
            print(f"\n❌ 发现 {len(errors)} 处硬编码路径:")
            for err in errors:
                print(f"  {err}")
            exit_code = 1
        else:
            print("\n✅ 硬编码检测通过，0 处硬编码路径")

    if run_naming:
        print("\n" + "=" * 60)
        print("命名规范检测")
        print("=" * 60)
        valid_routes = collect_routes()
        errors = check_naming_conventions(valid_routes)
        if errors:
            print(f"\n❌ 发现 {len(errors)} 个命名不规范:")
            for err in errors:
                print(f"  {err}")
            exit_code = 1
        else:
            print("\n✅ 命名规范检测通过")

    if run_coverage:
        print("\n" + "=" * 60)
        print("路径常量覆盖率")
        print("=" * 60)
        stats = check_coverage()
        if not stats:
            print("\n⚠️  暂无已迁移模块可统计")
        for module, data in stats.items():
            print(f"\n  模块 {module}:")
            print(f"    总路径引用: {data['total']}")
            print(f"    常量引用: {data['constant']}")
            print(f"    硬编码引用: {data['hardcoded']}")
            print(f"    覆盖率: {data['coverage']:.1f}%")
            if data["coverage"] < 100:
                exit_code = 1

    print("\n" + "=" * 60)
    if exit_code == 0:
        print("✅ 全部检测通过")
    else:
        print("❌ 存在检测失败项")
    print("=" * 60)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
