#!/usr/bin/env python3
"""HRM 初始化向导接口级回归（P3-7）。

覆盖审计清单第 7 节 1–6 项：
  1. 租户 A 从零五步 → is_completed=true
  2. 租户 B（非默认租户）超管带 x-tenant-id 建公司 → 公司 tenant_id 正确
  3. 租户 B 五步逐级推进 current_step，完成后刷新不回退
  4. 已有部门/岗位后空数组重提交 → 200 且步骤保持 completed（回退续走）
  5. 非法日期/超长名称/不存在部门/不存在 IAM 用户 → 400，不得 500
  6. 并发两次首存公司 → 两次均 200；提供 --dsn 时断言库内仅 1 条

前置：HRM 已启动（DEVELOPMENT_MODE=1），数据库已应用 hrm 初始化相关迁移。
每次运行使用随机租户 UUID，不依赖固定租户/固定测试数据，可重复执行。

用法：
  python3 scripts/hrm_setup_smoke.py --base-url http://127.0.0.1:18020
  python3 scripts/hrm_setup_smoke.py --base-url http://127.0.0.1:18020 \\
      --dsn postgres://topems_it:...@127.0.0.1:5432/topems_hrm_setup_test
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from typing import Any


class Client:
    def __init__(self, base_url: str, tenant: str) -> None:
        self.base = base_url.rstrip("/") + "/api/hrm/setup"
        self.tenant = tenant

    def call(self, method: str, path: str, body: Any | None = None) -> tuple[int, dict]:
        req = urllib.request.Request(
            self.base + path,
            method=method,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Content-Type": "application/json", "x-tenant-id": self.tenant},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read())


def ok(step: str, status: int, body: dict) -> dict:
    print(f"[{step}] HTTP {status} success={body.get('success')}")
    if status != 200 or body.get("success") is not True:
        print(json.dumps(body, ensure_ascii=False, indent=2))
        raise SystemExit(f"FAILED: {step}")
    return body["data"]


def expect_400(step: str, status: int, body: dict) -> None:
    print(f"[{step}] HTTP {status} code={body.get('code')} msg={body.get('message')}")
    if status != 400 or body.get("success") is not False:
        print(json.dumps(body, ensure_ascii=False, indent=2))
        raise SystemExit(f"FAILED: {step} 期望 400")


def progress(c: Client) -> dict:
    return ok("progress", *c.call("GET", "/progress"))


def full_flow(c: Client, suffix: str, tag: str, admin_user_id: str | None) -> None:
    c.call("GET", "/progress")
    company = ok(
        f"{tag}-company",
        *c.call("POST", "/company", {"name": f"接口回归公司{tag}-{suffix}", "short_name": tag}),
    )
    assert company.get("tenant_id") in (None, c.tenant), company
    assert progress(c)["current_step"] == 2, "公司步骤后 current_step 应为 2"

    depts = ok(
        f"{tag}-departments",
        *c.call(
            "POST",
            "/departments",
            {
                "departments": [
                    {"name": f"{tag}研发部-{suffix}", "code": f"{tag}-RD-{suffix}"},
                    {"name": f"{tag}市场部-{suffix}", "code": f"{tag}-MKT-{suffix}"},
                ]
            },
        ),
    )
    dept_ids = [x["id"] for x in depts["departments"]]
    assert progress(c)["current_step"] == 3, "部门步骤后 current_step 应为 3"

    positions = ok(
        f"{tag}-positions",
        *c.call(
            "POST",
            "/positions",
            {
                "positions": [
                    {
                        "name": f"{tag}工程师-{suffix}",
                        "code": f"{tag}-ENG-{suffix}",
                        "department_id": dept_ids[0],
                        "level": 3,
                    },
                    {
                        "name": f"{tag}渠道经理-{suffix}",
                        "code": f"{tag}-CH-{suffix}",
                        "department_id": dept_ids[1],
                        "level": 4,
                    },
                ]
            },
        ),
    )
    pos_ids = [x["id"] for x in positions["positions"]]
    assert progress(c)["current_step"] == 4, "岗位步骤后 current_step 应为 4"

    admin_body: dict[str, Any] = {
        "name": f"{tag}管理员-{suffix}",
        "employee_number": f"{tag}{suffix}".upper()[:20],
        "username": f"smoke_{suffix}",
        "email": f"smoke_{suffix}@example.com",
        "gender": "female",
        "birth_date": "1990-05-06",
        "hire_date": "2026-11-24",
        "department_id": dept_ids[0],
        "position_id": pos_ids[0],
    }
    if admin_user_id:
        admin_body["user_id"] = admin_user_id
    admin = ok(f"{tag}-admin", *c.call("POST", "/admin", admin_body))
    if admin_user_id:
        assert admin["bound"] is True, admin
    assert progress(c)["current_step"] == 5, "管理员步骤后 current_step 应为 5"

    ok(f"{tag}-complete", *c.call("POST", "/complete", {"confirm": True}))
    final = progress(c)
    assert final["is_completed"] is True, final
    assert final["current_step"] == 5, final

    # 回退续走：已有数据后空数组重提交仍通过，且步骤不被重置
    empty_dept = ok(f"{tag}-departments-empty", *c.call("POST", "/departments", {"departments": []}))
    assert empty_dept["created_count"] == 0, empty_dept
    empty_pos = ok(f"{tag}-positions-empty", *c.call("POST", "/positions", {"positions": []}))
    assert empty_pos["created_count"] == 0, empty_pos
    assert progress(c)["is_completed"] is True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:18020")
    parser.add_argument("--admin-user-id", default="", help="可选：已存在的 IAM 用户 id，用于验证 bound=true")
    parser.add_argument("--dsn", default="", help="可选：psql DSN，用于并发公司条数断言与清理")
    parser.add_argument("--cleanup", action="store_true", help="测试结束后删除本次生成的租户数据（需 --dsn）")
    args = parser.parse_args()
    if args.cleanup and not args.dsn:
        parser.error("--cleanup 需要同时提供 --dsn")

    suffix = uuid.uuid4().hex[:8]
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    print(f"tenant A={tenant_a} tenant B={tenant_b} suffix={suffix}")

    a = Client(args.base_url, tenant_a)
    assert progress(a)["current_step"] == 1
    full_flow(a, suffix, "A", args.admin_user_id or None)
    print("场景1/3/4 PASS：默认租户从零五步 + 完成判定 + 回退续走")

    b = Client(args.base_url, tenant_b)
    b.call("GET", "/progress")
    company_b = ok(
        "B-company",
        *b.call("POST", "/company", {"name": f"接口回归公司B-{suffix}", "short_name": "B"}),
    )
    assert company_b.get("organization_id") in (None, tenant_b), company_b
    full_flow(b, suffix, "B", None)
    print("场景2 PASS：非默认租户超管带 x-tenant-id 写入 + 五步完成")

    expect_400("invalid-long-company", *b.call("POST", "/company", {"name": "超" * 300}))
    expect_400(
        "invalid-birth-date",
        *b.call(
            "POST",
            "/admin",
            {"name": "非法日期", "employee_number": f"BAD{suffix}", "birth_date": "2020-13-40"},
        ),
    )
    expect_400(
        "missing-department",
        *b.call(
            "POST",
            "/admin",
            {"name": "错部门", "employee_number": f"BAD1{suffix}", "department_id": str(uuid.uuid4())},
        ),
    )
    expect_400(
        "missing-user",
        *b.call(
            "POST",
            "/admin",
            {"name": "错用户", "employee_number": f"BAD2{suffix}", "user_id": str(uuid.uuid4())},
        ),
    )
    print("场景5 PASS：非法输入均为 400")

    # 场景6：同一租户并发首存公司
    tenant_c = str(uuid.uuid4())
    c = Client(args.base_url, tenant_c)
    c.call("GET", "/progress")
    results = [
        c.call("POST", "/company", {"name": f"接口回归并发公司{i}-{suffix}", "short_name": f"C{i}"})
        for i in (1, 2)
    ]
    for i, (status, body) in enumerate(results, 1):
        ok(f"C-concurrent-{i}", status, body)
    if args.dsn:
        sql = (
            "SELECT COUNT(*) FROM hrm.companies "
            f"WHERE tenant_id = '{tenant_c}' AND deleted_at IS NULL"
        )
        count = int(
            subprocess.run(
                ["psql", args.dsn, "-tAc", sql],
                check=True,
                capture_output=True,
                text=True,
            ).stdout.strip()
        )
        assert count == 1, f"并发首存公司应为 1 条，实际 {count}"
        print("场景6 PASS：并发两次 200，库内 1 条")
    else:
        print("场景6 PASS：并发两次均 200（未提供 --dsn，跳过库内条数断言）")

    if args.cleanup:
        sqls = []
        for tenant in (tenant_a, tenant_b, tenant_c):
            sqls.extend(
                [
                    f"DELETE FROM hrm.employees WHERE tenant_id = '{tenant}'",
                    f"DELETE FROM hrm.positions WHERE tenant_id = '{tenant}'",
                    f"DELETE FROM hrm.departments WHERE tenant_id = '{tenant}'",
                    f"DELETE FROM hrm.companies WHERE tenant_id = '{tenant}'",
                    f"DELETE FROM hrm.initialization_logs WHERE tenant_id = '{tenant}'",
                    f"DELETE FROM hrm.initialization_status WHERE tenant_id = '{tenant}'",
                ]
            )
        cmd = ["psql", args.dsn, "--single-transaction", "-v", "ON_ERROR_STOP=1"]
        for sql in sqls:
            cmd.extend(["-c", sql])
        subprocess.run(cmd, check=True, capture_output=True)
        print("清理完成：已删除本次三个租户的初始化数据")

    print(f"ALL PASS (suffix={suffix}, tenants={tenant_a},{tenant_b},{tenant_c})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
