#!/usr/bin/env python3
"""4.4 hrm 组织主数据填充——走已实装 /api/hrm/setup/* 4 步向导。

前置：hrm 服务已启动（默认 http://localhost:8020），.env 提供 DATABASE_URL/JWT_SECRET。
本脚本铸一个 is_superuser JWT 绕过 hrm:admin 鉴权（本地初始化用途），按序调：
  company → departments → positions → admin → complete。
不写 seed SQL 迁移、不从 erp 同步（决策报告明确禁止）。

用法：
  cd /Users/air/TOPEMS && set -a && . ./.env && set +a && python3 scripts/hrm_setup_fill.py
"""
import json
import os
import sys
import time
import uuid

import jwt
import urllib.request

BASE = os.environ.get("HRM_BASE", "http://localhost:8020")
JWT_SECRET = os.environ["JWT_SECRET"]
TENANT = "00000000-0000-0000-0000-000000000001"


def make_token() -> str:
    now = int(time.time())
    payload = {
        "sub": str(uuid.uuid4()),
        "username": "setup_admin",
        "role": "superadmin",
        "roles": ["superadmin"],
        "permissions": ["hrm:admin"],
        "is_superuser": True,
        "iat": now,
        "exp": now + 3600,
        "tenant_id": TENANT,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def post(path: str, body: dict, token: str) -> dict:
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "x-tenant-id": TENANT,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode()}


def main() -> int:
    token = make_token()

    # 1) 公司信息（种子公司已存在，此步为 UPDATE）
    r1 = post("/api/hrm/setup/company", {
        "name": "图宇科技",
        "short_name": "图宇",
        "address": "河北省石家庄市",
    }, token)
    print("company:", json.dumps(r1, ensure_ascii=False)[:200])

    # 2) 部门（研发/产品/运营/行政/财务）
    depts = ["研发部", "产品部", "运营部", "行政部", "财务部"]
    r2 = post("/api/hrm/setup/departments",
              {"departments": [{"name": d, "code": d[:2]} for d in depts]}, token)
    print("departments:", json.dumps(r2, ensure_ascii=False)[:300])
    dept_list = (r2.get("data") or {}).get("departments") or []
    if not dept_list:
        print("!! 未取得部门 ID，终止", file=sys.stderr)
        return 1

    # 3) 岗位（5 部门各 1-2 个，共 7 个）
    positions = [
        ("前端工程师", "研发部"), ("后端工程师", "研发部"),
        ("产品经理", "产品部"), ("UI设计师", "产品部"),
        ("运营专员", "运营部"), ("行政专员", "行政部"),
        ("会计", "财务部"),
    ]
    name_to_id = {d["name"]: d["id"] for d in dept_list}
    r3 = post("/api/hrm/setup/positions", {
        "positions": [
            {"name": n, "department_id": name_to_id.get(d), "level": 1}
            for (n, d) in positions
        ]
    }, token)
    print("positions:", json.dumps(r3, ensure_ascii=False)[:300])

    # 4) 管理员员工
    r4 = post("/api/hrm/setup/admin", {
        "name": "系统管理员",
        "employee_number": "EMP0001",
        "department_id": name_to_id.get("行政部"),
        "email": "admin@example.com",
        "password": "ChangeMe_2026!",
    }, token)
    print("admin:", json.dumps(r4, ensure_ascii=False)[:200])

    # 5) 完成初始化
    r5 = post("/api/hrm/setup/complete", {"confirm": True}, token)
    print("complete:", json.dumps(r5, ensure_ascii=False)[:200])
    return 0


if __name__ == "__main__":
    sys.exit(main())
