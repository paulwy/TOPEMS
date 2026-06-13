use crate::models::TemplateVariableDef;
use chrono::Utc;
use serde_json::Value;
use std::collections::HashMap;
use tracing::{debug, info, warn, error};

pub struct TemplateRenderService;

impl TemplateRenderService {
    /// 渲染模板内容（带详细日志）
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
    
    /// 渲染模板内容
    pub fn render(content: &str, variables: &HashMap<String, Value>) -> String {
        let mut result = content.to_string();
        let mut step_number = 1;
        
        // 处理条件判断 {{#if condition}}...{{/if}} - 先处理条件块
        debug!("--- 步骤{}: 处理条件判断 ---", step_number);
        result = Self::process_conditionals_with_logging(&result, variables);
        step_number += 1;
        
        // 处理带默认值的变量 {{variable_name || "default"}}
        debug!("--- 步骤{}: 处理默认值 ---", step_number);
        let variables_clone = variables.clone();
        let default_pattern = regex::Regex::new(r#"\{\{\s*(\w+)\s*\|\|\s*["']([^"']+)["']\s*\}\}"#).unwrap();
        let default_matches = default_pattern.find_iter(&result).count();
        debug!("找到的默认值块数量: {}", default_matches);
        
        result = default_pattern
            .replace_all(&result, |caps: &regex::Captures| -> String {
                let key = &caps[1];
                let default = &caps[2];
                let value = variables_clone.get(key);
                let final_value = if let Some(v) = value {
                    Self::value_to_string(v)
                } else {
                    default.to_string()
                };
                
                debug!("默认值块 {{ {} || \"{}\" }}:", key, default);
                debug!("  - 变量值: {:?}", value);
                debug!("  - 最终值: {}", final_value);
                debug!("  - 使用默认值: {}", value.is_none());
                
                final_value
            })
            .to_string();
        step_number += 1;
        
        // 处理基础变量替换 {{variable_name}}
        debug!("--- 步骤{}: 替换变量 ---", step_number);
        for (key, value) in variables {
            let pattern = format!("{{{{{}}}}}", key);
            let matches = result.matches(&pattern).count();
            let value_str = Self::value_to_string(value);
            
            debug!("变量 [{}]:", key);
            debug!("  - 值: {} (类型: {})", value_str, Self::value_type_name(value));
            debug!("  - 匹配次数: {}", matches);
            
            if matches == 0 {
                warn!("⚠️ 警告: 模板中未找到变量 {{{}}}", key);
            }
            
            result = result.replace(&pattern, &value_str);
            
            // 检查是否还有未替换的变量
            if result.contains(&pattern) {
                error!("❌ 错误: 变量 {{{}}} 替换后仍存在", key);
            }
        }
        step_number += 1;
        
        // 处理动态变量
        debug!("--- 步骤{}: 替换动态变量 ---", step_number);
        result = Self::process_dynamic_variables_with_logging(&result);
        step_number += 1;
        
        // 检查未处理的变量
        debug!("--- 步骤{}: 检查未处理的变量 ---", step_number);
        Self::check_remaining_variables(&result);
        
        result
    }
    
    fn value_to_string(value: &Value) -> String {
        match value {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Null => String::new(),
            Value::Array(arr) => {
                arr.iter()
                    .map(|v| Self::value_to_string(v))
                    .collect::<Vec<_>>()
                    .join(", ")
            }
            Value::Object(_) => serde_json::to_string(value).unwrap_or_default(),
        }
    }
    
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
    
    fn process_conditionals_with_logging(content: &str, variables: &HashMap<String, Value>) -> String {
        let mut result = content.to_string();
        
        let condition_pattern = regex::Regex::new(r"\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{/if\}\}").unwrap();
        let condition_matches = condition_pattern.find_iter(content).count();
        debug!("找到的条件块数量: {}", condition_matches);
        
        // 简单的条件处理 {{#if variable}}...{{/if}}
        loop {
            let re = regex::Regex::new(r"\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{/if\}\}").unwrap();
            let caps = match re.captures(&result) {
                Some(c) => c,
                None => break,
            };
            
            let var_name = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let if_content = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            let full_match_str = caps.get(0).map(|m| m.as_str()).unwrap_or("");
            
            let value = variables.get(var_name);
            let replacement = if let Some(v) = value {
                if Self::is_truthy(v) {
                    debug!("条件块 {{#if {}}}:", var_name);
                    debug!("  - 条件变量: {}", var_name);
                    debug!("  - 变量值: {:?}", v);
                    debug!("  - 布尔转换: true");
                    debug!("  - 内容长度: {}", if_content.len());
                    debug!("  - 处理结果: 保留内容");
                    if_content.to_string()
                } else {
                    debug!("条件块 {{#if {}}}:", var_name);
                    debug!("  - 条件变量: {}", var_name);
                    debug!("  - 变量值: {:?}", v);
                    debug!("  - 布尔转换: false");
                    debug!("  - 处理结果: 删除内容");
                    String::new()
                }
            } else {
                debug!("条件块 {{#if {}}}:", var_name);
                debug!("  - 条件变量: {}", var_name);
                debug!("  - 变量值: 未定义");
                debug!("  - 处理结果: 删除内容");
                String::new()
            };
            
            result = result.replacen(full_match_str, &replacement, 1);
        }
        
        // 处理 {{#ifnot variable}}...{{/ifnot}}
        loop {
            let re_not = regex::Regex::new(r"\{\{#ifnot\s+(\w+)\}\}([\s\S]*?)\{\{/ifnot\}\}").unwrap();
            let caps = match re_not.captures(&result) {
                Some(c) => c,
                None => break,
            };
            
            let var_name = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let if_content = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            let full_match_str = caps.get(0).map(|m| m.as_str()).unwrap_or("");
            
            let value = variables.get(var_name);
            let replacement = if let Some(v) = value {
                if !Self::is_truthy(v) {
                    debug!("条件块 {{#ifnot {}}}:", var_name);
                    debug!("  - 条件变量: {}", var_name);
                    debug!("  - 变量值: {:?}", v);
                    debug!("  - 布尔转换: false (反向为true)");
                    debug!("  - 处理结果: 保留内容");
                    if_content.to_string()
                } else {
                    debug!("条件块 {{#ifnot {}}}:", var_name);
                    debug!("  - 条件变量: {}", var_name);
                    debug!("  - 变量值: {:?}", v);
                    debug!("  - 布尔转换: true (反向为false)");
                    debug!("  - 处理结果: 删除内容");
                    String::new()
                }
            } else {
                debug!("条件块 {{#ifnot {}}}:", var_name);
                debug!("  - 条件变量: {}", var_name);
                debug!("  - 变量值: 未定义");
                debug!("  - 处理结果: 保留内容");
                if_content.to_string()
            };
            
            result = result.replacen(full_match_str, &replacement, 1);
        }
        
        result
    }
    
    fn process_dynamic_variables_with_logging(content: &str) -> String {
        let mut result = content.to_string();
        let now = Utc::now();
        
        let today_value = now.format("%Y-%m-%d").to_string();
        let now_value = now.to_rfc3339();
        
        debug!("动态变量:");
        debug!("  - {{today}}: {}", today_value);
        debug!("  - {{now}}: {}", now_value);
        
        let today_pattern = "{{today}}";
        let today_matches = result.matches(today_pattern).count();
        debug!("  - {{today}} 匹配次数: {}", today_matches);
        result = result.replace(today_pattern, &today_value);
        
        let now_pattern = "{{now}}";
        let now_matches = result.matches(now_pattern).count();
        debug!("  - {{now}} 匹配次数: {}", now_matches);
        result = result.replace(now_pattern, &now_value);
        
        result = result.replace("{{now_date}}", &now.format("%Y-%m-%d").to_string());
        result = result.replace("{{now_time}}", &now.format("%H:%M:%S").to_string());
        result = result.replace("{{now_timestamp}}", &now.timestamp().to_string());
        
        result
    }
    
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
    
    fn process_dynamic_variables(content: &str) -> String {
        let mut result = content.to_string();
        let now = Utc::now();
        
        // 替换 {{now}} 为当前时间
        result = result.replace("{{now}}", &now.to_rfc3339());
        result = result.replace("{{today}}", &now.format("%Y-%m-%d").to_string());
        result = result.replace("{{now_date}}", &now.format("%Y-%m-%d").to_string());
        result = result.replace("{{now_time}}", &now.format("%H:%M:%S").to_string());
        result = result.replace("{{now_timestamp}}", &now.timestamp().to_string());
        
        result
    }
    
    fn process_conditionals(content: &str, variables: &HashMap<String, Value>) -> String {
        let mut result = content.to_string();
        
        // 简单的条件处理 {{#if variable}}...{{/if}}
        loop {
            let re = regex::Regex::new(r"\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{/if\}\}").unwrap();
            let caps = match re.captures(&result) {
                Some(c) => c,
                None => break,
            };
            
            let var_name = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let if_content = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            let full_match_str = caps.get(0).map(|m| m.as_str()).unwrap_or("");
            
            let replacement = if let Some(value) = variables.get(var_name) {
                if Self::is_truthy(value) {
                    if_content.to_string()
                } else {
                    String::new()
                }
            } else {
                String::new()
            };
            
            result = result.replacen(full_match_str, &replacement, 1);
        }
        
        // 处理 {{#ifnot variable}}...{{/ifnot}}
        loop {
            let re_not = regex::Regex::new(r"\{\{#ifnot\s+(\w+)\}\}([\s\S]*?)\{\{/ifnot\}\}").unwrap();
            let caps = match re_not.captures(&result) {
                Some(c) => c,
                None => break,
            };
            
            let var_name = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            let if_content = caps.get(2).map(|m| m.as_str()).unwrap_or("");
            let full_match_str = caps.get(0).map(|m| m.as_str()).unwrap_or("");
            
            let replacement = if let Some(value) = variables.get(var_name) {
                if !Self::is_truthy(value) {
                    if_content.to_string()
                } else {
                    String::new()
                }
            } else {
                if_content.to_string()
            };
            
            result = result.replacen(full_match_str, &replacement, 1);
        }
        
        result
    }
    
    fn is_truthy(value: &Value) -> bool {
        match value {
            Value::Bool(b) => *b,
            Value::String(s) => !s.is_empty(),
            Value::Number(n) => n.as_f64().unwrap_or(0.0) != 0.0,
            Value::Array(arr) => !arr.is_empty(),
            Value::Object(obj) => !obj.is_empty(),
            Value::Null => false,
        }
    }
    
    /// 提取模板中的变量引用
    pub fn extract_variables(content: &str) -> Vec<String> {
        let mut variables = Vec::new();
        let re = regex::Regex::new(r"\{\{(\w+)\}\}").unwrap();
        
        for cap in re.captures_iter(content) {
            let var_name = &cap[1];
            // 排除动态变量
            if !["now", "today", "now_date", "now_time", "now_timestamp"].contains(&var_name) {
                if !variables.contains(&var_name.to_string()) {
                    variables.push(var_name.to_string());
                }
            }
        }
        
        variables
    }
    
    /// 验证变量值
    pub fn validate_variables(
        variables: &[TemplateVariableDef],
        values: &HashMap<String, Value>,
    ) -> Result<(), String> {
        for var in variables {
            if var.required.unwrap_or(false) {
                if let Some(value) = values.get(&var.key) {
                    if Self::is_empty(value) {
                        return Err(format!("变量 '{}' 是必填项", var.label));
                    }
                } else {
                    return Err(format!("变量 '{}' 是必填项", var.label));
                }
            }
        }
        Ok(())
    }
    
    fn is_empty(value: &Value) -> bool {
        match value {
            Value::Null => true,
            Value::String(s) => s.is_empty(),
            Value::Array(arr) => arr.is_empty(),
            _ => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    
    // ==================== 工作流基础变量替换测试 ====================
    
    #[test]
    fn test_workflow_basic_variable_replacement() {
        let template_content = r#"工作流名称：{{workflow_name}}
流程描述：{{description}}
创建人：{{creator}}
创建时间：{{today}}"#;

        let variables = HashMap::from([
            ("workflow_name".to_string(), json!("项目审批流程")),
            ("description".to_string(), json!("用于审批各类项目申请的标准化流程")),
            ("creator".to_string(), json!("张三")),
        ]);
        
        let result = TemplateRenderService::render(template_content, &variables);
        
        assert!(result.contains("工作流名称：项目审批流程"));
        assert!(result.contains("流程描述：用于审批各类项目申请的标准化流程"));
        assert!(result.contains("创建人：张三"));
        assert!(result.contains("创建时间："));
        
        println!("✅ 测试通过: 基础工作流变量替换\n{}", result);
    }
    
    #[test]
    fn test_workflow_multi_step_template() {
        let template_content = r#"【{{workflow_name}}】

## 流程概述
{{description}}

## 审批步骤

### 步骤1: 初审
- 负责人：{{step1_assignee}}
- 任务：{{step1_task}}
- 期限：{{step1_deadline}}天

### 步骤2: 复审
- 负责人：{{step2_assignee}}
- 任务：{{step2_task}}
- 期限：{{step2_deadline}}天

### 步骤3: 终审
- 负责人：{{step3_assignee}}
- 任务：{{step3_task}}
- 期限：{{step3_deadline}}天

---
创建人：{{creator}}
创建时间：{{today}}"#;

        let variables = HashMap::from([
            ("workflow_name".to_string(), json!("采购审批流程")),
            ("description".to_string(), json!("公司采购申请的审批流程")),
            ("step1_assignee".to_string(), json!("部门经理")),
            ("step1_task".to_string(), json!("部门初审")),
            ("step1_deadline".to_string(), json!(3)),
            ("step2_assignee".to_string(), json!("财务经理")),
            ("step2_task".to_string(), json!("财务复核")),
            ("step2_deadline".to_string(), json!(2)),
            ("step3_assignee".to_string(), json!("总经理")),
            ("step3_task".to_string(), json!("最终审批")),
            ("step3_deadline".to_string(), json!(1)),
            ("creator".to_string(), json!("李四")),
        ]);

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("【采购审批流程】"));
        assert!(result.contains("负责人：部门经理"));
        assert!(result.contains("负责人：财务经理"));
        assert!(result.contains("负责人：总经理"));
        assert!(result.contains("期限：3天"));
        
        println!("✅ 测试通过: 多步骤工作流模板\n{}", result);
    }
    
    // ==================== 默认值处理测试 ====================
    
    #[test]
    fn test_workflow_with_default_values() {
        let template_content = r#"工作流名称：{{workflow_name || "未命名工作流"}}
优先级：{{priority || "normal"}}
描述：{{description || "暂无描述"}}"#;

        let mut variables = HashMap::new();
        variables.insert("workflow_name".to_string(), json!("测试流程"));

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("工作流名称：测试流程"));
        assert!(result.contains("优先级：normal"));
        assert!(result.contains("描述：暂无描述"));
        
        println!("✅ 测试通过: 带默认值的工作流模板\n{}", result);
    }
    
    // ==================== 条件判断测试 ====================
    
    #[test]
    fn test_workflow_conditional_rendering() {
        let template_content = r#"工作流：{{workflow_name}}

{{#if is_urgent}}⚠️ 紧急流程，请优先处理！{{/if}}

{{#if has_attachment}}📎 包含附件，请注意查收{{/if}}

{{#ifnot is_auto}}📝 需要人工审批{{/ifnot}}"#;

        // 测试场景1: 所有条件都满足
        let mut variables1 = HashMap::new();
        variables1.insert("workflow_name".to_string(), json!("紧急采购申请"));
        variables1.insert("is_urgent".to_string(), json!(true));
        variables1.insert("has_attachment".to_string(), json!(true));
        variables1.insert("is_auto".to_string(), json!(false));

        let result1 = TemplateRenderService::render(template_content, &variables1);
        
        assert!(result1.contains("⚠️ 紧急流程，请优先处理！"));
        assert!(result1.contains("📎 包含附件，请注意查收"));
        assert!(result1.contains("📝 需要人工审批"));
        
        println!("✅ 测试通过: 条件判断（全部满足）\n{}", result1);

        // 测试场景2: 部分条件不满足
        let mut variables2 = HashMap::new();
        variables2.insert("workflow_name".to_string(), json!("普通审批"));
        variables2.insert("is_urgent".to_string(), json!(false));
        variables2.insert("has_attachment".to_string(), json!(false));
        variables2.insert("is_auto".to_string(), json!(true));

        let result2 = TemplateRenderService::render(template_content, &variables2);
        
        assert!(!result2.contains("⚠️ 紧急流程"));
        assert!(!result2.contains("📎 包含附件"));
        assert!(!result2.contains("📝 需要人工审批"));
        
        println!("✅ 测试通过: 条件判断（部分不满足）\n{}", result2);
    }
    
    // ==================== 数字和金额变量测试 ====================
    
    #[test]
    fn test_workflow_number_variables() {
        let template_content = r#"采购申请

物品名称：{{item_name}}
数量：{{quantity}}件
单价：¥{{unit_price}}
总金额：¥{{total_amount}}

预算审批额度：¥{{budget_limit}}
实际使用：¥{{amount_used}}
剩余额度：¥{{budget_remaining}}"#;

        let mut variables = HashMap::new();
        variables.insert("item_name".to_string(), json!("办公电脑"));
        variables.insert("quantity".to_string(), json!(10));
        variables.insert("unit_price".to_string(), json!(5000));
        variables.insert("total_amount".to_string(), json!(50000));
        variables.insert("budget_limit".to_string(), json!(100000));
        variables.insert("amount_used".to_string(), json!(50000));
        variables.insert("budget_remaining".to_string(), json!(50000));

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("数量：10件"));
        assert!(result.contains("总金额：¥50000"));
        assert!(result.contains("剩余额度：¥50000"));
        
        println!("✅ 测试通过: 数字和金额变量\n{}", result);
    }
    
    // ==================== 数组类型变量测试 ====================
    
    #[test]
    fn test_workflow_array_variables() {
        let template_content = r#"参与部门：
{{departments}}

审批人：
{{approvers}}

抄送人：
{{cc_list}}"#;

        let mut variables = HashMap::new();
        variables.insert("departments".to_string(), json!(["技术部", "财务部", "行政部"]));
        variables.insert("approvers".to_string(), json!(["张三", "李四"]));
        variables.insert("cc_list".to_string(), json!(["王五"]));

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("技术部, 财务部, 行政部"));
        assert!(result.contains("张三, 李四"));
        assert!(result.contains("王五"));
        
        println!("✅ 测试通过: 数组类型变量\n{}", result);
    }
    
    // ==================== 用户选择变量测试 ====================
    
    #[test]
    fn test_workflow_user_variables() {
        let template_content = r#"申请人：{{applicant_name}} ({{applicant_id}})
部门：{{department}}
职位：{{position}}

直接上级：{{manager_name}} ({{manager_id}})
审批人：{{approver_name}} ({{approver_id}})"#;

        let mut variables = HashMap::new();
        variables.insert("applicant_name".to_string(), json!("小明"));
        variables.insert("applicant_id".to_string(), json!("U001"));
        variables.insert("department".to_string(), json!("研发部"));
        variables.insert("position".to_string(), json!("高级工程师"));
        variables.insert("manager_name".to_string(), json!("张经理"));
        variables.insert("manager_id".to_string(), json!("M001"));
        variables.insert("approver_name".to_string(), json!("李总监"));
        variables.insert("approver_id".to_string(), json!("D001"));

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("申请人：小明 (U001)"));
        assert!(result.contains("部门：研发部"));
        assert!(result.contains("直接上级：张经理 (M001)"));
        
        println!("✅ 测试通过: 用户选择变量\n{}", result);
    }
    
    // ==================== 日期时间变量测试 ====================
    
    #[test]
    fn test_workflow_datetime_variables() {
        let template_content = r#"请假申请

申请人：{{applicant}}
请假类型：{{leave_type}}

开始日期：{{start_date}}
结束日期：{{end_date}}
共计：{{days}}天

申请时间：{{created_at}}
{{#if need_approval}}预计完成时间：{{expected_completion_date}}{{/if}}"#;

        let mut variables = HashMap::new();
        variables.insert("applicant".to_string(), json!("小明"));
        variables.insert("leave_type".to_string(), json!("年假"));
        variables.insert("start_date".to_string(), json!("2026-06-15"));
        variables.insert("end_date".to_string(), json!("2026-06-20"));
        variables.insert("days".to_string(), json!(5));
        variables.insert("created_at".to_string(), json!("{{now}}"));
        variables.insert("need_approval".to_string(), json!(true));
        variables.insert("expected_completion_date".to_string(), json!("2026-06-14"));

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("请假类型：年假"));
        assert!(result.contains("开始日期：2026-06-15"));
        assert!(result.contains("共计：5天"));
        // {{now}} 应该被替换为实际时间戳（包含数字时间戳）
        assert!(result.contains("申请时间："));
        assert!(result.contains("预计完成时间：2026-06-14"));
        
        println!("✅ 测试通过: 日期时间变量\n{}", result);
    }
    
    // ==================== 变量提取功能测试 ====================
    
    #[test]
    fn test_extract_workflow_variables() {
        let template_content = r#"工作流：{{workflow_name}}
申请人：{{applicant_name}}
{{#if is_urgent}}优先级：高{{/if}}
{{#if has_attachment}}附件：{{attachment_count}}个{{/if}}"#;

        let variables = TemplateRenderService::extract_variables(template_content);

        // 基础变量应该被提取
        assert!(variables.contains(&"workflow_name".to_string()));
        assert!(variables.contains(&"applicant_name".to_string()));
        assert!(variables.contains(&"attachment_count".to_string()));
        
        // 动态变量不应被提取
        assert!(!variables.contains(&"now".to_string()));
        assert!(!variables.contains(&"today".to_string()));
        
        // 注意：条件块内的变量（如is_urgent, has_attachment）不会单独提取
        // 因为它们是条件判断的一部分，不是实际的内容变量
        
        println!("✅ 测试通过: 变量提取功能");
        println!("提取到的变量: {:?}", variables);
    }
    
    // ==================== 变量验证测试 ====================
    
    #[test]
    fn test_validate_required_variables() {
        let variable_defs = vec![
            TemplateVariableDef {
                key: "workflow_name".to_string(),
                label: "工作流名称".to_string(),
                var_type: "string".to_string(),
                required: Some(true),
                default_value: None,
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: Some("请输入工作流名称".to_string()),
                description: None,
            },
            TemplateVariableDef {
                key: "description".to_string(),
                label: "描述".to_string(),
                var_type: "string".to_string(),
                required: Some(true),
                default_value: None,
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: Some("请输入描述".to_string()),
                description: None,
            },
            TemplateVariableDef {
                key: "priority".to_string(),
                label: "优先级".to_string(),
                var_type: "select".to_string(),
                required: Some(false),
                default_value: Some(json!("normal")),
                options: Some(vec![
                    crate::models::SelectOption { value: "low".to_string(), label: "低".to_string(), disabled: None },
                    crate::models::SelectOption { value: "normal".to_string(), label: "普通".to_string(), disabled: None },
                    crate::models::SelectOption { value: "high".to_string(), label: "高".to_string(), disabled: None },
                    crate::models::SelectOption { value: "urgent".to_string(), label: "紧急".to_string(), disabled: None },
                ]),
                data_source: None,
                validation_rules: None,
                placeholder: None,
                description: None,
            },
        ];

        // 测试1: 缺少必填项
        let mut values1 = HashMap::new();
        values1.insert("workflow_name".to_string(), json!(""));

        let result1 = TemplateRenderService::validate_variables(&variable_defs, &values1);
        assert!(result1.is_err());
        assert!(result1.unwrap_err().contains("工作流名称"));
        
        println!("✅ 测试通过: 缺少必填项验证");

        // 测试2: 缺少必填项（完全不存在）
        let mut values2 = HashMap::new();
        values2.insert("priority".to_string(), json!("high"));

        let result2 = TemplateRenderService::validate_variables(&variable_defs, &values2);
        assert!(result2.is_err());
        
        println!("✅ 测试通过: 缺少必填项（完全不存在）");

        // 测试3: 所有必填项都提供
        let mut values3 = HashMap::new();
        values3.insert("workflow_name".to_string(), json!("测试流程"));
        values3.insert("description".to_string(), json!("测试描述"));

        let result3 = TemplateRenderService::validate_variables(&variable_defs, &values3);
        assert!(result3.is_ok());
        
        println!("✅ 测试通过: 所有必填项都提供");
    }
    
    // ==================== 特殊字符和转义测试 ====================
    
    #[test]
    fn test_special_characters_handling() {
        let template_content = r#"物品描述：{{item_description}}
备注：{{notes}}"#;

        let mut variables = HashMap::new();
        variables.insert("item_description".to_string(), json!("包含\"双引号\"和'单引号'的描述"));
        variables.insert("notes".to_string(), json!("特殊字符: <>&'\""));

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("包含\"双引号\"和'单引号'的描述"));
        assert!(result.contains("特殊字符: <>&'\""));
        
        println!("✅ 测试通过: 特殊字符处理\n{}", result);
    }
    
    // ==================== 空值和null处理测试 ====================
    
    #[test]
    fn test_empty_and_null_values() {
        let template_content = r#"字段1：{{field1}}
字段2：{{field2}}
字段3：{{field3}}
字段4：{{field4 || "默认值"}}"#;

        let mut variables = HashMap::new();
        variables.insert("field1".to_string(), json!(""));
        variables.insert("field2".to_string(), json!(null));
        variables.insert("field3".to_string(), json!("有值"));
        // field4 不提供

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("字段1："));
        assert!(result.contains("字段2："));
        assert!(result.contains("字段3：有值"));
        assert!(result.contains("字段4：默认值"));
        
        println!("✅ 测试通过: 空值和null处理\n{}", result);
    }
    
    // ==================== 变量未定义情况测试 ====================
    
    #[test]
    fn test_undefined_variables() {
        let template_content = r#"工作流：{{workflow_name}}
未知变量：{{unknown_var1}}
另一个未知：{{another_unknown || "有默认值"}}
动态变量：{{today}}"#;

        let mut variables = HashMap::new();
        variables.insert("workflow_name".to_string(), json!("测试"));

        let result = TemplateRenderService::render(template_content, &variables);

        assert!(result.contains("工作流：测试"));
        assert!(result.contains("未知变量："));
        assert!(result.contains("另一个未知：有默认值"));
        assert!(result.contains("动态变量："));
        
        println!("✅ 测试通过: 变量未定义情况\n{}", result);
    }
    
    // ==================== 完整工作流场景测试 ====================
    
    #[test]
    fn test_full_workflow_scenario() {
        // 完整的工作流创建和使用场景
        
        // 1. 定义模板
        let template = r#"【工作流通知】

您有一条新的{{workflow_type}}需要审批：

基本信息：
- 工作流：{{workflow_name}}
- 申请人：{{applicant_name}}
- 部门：{{department}}
- 申请时间：{{apply_time}}

{{#if is_urgent}}⚠️ 紧急：此流程需要优先处理！{{/if}}

{{description}}

{{#if has_approval_history}}
审批历史：
{{approval_history}}
{{/if}}

请及时处理此申请。"#;

        // 2. 定义变量
        let variable_defs = vec![
            TemplateVariableDef {
                key: "workflow_type".to_string(),
                label: "工作流类型".to_string(),
                var_type: "select".to_string(),
                required: Some(true),
                default_value: None,
                options: Some(vec![
                    crate::models::SelectOption { value: "请假申请".to_string(), label: "请假申请".to_string(), disabled: None },
                    crate::models::SelectOption { value: "报销申请".to_string(), label: "报销申请".to_string(), disabled: None },
                    crate::models::SelectOption { value: "采购申请".to_string(), label: "采购申请".to_string(), disabled: None },
                    crate::models::SelectOption { value: "项目立项".to_string(), label: "项目立项".to_string(), disabled: None },
                ]),
                data_source: None,
                validation_rules: None,
                placeholder: None,
                description: None,
            },
            TemplateVariableDef {
                key: "workflow_name".to_string(),
                label: "工作流名称".to_string(),
                var_type: "string".to_string(),
                required: Some(true),
                default_value: None,
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: Some("请输入工作流名称".to_string()),
                description: None,
            },
            TemplateVariableDef {
                key: "applicant_name".to_string(),
                label: "申请人姓名".to_string(),
                var_type: "user".to_string(),
                required: Some(true),
                default_value: None,
                options: None,
                data_source: Some("users".to_string()),
                validation_rules: None,
                placeholder: None,
                description: None,
            },
            TemplateVariableDef {
                key: "department".to_string(),
                label: "部门".to_string(),
                var_type: "string".to_string(),
                required: Some(true),
                default_value: None,
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: None,
                description: None,
            },
            TemplateVariableDef {
                key: "apply_time".to_string(),
                label: "申请时间".to_string(),
                var_type: "date".to_string(),
                required: Some(true),
                default_value: None,
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: None,
                description: None,
            },
            TemplateVariableDef {
                key: "is_urgent".to_string(),
                label: "是否紧急".to_string(),
                var_type: "boolean".to_string(),
                required: Some(false),
                default_value: Some(json!(false)),
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: None,
                description: None,
            },
            TemplateVariableDef {
                key: "description".to_string(),
                label: "申请描述".to_string(),
                var_type: "string".to_string(),
                required: Some(true),
                default_value: None,
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: Some("请输入申请描述".to_string()),
                description: None,
            },
            TemplateVariableDef {
                key: "has_approval_history".to_string(),
                label: "是否有审批历史".to_string(),
                var_type: "boolean".to_string(),
                required: Some(false),
                default_value: Some(json!(false)),
                options: None,
                data_source: None,
                validation_rules: None,
                placeholder: None,
                description: None,
            },
        ];

        // 3. 准备用户输入的值
        let mut user_values = HashMap::new();
        user_values.insert("workflow_type".to_string(), json!("请假申请"));
        user_values.insert("workflow_name".to_string(), json!("年假申请"));
        user_values.insert("applicant_name".to_string(), json!("小明"));
        user_values.insert("department".to_string(), json!("技术部"));
        user_values.insert("apply_time".to_string(), json!("2026-06-15"));
        user_values.insert("is_urgent".to_string(), json!(true));
        user_values.insert("description".to_string(), json!("申请2026年6月20日至6月25日年假，共6天。"));
        user_values.insert("has_approval_history".to_string(), json!(false));

        // 4. 验证必填项
        let validation_result = TemplateRenderService::validate_variables(&variable_defs, &user_values);
        assert!(validation_result.is_ok(), "验证应该通过");
        
        println!("✅ 验证通过：所有必填项都已填写");

        // 5. 提取模板变量
        let extracted_vars = TemplateRenderService::extract_variables(template);
        println!("✅ 提取到变量：{:?}", extracted_vars);
        
        // 6. 渲染模板
        let rendered = TemplateRenderService::render(template, &user_values);
        
        println!("✅ 渲染结果：\n{}", rendered);

        // 7. 验证渲染结果
        assert!(rendered.contains("您有一条新的请假申请需要审批"));
        assert!(rendered.contains("工作流：年假申请"));
        assert!(rendered.contains("申请人：小明"));
        assert!(rendered.contains("部门：技术部"));
        assert!(rendered.contains("⚠️ 紧急：此流程需要优先处理！"));
        assert!(rendered.contains("申请2026年6月20日至6月25日年假，共6天。"));
        assert!(!rendered.contains("审批历史"));
        
        println!("✅ 测试通过：完整工作流场景");
    }
    
    // ==================== 原有基础测试 ====================
    
    #[test]
    fn test_render_basic_variable() {
        let content = "Hello {{name}}!";
        let variables = HashMap::from([("name".to_string(), json!("World"))]);
        
        let result = TemplateRenderService::render(content, &variables);
        assert_eq!(result, "Hello World!");
    }
    
    #[test]
    fn test_render_default_value() {
        let content = "Hello {{name || 'Guest'}}!";
        let variables = HashMap::new();
        
        let result = TemplateRenderService::render(content, &variables);
        assert_eq!(result, "Hello Guest!");
    }
    
    #[test]
    fn test_render_dynamic_variables() {
        let content = "Today is {{today}}";
        
        let result = TemplateRenderService::render(content, &HashMap::new());
        assert!(result.contains("Today is"));
    }
    
    #[test]
    fn test_extract_variables() {
        let content = "Hello {{name}}, welcome to {{app}}!";
        let variables = TemplateRenderService::extract_variables(content);
        
        assert_eq!(variables, vec!["name", "app"]);
    }
}