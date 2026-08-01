#!/usr/bin/env python3
"""
Batch replace SELECT * FROM with explicit column lists (V2).

Improvements over V1:
  - Handles schema.table prefixes (gis.devices, plugin_pm.budgets, core.core_plugins)
  - Extracts struct names from sqlx::query_as::<_, SomeStruct> and uses their fields
  - Wider terminator list for SELECT * regex (recognizes end of string literal in Rust source including ", '")
"""

import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# ---- Pre-built column whitelists (new tables found in GIS/PM/UC remaining gaps) ----

TABLE_COLUMNS_V2: Dict[str, List[str]] = {
    # ---- GIS additional ----
    "geofeatures": [
        "id", "geodata_id", "feature_type", "geometry", "attributes",
        "tenant_id", "created_at", "updated_at",
    ],
    "device_location_records": [
        "id", "tenant_id", "device_id", "latitude", "longitude",
        "accuracy", "altitude", "speed", "heading", "recorded_at",
        "created_at",
    ],
    "device_locations": [
        "id", "tenant_id", "device_id", "location_id", "latitude",
        "longitude", "last_seen_at", "created_at", "updated_at",
    ],
    "warehouse_locations": [
        "id", "tenant_id", "warehouse_id", "zone", "aisle", "rack",
        "shelf", "bin", "latitude", "longitude", "created_at",
        "updated_at",
    ],
    "business_locations": [
        "id", "tenant_id", "business_id", "location_id", "warehouse_id",
        "latitude", "longitude", "primary", "created_at", "updated_at",
    ],
    "track_records": [
        "id", "tenant_id", "track_code", "device_id", "started_at",
        "ended_at", "distance_meters", "start_latitude", "start_longitude",
        "end_latitude", "end_longitude", "status", "created_at",
    ],
    "track_positions": [
        "id", "tenant_id", "track_id", "latitude", "longitude",
        "timestamp", "accuracy", "altitude", "speed", "heading",
    ],
    "evidence_records": [
        "id", "tenant_id", "track_id", "entity_type", "entity_id",
        "evidence_type", "file_url", "thumbnail_url", "caption",
        "latitude", "longitude", "recorded_at", "captured_by",
        "created_at",
    ],
    # ---- PM additional ----
    "budget_items": [
        "id", "tenant_id", "budget_id", "item_code", "item_name",
        "category", "planned_amount", "actual_amount", "unit", "qty",
        "description", "sort_order", "created_at", "updated_at",
    ],
    "notifications": [
        "id", "tenant_id", "project_id", "user_id", "notification_type",
        "title", "content", "channel", "status", "read_at", "sent_at",
        "created_at",
    ],
    "notification_settings": [
        "id", "tenant_id", "project_id", "user_id", "event_type",
        "email_enabled", "sms_enabled", "in_app_enabled",
        "webhook_enabled", "webhook_url", "created_at", "updated_at",
    ],
    "settlement_items": [
        "id", "tenant_id", "settlement_id", "category", "item_name",
        "description", "quantity", "unit_price", "amount",
        "tax_rate", "tax_amount", "sort_order", "created_at",
    ],
    "settlement_adjustments": [
        "id", "tenant_id", "settlement_id", "adjustment_type",
        "reason", "amount", "currency", "approved_by", "approved_at",
        "created_at",
    ],
    "acceptance_plans": [
        "id", "tenant_id", "project_id", "acceptance_code", "plan_name",
        "expected_date", "acceptance_type", "method", "status",
        "result", "approver_id", "approved_at", "created_by",
        "created_at", "updated_at",
    ],
    "acceptance_items": [
        "id", "tenant_id", "plan_id", "item_code", "item_name",
        "check_method", "criteria", "result", "defects",
        "remarks", "checked_by", "checked_at", "sort_order",
        "created_at",
    ],
    "acceptance_records": [
        "id", "tenant_id", "project_id", "plan_id", "record_code",
        "record_name", "acceptance_date", "result", "score",
        "defect_count", "critical_defect_count", "notes",
        "attachments", "accepted_by", "created_at", "updated_at",
    ],
    # ---- Unified-core additional ----
    "core_api_version_configs": [
        "id", "version", "api_prefix", "enabled", "default_version",
        "deprecation_date", "removal_date", "migration_guide_url",
        "created_at", "updated_at",
    ],
    "core.core_plugins": [  # prefixed form
        "id", "tenant_id", "plugin_code", "plugin_name", "version",
        "description", "author", "install_status", "enabled",
        "installed_at", "installed_by", "last_updated_at",
        "config", "created_at", "updated_at",
    ],
    "core.core_plugin_versions": [
        "id", "plugin_id", "version_code", "semver", "release_notes",
        "package_url", "checksum", "min_platform_version",
        "max_platform_version", "status", "published_at",
        "created_by", "created_at",
    ],
    # ---- Generic sample tables (commonly referenced) ----
    "orders": [
        "id", "tenant_id", "order_code", "customer_id", "status",
        "total_amount", "currency", "notes", "ordered_by",
        "created_at", "updated_at", "deleted_at",
    ],
    "inventory": [
        "id", "tenant_id", "sku", "product_id", "warehouse_id",
        "stock_level", "reserved_level", "reorder_level",
        "unit_cost", "last_counted_at", "created_at", "updated_at",
    ],
    "ai_models": [
        "id", "tenant_id", "model_code", "model_name", "provider",
        "version", "base_model", "parameters", "model_url",
        "is_default", "status", "deployed_at", "created_by",
        "created_at", "updated_at",
    ],
}


# ---- Struct extraction ----

# Also capture generic struct with generics: pub struct Xxx<T> { ... }
STRUCT_MULTI_RE = re.compile(
    r"pub\s+struct\s+(\w+)(?:<[^>]+>)?\s*\{",
    re.MULTILINE,
)
FIELD_LINE_RE = re.compile(r"\s*pub\s+(\w+)\s*:")


def extract_struct_fields_per_file(content: str) -> Dict[str, List[str]]:
    """Extract struct → field list by scanning the file for pub struct blocks."""
    structs: Dict[str, List[str]] = {}
    lines = content.splitlines()
    i = 0
    current_struct: Optional[str] = None
    brace_depth = 0
    fields: List[str] = []
    while i < len(lines):
        line = lines[i]
        if current_struct is None:
            m = re.search(r"pub\s+struct\s+(\w+)", line)
            if m and "{" in line:
                current_struct = m.group(1)
                brace_depth = line.count("{") - line.count("}")
                fields = []
            elif m:
                # pub struct Xxx
                # { ...
                current_struct = m.group(1)
                fields = []
                brace_depth = 0
        else:
            brace_depth += line.count("{") - line.count("}")
            fm = FIELD_LINE_RE.match(line)
            if fm:
                fields.append(fm.group(1))
            # If depth returns to 0 or less (struct body closed)
            if brace_depth <= 0:
                if fields:
                    structs[current_struct] = fields
                current_struct = None
                fields = []
                brace_depth = 0
        i += 1
    if current_struct is not None and fields:
        structs[current_struct] = fields
    return structs


# ---- QueryAs struct extraction ----

QUERY_AS_RE = re.compile(r"query_as::<_,\s*(\w+)>")


def extract_query_as_structs(content: str) -> List[str]:
    """Return distinct struct names used in sqlx::query_as::<_, X>."""
    return list(dict.fromkeys(QUERY_AS_RE.findall(content)))


# ---- Table name resolution ----

def match_table_name(full_sql: str) -> Optional[str]:
    """Extract the last dotted part of table name from a SELECT * FROM ... statement.
    Returns the unprefixed name (e.g. 'devices' from 'gis.devices').
    """
    # Match: FROM [schema.]table_name [AS alias]
    m = re.search(
        r"FROM\s+(?:`?)(?:[\w]+\.)?([\w]+)`?(?:\s+(?:AS\s+)?\w+)?",
        full_sql,
        re.IGNORECASE,
    )
    if not m:
        return None
    return m.group(1).lower()


def match_prefixed_table(full_sql: str) -> Optional[str]:
    """Extract schema.table if present (e.g. 'core.core_plugins'), otherwise plain table."""
    m = re.search(
        r"FROM\s+(?:`?)((?:[\w]+\.)?[\w]+)`?",
        full_sql,
        re.IGNORECASE,
    )
    if not m:
        return None
    return m.group(1)


def columns_for_table(
    unprefixed: Optional[str],
    prefixed: Optional[str],
    service_structs: Dict[str, List[str]],
    file_structs: Dict[str, List[str]],
    query_as_structs: List[str],
) -> Optional[List[str]]:
    """Resolve columns for a table by trying multiple strategies."""
    # Strategy 1: query_as struct names in this file (highest priority).
    for s in query_as_structs:
        # Exact struct name:
        if s in file_structs:
            return file_structs[s]
        if s in service_structs:
            return service_structs[s]

    # Strategy 2: Table column whitelist (prefixed form, then unprefixed).
    if prefixed and prefixed in TABLE_COLUMNS_V2:
        return TABLE_COLUMNS_V2[prefixed]
    if unprefixed and unprefixed in TABLE_COLUMNS_V2:
        return TABLE_COLUMNS_V2[unprefixed]

    # Strategy 3: Pascal-case map (devices → Device) → search for that struct.
    if unprefixed:
        base = unprefixed[:-1] if unprefixed.endswith("s") else unprefixed
        if unprefixed.endswith("ies"):
            base = unprefixed[:-3] + "y"
        pascal = "".join(seg.capitalize() for seg in base.split("_"))
        candidates = [pascal, pascal + "Model", pascal + "Entity", pascal + "Record"]
        for c in candidates:
            if c in file_structs:
                return file_structs[c]
            if c in service_structs:
                return service_structs[c]

    # Strategy 4: Look up whitelist entries with common gis/pm/core prefixes
    if unprefixed:
        for prefix in ["gis_", "pm_", "core_", "plugin_gis_", "plugin_pm_"]:
            key = prefix + unprefixed
            if key in TABLE_COLUMNS_V2:
                return TABLE_COLUMNS_V2[key]

    return None


# ---- SELECT * regex ----

# More lenient end: stop at end of Rust string literal: " or closing paren.
SELECT_STAR_RE = re.compile(
    r"(SELECT\s+)\*(\s+FROM[\s\S]{0,500}?)"
    r"(?=\s*(?:;|\bLIMIT\b|\bGROUP\b|\bORDER\b|\bHAVING\b|\bOFFSET\b|\bWHERE\b|\bRETURNING\b|\bUNION\b|\))|\"|')",
    re.IGNORECASE,
)


def fix_file(
    path: Path,
    content: str,
    service_structs: Dict[str, List[str]],
) -> Tuple[str, int]:
    fixes = 0
    file_structs = extract_struct_fields_per_file(content)
    query_as_structs = extract_query_as_structs(content)

    def repl(m: "re.Match[str]") -> str:
        nonlocal fixes
        prefix = m.group(1)  # "SELECT "
        suffix = m.group(2)  # " FROM ... "
        full = m.group(0)

        unprefixed = match_table_name(full)
        prefixed = match_prefixed_table(full)

        cols = columns_for_table(
            unprefixed, prefixed, service_structs, file_structs, query_as_structs
        )
        if cols is None:
            return full  # leave untouched
        fixes += 1
        col_list = ", ".join(cols)
        return f"{prefix}{col_list}{suffix}"

    new_content = SELECT_STAR_RE.sub(repl, content)
    return new_content, fixes


def main():
    roots = [
        Path("/Users/air/TOPEMS/svc/gis/src"),
        Path("/Users/air/TOPEMS/svc/pm/src"),
        Path("/Users/air/TOPEMS/svc/unified-core/src"),
    ]
    total_touched = 0
    total_fixes = 0
    for root in roots:
        if not root.exists():
            continue
        # Aggregate structs across the whole service
        service_structs: Dict[str, List[str]] = {}
        for f in root.rglob("*.rs"):
            if "migrations" in str(f):
                continue
            try:
                c = f.read_text(encoding="utf-8")
            except Exception:
                continue
            service_structs.update(extract_struct_fields_per_file(c))

        for f in sorted(root.rglob("*.rs")):
            if "migrations" in str(f):
                continue
            try:
                content = f.read_text(encoding="utf-8")
            except Exception:
                continue
            if "SELECT *" not in content and "select *" not in content:
                continue
            new_content, n = fix_file(f, content, service_structs)
            if n > 0:
                f.write_text(new_content, encoding="utf-8")
                total_fixes += n
                total_touched += 1
                print(f"  {f}: {n} SELECT * → cols")

    print(f"\nDone. {total_touched} files, {total_fixes} SELECT * replaced.")


if __name__ == "__main__":
    main()
