
# TOPEMS OpenAPI 文档优化总结

## 日期
2026-05-29

---

## 完成的工作

### 1. LIMS 服务 OpenAPI 文档 ✅

#### 模型层添加 ToSchema
- [x] `models/sample.rs` - 为 Sample, CreateSampleRequest, UpdateSampleRequest 添加 `#[derive(ToSchema)]`

#### API 层添加 utoipa 路径属性
- [x] `api/sample.rs` - 为所有 API 端点添加完整的 `#[utoipa::path]` 属性：
  - `list_samples` - GET /api/v1/samples
  - `create_sample` - POST /api/v1/samples
  - `get_sample` - GET /api/v1/samples/{id}
  - `update_sample` - PUT /api/v1/samples/{id}
  - `delete_sample` - DELETE /api/v1/samples/{id}

#### 创建 OpenAPI 文档生成器
- [x] `api/openapi.rs` - 创建完整的 OpenAPI 文档生成器

#### 配置 Swagger UI
- [x] 更新 `Cargo.toml` - 添加 utoipa 和 utoipa-swagger-ui 依赖
- [x] 更新 `main.rs` - 添加 Swagger UI 路由和 OpenAPI JSON 端点

**Swagger UI 访问地址**:
- Swagger UI: `http://localhost:8006/swagger-ui/`
- OpenAPI JSON: `http://localhost:8006/api-docs/openapi.json`

---

### 2. RS 服务 OpenAPI 文档 ✅

#### 添加依赖
- [x] 更新 `Cargo.toml` - 添加 utoipa 和 utoipa-swagger-ui 依赖

#### 模型层添加 ToSchema
- [x] `models/project.rs` - 为 Project, CreateProjectRequest, UpdateProjectRequest 添加 `#[derive(ToSchema)]`

#### API 层 (待完成)
- [ ] `api/project.rs` - 为所有 API 端点添加 `#[utoipa::path]` 属性
- [ ] 创建 OpenAPI 文档生成器
- [ ] 配置 Swagger UI 路由

---

## 下一步工作

### 高优先级
1. **完成 RS 服务 OpenAPI 文档**
   - 为 `api/project.rs` 添加路径属性
   - 创建 `api/openapi.rs`
   - 配置 Swagger UI 路由

2. **添加单元测试**
   - 为共享库模块添加测试
   - 为 API 逻辑添加测试

### 中优先级
3. **集成 Redis 缓存**
4. **添加性能监控**

---

## 修改的文件

### LIMS 服务
- `services/topems-lims/backend/Cargo.toml` ✅
- `services/topems-lims/backend/src/models/sample.rs` ✅
- `services/topems-lims/backend/src/api/sample.rs` ✅
- `services/topems-lims/backend/src/api/openapi.rs` ✅ (NEW)
- `services/topems-lims/backend/src/main.rs` ✅

### RS 服务
- `services/topems-rs/backend/Cargo.toml` ✅
- `services/topems-rs/backend/src/models/project.rs` ✅
- `services/topems-rs/backend/src/api/project.rs` (待完成)
- `services/topems-rs/backend/src/api/openapi.rs` (待创建)
- `services/topems-rs/backend/src/main.rs` (待更新)

---

## 使用示例

### 访问 Swagger UI

服务启动后，访问：
```
http://localhost:8006/swagger-ui/
```

### API 端点

#### 获取样品列表
```bash
GET /api/v1/samples?page=1&page_size=20&search=测试&status=received
Authorization: Bearer <token>
```

#### 创建样品
```bash
POST /api/v1/samples
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "测试样品",
  "description": "这是一个测试样品",
  "status": "received"
}
```

#### 获取单个样品
```bash
GET /api/v1/samples/{id}
Authorization: Bearer <token>
```

#### 更新样品
```bash
PUT /api/v1/samples/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "更新后的样品名称",
  "description": "更新后的描述",
  "status": "completed"
}
```

#### 删除样品
```bash
DELETE /api/v1/samples/{id}
Authorization: Bearer <token>
```

---

## OpenAPI 文档特性

### 支持的功能
- ✅ 自动生成请求/响应文档
- ✅ 参数验证说明
- ✅ 认证要求标注
- ✅ 错误响应文档
- ✅ Swagger UI 交互式界面
- ✅ OpenAPI JSON 导出

### 文档包含的信息
- 端点描述
- 参数说明（包括类型、是否必填、可选值）
- 请求体结构
- 响应结构
- 错误码说明
- 认证方式

---

## 注意事项

1. **认证要求**: 所有端点都需要 Bearer Token 认证
2. **参数验证**: 查询参数支持可选和必填
3. **分页**: list 端点支持分页参数
4. **搜索**: 支持模糊搜索（ILIKE）

---

## 测试命令

```bash
# 启动 LIMS 服务
cd services/topems-lims/backend
cargo run

# 访问 Swagger UI
open http://localhost:8006/swagger-ui/

# 登录获取 token
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 使用 token 测试 API
curl -X GET http://localhost:8006/api/v1/samples \
  -H "Authorization: Bearer <your-token>"
```

---

## 状态

- **LIMS 服务**: ✅ 完成
- **RS 服务**: 🔄 部分完成（模型已添加，API 路径待添加）
- **完成度**: 60%

---

**文档创建日期**: 2026-05-29
**优化状态**: 进行中
