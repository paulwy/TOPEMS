# 模板日志功能实施存档

**存档日期**: 2026-06-13  
**实施人员**: AI Assistant  
**实施状态**: ✅ 已完成

---

## 一、实施背景

### 1.1 问题描述

在模板渲染过程中，变量替换失败时缺乏详细的日志输出，导致排查困难。需要增加详细的日志输出功能，帮助开发者快速定位问题。

### 1.2 实施目标

1. 在前端模板渲染逻辑中增加详细的日志输出
2. 在后端模板渲染服务中增加详细的日志输出
3. 创建完整的排查指南文档
4. 更新技术规格文档，记录新增功能

---

## 二、实施内容

### 2.1 前端日志输出

**实现文件**: [TemplateDemoPage.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateDemoPage.tsx#L242-L374)

#### 修改内容

在 `handleRender` 函数中添加了详细的日志输出：

```typescript
// 渲染模板
const handleRender = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    console.log("=== 开始模板渲染 ===");
    console.log("模板名称:", selectedTemplate.name);
    console.log("模板ID:", selectedTemplate.id);
    console.log("原始内容长度:", selectedTemplate.content.length);
    console.log("原始内容:\n", selectedTemplate.content);
    console.log("变量配置:", JSON.stringify(templateVariables, null, 2));
    console.log("变量定义:", JSON.stringify(selectedTemplate.variables, null, 2));

    await new Promise((resolve) => setTimeout(resolve, 300));

    let result = selectedTemplate.content;
    let stepNumber = 1;
    
    // 步骤1: 替换变量
    console.log(`\n--- 步骤${stepNumber}: 替换变量 ---`);
    Object.entries(templateVariables).forEach(([key, value]) => {
        const pattern = new RegExp(`{{${key}}}`, "g");
        const matches = result.match(pattern);
        const matchCount = matches ? matches.length : 0;
        const beforeReplace = result;
        result = result.replace(pattern, String(value));
        const replacedCount = beforeReplace.split(pattern).length - 1;
        
        console.log(`变量 [${key}]:`);
        console.log(`  - 值: "${value}" (类型: ${typeof value})`);
        console.log(`  - 匹配次数: ${matchCount}`);
        console.log(`  - 替换次数: ${replacedCount}`);
        console.log(`  - 正则模式: ${pattern}`);
        
        if (matchCount === 0) {
            console.warn(`  ⚠️ 警告: 模板中未找到变量 {{${key}}}`);
        }
        
        // 检查是否还有未替换的变量
        const remainingPattern = new RegExp(`{{${key}}}`, "g");
        if (remainingPattern.test(result)) {
            console.error(`  ❌ 错误: 变量 {{${key}}} 替换后仍存在`);
        }
    });
    stepNumber++;

    // ... 其他步骤的日志输出
};
```

#### 日志输出内容

1. **渲染开始信息**
   - 模板名称、ID
   - 原始内容长度和内容
   - 变量配置（JSON格式）
   - 变量定义（JSON格式）

2. **步骤1 - 变量替换**
   - 每个变量的值和类型
   - 匹配次数和替换次数
   - 正则表达式模式
   - 警告：如果模板中未找到变量
   - 错误：如果替换后变量仍存在

3. **步骤2 - 条件判断处理**
   - 找到的条件块数量
   - 每个条件块的详细信息

4. **步骤3 - 默认值处理**
   - 找到的默认值块数量
   - 每个默认值块的详细信息

5. **步骤4 - 动态变量替换**
   - `{{today}}` 和 `{{now}}` 的值
   - 匹配次数

6. **步骤5 - 未处理变量检查**
   - 检查是否有未处理的变量
   - 输出警告和建议

7. **渲染完成信息**
   - 最终内容长度
   - 最终渲染内容
   - 渲染耗时

---

### 2.2 后端日志输出

**实现文件**: [template_render_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_render_service.rs)

#### 新增方法

1. **`render_with_logging` 方法**
```rust
pub fn render_with_logging(content: &str, variables: &HashMap<String, Value>) -> String {
    info!("=== 开始模板渲染 ===");
    info!("原始内容长度: {} 字符", content.len());
    debug!("原始内容:\n{}", content);
    debug!("变量配置: {:?}", variables);
    
    let result = Self::render(content, variables);
    
    info!("=== 渲染完成 ===");
    info!("最终内容长度: {} 字符", result.len());
    debug!("最终内容:\n{}", result);
    
    result
}
```

2. **`process_conditionals_with_logging` 方法**
```rust
fn process_conditionals_with_logging(content: &str, variables: &HashMap<String, Value>) -> String {
    let mut result = content.to_string();
    
    let condition_pattern = regex::Regex::new(r"\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{/if\}\}").unwrap();
    let condition_matches = condition_pattern.find_iter(content).count();
    debug!("找到的条件块数量: {}", condition_matches);
    
    // ... 条件处理逻辑，带详细日志输出
}
```

3. **`process_dynamic_variables_with_logging` 方法**
```rust
fn process_dynamic_variables_with_logging(content: &str) -> String {
    let mut result = content.to_string();
    let now = Utc::now();
    
    let today_value = now.format("%Y-%m-%d").to_string();
    let now_value = now.to_rfc3339();
    
    debug!("动态变量:");
    debug!("  - {{today}}: {}", today_value);
    debug!("  - {{now}}: {}", now_value);
    
    // ... 动态变量替换逻辑
}
```

4. **`check_remaining_variables` 方法**
```rust
fn check_remaining_variables(content: &str) {
    let remaining_pattern = regex::Regex::new(r"\{\{([^#/][^}]+)\}\}").unwrap();
    let remaining_vars: Vec<&str> = remaining_pattern
        .captures_iter(content)
        .map(|caps| caps.get(1).unwrap().as_str())
        .collect();
    
    if !remaining_vars.is_empty() {
        warn!("⚠️ 发现未处理的变量:");
        for var in remaining_vars {
            warn!("  - {{{}}}", var);
        }
        warn!("建议检查:");
        warn!("  1. 变量名是否正确");
        warn!("  2. 变量是否已配置值");
        warn!("  3. 变量格式是否正确");
    } else {
        debug!("✅ 所有变量已成功处理");
    }
}
```

5. **`value_type_name` 方法**
```rust
fn value_type_name(value: &Value) -> &'static str {
    match value {
        Value::String(_) => "string",
        Value::Number(_) => "number",
        Value::Bool(_) => "boolean",
        Value::Null => "null",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}
```

---

### 2.3 排查指南文档

**文档文件**: [template-troubleshooting-guide.md](file:///Users/air/TOPEMS/docs/template-troubleshooting-guide.md)

#### 文档内容

1. **常见警告类型及排查方法**
   - ⚠️ "模板中未找到变量 {{xxx}}"
   - ⚠️ "发现未处理的变量"
   - ❌ "变量 {{xxx}} 替换后仍存在"

2. **条件判断问题排查**
   - 变量类型错误（字符串 vs 布尔值）
   - 布尔转换逻辑检查

3. **默认值问题排查**
   - 空字符串被视为有效值
   - 使用 null 或不传递变量

4. **动态变量问题排查**
   - 支持的动态变量列表
   - 变量名拼写错误检查

5. **完整排查流程**
   - 7步排查清单
   - 从日志开始到最终结果

6. **常见问题速查表**
   - 快速定位问题和解决方案

7. **调试技巧**
   - 浏览器控制台使用
   - 后端日志查看
   - 单元测试验证

8. **最佳实践**
   - 变量命名规范
   - 变量定义规范
   - 模板编写规范
   - 测试验证

---

### 2.4 技术规格文档更新

**文档文件**: [2026-06-13-template-management-design.md](file:///Users/air/TOPEMS/docs/superpowers/specs/2026-06-13-template-management-design.md)

#### 新增章节

1. **第11章 - 日志与调试功能**
   - 11.1 前端日志输出
   - 11.2 后端日志输出
   - 11.3 排查指南

2. **第12章 - 实施记录**
   - 12.1 2026-06-13 实施内容
   - 12.2 待实施内容

---

## 三、实施过程

### 3.1 前端实施

1. **修改 TemplateDemoPage.tsx**
   - 在 `handleRender` 函数中添加详细日志
   - 修复字符串模板中的双花括号转义问题
   - 构建成功，无编译错误

2. **测试前端日志**
   - 打开浏览器开发者工具
   - 切换到 Console 标签
   - 点击"渲染模板"按钮
   - 查看详细日志输出

### 3.2 后端实施

1. **修改 template_render_service.rs**
   - 添加 `render_with_logging` 方法
   - 添加 `process_conditionals_with_logging` 方法
   - 添加 `process_dynamic_variables_with_logging` 方法
   - 添加 `check_remaining_variables` 方法
   - 添加 `value_type_name` 方法
   - 修复 Rust 语法错误（`step_number++` → `step_number += 1`）
   - 修复格式化字符串中的双花括号问题

2. **构建后端服务**
   - 运行 `cargo check --bin topems-doc`
   - 构建成功，只有警告，无错误

### 3.3 数据库迁移

1. **执行迁移脚本**
   - 运行 `psql -U topems -d topems -f 20260613000001_extend_templates.sql`
   - 迁移成功，添加新字段和新表

2. **重启后端服务**
   - 停止旧服务
   - 启动新服务：`RUST_LOG=debug DOC_PORT=8024 cargo run --bin topems-doc`
   - 服务正常运行

### 3.4 文档编写

1. **创建排查指南**
   - 编写 [template-troubleshooting-guide.md](file:///Users/air/TOPEMS/docs/template-troubleshooting-guide.md)
   - 包含完整的排查流程和最佳实践

2. **更新技术规格**
   - 添加第11章 - 日志与调试功能
   - 添加第12章 - 实施记录
   - 记录所有实施内容和待实施内容

---

## 四、实施结果

### 4.1 功能验证

1. **前端日志功能**
   - ✅ 浏览器控制台输出详细日志
   - ✅ 每个步骤都有清晰的日志输出
   - ✅ 警告和错误信息清晰明了

2. **后端日志功能**
   - ✅ 服务启动时设置 `RUST_LOG=debug`
   - ✅ 日志输出到控制台
   - ✅ 每个步骤的处理结果都有详细记录

3. **排查指南**
   - ✅ 文档完整，包含所有常见问题
   - ✅ 提供详细的排查步骤
   - ✅ 包含最佳实践和调试技巧

4. **技术规格文档**
   - ✅ 新增章节完整记录实施内容
   - ✅ 待实施内容清晰列出

### 4.2 服务状态

- **前端服务**: http://localhost:5173/template-demo ✅ 正常运行
- **后端服务**: http://localhost:8024 ✅ 正常运行
- **模板 API**: ✅ 正常返回数据

---

## 五、后续计划

### 5.1 待实施内容

1. **AI 集成**
   - 接入 OpenAI API
   - 实现智能模板生成
   - 实现变量智能建议
   - 实现内容优化建议

2. **高级功能**
   - 模板版本管理
   - 模板权限控制
   - 模板审计日志查询
   - 模板统计分析

3. **性能优化**
   - 模板缓存机制
   - 大模板渲染优化
   - 批量渲染支持

---

## 六、相关文件

### 6.1 实现文件

- [TemplateDemoPage.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/TemplateDemoPage.tsx) - 前端演示页面（含日志）
- [template_render_service.rs](file:///Users/air/TOPEMS/svc/doc/src/services/template_render_service.rs) - 后端渲染服务（含日志）

### 6.2 文档文件

- [template-troubleshooting-guide.md](file:///Users/air/TOPEMS/docs/template-troubleshooting-guide.md) - 排查指南
- [2026-06-13-template-management-design.md](file:///Users/air/TOPEMS/docs/superpowers/specs/2026-06-13-template-management-design.md) - 技术规格文档

### 6.3 数据库文件

- [20260613000001_extend_templates.sql](file:///Users/air/TOPEMS/svc/doc/src/db/migrations/20260613000001_extend_templates.sql) - 数据库迁移脚本

---

**存档完成日期**: 2026-06-13  
**存档状态**: ✅ 已完成