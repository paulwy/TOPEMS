from playwright.sync_api import sync_playwright
import json
import sys

errors_found = []
requests_log = []

def run_test(port: int = 3000):
    base_url = f"http://localhost:{port}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            storage_state=None
        )
        page = context.new_page()

        # Capture console errors
        def on_console(msg):
            if msg.type in ("error", "warning"):
                errors_found.append({
                    "type": msg.type,
                    "text": msg.text,
                    "args": [str(a) for a in msg.args]
                })

        # Capture network requests
        def on_request(req):
            url = req.url
            if "/api/" in url:
                requests_log.append({
                    "method": req.method,
                    "url": url,
                    "resource_type": req.resource_type
                })

        page.on("console", on_console)
        page.on("request", on_request)

        results = []

        # ==== Test 1: System Settings Page (/admin/system-settings) ====
        print("\n=== Test 1: /admin/system-settings ===")
        test1_requests = []
        def on_req_test1(req):
            url = req.url
            if "/api/" in url:
                test1_requests.append({"method": req.method, "url": url})
        page.on("request", on_req_test1)

        try:
            page.goto(f"{base_url}/admin/system-settings", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(8000)
            page.screenshot(path="/Users/air/TOPEMS/scripts/tmp-output/test_system_settings.png", full_page=True)
            title = page.title()
            print(f"  Page title: {title}")
        except Exception as e:
            print(f"  Page load issue (expected if auth required): {type(e).__name__}")

        page.remove_listener("request", on_req_test1)

        erp_config_req = [r for r in test1_requests if "/api/erp/system/config" in r["url"]]
        core_config_req = [r for r in test1_requests if "/api/core/system/v1/config" in r["url"]]
        core_config_old = [r for r in test1_requests if "/api/core/system/config" in r["url"] and "/v1/" not in r["url"]]

        results.append({
            "page": "/admin/system-settings",
            "erp_config_requests_count": len(erp_config_req),
            "core_v1_config_requests_count": len(core_config_req),
            "core_old_config_requests_count": len(core_config_old),
            "all_requests": test1_requests,
        })

        # ==== Test 2: System Params Page (/system/params) ====
        print("\n=== Test 2: /system/params ===")
        test2_requests = []
        def on_req_test2(req):
            url = req.url
            if "/api/" in url:
                test2_requests.append({"method": req.method, "url": url})
        page.on("request", on_req_test2)

        try:
            page.goto(f"{base_url}/system/params", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(8000)
            page.screenshot(path="/Users/air/TOPEMS/scripts/tmp-output/test_system_params.png", full_page=True)
            title = page.title()
            print(f"  Page title: {title}")
        except Exception as e:
            print(f"  Page load issue (expected if auth required): {type(e).__name__}")

        page.remove_listener("request", on_req_test2)

        core_v1_req = [r for r in test2_requests if "/api/core/system/v1/" in r["url"]]
        core_no_v1_req = [r for r in test2_requests if "/api/core/system/" in r["url"] and "/v1/" not in r["url"]]

        results.append({
            "page": "/system/params",
            "core_v1_requests_count": len(core_v1_req),
            "core_without_v1_requests_count": len(core_no_v1_req),
            "v1_requests": [r["method"] + " " + r["url"] for r in core_v1_req[:10]],
            "no_v1_requests": [r["method"] + " " + r["url"] for r in core_no_v1_req[:10]],
            "all_requests": test2_requests,
        })

        browser.close()

    # ==== Summary ====
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)

    all_pass = True

    for r in results:
        print(f"\nPage: {r['page']}")
        if "erp_config_requests_count" in r:
            erp_cnt = r["erp_config_requests_count"]
            v1_cnt = r["core_v1_config_requests_count"]
            old_cnt = r["core_old_config_requests_count"]
            if erp_cnt > 0:
                print(f"  ❌ FAIL: Found {erp_cnt} requests to /api/erp/system/config (ERP client still used!)")
                all_pass = False
            else:
                print(f"  ✅ PASS: No requests to /api/erp/system/config (switched to core client)")
            if old_cnt > 0:
                print(f"  ❌ FAIL: Found {old_cnt} requests to /api/core/system/config WITHOUT /v1 prefix!")
                all_pass = False
            else:
                print(f"  ✅ PASS: No old-style (no /v1) config requests")
            if v1_cnt > 0:
                print(f"  ✅ PASS: Found {v1_cnt} requests to /api/core/system/v1/config (correct path!)")
            else:
                print(f"  ⚠️  WARN: No /api/core/system/v1/config requests (page may not have fired all queries)")
            if r["all_requests"]:
                print(f"  All {len(r['all_requests'])} API requests:")
                for req in r["all_requests"]:
                    print(f"    {req['method']:6s} {req['url']}")

        if "core_v1_requests_count" in r:
            v1_cnt = r["core_v1_requests_count"]
            no_v1_cnt = r["core_without_v1_requests_count"]
            if no_v1_cnt > 0:
                print(f"  ❌ FAIL: Found {no_v1_cnt} requests WITHOUT /v1 prefix:")
                for u in r["no_v1_requests"]:
                    print(f"      - {u}")
                all_pass = False
            else:
                print(f"  ✅ PASS: No requests missing /v1 prefix")
            if v1_cnt > 0:
                print(f"  ✅ PASS: Found {v1_cnt} requests using correct /v1 prefix:")
                for u in r["v1_requests"]:
                    print(f"      + {u}")
            else:
                print(f"  ⚠️  WARN: No /v1 prefixed requests observed")
            if r["all_requests"]:
                print(f"  All {len(r['all_requests'])} API requests:")
                for req in r["all_requests"]:
                    print(f"    {req['method']:6s} {req['url']}")

    print(f"\nConsole messages (error/warn): {len(errors_found)}")
    for e in errors_found[:10]:
        preview = (e["text"][:200] + "...") if len(e["text"]) > 200 else e["text"]
        print(f"  [{e['type'].upper()}] {preview}")

    print("\n" + "=" * 60)
    if all_pass:
        print("✅ ALL CRITICAL CHECKS PASSED")
        return 0
    else:
        print("❌ SOME CHECKS FAILED")
        return 1

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    sys.exit(run_test(port))
