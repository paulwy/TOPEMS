# TOPEMS 本地开发数据库配置

本目录包含用于本地开发的数据库配置。

## 目录结构

```
docker/
├── README.md                # 本文档
├── .env.example            # 环境变量示例
├── docker-compose.yml      # Docker Compose 配置
└── init-scripts/
    └── 01-init-database.sql # 数据库初始化脚本
```

## 使用方式

### 启动数据库

```bash
# 进入 docker 目录
cd docker

# 复制环境变量文件
cp .env.example .env

# 启动数据库
docker-compose up -d

# 查看状态
docker-compose ps
```

### 停止服务

```bash
# 停止但保留数据
docker-compose down

# 停止并删除所有数据（谨慎使用！）
docker-compose down -v
```

## 服务端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |

## 注意事项

1. 此配置仅使用本地已有的 Docker 镜像，不会从网络拉取任何镜像
2. 确保本地已有 postgres:latest 和 redis:latest 镜像
3. 请妥善保管数据库密码
