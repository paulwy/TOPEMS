#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""W7-B2 认证冒烟：真实 token 打通 + 租户隔离 + 写入落租户 SQL 复核。

覆盖（对应 B2 批次：pm / gis / mobile / integration / ai）：
  1. 无 token 访问受保护读接口 -> 401
  2. 登录拿 token（POST /api/core/iam/auth/login），校验 token 内 tenant_id
  3. 本租户读接口 -> 2xx（默认 pm/gis/mobile/integration/ai 各一条）
  4. 本租户详情 -> 2xx（写入 probe 产生的资源；无写入时跳过）
  5. 跨租户读他人资源 -> 403/404
     5a. --foreign-token：用另一租户账号读本租户资源
     5b. --foreign-project-id：用本账号读另一租户的项目 id
     5c. 二者都未给：SKIP，转 SQL 层（--psql-cmd）用随机租户上下文断言 0 行
  6. 写入 probe（--write）：POST /api/pm/projects，code 唯一，默认写后清理
  7. SQL 复核（--psql-cmd）：
     - 连接角色必须是非超户（superuser 会绕过 RLS，验了等于没验）
     - 新行 tenant_id 必须等于 --tenant-id
     - 随机租户上下文查同一行 -> 0 行；空租户上下文 -> 0 行（fail-closed）
     - 无写入时：本租户范围内 tenant_id 越界行 / NULL 行 -> 0
     - 清理后 -> 0 行

安全默认：
  - 默认只读；写入必须显式 --write
  - 写入行默认自动删除（--keep 保留，便于人工复核）
  - 密码优先从环境变量 W7B2_PASSWORD 读取，避免 shell history
  - token / 密码不回显

用法示例：
  # 只读冒烟（生产，nginx 入口；口令经环境变量 W7B2_PASSWORD 传入）
  python3 scripts/ops/w7_b2_auth_smoke.py \\
      --base-url https://topems.example.com \\
      --username tenant_admin --tenant-id 00000000-0000-0000-0000-000000000001 \\
      --password "$W7B2_PASSWORD"

  # 带写入 + SQL 复核（psql 走 SSH，必须 -U 非超户）
  python3 scripts/ops/w7_b2_auth_smoke.py \\
      --base-url https://topems.example.com \\
      --username tenant_admin --tenant-id 00000000-0000-0000-0000-000000000001 \\
      --password "$W7B2_PASSWORD" \\
      --write --purge \\
      --psql-cmd "psql -h /tmp -U xingzhai -d topems_prod -X -A -t -v ON_ERROR_STOP=1"

  # 跨租户用第二租户账号（若存在）
  ... --foreign-token "<other-tenant-token>"
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import random
import ssl
import string
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"
WARN = "WARN"

DEFAULT_READS = [
    "/api/pm/projects",
    "/api/gis/maps",
    "/api/mobile/offline/status",
    "/api/integration/erp/connections",
    "/api/ai/models",
]

results: list[tuple[str, str, str]] = []  # (name, status, detail)


def record(name: str, status: str, detail: str = "") -> None:
    results.append((name, status, detail))
    mark = {PASS: "✓", FAIL: "✗", SKIP: "-", WARN: "!"}[status]
    print(f"  {mark} [{status}] {name}" + (f" — {detail}" if detail else ""))


def parse_json(raw: str):
    try:
        return json.loads(raw)
    except Exception:
        return {"_raw": raw[:500]}


def http_request(base, method, path, token=None, payload=None, timeout=15, insecure=False):
    url = base.rstrip("/") + path
    headers = {"Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    ctx = ssl._create_unverified_context() if insecure else None
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.status, parse_json(resp.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        return e.code, parse_json(e.read().decode("utf-8", "replace"))
    except Exception as e:  # 连接失败 / 超时
        return None, {"_error": f"{type(e).__name__}: {e}"}


def mask(token: str) -> str:
    if not token:
        return "<empty>"
    return f"{token[:8]}…{token[-6:]} (len={len(token)})"


def jwt_payload(token: str):
    parts = token.split(".")
    if len(parts) != 3:
        return None
    seg = parts[1]
    seg += "=" * (-len(seg) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(seg.encode("ascii")))
    except Exception:
        return None


def run_sql(psql_cmd: str, sql: str) -> tuple[int, str]:
    proc = subprocess.run(
        ["sh", "-c", psql_cmd],
        input=sql,
        text=True,
        capture_output=True,
        timeout=90,
    )
    return proc.returncode, (proc.stdout + proc.stderr)


def kv_lookup(out: str, key: str):
    prefix = key + "="
    for line in out.splitlines():
        line = line.strip()
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return None


def build_purge_sql(tenant_id: str, project_id: str) -> str:
    """API DELETE 是软删除（UPDATE deleted_at）；--purge 时物理清掉本次 probe 行。"""
    return "\n".join([
        "SET client_min_messages = notice;",
        "BEGIN;",
        f"SELECT set_config('app.tenant_id', '{tenant_id}', true);",
        f"DELETE FROM pm.projects WHERE id = '{project_id}' AND code LIKE 'W7B2SMOKE%';",
        f"SELECT 'residue_after_purge=' || count(*) FROM pm.projects WHERE code LIKE 'W7B2SMOKE%';",
        "COMMIT;",
    ]) + "\n"


def build_sql(tenant_id: str, project_id: str | None, cleanup: bool) -> str:
    foreign = str(uuid.uuid4())
    t = tenant_id
    lines = [
        "SET client_min_messages = notice;",
        "DO $$",
        "DECLARE v_super boolean;",
        "BEGIN",
        "  SELECT rolsuper INTO v_super FROM pg_roles WHERE rolname = current_user;",
        "  IF v_super THEN",
        "    RAISE EXCEPTION '禁止以超级用户做 RLS 复核（请用 -U topems_prod 等非超户）';",
        "  END IF;",
        "END",
        "$$;",
    ]
    if project_id:
        lines += [
            "BEGIN;",
            f"SELECT set_config('app.tenant_id', '{t}', true);",
            "SELECT 'own_tenant=' || COALESCE(",
            f"  (SELECT tenant_id::text FROM pm.projects WHERE id = '{project_id}'), 'MISSING');",
            "ROLLBACK;",
            "BEGIN;",
            "SELECT set_config('app.tenant_id', '', true);",
            "SELECT set_config('app.rls_system', 'on', true);",
            "SELECT 'row_tenant=' || COALESCE(",
            f"  (SELECT tenant_id::text FROM pm.projects WHERE id = '{project_id}'), 'NULL_OR_MISSING');",
            "ROLLBACK;",
            "BEGIN;",
            f"SELECT set_config('app.tenant_id', '{foreign}', true);",
            f"SELECT 'cross_tenant_rows=' || count(*) FROM pm.projects WHERE id = '{project_id}';",
            "ROLLBACK;",
            "BEGIN;",
            "SELECT set_config('app.tenant_id', '', true);",
            f"SELECT 'no_context_rows=' || count(*) FROM pm.projects WHERE id = '{project_id}';",
            "ROLLBACK;",
        ]
        if cleanup:
            lines += [
                "BEGIN;",
                f"SELECT set_config('app.tenant_id', '{t}', true);",
                f"SELECT 'after_delete_rows=' || count(*) FROM pm.projects WHERE id = '{project_id}';",
                "ROLLBACK;",
                "BEGIN;",
                "SELECT set_config('app.tenant_id', '', true);",
                "SELECT set_config('app.rls_system', 'on', true);",
                "SELECT 'smoke_code_rows=' || count(*) FROM pm.projects WHERE code LIKE 'W7B2SMOKE%';",
                "ROLLBACK;",
            ]
    else:
        lines += [
            "BEGIN;",
            f"SELECT set_config('app.tenant_id', '{t}', true);",
            f"SELECT 'own_foreign_rows=' || count(*) FROM pm.projects WHERE tenant_id <> '{t}';",
            "SELECT 'own_null_rows=' || count(*) FROM pm.projects WHERE tenant_id IS NULL;",
            "ROLLBACK;",
        ]
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="W7-B2 认证冒烟（默认只读）")
    ap.add_argument("--base-url", required=True, help="服务入口，如 https://host 或 http://127.0.0.1:8099")
    ap.add_argument("--username", required=True)
    ap.add_argument("--password", default=os.environ.get("W7B2_PASSWORD"),
                    help="默认读环境变量 W7B2_PASSWORD")
    ap.add_argument("--tenant-id", required=True, help="账号应落到的租户 UUID（断言用）")
    ap.add_argument("--reads", nargs="*", default=None,
                    help="覆盖默认读接口列表（默认：pm/gis/mobile/integration/ai 各一条）")
    ap.add_argument("--write", action="store_true", help="启用写入 probe（POST /api/pm/projects）")
    ap.add_argument("--write-payload", default=None,
                    help="写入 body（JSON 字符串）；默认最小 payload，code 自动加唯一后缀")
    ap.add_argument("--project-type", default="other", help="写入 probe 的 project_type（默认 other）")
    ap.add_argument("--keep", action="store_true", help="保留写入行（默认删除）")
    ap.add_argument("--purge", action="store_true",
                    help="API DELETE 为软删除时，物理清掉本次 W7B2SMOKE 行（需 DELETE 权限）")
    ap.add_argument("--foreign-project-id", default=None, help="另一租户的项目 id（跨租户读断言）")
    ap.add_argument("--foreign-token", default=None, help="另一租户账号的 token（跨租户读断言）")
    ap.add_argument("--psql-cmd", default=None,
                    help="psql 命令前缀（SQL 从 stdin 传入）；必须是非超户连接")
    ap.add_argument("--timeout", type=int, default=15)
    ap.add_argument("--insecure", action="store_true", help="跳过 TLS 证书校验")
    args = ap.parse_args()

    if not args.password:
        print("缺少密码：用 --password 或环境变量 W7B2_PASSWORD", file=sys.stderr)
        return 2
    try:
        uuid.UUID(args.tenant_id)
    except ValueError:
        print(f"--tenant-id 不是合法 UUID：{args.tenant_id}", file=sys.stderr)
        return 2
    if args.foreign_project_id:
        try:
            uuid.UUID(args.foreign_project_id)
        except ValueError:
            print(f"--foreign-project-id 不是合法 UUID", file=sys.stderr)
            return 2

    base = args.base_url
    print(f"\n=== W7-B2 认证冒烟 @ {base} (user={args.username}, tenant={args.tenant_id}) ===")

    # 1. 无 token -> 401
    print("\n[1] 未认证访问")
    status, body = http_request(base, "GET", "/api/pm/projects", timeout=args.timeout, insecure=args.insecure)
    if status == 401:
        record("无 token 读 /api/pm/projects", PASS, "401")
    else:
        record("无 token 读 /api/pm/projects", FAIL, f"期望 401，实际 {status}: {json.dumps(body, ensure_ascii=False)[:200]}")

    # 2. 登录
    print("\n[2] 登录")
    status, body = http_request(
        base, "POST", "/api/core/iam/auth/login",
        payload={"username": args.username, "password": args.password},
        timeout=args.timeout, insecure=args.insecure,
    )
    token = None
    if status == 200 and isinstance(body, dict) and body.get("success") is True:
        token = (body.get("data") or {}).get("access_token")
    if token:
        record("登录 POST /api/core/iam/auth/login", PASS, f"token={mask(token)}")
    else:
        record("登录 POST /api/core/iam/auth/login", FAIL,
               f"HTTP {status}: {json.dumps(body, ensure_ascii=False)[:300]}")
        print("\n登录失败，后续断言无法执行。")
        return 1

    claims = jwt_payload(token)
    if claims:
        claim_tenant = claims.get("tenant_id")
        if claim_tenant == args.tenant_id:
            record("token.tenant_id 与 --tenant-id 一致", PASS, claim_tenant)
        else:
            record("token.tenant_id 与 --tenant-id 一致", FAIL, f"claims={claim_tenant} 期望={args.tenant_id}")
        if claims.get("is_superuser"):
            record("账号非超管", WARN, "claims.is_superuser=true：最小权限口径不满足，仅可用于连通性冒烟")
        else:
            record("账号非超管", PASS, f"roles={claims.get('roles')}")
        if claims.get("must_change_password"):
            record("强制改密标记", WARN, "must_change_password=true")
    else:
        record("解析 token claims", WARN, "非标准三段 JWT，跳过 tenant 断言")

    # 3. 本租户读接口
    print("\n[3] 本租户读接口")
    reads = args.reads if args.reads is not None else DEFAULT_READS
    for path in reads:
        status, body = http_request(base, "GET", path, token=token,
                                    timeout=args.timeout, insecure=args.insecure)
        if status is not None and 200 <= status < 300:
            record(f"GET {path}", PASS, str(status))
        else:
            msg = json.dumps(body, ensure_ascii=False)[:200] if isinstance(body, dict) else str(body)[:200]
            record(f"GET {path}", FAIL, f"HTTP {status}: {msg}")

    # 4. 写入 probe
    project_id = None
    probe_code = None
    if args.write:
        print("\n[4] 写入 probe")
        suffix = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + "".join(
            random.choices(string.ascii_uppercase + string.digits, k=4))
        code = f"W7B2SMOKE{suffix}"
        if args.write_payload:
            payload = json.loads(args.write_payload)
            payload.setdefault("code", code)
        else:
            payload = {
                "name": f"W7-B2 auth smoke {suffix}",
                "code": code,
                "project_type": args.project_type,
                "description": "automated auth smoke probe (W7-B2)",
            }
        status, body = http_request(base, "POST", "/api/pm/projects", token=token,
                                    payload=payload, timeout=args.timeout, insecure=args.insecure)
        if status in (200, 201) and isinstance(body, dict) and body.get("success") is True:
            project_id = (body.get("data") or {}).get("id")
            probe_code = payload.get("code")
            if project_id:
                record("POST /api/pm/projects", PASS, f"id={project_id} code={probe_code}")
            else:
                record("POST /api/pm/projects", FAIL, "响应缺少 data.id")
        else:
            msg = json.dumps(body, ensure_ascii=False)[:300] if isinstance(body, dict) else str(body)[:300]
            record("POST /api/pm/projects", FAIL, f"HTTP {status}: {msg}")
            if status == 409:
                print("      提示：code 冲突（pm.projects.code 唯一），脚本已使用时间戳+随机后缀")
    else:
        print("\n[4] 写入 probe — 未启用（--write）")

    # 本租户详情
    print("\n[5] 本租户详情")
    if project_id:
        status, body = http_request(base, "GET", f"/api/pm/projects/{project_id}", token=token,
                                    timeout=args.timeout, insecure=args.insecure)
        if status is not None and 200 <= status < 300:
            got_id = ((body.get("data") or {}).get("id") if isinstance(body, dict) else None)
            if got_id == project_id:
                record("GET /api/pm/projects/{own}", PASS, f"{status}, id 一致")
            else:
                record("GET /api/pm/projects/{own}", FAIL, f"{status}, id 不一致：响应={got_id} 期望={project_id}")
        else:
            record("GET /api/pm/projects/{own}", FAIL, f"HTTP {status}")
    else:
        record("GET /api/pm/projects/{own}", SKIP, "无写入 probe，生产库无现成项目 id")

    # 6. 跨租户
    print("\n[6] 跨租户读")
    if args.foreign_token and project_id:
        status, body = http_request(base, "GET", f"/api/pm/projects/{project_id}", token=args.foreign_token,
                                    timeout=args.timeout, insecure=args.insecure)
        if status in (403, 404):
            record("他租户 token 读本租户项目", PASS, str(status))
        else:
            record("他租户 token 读本租户项目", FAIL, f"期望 403/404，实际 {status}")
    elif args.foreign_project_id:
        status, body = http_request(base, "GET", f"/api/pm/projects/{args.foreign_project_id}", token=token,
                                    timeout=args.timeout, insecure=args.insecure)
        if status in (403, 404):
            record("本租户 token 读他租户项目", PASS, str(status))
        else:
            record("本租户 token 读他租户项目", FAIL, f"期望 403/404，实际 {status}")
    else:
        record("跨租户 HTTP 断言", SKIP, "未提供 --foreign-token / --foreign-project-id；转 SQL 层随机租户上下文")

    # 7. SQL 复核
    print("\n[7] SQL 复核")
    if not args.psql_cmd:
        record("SQL 复核", SKIP, "未提供 --psql-cmd；SQL 已打印，未执行")
        print("\n----- 待执行 SQL -----")
        print(build_sql(args.tenant_id, project_id, cleanup=not args.keep and project_id is not None))
        print("----------------------")
    else:
        sql = build_sql(args.tenant_id, project_id, cleanup=not args.keep and project_id is not None)
        rc, out = run_sql(args.psql_cmd, sql)
        if rc != 0:
            record("SQL 复核执行", FAIL, out.strip().splitlines()[-1] if out.strip() else f"exit={rc}")
        else:
            if project_id:
                own = kv_lookup(out, "own_tenant")
                row_tenant = kv_lookup(out, "row_tenant")
                cross = kv_lookup(out, "cross_tenant_rows")
                nctx = kv_lookup(out, "no_context_rows")
                if own == args.tenant_id:
                    record("新行 tenant_id 落在目标租户", PASS, own)
                else:
                    record("新行 tenant_id 落在目标租户", FAIL, f"实际={own} 期望={args.tenant_id}")
                if row_tenant == args.tenant_id:
                    record("系统通道读该行 tenant_id（非 NULL/非 nil）", PASS, row_tenant)
                else:
                    record("系统通道读该行 tenant_id（非 NULL/非 nil）", FAIL,
                           f"实际={row_tenant} 期望={args.tenant_id}")
                if cross == "0":
                    record("随机租户上下文读该行", PASS, "0 行")
                else:
                    record("随机租户上下文读该行", FAIL, f"{cross} 行")
                if nctx == "0":
                    record("空租户上下文读该行", PASS, "0 行")
                else:
                    record("空租户上下文读该行", FAIL, f"{nctx} 行")
            else:
                foreign = kv_lookup(out, "own_foreign_rows")
                nulls = kv_lookup(out, "own_null_rows")
                if foreign == "0":
                    record("本租户范围内无越界 tenant_id 行", PASS, "0 行")
                else:
                    record("本租户范围内无越界 tenant_id 行", FAIL, f"{foreign} 行")
                if nulls == "0":
                    record("本租户范围内无 tenant_id IS NULL 行", PASS, "0 行")
                else:
                    record("本租户范围内无 tenant_id IS NULL 行", FAIL, f"{nulls} 行")

    # 8. 清理（HTTP）
    if project_id and not args.keep:
        print("\n[8] 清理写入行")
        status, body = http_request(base, "DELETE", f"/api/pm/projects/{project_id}", token=token,
                                    timeout=args.timeout, insecure=args.insecure)
        if status in (200, 204):
            record("DELETE /api/pm/projects/{own}", PASS, str(status))
        else:
            record("DELETE /api/pm/projects/{own}", FAIL,
                   f"HTTP {status}；残留 id={project_id} code={probe_code}")
        if args.psql_cmd:
            sql = build_sql(args.tenant_id, project_id, cleanup=True)
            rc, out = run_sql(args.psql_cmd, sql)
            after = kv_lookup(out, "after_delete_rows") if rc == 0 else None
            if after == "0":
                record("清理后 SQL 复核", PASS, "0 行")
            elif after == "1" and args.purge:
                prc, pout = run_sql(args.psql_cmd, build_purge_sql(args.tenant_id, project_id))
                residue = kv_lookup(pout, "residue_after_purge") if prc == 0 else None
                if residue == "0":
                    record("物理清理软删除行", PASS, "API 软删除 → --purge 物理删除，0 行")
                else:
                    record("物理清理软删除行", FAIL,
                           f"residue_after_purge={residue}；残留 id={project_id} code={probe_code}")
            elif after == "1":
                record("清理后 SQL 复核", WARN,
                       "API 为软删除（deleted_at 非空），未加 --purge；残留 id=%s code=%s" % (project_id, probe_code))
            else:
                record("清理后 SQL 复核", FAIL, f"after_delete_rows={after} rc={rc}")
            residue = kv_lookup(out, "smoke_code_rows") if rc == 0 else None
            if residue == "0":
                record("无 W7B2SMOKE 前缀残留", PASS, "0 行")
            elif residue == "1" and args.purge:
                record("无 W7B2SMOKE 前缀残留", PASS, "已由 --purge 物理清除")
            else:
                record("无 W7B2SMOKE 前缀残留", FAIL,
                       f"smoke_code_rows={residue}；请清理 id={project_id} code={probe_code}")
    elif project_id and args.keep:
        print(f"\n[8] 保留写入行 id={project_id}（--keep），请人工清理")

    # 汇总
    total = len(results)
    fails = [r for r in results if r[1] == FAIL]
    skips = [r for r in results if r[1] == SKIP]
    warns = [r for r in results if r[1] == WARN]
    print("\n=== 汇总 ===")
    print(f"总计 {total} 项：PASS {total - len(fails) - len(skips) - len(warns)} / FAIL {len(fails)} / "
          f"SKIP {len(skips)} / WARN {len(warns)}")
    for name, st, detail in fails:
        print(f"  FAIL {name} — {detail}")
    if skips:
        print("SKIP 项需按提示补参数或转 SQL 层，不算通过。")
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
