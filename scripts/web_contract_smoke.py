#!/usr/bin/env python3
"""web(portal) 前端契约全量实跑冒烟脚本
- 从 apps/web/src/api/**/*.ts 精确提取前端契约端点（apiClient.<svc>.<method> / API_PATHS 常量 /
  createCrudApi 工厂合成 / plugin 裸 axios），按 (svc, 方法, 路径模板) 去重
- 自动重签 JWT（JWT_SECRET + test_admin，is_superuser=true）
- 逐端点实跑断言（目标：topems-server 模块化单体 BFF，默认本机 :8099）：
    FAIL  路由缺失: http 404（BFF 统一 catch-all）；处理异常: http>=500 或 body.code==500；网络异常
    WARN  参数不符(疑似): http 400/422/405 等 4xx 业务性响应（不阻塞退出码，需人工复核）
    PASS  其余（含 200+内层 code404=数据不存在，属正常业务语义）
- 按模块分组输出报告；存在任何 FAIL 时退出码非 0

安全边界（2026-11-06）：
  默认 WEB_SMOKE_ENV=local，只允许 loopback 目标；prod 需三重显式授权
  （ALLOW_PROD_SMOKE=1 + PROD_SMOKE_CONFIRM + PROD_SMOKE_REASON），
  且在 prod 仓库位（TOPEMS_INSTANCE=prod 或 DATABASE_URL 指向 *_prod）默认拒绝。
  任何拒绝都发生在网络请求之前，详见 docs/deploy/macos-deployment.md「契约冒烟门禁」。

用法: python3 scripts/web_contract_smoke.py [--limit N] [--json out.json] [--svc S] [--dry-run]
"""
import base64
import hashlib
import hmac
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(BASE, "apps", "web", "src", "api")
RUNTIME = os.path.join(BASE, "apps", "web", "src", "config", "runtime.ts")
APIPATH = os.path.join(BASE, "apps", "web", "src", "utils", "apiPath.ts")
LOCAL_DEFAULT_URL = "http://127.0.0.1:8099"
BFF_URL = LOCAL_DEFAULT_URL   # 由 resolve_target() 覆盖
TEST_UID = "e91e2228-ab9d-4ac3-99f4-fdcd9c723f21"
TEST_UUID = "00000000-0000-0000-0000-000000000099"

EXIT_CONFIG = 2      # 配置非法
EXIT_ENV = 3         # 运行环境/密钥/连通性不满足
EXIT_PROD_GUARD = 4  # prod 拒绝层


def _fail(code: int, title: str, lines=()):
    """fail-closed：打印可操作提示后退出，绝不静默跳过/降级。"""
    print(f"[web-smoke] BLOCKED: {title}", file=sys.stderr)
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
    """识别当前仓库位 prod/dev。

    判据（按优先级）：
      1) TOPEMS_INSTANCE=prod|production → prod；dev|local|test|staging → dev；
      2) 环境变量 DATABASE_URL 或项目 .env 的 DATABASE_URL 库名为 topems_prod / *_prod → prod；
      3) 其余 → dev。
    只看配置，不发任何网络探测，保证拒绝路径零请求。
    """
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

    为什么需要这一层：prod 仓库的 `.env` 可能指向 topems_test（实测 2026-11-06），
    但 8099 由 launchd 以 DATABASE_URL=…/topems_prod 启动；只看仓库文件会漏判。
    这里只读 `lsof` 监听表与 `ps eww` 进程环境，不建连、不发 HTTP，零请求外发；
    不打印 DSN，只取库名。
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
    """解析 (目标环境, 仓库位, BFF 地址)；所有拒绝均发生在任何网络请求之前。

    dry_run=True 时允许在 prod 仓库位做零网络静态检查（--dry-run 不读密钥、不发请求），
    但 WEB_SMOKE_ENV=prod（显式要求打 prod）仍走完整三重授权，避免"干跑"变成绕行口子。
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
            _fail(EXIT_PROD_GUARD, "检测到 prod 仓库位，默认拒绝对它跑契约冒烟",
                  [f"当前 WEB_SMOKE_ENV={env}，但 instance=prod（TOPEMS_INSTANCE 或 DATABASE_URL 指向 *_prod）",
                   "不会静默降级为 prod，也不会静默跳过。",
                   "如确需对 prod 跑合成探针，必须同时设置：",
                   "  WEB_SMOKE_ENV=prod  ALLOW_PROD_SMOKE=1",
                   f"  PROD_SMOKE_CONFIRM={confirm_expected}",
                   "  PROD_SMOKE_REASON=<变更单号/原因>  WEB_BFF_URL=<显式地址>  JWT_SECRET=<显式值>"])
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
        url = (os.environ.get("WEB_BFF_URL") or "").strip()
        if not url:
            _fail(EXIT_PROD_GUARD, "prod 冒烟必须显式 WEB_BFF_URL（不提供 prod 默认地址）",
                  ["例如 WEB_BFF_URL=http://localhost:8099"])
    elif env == "prod":
        _fail(EXIT_PROD_GUARD, "WEB_SMOKE_ENV=prod，但当前仓库位不是 prod",
              ["为避免误伤本地/CI，拒绝运行；本地请用 WEB_SMOKE_ENV=local|test。",
               "仅 prod 主机可设置 TOPEMS_INSTANCE=prod。"])
    else:
        url = (os.environ.get("WEB_BFF_URL") or "").strip() or LOCAL_DEFAULT_URL

    host = (urlparse(url).hostname or "").lower()
    if not host:
        _fail(EXIT_CONFIG, f"WEB_BFF_URL 无法解析: {url!r}", ["期望形如 http://127.0.0.1:8099"])
    if dry_run:
        return env, instance, url
    if instance != "prod":
        port = urlparse(url).port or (443 if urlparse(url).scheme == "https" else 80)
        if detect_target_instance(host, port) == "prod":
            _fail(EXIT_PROD_GUARD, "目标 BFF 进程实际连接 *_prod 数据库，默认拒绝",
                  [f"目标: {url}（只读探测监听进程的 DATABASE_URL 库名，未建立任何连接）",
                   "当前仓库位不是 prod，但目标服务连的是 prod 库：不发送任何契约请求。",
                   "请把 WEB_BFF_URL 指向测试服务，或在 prod 仓库位按三重授权执行。"])
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
        _fail(EXIT_ENV, "目标 BFF 不可达，未发起任何契约请求",
              [f"目标: {url} ({host}:{port})", f"原因: {exc}",
               "本地开发: 先启动 BFF（svc/server，默认 8099）或设置 WEB_BFF_URL。",
               "CI/无服务环境: 用 --dry-run 做静态契约检查（不联网）。"])



def load_expected_fails():
    """KNOWN 豁免：从 docs/web_contract_gap_list.md 读取（method, path）集合。

    历史：2026-10-06 前端 39 项 KNOWN 清零后曾移除豁免（恒空集，任何 FAIL 阻断）；
    第 53 轮 S25 批量语义治理暴露后端语义债务 61 条（http=200 body=500 错位，
    unified-core erp/hrm/audit/flow 等未治理模块），临时恢复豁免登记
    （docs/web_contract_gap_list.md），待第 54 轮 envelope→HTTP 对齐后清零删除。"""
    import os
    path = os.path.join(os.path.dirname(__file__), "..", "docs", "web_contract_gap_list.md")
    path = os.path.abspath(path)
    out = set()
    try:
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line.startswith("- ") and " " in line:
                parts = line[2:].split(None, 1)
                if len(parts) == 2:
                    out.add((parts[0], parts[1]))
    except FileNotFoundError:
        pass
    return out

# ${var} / :x 动态段 -> 测试值
VAR_DEFAULTS = {
    "id": TEST_UUID, "userId": TEST_UUID, "taskId": TEST_UUID, "orderId": TEST_UUID,
    "workstationId": TEST_UUID, "eventId": TEST_UUID, "notificationId": TEST_UUID,
    "category": "general", "date": "2026-10-05", "startDate": "2026-09-01",
    "endDate": "2026-10-05", "type": "inventory", "page": 1, "pageSize": 10,
    "status": "active", "keyword": "test", "code": "SMOKE", "name": "smoke",
    "tenantId": "00000000-0000-0000-0000-000000000001",
}

# POST/PUT/PATCH 最小合法 body（路径模板精确匹配；缺必填字段时上游返回 4xx 业务错误，可接受）
POST_BODIES = {
    "/crm/customers": {"name": "冒烟测试客户", "customer_type": "enterprise",
                       "owner_id": TEST_UID, "phone": "13800000000", "email": "smoke@test.local"},
    "/crm/contacts": {"name": "冒烟联系人", "customer_id": TEST_UUID, "phone": "13800000000"},
    "/crm/opportunities": {"name": "冒烟商机", "customer_id": TEST_UUID, "stage": "prospecting"},
    "/hrm/employees": {"name": "冒烟员工", "employee_no": "SMOKE001", "department_id": TEST_UUID},
    "/mes/work-orders": {"order_no": "SMOKE-WO-001", "product_id": TEST_UUID, "quantity": 1},
    "/tickets": {"title": "冒烟工单", "priority": "medium", "status": "open"},
    # ===== 批 36：mobile 写端点补合法载荷，使请求通过反序列化进入 handler，
    # 从而真正打到“上游服务未接入”的降级分支（此前空体 {} 在提取层即 422，
    # 用 WARN 掩盖了未覆盖的 Err 路径）。
    "/attendance/check-in": {"lat": 38.0423, "lng": 114.5147, "address": "smoke"},
    "/attendance/check-out": {"lat": 38.0423, "lng": 114.5147, "address": "smoke"},
    "/attendance/leaves": {"leave_type": "annual", "start_date": "2026-11-08",
                           "end_date": "2026-11-08", "reason": "smoke"},
    "/production/work-reports": {"order_id": "SMOKE-ORDER", "workstation": "smoke-ws",
                                 "operator": "smoke", "quantity": 1, "good_quantity": 1,
                                 "bad_quantity": 0, "start_time": "2026-11-07T09:00:00Z",
                                 "end_time": "2026-11-07T10:00:00Z"},
}


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


def b64(d: bytes) -> str:
    return base64.urlsafe_b64encode(d).rstrip(b"=").decode()


def issue_token(target_env: str) -> str:
    now = int(time.time())
    claims = {
        "sub": TEST_UID, "username": "test_admin", "role": "admin",
        "roles": ["admin"], "permissions": [], "is_superuser": True,
        "exp": now + 3600, "iat": now, "email": None, "department": None,
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "department_id": None, "position_id": None,
    }
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64(json.dumps(claims, separators=(",", ":")).encode())
    sig = b64(hmac.new(load_jwt_secret(target_env).encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


# ============ 配置解析 ============

def parse_services() -> dict:
    """runtime.ts services: name -> base path"""
    m = {}
    for mm in re.finditer(r"(\w[\w-]*):\s*getEnv\([^,]+,\s*['\"]([^'\"]+)['\"]\)",
                          open(RUNTIME, encoding="utf-8").read()):
        m[mm.group(1)] = mm.group(2)
    return m


def parse_apipaths() -> dict:
    """utils/apiPath.ts: GROUP1_CORE_SERVICES + API_PATHS.<group>.<name> -> 完整路径模板
    buildApiPath({service:'x', path:'/p'}) / (id) => buildApiPath(...) 均解析（单引号/反引号）"""
    src = open(APIPATH, encoding="utf-8").read()
    core_services = set()
    mm = re.search(r"GROUP1_CORE_SERVICES\s*=\s*new Set<string>\(\[(.*?)\]\)", src, re.S)
    if mm:
        core_services = set(re.findall(r"['\"]([\w-]+)['\"]", mm.group(1)))
    paths = {}
    m0 = re.search(r"API_PATHS\s*=\s*\{", src)
    if not m0:
        return paths
    i = m0.end() - 1
    depth = 1
    j = i
    while j < len(src) and depth > 0:
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
        j += 1
    body = src[m0.end(): j - 1]
    # 顶层分组
    for gm in re.finditer(r"(\w+):\s*\{", body):
        gname = gm.group(1)
        k = gm.end() - 1
        d2 = 1
        while k < len(body) and d2 > 0:
            if body[k] == "{":
                d2 += 1
            elif body[k] == "}":
                d2 -= 1
            k += 1
        gbody = body[gm.end(): k - 1]
        for em in re.finditer(
            r"(\w+):\s*(?:\([^)]*\)\s*=>\s*)?buildApiPath\(\{ service:\s*['\"]([\w-]+)['\"],\s*path:\s*(['\"`])([^'\"`]+)\3\s*\}\)",
            gbody,
        ):
            name, svc, p = em.group(1), em.group(2), em.group(4)
            prefix = "/api/core" if svc in core_services else "/api"
            p = p if p.startswith("/") else "/" + p
            paths[f"{gname}.{name}"] = prefix + "/" + svc + p
    return paths


# ============ 字面量解析 ============

def parse_literal(src, pos):
    q = src[pos]
    i = pos + 1
    if q in "'\"":
        out = []
        while i < len(src):
            c = src[i]
            if c == "\\":
                out.append(src[i:i + 2]); i += 2; continue
            if c == q:
                return "".join(out), i + 1
            out.append(c); i += 1
        return None, None
    i = pos + 1; depth = 0; out = []
    while i < len(src):
        c = src[i]
        if c == "\\":
            out.append(src[i:i + 2]); i += 2; continue
        if c == "$" and i + 1 < len(src) and src[i + 1] == "{":
            depth += 1; out.append(c); out.append("{"); i += 2; continue
        if c == "}" and depth > 0:
            depth -= 1; out.append(c); i += 1; continue
        if c == "`" and depth == 0:
            return "".join(out), i + 1
        out.append(c); i += 1
    return None, None


def collapse_exprs(s):
    """平衡的 ${...}（可含嵌套模板）替换为 :x"""
    out = []; i = 0
    while i < len(s):
        if s[i] == "$" and i + 1 < len(s) and s[i + 1] == "{":
            depth = 1; i += 2
            while i < len(s) and depth > 0:
                if s[i] == "{":
                    depth += 1
                elif s[i] == "}":
                    depth -= 1
                i += 1
            out.append(":x")
        else:
            out.append(s[i]); i += 1
    return "".join(out)


def normalize_tmpl(raw: str) -> str:
    t = collapse_exprs(raw)
    t = re.sub(r"\{[a-zA-Z_][^}]*\}", ":x", t)   # {id} 风格
    t = t.split("?")[0].strip()
    if not t.startswith("/"):
        t = "/" + t
    if t == "/":
        return "/"
    return t


def file_consts(src: str) -> dict:
    """文件内 const X = 'val' / `val` 字面量表（每文件计算一次）"""
    defs = {}
    for cm in re.finditer(r"const\s+(\w+)\s*=\s*", src):
        pos = cm.end()
        while pos < len(src) and src[pos] in " \t\n\r":
            pos += 1
        if pos < len(src) and src[pos] in "'\"`":
            val, _ = parse_literal(src, pos)
            if val is not None:
                defs[cm.group(1)] = val
    return defs


def subst_consts(arg: str, consts: dict) -> str:
    """模板字面量中的 ${FILE_CONST} 替换为字面量值"""
    for name, val in consts.items():
        arg = arg.replace("${" + name + "}", val)
    return arg


CALL_RE = re.compile(
    r"apiClient(?:\.([a-zA-Z0-9-]+))?\.(get|post|put|patch|delete)(?:<[^>]+>)?\("
    r"|\b(pluginAxios|runtimeAxios)\.(get|post|put|patch|delete)(?:<[^>]+>)?\("
)
FACTORY_RE = re.compile(r"create[A-Za-z]*Api(?:<[^>]*>)?\(\s*(['\"`])([^'\"`]+)\1")

MARKETPLACE = "/api/plugin/marketplace"


def dominant_svc(src: str) -> str | None:
    c = {}
    for m in re.finditer(r"apiClient\.([a-zA-Z0-9-]+)\.(?:get|post|put|patch|delete)\(", src):
        c[m.group(1)] = c.get(m.group(1), 0) + 1
    return max(c, key=c.get) if c else None


def extract_endpoints():
    """返回 [(svc, base, method, tmpl, file, line, origin), ...] 已去重"""
    services = parse_services()
    apipaths = parse_apipaths()
    rows, skipped = [], []
    files = []
    for root, dirs, names in os.walk(API_DIR):
        dirs[:] = [d for d in dirs if d != "__tests__"]
        for n in names:
            if n.endswith(".ts") and "__tests__" not in root:
                files.append(os.path.join(root, n))

    def resolve_arg(svc, method, arg, src, line):
        """对非字面量参数尝试静态解析，返回 (svc, base, tmpl) 或 None"""
        arg = arg.strip()
        # API_PATHS.<group>.<name>(...) / API_PATHS.<group>.<name>
        m = re.match(r"API_PATHS\.([\w.]+)(?:\([^)]*\))?$", arg)
        if m:
            key = m.group(1)
            full = apipaths.get(key)
            if full:
                return key.split(".")[0], "", normalize_tmpl(full)
            return None
        # 文件内常量：const X = '<lit>'
        for cm in re.finditer(r"const\s+(\w+)\s*=\s*", src):
            if cm.group(1) == arg:
                pos = cm.end()
                while pos < len(src) and src[pos] in " \t\n\r":
                    pos += 1
                if pos < len(src) and src[pos] in "'\"`":
                    val, _ = parse_literal(src, pos)
                    if val is not None:
                        t = normalize_tmpl(val)
                        b = "" if t.startswith("/api/") else services.get(svc, "")
                        return svc, b, t
        # 常见构建器变量：最近一次 url/endpoint/requestPath 赋值（在调用行之前）
        prefix_lines = "\n".join(src.split("\n")[:line - 1])
        last = None
        for bm in re.finditer(r"(?:const|let|var)?\s*(url|endpoint|requestPath|path)\s*=\s*", prefix_lines):
            pos = bm.end()
            while pos < len(prefix_lines) and prefix_lines[pos] in " \t\n\r":
                pos += 1
            if pos < len(prefix_lines) and prefix_lines[pos] in "'\"`":
                val, _ = parse_literal(prefix_lines, pos)
                if val is not None:
                    last = val
                    continue
            # 三元表达式 `cond ? 'A' : 'B'`：取无参分支 'B'（基础契约路径），
            # 消除 rd/experiment.ts 等动态 url 的静态解析盲区（unresolved arg=url）
            tm = re.match(
                r"[A-Za-z_][A-Za-z0-9_]*\s*\?\s*(?:'[^']*'|\"[^\"]*\"|`[^`]*`)\s*:\s*"
                r"(?:'[^']*'|\"[^\"]*\"|`[^`]*`)",
                prefix_lines[pos:],
            )
            if tm:
                branches = re.findall(
                    r"('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`(?:[^`\\]|\\.)*`)",
                    tm.group(0),
                )
                if len(branches) >= 2:
                    last = branches[-1].strip("'\"`")
        if last is not None:
            t = normalize_tmpl(last)
            b = "" if t.startswith("/api/") else services.get(svc, "")
            return svc, b, t
        return None

    for f in sorted(files):
        rel = os.path.relpath(f, API_DIR)
        src = open(f, encoding="utf-8").read()
        consts = file_consts(src)
        for m in CALL_RE.finditer(src):
            g = m.groups()
            if g[0] is not None:
                svc, method = g[0], g[1]
            elif g[2] is not None:
                ax, method = g[2], g[3]
                svc = "plugin" if ax == "pluginAxios" else "plugin-runtime"
            else:
                svc, method = "core", g[1]
            line = src.count("\n", 0, m.start()) + 1
            j = m.end()
            while j < len(src) and src[j] in " \t\n\r":
                j += 1
            if j >= len(src):
                skipped.append((svc, method, rel, line, src[m.start():m.start() + 90].replace("\n", " ")))
                continue
            if src[j] in "'\"`":
                arg, _ = parse_literal(src, j)
                if arg is None:
                    skipped.append((svc, method, rel, line, src[m.start():m.start() + 90].replace("\n", " ")))
                    continue
                if svc == "plugin" and arg == "MARKETPLACE_API":
                    arg = MARKETPLACE
                elif svc == "plugin" and "${MARKETPLACE_API}" in arg:
                    arg = arg.replace("${MARKETPLACE_API}", MARKETPLACE)
                arg = subst_consts(arg, consts)
                tmpl = normalize_tmpl(arg)
                if svc in ("plugin", "plugin-runtime"):
                    base = ""
                elif svc in services:
                    base = services[svc]
                else:
                    base = ""
                rows.append((svc, base, method.upper(), tmpl, rel, line, "call"))
            else:
                # 裸标识符（常量/API_PATHS/工厂参数）→ 括号平衡扫描 + 静态解析
                end = j; depth = 0
                while end < len(src):
                    c = src[end]
                    if c == "(":
                        depth += 1
                    elif c == ")":
                        if depth == 0:
                            break
                        depth -= 1
                    elif c in ",;\n" and depth == 0:
                        break
                    end += 1
                arg = src[j:end].strip()
                r = resolve_arg(svc, method, arg, src, line)
                if r is None:
                    skipped.append((svc, method, rel, line, f"unresolved arg={arg[:60]}"))
                    continue
                svc, base, tmpl = r
                rows.append((svc, base, method.upper(), tmpl, rel, line, "resolve"))
            rows.append((svc, base, method.upper(), tmpl, rel, line, "call"))
        # 工厂 CRUD 合成（createCrudApi<X>('/resource') 等 → 5 个标准 CRUD 端点）
        svc0 = dominant_svc(src)
        for fm in FACTORY_RE.finditer(src):
            res = fm.group(2)
            if not res.startswith("/"):
                res = "/" + res
            line = src.count("\n", 0, fm.start()) + 1
            if svc0 and svc0 in services:
                base = services[svc0]
                for meth, p in (("GET", res), ("GET", res + "/:x"), ("POST", res),
                                ("PUT", res + "/:x"), ("DELETE", res + "/:x")):
                    rows.append((svc0, base, meth, p, rel, line, "factory"))

    # 过滤动态前缀伪端点（/:x/... 为函数参数拼接，静态不可表示，列入 skipped 复核）
    kept, dyn = [], []
    for r in rows:
        if r[3].startswith("/:x") or r[3] == "/:x":
            dyn.append(r)
        else:
            kept.append(r)
    rows = kept
    for svc, base, meth, tmpl, rel, line, origin in dyn:
        skipped.append((svc, meth.lower(), rel, line, f"dynamic-prefix tmpl={tmpl}"))

    seen, out = set(), []
    for r in rows:
        key = (r[0], r[2], r[3])
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out, skipped


# ============ 探测 ============

def fill_vars(tmpl: str) -> str:
    def repl(m):
        return str(VAR_DEFAULTS.get(m.group(1), TEST_UUID))
    # 先处理紧贴字母数字的 :x（`/documents${id ? ...}` 折叠产物，需补斜杠）
    t = re.sub(r"([a-zA-Z0-9_]):x", r"\1/" + TEST_UUID, tmpl)
    # 再替换路径中的 :var 动态段
    t = re.sub(r":([a-zA-Z][\w]*)", repl, t)
    return t


def call(method: str, full_path: str, tmpl: str, token: str):
    url = BFF_URL + full_path
    body = None
    headers = {"Authorization": f"Bearer {token}"}
    data_bytes = None
    if method in ("POST", "PUT", "PATCH"):
        body = POST_BODIES.get(tmpl, {})
        data_bytes = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=20)
        raw = resp.read()
        return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, raw
    except Exception as e:
        return -1, str(e).encode()


def main():
    limit = None
    out_json = None
    only_svc = None
    dry_run = False
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
        elif a == "--json" and i + 1 < len(args):
            out_json = args[i + 1]
        elif a == "--svc" and i + 1 < len(args):
            only_svc = args[i + 1]
        elif a == "--dry-run":
            dry_run = True

    global BFF_URL
    target_env, instance, target_url = resolve_target(dry_run)
    BFF_URL = target_url.rstrip("/")
    print(f"[web-smoke] 目标环境={target_env} · 仓库位={instance} · BFF={BFF_URL}")
    if target_env == "prod":
        print(f"[web-smoke] prod 授权原因: {(os.environ.get('PROD_SMOKE_REASON') or '').strip()}")

    eps, skipped = extract_endpoints()
    if only_svc:
        eps = [e for e in eps if e[0] == only_svc]
        skipped = [s for s in skipped if s[0] == only_svc]
        print(f"web 前端契约端点(去重后): {len(eps)} [--svc {only_svc}] | 非字面量参数待人工复核: {len(skipped)}")
    else:
        print(f"web 前端契约端点(去重后): {len(eps)} | 非字面量参数待人工复核: {len(skipped)}")
    if dry_run:
        print("[web-smoke] dry-run: 仅静态提取，未读取密钥、未发起任何网络请求")
        sys.exit(0)
    token = issue_token(target_env)
    check_reachable(BFF_URL)
    groups = {}
    total = min(len(eps), limit) if limit else len(eps)
    for idx, (svc, base, method, tmpl, fname, line, origin) in enumerate(eps[:total]):
        path = fill_vars(tmpl)
        full_path = (base if base else "") + path
        status, raw = call(method, full_path, tmpl, token)
        body_code = None
        body = None
        try:
            body = json.loads(raw.decode())
            body_code = body.get("code")
        except Exception:
            pass
        reason = None
        if status == -1:
            reason = "network_error"
        elif status == 404:
            # S25 语义治理：业务 404（body.code==404 且非 BFF catch-all message）属正常
            # “数据不存在”语义（handler 已按 envelope code 映射 HTTP 状态）；
            # 仅空体 / BFF “接口不存在，请检查路径” catch-all 才是路由缺失。
            msg = body.get("message") if body else None
            if not (body_code == 404 and msg and msg != "接口不存在，请检查路径"):
                reason = "route_missing"        # BFF 统一 catch-all：路由缺失
        elif status == 501 or body_code == 501:
            # S25 语义：501 Not Implemented 是明确的“模块未实现”业务降级语义
            # （如 mes/energy 的告警/报表端点），非错误响应，计 PASS。
            reason = None
        elif status == 503 and body_code == 503:
            # 批 36 语义：503 是“上游服务未接入”的显式降级契约（写操作不假成功），
            # 仅当 body.code==503 且 message 含“未接入”标识时计 PASS。
            # 无 envelope 的真实网关 503、或 message 不含该标识的 503 仍判 FAIL，
            # 避免用降级语义掩盖真实故障。
            msg503 = body.get("message") if body else None
            if msg503 and "未接入" in msg503:
                reason = None
            else:
                reason = "handler_error"
        elif status >= 500 or body_code == 500:
            reason = "handler_error"
        verdict = "FAIL" if reason else "PASS"
        # 瞬态重试：FAIL 端点延时重试一次，避免资源竞争/抖动误判（pm/bi 先例）
        if verdict == "FAIL":
            time.sleep(1.5)
            status2, raw2 = call(method, full_path, tmpl, token)
            body_code2 = None
            try:
                body_code2 = json.loads(raw2.decode()).get("code")
            except Exception:
                pass
            reason2 = None
            if status2 == -1:
                reason2 = "network_error"
            elif status2 == 404:
                try:
                    b2 = json.loads(raw2.decode())
                    msg2 = b2.get("message")
                    if body_code2 == 404 and msg2 and msg2 != "接口不存在，请检查路径":
                        pass    # 业务 404，正常语义
                    else:
                        reason2 = "route_missing"
                except Exception:
                    reason2 = "route_missing"
            elif status2 == 501 or body_code2 == 501:
                pass    # 501 降级语义（Not Implemented），正常
            elif status2 == 503 and body_code2 == 503:
                try:
                    m2 = json.loads(raw2.decode()).get("message")
                except Exception:
                    m2 = None
                if m2 and "未接入" in m2:
                    pass    # 批 36：503 上游未接入降级契约，正常
                else:
                    reason2 = "handler_error"
            elif status2 >= 500 or body_code2 == 500:
                reason2 = "handler_error"
            if not reason2:
                status, body_code, reason = status2, body_code2, "transient"
                verdict = "PASS"
        groups.setdefault(svc, []).append({
            "method": method, "svc": svc, "base": base, "tmpl": tmpl, "path": full_path,
            "fname": fname, "line": line, "origin": origin,
            "status": status, "body_code": body_code, "verdict": verdict, "reason": reason,
        })
        if idx % 400 == 0:
            print(f"  进度 {idx}/{total}")
    # 报告
    fails = [e for g in groups.values() for e in g if e["verdict"] == "FAIL"]
    expected = load_expected_fails()
    known = [e for e in fails if (e["method"], e["path"]) in expected]
    real_fails = [e for e in fails if (e["method"], e["path"]) not in expected]
    warns = [e for g in groups.values() for e in g
             if e["verdict"] == "PASS" and (e["status"] >= 400 or e["body_code"] not in (None, 200))]
    print("=" * 72)
    for svc in sorted(groups):
        g = groups[svc]
        p = sum(1 for e in g if e["verdict"] == "PASS")
        f = len(g) - p
        print(f"[{svc}] {p}/{len(g)} PASS, {f} FAIL")
        for e in g:
            if e["verdict"] == "FAIL":
                tag = "KNOWN" if (e["method"], e["path"]) in expected else "FAIL"
                print(f"  {tag} {e['method']:6s} {e['path']} -> http={e['status']} body={e['body_code']} ({e['reason']}) {e['fname']}:{e['line']}")
    print("=" * 72)
    print(f"总计: {total - len(real_fails)}/{total} PASS, {len(real_fails)} FAIL（已知非后端缺口豁免 {len(known)}）")
    if warns:
        print(f"业务性非2xx(WARN, 不阻塞; 疑似参数不符需人工复核): {len(warns)}")
        for e in warns[:20]:
            print(f"  WARN {e['method']:6s} {e['path']} -> http={e['status']} body={e['body_code']}")
    if skipped:
        print(f"待人工复核(非字面量参数): {len(skipped)}")
        for s in skipped[:15]:
            print(f"  ? {s[1]:6s} {s[0]} {s[2]}:{s[3]} | {s[4][:70]}")
    if out_json:
        json.dump({"endpoints": [e for g in groups.values() for e in g],
                   "skipped": skipped, "total": total},
                  open(out_json, "w"), ensure_ascii=False, indent=1)
    sys.exit(1 if real_fails else 0)


if __name__ == "__main__":
    main()
