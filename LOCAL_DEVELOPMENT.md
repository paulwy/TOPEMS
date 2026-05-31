# TOPEMS 本地开发指南

## ✅ 当前状态

**PostgreSQL 和 Redis 容器已成功运行！**

```
✅ topems-postgres: 正常运行 (端口 5432)
✅ topems-redis:    正常运行 (端口 6379)
```

---

## 🚀 启动服务

### 1. 启动后端服务（打开多个终端）

#### 终端 1: IAM 服务
```bash
cd /Users/air/TOPEMS/platform/topems-iam/backend
cargo run --release
```
- 服务地址: http://localhost:8002

#### 终端 2: DOC 服务
```bash
cd /Users/air/TOPEMS/platform/topems-doc/backend
cargo run --release
```
- 服务地址: http://localhost:8001

#### 终端 3: LIMS 服务
```bash
cd /Users/air/TOPEMS/services/topems-lims/backend
cargo run --release
```
- 服务地址: http://localhost:8006

#### 终端 4: RS 服务
```bash
cd /Users/air/TOPEMS/services/topems-rs/backend
cargo run --release
```
- 服务地址: http://localhost:8005

### 2. 启动前端（终端 5）

```bash
cd /Users/air/TOPEMS/frontend
npm run dev
```
- 前端地址: http://localhost:3000

---

## 📋 服务地址列表

| 服务 | 地址 | 说明 |
|------|------|------|
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |
| IAM | http://localhost:8002 | 身份认证 |
| DOC | http://localhost:8001 | 文档管理 |
| LIMS | http://localhost:8006 | 实验室管理 |
| RS | http://localhost:8005 | 配方管理 |
| 前端 | http://localhost:3000 | 用户界面 |

---

## 🔧 常用命令

### 查看容器状态
```bash
docker ps
```

### 查看容器日志
```bash
# PostgreSQL 日志
docker logs -f topems-postgres

# Redis 日志
docker logs -f topems-redis
```

### 停止服务
```bash
cd /Users/air/TOPEMS/docker
docker-compose -f docker-compose-simple.yml down
```

### 重新启动服务
```bash
cd /Users/air/TOPEMS/docker
docker-compose -f docker-compose-simple.yml up -d
```

---

## 📝 注意事项

1. **先启动数据库**: 确保 PostgreSQL 和 Redis 容器先启动
2. **等待数据库**: 后端服务会等待数据库准备好才会完全启动
3. **端口占用**: 确保 3000, 8001, 8002, 8005, 8006, 5432, 6379 端口未被占用

---

## 💡 测试建议

1. 先访问 http://localhost:3000
2. 使用测试账号登录（admin/admin123）
3. 测试 LIMS 和 RS 功能模块
4. 检查前端控制台和后端日志

---

## 🎯 下一步

- 所有核心数据库服务已就绪
- 现在可以开始本地开发和测试！
