#!/usr/bin/env python3
"""Batch SELECT * replacement for remaining 10 services (V3):
   analytics, billing, erp, finance, integration, master-data, mobile, scm, ticket, wms.

   Reuses V2 strategies: query_as struct extraction, schema.table whitelist, and pascal mapping.
   Whitelist for common tables in these new service domains (finance/erp/wms/scm/mobile/ticket/billing/master-data/analytics/integration).
"""
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Whitelist keys: plain table name, or schema.table (e.g. 'finance.invoices').
TABLE_COLUMNS_V3: Dict[str, List[str]] = {
    # ---- billing ----
    "invoices": [
        "id", "tenant_id", "invoice_code", "invoice_type", "billing_period_start",
        "billing_period_end", "customer_id", "customer_name", "currency",
        "subtotal", "tax_total", "discount_total", "grand_total", "status",
        "issued_by", "issued_at", "due_date", "paid_at", "notes",
        "created_at", "updated_at", "deleted_at",
    ],
    "invoice_items": [
        "id", "tenant_id", "invoice_id", "item_code", "item_name",
        "description", "qty", "unit_price", "tax_rate", "tax_amount",
        "discount_rate", "discount_amount", "line_total", "sort_order",
        "created_at",
    ],
    "billing_records": [
        "id", "tenant_id", "record_code", "source_type", "source_id",
        "customer_id", "billing_date", "amount", "currency", "status",
        "invoiced_id", "created_by", "created_at", "updated_at",
    ],
    # ---- ticket ----
    "tickets": [
        "id", "tenant_id", "ticket_code", "title", "description",
        "ticket_type", "category_id", "priority", "status", "severity",
        "reporter_id", "assignee_id", "sla_id", "department_id",
        "location_id", "asset_id", "due_date", "resolved_at", "closed_at",
        "tags", "attachments", "custom_fields", "source", "created_at",
        "updated_at", "deleted_at",
    ],
    "ticket_comments": [
        "id", "tenant_id", "ticket_id", "author_id", "content",
        "is_internal", "attachments", "time_spent_minutes", "created_at",
    ],
    "ticket_slas": [
        "id", "tenant_id", "sla_code", "name", "description", "priority",
        "first_response_minutes", "response_minutes", "resolution_minutes",
        "business_hours_only", "escalation_rules", "enabled",
        "created_at", "updated_at",
    ],
    # ---- wms ----
    "inbound_orders": [
        "id", "tenant_id", "order_code", "source_type", "source_code",
        "supplier_id", "warehouse_id", "expected_date", "status",
        "total_qty", "received_qty", "total_cost", "currency",
        "created_by", "created_at", "updated_at",
    ],
    "outbound_orders": [
        "id", "tenant_id", "order_code", "order_type", "customer_id",
        "warehouse_id", "priority", "requested_date", "ship_date",
        "status", "total_qty", "picked_qty", "shipped_qty", "carrier",
        "tracking_no", "shipping_cost", "currency", "notes",
        "created_by", "created_at", "updated_at",
    ],
    "inventory_transactions": [
        "id", "tenant_id", "tx_code", "tx_type", "reference_type",
        "reference_id", "sku", "product_id", "lot_code", "serial_no",
        "warehouse_id", "location_id", "qty_before", "qty_change",
        "qty_after", "uom", "unit_cost", "total_cost", "currency",
        "occurred_at", "created_by", "created_at",
    ],
    "stocktakes": [
        "id", "tenant_id", "stocktake_code", "warehouse_id", "stocktake_type",
        "status", "scheduled_date", "start_date", "end_date",
        "variance_qty", "variance_cost", "approved_by", "approved_at",
        "created_by", "created_at", "updated_at",
    ],
    # ---- scm ----
    "purchase_orders": [
        "id", "tenant_id", "po_code", "supplier_id", "warehouse_id",
        "buyer_id", "status", "currency", "subtotal", "tax_total",
        "discount_total", "grand_total", "expected_date", "issued_date",
        "approved_by", "approved_at", "notes",
        "created_by", "created_at", "updated_at",
    ],
    "purchase_requisitions": [
        "id", "tenant_id", "pr_code", "department_id", "requested_by",
        "status", "currency", "total_amount", "required_date",
        "approved_by", "approved_at", "reason",
        "created_by", "created_at", "updated_at",
    ],
    "suppliers": [
        "id", "tenant_id", "supplier_code", "supplier_name", "short_name",
        "contact_name", "phone", "email", "country", "state", "city",
        "address_line1", "address_line2", "postal_code",
        "tax_id", "payment_terms", "credit_limit", "currency",
        "category", "rating", "status", "onboarding_date",
        "created_by", "created_at", "updated_at", "deleted_at",
    ],
    # ---- erp ----
    "gl_accounts": [
        "id", "tenant_id", "account_code", "account_name", "account_type",
        "normal_balance", "parent_id", "level", "is_contra",
        "currency", "is_active", "description",
        "created_by", "created_at", "updated_at",
    ],
    "gl_entries": [
        "id", "tenant_id", "entry_code", "entry_date", "period_id",
        "reference_type", "reference_id", "description", "status",
        "posted", "posted_by", "posted_at", "currency",
        "total_debit", "total_credit", "created_by", "created_at",
        "updated_at",
    ],
    "products": [
        "id", "tenant_id", "product_code", "sku", "product_name",
        "short_name", "description", "category_id", "brand_id",
        "uom", "product_type", "is_salable", "is_purchasable",
        "is_stocked", "is_active", "standard_cost", "list_price",
        "currency", "weight_kg", "volume_cbm", "barcode", "hs_code",
        "country_of_origin", "taxable", "tax_rate",
        "created_by", "created_at", "updated_at", "deleted_at",
    ],
    "partners": [
        "id", "tenant_id", "partner_code", "partner_name", "partner_type",
        "is_customer", "is_supplier", "is_vendor", "contact_name",
        "phone", "email", "country", "state", "city", "address_line1",
        "address_line2", "postal_code", "tax_id", "payment_terms",
        "credit_limit", "currency", "status", "onboarding_date",
        "created_by", "created_at", "updated_at", "deleted_at",
    ],
    # ---- finance ----
    "transactions": [
        "id", "tenant_id", "tx_code", "tx_type", "tx_date", "period_id",
        "account_id", "counterparty_id", "amount", "currency",
        "debit_amount", "credit_amount", "reference_type",
        "reference_id", "description", "status", "reconciled",
        "reconciled_id", "occurred_at", "created_by",
        "created_at", "updated_at",
    ],
    "journals": [
        "id", "tenant_id", "journal_code", "journal_type", "journal_name",
        "status", "posting_date", "period_id", "currency",
        "total_debit", "total_credit", "reference_type", "reference_id",
        "description", "posted", "posted_by", "posted_at",
        "created_by", "created_at", "updated_at",
    ],
    "receivables": [
        "id", "tenant_id", "ar_code", "customer_id", "invoice_id",
        "amount", "currency", "amount_paid", "amount_outstanding",
        "due_date", "status", "days_overdue", "dunning_stage",
        "created_by", "created_at", "updated_at",
    ],
    "payables": [
        "id", "tenant_id", "ap_code", "supplier_id", "bill_id",
        "amount", "currency", "amount_paid", "amount_outstanding",
        "due_date", "status", "days_overdue",
        "created_by", "created_at", "updated_at",
    ],
    # ---- master-data ----
    "items": [
        "id", "tenant_id", "item_code", "item_name", "item_type",
        "category_id", "uom", "status", "description", "attributes",
        "created_by", "created_at", "updated_at",
    ],
    "categories": [
        "id", "tenant_id", "category_code", "category_name", "parent_id",
        "level", "path", "is_active", "icon", "created_by",
        "created_at", "updated_at",
    ],
    "uoms": [
        "id", "tenant_id", "uom_code", "uom_name", "uom_class",
        "is_base", "base_uom_id", "conversion_factor", "created_at",
    ],
    # ---- analytics ----
    "dashboards": [
        "id", "tenant_id", "dashboard_code", "dashboard_name", "category",
        "layout", "widget_ids", "is_default", "is_public", "owner_id",
        "shared_with", "created_by", "created_at", "updated_at",
    ],
    "reports": [
        "id", "tenant_id", "report_code", "report_name", "report_type",
        "dataset", "filters", "columns", "sort", "aggregations",
        "is_public", "owner_id", "created_by", "created_at",
        "updated_at",
    ],
    # ---- integration ----
    "integrations": [
        "id", "tenant_id", "integration_code", "integration_name",
        "integration_type", "endpoint", "auth_type", "auth_config",
        "headers", "version", "status", "enabled", "retry_policy",
        "last_run_at", "next_run_at", "rate_limit", "created_by",
        "created_at", "updated_at",
    ],
    "sync_runs": [
        "id", "tenant_id", "integration_id", "run_code", "direction",
        "status", "records_total", "records_success", "records_failed",
        "started_at", "finished_at", "error_message", "log_url",
        "triggered_by", "created_at",
    ],
    # ---- mobile ----
    "mobile_devices": [
        "id", "tenant_id", "device_uuid", "device_name", "platform",
        "os_version", "app_version", "push_token", "last_login_at",
        "last_ip", "user_id", "status", "registered_at",
        "created_at", "updated_at",
    ],
    "mobile_sessions": [
        "id", "tenant_id", "session_id", "user_id", "device_id",
        "login_at", "logout_at", "last_active_at", "ip_address",
        "location_lat", "location_lng", "status", "revoked_at",
        "created_at",
    ],
}

# ---- Struct extraction (reused from V2) ----
FIELD_LINE_RE = re.compile(r"\s*pub\s+(\w+)\s*:")

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
            m = re.search(r"pub\s+struct\s+(\w+)", line)
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
                fields.append(fm.group(1))
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
) -> Optional[List[str]]:
    for s in query_as_structs:
        if s in file_structs: return file_structs[s]
        if s in service_structs: return service_structs[s]
    if prefixed and prefixed in TABLE_COLUMNS_V3:
        return TABLE_COLUMNS_V3[prefixed]
    if unprefixed and unprefixed in TABLE_COLUMNS_V3:
        return TABLE_COLUMNS_V3[unprefixed]
    if unprefixed:
        base = unprefixed[:-1] if unprefixed.endswith("s") else unprefixed
        if unprefixed.endswith("ies"):
            base = unprefixed[:-3] + "y"
        pascal = "".join(seg.capitalize() for seg in base.split("_"))
        for c in [pascal, pascal + "Model", pascal + "Entity", pascal + "Record"]:
            if c in file_structs: return file_structs[c]
            if c in service_structs: return service_structs[c]
        for prefix in ["billing_", "ticket_", "wms_", "scm_", "erp_", "finance_", "master_data_", "analytics_", "integration_", "mobile_", "plugin_billing_", "plugin_wms_", "plugin_scm_", "plugin_erp_", "plugin_finance_"]:
            key = prefix + unprefixed
            if key in TABLE_COLUMNS_V3: return TABLE_COLUMNS_V3[key]
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
    def repl(m: "re.Match[str]") -> str:
        nonlocal fixes
        prefix = m.group(1)
        suffix = m.group(2)
        full = m.group(0)
        cols = columns_for_table(match_table_name(full), match_prefixed_table(full),
                                service_structs, file_structs, qas)
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
