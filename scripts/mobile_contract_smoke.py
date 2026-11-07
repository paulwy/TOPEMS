#!/usr/bin/env python3
"""mobile 前端契约全量实跑冒烟脚本
- 从 apps/mobile/src/api/*.ts 提取前端契约端点（方法+路径模板）
- 自动重签 JWT（JWT_SECRET + test_admin）
- 逐端点实跑断言：路由缺失(http404空body)或处理异常(http>=500 或 body.code==500) 记 FAIL
- 按模块分组输出报告

安全边界（2026-11-06，与 scripts/web_contract_smoke.py 同一口径）：
  默认 WEB_SMOKE_ENV=local，目标 http://127.0.0.1:8070/api/mobile（本机 mobile 服务）；
  prod 仓库位（TOPEMS_INSTANCE=prod / DSN *_prod）与 prod 目标进程（lsof+ps 库名）默认拒绝，
  授权需 ALLOW_PROD_SMOKE=1 + PROD_SMOKE_CONFIRM + PROD_SMOKE_REASON + 显式 MOBILE_BASE_URL/JWT_SECRET。
  prod 目标一律只读：跳过 prepare_data / pre_create，只跑 GET 端点，不写库、不写数据。
  所有拒绝均发生在建立连接之前。

用法: python3 scripts/mobile_contract_smoke.py [--dry-run]
"""
import base64
import glob
import hashlib
import hmac
import json
import os
import re
import shutil
import socket
import subprocess
import bcrypt
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from urllib.parse import urlparse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(BASE, "apps", "mobile", "src", "api")
LOCAL_DEFAULT_URL = "http://127.0.0.1:8070/api/mobile"
MOBILE_URL = LOCAL_DEFAULT_URL   # 由 resolve_target() 覆盖
TEST_UID = "e91e2228-ab9d-4ac3-99f4-fdcd9c723f21"
TEST_UUID = "00000000-0000-0000-0000-000000000099"

EXIT_CONFIG = 2      # 配置非法
EXIT_ENV = 3         # 运行环境/密钥/连通性不满足
EXIT_PROD_GUARD = 4  # prod 拒绝层

READ_ONLY = False    # prod 目标时由 main() 置 True，禁止任何写库/写数据路径

# 预创建捕获的真实 id（customer/documents/device），供 get/put/delete 消除假 id 业务 404
REAL_IDS = {}
# WMS inventory.warehouse_id NOT NULL：由 prepare_data 从真实库取一个仓库 id 注入载荷
TEST_WAREHOUSE_ID = None


def _fail(code: int, title: str, lines=()):
    """fail-closed：打印可操作提示后退出，绝不静默跳过/降级。"""
    print(f"[mobile-smoke] BLOCKED: {title}", file=sys.stderr)
    for line in lines:
        print(f"  - {line}", file=sys.stderr)
    sys.exit(code)


def project_env_value(key: str):
    """只读项目根 .env 的单个键（不打印值，避免泄露凭据）。"""
    path = os.path.join(BASE, ".env")
    if not os.path.exists(path):
        return None
    try:
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        return None
    return None


def _db_name_from_url(value: str) -> str:
    """从 postgres DSN 取库名；非 PG 或空值返回空串（不打印 DSN 原文）。"""
    if not value.startswith(("postgres://", "postgresql://")):
        return ""
    return (urlparse(value).path or "").lstrip("/").split("?")[0]


def _is_prod_db(db_name: str) -> bool:
    return bool(db_name) and (db_name == "topems_prod" or db_name.endswith("_prod"))


def detect_instance() -> str:
    """识别当前仓库位 prod/dev（与 web 契约冒烟同一判据，只读配置、零网络）。"""
    value = (os.environ.get("TOPEMS_INSTANCE") or "").strip().lower()
    if value in ("prod", "production"):
        return "prod"
    if value in ("dev", "development", "local", "test", "staging"):
        return "dev"
    if value:
        _fail(EXIT_CONFIG, f"TOPEMS_INSTANCE 取值非法: {value!r}", ["允许值: prod | dev（留空则自动识别）"])
    db_url = (os.environ.get("DATABASE_URL") or project_env_value("DATABASE_URL") or "").strip()
    if _is_prod_db(_db_name_from_url(db_url)):
        return "prod"
    return "dev"


def detect_target_instance(host: str, port: int) -> str:
    """只读探测 loopback 监听进程实际连接的库名，返回 prod / dev / unknown。

    与 web 侧同实现：prod 仓库 `.env` 可能指向 topems_test，但服务进程由 launchd 以
    `DATABASE_URL=…/topems_prod` 启动；只读 lsof + ps eww，不建连、不发 HTTP、不打印 DSN。
    """
    if not _is_loopback(host):
        return "unknown"
    lsof = shutil.which("lsof") or ("/usr/sbin/lsof" if os.path.exists("/usr/sbin/lsof") else None)
    if not lsof:
        return "unknown"
    try:
        out = subprocess.run(
            [lsof, "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
            capture_output=True, text=True, timeout=3,
        ).stdout
        pids = [p for p in out.split() if p.isdigit()]
    except (OSError, subprocess.SubprocessError):
        return "unknown"
    saw_db = False
    for pid in pids:
        try:
            env = subprocess.run(
                ["ps", "eww", "-p", pid], capture_output=True, text=True, timeout=3,
            ).stdout
        except (OSError, subprocess.SubprocessError):
            continue
        for token in env.split():
            if not token.startswith(("DATABASE_URL=", "MIGRATE_URL=")):
                continue
            db_name = _db_name_from_url(token.split("=", 1)[1])
            if not db_name:
                continue
            saw_db = True
            if _is_prod_db(db_name):
                return "prod"
    return "dev" if saw_db else "unknown"


def _is_loopback(host: str) -> bool:
    return host in ("127.0.0.1", "localhost", "::1", "0:0:0:0:0:0:0:1")


def resolve_target(dry_run: bool = False):
    """解析 (目标环境, 仓库位, mobile 地址)；所有拒绝均发生在任何网络请求之前。

    环境开关与 web 侧共用 WEB_SMOKE_ENV；mobile 目标 URL 用 MOBILE_BASE_URL，
    prod 授权开关与确认串也与 web 共用（ALLOW_PROD_SMOKE / PROD_SMOKE_CONFIRM / PROD_SMOKE_REASON）。
    """
    env = (os.environ.get("WEB_SMOKE_ENV") or "").strip().lower() or "local"
    if env not in ("local", "test", "prod"):
        _fail(EXIT_CONFIG, f"WEB_SMOKE_ENV 取值非法: {env!r}", ["允许值: local | test | prod"])
    instance = detect_instance()

    if instance == "prod":
        confirm_expected = f"smoke-prod:{socket.gethostname()}:{os.path.basename(BASE)}"
        if env != "prod" and dry_run:
            return env, instance, LOCAL_DEFAULT_URL
        if env != "prod":
            _fail(EXIT_PROD_GUARD, "检测到 prod 仓库位，默认拒绝对它跑 mobile 契约冒烟",
                  [f"当前 WEB_SMOKE_ENV={env}，但 instance=prod（TOPEMS_INSTANCE 或 DATABASE_URL 指向 *_prod）",
                   "不会静默降级为 prod，也不会静默跳过。",
                   "如确需对 prod 跑只读契约检查，必须同时设置：",
                   "  WEB_SMOKE_ENV=prod  ALLOW_PROD_SMOKE=1",
                   f"  PROD_SMOKE_CONFIRM={confirm_expected}",
                   "  PROD_SMOKE_REASON=<变更单号/原因>  MOBILE_BASE_URL=<显式地址>  JWT_SECRET=<显式值>"])
        if os.environ.get("ALLOW_PROD_SMOKE") != "1":
            _fail(EXIT_PROD_GUARD, "prod 冒烟需要显式开关 ALLOW_PROD_SMOKE=1",
                  ["未设置或值不是 1 → fail-closed（不跳过、不降级）。",
                   "确认已获授权后再导出该变量并重跑。"])
        confirm = (os.environ.get("PROD_SMOKE_CONFIRM") or "").strip()
        if confirm != confirm_expected:
            _fail(EXIT_PROD_GUARD, "prod 冒烟需要第二道确认 PROD_SMOKE_CONFIRM",
                  [f"期望值: {confirm_expected}", f"当前值: {confirm or '<未设置>'}",
                   "该值绑定 主机名 + 仓库目录，换机/换目录即失效。"])
        if not (os.environ.get("PROD_SMOKE_REASON") or "").strip():
            _fail(EXIT_PROD_GUARD, "prod 冒烟需要 PROD_SMOKE_REASON（变更单号/原因）",
                  ["该值会打印在日志首部，便于审计追溯。"])
        url = (os.environ.get("MOBILE_BASE_URL") or "").strip()
        if not url:
            _fail(EXIT_PROD_GUARD, "prod 冒烟必须显式 MOBILE_BASE_URL（不提供 prod 默认地址）",
                  ["例如 MOBILE_BASE_URL=http://localhost:8070/api/mobile"])
    elif env == "prod":
        _fail(EXIT_PROD_GUARD, "WEB_SMOKE_ENV=prod，但当前仓库位不是 prod",
              ["为避免误伤本地/CI，拒绝运行；本地请用 WEB_SMOKE_ENV=local|test。",
               "仅 prod 主机可设置 TOPEMS_INSTANCE=prod。"])
    else:
        url = (os.environ.get("MOBILE_BASE_URL") or "").strip() or LOCAL_DEFAULT_URL

    host = (urlparse(url).hostname or "").lower()
    if not host:
        _fail(EXIT_CONFIG, f"MOBILE_BASE_URL 无法解析: {url!r}", ["期望形如 http://127.0.0.1:8070/api/mobile"])
    if dry_run:
        return env, instance, url
    if instance != "prod":
        port = urlparse(url).port or (443 if urlparse(url).scheme == "https" else 80)
        if detect_target_instance(host, port) == "prod":
            _fail(EXIT_PROD_GUARD, "目标 mobile 进程实际连接 *_prod 数据库，默认拒绝",
                  [f"目标: {url}（只读探测监听进程的 DATABASE_URL 库名，未建立任何连接）",
                   "当前仓库位不是 prod，但目标服务连的是 prod 库：不发送任何契约请求。",
                   "请把 MOBILE_BASE_URL 指向测试服务，或在 prod 仓库位按三重授权执行。"])
    if not _is_loopback(host) and os.environ.get("WEB_SMOKE_ALLOW_REMOTE") != "1":
        _fail(EXIT_CONFIG, "非 loopback 目标需要显式 WEB_SMOKE_ALLOW_REMOTE=1",
              [f"当前目标: {url}", "默认只允许本机/测试服务，防止误打远端 prod。"])
    return env, instance, url


def check_reachable(url: str) -> None:
    """短超时连通性预检：不可达立刻失败，不挂死、不发业务请求。"""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        with socket.create_connection((host, port), timeout=2):
            pass
    except OSError as exc:
        _fail(EXIT_ENV, "目标 mobile 服务不可达，未发起任何契约请求",
              [f"目标: {url} ({host}:{port})", f"原因: {exc}",
               "本地开发: 先启动 mobile 服务（默认 8070），或设置 MOBILE_BASE_URL。",
               "CI/无服务环境: 用 --dry-run 做静态契约检查（不联网）。"])


def load_jwt_secret(target_env: str) -> str:
    """JWT_SECRET 只从环境变量或本地 .env 读取；prod 必须显式环境变量（禁止隐式取密）。"""
    if os.environ.get("JWT_SECRET"):
        return os.environ["JWT_SECRET"]
    if target_env == "prod":
        _fail(EXIT_ENV, "prod 冒烟必须显式 JWT_SECRET（禁止回落 .env）",
              ["导出 JWT_SECRET=<值> 后重跑；不要依赖 prod .env 隐式取密。"])
    if os.environ.get("WEB_SMOKE_NO_DOTENV") == "1":
        _fail(EXIT_ENV, "WEB_SMOKE_NO_DOTENV=1 且未提供 JWT_SECRET",
              ["CI 请显式导出 JWT_SECRET，或用 --dry-run（不联网）。"])
    env_path = os.path.join(BASE, ".env")
    if os.path.exists(env_path):
        for line in open(env_path, encoding="utf-8"):
            line = line.strip()
            if line.startswith("JWT_SECRET="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    _fail(EXIT_ENV, "缺少 JWT_SECRET：无法签发冒烟 token",
          ["设置 JWT_SECRET=<值>，或提供项目 .env。",
           "CI 无密钥环境: 使用 --dry-run 做静态契约检查（不联网、不读密钥）。"])


def load_database_url() -> str:
    """DATABASE_URL 优先取环境变量，其次读项目 .env；NO_DOTENV=1 时不读 .env。"""
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    if os.environ.get("WEB_SMOKE_NO_DOTENV") == "1":
        return ""
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
    POST /device/register 会报外键约束错误（环境数据问题而非代码缺陷）。

    prod 目标（READ_ONLY=True）一律跳过：直写库能力只在测试环境可用。"""
    if READ_ONLY:
        print("[prepare] 跳过：prod 只读模式禁止直写数据库")
        return
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
        # iam.users 测试用户档案：change-password 转发 unified-core /iam/users/{id}/password，
        # 用户不存在时上游 404（契约 WARN）。预创建幂等 upsert，密码哈希 = 脚本载荷 old_password(Test@123)。
        pw_hash = bcrypt.hashpw(b"Test@123", bcrypt.gensalt(rounds=12)).decode()
        subprocess.run(
            ["psql", db, "-c",
             f"INSERT INTO iam.users (id, username, email, password_hash, status, email_verified, phone_verified) "
             f"VALUES ('{TEST_UID}', 'smoke_user', 'smoke.user@test.local', '{pw_hash}', 'active', true, false) "
             f"ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'"],
            capture_output=True, timeout=15,
            check=False,
        )
        REAL_IDS["user"] = TEST_UID
        print(f"[prepare] iam.users 测试用户就绪: {TEST_UID}")
        # WMS inventory.warehouse_id NOT NULL：取一个真实仓库 id 供 POST /inventory 使用
        global TEST_WAREHOUSE_ID
        r = subprocess.run(
            ["psql", db, "-tAc",
             "SELECT id FROM wms.warehouses ORDER BY created_at LIMIT 1"],
            capture_output=True, timeout=15,
            check=False,
        )
        wid = r.stdout.decode().strip() if r.stdout else ""
        if wid:
            TEST_WAREHOUSE_ID = wid
            POST_BODIES["/inventory"]["warehouse_id"] = wid
            print(f"[prepare] 注入 WMS 仓库 id: {wid}")
        # HRM attendance check-in/out 以 token user_id 解析员工：绑定一个测试员工（无 user_id 的 MCP 端到端员工）
        r2 = subprocess.run(
            ["psql", db, "-tAc",
             f"UPDATE hrm.employees SET user_id = '{TEST_UID}' WHERE id = (SELECT id FROM hrm.employees WHERE user_id IS NULL AND name LIKE 'MCP端到端员工%' ORDER BY name LIMIT 1) RETURNING name"],
            capture_output=True, timeout=15,
            check=False,
        )
        ename = r2.stdout.decode().strip() if r2.stdout else ""
        if ename:
            print(f"[prepare] 绑定打卡员工 user_id={TEST_UID[:8]}… → {ename}")
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
    "/customers": {"name": "冒烟测试客户", "customer_type": "enterprise", "owner_id": "e91e2228-ab9d-4ac3-99f4-fdcd9c723f21", "phone": "13800000000", "email": "smoke@test.local"},
    "/inventory": {"sku": "SMOKE-SKU-001", "name": "冒烟测试库存", "quantity": 10, "unit": "件", "warehouse_id": "REPLACE_WAREHOUSE"},
    "/attendance/check-in": {"lat": 38.04, "lng": 114.51},
    "/attendance/check-out": {"lat": 38.04, "lng": 114.51},
    "/device/register": {"device_id": "smoke-device-1", "device_name": "冒烟设备", "device_type": "android", "os_type": "android", "os_version": "14", "app_version": "1.0.0", "push_token": "smoke-device-token"},
    "/documents": {"title": "冒烟测试文档", "category": "general", "content": "smoke"},
    "/schedule/events": {"title": "冒烟日程", "description": "smoke", "start_time": "2026-10-29T09:00:00+08:00", "end_time": "2026-10-29T10:00:00+08:00", "event_type": "meeting"},
    "/task": {"title": "冒烟任务", "task_type": "general"},
    "/approval/tasks/${id}/delegate": {"userId": TEST_UUID, "reason": "冒烟委派"},
    "/production/orders": {"product_name": "冒烟订单", "product_code": "SMOKE-001", "quantity": 10},
    "/approval/tasks/${id}/approve": {"comment": "smoke"},
    "/approval/tasks/${id}/reject": {"comment": "smoke"},
    "/user/change-password": {"old_password": "Test@123", "new_password": "Test@1234"},
    "/device/register": {"device_id": "smoke-device-1", "device_name": "冒烟设备", "device_type": "android", "os_type": "Android", "os_version": "14", "app_version": "1.0.0", "push_token": "smoke-push-token"},
    "/push/devices/register": {"device_token": "smoke-push-token", "platform": "android", "device_model": "Pixel-7", "app_version": "1.0.0", "os_version": "14"},
    "/push/notifications": {"title": "冒烟通知", "body": "smoke", "notification_type": "general", "target_type": "all", "target_ids": []},
    "/push/notifications/broadcast": {"title": "冒烟广播", "body": "smoke", "notification_type": "general", "target_type": "all", "target_ids": []},
    "/push/templates": {"name": f"冒烟模板-{int(time.time())}", "title_template": "通知", "body_template": "内容", "notification_type": "general"},
    "/barcode/scan": {"barcode": "SMOKE-BARCODE-001", "barcode_type": "code128"},
    "/scan/barcode": {"barcode": "SMOKE-001"},
    "/scan/qrcode": {"qr_data": "SMOKE-001"},
}

# GET 端点所需的 query 参数（模拟前端必带参数，避免业务 400 误报）
QUERY_PARAMS = {
    "/inventory/scan": {"barcode": "SMOKE-001"},
}


def b64(d: bytes) -> str:
    return base64.urlsafe_b64encode(d).rstrip(b"=").decode()


def issue_token(target_env: str) -> str:
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
    sig = b64(hmac.new(load_jwt_secret(target_env).encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
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
        # 优先真实 id（预创建捕获），消除假 id 业务 404 WARN
        if var == "id" or var.endswith("Id"):
            for prefix, rid in REAL_IDS.items():
                if f"/{prefix}/" in path_tmpl or path_tmpl.endswith(f"/{prefix}"):
                    return rid
        if var in VAR_DEFAULTS:
            return str(VAR_DEFAULTS[var])
        return TEST_UUID
    return re.sub(r"\$\{([^}]+)\}", repl, path_tmpl)


def pre_create(token: str) -> None:
    """预创建 customer/documents/inventory/production 记录，捕获真实 id 供 get/put/delete 使用。

    device/register 为 upsert 语义（响应 data:null），预创建后从 mobile.devices 回查 id。
    approval/tasks 依赖流程实例状态机，不预创建（保留假 id 404 语义，已登记）。

    prod 目标（READ_ONLY=True）一律跳过：本函数会 POST 写数据并直查数据库。"""
    if READ_ONLY:
        print("[prepare] 跳过预创建：prod 只读模式禁止写数据/写库")
        return
    db = load_database_url()
    creates = [
        ("customer", "/customers"), ("documents", "/documents"),
        ("inventory", "/inventory"), ("production/orders", "/production/orders"),
        ("push/notifications", "/push/notifications"), ("schedule/events", "/schedule/events"),
        ("task", "/task"),
        ("barcode/history", "/barcode/scan"),
    ]
    for prefix, tmpl in creates:
        body = POST_BODIES.get(tmpl)
        if body is None:
            continue
        try:
            req = urllib.request.Request(
                MOBILE_URL + tmpl,
                data=json.dumps(body).encode(),
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                method="POST",
            )
            resp = urllib.request.urlopen(req, timeout=15)
            raw = json.loads(resp.read().decode())
            d = raw.get("data") if isinstance(raw, dict) else raw
            cand = None
            if isinstance(d, dict):
                for k in ("id", "customer_id", "device_id", "document_id", "order_id", "notification_id", "scan_id"):
                    if d.get(k):
                        cand = d[k]
                        break
                if not cand and isinstance(d.get("data"), dict):
                    for k in ("id", "customer_id", "device_id", "document_id", "order_id", "notification_id", "scan_id"):
                        if d["data"].get(k):
                            cand = d["data"][k]
                            break
            if cand:
                REAL_IDS[prefix] = str(cand)
                print(f"[prepare] 预创建 {prefix} 真 id: {cand}")
        except Exception as e:
            print(f"[prepare] 预创建 {prefix} 失败（保留假 id 404）: {e}")
    # device：register 为 upsert（响应 data:null），从 mobile.devices 回查 id
    try:
        body = POST_BODIES.get("/device/register")
        if body is not None:
            req = urllib.request.Request(
                MOBILE_URL + "/device/register",
                data=json.dumps(body).encode(),
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=15)
        if db:
            r = subprocess.run(
                ["psql", db, "-tAc",
                 "SELECT id FROM mobile.devices WHERE device_id='smoke-device-1' LIMIT 1"],
                capture_output=True, timeout=15, check=False,
            )
            did = r.stdout.decode().strip() if r.stdout else ""
            if did:
                REAL_IDS["device"] = did
                print(f"[prepare] 预创建 device 真 id: {did}")
    except Exception as e:
        print(f"[prepare] 预创建 device 失败（保留假 id 404）: {e}")


def call(method: str, path: str, tmpl: str, token: str):
    url = MOBILE_URL + path
    q = QUERY_PARAMS.get(tmpl)
    if q:
        url += "?" + "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in q.items())
    body = None
    headers = {"Authorization": f"Bearer {token}"}
    data_bytes = None
    if method in ("POST", "PUT", "PATCH"):
        # /task/batch/status：BatchStatusRequest{ids,status}，用预创建真任务 id（无真 id 时
        # 回退 TEST_UUID，服务端返回 success0/failed1 而非 422）
        if tmpl == "/task/batch/status":
            body = {"ids": [REAL_IDS.get("task", TEST_UUID)], "status": "completed"}
        else:
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
    global MOBILE_URL, READ_ONLY
    dry_run = "--dry-run" in sys.argv[1:]
    env, instance, target_url = resolve_target(dry_run)
    MOBILE_URL = target_url.rstrip("/")
    print(f"[mobile-smoke] 目标环境={env} · 仓库位={instance} · mobile={MOBILE_URL}")
    if env == "prod":
        READ_ONLY = True
        print(f"[mobile-smoke] prod 授权原因: {(os.environ.get('PROD_SMOKE_REASON') or '').strip()}")
        print("[mobile-smoke] prod 只读模式：跳过 prepare_data/pre_create，仅执行 GET 端点")
    eps = extract_endpoints()
    print(f"前端契约端点(去重后): {len(eps)}")
    if dry_run:
        print("[mobile-smoke] dry-run: 仅静态提取，未读取密钥、未发起任何网络请求")
        sys.exit(0)
    if READ_ONLY:
        eps = [e for e in eps if e[0] == "GET"]
        print(f"[mobile-smoke] prod 只读过滤: GET {len(eps)} 个（写方法已排除）")
    prepare_data()
    token = issue_token(env)
    check_reachable(MOBILE_URL)
    pre_create(token)
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
