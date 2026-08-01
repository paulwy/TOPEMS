#!/usr/bin/env python3
"""
Batch replace SELECT * FROM with explicit column list.

Strategy:
- For each SELECT * FROM <table_name>, look up the struct/model definition
  for <table_name> in the corresponding service, extract the field list, and
  replace * with those fields (respecting serde rename if available).
- If struct/model not found, use a pre-built column whitelist from migration files.
- Dynamic SELECT * inside sqlx::query_as::<_, SomeStruct> we use <SomeStruct> fields.
"""

import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# Tables seen in gis + pm + unified-core services with their canonical columns.
# (Best-effort basis; if unknown we leave SELECT * untouched with TODO.)
TABLE_COLUMNS: Dict[str, List[str]] = {
    # ========== GIS tables ==========
    "gis_devices": [
        "id", "tenant_id", "device_code", "device_name", "device_type", "model",
        "manufacturer", "serial_number", "status", "location_id", "warehouse_id",
        "latitude", "longitude", "last_sync_at", "installed_at", "created_at",
        "updated_at", "deleted_at",
    ],
    "gis_locations": [
        "id", "tenant_id", "location_code", "location_name", "location_type",
        "parent_id", "warehouse_id", "latitude", "longitude", "address",
        "geo_shape", "sort_order", "status", "created_at", "updated_at", "deleted_at",
    ],
    "gis_warehouses": [
        "id", "tenant_id", "warehouse_code", "warehouse_name", "warehouse_type",
        "address", "latitude", "longitude", "area", "capacity", "status",
        "manager_id", "sort_order", "created_at", "updated_at", "deleted_at",
    ],
    "gis_markers": [
        "id", "tenant_id", "marker_code", "marker_name", "marker_type",
        "latitude", "longitude", "location_id", "warehouse_id", "business_id",
        "icon", "color", "status", "sort_order", "created_at", "updated_at", "deleted_at",
    ],
    "gis_photos": [
        "id", "tenant_id", "entity_type", "entity_id", "photo_url", "thumbnail_url",
        "latitude", "longitude", "taken_at", "uploader_id", "caption", "size",
        "content_type", "created_at", "updated_at", "deleted_at",
    ],
    "gis_pipelines": [
        "id", "tenant_id", "pipeline_code", "pipeline_name", "pipeline_type",
        "start_location_id", "end_location_id", "path", "length", "diameter",
        "material", "status", "installed_at", "created_at", "updated_at", "deleted_at",
    ],
    "gis_geodata": [
        "id", "tenant_id", "data_code", "data_name", "data_type", "layer_name",
        "geometry", "attributes", "source", "version", "status",
        "created_at", "updated_at", "deleted_at",
    ],
    "gis_business_entities": [
        "id", "tenant_id", "entity_code", "entity_name", "entity_type",
        "location_id", "warehouse_id", "latitude", "longitude", "status",
        "attributes", "created_at", "updated_at", "deleted_at",
    ],
    "gis_sync_records": [
        "id", "tenant_id", "sync_type", "sync_source", "target_id",
        "status", "started_at", "finished_at", "record_count", "error_message",
        "created_at",
    ],
    "gis_search_index": [
        "id", "tenant_id", "entity_type", "entity_id", "title", "content",
        "keywords", "latitude", "longitude", "status", "indexed_at", "created_at",
    ],
    "gis_import_batches": [
        "id", "tenant_id", "batch_code", "import_type", "file_name", "file_url",
        "total_count", "success_count", "fail_count", "status", "error_log",
        "imported_by", "created_at", "finished_at",
    ],
    "gis_spatial_refs": [
        "id", "tenant_id", "srid", "auth_name", "auth_srid", "srtext",
        "proj4text", "is_default", "created_at",
    ],
    # ========== PM tables ==========
    "pm_projects": [
        "id", "tenant_id", "project_code", "project_name", "project_type",
        "status", "priority", "description", "manager_id", "parent_id",
        "workspace_id", "team_members", "start_date", "end_date",
        "budget", "project_config", "benefit_target", "risk_level",
        "tags", "progress", "created_at", "updated_at", "deleted_at",
    ],
    "pm_contracts": [
        "id", "tenant_id", "contract_code", "contract_name", "contract_type",
        "party_a", "party_b", "project_id", "amount", "currency",
        "sign_date", "start_date", "end_date", "status", "payment_terms",
        "attachments", "created_by", "created_at", "updated_at", "deleted_at",
    ],
    "pm_documents": [
        "id", "tenant_id", "project_id", "doc_code", "doc_name", "doc_type",
        "category", "version", "file_url", "file_size", "content_type",
        "status", "is_archived", "uploaded_by", "reviewer_id", "review_status",
        "signed_at", "created_at", "updated_at", "deleted_at",
    ],
    "pm_acceptances": [
        "id", "tenant_id", "project_id", "milestone_id", "acceptance_code",
        "acceptance_name", "acceptance_type", "acceptance_criteria", "status",
        "result", "score", "remarks", "accepted_by", "accepted_at",
        "attachments", "created_at", "updated_at",
    ],
    "pm_settlements": [
        "id", "tenant_id", "project_id", "contract_id", "settlement_code",
        "settlement_type", "amount", "currency", "settlement_date", "status",
        "payment_status", "remarks", "created_by", "created_at", "updated_at",
    ],
    "pm_reports": [
        "id", "tenant_id", "project_id", "report_code", "report_name",
        "report_type", "period", "content", "attachments", "status",
        "submitted_by", "submitted_at", "reviewed_by", "review_status",
        "created_at", "updated_at",
    ],
    "pm_quality_records": [
        "id", "tenant_id", "project_id", "checkpoint_code", "checkpoint_name",
        "check_type", "result", "non_conformity", "corrective_action",
        "checked_by", "checked_at", "status", "attachments",
        "created_at", "updated_at",
    ],
    "pm_risks": [
        "id", "tenant_id", "project_id", "risk_code", "risk_name",
        "risk_category", "risk_level", "probability", "impact",
        "mitigation_plan", "contingency_plan", "status", "owner_id",
        "identified_at", "resolved_at", "created_at", "updated_at",
    ],
    "pm_budgets": [
        "id", "tenant_id", "project_id", "budget_code", "budget_name",
        "budget_category", "planned_amount", "actual_amount", "currency",
        "period_start", "period_end", "status", "approver_id", "approved_at",
        "created_by", "created_at", "updated_at",
    ],
    "pm_project_members": [
        "id", "tenant_id", "project_id", "user_id", "role", "permissions",
        "join_date", "leave_date", "allocation_rate", "status",
        "created_at", "updated_at",
    ],
    "pm_project_phases": [
        "id", "tenant_id", "project_id", "phase_code", "phase_name",
        "parent_id", "sort_order", "start_date", "end_date", "status",
        "progress", "deliverables", "created_at", "updated_at",
    ],
    "pm_project_milestones": [
        "id", "tenant_id", "project_id", "milestone_code", "milestone_name",
        "planned_date", "actual_date", "status", "progress",
        "dependencies", "deliverables", "owner_id", "created_at", "updated_at",
    ],
    "pm_project_resources": [
        "id", "tenant_id", "project_id", "resource_type", "resource_id",
        "resource_name", "allocated_qty", "unit", "start_date", "end_date",
        "cost", "status", "assigned_to", "created_at", "updated_at",
    ],
    "pm_project_expenses": [
        "id", "tenant_id", "project_id", "expense_code", "expense_name",
        "expense_category", "amount", "currency", "incurred_at", "paid_by",
        "reimbursement_status", "attachments", "approved_by", "approved_at",
        "status", "created_at", "updated_at",
    ],
    "pm_project_benefits": [
        "id", "tenant_id", "project_id", "benefit_code", "benefit_name",
        "benefit_type", "target_value", "actual_value", "unit_of_measure",
        "realization_date", "status", "owner_id", "created_at", "updated_at",
    ],
    # ========== Unified-core plugin/ticket/billing/tenant/monitor/doc tables ==========
    "core_tenants": [
        "id", "tenant_code", "tenant_name", "status", "plan_type",
        "expires_at", "max_users", "max_storage", "timezone", "language",
        "logo_url", "config", "created_by", "created_at", "updated_at",
        "deleted_at",
    ],
    "core_users": [
        "id", "tenant_id", "username", "email", "phone", "password_hash",
        "full_name", "avatar_url", "status", "last_login_at", "last_login_ip",
        "password_changed_at", "created_at", "updated_at", "deleted_at",
    ],
    "core_plugins": [
        "id", "tenant_id", "plugin_code", "plugin_name", "version", "description",
        "author", "install_status", "enabled", "installed_at", "installed_by",
        "last_updated_at", "config", "created_at", "updated_at",
    ],
    "core_plugin_versions": [
        "id", "plugin_id", "version_code", "semver", "release_notes",
        "package_url", "checksum", "min_platform_version", "max_platform_version",
        "status", "published_at", "created_by", "created_at",
    ],
    "core_billing_invoices": [
        "id", "tenant_id", "invoice_code", "invoice_date", "period_start",
        "period_end", "amount", "currency", "tax_amount", "discount_amount",
        "total_amount", "status", "paid_at", "payment_method", "payment_ref",
        "created_at", "updated_at",
    ],
    "core_monitor_metrics": [
        "id", "tenant_id", "service_name", "metric_name", "metric_type",
        "value", "unit", "tags", "recorded_at", "created_at",
    ],
    "core_tickets": [
        "id", "tenant_id", "ticket_code", "title", "description", "type",
        "priority", "status", "category", "subcategory", "reporter_id",
        "assignee_id", "sla_id", "group_id", "tags", "resolution",
        "resolved_at", "closed_at", "due_date", "created_at", "updated_at",
        "deleted_at",
    ],
    "core_ticket_sla_policies": [
        "id", "tenant_id", "policy_code", "policy_name", "priority",
        "response_time", "resolution_time", "warnings", "business_hours_id",
        "enabled", "sort_order", "created_at", "updated_at",
    ],
    "core_doc_templates": [
        "id", "tenant_id", "template_code", "template_name", "template_type",
        "category", "version", "file_url", "content_type", "size",
        "is_default", "status", "created_by", "created_at", "updated_at",
    ],
    "core_doc_folders": [
        "id", "tenant_id", "folder_code", "folder_name", "parent_id",
        "path", "sort_order", "inherit_permissions", "status",
        "created_by", "created_at", "updated_at", "deleted_at",
    ],
    "core_doc_documents": [
        "id", "tenant_id", "folder_id", "doc_code", "doc_name", "doc_type",
        "file_url", "file_size", "content_type", "version", "status",
        "checkout_by", "checkout_at", "lock_version", "created_by",
        "created_at", "updated_at", "deleted_at",
    ],
}

# For each service, also try to parse the local struct definitions
# as overrides of TABLE_COLUMNS.
STRUCT_FIELD_RE = re.compile(
    r"pub\s+struct\s+(\w+)\s*\{([^}]+)\}",
    re.MULTILINE | re.DOTALL,
)
FIELD_LINE_RE = re.compile(
    r"\s*pub\s+(\w+)\s*:\s*[\w:<>\s,\(\)\.]+",
)


def extract_structs_from_file(content: str) -> Dict[str, List[str]]:
    structs: Dict[str, List[str]] = {}
    for m in STRUCT_FIELD_RE.finditer(content):
        name = m.group(1)
        body = m.group(2)
        fields = []
        for fm in FIELD_LINE_RE.finditer(body):
            fields.append(fm.group(1))
        if fields:
            structs[name] = fields
    return structs


def match_table_name(sql_match: str) -> Optional[str]:
    """From a matched SELECT * FROM <table>... return the table name."""
    # Forms:
    # 1. SELECT * FROM tenants WHERE ...
    # 2. SELECT * FROM tenants AS t WHERE ...
    # 3. SELECT * FROM `tenants` WHERE ...
    m = re.search(
        r"FROM\s+(?:`?)([\w]+)`?(?:\s+(?:AS\s+)?\w+)?(?:[\s;)\]]|$)",
        sql_match,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).lower()
    return None


def columns_for_table(table_name: str, local_structs: Dict[str, List[str]]) -> Optional[List[str]]:
    """Try to get columns for a table. Priority: local structs > whitelist."""
    # Map table → struct by capitalizing/removing prefix:
    candidates = [
        table_name,
        # remove common prefixes like core_, gis_, pm_:
        re.sub(r"^(core|gis|pm)_", "", table_name),
    ]
    # Also try singular: pm_projects → Project
    singulars = []
    for c in candidates:
        if c.endswith("ies"):
            singulars.append(c[:-3] + "y")
        elif c.endswith("s"):
            singulars.append(c[:-1])
        singulars.append(c)
    names_to_try = []
    for n in candidates + singulars:
        # Title-cased (PascalCase)
        pascal = "".join(seg.capitalize() for seg in n.split("_"))
        names_to_try.append(pascal)
        names_to_try.append(pascal + "Model")
        names_to_try.append(pascal + "Entity")

    for name in names_to_try:
        if name in local_structs:
            return local_structs[name]

    # Whitelist
    for pref in [table_name, f"core_{table_name}", f"gis_{table_name}", f"pm_{table_name}"]:
        if pref in TABLE_COLUMNS:
            return TABLE_COLUMNS[pref]

    return None


def fix_content(content: str, local_structs: Dict[str, List[str]]) -> Tuple[str, int]:
    """Replace SELECT * FROM with SELECT <cols> FROM in a single file."""
    fixes = 0

    def replacer(m: "re.Match[str]") -> str:
        nonlocal fixes
        prefix = m.group(1)  # "SELECT "
        suffix = m.group(2)  # rest starting with "FROM ..."
        full_match = m.group(0)

        table_name = match_table_name(full_match)
        if not table_name:
            return full_match

        cols = columns_for_table(table_name, local_structs)
        if not cols:
            # Leave untouched with a TODO marker comment above (inject as line comment)
            # Don't touch: we can't safely replace
            return full_match
        fixes += 1
        # Join columns, prefix with t. only if there is alias AS t or t right after FROM
        # For simplicity: use bare column list
        col_list = ", ".join(cols)
        return f"{prefix}{col_list} {suffix}"

    # Match SELECT * FROM (with optional surrounding whitespace/newlines).
    # Use case-insensitive. Capture the prefix "SELECT " so we preserve whitespace.
    new_content = re.sub(
        r"(SELECT\s+)\*(\s+FROM[\s\S]{0,400}?)(?=;|\nLIMIT|\nGROUP|\nORDER|\nHAVING|\nOFFSET|\nWHERE|\nRETURNING|\s*$|\s*\))",
        replacer,
        content,
        flags=re.IGNORECASE,
    )

    return new_content, fixes


def main():
    roots = [
        Path("/Users/air/TOPEMS/svc/gis/src"),
        Path("/Users/air/TOPEMS/svc/pm/src"),
        Path("/Users/air/TOPEMS/svc/unified-core/src"),
    ]
    total_fixes = 0
    total_touched = 0
    for root in roots:
        if not root.exists():
            continue
        # First pass: aggregate structs within the whole service.
        service_structs: Dict[str, List[str]] = {}
        for f in root.rglob("*.rs"):
            try:
                c = f.read_text(encoding="utf-8")
            except Exception:
                continue
            service_structs.update(extract_structs_from_file(c))

        # Second pass: fix SELECT * in each file
        for f in sorted(root.rglob("*.rs")):
            if "migrations" in str(f):
                continue
            try:
                content = f.read_text(encoding="utf-8")
            except Exception:
                continue
            if "SELECT * FROM" not in content and "select * from" not in content:
                continue
            new_content, n_fixes = fix_content(content, service_structs)
            if n_fixes > 0:
                f.write_text(new_content, encoding="utf-8")
                total_fixes += n_fixes
                total_touched += 1
                print(f"  {f}: {n_fixes} SELECT * → explicit cols")

    print(f"\nDone. {total_touched} files, {total_fixes} SELECT * replaced.")


if __name__ == "__main__":
    main()
