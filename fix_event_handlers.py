import os
import sys

services = [
    "scm", "pdm", "finance", "srm", "rd", "portal", "ehs", "lims",
    "doc", "ai", "monitor", "integration", "gis", "mobile", "hrm"
]

svc_dir = "/Users/air/TOPEMS/svc"

for svc in services:
    main_rs = os.path.join(svc_dir, svc, "src", "main.rs")
    if not os.path.exists(main_rs):
        print(f"SKIP {svc}: no main.rs")
        continue

    with open(main_rs, "r") as f:
        content = f.read()

    if "mod event_handlers" in content:
        print(f"SKIP {svc}: already has mod event_handlers")
        continue

    if "start_event_subscribers" in content:
        print(f"SKIP {svc}: already has start_event_subscribers")
        continue

    lines = content.split("\n")

    mod_insert_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("pub mod ") or stripped.startswith("mod "):
            mod_insert_idx = i

    if mod_insert_idx == -1:
        print(f"SKIP {svc}: no mod lines found")
        continue

    start_insert_idx = -1
    for i, line in enumerate(lines):
        if "init_db" in line and "if let Err" in line:
            brace_count = 0
            for j in range(i, len(lines)):
                brace_count += lines[j].count("{") - lines[j].count("}")
                if brace_count == 0 and j > i:
                    start_insert_idx = j
                    break
            break

    if start_insert_idx == -1:
        for i, line in enumerate(lines):
            if "test_database_connection" in line or ("create_database_pool" in line and "await" in line):
                start_insert_idx = i + 1
                break

    if start_insert_idx == -1:
        print(f"SKIP {svc}: could not find insert position for start call")
        continue

    service_label = svc.upper()
    lines.insert(mod_insert_idx + 1, "mod event_handlers;")
    start_insert_idx += 1
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
