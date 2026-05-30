# TOPEMS 服务启动指南

## 📍 快速启动命令

### 核心服务 (已运行)
这些服务已经在运行，无需重新启动：
- ✅ IAM (8002) - 身份认证
- ✅ DOC (8001) - 文档管理
- ✅ AI (8003) - AI服务
- ✅ FLOW (8004) - 工作流
- ✅ LIMS (8006) - 实验室管理
- ✅ HRM (8010) - 人力资源

### 启动其他服务

#### 1. 启动 QMS (质量管理)
```bash
cd services/topems-qms/backend
cargo run
```
> 监听端口: 8012

#### 2. 启动 ERP (企业资源计划)
```bash
cd services/topems-erp/backend
cargo run
```
> 监听端口: 8005

#### 3. 启动 RS (研发管理)
```bash
cd services/topems-rs/backend
cargo run
```
> 监听端口: 8007

#### 4. 启动其他服务 (示例)
```bash
# CRM (客户关系管理) - 端口 8009
cd services/topems-crm/backend && cargo run

# WMS (仓库管理) - 端口 8008
cd services/topems-wms/backend && cargo run

# BI (商业智能) - 端口 8020
cd services/topems-bi/backend && cargo run
```

## 🔍 检查服务状态

### 方法1: 使用 lsof
```bash
lsof -i :8001 -i :8002 -i :8003 -i :8004 -i :8005 -i :8006 -i :8007 -i :8008 -i :8009 -i :8010
```

### 方法2: 使用健康检查
```bash
# 测试单个服务
curl http://localhost:8002/health  # IAM
curl http://localhost:8001/health  # DOC
curl http://localhost:8003/health  # AI
curl http://localhost:8004/health  # FLOW
curl http://localhost:8006/health  # LIMS
curl http://localhost:8010/health  # HRM
```

## ⚠️ 常见问题

### Q: 端口已被占用
**错误**: `Error: Address already in use`

**解决方案**:
1. 查看哪个进程占用了端口:
   ```bash
   lsof -i :端口号
   ```

2. 停止占用进程:
   ```bash
   kill -9 <进程ID>
   ```

3. 或者修改服务端口配置

### Q: 目录不存在
**错误**: `no such file or directory: services/xxx/backend`

**解决方案**:
1. 检查目录是否正确:
   ```bash
   ls services/
   ```

2. 正确的路径格式:
   ```bash
   services/topems-服务名/backend
   # 例如:
   services/topems-qms/backend
   ```

### Q: Cargo 未安装
**错误**: `command not found: cargo`

**解决方案**:
1. 安装 Rust:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. 激活 Rust:
   ```bash
   source ~/.cargo/env
   ```

## 📊 服务端口对照表

| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| IAM | topems-iam | 8002 | ✅ 运行中 |
| DOC | backend | 8001 | ✅ 运行中 |
| AI | topems-ai | 8003 | ✅ 运行中 |
| FLOW | topems-flow | 8004 | ✅ 运行中 |
| LIMS | topems-lims | 8006 | ✅ 运行中 |
| HRM | topems-hrm | 8010 | ✅ 运行中 |
| ERP | topems-erp | 8005 | ❌ 未启动 |
| QMS | topems-qms | 8012 | ❌ 未启动 |
| RS | topems-rs | 8007 | ❌ 未启动 |
| CRM | topems-crm | 8009 | ❌ 未启动 |
| WMS | topems-wms | 8008 | ❌ 未启动 |
| BI | topems-bi | 8020 | ❌ 未启动 |
| MES | topems-mes | 8013 | ❌ 未启动 |
| EHS | topems-ehs | 8016 | ❌ 未启动 |

## 🎯 推荐的启动顺序

如果需要启动多个服务，建议按以下顺序：

1. **先启动 IAM** (如果未运行)
   ```bash
   cd services/topems-iam/backend && cargo run
   ```

2. **然后启动其他服务**
   ```bash
   # 每个服务在单独的终端中运行
   cd services/topems-qms/backend && cargo run
   ```

## 📝 启动多个服务的终端配置

建议为每个服务打开一个独立的终端：

```
终端 1: IAM (8002)
终端 2: DOC (8001)
终端 3: AI (8003)
终端 4: FLOW (8004)
终端 5: LIMS (8006)
终端 6: HRM (8010)
终端 7: ERP (8005) - 可选
终端 8: QMS (8012) - 可选
```

## 🔧 停止服务

### 方法1: Ctrl+C
在运行 `cargo run` 的终端中按 `Ctrl+C`

### 方法2: 使用 kill
```bash
# 查找进程
lsof -i :8005

# 停止进程 (将 <PID> 替换为实际的进程ID)
kill -9 <PID>
```

## ✅ 验证服务运行

启动服务后，验证是否正常运行：

```bash
# 检查进程
ps aux | grep topems

# 健康检查
curl http://localhost:端口/health

# 查看端口占用
lsof -i :端口号
```

---

**提示**: 服务启动后，前端会自动通过 Vite 代理连接到后端服务，无需额外配置！
