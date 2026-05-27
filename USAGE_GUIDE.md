# TOPEMS 平台使用指南 v2.2

## 🚀 快速启动

### 一键启动所有服务

```bash
cd /Users/xingzhai/TOPEMS
chmod +x start-topems.sh
./start-topems.sh
```

### 手动启动

```bash
# 1. 启动 IAM 服务
cd platform/topems-iam/backend
cargo run

# 2. 启动 DOC 服务
cd platform/topems-doc/backend
cargo run

# 3. 启动 AI 服务
cd platform/topems-ai/backend
cargo run

# 4. 启动 RS 服务
cd services/topems-rs/backend
cargo run

# 5. 启动前端
cd ../frontend
npm install
npm run dev
```

## 🔐 登录账号

| 角色 | 用户名 | 密码 | 权限 |
| ------ | ------ | ------ | ------ |
| 管理员 | `admin123` | `Admin123` | 全部权限 |
| 普通用户 | `testuser` | `Test123456` | 基础权限 |
| 访客 | `guestuser` | `Guest123` | 只读权限 |

**访问地址**: [http://localhost:3000](http://localhost:3000)

## 📦 服务端口

| 服务 | 端口 | 说明 |
| ------ | ------ | ------ |
| 统一门户 | 3000 | 前端主应用 |
| TOPEMS-IAM | 8002 | 身份认证与权限管理 |
| TOPEMS-DOC | 8001 | 文档管理系统 |
| TOPEMS-AI | 8004 | AI 知识库 |
| TOPEMS-RS-backend | 8005 | 科研研发管理 |

## 🧪 运行测试

```bash
# 运行 API 测试
cd /Users/xingzhai/TOPEMS
chmod +x scripts/test-topems.sh
./scripts/test-topems.sh
```

## 📊 TOPEMS-RS 功能概览

### 项目管理

- 创建和管理科研项目
- 项目立项、审批、结题
- 团队成员管理
- 进度跟踪
- 预算管理

**API 端点**:

- `GET /api/v1/projects` - 获取项目列表
- `POST /api/v1/projects` - 创建项目
- `GET /api/v1/projects/{id}` - 获取项目详情
- `PUT /api/v1/projects/{id}` - 更新项目
- `DELETE /api/v1/projects/{id}` - 删除项目

### 配方管理

- 配方创建和版本管理
- 配方库管理
- 原料配比管理
- 工艺参数配置
- 配方性能属性

**API 端点**:

- `GET /api/v1/formulas` - 获取配方列表
- `POST /api/v1/formulas` - 创建配方
- `GET /api/v1/formulas/{id}` - 获取配方详情
- `PUT /api/v1/formulas/{id}` - 更新配方
- `DELETE /api/v1/formulas/{id}` - 删除配方
- `GET /api/v1/formulas/{id}/versions` - 获取配方版本历史

### 试验管理

- 试验计划与执行
- 试验记录
- 试验结果分析
- 试验报告生成

**API 端点**:

- `GET /api/v1/experiments` - 获取试验列表
- `POST /api/v1/experiments` - 创建试验
- `GET /api/v1/experiments/{id}` - 获取试验详情
- `PUT /api/v1/experiments/{id}` - 更新试验
- `DELETE /api/v1/experiments/{id}` - 删除试验
- `GET /api/v1/experiments/{id}/records` - 获取试验记录

## 🔍 API 测试示例

### 使用 curl 测试

```bash
# 1. 登录获取 Token
TOKEN=$(curl -s -X POST "http://localhost:8002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin123","password":"Admin123"}' \
  | jq -r '.data.access_token')

# 2. 获取项目列表
curl -s http://localhost:8005/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. 创建新项目
curl -s -X POST http://localhost:8005/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "高性能聚乙烯研发",
    "code": "RS-2026-001",
    "project_type": "research",
    "leader": "张三",
    "start_date": "2026-06-01T00:00:00Z"
  }' | jq .

# 4. 获取配方列表
curl -s http://localhost:8005/api/v1/formulas \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. 创建配方
curl -s -X POST http://localhost:8005/api/v1/formulas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "PE-001 基础配方",
    "code": "FORMULA-2026-001",
    "ingredients": [
      {"name": "聚乙烯", "ratio": 60.0, "unit": "%"},
      {"name": "增塑剂", "ratio": 30.0, "unit": "%"}
    ]
  }' | jq .
```

## 📁 项目结构

```text
TOPEMS/
├── platform/                    # 平台底座
│   ├── topems-iam/            # 身份认证与权限
│   ├── topems-doc/            # 文档管理
│   ├── topems-ai/             # AI 知识库
│   └── topems-flow/           # 工作流引擎
├── services/                   # 业务系统
│   └── topems-rs/            # 科研研发管理
│       ├── backend/           # Rust 后端
│       ├── frontend/          # React 前端
│       └── docs/              # 技术文档
└── frontend/                   # 统一门户
```

## 🛠️ 常用命令

```bash
# 查看服务状态
lsof -i :3000 -i :8001 -i :8002 -i :8005

# 查看服务日志
tail -f /tmp/topems-*.log

# 重启所有服务
lsof -ti:3000,8001,8002,8005 | xargs kill -9
./start-topems.sh

# 清理测试数据
psql -d topems_rs -c "DELETE FROM projects;"
psql -d topems_rs -c "DELETE FROM formulas;"
psql -d topems_rs -c "DELETE FROM experiments;"
```

## 🐛 常见问题

### 1. 服务启动失败

检查端口是否被占用：

```bash
lsof -i :8005
```

### 2. 数据库连接失败

确保 PostgreSQL 服务正在运行：

```bash
pg_isready
```

### 3. 前端无法访问后端 API

检查 CORS 配置：

```bash
curl -I http://localhost:8005/health
```

### 4. 登录失败

确保使用正确的用户名和密码（区分大小写）。

## 📈 性能优化

### 数据库优化

```sql
-- 查看慢查询
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- 创建索引
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_leader ON projects(leader);
```

### API 缓存

使用 Redis 缓存热门数据（待实现）。

## 🎯 下一步开发

### TOPEMS-RS 完善

- [ ] 项目详情页面
- [ ] 新建/编辑项目表单
- [ ] 配方版本管理界面
- [ ] 试验记录管理界面
- [ ] 数据可视化图表

### 新模块

- [ ] TOPEMS-LIMS 实验室信息管理
- [ ] TOPEMS-QMS 质量合规管理
- [ ] TOPEMS-EHS 安全环保管理
- [ ] TOPEMS-ERP 企业资源计划

## 📞 技术支持

如有问题，请联系开发团队或查看日志文件。

## 📄 许可证

专有软件 - TOPEMS Team
