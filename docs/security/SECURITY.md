# TOPEMS 安全策略

## 概述

本文档说明 TOPEMS 项目的安全策略、漏洞报告流程和安全最佳实践。

## 支持的版本

下表列出 TOPEMS 项目当前支持和维护的版本：

| 版本 | 支持状态 |
|------|----------|
| 3.0.x | ✅ 积极支持 |
| 2.0.x | ⚠️ 仅安全更新 |
| 1.0.x | ❌ 已停止支持 |
| < 1.0 | ❌ 不受支持 |

## 报告安全漏洞

### 如何报告

如果您发现 TOPEMS 项目中存在安全漏洞，请通过以下方式报告：

- **邮箱**: security@topems.local
- **GPG 密钥**: 可选（联系获取）
- **响应时间**: 48 小时内

### 报告应包含

请在报告中尽可能详细地描述漏洞：

1. **漏洞类型**（例如：SQL 注入、XSS、CSRF）
2. **影响范围**（受影响的版本、组件）
3. **复现步骤**（详细的复现过程）
4. **潜在影响**（数据泄露、权限提升等）
5. **修复建议**（如有）
6. **您的联系方式**

### 我们的承诺

- **48 小时内**确认收到您的报告
- **7 天内**评估漏洞严重性
- **30 天内**发布修复（视严重性而定）
- **修复后**公开致谢（除非您要求匿名）

---

## 安全策略

### 1. 认证与授权

#### 密码策略

```yaml
# 密码复杂度要求
minimum_length: 8
require_uppercase: true
require_lowercase: true
require_numbers: true
require_special_chars: true

# 密码历史
password_history: 5  # 不能与最近 5 个密码相同

# 密码过期
password_expiry_days: 90
warning_days_before_expiry: 7
```

#### JWT 认证

```yaml
# Token 配置
access_token:
  expiry: 3600  # 1 小时
  algorithm: HS256
  issuer: topems

refresh_token:
  expiry: 86400  # 24 小时
  algorithm: HS256
  rotation: true  # 启用轮换

# 安全建议
- 使用强随机密钥（至少 32 字符）
- 定期轮换 JWT 密钥
- 在生产环境使用 HTTPS
- 启用 Token 刷新机制
```

#### 多因素认证（MFA）

支持的认证方式：

- [x] 用户名 + 密码
- [x] JWT Token
- [x] Refresh Token
- [ ] TOTP（基于时间的一次性密码）
- [ ] SMS 验证码
- [ ] 邮箱验证码

### 2. 授权与访问控制

#### RBAC 模型

```
用户 (User) → 角色 (Role) → 权限 (Permission) → 资源 (Resource)
```

#### 默认角色

| 角色 | 权限 |
|------|------|
| Super Admin | 所有权限 |
| Admin | 用户管理、系统配置 |
| Manager | 部门管理、数据查看 |
| User | 基础功能使用 |
| Guest | 只读访问 |

#### 权限粒度

- **菜单权限**: 控制菜单显示
- **按钮权限**: 控制操作按钮
- **数据权限**: 控制数据范围
- **字段权限**: 控制字段可见性

### 3. 数据安全

#### 传输加密

- **HTTPS 强制**: 所有 API 强制使用 HTTPS
- **TLS 版本**: 最低 TLS 1.2，推荐 TLS 1.3
- **证书管理**: 定期更新，使用强加密套件

#### 存储加密

```yaml
# 敏感数据加密
encryption:
  algorithm: AES-256-GCM
  key_rotation_days: 90
  
# 加密字段
encrypted_fields:
  - users.password
  - users.email
  - employees.id_card
  - employees.bank_account
  - companies.business_license
```

#### 数据脱敏

在 API 响应中脱敏敏感数据：

```json
{
  "id_card": "110101********1234",
  "phone": "138****8000",
  "email": "a***@example.com",
  "bank_account": "****1234"
}
```

### 4. API 安全

#### 限流策略

```yaml
# API 限流配置
rate_limiting:
  global:
    requests_per_second: 1000
    burst: 2000
  
  per_user:
    requests_per_minute: 60
    requests_per_hour: 1000
  
  per_ip:
    requests_per_minute: 100
    requests_per_hour: 2000
  
  # 特定接口
  endpoints:
    "/api/iam/auth/login":
      requests_per_minute: 5
      block_duration: 300  # 5 分钟
    "/api/ai/chat":
      requests_per_minute: 30
```

#### 输入验证

```rust
// 所有输入必须验证
- 字符串长度限制
- 数值范围检查
- 邮箱格式验证
- 手机号格式验证
- 防止 SQL 注入（参数化查询）
- 防止 XSS（输入过滤、输出转义）
- 防止 CSRF（Token 验证）
- 文件上传类型限制
```

#### CORS 配置

```yaml
# 生产环境严格限制
cors:
  allowed_origins:
    - https://app.topems.com
    - https://admin.topems.com
  allowed_methods:
    - GET
    - POST
    - PUT
    - DELETE
  allowed_headers:
    - Authorization
    - Content-Type
  allow_credentials: true
  max_age: 3600
```

### 5. 数据库安全

#### 访问控制

```sql
-- 最小权限原则
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA iam TO topems_iam;
GRANT USAGE ON SCHEMA iam TO topems_iam;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hrm TO topems_hrm;
GRANT USAGE ON SCHEMA hrm TO topems_hrm;
```

#### 审计日志

```sql
-- 关键操作审计
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  action VARCHAR(50),
  resource VARCHAR(100),
  resource_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

### 6. 日志与监控

#### 安全日志

记录所有安全相关事件：

- 登录成功/失败
- 权限变更
- 敏感数据访问
- 配置修改
- API 异常访问
- 异常操作

#### 异常检测

```yaml
# 自动告警
alerts:
  - name: 多次登录失败
    threshold: 5  # 5 次失败
    window: 300    # 5 分钟内
    action: 锁定账户 30 分钟
    
  - name: 异常 IP 登录
    detection: 异地登录
    action: 发送告警邮件
    
  - name: 敏感数据大量访问
    threshold: 100  # 100 条记录
    window: 60      # 1 分钟内
    action: 告警 + 临时限制
```

### 7. 容器安全

#### Docker 安全

```dockerfile
# 使用最小化基础镜像
FROM rust:1.70-slim

# 使用非 root 用户
RUN useradd -r -u 1000 -m topems
USER topems

# 最小化权限
COPY --chown=topems:topems . /app

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8000/health || exit 1
```

#### 镜像扫描

```bash
# 定期扫描镜像漏洞
docker scan topems-iam:latest
trivy image topems-iam:latest
```

### 8. 网络安全

#### 防火墙规则

```bash
# 仅开放必要端口
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp

# HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 服务端口（仅内网）
ufw allow from 10.0.0.0/8 to any port 8000:8079
```

#### Nginx 安全配置

```nginx
# 安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# 隐藏版本
server_tokens off;

# 限制请求大小
client_max_body_size 10M;
```

---

## 安全检查清单

### 开发阶段

- [ ] 输入验证（所有用户输入）
- [ ] 输出编码（防止 XSS）
- [ ] 参数化查询（防止 SQL 注入）
- [ ] 错误处理（不泄露敏感信息）
- [ ] 密码强度（强密码策略）
- [ ] 敏感数据加密
- [ ] 访问控制（最小权限）
- [ ] 安全日志

### 部署阶段

- [ ] HTTPS 启用
- [ ] 安全头配置
- [ ] 防火墙配置
- [ ] 数据库访问控制
- [ ] 密钥管理
- [ ] 备份策略
- [ ] 监控告警
- [ ] 漏洞扫描

### 运维阶段

- [ ] 定期安全更新
- [ ] 密钥轮换
- [ ] 审计日志审查
- [ ] 异常检测
- [ ] 渗透测试
- [ ] 灾难恢复演练
- [ ] 安全培训

---

## 密钥管理

### 密钥分类

| 密钥类型 | 用途 | 轮换周期 |
|---------|------|----------|
| JWT_SECRET | 签名 JWT Token | 90 天 |
| DB_PASSWORD | 数据库密码 | 180 天 |
| SMTP_PASSWORD | 邮件密码 | 90 天 |
| API_KEY | 第三方 API | 90 天 |
| ENCRYPTION_KEY | 数据加密 | 90 天 |

### 密钥存储

```bash
# 生产环境推荐
- 使用 Vault / AWS Secrets Manager
- 环境变量注入
- 加密存储在配置中心
- 访问审计

# 开发环境
- 使用 .env 文件
- 不要提交到 Git
- 定期更换
```

---

## 漏洞修复流程

```
1. 漏洞报告 → 2. 评估严重性 → 3. 修复开发 → 4. 测试验证 → 5. 发布修复 → 6. 公开致谢
```

### 严重性分级

| 级别 | 描述 | 响应时间 | 修复时间 |
|------|------|----------|----------|
| 🔴 严重 | 数据泄露、远程代码执行 | 24 小时 | 7 天 |
| 🟠 高 | 权限提升、敏感数据访问 | 48 小时 | 14 天 |
| 🟡 中 | 有限的信息泄露 | 7 天 | 30 天 |
| 🟢 低 | 理论性问题 | 30 天 | 90 天 |

---

## 第三方安全

### 依赖管理

```bash
# 定期检查依赖漏洞
cargo audit
npm audit

# 更新依赖
cargo update
npm update
```

### 供应链安全

- [ ] 验证依赖来源
- [ ] 检查依赖签名
- [ ] 锁定依赖版本
- [ ] 监控安全公告

---

## 合规性

### 数据保护

- **GDPR**: 欧盟通用数据保护条例
- **CCPA**: 加州消费者隐私法案
- **网络安全法**: 中国网络安全法
- **数据安全法**: 中国数据安全法

### 行业标准

- **ISO 27001**: 信息安全管理体系
- **SOC 2**: 服务组织控制
- **等保 2.0**: 中国信息安全等级保护

---

## 联系信息

- **安全邮箱**: security@topems.local
- **紧急联系**: +86-xxx-xxxx-xxxx
- **PGP 公钥**: [下载](https://topems.local/security/pgp-key.asc)

---

## 相关文档

- [部署指南 - 安全配置](../deployment/deployment-guide-overview.md#安全配置)
- [环境配置 - 密钥管理](../getting-started/environment-config.md)
- [架构设计 - 安全设计](../architecture/overview.md#安全设计)
- [故障排查 - 认证问题](../deployment/troubleshooting.md#认证问题)
