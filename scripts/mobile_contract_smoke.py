#!/usr/bin/env python3
"""mobile 前端契约全量实跑冒烟脚本
- 从 apps/mobile/src/api/*.ts 提取前端契约端点（方法+路径模板）
- 自动重签 JWT（JWT_SECRET + test_admin）
- 逐端点实跑断言：路由缺失(http404空body)或处理异常(http>=500 或 body.code==500) 记 FAIL
- 按模块分组输出报告
用法: python3 scripts/mobile_contract_smoke.py
"""
import base64
import glob
import hashlib
import hmac
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(BASE, "apps", "mobile", "src", "api")
MOBILE_URL = "http://localhost:8070/api/mobile"
TEST_UID = "e91e2228-ab9d-4ac3-99f4-fdcd9c723f21"
TEST_UUID = "00000000-0000-0000-0000-000000000099"


def load_jwt_secret() -> str:
    """JWT_SECRET 优先取环境变量，其次读项目 .env，避免敏感信息入库。"""
    if os.environ.get("JWT_SECRET"):
        return os.environ["JWT_SECRET"]
    env_path = os.path.join(BASE, ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            line = line.strip()
            if line.startswith("JWT_SECRET="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("缺少 JWT_SECRET：请设置环境变量或提供项目 .env")


def load_database_url() -> str:
    """DATABASE_URL 优先取环境变量，其次读项目 .env。"""
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env_path = os.path.join(BASE, ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def prepare_data() -> None:
    """准备冒烟测试数据：确保 mobile.mobile_users 存在测试用户。
    mobile.devices.user_id 外键指向 mobile.mobile_users，缺记录时
    POST /device/register 会报外键约束错误（环境数据问题而非代码缺陷）。"""
    db = load_database_url()
    if not db:
        print("[prepare] 跳过：缺少 DATABASE_URL")
        return
    try:
        subprocess.run(
            ["psql", db, "-c",
             f"INSERT INTO mobile.mobile_users (id, username, password_hash) VALUES ('{TEST_UID}', 'test_admin', 'smoke-not-a-real-hash') ON CONFLICT (id) DO NOTHING"],
            capture_output=True, timeout=15,
            check=False,
        )
    except Exception as e:
        print(f"[prepare] 准备测试数据失败（非阻塞）: {e}")

# ${var} -> 测试值（可扩展）
VAR_DEFAULTS = {
    "id": TEST_UUID,
    "userId": TEST_UUID,
    "taskId": TEST_UUID,
    "orderId": TEST_UUID,
    "workstationId": TEST_UUID,
    "eventId": TEST_UUID,
    "notificationId": TEST_UUID,
    "category": "general",
    "date": "2026-10-05",
    "startDate": "2026-09-01",
    "endDate": "2026-10-05",
    "type": "inventory",
    "page": 1,
    "pageSize": 10,
    "status": "active",
    "keyword": "test",
}

# POST/PUT/PATCH 写操作的最小合法 body（按路径模板精确匹配，否则空 {}）
POST_BODIES = {
    "/customer": {"name": "冒烟测试客户", "customer_type": "enterprise", "owner_id": "e91e2228-ab9d-4ac3-99f4-fdcd9c723f21", "phone": "13800000000", "email": "smoke@test.local"},
    "/inventory": {"sku": "SMOKE-SKU-001", "name": "冒烟测试库存", "quantity": 10, "unit": "件"},
    "/attendance/check-in": {"lat": 38.04, "lng": 114.51},
    "/attendance/check-out": {"lat": 38.04, "lng": 114.51},
    "/device/register": {"device_id": "smoke-device-1", "device_name": "冒烟设备", "device_type": "android", "os_type": "android", "os_version": "14", "app_version": "1.0.0", "push_token": "smoke-device-token"},
    "/documents": {"title": "冒烟测试文档", "category": "general", "content": "smoke"},
    "/approval/tasks/${id}/delegate": {"userId": TEST_UUID, "reason": "冒烟委派"},
    "/production/orders": {"product_name": "冒烟订单", "product_code": "SMOKE-001", "quantity": 10},
    "/approval/tasks/${id}/approve": {"comment": "smoke"},
    "/approval/tasks/${id}/reject": {"comment": "smoke"},
    "/user/change-password": {"oldPassword": "Test@123", "newPassword": "Test@1234"},
    "/push/devices/register": {"device_token": "smoke-push-token", "platform": "android", "device_model": "Pixel-7", "app_version": "1.0.0", "os_version": "14"},
    "/push/notifications": {"title": "冒烟通知", "body": "smoke", "notification_type": "general", "target_type": "all", "target_ids": []},
    "/push/notifications/broadcast": {"title": "冒烟广播", "body": "smoke", "notification_type": "general", "target_type": "all", "target_ids": []},
    "/push/templates": {"name": f"冒烟模板-{int(time.time())}", "title_template": "通知", "body_template": "内容", "notification_type": "general"},
    "/scan/barcode": {"barcode": "SMOKE-001"},
    "/scan/qrcode": {"qr_data": "SMOKE-001"},
}

# GET 端点所需的 query 参数（模拟前端必带参数，避免业务 400 误报）
QUERY_PARAMS = {
    "/inventory/scan": {"barcode": "SMOKE-001"},
}


def b64(d: bytes) -> str:
    return base64.urlsafe_b64encode(d).rstrip(b"=").decode()


def issue_token() -> str:
    now = int(time.time())
    claims = {
        "sub": TEST_UID, "username": "test_admin",
        "role": "admin", "roles": ["admin"], "permissions": [],
        "is_superuser": True, "exp": now + 3600, "iat": now,
        "email": None, "department": None,
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "department_id": None, "position_id": None,
    }
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64(json.dumps(claims, separators=(",", ":")).encode())
    sig = b64(hmac.new(load_jwt_secret().encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def extract_endpoints():
    """解析 TS 文件提取 (method, path_template, file) 列表并去重"""
    eps = []
    for path in sorted(glob.glob(os.path.join(API_DIR, "*.ts"))):
        fname = os.path.basename(path)
        src = open(path, encoding="utf-8").read()
        for m in re.finditer(r"apiClient\.(get|post|put|delete|patch)\(\s*['\"`]([^'\"`]+)['\"`]", src):
            method, p = m.group(1).upper(), m.group(2)
            if p.startswith("/"):
                eps.append((method, p, fname))
    # 去重（同一方法+路径模板只测一次，保留首个来源文件）
    seen, out = set(), []
    for e in eps:
        key = (e[0], e[1])
        if key not in seen:
            seen.add(key)
            out.append(e)
    return out


def fill_vars(path_tmpl: str) -> str:
    def repl(m):
        var = m.group(1).strip()
        if var in VAR_DEFAULTS:
            return str(VAR_DEFAULTS[var])
        if var.endswith("Id"):
            return TEST_UUID
        return TEST_UUID
    return re.sub(r"\$\{([^}]+)\}", repl, path_tmpl)


def call(method: str, path: str, tmpl: str, token: str):
    url = MOBILE_URL + path
    q = QUERY_PARAMS.get(tmpl)
    if q:
        url += "?" + "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in q.items())
    body = None
    headers = {"Authorization": f"Bearer {token}"}
    data_bytes = None
    if method in ("POST", "PUT", "PATCH"):
        body = POST_BODIES.get(tmpl, {})  # 最小 body：缺必填字段时上游返回 4xx 业务错误，可接受
        data_bytes = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        raw = resp.read()
        return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, raw
    except Exception as e:  # 网络异常
        return -1, str(e).encode()


def main():
    prepare_data()
    eps = extract_endpoints()
    print(f"前端契约端点(去重后): {len(eps)}")
    token = issue_token()
    groups = {}
    for method, tmpl, fname in eps:
        path = fill_vars(tmpl)
        status, raw = call(method, path, tmpl, token)
        body_code = None
        body = None
        try:
            body = json.loads(raw.decode())
            body_code = body.get("code")
        except Exception:
            pass
        # 判定
        reason = None
        if status == -1:
            reason = "network_error"
        elif status == 404 and len(raw) == 0:
            reason = "route_missing"
        elif status >= 500 or body_code == 500:
            reason = "handler_error"
        verdict = "FAIL" if reason else "PASS"
        entry = {
            "method": method, "tmpl": tmpl, "path": path, "fname": fname,
            "status": status, "body_code": body_code, "verdict": verdict,
            "reason": reason,
        }
        groups.setdefault(fname, []).append(entry)
    # 报告
    total = len(eps)
    fails = [e for g in groups.values() for e in g if e["verdict"] == "FAIL"]
    warns = [e for g in groups.values() for e in g
             if e["verdict"] == "PASS" and (e["status"] >= 400 or e["body_code"] not in (None, 200))]
    print(f"{'='*70}")
    for fname in sorted(groups):
        g = groups[fname]
        p = sum(1 for e in g if e["verdict"] == "PASS")
        f = len(g) - p
        print(f"[{fname}] {p}/{len(g)} PASS, {f} FAIL")
        for e in g:
            if e["verdict"] == "FAIL":
                print(f"  FAIL {e['method']:6s} {e['tmpl']} -> http={e['status']} body={e['body_code']} ({e['reason']})")
    print(f"{'='*70}")
    print(f"总计: {len(eps)-len(fails)}/{len(eps)} PASS, {len(fails)} FAIL")
    if warns:
        print(f"业务性非2xx(WARN, 不阻塞): {len(warns)}")
        for e in warns[:15]:
            print(f"  WARN {e['method']:6s} {e['tmpl']} -> http={e['status']} body={e['body_code']}")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
