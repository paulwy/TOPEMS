#!/usr/bin/env bash
# =============================================================================
# Phase 7-2: React Query Migration — Shell Patch Script
# =============================================================================
# Adds useQuery/useMutation imports + migration guide comments to 5 module pages.
# Strategy: import insertion + TODO annotation (safe, idempotent, no auto-replace).
# =============================================================================

exec python3 - "$@" <<'PYTHON_SCRIPT'
import sys
import os
import shutil
import glob as globmod

project_root = "/Users/air/TOPEMS/apps/web/src"
backup_ext = ".bak.phase7-2"
tracking_tag = "// Phase 7-2: React Query migration tagged"

modules = [
    {
        "key": "erp",
        "rel_path": "pages/erp/VoucherManagementPage.tsx",
        "query_key": "erp-vouchers",
        "api_var": "erpApi",
        "label": "凭证管理 (VoucherManagementPage)",
    },
    {
        "key": "wms",
        "rel_path": "pages/wms/InventoryPage.tsx",
        "query_key": "wms-inventory",
        "api_var": "wmsApi",
        "label": "库存管理 (InventoryPage)",
        "alt_patterns": [
            "pages/wms/*Material*.tsx",
            "pages/wms/*Inventory*.tsx",
        ],
    },
    {
        "key": "mes",
        "rel_path": "pages/mes/ProductionOrderManagementPage.tsx",
        "query_key": "mes-production-orders",
        "api_var": "mesApi",
        "label": "生产工单 (ProductionOrderManagementPage)",
        "alt_patterns": [
            "pages/mes/*Order*.tsx",
        ],
    },
    {
        "key": "crm",
        "rel_path": "pages/crm/CustomerManagementPage.tsx",
        "query_key": "crm-customers",
        "api_var": "crmApi",
        "label": "客户管理 (CustomerManagementPage)",
        "alt_patterns": [
            "pages/crm/*Customer*.tsx",
            "pages/crm/*Contact*.tsx",
        ],
    },
    {
        "key": "hrm",
        "rel_path": "pages/hrm/HrmEmployeePage.tsx",
        "query_key": "hrm-employees",
        "api_var": "hrmApi",
        "label": "员工管理 (HrmEmployeePage)",
        "alt_patterns": [
            "pages/hrm/*Employee*.tsx",
            "pages/hrm/*Staff*.tsx",
        ],
    },
]

RQ_IMPORT = "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';"

MIGRATION_COMMENT_TEMPLATE = """\
/**
 * TODO: Phase 7-2 — React Query 迁移
 *
 * 模块: {label}
 *
 * 1. 将 useState(loading) + useState(data) + useEffect(fetch) 替换为 useQuery:
 *    const {{ data: response, isLoading, error, refetch }} = useQuery({{
 *      queryKey: ['{query_key}', page, rowsPerPage, searchText],
 *      queryFn: () => {api_var}.getList({{ page: page + 1, pageSize: rowsPerPage, keyword: searchText }}),
 *      placeholderData: (prev) => prev,
 *    }});
 *    const data = response?.data?.items || [];
 *    const total = response?.data?.total || 0;
 *
 * 2. 将 create/update/delete handler 中的 setState + API 调用替换为 useMutation:
 *    const queryClient = useQueryClient();
 *    const deleteMutation = useMutation({{
 *      mutationFn: (id: string) => {api_var}.delete(id),
 *      onSuccess: () => queryClient.invalidateQueries({{ queryKey: ['{query_key}'] }}),
 *    }});
 *
 * 3. 保留 UI 状态（page, rowsPerPage, searchText, dialogOpen 等）的 useState
 */"""

total_processed = 0
total_skipped = 0
total_missing = 0

print("Phase 7-2: React Query Migration")
print("=" * 50)

for mod in modules:
    mod_key = mod["key"]
    rel_path = mod["rel_path"]
    query_key = mod["query_key"]
    api_var = mod["api_var"]
    label = mod["label"]
    alt_patterns = mod.get("alt_patterns", [])

    file_path = os.path.join(project_root, rel_path)

    # If primary path doesn't exist, try alternative patterns
    if not os.path.isfile(file_path):
        found = False
        for pattern in alt_patterns:
            matches = globmod.glob(os.path.join(project_root, pattern))
            if matches:
                # Pick the first match that looks like a list/management page
                for m in sorted(matches):
                    basename = os.path.basename(m)
                    if "Detail" not in basename and "Edit" not in basename and "Create" not in basename:
                        file_path = m
                        found = True
                        print(f"  [ALTERNATE] {mod_key}: found {os.path.relpath(file_path, project_root)}")
                        break
            if found:
                break

        if not os.path.isfile(file_path):
            print(f"  [MISSING] {mod_key}: {rel_path} — not found, skipping")
            total_missing += 1
            continue

    # Read file
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Idempotency check
    if tracking_tag in content:
        print(f"  [SKIP] {mod_key}: already tagged — {os.path.relpath(file_path, project_root)}")
        total_skipped += 1
        continue

    # Backup
    backup_path = file_path + backup_ext
    shutil.copy2(file_path, backup_path)

    lines = content.split("\n")

    # --- Step 1: Add React Query import ---
    last_import_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("import{"):
            last_import_idx = i

    if last_import_idx == -1:
        print(f"  [ERROR] {mod_key}: no import lines found, skipping")
        total_missing += 1
        continue

    has_rq_import = any(RQ_IMPORT in line for line in lines)
    if not has_rq_import:
        lines.insert(last_import_idx + 1, RQ_IMPORT)
        print(f"  [IMPORT] {mod_key}: added useQuery/useMutation import")
    else:
        print(f"  [IMPORT] {mod_key}: React Query import already exists")

    # --- Step 2: Add migration TODO comment ---
    # Re-find last import index (may have shifted after insert)
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("import{"):
            last_import_idx = i

    # Find first non-blank line after imports
    insert_idx = last_import_idx + 1
    while insert_idx < len(lines) and lines[insert_idx].strip() == "":
        insert_idx += 1

    migration_comment = MIGRATION_COMMENT_TEMPLATE.format(
        label=label,
        query_key=query_key,
        api_var=api_var,
    )

    comment_lines = migration_comment.split("\n")
    for i, cl in enumerate(comment_lines):
        lines.insert(insert_idx + i, cl)

    # --- Step 3: Add tracking comment at the end ---
    lines.append("")
    lines.append(tracking_tag)

    new_content = "\n".join(lines)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    total_processed += 1
    print(f"  [DONE] {mod_key}: {os.path.relpath(file_path, project_root)}")

print("")
print("=" * 50)
print(f"Summary: processed={total_processed}, skipped={total_skipped}, missing={total_missing}")
print("")
print("Phase 7-2 React Query Migration: DONE")
PYTHON_SCRIPT
