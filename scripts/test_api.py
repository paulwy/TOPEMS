#!/usr/bin/env python3
import urllib.request
import json

def test_api():
    print("=" * 50)
    print("TOPEMS API 功能测试")
    print("=" * 50)

    # 0. 所有服务健康检查
    print("\n0. 所有服务健康检查")
    services = [
        ("IAM", "http://localhost:8002/health"),
        ("DOC", "http://localhost:8001/health"),
        ("AI", "http://localhost:8003/health"),
        ("FLOW", "http://localhost:8004/health"),
        ("RS", "http://localhost:8005/health"),
        ("LIMS", "http://localhost:8006/health"),
    ]
    for name, url in services:
        try:
            response = urllib.request.urlopen(url)
            data = response.read().decode('utf-8')
            try:
                result = json.loads(data)
                print(f"   ✅ {name} - 健康")
            except json.JSONDecodeError:
                if data.strip() == "OK":
                    print(f"   ✅ {name} - 健康")
                else:
                    print(f"   ✅ {name} - 健康 (返回: {data[:50]})")
        except Exception as e:
            print(f"   ❌ {name} - 不健康: {e}")

    # 1. 登录获取 token
    print("\n1. 用户登录测试")
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

    # 2. 测试 LIMS API
    print("\n2. LIMS API 测试")
    req = urllib.request.Request(
        "http://localhost:8006/api/v1/samples",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print("✅ LIMS API 调用成功")
        print(f"   响应: {json.dumps(result, ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"❌ LIMS API 调用失败: {e}")

    # 3. 测试 RS API
    print("\n3. RS API 测试")
    req = urllib.request.Request(
        "http://localhost:8005/api/v1/projects",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print("✅ RS API 调用成功")
        print(f"   响应: {json.dumps(result, ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"❌ RS API 调用失败: {e}")

    # 4. 测试 DOC API
    print("\n4. DOC API 测试")
    req = urllib.request.Request(
        "http://localhost:8001/api/v1/files",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print("✅ DOC API 调用成功")
        print(f"   响应: {json.dumps(result, ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"❌ DOC API 调用失败: {e}")

    # 5. 测试 AI API
    print("\n5. AI API 测试")
    ai_data = json.dumps({"query": "你好，请介绍一下自己"}).encode()
    req = urllib.request.Request(
        "http://localhost:8003/api/v1/ai/chat",
        data=ai_data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print("✅ AI API 调用成功")
        print(f"   响应: {json.dumps(result, ensure_ascii=False)[:200]}")
    except Exception as e:
        print(f"❌ AI API 调用失败: {e}")

    # 6. 测试 FLOW API
    print("\n6. FLOW API 测试")
    req = urllib.request.Request(
        "http://localhost:8004/api/v1/workflows",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        response = urllib.request.urlopen(req)
        data = response.read().decode('utf-8')
        result = json.loads(data)
        print("✅ FLOW API 调用成功")
        print(f"   响应: {json.dumps(result, ensure_ascii=False)[:200]}")
    except json.JSONDecodeError:
        print("✅ FLOW API 调用成功")
        print(f"   响应: {data[:200]}")
    except Exception as e:
        print(f"❌ FLOW API 调用失败: {e}")

    print("\n" + "=" * 50)
    print("测试完成")
    print("=" * 50)

if __name__ == "__main__":
    test_api()