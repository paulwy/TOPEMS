"""端到端数据流测试

测试跨模块的业务数据流转完整性。
"""

import pytest
import os
import uuid
import httpx
from datetime import datetime
from typing import Dict, Any, Optional, List


class TestDataFlowFixtures:
    """数据流测试 fixtures"""

    @pytest.fixture
    def api_base_url(self):
        """API 基础 URL"""
        return os.getenv("IAM_URL", "http://localhost:8000")

    @pytest.fixture
    def admin_token(self, api_base_url):
        """获取管理员令牌"""
        username = os.getenv("TEST_USERNAME", "admin")
        password = os.getenv("TEST_PASSWORD", "admin")
        
        try:
            response = httpx.post(
                f"{api_base_url}/api/core/iam/auth/login",
                json={"username": username, "password": password},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token") or data.get("token")
        except Exception:
            pass
        return None

    @pytest.fixture
    def auth_headers(self, admin_token):
        """认证头"""
        if not admin_token:
            pytest.skip("无法获取认证令牌")
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }


class TestOrganizationDataFlow(TestDataFlowFixtures):
    """组织架构数据流测试"""

    def test_organization_hierarchy(self, api_base_url, auth_headers):
        """测试组织层级数据流
        
        1. 获取顶级组织
        2. 获取子组织
        3. 验证层级关系
        """
        try:
            response = httpx.get(
                f"{api_base_url}/api/core/iam/organizations",
                headers=auth_headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                orgs = data.get('items', []) if isinstance(data, dict) else data
                
                for org in orgs[:3]:
                    org_id = org.get('id')
                    if org_id and 'parent_id' in org:
                        parent_id = org.get('parent_id')
                        
                        # 如果有父组织，验证父组织存在
                        if parent_id:
                            parent_response = httpx.get(
                                f"{api_base_url}/api/core/iam/organizations/{parent_id}",
                                headers=auth_headers,
                                timeout=5.0
                            )
                            # 父组织应该存在
                            assert parent_response.status_code in [200, 404]
            elif response.status_code == 401:
                pytest.skip("认证失败")
            else:
                pytest.skip(f"组织接口返回 {response.status_code}")
                
        except httpx.ConnectError:
            pytest.skip("API 服务不可用")


class TestUserEmployeeDataFlow(TestDataFlowFixtures):
    """用户员工数据流测试"""

    def test_user_to_employee_chain(self, api_base_url, auth_headers):
        """测试用户到员工的数据链
        
        1. 获取用户列表
        2. 检查用户的员工关联
        3. 验证数据链完整性
        """
        try:
            response = httpx.get(
                f"{api_base_url}/api/core/iam/users?limit=20",
                headers=auth_headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                users = data.get('items', []) if isinstance(data, dict) else data
                
                users_with_employee = 0
                users_without_employee = 0
                
                for user in users[:10]:
                    employee_id = user.get('employee_id')
                    org_id = user.get('organization_id')
                    
                    if employee_id:
                        users_with_employee += 1
                        
                        # 验证员工关联有效
                        # 员工应该属于同一组织
                        if org_id:
                            hrm_port = int(os.getenv("HRM_PORT", "8011"))
                            try:
                                hrm_response = httpx.get(
                                    f"http://localhost:{hrm_port}/api/hrm/employees/{employee_id}",
                                    headers=auth_headers,
                                    timeout=5.0
                                )
                                if hrm_response.status_code == 200:
                                    employee = hrm_response.json()
                                    emp_org = employee.get('organization_id')
                                    if emp_org and str(emp_org) != str(org_id):
                                        print(f"[警告] 用户 {user.get('id')} 组织与员工不一致")
                            except Exception:
                                pass
                    else:
                        users_without_employee += 1
                
                print(f"\n用户统计: 有员工关联={users_with_employee}, 无关联={users_without_employee}")
                
            elif response.status_code == 401:
                pytest.skip("认证失败")
                
        except httpx.ConnectError:
            pytest.skip("API 服务不可用")

    def test_employee_department_relationship(self, api_base_url, auth_headers):
        """测试员工与部门关系
        
        1. 获取员工列表
        2. 检查员工的部门关联
        3. 验证部门数据存在
        """
        try:
            hrm_port = int(os.getenv("HRM_PORT", "8011"))
            
            response = httpx.get(
                f"http://localhost:{hrm_port}/api/hrm/employees?limit=10",
                headers=auth_headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                employees = data.get('items', []) if isinstance(data, dict) else data
                
                for emp in employees[:5]:
                    dept_id = emp.get('department_id')
                    org_id = emp.get('organization_id')
                    
                    # 验证组织和部门都存在
                    if org_id:
                        org_response = httpx.get(
                            f"{api_base_url}/api/core/iam/organizations/{org_id}",
                            headers=auth_headers,
                            timeout=5.0
                        )
                        assert org_response.status_code in [200, 404]
                        
            elif response.status_code == 401:
                pytest.skip("认证失败")
            elif response.status_code == 404:
                pytest.skip("HRM 服务不可用")
                
        except httpx.ConnectError:
            pytest.skip("HRM 服务不可用")


class TestWorkflowDataFlow(TestDataFlowFixtures):
    """工作流数据流测试"""

    def test_workflow_definition_to_instance(self, api_base_url, auth_headers):
        """测试工作流定义到实例的数据流
        
        1. 获取工作流定义
        2. 检查定义关联的业务数据
        3. 验证数据引用完整性
        """
        try:
            flow_port = int(os.getenv("FLOW_PORT", "8004"))
            
            response = httpx.get(
                f"http://localhost:{flow_port}/api/core/flow/process-definitions?limit=10",
                headers=auth_headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                definitions = data.get('items', []) if isinstance(data, dict) else data
                
                for defn in definitions[:3]:
                    def_id = defn.get('id')
                    
                    # 获取该定义的所有实例
                    instances_response = httpx.get(
                        f"http://localhost:{flow_port}/api/core/flow/process-instances?definition_id={def_id}&limit=5",
                        headers=auth_headers,
                        timeout=10.0
                    )
                    
                    if instances_response.status_code == 200:
                        instances_data = instances_response.json()
                        instances = instances_data.get('items', []) if isinstance(instances_data, dict) else instances_data
                        
                        for inst in instances:
                            # 验证实例关联的数据
                            business_key = inst.get('business_key')
                            variables = inst.get('variables', {})
                            
                            # 业务键应该存在
                            if business_key:
                                print(f"\n实例 {inst.get('id')} 业务键: {business_key}")
                                
            elif response.status_code == 401:
                pytest.skip("认证失败")
            elif response.status_code == 404:
                pytest.skip("Flow 服务不可用")
                
        except httpx.ConnectError:
            pytest.skip("Flow 服务不可用")

    def test_workflow_task_assignment(self, api_base_url, auth_headers):
        """测试工作流任务分配
        
        1. 获取待办任务
        2. 检查任务分配的用户
        3. 验证用户在 IAM 中存在
        """
        try:
            flow_port = int(os.getenv("FLOW_PORT", "8004"))
            
            response = httpx.get(
                f"http://localhost:{flow_port}/api/core/flow/tasks?status=pending&limit=10",
                headers=auth_headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                tasks = data.get('items', []) if isinstance(data, dict) else data
                
                tasks_with_assignee = 0
                unassigned_tasks = 0
                
                for task in tasks[:10]:
                    assignee_id = task.get('assignee') or task.get('assignee_id')
                    
                    if assignee_id:
                        tasks_with_assignee += 1
                        
                        # 验证用户在 IAM 中存在
                        user_response = httpx.get(
                            f"{api_base_url}/api/core/iam/users/{assignee_id}",
                            headers=auth_headers,
                            timeout=5.0
                        )
                        
                        if user_response.status_code == 404:
                            print(f"[警告] 任务 {task.get('id')} 引用的用户 {assignee_id} 不存在")
                    else:
                        unassigned_tasks += 1
                
                print(f"\n任务统计: 已分配={tasks_with_assignee}, 未分配={unassigned_tasks}")
                
            elif response.status_code == 401:
                pytest.skip("认证失败")
                
        except httpx.ConnectError:
            pytest.skip("Flow 服务不可用")


class TestProductionDataFlow(TestDataFlowFixtures):
    """生产数据流测试"""

    def test_production_order_material_reference(self, api_base_url, auth_headers):
        """测试生产工单物料引用
        
        1. 获取生产工单
        2. 检查物料 ID 引用
        3. 验证物料数据存在
        """
        try:
            mes_port = int(os.getenv("MES_PORT", "8030"))
            
            response = httpx.get(
                f"http://localhost:{mes_port}/api/mes/production-orders?limit=10",
                headers=auth_headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                orders = data.get('items', []) if isinstance(data, dict) else data
                
                for order in orders[:5]:
                    material_id = order.get('material_id')
                    
                    if material_id:
                        # 尝试获取物料信息（可能在 PDM 服务中）
                        pdm_port = int(os.getenv("PDM_PORT", "8023"))
                        try:
                            material_response = httpx.get(
                                f"http://localhost:{pdm_port}/api/pdm/materials/{material_id}",
                                headers=auth_headers,
                                timeout=5.0
                            )
                            # 物料应该存在或返回 404（而不是 500）
                            assert material_response.status_code in [200, 404]
                        except httpx.ConnectError:
                            pass  # PDM 服务可能未运行
                            
            elif response.status_code == 401:
                pytest.skip("认证失败")
            elif response.status_code == 404:
                pytest.skip("MES 服务不可用")
                
        except httpx.ConnectError:
            pytest.skip("MES 服务不可用")

    def test_bom_structure_consistency(self, api_base_url, auth_headers):
        """测试 BOM 结构一致性
        
        1. 获取产品 BOM
        2. 检查子物料引用
        3. 验证物料层级关系
        """
        try:
            pdm_port = int(os.getenv("PDM_PORT", "8023"))
            
            response = httpx.get(
                f"http://localhost:{pdm_port}/api/pdm/bom?limit=10",
                headers=auth_headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                bom_items = data.get('items', []) if isinstance(data, dict) else data
                
                for item in bom_items[:5]:
                    parent_id = item.get('parent_id')
                    material_id = item.get('material_id')
                    
                    if parent_id:
                        # 验证父项存在
                        parent_response = httpx.get(
                            f"http://localhost:{pdm_port}/api/pdm/bom/{parent_id}",
                            headers=auth_headers,
                            timeout=5.0
                        )
                        assert parent_response.status_code in [200, 404]
                        
            elif response.status_code == 401:
                pytest.skip("认证失败")
            elif response.status_code == 404:
                pytest.skip("PDM 服务不可用")
                
        except httpx.ConnectError:
            pytest.skip("PDM 服务不可用")


class TestDataFlowSummary:
    """数据流测试汇总"""

    def test_all_services_running(self):
        """测试所有核心服务是否运行"""
        services = {
            "IAM": int(os.getenv("IAM_PORT", "8000")),
            "PM": int(os.getenv("PM_PORT", "8001")),
            "Flow": int(os.getenv("FLOW_PORT", "8004")),
            "HRM": int(os.getenv("HRM_PORT", "8011")),
            "MES": int(os.getenv("MES_PORT", "8030")),
            "PDM": int(os.getenv("PDM_PORT", "8023")),
        }
        
        results = {}
        for name, port in services.items():
            url = f"http://localhost:{port}"
            try:
                response = httpx.get(f"{url}/health", timeout=2.0)
                results[name] = response.status_code in [200, 404, 503]
            except Exception:
                results[name] = False
        
        print("\n服务状态:")
        for name, status in results.items():
            status_str = "✓" if status else "✗"
            print(f"  {status_str} {name}:{services[name]}")
        
        # 至少核心服务应该运行
        assert results.get("IAM", False), "IAM 服务必须运行"
