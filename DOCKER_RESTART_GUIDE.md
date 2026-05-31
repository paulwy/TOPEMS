# Docker Desktop 重启指南

## 当前问题

Docker Desktop 仍然在使用旧的镜像加速配置（docker.mirrors.ustc.edu.cn），导致无法拉取镜像。

## 解决方案

### 步骤1：完全重启 Docker Desktop

1. **点击 Docker Desktop 图标**在 macOS 菜单栏
2. 选择 **Quit Docker Desktop**（完全退出，不是重启）
3. 等待 10-15 秒
4. 重新打开 Docker Desktop 应用
5. 等待 Docker 完全启动（状态栏显示 "Docker Desktop is running"）

### 步骤2：在 Docker Desktop 中检查设置

1. 打开 Docker Desktop
2. 点击右上角 **Settings (齿轮图标)**
3. 选择 **Docker Engine**
4. 检查 `registry-mirrors` 配置，确保没有残留的镜像源
5. 如果有，删除它们，保存并应用

### 步骤3：测试网络连通性

```bash
# 测试拉取一个简单镜像
docker pull hello-world
```

如果成功，说明问题已解决！

### 步骤4：继续部署 TOPEMS

```bash
cd /Users/air/TOPEMS/docker
docker-compose up -d
```

## 备选方案

如果以上方法仍有问题：

### 方案A：使用本地开发（不使用Docker）
```bash
cd /Users/air/TOPEMS
./scripts/start-local.sh
```

### 方案B：手动拉取基础镜像
```bash
# 先逐个拉取基础镜像
docker pull postgres:latest
docker pull redis:latest
docker pull nginx:latest
docker pull rust:1.75-slim
docker pull node:20-alpine

# 然后再部署
docker-compose up -d
```

### 方案C：使用代理
如果需要使用代理，在 Docker Desktop Settings > Resources > Proxies 中配置。
