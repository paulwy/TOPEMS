#!/usr/bin/env python3
import os
import re
import json
from collections import defaultdict
from pathlib import Path

SRC_DIR = "/Users/air/TOPEMS/apps/web/src"
OUTPUT_FILE = "/Users/air/TOPEMS/docs/reports/frontend-tech-debt.md"

EXCLUDE_DIRS = {"node_modules", "dist", "build", "__tests__"}
EXCLUDE_PATTERNS = [r".*\.test\..*", r".*\.spec\..*"]
THEME_FILES = {
    "colors.ts",
    "theme.ts",
    "chartTheme.ts",
    "moduleThemes.ts",
    "DesignTokens.tsx",
    "design-tokens-guide.md",
}

EXTENSIONS = {".ts", ".tsx"}


def should_exclude(file_path: str) -> bool:
    parts = Path(file_path).parts
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
    filename = os.path.basename(file_path)
    for pattern in EXCLUDE_PATTERNS:
        if re.match(pattern, filename):
            return True
    return False


def is_theme_file(file_path: str) -> bool:
    rel_path = os.path.relpath(file_path, SRC_DIR)
    parts = Path(rel_path).parts
    if "theme" in [p.lower() for p in parts]:
        return True
    filename = os.path.basename(file_path)
    if filename in THEME_FILES:
        return True
    if "theme" in filename.lower() or "color" in filename.lower():
        return True
    return False


def count_lines(file_path: str) -> int:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def count_functions(content: str) -> int:
    patterns = [
        r"\bfunction\s+\w+\s*\(",
        r"\bconst\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>",
        r"\bconst\s+\w+\s*=\s*(?:async\s+)?\w+\s*=>",
        r"\blet\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>",
        r"\bvar\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>",
        r"\bexport\s+(?:default\s+)?function\s+\w+\s*\(",
        r"\bexport\s+(?:default\s+)?const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>",
        r"(?:public|private|protected)\s+\w+\s*\([^)]*\)\s*\{",
        r"(?:public|private|protected)\s+async\s+\w+\s*\([^)]*\)\s*\{",
    ]
    count = 0
    for pattern in patterns:
        count += len(re.findall(pattern, content))
    return count


def count_any_types(content: str) -> int:
    count = 0
    count += len(re.findall(r":\s*any\b", content))
    count += len(re.findall(r"\bas\s+any\b", content))
    return count


def count_ts_ignore(content: str) -> int:
    count = 0
    count += len(re.findall(r"@ts-ignore", content))
    count += len(re.findall(r"@ts-nocheck", content))
    return count


def count_console(content: str) -> dict:
    return {
        "log": len(re.findall(r"console\.log\s*\(", content)),
        "error": len(re.findall(r"console\.error\s*\(", content)),
        "warn": len(re.findall(r"console\.warn\s*\(", content)),
    }


def count_eslint_disable(content: str) -> int:
    return len(re.findall(r"eslint-disable", content))


def count_todo_comments(content: str) -> dict:
    return {
        "TODO": len(re.findall(r"//\s*TODO\b", content)),
        "FIXME": len(re.findall(r"//\s*FIXME\b", content)),
        "HACK": len(re.findall(r"//\s*HACK\b", content)),
    }


def count_hardcoded_colors(content: str) -> int:
    pattern = r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b"
    return len(re.findall(pattern, content))


def get_subdir(file_path: str, src_dir: str) -> str:
    rel = os.path.relpath(file_path, src_dir)
    parts = rel.split(os.sep)
    if len(parts) > 1:
        return parts[0]
    return "(root)"


def main():
    stats = {
        "total_files": 0,
        "total_lines": 0,
        "total_functions": 0,
        "total_any": 0,
        "total_ts_ignore": 0,
        "total_console_log": 0,
        "total_console_error": 0,
        "total_console_warn": 0,
        "total_eslint_disable": 0,
        "total_todo": 0,
        "total_fixme": 0,
        "total_hack": 0,
        "total_hardcoded_colors": 0,
        "subdirs": defaultdict(lambda: {"files": 0, "lines": 0, "functions": 0}),
        "file_stats": [],
    }

    for root, dirs, files in os.walk(SRC_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            file_path = os.path.join(root, file)
            if should_exclude(file_path):
                continue
            ext = os.path.splitext(file)[1]
            if ext not in EXTENSIONS:
                continue

            stats["total_files"] += 1

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except Exception:
                continue

            lines = content.count("\n") + 1 if content else 0
            stats["total_lines"] += lines

            functions = count_functions(content)
            stats["total_functions"] += functions

            any_count = count_any_types(content)
            stats["total_any"] += any_count

            ts_ignore = count_ts_ignore(content)
            stats["total_ts_ignore"] += ts_ignore

            console = count_console(content)
            stats["total_console_log"] += console["log"]
            stats["total_console_error"] += console["error"]
            stats["total_console_warn"] += console["warn"]

            eslint = count_eslint_disable(content)
            stats["total_eslint_disable"] += eslint

            todos = count_todo_comments(content)
            stats["total_todo"] += todos["TODO"]
            stats["total_fixme"] += todos["FIXME"]
            stats["total_hack"] += todos["HACK"]

            if not is_theme_file(file_path):
                colors = count_hardcoded_colors(content)
                stats["total_hardcoded_colors"] += colors
            else:
                colors = 0

            subdir = get_subdir(file_path, SRC_DIR)
            stats["subdirs"][subdir]["files"] += 1
            stats["subdirs"][subdir]["lines"] += lines
            stats["subdirs"][subdir]["functions"] += functions

            debt_score = (
                any_count * 3
                + ts_ignore * 5
                + console["log"] * 2
                + console["error"] * 1
                + console["warn"] * 1
                + eslint * 2
                + todos["TODO"] * 2
                + todos["FIXME"] * 3
                + todos["HACK"] * 4
                + colors * 1
            )

            stats["file_stats"].append(
                {
                    "path": file_path,
                    "rel_path": os.path.relpath(file_path, SRC_DIR),
                    "lines": lines,
                    "functions": functions,
                    "any": any_count,
                    "ts_ignore": ts_ignore,
                    "console_log": console["log"],
                    "console_error": console["error"],
                    "console_warn": console["warn"],
                    "eslint_disable": eslint,
                    "todo": todos["TODO"],
                    "fixme": todos["FIXME"],
                    "hack": todos["HACK"],
                    "hardcoded_colors": colors,
                    "debt_score": debt_score,
                }
            )

    stats["file_stats"].sort(key=lambda x: x["debt_score"], reverse=True)
    top_10 = stats["file_stats"][:10]

    sorted_subdirs = sorted(
        stats["subdirs"].items(), key=lambda x: x[1]["lines"], reverse=True
    )

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("# 前端技术债务统计报告\n\n")
        f.write(f"**统计目录**: `{SRC_DIR}`\n\n")
        f.write(f"**统计日期**: 2026-07-05\n\n")
        f.write("---\n\n")

        f.write("## 一、总体概览\n\n")
        f.write("| 指标 | 数量 |\n")
        f.write("|------|------|\n")
        f.write(f"| 总文件数 | {stats['total_files']} |\n")
        f.write(f"| 总代码行数 | {stats['total_lines']:,} |\n")
        f.write(f"| 总函数数（估算） | {stats['total_functions']:,} |\n")
        f.write(f"| `any` 类型使用 | {stats['total_any']} |\n")
        f.write(f"| `@ts-ignore` / `@ts-nocheck` | {stats['total_ts_ignore']} |\n")
        f.write(f"| `console.log` | {stats['total_console_log']} |\n")
        f.write(f"| `console.error` | {stats['total_console_error']} |\n")
        f.write(f"| `console.warn` | {stats['total_console_warn']} |\n")
        f.write(f"| `eslint-disable` | {stats['total_eslint_disable']} |\n")
        f.write(f"| `// TODO` | {stats['total_todo']} |\n")
        f.write(f"| `// FIXME` | {stats['total_fixme']} |\n")
        f.write(f"| `// HACK` | {stats['total_hack']} |\n")
        f.write(f"| 硬编码颜色值 | {stats['total_hardcoded_colors']} |\n")
        f.write("\n")

        f.write("## 二、各子目录代码行数统计\n\n")
        f.write("| 子目录 | 文件数 | 代码行数 | 函数数（估算） |\n")
        f.write("|--------|--------|----------|----------------|\n")
        for subdir, data in sorted_subdirs:
            f.write(
                f"| `{subdir}` | {data['files']} | {data['lines']:,} | {data['functions']:,} |\n"
            )
        f.write("\n")

        f.write("## 三、技术债务最严重的 Top 10 文件\n\n")
        f.write(
            "| 排名 | 文件 | 债务评分 | any | ts-ignore | console.log | eslint-disable | TODO/FIXME/HACK | 硬编码颜色 | 行数 |\n"
        )
        f.write(
            "|------|------|----------|-----|-----------|-------------|----------------|-----------------|------------|------|\n"
        )
        for i, file_stat in enumerate(top_10, 1):
            todo_total = (
                file_stat["todo"] + file_stat["fixme"] + file_stat["hack"]
            )
            f.write(
                f"| {i} | `{file_stat['rel_path']}` | {file_stat['debt_score']} | {file_stat['any']} | {file_stat['ts_ignore']} | {file_stat['console_log']} | {file_stat['eslint_disable']} | {todo_total} | {file_stat['hardcoded_colors']} | {file_stat['lines']} |\n"
            )
        f.write("\n")

        f.write("## 四、详细说明\n\n")
        f.write("### 债务评分规则\n\n")
        f.write("- `any` 类型：每个 3 分\n")
        f.write("- `@ts-ignore` / `@ts-nocheck`：每个 5 分\n")
        f.write("- `console.log`：每个 2 分\n")
        f.write("- `console.error` / `console.warn`：每个 1 分\n")
        f.write("- `eslint-disable`：每个 2 分\n")
        f.write("- `// TODO`：每个 2 分\n")
        f.write("- `// FIXME`：每个 3 分\n")
        f.write("- `// HACK`：每个 4 分\n")
        f.write("- 硬编码颜色：每个 1 分\n")
        f.write("\n")

        f.write("### 排除规则\n\n")
        f.write("- 排除目录：`node_modules/`、`dist/`、`build/`、`__tests__/`\n")
        f.write("- 排除文件：`*.test.*`、`*.spec.*`\n")
        f.write("- 硬编码颜色统计排除主题/颜色定义文件\n")
        f.write("\n")

        f.write("### 统计范围\n\n")
        f.write("- 文件类型：`.ts`、`.tsx`\n")
        f.write(f"- 统计根目录：`{SRC_DIR}`\n")

    summary = {
        "total_any": stats["total_any"],
        "total_console_log": stats["total_console_log"],
        "total_todo": stats["total_todo"] + stats["total_fixme"] + stats["total_hack"],
        "total_hardcoded_colors": stats["total_hardcoded_colors"],
        "total_files": stats["total_files"],
        "total_lines": stats["total_lines"],
        "total_functions": stats["total_functions"],
        "top_10_files": [f["rel_path"] for f in top_10],
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\n报告已生成: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
