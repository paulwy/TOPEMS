# LIMS 服务认证问题修复报告

## 问题描述
LIMS 服务在调用 API 时返回 `401 Unauthorized` 错误，错误信息为 `认证失败：InvalidSignature`。

## 根本原因
JWT (JSON Web Token) 签名验证失败，原因是 LIMS 服务使用的 JWT_SECRET 与 IAM 服务生成 token 时使用的密钥不一致。

## 问题分析

### 1. JWT Token 流程
1. 用户通过 IAM 服务登录获取 token（使用 `topems-jwt-secret` 签名）
2. 用户携带 token 调用 LIMS API
3. LIMS 服务尝试验证 token 签名（需要相同的密钥）

### 2. 根本原因
LIMS 服务启动时没有正确读取 `JWT_SECRET` 环境变量，导致使用默认密钥或不同的密钥来验证 token。

从调试日志可以看到：
```
Token verification failed: InvalidSignature
```

### 3. JWT Token 结构
成功解码的 token 包含：
- **Header**: `{"typ": "JWT", "alg": "HS256"}`
- **Payload**: 包含 `sub`, `username`, `role`, `permissions`, `is_superuser`, `exp`, `iat` 等字段
- **Signature**: 由 IAM 服务使用 `topems-jwt-secret` 生成

## 解决方案

### 方案 1：创建启动脚本（已实施）
创建 `/services/topems-lims/backend/start.sh` 脚本，在启动前设置正确的环境变量：

```bash
#!/bin/bash
export JWT_SECRET="topems-jwt-secret"
export REFRESH_SECRET="topems-refresh-secret"
export JWT_EXPIRY_HOURS="24"
export RUST_LOG="info"

cargo run
```

### 方案 2：统一环境配置文件（推荐）
创建 `/TOPEMS/.env.shared` 文件，包含所有服务的统一配置：

```bash
JWT_SECRET=topems-jwt-secret
REFRESH_SECRET=topems-refresh-secret
JWT_EXPIRY_HOURS=24
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
RUST_LOG=info
RUST_ENV=development
ENV=dev
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 方案 3：使用通用启动脚本
创建 `/scripts/start-service.sh` 脚本，为所有服务提供统一的启动方式。

## 修复步骤

### 1. 停止现有的 LIMS 服务
```bash
pkill -f 'topems-lims'
```

### 2. 使用新脚本启动 LIMS 服务
```bash
cd /services/topems-lims/backend
chmod +x start.sh
./start.sh
```

### 3. 验证修复
```bash
python3 /scripts/debug_lims_auth.py
```

## 测试结果

### 修复前
```
测试: Bearer token
❌ 失败 (401) - {"code":401,"success":false,"data":null,"message":"认证失败：InvalidSignature"}
```

### 修复后
```
测试: Bearer token
✅ 成功 - {"code": 200, "success": true, "data": {"page": 1, "page_size": 20, "samples": [], "total": 0}, "message": "获取样品列表成功"}
```

## 完整 API 测试结果

所有 6 个服务的 API 功能测试全部通过：

```
==================================================
TOPEMS API 功能测试
==================================================

0. 所有服务健康检查
   ✅ IAM - 健康
   ✅ DOC - 健康
   ✅ AI - 健康
   ✅ FLOW - 健康
   ✅ RS - 健康
   ✅ LIMS - 健康

1. 用户登录测试
✅ 登录成功

2. LIMS API 测试
✅ LIMS API 调用成功

3. RS API 测试
✅ RS API 调用成功

4. DOC API 测试
✅ DOC API 调用成功

5. AI API 测试
✅ AI API 调用成功

6. FLOW API 测试
✅ FLOW API 调用成功

==================================================
测试完成
==================================================
```

## 预防措施

### 1. 统一配置管理
- 创建 `.env.shared` 文件管理所有共享配置
- 所有服务在启动前加载该配置

### 2. 环境变量检查
在服务启动时添加环境变量验证：
```rust
if std::env::var("JWT_SECRET").is_err() {
    tracing::warn!("JWT_SECRET 未设置，使用默认值");
}
```

### 3. 日志增强
添加详细的启动日志，显示使用的配置：
```rust
tracing::info!("JWT_SECRET: {}", auth_state.jwt_secret);
```

## 相关文件

### 创建的文件
- `/services/topems-lims/backend/start.sh` - LIMS 服务启动脚本
- `/TOPEMS/.env.shared` - 统一环境配置文件
- `/scripts/start-service.sh` - 通用服务启动脚本
- `/scripts/debug_lims_auth.py` - 认证问题调试脚本

### 修改的文件
- 无需修改现有代码，仅通过环境变量配置解决

## 结论

LIMS 服务的认证问题已成功修复。通过在启动前设置正确的 `JWT_SECRET` 环境变量，解决了 token 签名验证失败的问题。

**状态**: ✅ 已完全修复
**测试结果**: 100% 通过
**影响范围**: 所有使用 JWT 认证的服务

---

**修复时间**: 2026-05-28
**修复人员**: AI Assistant
**验证状态**: ✅ 通过
