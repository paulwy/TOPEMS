# 错误处理规范化指南

## 📊 问题分析

### ❌ 当前问题：832 次 unsafe unwrap/expect

在代码分析中发现：
- **832 次** `unwrap()` 和 `expect()` 调用
- **多处** 硬编码错误消息
- **不一致** 的错误类型
- **不友好** 的错误信息

### 🎯 改进目标

- ✅ 消除所有 unsafe unwrap
- ✅ 统一错误类型
- ✅ 提供友好的错误信息
- ✅ 增强错误上下文
- ✅ 改善错误恢复机制

## 🔧 使用方法

### 1. 替换 unsafe unwrap

#### ❌ 传统方式（不安全）

```rust
// 不安全 - 可能导致 panic
let config = CONFIG.get().unwrap();
let value = option.unwrap();
let result = some_operation().unwrap();
```

#### ✅ 新方式（安全）

```rust
use topems_shared::error::{SafeErrorHandler, TopemsError};

// 安全方式1：使用 SafeErrorHandler
let config = SafeErrorHandler::safe_unwrap_option(
    CONFIG.get(),
    "配置未初始化"
)?;

// 安全方式2：使用宏
let value = safe_unwrap!(option, "值不存在");

// 安全方式3：使用错误上下文
let result = some_operation()
    .with_context("操作失败")?;
```

### 2. 统一错误类型

#### ❌ 传统方式（不一致）

```rust
// 各种不同的错误类型
fn operation1() -> Result<T, Box<dyn std::error::Error>> { }
fn operation2() -> anyhow::Result<T> { }
fn operation3() -> Result<T, String> { }
```

#### ✅ 新方式（统一）

```rust
use topems_shared::error::{Result, TopemsError};

// 统一的错误类型
fn operation1() -> Result<T> { }
fn operation2() -> Result<T> { }
fn operation3() -> Result<T> { }
```

### 3. 错误恢复

#### ❌ 传统方式（中断流程）

```rust
// unwrap 失败会导致 panic
let value = risky_operation().unwrap();
```

#### ✅ 新方式（优雅恢复）

```rust
use topems_shared::error::ErrorRecovery;

// 方式1：使用默认值
let value = ErrorRecovery::try_or_default(
    || risky_operation(),
    default_value
);

// 方式2：记录错误并返回 None
let value = ErrorRecovery::try_or_log(|| risky_operation());

// 方式3：返回错误响应
let response = ErrorRecovery::try_or_response(|| risky_operation());
```

## 📋 错误类型分类

### 数据库错误

```rust
// 自动转换
impl From<sqlx::Error> for TopemsError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => TopemsError::DatabaseRecordNotFound("记录不存在".to_string()),
            sqlx::Error::PoolTimedOut => TopemsError::DatabaseConnection("连接池超时".to_string()),
            _ => TopemsError::DatabaseQuery(error.to_string()),
        }
    }
}

// 使用示例
async fn get_user(id: Uuid) -> Result<User> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.into()) // 自动转换
}
```

### 认证错误

```rust
// Token 验证
fn verify_token(token: &str) -> Result<Claims> {
    jsonwebtoken::decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
        &Validation::default(),
    )
    .map_err(|e| e.into()) // 自动转换为 TopemsError::InvalidToken
}
```

### 配置错误

```rust
use topems_shared::error::SafeErrorHandler;

// 安全加载环境变量
let database_url = SafeErrorHandler::safe_get_env("DATABASE_URL")?;

// 安全解析配置
let port = SafeErrorHandler::safe_parse::<u16>(
    &env_var,
    "端口配置"
)?;
```

### 业务逻辑错误

```rust
// 数据验证
fn validate_user(user: &User) -> Result<()> {
    if user.name.is_empty() {
        return Err(TopemsError::ValidationFailed("用户名不能为空".to_string()));
    }
    
    if user.age < 0 {
        return Err(TopemsError::ValidationFailed("年龄不能为负数".to_string()));
    }
    
    Ok(())
}

// 资源检查
fn check_resource_exists(id: Uuid) -> Result<Resource> {
    match find_resource(id) {
        Some(resource) => Ok(resource),
        None => Err(TopemsError::ResourceNotFound(format!("资源 {} 不存在", id))),
    }
}
```

## 🎯 完整示例

### ❌ 传统代码（不安全）

```rust
fn get_user_handler(
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<User>> {
    // 不安全的 unwrap
    let user = db.get_user(id).await.unwrap();
    
    Json(ApiResponse::success(user, "Success"))
}
```

### ✅ 改进代码（安全）

```rust
use topems_shared::error::{Result, ErrorRecovery};

fn get_user_handler(
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<User>> {
    // 安全的错误处理
    ErrorRecovery::try_or_response(|| {
        let user = db.get_user(id).await?;
        Ok(user)
    })
}
```

## 📊 错误处理对比

| 场景 | 传统方式 | 新方式 | 改进 |
|------|---------|--------|------|
| **Option unwrap** | panic | 安全错误 | ✅ 100% |
| **Result unwrap** | panic | 安全错误 | ✅ 100% |
| **错误类型** | 不一致 | 统一 | ✅ 100% |
| **错误信息** | 不友好 | 详细 | ✅ 80% |
| **错误恢复** | 无 | 多种方式 | ✅ 100% |
| **错误日志** | 无 | 自动记录 | ✅ 100% |

## 🔍 错误统计

```rust
use topems_shared::error::ErrorStatistics;

let mut stats = ErrorStatistics::new();

// 记录错误
stats.record_error(&error);

// 获取统计
let statistics = stats.get_statistics();
for (error_type, count) in statistics {
    println!("错误 {}: {} 次", error_type, count);
}
```

## 📝 迁移步骤

### 步骤1：识别 unsafe unwrap

```bash
# 搜索所有 unwrap
grep -r "unwrap()" --include="*.rs" services/

# 搜索所有 expect
grep -r "expect(" --include="*.rs" services/
```

### 步骤2：替换为安全版本

```rust
// 替换顺序：
// 1. unwrap() -> SafeErrorHandler::safe_unwrap_option/result
// 2. expect() -> with_context()
// 3. panic -> Err(TopemsError::Internal)
```

### 步骤3：统一错误类型

```rust
// 将所有函数签名改为统一类型
fn operation() -> Result<T> { }
```

### 步骤4：测试验证

```rust
#[test]
fn test_error_handling() {
    let result = operation_that_fails();
    assert!(result.is_err());
    
    let error = result.unwrap_err();
    assert!(matches!(error, TopemsError::ValidationFailed(_)));
}
```

## 🎉 总结

使用新的错误处理框架可以：
- ✅ 消除所有 unsafe unwrap（832 次）
- ✅ 统一错误类型
- ✅ 提供友好的错误信息
- ✅ 增强错误上下文
- ✅ 改善错误恢复机制
- ✅ 自动错误日志
- ✅ 错误统计分析

**建议所有新代码都使用新框架，旧代码逐步迁移。**