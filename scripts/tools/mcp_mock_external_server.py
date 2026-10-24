#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TOPEMS 外部 MCP server mock（stdio 传输）——DSH 消费外部 MCP 测试桩。

作为「外部 MCP server」角色通过 stdin/stdout 逐行交换 JSON-RPC（NDJSON），
实现 MCP 握手与 3 个 toy 工具：

- toy.greet       —— 参数 {name}，返回问候文本
- toy.echo        —— 参数 {message}，原样回显（JSON 内嵌）
- toy.echo_secret —— 返回含 token/secret 字段的 JSON（Phase 2 治理化消毒验证桩）

用途：svc/ai/tests/mcp_external_client_integration.rs 集成测试的远端桩，
也可手动用 `echo <json> | python3 scripts/tools/mcp_mock_external_server.py` 验证。

协议遵循 MCP 2025-03-26：initialize → tools/list → tools/call；通知无响应。
"""

import json
import sys

PROTOCOL_VERSION = "2025-03-26"

TOOLS = [
    {
        "name": "greet",
        "description": "外部玩具工具：向指定用户打招呼",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "打招呼对象名"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "echo",
        "description": "外部玩具工具：原样回显输入消息",
        "inputSchema": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "要回显的消息"},
            },
            "required": ["message"],
        },
    },
    {
        "name": "echo_secret",
        "description": "外部玩具工具：返回含敏感字段的 JSON（治理消毒验证桩）",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
]


def make_result(id_value, payload):
    return {"jsonrpc": "2.0", "id": id_value, "result": payload}


def make_error(id_value, code, message):
    return {"jsonrpc": "2.0", "id": id_value, "error": {"code": code, "message": message}}


def handle_request(req):
    method = req.get("method")
    req_id = req.get("id")
    params = req.get("params") or {}
    # 通知：无 id，不响应
    if req_id is None:
        return None
    if method == "initialize":
        return make_result(req_id, {"protocolVersion": PROTOCOL_VERSION, "capabilities": {}, "serverInfo": {"name": "toy-mock", "version": "1.0"}})
    if method == "tools/list":
        return make_result(req_id, {"tools": TOOLS})
    if method == "tools/call":
        name = (params.get("name") or "").split(".")[-1]
        args = params.get("arguments") or {}
        if name == "greet":
            who = args.get("name") or "world"
            return make_result(req_id, {"content": [{"type": "text", "text": json.dumps({"greeting": f"你好，{who}！", "source": "external-mock"}, ensure_ascii=False)}]})
        if name == "echo":
            msg = args.get("message") or ""
            return make_result(req_id, {"content": [{"type": "text", "text": json.dumps({"echo": msg, "source": "external-mock"}, ensure_ascii=False)}]})
        if name == "echo_secret":
            # Phase 2 消毒验证：返回含 token/secret 的嵌套 JSON，治理层应脱敏后透传
            return make_result(req_id, {"content": [{"type": "text", "text": json.dumps({"ok": True, "data": {"user": "toy", "token": "sk-test-1234567890abcdef", "nested": {"secret": "s3cr3t-val", "safe": "visible"}}}, ensure_ascii=False)}]})
        return make_error(req_id, -32602, f"tool not found: {params.get('name')}")
    return make_error(req_id, -32601, f"method not found: {method}")


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            sys.stderr.write(f"mock: parse error: {line[:200]}\n")
            continue
        resp = handle_request(req)
        if resp is not None:
            sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
