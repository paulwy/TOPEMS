#!/usr/bin/env python3
"""
Analyze TSX files for Chinese strings and report what needs to be converted.
"""

import re
import json
import os
import sys
from pathlib import Path

FILES_TO_PROCESS = [
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/BatchManagementPage.tsx', 'wms', 'batch_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InboundOrderPage.tsx', 'wms', 'inbound_order_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InboundPage.tsx', 'wms', 'inbound_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InventoryPage.tsx', 'wms', 'inventory_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/InventoryReportPage.tsx', 'wms', 'inventory_report_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/LocationPage.tsx', 'wms', 'location_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundOrderPage.tsx', 'wms', 'outbound_order_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/OutboundPage.tsx', 'wms', 'outbound_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/ReplenishmentPage.tsx', 'wms', 'replenishment_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/SerialNumberPage.tsx', 'wms', 'serial_number_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/StockTakePage.tsx', 'wms', 'stocktake_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/SupplierManagementPage.tsx', 'wms', 'supplier_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/wms/TransferPage.tsx', 'wms', 'transfer_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/WorkStationPage.tsx', 'mes', 'work_station_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionProcessPage.tsx', 'mes', 'production_process_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProcessRoutePage.tsx', 'mes', 'process_route_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProcessFlowPage.tsx', 'mes', 'process_flow_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/EquipmentOEEPage.tsx', 'mes', 'equipment_oee_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/EquipmentManagementPage.tsx', 'mes', 'equipment_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialIssuePage.tsx', 'mes', 'material_issue_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialReturnPage.tsx', 'mes', 'material_return_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialBOMPage.tsx', 'mes', 'material_bom_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MaterialRequirementPage.tsx', 'mes', 'material_requirement_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/WorkReportPage.tsx', 'mes', 'work_report_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/TeamManagementPage.tsx', 'mes', 'team_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionRecordPage.tsx', 'mes', 'production_record_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionOrderDetailPage.tsx', 'mes', 'production_order_detail_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionOrderManagementPage.tsx', 'mes', 'production_order_management_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/ProductionSchedulePage.tsx', 'mes', 'production_schedule_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/QualityInspectionPage.tsx', 'mes', 'quality_inspection_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/WorkOrderPage.tsx', 'mes', 'work_order_page'),
    ('/Users/air/TOPEMS/apps/web/src/pages/mes/MesQualityPage.tsx', 'mes', 'mes_quality_page'),
]

ZH_JSON_PATH = '/Users/air/TOPEMS/apps/web/src/i18n/locales/zh.json'
EN_JSON_PATH = '/Users/air/TOPEMS/apps/web/src/i18n/locales/en.json'

CN_CHAR = r'[\u4e00-\u9fff]'

def find_chinese_strings(content):
    """Find all Chinese string literals in the content."""
    results = []
    lines = content.split('\n')
    pattern = re.compile(
        r"""(?P<quote>['"`])(?P<content>(?:\\.|(?!\1).)*""" + CN_CHAR + r"""(?:\\.|(?!\1).)*)(?P=quote)""",
        re.DOTALL
    )
    
    line_starts = [0]
    for line in lines:
        line_starts.append(line_starts[-1] + len(line) + 1)
    
    for match in pattern.finditer(content):
        start = match.start()
        line_num = 0
        for i, ls in enumerate(line_starts):
            if ls > start:
                line_num = i - 1
                break
        
        if line_num < len(lines):
            line = lines[line_num]
            stripped = line.lstrip()
            if stripped.startswith('//') or stripped.startswith('*'):
                continue
        
        results.append({
            'start': start,
            'end': match.end(),
            'quote': match.group('quote'),
            'content': match.group('content'),
            'line': line_num + 1,
            'line_content': lines[line_num].strip() if line_num < len(lines) else '',
        })
    
    return results


def main():
    with open(ZH_JSON_PATH, 'r', encoding='utf-8') as f:
        zh_data = json.load(f)
    with open(EN_JSON_PATH, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    
    print("=== File Analysis ===")
    total_files = 0
    total_strings = 0
    total_new_keys_needed = 0
    
    for file_path, module, page_scope in FILES_TO_PROCESS:
        if not os.path.exists(file_path):
            print(f"NOT FOUND: {file_path}")
            continue
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already converted
        if 'useTranslation' in content and f"{module}.{page_scope}." in content:
            print(f"SKIP (already converted): {os.path.basename(file_path)}")
            continue
        
        chinese_strings = find_chinese_strings(content)
        
        if not chinese_strings:
            print(f"SKIP (no Chinese): {os.path.basename(file_path)}")
            continue
        
        # Get existing keys
        existing_keys = set()
        existing_values = {}
        if module in zh_data and page_scope in zh_data[module]:
            for k, v in zh_data[module][page_scope].items():
                if isinstance(v, str):
                    existing_keys.add(k)
                    existing_values[v] = k
        
        # Find unique Chinese strings
        unique_strings = set()
        for cs in chinese_strings:
            unique_strings.add(cs['content'])
        
        # Count how many need new keys
        new_keys_needed = sum(1 for s in unique_strings if s not in existing_values)
        
        total_files += 1
        total_strings += len(chinese_strings)
        total_new_keys_needed += new_keys_needed
        
        print(f"\n{os.path.basename(file_path)} ({module}.{page_scope})")
        print(f"  Chinese strings: {len(chinese_strings)}, Unique: {len(unique_strings)}, New keys needed: {new_keys_needed}")
    
    print(f"\n=== Summary ===")
    print(f"Files needing conversion: {total_files}")
    print(f"Total Chinese strings: {total_strings}")
    print(f"Total new keys needed: {total_new_keys_needed}")


if __name__ == '__main__':
    main()
