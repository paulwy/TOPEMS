#!/usr/bin/env python3

import urllib.request
import json

def post(url, data):
    login_resp = urllib.request.urlopen(
        urllib.request.Request(
            "http://localhost:3000/iam/api/v1/auth/login",
            data=json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method='POST'
        )
    )
    login_data = json.loads(login_resp.read().decode('utf-8'))
    token = login_data["data"]["access_token"]
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def get(url):
    login_resp = urllib.request.urlopen(
        urllib.request.Request(
            "http://localhost:3000/iam/api/v1/auth/login",
            data=json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method='POST'
        )
    )
    login_data = json.loads(login_resp.read().decode('utf-8'))
    token = login_data["data"]["access_token"]
    
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
        method='GET'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Request failed: {e}")
        return None

print("=== 初始化HRM测试数据 ===")

# 创建部门
print("\n1. 创建部门数据...")

departments = [
    {"name": "技术部", "code": "TECH", "description": "负责公司技术研发", "status": "active"},
    {"name": "产品部", "code": "PROD", "description": "负责产品设计和规划", "status": "active"},
    {"name": "人力资源部", "code": "HR", "description": "负责员工管理和招聘", "status": "active"},
    {"name": "财务部", "code": "FIN", "description": "负责财务管理", "status": "active"},
    {"name": "市场部", "code": "MKT", "description": "负责市场推广和销售", "status": "active"},
]

for dept in departments:
    resp = post("http://localhost:3000/hrm/api/v1/departments", dept)
    if resp and resp.get("code") == 200:
        print(f"  创建部门: {dept['name']} - 成功")
    else:
        print(f"  创建部门: {dept['name']} - 失败")

# 获取部门信息
print("\n2. 获取部门信息...")
dept_result = get("http://localhost:3000/hrm/api/v1/departments?page_size=100")
dept_ids = {}
if dept_result and dept_result.get("code") == 200:
    for dept in dept_result.get("data", {}).get("departments", []):
        dept_ids[dept["name"]] = dept["id"]
        print(f"  {dept['name']}: {dept['id'][:8]}...")

# 创建职位
print("\n3. 创建职位数据...")

positions = [
    {"name": "高级工程师", "code": "SE-SENIOR", "department_id": dept_ids.get("技术部"), "level": "P6", "min_salary": 20000, "max_salary": 35000, "description": "负责核心技术研发", "requirements": "5年以上开发经验", "status": "active"},
    {"name": "中级工程师", "code": "SE-MID", "department_id": dept_ids.get("技术部"), "level": "P4", "min_salary": 12000, "max_salary": 20000, "description": "负责模块开发", "requirements": "3年以上开发经验", "status": "active"},
    {"name": "初级工程师", "code": "SE-JUNIOR", "department_id": dept_ids.get("技术部"), "level": "P2", "min_salary": 6000, "max_salary": 12000, "description": "负责基础开发", "requirements": "1年以上开发经验", "status": "active"},
    {"name": "产品经理", "code": "PM", "department_id": dept_ids.get("人力资源部"), "level": "P5", "min_salary": 15000, "max_salary": 25000, "description": "负责产品设计和需求分析", "requirements": "3年以上产品经验", "status": "active"},
    {"name": "财务主管", "code": "FIN-MGR", "department_id": dept_ids.get("财务部"), "level": "P5", "min_salary": 18000, "max_salary": 30000, "description": "负责财务团队管理", "requirements": "5年以上财务经验", "status": "active"},
]

for pos in positions:
    if pos["department_id"]:
        resp = post("http://localhost:3000/hrm/api/v1/positions", pos)
        if resp and resp.get("code") == 200:
            print(f"  创建职位: {pos['name']} - 成功")
        else:
            print(f"  创建职位: {pos['name']} - 失败")
    else:
        print(f"  创建职位: {pos['name']} - 跳过（部门ID为空）")

# 创建员工
print("\n4. 创建员工数据...")

employees = [
    {"employee_number": "EMP001", "name": "张三", "email": "zhangsan@example.com", "phone": "13800138001", "department_id": dept_ids.get("技术部"), "position": "高级工程师", "hire_date": "2024-01-15", "status": "active"},
    {"employee_number": "EMP002", "name": "李四", "email": "lisi@example.com", "phone": "13800138002", "department_id": dept_ids.get("技术部"), "position": "中级工程师", "hire_date": "2025-03-20", "status": "active"},
    {"employee_number": "EMP003", "name": "王五", "email": "wangwu@example.com", "phone": "13800138003", "department_id": dept_ids.get("人力资源部"), "position": "产品经理", "hire_date": "2023-06-10", "status": "active"},
    {"employee_number": "EMP004", "name": "赵六", "email": "zhaoliu@example.com", "phone": "13800138004", "department_id": dept_ids.get("财务部"), "position": "财务主管", "hire_date": "2022-09-01", "status": "active"},
    {"employee_number": "EMP005", "name": "钱七", "email": "qianqi@example.com", "phone": "13800138005", "department_id": dept_ids.get("技术部"), "position": "初级工程师", "hire_date": "2025-08-15", "status": "active"},
]

for emp in employees:
    if emp["department_id"]:
        resp = post("http://localhost:3000/hrm/api/v1/employees", emp)
        if resp and resp.get("code") == 200:
            print(f"  创建员工: {emp['name']} - 成功")
        else:
            print(f"  创建员工: {emp['name']} - 失败: {resp}")
    else:
        print(f"  创建员工: {emp['name']} - 跳过（部门ID为空）")

print("\n=== HRM测试数据初始化完成 ===")