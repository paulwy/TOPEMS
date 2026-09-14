#!/usr/bin/env python3
"""MCP stdio 端到端验证：模拟 Cursor/Claude Desktop 调用 TOPEMS MCP。

流程：initialize → tools/list → 调用 3 个业务工具 → 验证响应。
"""
import json
import subprocess
import sys
import time

BINARY = "target/debug/mcp-stdio"
TIMEOUT = 15

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

def main():
    proc = subprocess.Popen(
        [BINARY],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        bufsize=1,
    )
    results = []
    try:
        # 1. initialize
        send(proc, {"jsonrpc": "2.0", "id": 1, "method": "initialize",
                     "params": {"protocolVersion": "2024-11-05",
                                "capabilities": {},
                                "clientInfo": {"name": "e2e-test", "version": "1.0"}}})
        resp = recv(proc)
        assert "result" in resp, f"initialize 失败: {resp}"
        server_info = resp["result"].get("serverInfo", {})
        print(f"[1] initialize OK: server={server_info.get('name')} v{server_info.get('version')}")
        results.append(("initialize", True))

        # 2. initialized notification
        send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized"})

        # 3. tools/list
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

        # 4. 调用 3 个业务工具（mock 降级路径）
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

        # 5. resources/list
        send(proc, {"jsonrpc": "2.0", "id": 20, "method": "resources/list"})
        resp = recv(proc)
        # resources/list 可能不支持（取决于 server 实现），记录结果
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

    print("\n=== 端到端验证结果 ===")
    for r in results:
        print(f"  {'✅' if r[1] is True or r[1] == 'not_supported' else '❌'} {r[0]}" +
              (f" — {r[2]}" if len(r) > 2 else ""))

    all_ok = all(r[1] is True or r[1] == "not_supported" for r in results)
    print(f"\n总体: {'全部通过 ✅' if all_ok else '存在失败 ❌'}")
    sys.exit(0 if all_ok else 1)

if __name__ == "__main__":
    main()
