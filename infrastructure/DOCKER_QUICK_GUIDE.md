# Docker 快速配置指南

## 只需三步！

### 第一步：打开 Docker Desktop 设置

点击 Docker 图标 → Settings → Docker Engine

### 第二步：添加镜像加速

复制以下内容到配置区域：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.aliyuncs.com",
    "https://mirror.baidubce.com"
  ],
  "experimental": false,
  "debug": false
}
```

### 第三步：重启并启动服务

1. 点击 **Apply & Restart**
2. 等待重启完成
3. 运行：

```bash
cd /Users/xingzhai/TOPEMS/infrastructure/docker
docker-compose up -d
```

---

## 验证是否成功

```bash
docker ps
```

应该看到 postgres 和 redis 两个容器正在运行。

---

## 如果还是不行？

尝试手动拉取镜像：

```bash
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker-compose up -d
```

或者查看详细错误：

```bash
docker-compose logs -f
```
