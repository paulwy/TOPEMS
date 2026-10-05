#!/usr/bin/env python3
"""web(portal) 前端契约全量实跑冒烟脚本
- 从 apps/web/src/api/**/*.ts 精确提取前端契约端点（apiClient.<svc>.<method> / API_PATHS 常量 /
  createCrudApi 工厂合成 / plugin 裸 axios），按 (svc, 方法, 路径模板) 去重
- 自动重签 JWT（.env 的 JWT_SECRET + test_admin，is_superuser=true）
- 逐端点实跑断言（目标：topems-server 模块化单体 BFF，:8099，对应 web 生产契约面）：
    FAIL  路由缺失: http 404（BFF 统一 catch-all）；处理异常: http>=500 或 body.code==500；网络异常
    WARN  参数不符(疑似): http 400/422/405 等 4xx 业务性响应（不阻塞退出码，需人工复核）
    PASS  其余（含 200+内层 code404=数据不存在，属正常业务语义）
- 按模块分组输出报告；存在任何 FAIL 时退出码非 0
用法: python3 scripts/web_contract_smoke.py [--limit N] [--json out.json]
"""
import base64
import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(BASE, "apps", "web", "src", "api")
RUNTIME = os.path.join(BASE, "apps", "web", "src", "config", "runtime.ts")
APIPATH = os.path.join(BASE, "apps", "web", "src", "utils", "apiPath.ts")
BFF_URL = os.environ.get("WEB_BFF_URL", "http://localhost:8099")
TEST_UID = "e91e2228-ab9d-4ac3-99f4-fdcd9c723f21"
TEST_UUID = "00000000-0000-0000-0000-000000000099"

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
}


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


def b64(d: bytes) -> str:
    return base64.urlsafe_b64encode(d).rstrip(b"=").decode()


def issue_token() -> str:
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
    sig = b64(hmac.new(load_jwt_secret().encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
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
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
        elif a == "--json" and i + 1 < len(args):
            out_json = args[i + 1]
        elif a == "--svc" and i + 1 < len(args):
            only_svc = args[i + 1]
    eps, skipped = extract_endpoints()
    if only_svc:
        eps = [e for e in eps if e[0] == only_svc]
        skipped = [s for s in skipped if s[0] == only_svc]
        print(f"web 前端契约端点(去重后): {len(eps)} [--svc {only_svc}] | 非字面量参数待人工复核: {len(skipped)}")
    else:
        print(f"web 前端契约端点(去重后): {len(eps)} | 非字面量参数待人工复核: {len(skipped)}")
    token = issue_token()
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
            reason = "route_missing"        # BFF 统一 catch-all：路由缺失
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
                reason2 = "route_missing"
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
                print(f"  FAIL {e['method']:6s} {e['path']} -> http={e['status']} body={e['body_code']} ({e['reason']}) {e['fname']}:{e['line']}")
    print("=" * 72)
    print(f"总计: {total - len(fails)}/{total} PASS, {len(fails)} FAIL")
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
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
