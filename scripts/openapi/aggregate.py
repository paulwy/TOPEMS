#!/usr/bin/env python3
"""
TOPEMS OpenAPI 聚合脚本

功能：
    读取 /tmp/topems-*-openapi.json（由各服务 `cargo test extract_openapi_spec`
    生成），合并 paths 与 schemas，补充标准类型（Uuid / DateTime / BigDecimal 等），
    输出聚合后的 OpenAPI JSON 供前端类型生成（gen-types.mjs）消费。

用法：
    python3 scripts/openapi/aggregate.py                          # 默认：读 /tmp，输出到 docs/api/openapi-aggregated.json
    python3 scripts/openapi/aggregate.py --input-dir /tmp          # 指定输入目录
    python3 scripts/openapi/aggregate.py --output docs/api/openapi-aggregated.json
    python3 scripts/openapi/aggregate.py --strict                  # 冲突时退出非零

与 generate.sh --extract 的关系：
    `generate.sh --extract` 会先调用 `cargo test extract_openapi_spec` 将各服务
    spec 写到 /tmp，再调用本脚本完成聚合。

冲突处理策略：
    - paths 冲突（同 path + 同 method）：保留先出现的服务，后续服务记 warning
      （除非 --strict，则直接报错退出）
    - schemas 冲突：
        * 若是标准类型（Uuid / DateTime 等），始终用 STANDARD_TYPES 覆盖
        * 否则给后出现的服务加 `<service>_<schema>` 前缀，避免相互覆盖

输出：
    docs/api/openapi-aggregated.json
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime, timezone

# 标准类型：跨服务共享的基础类型，utoipa 生成的 spec 经常 $ref 引用它们。
# 即使某服务未声明，也由本脚本统一补齐，保证 gen-types.mjs 解析时不会出现悬空引用。
STANDARD_TYPES = {
    "Uuid": {"type": "string", "format": "uuid"},
    "DateTime": {"type": "string", "format": "date-time"},
    "NaiveDateTime": {"type": "string", "format": "date-time"},
    "chrono.NaiveDateTime": {"type": "string", "format": "date-time"},
    "chrono.NaiveDate": {"type": "string", "format": "date"},
    "chrono.NaiveTime": {"type": "string", "format": "time"},
    "Date": {"type": "string", "format": "date"},
    "Decimal": {"type": "number"},
    "BigDecimal": {"type": "number"},
    "JsonValue": {"type": "object", "additionalProperties": True},
    "serde_json::Value": {"type": "object", "additionalProperties": True},
    "HashMap_String_String": {
        "type": "object",
        "additionalProperties": {"type": "string"},
    },
    # 通用响应包装（与 topems_shared::response::ApiResponse 对齐）
    "ApiResponse": {
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "data": {"type": "object"},
            "code": {"type": "integer"},
        },
    },
}

DEFAULT_INPUT_DIR = "/tmp"
DEFAULT_OUTPUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "docs",
    "api",
    "openapi-aggregated.json",
)

SPEC_GLOB = "topems-*-openapi.json"
HTTP_METHODS = ("get", "post", "put", "delete", "patch", "head", "options", "trace")

COLORS = {
    "RED": "\033[0;31m",
    "GREEN": "\033[0;32m",
    "YELLOW": "\033[1;33m",
    "BLUE": "\033[0;34m",
    "NC": "\033[0m",
}


def log_info(msg: str) -> None:
    print(f"{COLORS['BLUE']}[INFO]{COLORS['NC']} {msg}")


def log_success(msg: str) -> None:
    print(f"{COLORS['GREEN']}[OK]{COLORS['NC']} {msg}")


def log_warn(msg: str) -> None:
    print(f"{COLORS['YELLOW']}[WARN]{COLORS['NC']} {msg}", file=sys.stderr)


def log_error(msg: str) -> None:
    print(f"{COLORS['RED']}[ERROR]{COLORS['NC']} {msg}", file=sys.stderr)


def extract_service_name(filename: str) -> str | None:
    """从 `topems-<svc>-openapi.json` 提取 <svc>。"""
    base = os.path.basename(filename)
    m = re.match(r"^topems-(.+)-openapi\.json$", base)
    return m.group(1) if m else None


def load_specs(input_dir: str) -> list[tuple[str, dict]]:
    """加载输入目录下所有 topems-*-openapi.json，返回 [(service_name, spec), ...]。"""
    pattern = os.path.join(input_dir, SPEC_GLOB)
    files = sorted(glob.glob(pattern))
    if not files:
        log_error(f"未找到 spec 文件: {pattern}")
        log_error("请先运行: cargo test -p topems-<svc> extract_openapi_spec -- --nocapture")
        return []

    specs: list[tuple[str, dict]] = []
    for path in files:
        svc = extract_service_name(path)
        if svc is None:
            log_warn(f"无法解析服务名，跳过: {path}")
            continue
        try:
            with open(path, encoding="utf-8") as f:
                spec = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            log_warn(f"读取 {path} 失败: {e}")
            continue
        specs.append((svc, spec))
        path_count = len(spec.get("paths", {}))
        schema_count = len(spec.get("components", {}).get("schemas", {}))
        log_success(f"{svc} — {path_count} paths, {schema_count} schemas")
    return specs


def merge_paths(
    aggregated: dict, specs: list[tuple[str, dict]], strict: bool
) -> tuple[int, list[str]]:
    """合并 paths，返回 (总端点数, 冲突列表)。"""
    total = 0
    conflicts: list[str] = []
    paths: dict = aggregated.setdefault("paths", {})

    for svc, spec in specs:
        svc_paths = spec.get("paths", {})
        for path, methods in svc_paths.items():
            # utoipa 生成的 path 已带 /api/<svc> 前缀（如 /api/mes/work-reports），
            # 此类路径直接保留；否则补服务前缀避免与其它服务冲突。
            prefixed = path
            if not path.startswith("/api") and not path.startswith(f"/{svc}"):
                prefixed = f"/{svc}{path}"

            slot = paths.setdefault(prefixed, {})
            for method, spec_def in methods.items():
                if method.lower() not in HTTP_METHODS:
                    continue
                if method in slot:
                    msg = f"paths 冲突: {prefixed} [{method}] 已被服务 {slot[method].get('_source', '?')} 占用，{svc} 被跳过"
                    conflicts.append(msg)
                    if strict:
                        log_error(msg)
                        raise SystemExit(1)
                    log_warn(msg)
                    continue
                # 注入来源标记与 tag（便于排查，输出前再剥离 _source）
                spec_def = dict(spec_def)
                spec_def["_source"] = svc
                tags = spec_def.setdefault("tags", [])
                if svc not in tags:
                    tags.insert(0, svc)
                slot[method] = spec_def
                total += 1

    return total, conflicts


def merge_schemas(
    aggregated: dict, specs: list[tuple[str, dict]], strict: bool
) -> tuple[int, list[str]]:
    """合并 schemas，返回 (总 schema 数, 冲突列表)。"""
    total = 0
    conflicts: list[str] = []
    schemas: dict = aggregated.setdefault("components", {}).setdefault("schemas", {})

    for svc, spec in specs:
        svc_schemas = spec.get("components", {}).get("schemas", {})
        for name, definition in svc_schemas.items():
            # 标准类型由本脚本统一注入，跳过服务自带版本（以 STANDARD_TYPES 为准）
            if name in STANDARD_TYPES:
                continue
            if name in schemas:
                prefixed = f"{svc}_{name}"
                if prefixed in schemas:
                    msg = f"schema 冲突: {prefixed} 已存在，{svc}/{name} 被跳过"
                    conflicts.append(msg)
                    if strict:
                        log_error(msg)
                        raise SystemExit(1)
                    log_warn(msg)
                    continue
                schemas[prefixed] = definition
                total += 1
            else:
                schemas[name] = definition
                total += 1

    return total, conflicts


def inject_standard_types(schemas: dict) -> int:
    """补充标准类型，已存在的会被 STANDARD_TYPES 覆盖以保证一致性。返回注入数量。"""
    count = 0
    for name, definition in STANDARD_TYPES.items():
        if name not in schemas:
            count += 1
        schemas[name] = definition
    return count


def strip_internal_markers(aggregated: dict) -> None:
    """剥离 merge_paths 注入的 _source 字段（避免污染输出）。"""
    for methods in aggregated.get("paths", {}).values():
        for spec_def in methods.values():
            if isinstance(spec_def, dict):
                spec_def.pop("_source", None)


def build_aggregated(specs: list[tuple[str, dict]], strict: bool) -> tuple[dict, int, int, list[str]]:
    """构建聚合文档，返回 (doc, paths_count, schemas_count, conflicts)。"""
    aggregated: dict = {
        "openapi": "3.0.3",
        "info": {
            "title": "TOPEMS API",
            "version": "1.0.0",
            "description": "TOPEMS 企业级 SaaS 平台统一 API 文档（由 aggregate.py 从 cargo test 提取的 spec 聚合生成）",
        },
        "paths": {},
        "components": {"schemas": {}},
    }

    path_count, path_conflicts = merge_paths(aggregated, specs, strict)
    schema_count, schema_conflicts = merge_schemas(aggregated, specs, strict)

    standard_count = inject_standard_types(aggregated["components"]["schemas"])
    schema_count += standard_count

    strip_internal_markers(aggregated)

    aggregated["info"]["description"] = (
        "TOPEMS 企业级 SaaS 平台统一 API 文档（由 aggregate.py 从 cargo test 提取的 spec 聚合生成）\n\n"
        f"聚合自 {len(specs)} 个服务，共 {path_count} 个端点、{schema_count} 个 Schema（含 {standard_count} 个标准类型）。\n"
        f"生成时间: {datetime.now(timezone.utc).isoformat()}"
    )

    conflicts = path_conflicts + schema_conflicts
    return aggregated, path_count, schema_count, conflicts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="聚合 /tmp/topems-*-openapi.json 为统一 OpenAPI 文档"
    )
    parser.add_argument(
        "--input-dir",
        default=DEFAULT_INPUT_DIR,
        help=f"spec 输入目录（默认: {DEFAULT_INPUT_DIR}）",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help=f"聚合输出路径（默认: {DEFAULT_OUTPUT}）",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="遇到 paths/schemas 冲突时立即报错退出（默认仅 warning）",
    )
    args = parser.parse_args()

    specs = load_specs(args.input_dir)
    if not specs:
        log_error("无可聚合的 spec，终止")
        return 1

    log_info(f"开始聚合 {len(specs)} 个服务 spec...")

    aggregated, path_count, schema_count, conflicts = build_aggregated(specs, args.strict)

    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(aggregated, f, indent=2, ensure_ascii=False)

    log_success(f"已生成: {args.output} ({path_count} paths, {schema_count} schemas)")
    if conflicts:
        log_warn(f"共 {len(conflicts)} 处冲突，详见上方 warning")

    return 0


if __name__ == "__main__":
    sys.exit(main())
