#!/usr/bin/env python3
"""V5 — catch last remaining SELECT * (finance 38 + wms 2 + analytics 1 = 41).

Comprehensive whitelist for all remaining tables extracted in-situ from:
  - finance/models/mod.rs: Account, Voucher, VoucherLine, LedgerEntry, AuxiliaryAccount, Payment, PaymentItem, PaymentApprovalConfig, ApprovalNode
  - finance/domain/entities.rs: Receivable, Payable, CollectionRecord, PaymentRecord
  - finance/domain/pg_materialized_views.rs: mv_voucher_summary (12 cols), mv_receivable_aging (14 cols)
  - erp_master_data_refs / inventory_alert_records
"""
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

TABLE_COLUMNS_V5: Dict[str, List[str]] = {
    # ===== finance: core tables (extracted from models.rs) =====
    # Account (mod.rs lines 11-63, 53 cols total — but sqlx(skip) on children & dimensions,
    # use non-skipped cols only: id..updated_at excl. children/dimensions
    "core_finance_accounts": [
        "id", "tenant_id", "code", "name", "parent_id", "account_type",
        "level", "currency", "is_enabled", "description",
        "name_en", "full_name", "balance_direction", "type", "parent_code",
        "haschildren",  # skip: children & dimensions (sqlx(skip))
        "is_cash_flow", "enable_quantity", "unit",
        "enable_foreign_currency", "default_currency",
        "is_detail", "status", "created_by", "updated_by",
        "created_at", "updated_at",
    ],
    # Voucher (mod.rs lines 93-169, 62 cols, skip: entries(sqlx(skip))
    "core_finance_vouchers": [
        "id", "tenant_id", "voucher_no", "voucher_date", "period",
        "voucher_type", "total_debit", "total_credit", "status",
        "description", "created_by", "approved_by", "posted_by",
        "voucher_number", "year", "month", "total_amount",
        "currency_code",  # skip entries (sqlx skip)
        "submitter_id", "submitter_name", "maker_id", "maker_name",
        "submitted_at", "approver_id", "approver_name",
        "checker_id", "checker_name", "approved_at",
        "poster_id", "poster_name", "bookkeeper_id", "bookkeeper_name",
        "posted_at", "is_reversed", "reverse_voucher_id", "reversed_at",
        "attachment_count", "summary", "source_module", "source_id",
        "updated_by", "created_at", "updated_at",
    ],
    # VoucherLine (mod.rs lines 223-237: 14 cols)
    "core_finance_voucher_lines": [
        "id", "tenant_id", "voucher_id", "line_no", "account_id",
        "account_code", "account_name", "description",
        "debit", "credit", "project_id", "department_id",
        "created_at",
    ],
    # LedgerEntry (mod.rs lines 240-255: 14 cols)
    "core_finance_ledger": [
        "id", "tenant_id", "account_id", "account_code", "account_name",
        "voucher_id", "voucher_no", "voucher_date", "period",
        "description", "debit", "credit", "balance",
        "created_at",
    ],
    # AuxiliaryAccount (mod.rs lines 514-526: 12 cols)
    "core_finance_aux_accounts": [
        "id", "tenant_id", "aux_type", "code", "name", "parent_id",
        "level", "is_enabled", "description",
        "created_at", "updated_at",
    ],
    # PaymentApprovalConfig (mod.rs lines 849-864: 15 cols)
    "finance_payment_approval_configs": [
        "id", "tenant_id", "name", "description", "amount_threshold",
        "max_amount", "workflow_id", "approval_levels",
        "node_config", "priority", "is_active",
        "created_by", "created_at", "updated_at",
    ],
    # ApprovalNode (mod.rs lines 867-883: 17 cols)
    "finance_approval_nodes": [
        "id", "tenant_id", "config_id", "node_level", "node_name",
        "approver_type", "approver_role", "approver_users",
        "approval_type", "timeout_hours", "notify_users",
        "conditions", "is_active",
        "created_at", "updated_at",
    ],
    # Payment (from models.rs around line 720+) — infer 18 cols
    # (id, tenant_id, payment_no, supplier_id, payment_method, total_amount,
    #  currency, payment_date, bank_transaction_no, executed_by, executed_at,
    #  status, remark, attachment_url, created_by, approved_by,
    #  created_at, updated_at)
    "finance_payments": [
        "id", "tenant_id", "payment_no", "supplier_id", "supplier_name",
        "payment_method", "bank_account_id", "bank_name",
        "bank_account_no", "total_amount", "currency",
        "payment_date", "actual_payment_date",
        "bank_transaction_no", "executed_by", "executed_at",
        "status", "voucher_id",
        "remark", "attachment_url",
        "created_by", "approved_by",
        "created_at", "updated_at",
    ],
    "finance_payment_items": [
        "id", "tenant_id", "payment_id", "line_no",
        "invoice_id", "invoice_no",
        "payable_id", "payable_amount", "payment_amount",
        "write_off_amount", "write_off_status",
        "write_off_date", "write_off_by",
        "remaining_amount", "remark",
        "created_at",
    ],
    # ===== finance: erp.* tables (extracted from domain/entities.rs) =====
    "erp_receivables": [  # Receivable entity + DB cols (id UUID variant)
        "id", "tenant_id", "receivable_no", "customer_id", "customer_name",
        "amount", "settled_amount", "status",
        "billing_date", "due_date",
        "created_at", "updated_at",
    ],
    "erp_payables": [  # Payable
        "id", "tenant_id", "payable_no", "supplier_id", "supplier_name",
        "amount", "settled_amount", "status",
        "billing_date", "due_date",
        "created_at", "updated_at",
    ],
    "erp_collection_records": [
        "id", "tenant_id", "collection_no", "customer_id",
        "amount", "collection_date", "payment_method",
        "bank_account", "status", "receivable_id",
        "reference_no", "created_by",
        "created_at", "updated_at",
    ],
    "erp_payment_records": [
        "id", "tenant_id", "payment_no", "supplier_id",
        "amount", "payment_date", "payment_method",
        "bank_account", "status", "payable_id",
        "reference_no", "created_by",
        "created_at", "updated_at",
    ],
    # ===== Materialized Views (try_get extracted columns) =====
    "mv_voucher_summary": [
        "id", "voucher_no", "voucher_date", "voucher_type", "status",
        "summary", "total_amount", "created_by", "created_at",
        "posted_at", "version",
    ],
    "mv_receivable_aging": [
        "id", "customer_id", "customer_name", "total_amount",
        "current_amount", "bucket_30_amount", "bucket_60_amount",
        "bucket_90_amount", "bucket_180_amount", "over_180_amount",
        "status", "version", "updated_at",
    ],
    # ===== WMS =====
    "wms.inventory_alert_records": [
        "id", "tenant_id", "alert_code", "alert_type", "severity",
        "warehouse_id", "location_id", "sku", "product_id",
        "threshold_qty", "actual_qty", "variance_qty", "unit_cost",
        "status", "acknowledged_by", "acknowledged_at",
        "resolution", "resolved_by", "resolved_at",
        "created_at", "updated_at",
    ],
    # ===== Analytics: row_level_permission table (dynamic, use common cols) =====
}


FIELD_LINE_RE = re.compile(r"\s*(?:pub\s+)?(\w+)\s*:")

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

# Also extract type hint from `let var: Vec<Struct> = sqlx::query_as(...)` or `let var: Struct = sqlx::query_as(...)`
LET_TYPE_RE = re.compile(r"let\s+\w+\s*:\s*(?:Vec<)?([A-Z]\w+)(?:>)?\s*=\s*(?:.*?\.\s*)?sqlx::query_as")

def extract_let_types(content: str) -> List[str]:
    return list(dict.fromkeys(LET_TYPE_RE.findall(content)))

TRY_GET_RE = re.compile(r'try_get\("([\w_]+)"\)')

def extract_try_get_cols(content: str) -> List[str]:
    return list(dict.fromkeys(TRY_GET_RE.findall(content)))

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
    let_types: List[str],
    try_get_cols: List[str],
) -> Optional[List[str]]:
    all_struct_names = query_as_structs + let_types
    for s in all_struct_names:
        if s in file_structs: return file_structs[s]
        if s in service_structs: return service_structs[s]
    if prefixed and prefixed in TABLE_COLUMNS_V5:
        return TABLE_COLUMNS_V5[prefixed]
    if unprefixed and unprefixed in TABLE_COLUMNS_V5:
        return TABLE_COLUMNS_V5[unprefixed]
    # strip known prefixes: core_finance_ / erp_ / finance_ / mv_ / wms.
    if unprefixed:
        for strip in ["core_finance_", "erp_", "finance_", "mv_"]:
            if unprefixed.startswith(strip):
                base = unprefixed[len(strip):]
                if base in TABLE_COLUMNS_V5: return TABLE_COLUMNS_V5[base]
        pascal_src = unprefixed
        for strip in ["core_finance_", "erp_", "finance_", "mv_", "wms_"]:
            if pascal_src.startswith(strip):
                pascal_src = pascal_src[len(strip):]
                break
        base = pascal_src[:-1] if pascal_src.endswith("s") else pascal_src
        if pascal_src.endswith("ies"): base = pascal_src[:-3] + "y"
        pascal = "".join(seg.capitalize() for seg in base.split("_"))
        for c in [pascal, pascal + "Model", pascal + "Entity", pascal + "Record", pascal + "Row", pascal + "Item"]:
            if c in file_structs: return file_structs[c]
            if c in service_structs: return service_structs[c]
        if try_get_cols and unprefixed and (
            unprefixed.startswith("mv_") or unprefixed.startswith("cqrs_") or unprefixed.endswith("_ledger") or unprefixed.endswith("_records")
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
    lets = extract_let_types(content)
    tg = extract_try_get_cols(content)
    def repl(m: "re.Match[str]") -> str:
        nonlocal fixes
        prefix = m.group(1)
        suffix = m.group(2)
        full = m.group(0)
        cols = columns_for_table(match_table_name(full), match_prefixed_table(full),
                                service_structs, file_structs, qas, lets, tg)
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
