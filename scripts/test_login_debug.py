#!/usr/bin/env python3
import urllib.request
import json

# 测试登录
login_data = json.dumps({
    "username": "admin",
    "password": "admin123"
}).encode()

req = urllib.request.Request(
    "http://localhost:8002/api/v1/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json"}
)

try:
    response = urllib.request.urlopen(req)
    result = json.loads(response.read())

    print("完整响应:")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # 检查 token 位置
    if "access_token" in str(result):
        print("\n找到 access_token")
        if "data" in result and "access_token" in result["data"]:
            token = result["data"]["access_token"]
            print(f"Token: {token[:50]}...")
        elif "access_token" in result:
            token = result["access_token"]
            print(f"Token: {token[:50]}...")

except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
