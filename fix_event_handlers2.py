import os
import re

services = [
    "scm", "pdm", "finance", "srm", "rd", "portal", "ehs", "lims",
    "doc", "ai", "monitor", "integration", "gis", "mobile", "hrm",
    "crm", "erp", "pm"
]

svc_dir = "/Users/air/TOPEMS/svc"

for svc in services:
    main_rs = os.path.join(svc_dir, svc, "src", "main.rs")
    if not os.path.exists(main_rs):
        print(f"SKIP {svc}: no main.rs")
        continue

    with open(main_rs, "r") as f:
        content = f.read()

    if "start_event_subscribers" in content:
        print(f"SKIP {svc}: already has start_event_subscribers")
        continue

    lines = content.split("\n")

    # 1. Find where to insert mod event_handlers
    # Strategy: after the last #![allow(...)] attribute, before the first use statement
    mod_insert_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("#!["):
            mod_insert_idx = i
        elif stripped.startswith("use ") or stripped.startswith("pub mod ") or stripped.startswith("mod "):
            if mod_insert_idx == -1:
                mod_insert_idx = i - 1
            break

    if mod_insert_idx == -1:
        # Fallback: insert at line 0
        mod_insert_idx = -1

    # 2. Find where to insert the start call
    start_insert_idx = -1
    # Strategy: after init_db if let Err block
    for i, line in enumerate(lines):
        if "init_db" in line and "if let Err" in line:
            brace_count = 0
            started = False
            for j in range(i, len(lines)):
                brace_count += lines[j].count("{") - lines[j].count("}")
                if "{" in lines[j]:
                    started = True
                if started and brace_count == 0 and j > i:
                    start_insert_idx = j
                    break
            break

    if start_insert_idx == -1:
        # Fallback: after create_database_pool await line
        for i, line in enumerate(lines):
            if "create_database_pool" in line and ".await" in line:
                start_insert_idx = i + 1
                break

    if start_insert_idx == -1:
        # Fallback: after "数据库连接成功" line
        for i, line in enumerate(lines):
            if "数据库连接成功" in line:
                start_insert_idx = i + 1
                break

    if start_insert_idx == -1:
        print(f"SKIP {svc}: could not find insert position for start call")
        continue

    service_label = svc.upper()

    # Insert mod event_handlers
    if "mod event_handlers" not in content:
        mod_line = "mod event_handlers;"
        lines.insert(mod_insert_idx + 1, mod_line)
        start_insert_idx += 1

    # Insert start_event_subscribers call
    start_code = f'''
    if let Err(e) = event_handlers::start_event_subscribers(pool.clone()).await {{
        tracing::warn!("⚠️ {service_label} 事件订阅者启动失败: {{}}", e);
    }}
'''
    lines.insert(start_insert_idx + 1, start_code)

    with open(main_rs, "w") as f:
        f.write("\n".join(lines))

    print(f"FIXED {svc}")

print("\nDone!")
