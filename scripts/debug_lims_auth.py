#!/usr/bin/env python3
import urllib.request
import json

def debug_lims_auth():
    print("=" * 50)
    print("LIMS 认证问题调试")
    print("=" * 50)

    # 1. 登录获取 token
    print("\n1. 用户登录获取 Token")
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
    req = urllib.request.Request(
        "http://localhost:8002/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    response = urllib.request.urlopen(req)
    result = json.loads(response.read())
    token = result["data"]["access_token"]
    print("✅ 登录成功")
    print(f"   Token: {token[:50]}...")

    # 2. 解码 JWT token 查看内容
    print("\n2. JWT Token 分析")
    try:
        import base64
        import json as json_lib

        # JWT 格式: header.payload.signature
        parts = token.split('.')
        if len(parts) == 3:
            # 解码 header
            header = json_lib.loads(base64.b64decode(parts[0] + '==').decode('utf-8'))
            print(f"   Header: {json_lib.dumps(header)}")

            # 解码 payload
            payload = json_lib.loads(base64.b64decode(parts[1] + '==').decode('utf-8'))
            print(f"   Payload: {json_lib.dumps(payload, indent=2)}")
    except Exception as e:
        print(f"   ❌ Token 解码失败: {e}")

    # 3. 测试不同的 Authorization 格式
    print("\n3. 测试不同的认证格式")

    auth_formats = [
        ("Bearer token", {"Authorization": f"Bearer {token}"}),
        ("Token without Bearer", {"Authorization": token}),
    ]

    for name, headers in auth_formats:
        print(f"\n   测试: {name}")
        req = urllib.request.Request(
            "http://localhost:8006/api/v1/samples",
            headers=headers
        )
        try:
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())
            print(f"   ✅ 成功 - {result}")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"   ❌ 失败 ({e.code}) - {error_body[:200]}")
        except Exception as e:
            print(f"   ❌ 失败 - {e}")

    # 4. 检查 LIMS 服务日志
    print("\n4. 检查 LIMS 服务日志")
    try:
        with open("/tmp/lims.log", "r") as f:
            lines = f.readlines()
            # 只显示最后 30 行
            for line in lines[-30:]:
                if "auth" in line.lower() or "401" in line or "jwt" in line.lower():
                    print(f"   {line.strip()}")
    except Exception as e:
        print(f"   ❌ 无法读取日志: {e}")

    print("\n" + "=" * 50)

if __name__ == "__main__":
    debug_lims_auth()