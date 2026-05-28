#!/usr/bin/env python3
"""
TOPEMS 完整功能测试脚本
测试所有服务的 CRUD 操作
"""
import urllib.request
import json
import time

class TOPEMSTest:
    def __init__(self):
        self.token = None
        self.base_url = "http://localhost:8002"
        self.results = []

    def log(self, message, success=True):
        status = "✅" if success else "❌"
        self.results.append((status, message))
        print(f"{status} {message}")

    def test_login(self):
        """测试用户登录"""
        print("\n" + "="*60)
        print("1. 用户认证测试")
        print("="*60)

        login_data = json.dumps({
            "username": "admin",
            "password": "admin123"
        }).encode()

        req = urllib.request.Request(
            f"{self.base_url}/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/json"}
        )

        try:
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())
            self.token = result["data"]["access_token"]

            # 从响应中获取用户名
            user_info = result.get("data", {}).get("user", {})
            username = user_info.get("username", "unknown")

            self.log(f"登录成功 - 用户: {username}")
            return True
        except Exception as e:
            self.log(f"登录失败: {e}", False)
            return False

    def test_lims_samples(self):
        """测试 LIMS 样品管理"""
        print("\n" + "="*60)
        print("2. LIMS 样品管理测试")
        print("="*60)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 测试获取样品列表
        try:
            req = urllib.request.Request(
                "http://localhost:8006/api/v1/samples",
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())
            self.log(f"获取样品列表成功 - 总数: {result['data']['total']}")
        except Exception as e:
            self.log(f"获取样品列表失败: {e}", False)

        # 测试创建样品
        try:
            sample_data = json.dumps({
                "name": f"测试样品_{int(time.time())}",
                "description": "自动化测试创建的样品",
                "status": "received"
            }).encode()

            req = urllib.request.Request(
                "http://localhost:8006/api/v1/samples",
                data=sample_data,
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                sample_id = result["data"]["id"]
                self.log(f"创建样品成功 - ID: {sample_id[:8]}...")

                # 测试获取单个样品
                req = urllib.request.Request(
                    f"http://localhost:8006/api/v1/samples/{sample_id}",
                    headers=headers
                )
                response = urllib.request.urlopen(req)
                self.log("获取单个样品成功")

                return sample_id
        except Exception as e:
            self.log(f"创建样品失败: {e}", False)
            return None

    def test_rs_projects(self):
        """测试 RS 项目管理"""
        print("\n" + "="*60)
        print("3. RS 科研项目管理测试")
        print("="*60)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 测试获取项目列表
        try:
            req = urllib.request.Request(
                "http://localhost:8005/api/v1/projects",
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())
            self.log(f"获取项目列表成功 - 总数: {result['data']['total']}")
        except Exception as e:
            self.log(f"获取项目列表失败: {e}", False)

        # 测试创建项目 - 修复日期格式为 RFC 3339
        try:
            project_data = json.dumps({
                "name": f"测试项目_{int(time.time())}",
                "code": f"PRJ-{int(time.time())}",
                "description": "自动化测试创建的项目",
                "project_type": "research",
                "leader": "admin",
                "team_members": [],
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z",
                "budget": 100000
            }).encode()

            req = urllib.request.Request(
                "http://localhost:8005/api/v1/projects",
                data=project_data,
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                project_id = result["data"]["id"]
                self.log(f"创建项目成功 - ID: {project_id[:8]}...")
                return project_id
        except Exception as e:
            self.log(f"创建项目失败: {e}", False)
            return None

    def test_doc_files(self):
        """测试 DOC 文档管理"""
        print("\n" + "="*60)
        print("4. DOC 文档管理测试")
        print("="*60)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 测试获取文件列表
        try:
            req = urllib.request.Request(
                "http://localhost:8001/api/v1/files",
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())
            self.log(f"获取文件列表成功 - 总数: {result['data']['total']}")
        except Exception as e:
            self.log(f"获取文件列表失败: {e}", False)

        # 测试获取文件夹列表
        try:
            req = urllib.request.Request(
                "http://localhost:8001/api/v1/folders",
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())
            self.log(f"获取文件夹列表成功 - 总数: {len(result['data']['folders'])}")
        except Exception as e:
            self.log(f"获取文件夹列表失败: {e}", False)

    def test_ai_chat(self):
        """测试 AI 聊天功能"""
        print("\n" + "="*60)
        print("5. AI 智能助手测试")
        print("="*60)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 测试聊天功能
        try:
            chat_data = json.dumps({
                "query": "你好，请介绍一下 TOPEMS 系统"
            }).encode()

            req = urllib.request.Request(
                "http://localhost:8003/api/v1/ai/chat",
                data=chat_data,
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                answer = result["data"]["answer"]
                self.log(f"AI 响应成功 - 长度: {len(answer)} 字符")
        except Exception as e:
            self.log(f"AI 响应失败: {e}", False)

    def test_flow_workflows(self):
        """测试 FLOW 工作流"""
        print("\n" + "="*60)
        print("6. FLOW 工作流引擎测试")
        print("="*60)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 测试获取工作流列表
        try:
            req = urllib.request.Request(
                "http://localhost:8004/api/v1/workflows",
                headers=headers
            )
            response = urllib.request.urlopen(req)
            data = response.read().decode('utf-8')
            result = json.loads(data)
            self.log(f"获取工作流列表成功 - 总数: {len(result['data'])}")
        except Exception as e:
            self.log(f"获取工作流列表失败: {e}", False)

    def test_health_checks(self):
        """测试所有服务的健康检查"""
        print("\n" + "="*60)
        print("0. 服务健康检查")
        print("="*60)

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
                response = urllib.request.urlopen(url, timeout=2)
                status_code = response.status
                self.log(f"{name} 服务健康 - 状态码: {status_code}")
            except Exception as e:
                self.log(f"{name} 服务不健康: {e}", False)

    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "="*60)
        print("测试结果摘要")
        print("="*60)

        total = len(self.results)
        passed = sum(1 for status, _ in self.results if status == "✅")
        failed = total - passed

        print(f"\n总计: {total} 项测试")
        print(f"通过: {passed} ✅")
        print(f"失败: {failed} ❌")
        print(f"通过率: {(passed/total*100):.1f}%")

        if failed > 0:
            print("\n失败的测试:")
            for status, message in self.results:
                if status == "❌":
                    print(f"  - {message}")

        print("\n" + "="*60)
        print("🎉 TOPEMS 系统完整功能测试完成！")
        print("="*60 + "\n")

    def run_all_tests(self):
        """运行所有测试"""
        print("\n🚀 TOPEMS 系统完整功能测试")
        print("="*60)

        # 健康检查
        self.test_health_checks()

        # 用户认证
        if not self.test_login():
            print("\n❌ 登录失败，停止测试")
            return

        # LIMS 样品管理
        self.test_lims_samples()

        # RS 科研项目管理
        self.test_rs_projects()

        # DOC 文档管理
        self.test_doc_files()

        # AI 智能助手
        self.test_ai_chat()

        # FLOW 工作流
        self.test_flow_workflows()

        # 打印摘要
        self.print_summary()

if __name__ == "__main__":
    tester = TOPEMSTest()
    tester.run_all_tests()
