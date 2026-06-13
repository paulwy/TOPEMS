# TOPEMS 环境配置指南

本指南详细说明如何配置开发、测试和生产环境。

## 目录

- [环境概述](#环境概述)
- [环境变量配置](#环境变量配置)
- [开发环境配置](#开发环境配置)
- [测试环境配置](#测试环境配置)
- [生产环境配置](#生产环境配置)
- [配置验证](#配置验证)

## 环境概述

TOPEMS 支持三种主要环境配置：

| 环境 | 说明 | 用途 |
|------|------|------|
| development | 开发环境 | 本地开发、调试 |
| testing | 测试环境 | 自动化测试、集成测试 |
| production | 生产环境 | 正式上线运行 |

## 环境变量配置

### 必需配置项

所有环境都必须配置的核心变量：

```env
# JWT 配置（安全必须）
JWT_SECRET=<至少32字符的随机密钥>
JWT_REFRESH_SECRET=<至少32字符的随机密钥>

# 数据库配置
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
DB_HOST=localhost
DB_PORT=5432
DB_USER=topems
DB_PASSWORD=topems_secret
DB_NAME=topems

# Redis 配置
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# 环境标识
ENVIRONMENT=development
```

### 服务端口配置

```env
# 平台核心服务 (8000-8009)
IAM_PORT=8000
DOC_PORT=8024
PM_PORT=8002
NOTIFICATION_PORT=8003
INTEGRATION_PORT=8004
PORTAL_PORT=8005
FLOW_PORT=8006

# 业务服务 (8010-8029)
ERP_PORT=8010
HRM_PORT=8011
CRM_PORT=8012
AI_PORT=8013
RS_PORT=8020
LIMS_PORT=8022
PDM_PORT=8023

# 制造与质量服务 (8030-8039)
MES_PORT=8030
QMS_PORT=8031
EHS_PORT=8032

# 供应链服务 (8040-8049)
SCM_PORT=8040
SRM_PORT=8041
WMS_PORT=8042

# 辅助服务 (8050-8059)
FILE_PORT=8050
MAIL_PORT=8051
IM_PORT=8052
GIS_PORT=8053
BI_PORT=8060
REPORT_PORT=8061
AI_PORT=8062

# 扩展服务 (8070-8079)
MOBILE_PORT=8070

# 前端配置
FRONTEND_PORT=3000
```

### 可选配置项

```env
# 日志配置
RUST_LOG=info
LOG_LEVEL=info

# CORS 配置
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=10
MAX_FILE_SIZE=104857600

# JWT 配置
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=86400
JWT_EXPIRY_HOURS=24

# SMTP 邮件配置
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USERNAME=topmap@163.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_ADDRESS=topmap@163.com
```

## 开发环境配置

### 快速配置

```bash
# 1. 复制示例配置
cp .env.example .env

# 2. 生成 JWT 密钥
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env

# 3. 编辑配置
vim .env
```

### 开发环境完整配置

```env
# === 安全配置 ===
JWT_SECRET=your-dev-jwt-secret-key-here-at-least-32-chars
JWT_REFRESH_SECRET=your-dev-refresh-secret-key-here-at-least-32-chars
JWT_EXPIRATION=3600
REFRESH_TOKEN_EXPIRATION=86400
JWT_EXPIRY_HOURS=24

# === 数据库配置 ===
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
DB_HOST=localhost
DB_PORT=5432
DB_USER=topems
DB_PASSWORD=topems_secret
DB_NAME=topems

# === Redis 配置 ===
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# === 服务端口配置 (平台核心服务 8000-8009) ===
IAM_PORT=8000
DOC_PORT=8024
PM_PORT=8002
NOTIFICATION_PORT=8003
INTEGRATION_PORT=8004
PORTAL_PORT=8005
FLOW_PORT=8006

# === 服务端口配置 (业务服务 8010-8029) ===
ERP_PORT=8010
HRM_PORT=8011
CRM_PORT=8012
AI_PORT=8013
RS_PORT=8020
LIMS_PORT=8022
PDM_PORT=8023

# === 服务端口配置 (制造与质量服务 8030-8039) ===
MES_PORT=8030
QMS_PORT=8031
EHS_PORT=8032

# === 服务端口配置 (供应链服务 8040-8049) ===
SCM_PORT=8040
SRM_PORT=8041
WMS_PORT=8042

# === 服务端口配置 (辅助服务 8050-8059) ===
GIS_PORT=8050
IM_PORT=8051
BI_PORT=8052
REPORT_PORT=8053
MAIL_PORT=8054
MOBILE_PORT=8055

# === 前端配置 ===
FRONTEND_PORT=3000
VITE_API_BASE_URL=/api

# === 日志配置 ===
RUST_LOG=debug
LOG_LEVEL=debug

# === 环境标识 ===
ENVIRONMENT=development

# === CORS 配置 ===
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# === 文件上传配置 ===
UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=10
MAX_FILE_SIZE=104857600
```

### 启动开发环境

```bash
# 1. 启动数据库
cd docker
docker-compose up -d
cd ..

# 2. 验证环境变量
./scripts/manage-services.sh validate-env

# 3. 启动核心服务
./scripts/manage-services.sh start-core

# 4. 启动所有服务
./scripts/manage-services.sh start-all

# 5. 查看服务状态
./scripts/manage-services.sh status
```

### 开发环境特性

- 详细的调试日志输出
- 热重载支持
- 完整的错误堆栈跟踪
- 数据库自动回滚功能
- 测试数据自动生成
- CORS 允许本地开发地址

## 测试环境配置

### 测试环境配置

```env
# === 安全配置 ===
JWT_SECRET=your-test-jwt-secret-key-here-at-least-32-chars
JWT_REFRESH_SECRET=your-test-refresh-secret-key-here-at-least-32-chars

# === 数据库配置 (使用独立的测试数据库) ===
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems_test
DB_HOST=localhost
DB_PORT=5432
DB_USER=topems
DB_PASSWORD=topems_secret
DB_NAME=topems_test

# === Redis 配置 (使用独立的测试数据库) ===
REDIS_URL=redis://localhost:6379/1
REDIS_HOST=localhost
REDIS_PORT=6379

# === 环境标识 ===
ENVIRONMENT=testing

# === 日志配置 ===
RUST_LOG=warn
LOG_LEVEL=warn

# === CORS 配置 ===
CORS_ALLOWED_ORIGINS=http://test.example.com
CORS_ORIGINS=http://test.example.com
```

### 测试环境特点

- 使用独立的测试数据库
- 禁用敏感操作
- 简化的日志输出
- 测试数据清理机制
- 性能监控

### 运行测试

```bash
# 运行单元测试
cargo test

# 运行集成测试
cargo test --test integration

# 运行前端测试
cd frontend
npm run test
npm run e2e
```

## 生产环境配置

### 生产环境安全配置

```env
# === 安全配置 - 生产环境必须强密钥！ ===
JWT_SECRET=your-production-jwt-secret-key-here-at-least-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-key-here-at-least-32-chars
JWT_EXPIRATION=1800
REFRESH_TOKEN_EXPIRATION=7200
JWT_EXPIRY_HOURS=1

# === 数据库配置 - 使用生产数据库 ===
DATABASE_URL=postgres://topems:secure-password@db.example.com:5432/topems
DB_HOST=db.example.com
DB_PORT=5432
DB_USER=topems
DB_PASSWORD=secure-production-password
DB_NAME=topems

# === Redis 配置 - 使用生产 Redis ===
REDIS_URL=redis://redis.example.com:6379
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=redis-password

# === 环境标识 ===
ENVIRONMENT=production

# === 日志配置 - 生产日志级别 ===
RUST_LOG=info
LOG_LEVEL=info

# === CORS 配置 - 生产环境严格限制 ===
CORS_ALLOWED_ORIGINS=https://app.example.com
CORS_ORIGINS=https://app.example.com

# === 安全相关配置 ===
HTTPS_ONLY=true
SECURE_COOKIES=true
CSRF_PROTECTION=true
```

### 生产环境安全检查清单

- [ ] JWT 密钥使用强随机生成
- [ ] 数据库使用独立用户和强密码
- [ ] Redis 设置密码
- [ ] HTTPS 强制开启
- [ ] CORS 配置只允许可信域名
- [ ] 日志级别设置为 info 或 warn
- [ ] 启用了所有安全头
- [ ] 配置了自动备份
- [ ] 配置了监控和告警
- [ ] 敏感信息不在日志中输出

### 生产环境部署

```bash
# 1. 验证环境变量
./scripts/manage-services.sh validate-env

# 2. 初始化数据库
bash scripts/setup-db.sh

# 3. 启动服务
./scripts/deploy.sh
```

## 配置验证

### 使用脚本验证

```bash
# 验证环境变量配置
./scripts/manage-services.sh validate-env

# 检查服务健康状态
./scripts/manage-services.sh status

# 健康检查
curl http://localhost:8000/health
curl http://localhost:8001/health
# ... 其他服务
```

### 手动验证

```bash
# 检查数据库连接
psql postgres://topems:topems_secret@localhost:5432/topems

# 检查 Redis 连接
redis-cli ping

# 检查服务端口占用
lsof -i :8000
lsof -i :8001
# ... 其他端口
```

## 前端环境变量

前端使用 Vite 的环境变量系统，以 `VITE_` 前缀开头：

```env
# .env (所有环境)
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=60000

# 服务 URL 配置
VITE_IAM_SERVICE_URL=/iam
VITE_DOC_SERVICE_URL=/doc
VITE_PM_SERVICE_URL=/pm
VITE_NOTIFICATION_SERVICE_URL=/notification
VITE_INTEGRATION_SERVICE_URL=/integration
VITE_PORTAL_SERVICE_URL=/portal
VITE_FLOW_SERVICE_URL=/flow
VITE_ERP_SERVICE_URL=/erp
VITE_HRM_SERVICE_URL=/hrm
VITE_CRM_SERVICE_URL=/crm
VITE_AI_SERVICE_URL=/ai
VITE_RS_SERVICE_URL=/rs
VITE_LIMS_SERVICE_URL=/lims
VITE_PDM_SERVICE_URL=/pdm
VITE_MES_SERVICE_URL=/mes
VITE_QMS_SERVICE_URL=/qms
VITE_EHS_SERVICE_URL=/ehs
VITE_SCM_SERVICE_URL=/scm
VITE_SRM_SERVICE_URL=/srm
VITE_WMS_SERVICE_URL=/wms
VITE_GIS_SERVICE_URL=/gis
VITE_IM_SERVICE_URL=/im
VITE_BI_SERVICE_URL=/bi
VITE_REPORT_SERVICE_URL=/report
VITE_MAIL_SERVICE_URL=/mail
VITE_MOBILE_SERVICE_URL=/mobile

# WebSocket 配置
VITE_WS_URL=ws://localhost:8080
VITE_WS_RECONNECT_INTERVAL=5000
VITE_WS_MAX_RECONNECT_ATTEMPTS=10

# 功能开关
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_HOT_RELOAD=false
VITE_ENABLE_API_DOCS=false
VITE_OAUTH_GITHUB_ENABLED=false
VITE_OAUTH_GOOGLE_ENABLED=false
VITE_ENABLE_DARK_MODE=false

# 上传配置
VITE_MAX_UPLOAD_SIZE=104857600
VITE_ALLOWED_FILE_TYPES=

# 日志配置
VITE_LOG_LEVEL=info
VITE_ENABLE_ERROR_TRACKING=false

# 主题配置
VITE_DEFAULT_THEME=light
VITE_DEFAULT_LOCALE=zh-CN
VITE_FALLBACK_LOCALE=en-US
VITE_SUPPORTED_LOCALES=zh-CN,en-US

# 分析配置
VITE_ENABLE_ANALYTICS=false
VITE_ANALYTICS_ID=

# 安全配置
VITE_CSRF_TOKEN_URL=/api/csrf-token
VITE_SESSION_TIMEOUT=120

# 第三方服务
VITE_SENTRY_DSN=
VITE_GA_TRACKING_ID=
```

## 常见问题

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :8000

# 强制清理端口
./scripts/manage-services.sh start iam --force
```

### 环境变量不生效

```bash
# 确保 .env 文件在正确位置
ls -la .env

# 重新加载环境变量
source .env

# 验证变量值
echo $JWT_SECRET
```

### 数据库连接失败

```bash
# 检查数据库是否运行
docker ps

# 检查连接
psql $DATABASE_URL
```

### 服务健康检查失败

```bash
# 查看服务日志
./scripts/manage-services.sh logs iam

# 检查端口占用
lsof -i :8000

# 重启服务
./scripts/manage-services.sh restart iam
```

## 最佳实践

1. **版本控制**：只提交 `.env.example` 文件，不要提交实际的 `.env` 文件
2. **密钥管理**：使用环境变量管理密钥，不要硬编码
3. **定期轮换**：生产环境的密钥应该定期轮换
4. **备份策略**：定期备份配置和密钥
5. **访问控制**：限制对生产配置的访问权限
6. **文档更新**：配置变更时及时更新相关文档
7. **测试验证**：在部署前验证所有配置项

## 总结

本指南涵盖了 TOPEMS 的环境配置，确保开发、测试和生产环境都能正确设置。遵循这些指南可以确保系统的安全性和可靠性。