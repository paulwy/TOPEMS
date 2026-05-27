# TOPEMS 数据验证规则说明

## 📋 概述

TOPEMS 系统已添加完整的前后端数据验证，确保数据的安全性和一致性。

## 🎯 验证规则

### 1. 用户名 (Username)
- **必填**: 是
- **长度**: 6-20个字符
- **格式**: 只能包含字母和数字
- **正则**: `^[a-zA-Z0-9]{6,20}$`

### 2. 邮箱 (Email)
- **必填**: 是（注册时）
- **格式**: 标准邮箱格式
- **正则**: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`

### 3. 密码 (Password)
- **必填**: 是
- **最小长度**: 8个字符
- **复杂度要求**:
  - 至少包含一个大写字母
  - 至少包含一个小写字母
  - 至少包含一个数字

### 4. 编号 (Code)
- **必填**: 是
- **长度**: 3-20个字符
- **格式**: 字母数字组合
- **正则**: `^[a-zA-Z0-9]{3,20}$`

### 5. 名称 (Name)
- **最小长度**: 2个字符
- **最大长度**: 100个字符
- **必填**: 是

### 6. 描述 (Description)
- **最大长度**: 1000个字符

### 7. 电话 (Phone)
- **格式**: 中国大陆手机号
- **正则**: `^1[3-9]\d{9}$`

### 8. 金额 (Amount)
- **范围**: 正数
- **小数位**: 最多2位小数
- **正则**: `^\d+(\.\d{1,2})?$`

## 🛠️ 技术实现

### 前端实现

#### 1. 验证工具 (`frontend/src/utils/validation.ts`)
- `ValidationRule`: 验证规则接口
- `ValidationError`: 验证错误结构
- `patterns`: 常用正则表达式
- `validationRules`: 预定义验证规则
- `FormValidator`: 表单验证器类
- `validateForm()`: 表单验证函数

#### 2. 错误显示组件 (`frontend/src/components/ValidationError.tsx`)
- `FieldError`: 字段级错误显示
- `FormError`: 表单错误汇总显示
- `ValidationHint`: 验证提示信息
- `InlineValidation`: 内联验证组件
- `SuccessMessage`: 成功消息提示

#### 3. 验证 Hook (`frontend/src/hooks/useFormValidation.ts`)
- `useFormValidation`: React Hook 用于表单验证
- 提供状态管理和验证逻辑

### 后端实现

#### 验证模块 (`services/topems-rs/backend/src/validation.rs`)
```rust
pub fn validate_username(username: &str) -> Result<(), Vec<ValidationError>>
pub fn validate_email(email: &str) -> Result<(), Vec<ValidationError>>
pub fn validate_password(password: &str) -> Result<(), Vec<ValidationError>>
pub fn validate_code(code: &str, field_name: &str) -> Result<(), Vec<ValidationError>>
pub fn validate_name(name: &str, field_name: &str, min_len: usize, max_len: usize) -> Result<(), Vec<ValidationError>>
pub fn validate_amount(amount: f64, field_name: &str) -> Result<(), Vec<ValidationError>>
pub fn validate_phone(phone: &str, required: bool) -> Result<(), Vec<ValidationError>>
pub fn validate_length(value: &str, field_name: &str, max_len: usize) -> Result<(), Vec<ValidationError>>
```

## 📦 已添加验证的页面

### 前端页面
1. **LoginPage.tsx** - 登录/注册表单
   - 用户名验证
   - 邮箱验证（注册时）
   - 密码复杂度验证
   - 实时字段验证
   - 字段级错误提示
   - 验证提示信息

2. **Rspage.tsx** - 科研研发系统
   - 项目名称验证（2-100字符）
   - 项目描述验证（最多1000字符）
   - 试验标题验证（2-200字符）
   - 试验员姓名验证（最多50字符）
   - 关联项目必选验证

### 后端 API
1. **topems-rs** - 研发管理系统
   - 项目创建/更新验证
   - 试验记录创建/更新验证

## 🔧 添加的 Rust 依赖

```toml
# 所有后端服务的 Cargo.toml
validator = { version = "0.18", features = ["derive"] }
regex = "1"
lazy_static = "1"
```

## 📝 错误消息格式

### 前端错误消息（中文）
```typescript
{
  "username": "用户名不能为空",
  "username": "用户名至少需要6个字符",
  "username": "用户名只能包含字母和数字",
  "email": "邮箱不能为空",
  "email": "邮箱格式不正确",
  "password": "密码不能为空",
  "password": "密码至少需要8个字符",
  "password": "密码必须包含大小写字母和数字"
}
```

### 后端错误消息（中文）
```rust
// 示例响应
{
  "code": 400,
  "success": false,
  "message": "name: 项目名称不能为空",
  "timestamp": "2026-05-22T10:00:00Z"
}
```

## ✅ 验证流程

### 前端验证流程
1. 用户输入 → onChange 事件触发
2. 实时验证（可选，根据设置）
3. 字段失焦 → onBlur 事件触发验证
4. 显示字段级错误提示
5. 表单提交前 → 完整表单验证
6. 验证失败 → 显示错误，阻止提交
7. 验证成功 → 提交表单

### 后端验证流程
1. 接收 API 请求
2. 解析请求体
3. 执行验证规则
4. 验证失败 → 返回 400 错误
5. 验证成功 → 执行业务逻辑
6. 返回响应

## 🎨 错误显示样式

### 字段错误
- 红色边框 (`border-red-500`)
- 红色文字 (`text-red-600`)
- 错误图标 (`AlertCircle`)

### 表单错误汇总
- 红色背景容器 (`bg-red-50`)
- 带项目符号的错误列表
- 清晰的错误描述

### 成功消息
- 绿色背景容器 (`bg-green-50`)
- 绿色文字 (`text-green-800`)
- 勾选图标

## 📚 使用示例

### 前端使用
```tsx
import { FieldError, ValidationHint } from '../components/ValidationError';
import { patterns } from '../utils/validation';

// 在组件中使用
<input
  type="text"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  onBlur={() => handleBlur('username')}
  className={hasError ? 'border-red-500' : ''}
/>
<FieldError error={errors.username} />
<ValidationHint field="用户名" rules={['6-20位', '字母或数字']} />
```

### 后端使用
```rust
use crate::validation::{validate_name, validate_length, format_validation_errors};

// 在 handler 中使用
pub async fn create_project(
    State(repo): State<RsRepository>,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    if let Err(errors) = validate_name(&req.name, "name", 2, 100) {
        return Json(ApiResponse::error(format_validation_errors(errors)));
    }
    
    if let Err(errors) = validate_length(&req.description, "description", 1000) {
        return Json(ApiResponse::error(format_validation_errors(errors)));
    }
    
    // 继续业务逻辑
}
```

## 🔄 维护建议

1. **保持一致性**: 前端和后端使用相同的验证规则
2. **错误消息**: 始终使用中文错误消息
3. **性能考虑**: 避免过于复杂的正则表达式
4. **用户体验**: 提供清晰的验证提示
5. **安全第一**: 不要依赖前端验证，后端必须验证所有输入

## 📞 支持

如有问题，请查看：
- 前端验证工具: `frontend/src/utils/validation.ts`
- 错误显示组件: `frontend/src/components/ValidationError.tsx`
- 后端验证模块: `services/topems-rs/backend/src/validation.rs`
