#!/usr/bin/env python3
"""
TOPEMS 完整 CRUD 功能测试
测试 LIMS 和 RS 服务的完整增删改查操作
"""
import urllib.request
import json
import time

class CRUDTest:
    def __init__(self):
        self.token = None
        self.base_url = "http://localhost:8002"
        self.results = []
        self.created_samples = []
        self.created_projects = []

    def log(self, message, success=True):
        status = "✅" if success else "❌"
        self.results.append((status, message))
        print(f"{status} {message}")

    def test_login(self):
        """测试用户登录"""
        print("\n" + "="*70)
        print("1. 用户认证")
        print("="*70)

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
            self.log("登录成功")
            return True
        except Exception as e:
            self.log(f"登录失败: {e}", False)
            return False

    # ==================== LIMS 样品 CRUD ====================

    def test_lims_create(self):
        """测试 LIMS 样品创建"""
        print("\n" + "="*70)
        print("2. LIMS 样品管理 - 创建 (CREATE)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 创建样品 1
        try:
            sample_data = {
                "name": f"测试样品_1_{int(time.time())}",
                "description": "自动化测试创建的样品",
                "status": "received"
            }

            req = urllib.request.Request(
                "http://localhost:8006/api/v1/samples",
                data=json.dumps(sample_data).encode(),
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                sample_id = result["data"]["id"]
                self.created_samples.append(sample_id)
                self.log(f"创建样品 1 成功 - ID: {sample_id[:8]}...")
            else:
                self.log(f"创建样品 1 失败: {result.get('message')}", False)
        except Exception as e:
            self.log(f"创建样品 1 失败: {e}", False)

        # 创建样品 2
        try:
            sample_data = {
                "name": f"测试样品_2_{int(time.time())}",
                "description": "第二个测试样品",
                "status": "processing"
            }

            req = urllib.request.Request(
                "http://localhost:8006/api/v1/samples",
                data=json.dumps(sample_data).encode(),
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                sample_id = result["data"]["id"]
                self.created_samples.append(sample_id)
                self.log(f"创建样品 2 成功 - ID: {sample_id[:8]}...")
        except Exception as e:
            self.log(f"创建样品 2 失败: {e}", False)

    def test_lims_read(self):
        """测试 LIMS 样品读取"""
        print("\n" + "="*70)
        print("3. LIMS 样品管理 - 读取 (READ)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 测试列表查询
        try:
            req = urllib.request.Request(
                "http://localhost:8006/api/v1/samples",
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                total = result['data']['total']
                self.log(f"查询样品列表成功 - 总数: {total}")
        except Exception as e:
            self.log(f"查询样品列表失败: {e}", False)

        # 测试单个查询
        if self.created_samples:
            try:
                sample_id = self.created_samples[0]
                req = urllib.request.Request(
                    f"http://localhost:8006/api/v1/samples/{sample_id}",
                    headers=headers
                )
                response = urllib.request.urlopen(req)
                result = json.loads(response.read())

                if result.get("success"):
                    sample = result["data"]
                    self.log(f"查询单个样品成功 - 名称: {sample['name']}")
            except Exception as e:
                self.log(f"查询单个样品失败: {e}", False)

    def test_lims_update(self):
        """测试 LIMS 样品更新"""
        print("\n" + "="*70)
        print("4. LIMS 样品管理 - 更新 (UPDATE)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        if self.created_samples:
            try:
                sample_id = self.created_samples[0]
                update_data = {
                    "name": f"更新后的样品_{int(time.time())}",
                    "description": "这是更新后的描述",
                    "status": "completed"
                }

                req = urllib.request.Request(
                    f"http://localhost:8006/api/v1/samples/{sample_id}",
                    data=json.dumps(update_data).encode(),
                    headers=headers,
                    method="PUT"  # 明确指定 PUT 方法
                )
                response = urllib.request.urlopen(req)
                result = json.loads(response.read())

                if result.get("success"):
                    sample = result["data"]
                    self.log(f"更新样品成功 - 新名称: {sample['name']}, 新状态: {sample['status']}")
            except Exception as e:
                self.log(f"更新样品失败: {e}", False)

    def test_lims_delete(self):
        """测试 LIMS 样品删除"""
        print("\n" + "="*70)
        print("5. LIMS 样品管理 - 删除 (DELETE)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 删除第一个样品
        if self.created_samples:
            try:
                sample_id = self.created_samples[0]
                req = urllib.request.Request(
                    f"http://localhost:8006/api/v1/samples/{sample_id}",
                    headers=headers,
                    method="DELETE"
                )
                response = urllib.request.urlopen(req)
                result = json.loads(response.read())

                if result.get("success"):
                    self.log(f"删除样品 1 成功 - ID: {sample_id[:8]}...")
                    self.created_samples.pop(0)
            except Exception as e:
                self.log(f"删除样品 1 失败: {e}", False)

    # ==================== RS 项目 CRUD ====================

    def test_rs_create(self):
        """测试 RS 项目创建"""
        print("\n" + "="*70)
        print("6. RS 科研项目管理 - 创建 (CREATE)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 创建项目 1
        try:
            project_data = {
                "name": f"测试项目_1_{int(time.time())}",
                "code": f"PRJ-{int(time.time())}",
                "description": "自动化测试创建的项目",
                "project_type": "research",
                "leader": "admin",
                "team_members": ["user1", "user2"],
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z",
                "budget": 100000
            }

            req = urllib.request.Request(
                "http://localhost:8005/api/v1/projects",
                data=json.dumps(project_data).encode(),
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                project_id = result["data"]["id"]
                self.created_projects.append(project_id)
                self.log(f"创建项目 1 成功 - ID: {project_id[:8]}...")
        except Exception as e:
            self.log(f"创建项目 1 失败: {e}", False)

        # 创建项目 2
        try:
            project_data = {
                "name": f"测试项目_2_{int(time.time())}",
                "code": f"PRJ-{int(time.time()) + 1}",
                "description": "第二个测试项目",
                "project_type": "development",
                "leader": "admin",
                "team_members": [],
                "start_date": "2026-02-01T00:00:00Z",
                "end_date": "2026-11-30T23:59:59Z",
                "budget": 50000
            }

            req = urllib.request.Request(
                "http://localhost:8005/api/v1/projects",
                data=json.dumps(project_data).encode(),
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                project_id = result["data"]["id"]
                self.created_projects.append(project_id)
                self.log(f"创建项目 2 成功 - ID: {project_id[:8]}...")
        except Exception as e:
            self.log(f"创建项目 2 失败: {e}", False)

    def test_rs_read(self):
        """测试 RS 项目读取"""
        print("\n" + "="*70)
        print("7. RS 科研项目管理 - 读取 (READ)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 测试列表查询
        try:
            req = urllib.request.Request(
                "http://localhost:8005/api/v1/projects",
                headers=headers
            )
            response = urllib.request.urlopen(req)
            result = json.loads(response.read())

            if result.get("success"):
                total = result['data']['total']
                self.log(f"查询项目列表成功 - 总数: {total}")
        except Exception as e:
            self.log(f"查询项目列表失败: {e}", False)

        # 测试单个查询
        if self.created_projects:
            try:
                project_id = self.created_projects[0]
                req = urllib.request.Request(
                    f"http://localhost:8005/api/v1/projects/{project_id}",
                    headers=headers
                )
                response = urllib.request.urlopen(req)
                result = json.loads(response.read())

                if result.get("success"):
                    project = result["data"]
                    self.log(f"查询单个项目成功 - 名称: {project['name']}")
            except Exception as e:
                self.log(f"查询单个项目失败: {e}", False)

    def test_rs_update(self):
        """测试 RS 项目更新"""
        print("\n" + "="*70)
        print("8. RS 科研项目管理 - 更新 (UPDATE)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        if self.created_projects:
            try:
                project_id = self.created_projects[0]
                update_data = {
                    "name": f"更新后的项目_{int(time.time())}",
                    "description": "这是更新后的项目描述",
                    "status": "active",
                    "progress": 50
                }

                req = urllib.request.Request(
                    f"http://localhost:8005/api/v1/projects/{project_id}",
                    data=json.dumps(update_data).encode(),
                    headers=headers,
                    method="PUT"  # 明确指定 PUT 方法
                )
                response = urllib.request.urlopen(req)
                result = json.loads(response.read())

                if result.get("success"):
                    project = result["data"]
                    self.log(f"更新项目成功 - 新名称: {project['name']}, 进度: {project['progress']}%")
            except Exception as e:
                self.log(f"更新项目失败: {e}", False)

    def test_rs_delete(self):
        """测试 RS 项目删除"""
        print("\n" + "="*70)
        print("9. RS 科研项目管理 - 删除 (DELETE)")
        print("="*70)

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 删除第一个项目
        if self.created_projects:
            try:
                project_id = self.created_projects[0]
                req = urllib.request.Request(
                    f"http://localhost:8005/api/v1/projects/{project_id}",
                    headers=headers,
                    method="DELETE"
                )
                response = urllib.request.urlopen(req)
                result = json.loads(response.read())

                if result.get("success"):
                    self.log(f"删除项目 1 成功 - ID: {project_id[:8]}...")
                    self.created_projects.pop(0)
            except Exception as e:
                self.log(f"删除项目 1 失败: {e}", False)

    # ==================== 测试总结 ====================

    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "="*70)
        print("CRUD 测试结果摘要")
        print("="*70)

        total = len(self.results)
        passed = sum(1 for status, _ in self.results if status == "✅")
        failed = total - passed

        print(f"\n📊 统计信息:")
        print(f"  总测试数: {total}")
        print(f"  ✅ 通过: {passed}")
        print(f"  ❌ 失败: {failed}")
        print(f"  📈 通过率: {(passed/total*100):.1f}%")

        print(f"\n📝 操作统计:")
        print(f"  LIMS 样品:")
        print(f"    - 创建: {len(self.created_samples) + 1} 个")
        print(f"    - 删除: 1 个")
        print(f"    - 剩余: {len(self.created_samples)} 个")
        print(f"  RS 项目:")
        print(f"    - 创建: {len(self.created_projects) + 1} 个")
        print(f"    - 删除: 1 个")
        print(f"    - 剩余: {len(self.created_projects)} 个")

        if failed > 0:
            print(f"\n⚠️  失败的测试:")
            for status, message in self.results:
                if status == "❌":
                    print(f"  - {message}")

        print("\n" + "="*70)
        if failed == 0:
            print("🎉 所有 CRUD 操作测试通过！")
        else:
            print(f"⚠️  有 {failed} 个测试失败，请检查")
        print("="*70 + "\n")

    def run_all_tests(self):
        """运行所有测试"""
        print("\n🚀 TOPEMS 完整 CRUD 功能测试")
        print("="*70)

        # 1. 用户认证
        if not self.test_login():
            print("\n❌ 登录失败，停止测试")
            return

        # 2-5. LIMS 样品 CRUD
        self.test_lims_create()
        self.test_lims_read()
        self.test_lims_update()
        self.test_lims_delete()

        # 6-9. RS 项目 CRUD
        self.test_rs_create()
        self.test_rs_read()
        self.test_rs_update()
        self.test_rs_delete()

        # 10. 打印总结
        self.print_summary()

if __name__ == "__main__":
    tester = CRUDTest()
    tester.run_all_tests()
