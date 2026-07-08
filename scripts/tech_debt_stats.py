#!/usr/bin/env python3
import os
import re
import json
from pathlib import Path
from collections import defaultdict


SVC_DIR = Path("/Users/air/TOPEMS/svc")
ROUTES_FILE = SVC_DIR / "routes_extracted.json"
OUTPUT_DIR = Path("/Users/air/TOPEMS/docs/reports")
OUTPUT_FILE = OUTPUT_DIR / "backend-tech-debt.md"


PATTERNS = {
    "unwrap": re.compile(r"\.unwrap\s*\("),
    "expect": re.compile(r"\.expect\s*\("),
    "todo": re.compile(r"todo!\s*[\(!]"),
    "unimplemented": re.compile(r"unimplemented!\s*[\(!]"),
    "println": re.compile(r"println!\s*\("),
    "eprintln": re.compile(r"eprintln!\s*\("),
    "clone": re.compile(r"\.clone\s*\("),
}


def is_test_file(filepath: Path) -> bool:
    name = filepath.name
    if name.endswith("_test.rs"):
        return True
    parts = filepath.parts
    if "tests" in parts:
        return True
    if "test" in parts:
        return True
    return False


def should_exclude(filepath: Path, svc_root: Path) -> bool:
    rel = filepath.relative_to(svc_root)
    parts = rel.parts
    if "target" in parts:
        return True
    if is_test_file(rel):
        return True
    return False


def count_patterns_in_file(filepath: Path) -> dict:
    counts = {k: 0 for k in PATTERNS}
    lines = 0
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                lines += 1
                for name, pattern in PATTERNS.items():
                    if pattern.search(line):
                        counts[name] += 1
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    counts["lines"] = lines
    return counts


def get_services() -> list:
    services = []
    for item in SVC_DIR.iterdir():
        if item.is_dir():
            cargo_toml = item / "Cargo.toml"
            if cargo_toml.exists():
                services.append(item.name)
    return sorted(services)


def load_routes_data() -> dict:
    if not ROUTES_FILE.exists():
        return {}
    with open(ROUTES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def count_api_handlers(routes_data: dict, service_name: str) -> int:
    if service_name not in routes_data:
        return 0
    routes = routes_data[service_name].get("routes", [])
    total = 0
    for route in routes:
        methods = route.get("methods", [])
        total += len(methods)
    return total


def analyze_service(service_name: str, routes_data: dict) -> dict:
    svc_dir = SVC_DIR / service_name
    stats = {
        "service": service_name,
        "unwrap": 0,
        "expect": 0,
        "todo": 0,
        "unimplemented": 0,
        "println": 0,
        "eprintln": 0,
        "clone": 0,
        "lines": 0,
        "files": 0,
        "api_handlers": count_api_handlers(routes_data, service_name),
    }

    for root, dirs, files in os.walk(svc_dir):
        dirs[:] = [d for d in dirs if d != "target"]
        for filename in files:
            if not filename.endswith(".rs"):
                continue
            filepath = Path(root) / filename
            if should_exclude(filepath, svc_dir):
                continue
            stats["files"] += 1
            file_counts = count_patterns_in_file(filepath)
            for k in PATTERNS.keys():
                stats[k] += file_counts[k]
            stats["lines"] += file_counts["lines"]

    return stats


def compute_debt_score(stats: dict) -> float:
    score = (
        stats["unwrap"] * 3
        + stats["expect"] * 2
        + stats["todo"] * 5
        + stats["unimplemented"] * 5
        + stats["println"] * 1
        + stats["eprintln"] * 1
    )
    if stats["lines"] > 0:
        score_per_1000 = (score / stats["lines"]) * 1000
    else:
        score_per_1000 = 0
    return score_per_1000


def generate_markdown(all_stats: list, routes_data: dict) -> str:
    total_unwrap = sum(s["unwrap"] for s in all_stats)
    total_expect = sum(s["expect"] for s in all_stats)
    total_todo = sum(s["todo"] for s in all_stats)
    total_unimplemented = sum(s["unimplemented"] for s in all_stats)
    total_println = sum(s["println"] for s in all_stats)
    total_eprintln = sum(s["eprintln"] for s in all_stats)
    total_clone = sum(s["clone"] for s in all_stats)
    total_lines = sum(s["lines"] for s in all_stats)
    total_files = sum(s["files"] for s in all_stats)
    total_handlers = sum(s["api_handlers"] for s in all_stats)

    sorted_by_debt = sorted(all_stats, key=compute_debt_score, reverse=True)
    sorted_by_lines = sorted(all_stats, key=lambda s: s["lines"], reverse=True)

    md = []
    md.append("# 后端 Rust 服务技术债务统计报告\n")
    md.append(f"**生成时间**: 2026-07-05\n")
    md.append(f"**统计范围**: `svc/` 目录下所有 Rust 服务（排除 `target/`、`tests/`、`*_test.rs`）\n")

    md.append("\n## 总体概览\n")
    md.append("| 指标 | 数量 |")
    md.append("|------|------|")
    md.append(f"| 服务数量 | {len(all_stats)} |")
    md.append(f"| 代码总行数 | {total_lines:,} |")
    md.append(f"| .rs 文件数 | {total_files} |")
    md.append(f"| API Handler 总数 | {total_handlers} |")
    md.append(f"| `unwrap()` 总数 | {total_unwrap} |")
    md.append(f"| `expect()` 总数 | {total_expect} |")
    md.append(f"| `todo!()` 总数 | {total_todo} |")
    md.append(f"| `unimplemented!()` 总数 | {total_unimplemented} |")
    md.append(f"| `println!` 总数 | {total_println} |")
    md.append(f"| `eprintln!` 总数 | {total_eprintln} |")
    md.append(f"| `.clone()` 总数 | {total_clone} |")

    md.append("\n## 技术债务最严重的服务 Top 10\n")
    md.append("按每千行债务评分排序（权重：unwrap×3, expect×2, todo×5, unimplemented×5, println×1, eprintln×1）\n")
    md.append("| 排名 | 服务 | 债务评分/千行 | unwrap | expect | todo | unimplemented | println/eprintln | 代码行数 |")
    md.append("|------|------|--------------|--------|--------|------|---------------|-----------------|----------|")
    for i, s in enumerate(sorted_by_debt[:10], 1):
        score = compute_debt_score(s)
        print_total = s["println"] + s["eprintln"]
        md.append(f"| {i} | **{s['service']}** | {score:.2f} | {s['unwrap']} | {s['expect']} | {s['todo']} | {s['unimplemented']} | {print_total} | {s['lines']:,} |")

    md.append("\n## 各服务代码行数排名\n")
    md.append("| 排名 | 服务 | 代码行数 | 文件数 | API Handler |")
    md.append("|------|------|----------|--------|-------------|")
    for i, s in enumerate(sorted_by_lines, 1):
        md.append(f"| {i} | **{s['service']}** | {s['lines']:,} | {s['files']} | {s['api_handlers']} |")

    md.append("\n## 各服务详细技术债务统计\n")
    md.append("| 服务 | 代码行数 | 文件数 | API Handler | unwrap() | expect() | todo!() | unimplemented!() | println! | eprintln! | .clone() |")
    md.append("|------|----------|--------|-------------|----------|----------|---------|-----------------|----------|-----------|----------|")
    for s in sorted_by_lines:
        md.append(f"| {s['service']} | {s['lines']:,} | {s['files']} | {s['api_handlers']} | {s['unwrap']} | {s['expect']} | {s['todo']} | {s['unimplemented']} | {s['println']} | {s['eprintln']} | {s['clone']} |")

    md.append("\n## 指标说明\n")
    md.append("- **unwrap()**: 直接调用 `unwrap()`，可能导致 panic，应使用 proper error handling")
    md.append("- **expect()**: 类似 unwrap，但带有自定义错误信息，同样可能导致 panic")
    md.append("- **todo!()**: 待实现的标记，说明功能尚未完成")
    md.append("- **unimplemented!()**: 未实现的标记，说明功能尚未完成")
    md.append("- **println! / eprintln!**: 直接打印到标准输出/错误，生产环境应使用 tracing/log 框架")
    md.append("- **.clone()**: 克隆调用，过多的 clone 可能暗示性能问题或所有权设计不佳")
    md.append("- **债务评分**: 综合衡量技术债务密度，每千行代码的加权问题数\n")

    return "\n".join(md)


def main():
    print("加载路由数据...")
    routes_data = load_routes_data()
    print(f"已加载 {len(routes_data)} 个服务的路由数据")

    services = get_services()
    print(f"发现 {len(services)} 个 Rust 服务")

    all_stats = []
    for svc in services:
        print(f"分析服务: {svc}...")
        stats = analyze_service(svc, routes_data)
        all_stats.append(stats)
        print(f"  -> {stats['lines']:,} 行, {stats['unwrap']} unwrap, {stats['expect']} expect, {stats['clone']} clone")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    markdown = generate_markdown(all_stats, routes_data)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(markdown)

    print(f"\n报告已生成: {OUTPUT_FILE}")

    total_unwrap = sum(s["unwrap"] for s in all_stats)
    total_expect = sum(s["expect"] for s in all_stats)
    print(f"\n=== 统计摘要 ===")
    print(f"总 unwrap 数: {total_unwrap}")
    print(f"总 expect 数: {total_expect}")
    print(f"总 todo/unimplemented: {sum(s['todo'] + s['unimplemented'] for s in all_stats)}")
    print(f"总 println/eprintln: {sum(s['println'] + s['eprintln'] for s in all_stats)}")
    print(f"总 clone 数: {sum(s['clone'] for s in all_stats)}")
    print(f"总代码行数: {sum(s['lines'] for s in all_stats):,}")

    sorted_by_debt = sorted(all_stats, key=compute_debt_score, reverse=True)
    print(f"\n问题最严重的前 10 个服务:")
    for i, s in enumerate(sorted_by_debt[:10], 1):
        score = compute_debt_score(s)
        print(f"  {i}. {s['service']} - 债务评分: {score:.2f}/千行 (unwrap: {s['unwrap']}, expect: {s['expect']}, lines: {s['lines']:,})")


if __name__ == "__main__":
    main()
