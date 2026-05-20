# Docker 配置指南

## 🐳 问题诊断

如果您遇到类似以下的错误：

```
failed to resolve reference "docker.io/library/postgres:16-alpine": context deadline exceeded
```

这是 Docker Hub 连接超时或网络问题，请参考以下解决方案。

---

## 🚀 方案一：使用国内镜像源（推荐）

### 1. 配置 Docker 镜像加速器

#### macOS / Linux

编辑或创建 `~/.docker/daemon.json` 文件：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.aliyuncs.com",
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://mirror.baidubce.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
```

然后重启 Docker Desktop：

```bash
# 重启 Docker Desktop 应用
# 或者在终端执行
killall Docker && open /Applications/Docker.app
```

#### Windows

编辑 Docker Desktop 的设置：

1. 打开 Docker Desktop
2. 进入 Settings (齿轮图标)
3. 选择 Docker Engine
4. 添加配置：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.aliyuncs.com",
    "https://registry.cn-hangzhou.aliyuncs.com"
  ]
}
```

5. 点击 Apply & Restart

### 2. 验证配置

```bash
docker info | grep -A 5 "Registry Mirrors"
```

如果看到镜像源地址说明配置成功。

---

## 🎯 方案二：使用阿里云镜像（已配置）

我们的 docker-compose.yml 已经配置了阿里云镜像源：

```yaml
services:
  postgres:
    image: registry.cn-hangzhou.aliyuncs.com/library/postgres:16-alpine
  
  redis:
    image: registry.cn-hangzhou.aliyuncs.com/library/redis:7-alpine
```

直接运行即可：

```bash
cd /Users/air/TOPEMS/infrastructure/docker
docker-compose up -d
```

---

## 🌐 方案三：使用代理（如果有）

如果您有代理服务器，可以配置 Docker 使用代理：

### macOS / Linux

```bash
# 创建目录
mkdir -p ~/.docker

# 创建配置文件
cat > ~/.docker/config.json << JSON
{
  "proxies": {
    "default": {
      "httpProxy": "http://127.0.0.1:7890",
      "httpsProxy": "http://127.0.0.1:7890"
    }
  }
}
JSON

# 重启 Docker
```

### Windows

在 Docker Desktop Settings > Resources > Proxies 中配置。

---

## 📦 方案四：预拉取镜像

如果镜像源仍然无法访问，可以尝试手动拉取：

```bash
# 尝试用不同的方法拉取
docker pull registry.cn-hangzhou.aliyuncs.com/library/postgres:16-alpine
docker pull registry.cn-hangzhou.aliyuncs.com/library/redis:7-alpine
```

或者使用其他镜像站：

```bash
# 腾讯云
docker pull ccr.ccs.tencentyun.com/library/postgres:16-alpine

# 中科大
docker pull docker.mirrors.ustc.edu.cn/library/postgres:16-alpine
```

---

## 🛠️ 启动 TOPEMS 服务

### 1. 清理旧容器（如果有）

```bash
cd /Users/air/TOPEMS/infrastructure/docker
docker-compose down
docker-compose rm -f
```

### 2. 重新启动

```bash
docker-compose up -d
```

### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 单独查看某服务
docker-compose logs -f postgres
docker-compose logs -f redis
```

### 4. 验证服务

```bash
# 检查 PostgreSQL
docker exec -it topems-postgres psql -U topems -d topems -c "SELECT version();"

# 检查 Redis
docker exec -it topems-redis redis-cli ping
```

---

## 📝 连接信息

### PostgreSQL 数据库

- **地址**: localhost:5432
- **用户**: topems
- **密码**: topems_secret
- **数据库**: topems
- **默认管理员**: admin / admin123

### Redis 缓存

- **地址**: localhost:6379
- **无密码**

---

## 🔧 常见问题

### Q: 权限被拒绝？

```bash
# 尝试使用 sudo
sudo docker-compose up -d
```

### Q: 端口被占用？

修改 `docker-compose.yml` 中的端口号：

```yaml
ports:
  - "5433:5432"  # 将主机端口改为 5433
  - "6380:6379"  # 将主机端口改为 6380
```

### Q: 磁盘空间不足？

```bash
# 清理 Docker 缓存
docker system prune -a
```

---

## 📊 数据库 Schema

我们初始化了以下 Schema：

| Schema | 用途 |
|--------|------|
| `doc` | 文档管理服务 (topems-doc) |
| `iam` | 身份认证服务 (topems-iam) |
| `ai` | AI 知识库服务 (topems-ai) |
| `flow` | 工作流服务 (topems-flow) |

---

## 🎓 下一步

服务启动后，可以：

1. **启动 topems-doc 后端**
   ```bash
   cd /Users/air/TOPEMS/platform/topems-doc/backend
   cargo run
   ```

2. **开发其他服务**
   - 按照同样的模式完善其他微服务

---

**祝您开发愉快！如有问题，欢迎反馈！**
