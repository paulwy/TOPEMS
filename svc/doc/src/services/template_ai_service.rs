use crate::models::{Template, TemplateVariableDef};

pub struct TemplateAIService;

impl TemplateAIService {
    /// 根据描述生成模板内容
    pub fn generate_template_content(description: &str, template_type: &str) -> String {
        let prompt = format!(
            "生成一个{}模板，描述如下：{}\n\n请输出完整的模板内容，使用{{变量名}}格式定义变量。",
            template_type, description
        );
        
        Self::mock_ai_generate(prompt)
    }

    /// 为模板建议变量
    pub fn suggest_variables(content: &str) -> Vec<TemplateVariableDef> {
        let mut suggestions = Vec::new();
        
        if content.contains("{{") {
            let re = regex::Regex::new(r"\{\{(\w+)\}\}").unwrap();
            for cap in re.captures_iter(content) {
                let var_name = &cap[1];
                if !["now", "today", "now_date", "now_time", "now_timestamp"].contains(&var_name) {
                    suggestions.push(TemplateVariableDef {
                        key: var_name.to_string(),
                        label: Self::generate_label(var_name),
                        var_type: Self::infer_type(var_name),
                        required: Some(false),
                        default_value: None,
                        options: None,
                        data_source: None,
                        validation_rules: None,
                        placeholder: Some(format!("请输入{}", Self::generate_label(var_name))),
                        description: None,
                    });
                }
            }
        }
        
        suggestions
    }

    /// 优化模板内容
    pub fn optimize_content(content: &str) -> String {
        let prompt = format!("优化以下模板内容，使其更清晰、规范：\n{}", content);
        Self::mock_ai_optimize(prompt)
    }

    /// 分析模板变量使用情况
    pub fn analyze_variables(template: &Template) -> VariableAnalysis {
        let mut analysis = VariableAnalysis {
            total_variables: template.variables.as_ref().map(|v| {
                serde_json::from_value::<Vec<TemplateVariableDef>>(v.clone()).map(|vars| vars.len()).unwrap_or(0)
            }).unwrap_or(0),
            used_in_content: 0,
            unused_variables: Vec::new(),
            suggestions: Vec::new(),
        };

        if let Some(vars) = &template.variables {
            if let Ok(variables) = serde_json::from_value::<Vec<TemplateVariableDef>>(vars.clone()) {
                for var in variables {
                    let pattern = format!("{{{{{}}}}}", var.key);
                    if template.content.contains(&pattern) {
                        analysis.used_in_content += 1;
                    } else {
                        analysis.unused_variables.push(var.key.clone());
                    }
                }
            }
        }

        if analysis.total_variables > analysis.used_in_content {
            analysis.suggestions.push("以下变量在内容中未被使用：".to_string());
            analysis.suggestions.extend(analysis.unused_variables.clone());
        }

        if analysis.total_variables == 0 && template.content.contains("{{") {
            analysis.suggestions.push("检测到内容中有未定义的变量引用，请添加相应的变量定义".to_string());
        }

        analysis
    }

    fn generate_label(var_name: &str) -> String {
        let replacements = [
            ("name", "名称"),
            ("title", "标题"),
            ("code", "编码"),
            ("description", "描述"),
            ("content", "内容"),
            ("date", "日期"),
            ("time", "时间"),
            ("user", "用户"),
            ("author", "作者"),
            ("department", "部门"),
            ("company", "公司"),
            ("project", "项目"),
            ("amount", "金额"),
            ("number", "编号"),
            ("status", "状态"),
            ("type", "类型"),
            ("category", "分类"),
            ("subject", "主题"),
            ("summary", "摘要"),
            ("body", "正文"),
        ];

        for (key, label) in replacements {
            if var_name.to_lowercase() == key || var_name.to_lowercase().ends_with(key) {
                return label.to_string();
            }
        }

        let parts: Vec<&str> = var_name.split('_').collect();
        if parts.len() > 1 {
            parts.iter().map(|p| {
                let mut s = p.to_string();
                if let Some(c) = s.get_mut(0..1) {
                    c.make_ascii_uppercase();
                }
                s
            }).collect::<Vec<String>>().join(" ")
        } else {
            let mut result = var_name.to_string();
            if let Some(c) = result.get_mut(0..1) {
                c.make_ascii_uppercase();
            }
            result
        }
    }

    fn infer_type(var_name: &str) -> String {
        let lower_name = var_name.to_lowercase();
        
        if lower_name.contains("date") || lower_name.contains("time") {
            return "date".to_string();
        }
        if lower_name.contains("amount") || lower_name.contains("number") || lower_name.contains("price") {
            return "number".to_string();
        }
        if lower_name.contains("user") || lower_name.contains("author") || lower_name.contains("creator") {
            return "user".to_string();
        }
        if lower_name.contains("status") || lower_name.contains("type") || lower_name.contains("category") {
            return "select".to_string();
        }
        
        "string".to_string()
    }

    fn mock_ai_generate(prompt: String) -> String {
        tracing::info!("AI生成模板内容: {}", prompt);
        
        if prompt.contains("通知") || prompt.contains("notification") {
            return r#"【{{title}}】

尊敬的{{recipient_name}}：

您好！

{{content}}

如有疑问，请联系：{{contact_person}}
联系电话：{{contact_phone}}

{{sender_name}}
{{sender_department}}
{{today}}"#.to_string();
        }

        if prompt.contains("报告") || prompt.contains("report") {
            return r#"# {{report_title}}

## 一、概述
{{summary}}

## 二、详细内容
{{details}}

## 三、结论
{{conclusion}}

报告人：{{reporter}}
报告日期：{{today}}"#.to_string();
        }

        if prompt.contains("表单") || prompt.contains("form") {
            return r#"# {{form_title}}

### 基本信息
- 申请人：{{applicant}}
- 申请日期：{{today}}
- 部门：{{department}}

### 申请内容
{{application_content}}

### 审批意见
{{approval_comments}}"#.to_string();
        }

        if prompt.contains("工作流") || prompt.contains("workflow") {
            return r#"工作流名称：{{workflow_name}}
流程描述：{{description}}

步骤1：{{step1_assignee}} - {{step1_task}}
步骤2：{{step2_assignee}} - {{step2_task}}
步骤3：{{step3_assignee}} - {{step3_task}}

创建时间：{{today}}
创建人：{{creator}}"#.to_string();
        }

        format!(
            r#"# {{title}}

{{description}}

创建时间：{{today}}
创建人：{{user_name}}"#
        )
    }

    fn mock_ai_optimize(prompt: String) -> String {
        tracing::info!("AI优化模板内容: {}", prompt);
        
        prompt.replace("{{", "{{").replace("}}", "}}")
    }
}

pub struct VariableAnalysis {
    pub total_variables: usize,
    pub used_in_content: usize,
    pub unused_variables: Vec<String>,
    pub suggestions: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_label() {
        assert_eq!(TemplateAIService::generate_label("user_name"), "名称");
        assert_eq!(TemplateAIService::generate_label("department"), "部门");
        assert_eq!(TemplateAIService::generate_label("report_title"), "标题");
    }

    #[test]
    fn test_infer_type() {
        assert_eq!(TemplateAIService::infer_type("create_date"), "date");
        assert_eq!(TemplateAIService::infer_type("amount"), "number");
        assert_eq!(TemplateAIService::infer_type("user_id"), "user");
        assert_eq!(TemplateAIService::infer_type("status"), "select");
        assert_eq!(TemplateAIService::infer_type("description"), "string");
    }

    #[test]
    fn test_suggest_variables() {
        let content = "Hello {{name}}, today is {{today}}";
        let suggestions = TemplateAIService::suggest_variables(content);
        
        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].key, "name");
    }

    #[test]
    fn test_analyze_variables() {
        let template = Template {
            id: uuid::Uuid::new_v4(),
            name: "Test".to_string(),
            code: "test".to_string(),
            template_type: Some("document".to_string()),
            category_id: None,
            module: Some("test".to_string()),
            description: None,
            content: "Hello {{name}}".to_string(),
            variables: Some(serde_json::json!([
                {"key": "name", "label": "Name", "type": "string"},
                {"key": "unused", "label": "Unused", "type": "string"}
            ])),
            is_active: Some(true),
            is_system: Some(false),
            is_public: Some(false),
            ai_enabled: Some(false),
            version: Some(1),
            sort_order: Some(0),
            view_count: Some(0),
            use_count: Some(0),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            created_by: Some("admin".to_string()),
        };

        let analysis = TemplateAIService::analyze_variables(&template);
        
        assert_eq!(analysis.total_variables, 2);
        assert_eq!(analysis.used_in_content, 1);
        assert_eq!(analysis.unused_variables, vec!["unused"]);
    }
}