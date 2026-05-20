# TOPEMS 快速启动指南

## 🚀 第一阶段：启动 TOPEMS-DOC 文档管理服务

### 第一步：启动后端服务（终端窗口一）

```bash
cd /Users/air/TOPEMS/platform/topems-doc/backend
cargo run
```

等待看到类似以下输出：

```
✅ TOPEMS-DOC 服务运行在 http://0.0.0.0:8001
```

### 第二步：测试后端 API

打开浏览器访问：http://localhost:8001/health

或在新终端测试：

```bash
curl http://localhost:8001/health
```

应该看到：
```json
{
  "success": true,
  "data": "TOPEMS-DOC is running!",
  "message": "OK"
}
```

### 第三步：启动前端服务（终端窗口二）

```bash
cd /Users/air/TOPEMS/platform/topems-doc/frontend
npm install
npm run dev
```

等待看到类似输出：

```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### 第四步：访问前端界面

在浏览器打开：http://localhost:5173

应该看到 TOPEMS-DOC 文档管理界面！

---

## 📦 项目架构

```
TOPEMS/
├── platform/
│   ├── topems-doc/         # 文档管理服务 ✅
│   ├── topems-iam/         # 身份认证服务
│   ├── topems-flow/        # 工作流服务
│   ├── topems-mobile/      # 移动服务
│   └── topems-im/          # 即时通讯
├── services/
│   ├── topems-ai/          # AI 知识库
│   ├── topems-rs/          # 科研管理
│   ├── topems-lims/        # 实验室管理
│   ├── topems-qms/         # 质量合规
│   ├── topems-ehs/         # 安全环保
│   ├── topems-erp/         # 企业资源
│   ├── topems-srm/         # 供应商
│   ├── topems-gis/         # 空间数字化
│   └── topems-bi/          # 数据可视化
├── infrastructure/         # 基础设施
├── docs/                   # 文档
└── shared/                 # 共享代码
```

---

## 🔧 常用命令

### 检查服务状态

```bash
# 检查 PostgreSQL
brew services list
# 或者
psql -U air -d topems -c "SELECT version();"

# 检查 Redis
redis-cli ping
```

### 停止服务

```bash
# 在运行服务的终端按 Ctrl+C

# 或停止所有服务
brew services stop postgresql@16
brew services stop redis
```

### 重启服务

```bash
brew services restart postgresql@16
brew services restart redis
```

---

## 📝 下一步计划

### 第二阶段：完善 TOPEMS-DOC
- 添加文件上传功能
- 实现数据库集成
- 添加权限管理

### 第三阶段：开发其他服务
- TOPEMS-IAM 身份认证
- TOPEMS-AI 知识库
- TOPEMS-FLOW 工作流

---

## 🎯 联系与帮助

如有问题，请查看项目文档或联系开发团队！
