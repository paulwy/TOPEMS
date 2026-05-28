#!/usr/bin/env python3
import urllib.request
import json

def debug_rs_project_create():
    """调试 RS 项目创建 API"""

    # 1. 登录获取 token
    print("=" * 60)
    print("1. 登录获取 Token")
    print("=" * 60)

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

    # 2. 检查 RS 服务的模型定义
    print("\n" + "=" * 60)
    print("2. 检查 RS 项目 API 模型")
    print("=" * 60)

    # 读取 RS 服务的模型定义
    try:
        with open("/Users/xingzhai/TOPEMS/services/topems-rs/backend/src/models/mod.rs", "r") as f:
            content = f.read()
            print("找到模型定义文件")

            # 查找 CreateProjectRequest 结构
            if "CreateProjectRequest" in content:
                print("✅ 找到 CreateProjectRequest 结构")

                # 提取结构定义
                start = content.find("pub struct CreateProjectRequest")
                if start != -1:
                    end = content.find("}", start)
                    struct_def = content[start:end+1]
                    print("\n结构定义:")
                    print(struct_def)
    except Exception as e:
        print(f"❌ 读取模型文件失败: {e}")

    # 3. 尝试不同的请求格式
    print("\n" + "=" * 60)
    print("3. 测试不同的项目创建格式")
    print("=" * 60)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 尝试 1: 包含所有字段
    project_data_1 = {
        "name": "测试项目_1",
        "code": "PRJ-001",
        "description": "自动化测试创建的项目",
        "project_type": "research",
        "leader": "admin",
        "team_members": [],
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
        "budget": 100000
    }

    print("\n尝试 1: 包含所有字段")
    req = urllib.request.Request(
        "http://localhost:8005/api/v1/projects",
        data=json.dumps(project_data_1).encode(),
        headers=headers
    )

    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print(f"✅ 成功 - {result.get('message', '创建成功')}")
        print(f"   项目 ID: {result['data']['id']}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ 失败 (422) - 错误详情: {error_body}")
    except Exception as e:
        print(f"❌ 失败 - {e}")

    # 尝试 2: 最少字段
    project_data_2 = {
        "name": "测试项目_2",
        "code": "PRJ-002",
        "leader": "admin"
    }

    print("\n尝试 2: 最少字段")
    req = urllib.request.Request(
        "http://localhost:8005/api/v1/projects",
        data=json.dumps(project_data_2).encode(),
        headers=headers
    )

    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        print(f"✅ 成功 - {result.get('message', '创建成功')}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ 失败 (422) - 错误详情: {error_body}")
    except Exception as e:
        print(f"❌ 失败 - {e}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    debug_rs_project_create()
