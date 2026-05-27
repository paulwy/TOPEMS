# TOPEMS 系统部署指南

## 📋 目录

1. [环境变量配置](#环境变量配置)
2. [CORS 配置](#cors-配置)
3. [日志和监控配置](#日志和监控配置)
4. [认证测试](#认证测试)
5. [生产环境注意事项](#生产环境注意事项)

---

## 1. 环境变量配置

### 1.1 核心配置文件

位置: `.env`

```env
# JWT 密钥（必须修改！）
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-64-characters-long

# JWT 过期时间（秒）
JWT_EXPIRATION=86400

# 数据库配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=topems
POSTGRES_PASSWORD=your-secure-db-password
POSTGRES_DB=topems
```

### 1.2 生成安全的 JWT_SECRET

```bash
# 生成 64 位随机密钥
openssl rand -hex 32

# 生成 128 位随机密钥（推荐）
openssl rand -hex 64
```

### 1.3 环境变量清单

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | 必须设置 |
| `JWT_EXPIRATION` | Token 过期时间（秒） | 86400 |
| `DATABASE_URL` | 数据库连接字符串 | 必须设置 |
| `CORS_ALLOWED_ORIGINS` | 允许的跨域来源 | http://localhost:3000 |
| `RUST_LOG` | 日志级别 | info |
| `PORT` | 服务端口 | 各服务有默认值 |
| `USE_MEMORY_STORAGE` | 是否使用内存存储 | false |

---

## 2. CORS 配置

### 2.1 开发环境

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000
```

### 2.2 生产环境

```env
# 只允许特定域名
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### 2.3 CORS 配置原则

- ✅ 生产环境必须明确指定允许的来源
- ✅ 不使用 `AllowOrigin::any()`
- ✅ 限制允许的 HTTP 方法
- ✅ 配置适当的允许头部

---

## 3. 日志和监控配置

### 3.1 日志配置文件

位置: `logging_config.yaml`

```yaml
level: info
format:
  output: both
  style: json
file:
  directory: /var/log/topems
  max_size: 50
  max_files: 10
security:
  log_auth_failures: true
  log_auth_success: true
  log_permission_denied: true
```

### 3.2 日志目录结构

```
/var/log/topems/
├── topems-erp.log
├── topems-scm.log
├── topems-lims.log
├── topems-wms.log
├── topems-flow.log
└── topems-doc.log
```

### 3.3 监控指标

| 指标 | 说明 |
|------|------|
| `auth_success_count` | 认证成功次数 |
| `auth_failure_count` | 认证失败次数 |
| `permission_denied_count` | 权限拒绝次数 |
| `request_count` | 请求总数 |
| `response_time_ms` | 响应时间（毫秒） |
| `error_count` | 错误总数 |

---

## 4. 认证测试

### 4.1 运行测试脚本

```bash
# 给测试脚本添加执行权限
chmod +x test_auth.sh

# 运行测试
./test_auth.sh
```

### 4.2 手动测试示例

```bash
# 测试未认证访问（应返回 401）
curl http://localhost:8009/api/v1/companies

# 测试使用无效 token（应返回 401）
curl -H "Authorization: Bearer invalid-token" http://localhost:8009/api/v1/companies

# 测试健康检查（应返回 200）
curl http://localhost:8009/health
```

### 4.3 测试预期结果

| 测试场景 | 预期状态码 |
|----------|------------|
| 未认证请求 API | 401 Unauthorized |
| 无效 token 请求 | 401 Unauthorized |
| 有效 token 请求 | 200 OK |
| 访问 /health | 200 OK |

---

## 5. 生产环境注意事项

### 5.1 安全最佳实践

✅ **使用密钥管理服务**
- 使用 HashiCorp Vault、AWS KMS 或类似服务管理敏感配置
- 禁止将密码硬编码到代码或配置文件中

✅ **启用 HTTPS**
- 所有生产环境服务必须使用 HTTPS
- 使用 Let's Encrypt 或商业证书

✅ **网络隔离**
- 数据库不应暴露在公网
- 使用防火墙限制访问

✅ **定期轮换密钥**
- 定期更换 JWT_SECRET
- 定期更换数据库密码

### 5.2 性能最佳实践

✅ **数据库连接池**
- 合理配置连接池大小
- 监控连接使用情况

✅ **日志管理**
- 使用日志聚合工具（如 ELK Stack、Grafana Loki）
- 设置日志保留策略

✅ **监控告警**
- 配置关键指标告警
- 设置认证失败阈值告警

### 5.3 部署清单

```bash
# 1. 设置环境变量
export JWT_SECRET=$(openssl rand -hex 64)
export POSTGRES_PASSWORD=$(openssl rand -hex 32)

# 2. 创建日志目录
mkdir -p /var/log/topems
chown -R appuser:appuser /var/log/topems

# 3. 配置数据库
createdb -U postgres topems
createuser -U postgres topems
psql -U postgres -c "ALTER USER topems WITH PASSWORD '$POSTGRES_PASSWORD'"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE topems TO topems"

# 4. 启动服务
systemctl start topems-erp
systemctl start topems-scm
systemctl start topems-lims
```

---

## 6. 故障排除

### 6.1 常见问题

**问题1: 认证失败但 token 正确**
- 检查 `JWT_SECRET` 是否与签发 token 时使用的密钥一致
- 检查 token 是否已过期

**问题2: CORS 错误**
- 检查 `CORS_ALLOWED_ORIGINS` 是否包含请求来源
- 检查浏览器控制台的具体错误信息

**问题3: 数据库连接失败**
- 检查数据库服务是否运行
- 检查 `DATABASE_URL` 是否正确
- 检查数据库用户权限

### 6.2 日志排查

```bash
# 查看认证相关日志
grep -i "auth" /var/log/topems/*.log

# 查看错误日志
grep -i "error" /var/log/topems/*.log

# 查看认证失败
grep -i "unauthorized\|401" /var/log/topems/*.log
```

---

## 📞 支持

如有问题，请联系开发团队。
