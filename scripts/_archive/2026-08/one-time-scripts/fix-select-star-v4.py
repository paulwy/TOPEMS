#!/usr/bin/env python3
"""V4 — catch remaining SELECT * across the 10 services.

Key fixes over V3:
  1. FIELD_LINE_RE: capture private fields (no 'pub' required) so private structs
     like MasterDataRow, EventRecord, ProjectionProgress get picked up.
  2. Extract try_get() column sequences for CQRS/event-sourcing tables that
     don't use query_as::<_, Struct>.
  3. Extra whitelist entries for core_billing_*, erp_master_data_refs,
     finance_voucher_*, cqrs_*, integration_* remaining tables.
"""
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

TABLE_COLUMNS_V4: Dict[str, List[str]] = {
    # --- core billing (billing service uses 'core_billing_*' / 'core_subscriptions') ---
    "core_billing_plans": [
        "id", "code", "name", "description", "license_type",
        "price_cents", "price_period", "included_users",
        "included_storage_gb", "included_api_calls", "included_modules",
        "overage_users_cents", "overage_storage_cents",
        "overage_api_calls_cents", "is_active", "is_trial",
        "created_at", "updated_at",
    ],
    "core_subscriptions": [
        "id", "tenant_id", "plan_id", "status",
        "current_period_start", "current_period_end",
        "is_trial", "trial_ends_at", "cancelled_at",
        "cancel_at_period_end", "created_at", "updated_at",
    ],
    "core_billing_invoices": [
        "id", "tenant_id", "subscription_id", "invoice_number",
        "status", "subtotal_cents", "discount_cents", "tax_cents",
        "total_cents", "currency", "issued_date", "due_date",
        "paid_date", "line_items", "notes",
        "created_at", "updated_at",
    ],
    # --- erp master data refs (erp_master_data_refs) ---
    "erp_master_data_refs": [
        "master_data_id", "tenant_id", "domain", "code", "name",
        "status", "source_service", "local_entity_type",
        "local_entity_id", "last_synced_at", "created_at",
        "updated_at", "archived_at", "archived_by",
        "archive_reason", "destroy_scheduled_at", "destroy_reason",
        "destroy_scheduled_by", "destroyed_at", "destroyed_by",
    ],
    # --- finance voucher lines / rules ---
    "finance_voucher_template_lines": [
        "id", "template_id", "description", "account_code",
        "direction", "amount_formula", "sort_order", "created_at",
    ],
    "finance_voucher_generation_rules": [
        "id", "tenant_id", "name", "source_type", "source_filter",
        "mapping_config", "output_voucher_type", "status",
        "priority", "description", "created_at", "updated_at",
        "created_by",
    ],
    # --- CQRS infrastructure tables (finance/domain) ---
    "cqrs_events": [
        "id", "aggregate_id", "aggregate_type", "event_type",
        "version", "payload", "metadata", "occurred_at",
    ],
    "cqrs_projection_progress": [
        "view_name", "last_event_id", "last_event_time",
        "processed_count", "error_count", "last_error",
        "updated_at",
    ],
}

FIELD_LINE_RE = re.compile(r"\s*(?:pub\s+)?(\w+)\s*:")  # no 'pub' required now!

def extract_struct_fields_per_file(content: str) -> Dict[str, List[str]]:
    structs: Dict[str, List[str]] = {}
    lines = content.splitlines()
    i = 0
    current_struct: Optional[str] = None
    brace_depth = 0
    fields: List[str] = []
    while i < len(lines):
        line = lines[i]
        if current_struct is None:
            m = re.search(r"(?:pub\s+)?struct\s+(\w+)", line)
            if m and "{" in line:
                current_struct = m.group(1)
                brace_depth = line.count("{") - line.count("}")
                fields = []
            elif m:
                current_struct = m.group(1)
                fields = []
                brace_depth = 0
        else:
            brace_depth += line.count("{") - line.count("}")
            fm = FIELD_LINE_RE.match(line)
            if fm:
                fname = fm.group(1)
                # skip Rust keywords / false positives
                if fname not in ("async", "fn", "struct", "enum", "impl", "use", "pub", "crate", "self", "Self", "match", "if", "else", "for", "while", "loop", "return", "let", "const", "static", "mod", "trait", "type"):
                    fields.append(fname)
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

QUERY_AS_RE = re.compile(r"query_as::<_,\s*(\w+)>")

def extract_query_as_structs(content: str) -> List[str]:
    return list(dict.fromkeys(QUERY_AS_RE.findall(content)))

# NEW: extract try_get("col") sequence (used in CQRS/event-sourcing rows)
#   looking for sequential `row.try_get("xxx")` calls inside one function.
TRY_GET_RE = re.compile(r'try_get\("([\w_]+)"\)')

def extract_try_get_cols(content: str) -> Dict[str, List[str]]:
    """Map SELECT * tables → try_get columns when the row mapper is inline.

    Heuristic: for any sequential `row.try_get("col")` blocks, record all
    column names; apply to any SELECT * cqrs_ / finance_voucher_ tables
    in the same file (they share the try_get() row mapper pattern).
    """
    return {"__all_cols__": list(dict.fromkeys(TRY_GET_RE.findall(content)))}

def match_table_name(full_sql: str) -> Optional[str]:
    m = re.search(
        r"FROM\s+(?:`?)(?:[\w]+\.)?([\w]+)`?(?:\s+(?:AS\s+)?\w+)?",
        full_sql, re.IGNORECASE,
    )
    return m.group(1).lower() if m else None

def match_prefixed_table(full_sql: str) -> Optional[str]:
    m = re.search(r"FROM\s+(?:`?)((?:[\w]+\.)?[\w]+)`?", full_sql, re.IGNORECASE)
    return m.group(1) if m else None

def columns_for_table(
    unprefixed: Optional[str], prefixed: Optional[str],
    service_structs: Dict[str, List[str]],
    file_structs: Dict[str, List[str]],
    query_as_structs: List[str],
    try_get_cols: List[str],
) -> Optional[List[str]]:
    # S1: query_as struct
    for s in query_as_structs:
        if s in file_structs: return file_structs[s]
        if s in service_structs: return service_structs[s]
    # S2: explicit whitelist (prefixed first)
    if prefixed and prefixed in TABLE_COLUMNS_V4:
        return TABLE_COLUMNS_V4[prefixed]
    if unprefixed and unprefixed in TABLE_COLUMNS_V4:
        return TABLE_COLUMNS_V4[unprefixed]
    # S3: pascal mapping
    if unprefixed:
        base = unprefixed[:-1] if unprefixed.endswith("s") else unprefixed
        if unprefixed.endswith("ies"): base = unprefixed[:-3] + "y"
        pascal = "".join(seg.capitalize() for seg in base.split("_"))
        for c in [pascal, pascal + "Model", pascal + "Entity", pascal + "Record", pascal + "Row"]:
            if c in file_structs: return file_structs[c]
            if c in service_structs: return service_structs[c]
        for prefix in [
            "finance_", "billing_", "erp_", "core_", "wms_", "scm_", "ticket_",
            "master_data_", "analytics_", "integration_", "mobile_",
            "plugin_finance_", "plugin_billing_", "plugin_erp_", "plugin_wms_",
            "plugin_scm_", "plugin_ticket_",
        ]:
            key = prefix + unprefixed
            if key in TABLE_COLUMNS_V4: return TABLE_COLUMNS_V4[key]
    # S4: try_get() fallback for cqrs / known row-mapper tables
    if try_get_cols and unprefixed and (
        unprefixed.startswith("cqrs_") or unprefixed in (
            "finance_voucher_generation_rules",
            "finance_voucher_template_lines",
        )
    ):
        return try_get_cols
    return None

SELECT_STAR_RE = re.compile(
    r"(SELECT\s+)\*(\s+FROM[\s\S]{0,500}?)"
    r"(?=\s*(?:;|\bLIMIT\b|\bGROUP\b|\bORDER\b|\bHAVING\b|\bOFFSET\b|\bWHERE\b|\bRETURNING\b|\bUNION\b|\))|\"|')",
    re.IGNORECASE,
)

def fix_file(content: str, service_structs: Dict[str, List[str]]) -> Tuple[str, int]:
    fixes = 0
    file_structs = extract_struct_fields_per_file(content)
    qas = extract_query_as_structs(content)
    try_get_data = extract_try_get_cols(content)
    try_get_cols = try_get_data.get("__all_cols__", [])

    def repl(m: "re.Match[str]") -> str:
        nonlocal fixes
        prefix = m.group(1)
        suffix = m.group(2)
        full = m.group(0)
        cols = columns_for_table(match_table_name(full), match_prefixed_table(full),
                                service_structs, file_structs, qas, try_get_cols)
        if cols is None: return full
        fixes += 1
        return f"{prefix}{', '.join(cols)}{suffix}"
    return SELECT_STAR_RE.sub(repl, content), fixes

def main():
    services = [
        "svc/analytics/src", "svc/billing/src", "svc/erp/src",
        "svc/finance/src", "svc/integration/src",
        "svc/master-data/src", "svc/mobile/src", "svc/scm/src",
        "svc/ticket/src", "svc/wms/src",
    ]
    base = Path("/Users/air/TOPEMS")
    total_touched = 0
    total_fixes = 0
    for s in services:
        root = base / s
        if not root.exists(): continue
        service_structs: Dict[str, List[str]] = {}
        for f in root.rglob("*.rs"):
            if "migrations" in str(f): continue
            try: c = f.read_text(encoding="utf-8")
            except Exception: continue
            service_structs.update(extract_struct_fields_per_file(c))
        for f in sorted(root.rglob("*.rs")):
            if "migrations" in str(f): continue
            try: content = f.read_text(encoding="utf-8")
            except Exception: continue
            if "SELECT *" not in content and "select *" not in content: continue
            new_content, n = fix_file(content, service_structs)
            if n > 0:
                f.write_text(new_content, encoding="utf-8")
                total_fixes += n
                total_touched += 1
                print(f"  {f.relative_to(base)}: {n} SELECT * → cols")
    print(f"\nDone. {total_touched} files, {total_fixes} SELECT * replaced.")

if __name__ == "__main__":
    main()
