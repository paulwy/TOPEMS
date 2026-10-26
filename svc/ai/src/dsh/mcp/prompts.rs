//! MCP Prompts — 业务 Prompt 模板注册与渲染。
//!
//! 实现 MCP 协议 `prompts/list` / `prompts/get` 能力（2026-10-26 解冻）：
//! - 内置 4 个业务模板（对齐 MCP 工具覆盖域：ERP 销售、CRM 客户、Finance 财务、HRM 人力）
//! - 模板文本静态生成（无业务数据访问，prompts/get 无需鉴权）
//! - 外部 Agent 可基于模板构造 system prompt，替代自行拼装工具说明

use serde_json::{json, Map, Value};

/// Prompt 参数定义
pub struct PromptArgument {
    pub name: &'static str,
    pub description: &'static str,
    pub required: bool,
}

/// Prompt 模板
pub struct PromptTemplate {
    pub name: &'static str,
    pub description: &'static str,
    pub arguments: Vec<PromptArgument>,
    pub render: fn(&Map<String, Value>) -> String,
}

/// 内置业务 Prompt 模板（与 MCP 工具域一一对应）
pub fn business_prompts() -> Vec<PromptTemplate> {
    vec![
        PromptTemplate {
            name: "erp.sales_review",
            description: "销售周报分析：汇总指定周期的销售额、订单与趋势，输出管理层摘要",
            arguments: vec![PromptArgument {
                name: "period",
                description: "分析周期（如 2026-W42、2026-10）",
                required: true,
            }],
            render: |args| {
                let period = args
                    .get("period")
                    .and_then(|v| v.as_str())
                    .unwrap_or("最近一期");
                format!(
                    "你是 TOPEMS ERP 销售分析助手。请基于 ERP 销售数据，输出 {period} 的销售周报，\
                     包括：总销售额与环比、Top 订单、异常波动归因、下周预测。\
                     可调用 erp.* 工具获取销售订单与明细。"
                )
            },
        },
        PromptTemplate {
            name: "crm.pipeline_review",
            description: "客户管线复盘：梳理商机阶段分布、跟进健康度与重点客户",
            arguments: vec![PromptArgument {
                name: "focus",
                description: "复盘焦点（如 商机阶段 / 重点客户 / 跟进健康度）",
                required: false,
            }],
            render: |args| {
                let focus = args
                    .get("focus")
                    .and_then(|v| v.as_str())
                    .unwrap_or("整体管线");
                format!(
                    "你是 TOPEMS CRM 客户复盘助手。请基于 CRM 数据，对{focus}进行管线复盘，\
                     包括：阶段分布、赢单概率、高风险商机、下一步建议。\
                     可调用 crm.* 工具获取客户与商机数据。"
                )
            },
        },
        PromptTemplate {
            name: "finance.voucher_audit",
            description: "凭证审阅：核对指定月份凭证的完整性、借贷平衡与异常分录",
            arguments: vec![PromptArgument {
                name: "month",
                description: "审阅月份（如 2026-09）",
                required: true,
            }],
            render: |args| {
                let month = args
                    .get("month")
                    .and_then(|v| v.as_str())
                    .unwrap_or("最近已结账月份");
                format!(
                    "你是 TOPEMS Finance 财务审阅助手。请对 {month} 的会计凭证进行审阅，\
                     包括：借贷平衡检查、凭证完整性、大额/异常分录提示、审计关注点。\
                     可调用 finance.* 工具获取凭证与科目数据。"
                )
            },
        },
        PromptTemplate {
            name: "hrm.people_insight",
            description: "人效洞察：分析团队人效、编制使用与异常考勤",
            arguments: vec![PromptArgument {
                name: "scope",
                description: "分析范围（部门/团队/全员）",
                required: false,
            }],
            render: |args| {
                let scope = args
                    .get("scope")
                    .and_then(|v| v.as_str())
                    .unwrap_or("全公司");
                format!(
                    "你是 TOPEMS HRM 人效分析助手。请基于 HRM 数据，分析{scope}的人效与人力状况，\
                     包括：人效指标、编制使用率、异常考勤、人力成本提示。\
                     可调用 hrm.* 工具获取员工与考勤数据。"
                )
            },
        },
    ]
}

/// prompts/list 响应：模板元信息列表
pub fn list_prompts() -> Vec<Value> {
    business_prompts()
        .iter()
        .map(|p| {
            json!({
                "name": p.name,
                "description": p.description,
                "arguments": p
                    .arguments
                    .iter()
                    .map(|a| {
                        json!({
                            "name": a.name,
                            "description": a.description,
                            "required": a.required,
                        })
                    })
                    .collect::<Vec<_>>(),
            })
        })
        .collect()
}

/// prompts/get 响应：按名称渲染模板消息；未知名返回 None
pub fn get_prompt(name: &str, arguments: &Map<String, Value>) -> Option<Value> {
    let prompts = business_prompts();
    let template = prompts.iter().find(|p| p.name == name)?;
    let text = (template.render)(arguments);
    Some(json!({
        "description": template.description,
        "messages": [{
            "role": "user",
            "content": { "type": "text", "text": text },
        }],
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_prompts_non_empty_and_schema() {
        let list = list_prompts();
        assert_eq!(list.len(), 4);
        for item in &list {
            let name = item.get("name").and_then(|v| v.as_str()).unwrap();
            let args = item.get("arguments").and_then(|v| v.as_array()).unwrap();
            assert!(!name.is_empty());
            assert!(!args.is_empty(), "template {} must declare arguments", name);
        }
    }

    #[test]
    fn test_get_prompt_renders_with_arguments() {
        let mut args = Map::new();
        args.insert("period".to_string(), Value::String("2026-W42".to_string()));
        let result = get_prompt("erp.sales_review", &args).expect("known prompt");
        let text = result["messages"][0]["content"]["text"]
            .as_str()
            .expect("text content");
        assert!(text.contains("2026-W42"));
        assert!(text.contains("销售周报"));
    }

    #[test]
    fn test_get_prompt_renders_without_optional_args() {
        let mut args = Map::new();
        let result = get_prompt("crm.pipeline_review", &args).expect("known prompt");
        let text = result["messages"][0]["content"]["text"]
            .as_str()
            .expect("text content");
        assert!(text.contains("整体管线"));
    }

    #[test]
    fn test_get_prompt_unknown_name_returns_none() {
        let args = Map::new();
        assert!(get_prompt("nonexistent.prompt", &args).is_none());
    }
}
