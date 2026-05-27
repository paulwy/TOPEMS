# Docker 镜像拉取问题解决方案

## 🚨 问题描述

```
pull access denied for registry.cn-hangzhou.aliyuncs.com/library/postgres
unknown: failed to resolve reference "ccr.ccs.tencentyun.com/library/postgres:16-alpine"
```

这些错误表示镜像源无法访问或需要授权。

---

## ✅ 推荐解决方案：配置 Docker Desktop 镜像加速器

### 步骤 1：打开 Docker Desktop 设置

1. 点击 macOS 菜单栏的 **Docker Desktop** 图标
2. 选择 **Settings**（设置）

### 步骤 2：配置镜像加速

1. 在左侧菜单选择 **Docker Engine**
2. 在右侧编辑区域，找到 `registry-mirrors` 配置
3. 添加以下镜像源（选择一个或多个）：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.aliyuncs.com",
    "https://mirror.baidubce.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
```

**注意**：确保 JSON 格式正确，不要有多余的逗号！

### 步骤 3：应用配置

1. 点击 **Apply & Restart**
2. 等待 Docker Desktop 重启完成（约1-2分钟）

### 步骤 4：验证配置

打开终端，输入：

```bash
docker info | grep -A 5 "Registry Mirrors"
```

应该看到类似输出：

```
Registry Mirrors:
  https://docker.mirrors.aliyuncs.com/
  https://mirror.baidubce.com/
```

---

## 🔄 重新启动服务

配置完镜像加速器后，重新运行：

```bash
cd /Users/xingzhai/TOPEMS/infrastructure/docker

# 清理旧容器（如果有）
docker-compose down

# 重新启动
docker-compose up -d
```

---

## 🛠️ 备选方案

如果镜像加速器配置后仍然有问题，可以尝试以下方案：

### 方案 A：手动拉取镜像

在 Docker Desktop 重启后，尝试手动拉取：

```bash
docker pull postgres:16-alpine
docker pull redis:7-alpine
```

如果拉取成功，再次运行 `docker-compose up -d`。

### 方案 B：使用 Azure 中国镜像

```json
{
  "registry-mirrors": [
    "https://dockerhub.azk8s.cn",
    "https://registry.cn-hongkong.azk8s.cn"
  ]
}
```

### 方案 C：检查网络代理

如果您使用了 VPN 或代理：

1. 确保 Docker Desktop 不经过代理
2. 或者配置代理白名单

在 Docker Desktop Settings > Proxies 中：
- 勾选 "Bypass proxy settings for these hosts & domains"
- 添加 `*.docker.io`

---

## 📝 常见问题

### Q: 点击 Apply & Restart 后没反应？

**解决方案**：
1. 检查 JSON 格式是否正确
2. 确保没有其他语法错误
3. 尝试重启 Docker Desktop 应用

### Q: 配置后仍然拉取失败？

**解决方案**：
1. 检查网络连接
2. 尝试更换镜像源
3. 使用方案 A 手动拉取

### Q: 提示 "port is already allocated"？

**解决方案**：
修改 `docker-compose.yml` 中的端口：

```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # 改为 5433

  redis:
    ports:
      - "6380:6379"  # 改为 6380
```

---

## 🎯 最终解决方案：使用 Homebrew 安装本地服务

如果 Docker 实在无法正常工作，可以使用 Homebrew 安装本地服务：

```bash
# 安装 PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# 安装 Redis
brew install redis
brew services start redis

# 创建数据库
createdb -U postgres topems
```

然后修改各服务的 `.env` 文件，连接本地服务。

---

## 📞 获取帮助

如果以上方案都无法解决问题，请提供：

1. Docker Desktop 版本：`docker --version`
2. 错误信息的完整截图
3. 网络环境信息（是否使用 VPN/代理）

---

**祝您顺利启动服务！🎉**
