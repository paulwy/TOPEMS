#!/bin/bash

echo "=== 初始化HRM测试数据 ==="

# 登录获取token
echo "1. 登录系统..."
LOGIN_RESP=$(curl -s -X POST http://localhost:3000/iam/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "登录失败!"
  exit 1
fi

echo "登录成功，Token获取完成"

# 创建部门
echo ""
echo "2. 创建部门数据..."

curl -s -X POST http://localhost:3000/hrm/api/v1/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"技术部","code":"TECH","description":"负责公司技术研发","status":"active"}'

curl -s -X POST http://localhost:3000/hrm/api/v1/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"产品部","code":"PROD","description":"负责产品设计和规划","status":"active"}'

curl -s -X POST http://localhost:3000/hrm/api/v1/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"人力资源部","code":"HR","description":"负责员工管理和招聘","status":"active"}'

curl -s -X POST http://localhost:3000/hrm/api/v1/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"财务部","code":"FIN","description":"负责财务管理","status":"active"}'

curl -s -X POST http://localhost:3000/hrm/api/v1/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"市场部","code":"MKT","description":"负责市场推广和销售","status":"active"}'

echo "部门创建完成"

# 获取部门ID
echo ""
echo "3. 获取部门信息..."
DEPARTMENTS=$(curl -s http://localhost:3000/hrm/api/v1/departments -H "Authorization: Bearer $TOKEN")
TECH_DEPT_ID=$(echo "$DEPARTMENTS" | grep -o '"id":"[^"]*"[^"]*"name":"技术部"' | cut -d'"' -f4)
HR_DEPT_ID=$(echo "$DEPARTMENTS" | grep -o '"id":"[^"]*"[^"]*"name":"人力资源部"' | cut -d'"' -f4)

echo "技术部ID: ${TECH_DEPT_ID:0:8}..."
echo "人力资源部ID: ${HR_DEPT_ID:0:8}..."

# 创建职位
echo ""
echo "4. 创建职位数据..."

curl -s -X POST http://localhost:3000/hrm/api/v1/positions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"高级工程师\",\"code\":\"SE-SENIOR\",\"department_id\":\"$TECH_DEPT_ID\",\"level\":\"P6\",\"min_salary\":20000,\"max_salary\":35000,\"description\":\"负责核心技术研发\",\"requirements\":\"5年以上开发经验\",\"status\":\"active\"}"

curl -s -X POST http://localhost:3000/hrm/api/v1/positions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"中级工程师\",\"code\":\"SE-MID\",\"department_id\":\"$TECH_DEPT_ID\",\"level\":\"P4\",\"min_salary\":12000,\"max_salary\":20000,\"description\":\"负责模块开发\",\"requirements\":\"3年以上开发经验\",\"status\":\"active\"}"

curl -s -X POST http://localhost:3000/hrm/api/v1/positions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"初级工程师\",\"code\":\"SE-JUNIOR\",\"department_id\":\"$TECH_DEPT_ID\",\"level\":\"P2\",\"min_salary\":6000,\"max_salary\":12000,\"description\":\"负责基础开发\",\"requirements\":\"1年以上开发经验\",\"status\":\"active\"}"

curl -s -X POST http://localhost:3000/hrm/api/v1/positions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"产品经理\",\"code\":\"PM\",\"department_id\":\"$HR_DEPT_ID\",\"level\":\"P5\",\"min_salary\":15000,\"max_salary\":25000,\"description\":\"负责产品设计和需求分析\",\"requirements\":\"3年以上产品经验\",\"status\":\"active\"}"

echo "职位创建完成"

# 创建员工
echo ""
echo "5. 创建员工数据..."

curl -s -X POST http://localhost:3000/hrm/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"employee_number\":\"EMP001\",\"name\":\"张三\",\"email\":\"zhangsan@example.com\",\"phone\":\"13800138001\",\"department_id\":\"$TECH_DEPT_ID\",\"position\":\"高级工程师\",\"hire_date\":\"2024-01-15\",\"status\":\"active\"}"

curl -s -X POST http://localhost:3000/hrm/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"employee_number\":\"EMP002\",\"name\":\"李四\",\"email\":\"lisi@example.com\",\"phone\":\"13800138002\",\"department_id\":\"$TECH_DEPT_ID\",\"position\":\"中级工程师\",\"hire_date\":\"2025-03-20\",\"status\":\"active\"}"

curl -s -X POST http://localhost:3000/hrm/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"employee_number\":\"EMP003\",\"name\":\"王五\",\"email\":\"wangwu@example.com\",\"phone\":\"13800138003\",\"department_id\":\"$HR_DEPT_ID\",\"position\":\"产品经理\",\"hire_date\":\"2023-06-10\",\"status\":\"active\"}"

echo "员工创建完成"

echo ""
echo "=== HRM测试数据初始化完成 ==="
echo "部门数: $(echo "$DEPARTMENTS" | grep -o '"name"' | wc -l)"
echo "职位数: $(curl -s http://localhost:3000/hrm/api/v1/positions -H "Authorization: Bearer $TOKEN" | grep -o '"name"' | wc -l)"
echo "员工数: $(curl -s http://localhost:3000/hrm/api/v1/employees -H "Authorization: Bearer $TOKEN" | grep -o '"name"' | wc -l)"