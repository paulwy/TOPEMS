#!/usr/bin/env python3
import urllib.request
import json
import time
import subprocess

def test_put_method():
    # 1. 登录获取 token
    print("1. 登录获取 Token")
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
        token = result["data"]["access_token"]
        print(f"✅ 登录成功 - Token: {token[:50]}...")
    except Exception as e:
        print(f"❌ 登录失败: {e}")
        return

    # 2. 创建一个样品
    print("\n2. 创建样品用于测试更新")
    sample_data = {
        "name": f"PUT测试样品_{int(time.time())}",
        "description": "用于测试PUT方法",
        "status": "received"
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(
        "http://localhost:8006/api/v1/samples",
        data=json.dumps(sample_data).encode(),
        headers=headers
    )

    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        sample_id = result["data"]["id"]
        print(f"✅ 创建样品成功 - ID: {sample_id}")
    except Exception as e:
        print(f"❌ 创建样品失败: {e}")
        return

    # 3. 测试 PUT 方法
    print("\n3. 测试 PUT 方法")
    update_data = {
        "name": f"更新后的样品_{int(time.time())}",
        "description": "这是更新后的描述",
        "status": "completed"
    }

    req = urllib.request.Request(
        f"http://localhost:8006/api/v1/samples/{sample_id}",
        data=json.dumps(update_data).encode(),
        headers=headers,
        method="PUT"
    )

    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print(f"✅ PUT 成功 - 响应: {result}")
    except urllib.error.HTTPError as e:
        print(f"❌ PUT 失败 - HTTP {e.code}")
        print(f"   响应内容: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"❌ PUT 失败: {e}")

    # 4. 检查服务是否真的支持 PUT
    print("\n4. 使用 curl 测试")
    try:
        result = subprocess.run([
            "curl", "-X", "PUT",
            "-H", f"Authorization: Bearer {token}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(update_data),
            f"http://localhost:8006/api/v1/samples/{sample_id}",
            "-v"
        ], capture_output=True, text=True, timeout=10)
        print(result.stdout)
        print(result.stderr)
    except Exception as e:
        print(f"curl 执行失败: {e}")

if __name__ == "__main__":
    test_put_method()
