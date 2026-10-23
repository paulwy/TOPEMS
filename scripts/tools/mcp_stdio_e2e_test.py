#!/usr/bin/env python3
"""MCP stdio 端到端验证：模拟 Cursor/Claude Desktop 调用 TOPEMS MCP。

流程：initialize → tools/list → 调用 3 个业务工具（注入身份）→ 匿名保护断言 → 验证响应。

P1-1：业务工具调用需注入 MCP_STDIO_SUBJECT（admin）方可通过；未注入时匿名保护返回 -32001。
"""
import json
import os
import subprocess
import sys
import time

BINARY = "target/debug/mcp-stdio"
TIMEOUT = 15

# mcp-stdio fail-closed 要求 JWT_SECRET 环境变量；e2e 使用固定测试密钥。
E2E_ENV = {
    "JWT_SECRET": "e2e-test-jwt-secret",
    "RUST_LOG": "warn",
}
# 业务身份注入（P1-1）：admin 拥有全部工具权限
SUBJECT_ENV = {
    "MCP_STDIO_SUBJECT": json.dumps({
        "user_id": "e2e-admin",
        "tenant_id": "t1",
        "roles": ["admin"],
    }),
}

def spawn_stdio(extra_env=None):
    env = {**os.environ, **E2E_ENV, **(extra_env or {})}
    proc = subprocess.Popen(
        [BINARY],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        bufsize=1,
        env=env,
    )
    return proc

def send(proc, msg):
    line = json.dumps(msg) + "\n"
    proc.stdin.write(line)
    proc.stdin.flush()

def recv(proc):
    """读取一行 JSON-RPC 响应（跳过空行）。"""
    deadline = time.time() + TIMEOUT
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"mcp-stdio 进程已退出，code={proc.returncode}")
        line = proc.stdout.readline()
        if not line:
            time.sleep(0.1)
            continue
        line = line.strip()
        if not line:
            continue
        return json.loads(line)
    raise TimeoutError("等待响应超时")

def handshake(proc):
    """initialize + initialized 通知。"""
    send(proc, {"jsonrpc": "2.0", "id": 1, "method": "initialize",
                 "params": {"protocolVersion": "2024-11-05",
                            "capabilities": {},
                            "clientInfo": {"name": "e2e-test", "version": "1.0"}}})
    resp = recv(proc)
    assert "result" in resp, f"initialize 失败: {resp}"
    send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized"})
    return resp

def main():
    # 注入 admin 身份（P1-1）：业务工具按工具级权限放行
    proc = spawn_stdio(SUBJECT_ENV)
    results = []
    try:
        # 1. initialize
        resp = handshake(proc)
        server_info = resp["result"].get("serverInfo", {})
        print(f"[1] initialize OK: server={server_info.get('name')} v{server_info.get('version')}")
        results.append(("initialize", True))

        # 2. tools/list
        send(proc, {"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        resp = recv(proc)
        tools = resp["result"]["tools"]
        tool_names = [t["name"] for t in tools]
        print(f"[2] tools/list OK: {len(tools)} tools")
        results.append(("tools/list", True, len(tools)))

        # 验证 10 个业务工具存在
        business_tools = ["crm.list_customers", "crm.get_customer_profile", "crm.create_opportunity",
                          "erp.list_sales_orders", "erp.get_inventory_summary", "erp.create_purchase_order",
                          "erp.get_sales_order_detail", "finance.create_voucher", "finance.get_account_balance",
                          "finance.list_receivables"]
        missing = [t for t in business_tools if t not in tool_names]
        assert not missing, f"缺少业务工具: {missing}"
        print(f"[3] 10 个业务工具全部注册: {', '.join(business_tools[:3])}...")
        results.append(("10 business tools registered", True))

        # 3. 调用 3 个业务工具（注入 admin 身份 → 放行，mock 降级路径）
        calls = [
            ("crm.list_customers", {"page": 1, "page_size": 3}),
            ("erp.get_inventory_summary", {}),
            ("finance.list_receivables", {"page": 1, "page_size": 3}),
        ]
        for i, (tool, args) in enumerate(calls, 4):
            send(proc, {"jsonrpc": "2.0", "id": 10 + i, "method": "tools/call",
                         "params": {"name": tool, "arguments": args}})
            resp = recv(proc)
            assert "result" in resp, f"{tool} 调用失败: {resp}"
            content = resp["result"].get("content", [])
            assert content, f"{tool} 返回空内容"
            text = content[0].get("text", "")
            data = json.loads(text)
            source = data.get("source", "unknown")
            print(f"[{i}] tools/call {tool} OK (source={source})")
            results.append((f"call {tool}", True, source))

        # 4. resources/list
        send(proc, {"jsonrpc": "2.0", "id": 20, "method": "resources/list"})
        resp = recv(proc)
        if "result" in resp:
            resources = resp["result"].get("resources", [])
            print(f"[8] resources/list OK: {len(resources)} resources")
            results.append(("resources/list", True, len(resources)))
        else:
            print(f"[8] resources/list 返回: {json.dumps(resp)[:100]}")
            results.append(("resources/list", "not_supported"))

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

    # 5. 匿名保护（P1-1）：未注入 MCP_STDIO_SUBJECT → 业务工具返回 -32001
    anon_ok = False
    anon = spawn_stdio(None)
    try:
        handshake(anon)
        send(anon, {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                     "params": {"name": "crm.list_customers", "arguments": {"page": 1, "page_size": 3}}})
        resp = recv(anon)
        code = resp.get("error", {}).get("code")
        assert code == -32001, f"匿名调用业务工具应返回 -32001（fail-closed），实际: {resp}"
        print("[7] 匿名保护 OK: 未注入 MCP_STDIO_SUBJECT 时业务工具返回 -32001")
        anon_ok = True
    finally:
        anon.terminate()
        try:
            anon.wait(timeout=5)
        except subprocess.TimeoutExpired:
            anon.kill()
    results.append(("anonymous protection", anon_ok))

    print("\n=== 端到端验证结果 ===")
    for r in results:
        print(f"  {'✅' if r[1] is True or r[1] == 'not_supported' else '❌'} {r[0]}" +
              (f" — {r[2]}" if len(r) > 2 else ""))

    all_ok = all(r[1] is True or r[1] == "not_supported" for r in results)
    print(f"\n总体: {'全部通过 ✅' if all_ok else '存在失败 ❌'}")
    sys.exit(0 if all_ok else 1)

if __name__ == "__main__":
    main()
