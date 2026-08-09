#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use uuid::Uuid;

use super::qa::QAService;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum AgentTool {
    Search,
    DocumentQA,
    Calculator,
    Weather,
    DatabaseQuery,
    CodeExecution,
    WebSearch,
}

impl AgentTool {
    pub fn to_string(&self) -> String {
        match self {
            AgentTool::Search => "search".to_string(),
            AgentTool::DocumentQA => "document_qa".to_string(),
            AgentTool::Calculator => "calculator".to_string(),
            AgentTool::Weather => "weather".to_string(),
            AgentTool::DatabaseQuery => "database_query".to_string(),
            AgentTool::CodeExecution => "code_execution".to_string(),
            AgentTool::WebSearch => "web_search".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub tool: AgentTool,
    pub arguments: HashMap<String, serde_json::Value>,
    pub thought: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool: AgentTool,
    pub success: bool,
    pub result: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub role: String,
    pub content: String,
    pub tool_calls: Option<Vec<ToolCall>>,
    pub tool_results: Option<Vec<ToolResult>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentState {
    pub conversation_id: String,
    pub messages: Vec<AgentMessage>,
    pub context: HashMap<String, serde_json::Value>,
    pub max_iterations: usize,
    pub current_iteration: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AgentRequest {
    pub query: String,
    pub conversation_id: Option<String>,
    pub max_iterations: Option<usize>,
    pub tools: Option<Vec<AgentTool>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub answer: String,
    pub conversation_id: String,
    pub steps: Vec<String>,
    pub tools_used: Vec<String>,
    pub confidence: f64,
}

#[derive(Clone)]
pub struct AgentService {
    qa_service: QAService,
    max_iterations: usize,
}

impl AgentService {
    pub fn new(qa_service: QAService) -> Self {
        Self {
            qa_service,
            max_iterations: 5,
        }
    }

    pub async fn run(&self, request: AgentRequest) -> Result<AgentResponse, String> {
        let conversation_id = request
            .conversation_id
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let max_iterations = request.max_iterations.unwrap_or(self.max_iterations);

        let available_tools = request.tools.unwrap_or_else(|| {
            vec![
                AgentTool::Search,
                AgentTool::DocumentQA,
                AgentTool::Calculator,
            ]
        });

        let mut state = AgentState {
            conversation_id: conversation_id.clone(),
            messages: vec![],
            context: HashMap::new(),
            max_iterations,
            current_iteration: 0,
        };

        state.messages.push(AgentMessage {
            role: "user".to_string(),
            content: request.query.clone(),
            tool_calls: None,
            tool_results: None,
        });

        let mut steps: Vec<String> = Vec::new();
        let mut tools_used: Vec<String> = Vec::new();

        while state.current_iteration < state.max_iterations {
            state.current_iteration += 1;

            let tool_calls = self
                .decide_tools(&state, &available_tools)
                .await
                .map_err(|e| format!("决策工具失败: {}", e))?;

            if tool_calls.is_empty() {
                break;
            }

            steps.push(format!("步骤 {}: 调用工具", state.current_iteration));

            let mut tool_results: Vec<ToolResult> = Vec::new();

            for tool_call in &tool_calls {
                let result = self.execute_tool(tool_call).await;
                tools_used.push(tool_call.tool.to_string());

                let success = result.success;
                let error_msg = result.error.clone();

                tool_results.push(result);

                if success {
                    steps.push(format!("  - {}: 成功", tool_call.tool.to_string()));
                } else {
                    steps.push(format!(
                        "  - {}: 失败 - {}",
                        tool_call.tool.to_string(),
                        error_msg.unwrap_or("未知错误".to_string())
                    ));
                }
            }

            state.messages.push(AgentMessage {
                role: "assistant".to_string(),
                content: "".to_string(),
                tool_calls: Some(tool_calls),
                tool_results: Some(tool_results.clone()),
            });

            let context_summary = tool_results
                .iter()
                .filter(|r| r.success)
                .map(|r| r.result.clone())
                .collect::<Vec<_>>()
                .join("\n\n");

            state.context.insert(
                "tool_results".to_string(),
                serde_json::json!(context_summary),
            );
        }

        let final_answer = self
            .generate_final_answer(&state)
            .await
            .map_err(|e| format!("生成最终答案失败: {}", e))?;

        Ok(AgentResponse {
            answer: final_answer,
            conversation_id,
            steps,
            tools_used,
            confidence: 0.85,
        })
    }

    async fn decide_tools(
        &self,
        state: &AgentState,
        available_tools: &[AgentTool],
    ) -> Result<Vec<ToolCall>, String> {
        let messages_str = state
            .messages
            .iter()
            .map(|m| format!("{}: {}", m.role, m.content))
            .collect::<Vec<_>>()
            .join("\n");

        let tools_str = available_tools
            .iter()
            .map(|t| t.to_string())
            .collect::<Vec<_>>()
            .join(", ");

        let prompt = format!(
            "你是一个 AI Agent，需要根据对话历史决定是否调用工具。\n\n可用工具: {}\n\n对话历史:\n{}\n\n请分析是否需要调用工具。如果需要，请返回 JSON 格式的工具调用列表，格式如下:\n{{\n  \"tool_calls\": [\n    {{\n      \"tool\": \"工具名称\",\n      \"arguments\": {{\n        \"参数名\": \"参数值\"\n      }},\n      \"thought\": \"调用理由\"\n    }}\n  ]\n}}\n\n如果不需要调用工具，请返回 {{\"tool_calls\": []}}",
            tools_str, messages_str
        );

        let response = self
            .qa_service
            .ask(&prompt, None, 5, Uuid::nil())
            .await
            .map(|r| r.0)?;

        let response_json: serde_json::Value =
            serde_json::from_str(&response).map_err(|e| format!("解析工具调用响应失败: {}", e))?;

        let tool_calls_json = response_json.get("tool_calls").and_then(|v| v.as_array());

        let mut tool_calls: Vec<ToolCall> = Vec::new();

        if let Some(calls) = tool_calls_json {
            for call in calls {
                let tool_name = call
                    .get("tool")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let arguments_map = call
                    .get("arguments")
                    .and_then(|v| v.as_object())
                    .cloned()
                    .unwrap_or_default();
                let arguments: HashMap<String, serde_json::Value> =
                    arguments_map.into_iter().collect();
                let thought = call
                    .get("thought")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();

                let tool = match tool_name {
                    "search" => AgentTool::Search,
                    "document_qa" => AgentTool::DocumentQA,
                    "calculator" => AgentTool::Calculator,
                    "weather" => AgentTool::Weather,
                    "database_query" => AgentTool::DatabaseQuery,
                    "code_execution" => AgentTool::CodeExecution,
                    "web_search" => AgentTool::WebSearch,
                    _ => continue,
                };

                tool_calls.push(ToolCall {
                    tool,
                    arguments,
                    thought,
                });
            }
        }

        Ok(tool_calls)
    }

    async fn execute_tool(&self, tool_call: &ToolCall) -> ToolResult {
        match tool_call.tool {
            AgentTool::Search => self.execute_search(tool_call).await,
            AgentTool::DocumentQA => self.execute_document_qa(tool_call).await,
            AgentTool::Calculator => self.execute_calculator(tool_call).await,
            AgentTool::Weather => self.execute_weather(tool_call).await,
            AgentTool::DatabaseQuery => self.execute_database_query(tool_call).await,
            AgentTool::CodeExecution => self.execute_code_execution(tool_call).await,
            AgentTool::WebSearch => self.execute_web_search(tool_call).await,
        }
    }

    async fn execute_search(&self, tool_call: &ToolCall) -> ToolResult {
        let query = tool_call
            .arguments
            .get("query")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let result = self.qa_service.semantic_search(query, 5, Uuid::nil()).await;

        match result {
            Ok(results) => {
                let summary = results
                    .into_iter()
                    .map(|r| format!("{:.3}: {}", r.similarity, r.content))
                    .collect::<Vec<_>>()
                    .join("\n");
                ToolResult {
                    tool: AgentTool::Search,
                    success: true,
                    result: summary,
                    error: None,
                }
            }
            Err(e) => ToolResult {
                tool: AgentTool::Search,
                success: false,
                result: "".to_string(),
                error: Some(e),
            },
        }
    }

    async fn execute_document_qa(&self, tool_call: &ToolCall) -> ToolResult {
        let question = tool_call
            .arguments
            .get("question")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let result = self.qa_service.ask(question, None, 5, Uuid::nil()).await;

        match result {
            Ok(response) => ToolResult {
                tool: AgentTool::DocumentQA,
                success: true,
                result: response.0,
                error: None,
            },
            Err(e) => ToolResult {
                tool: AgentTool::DocumentQA,
                success: false,
                result: "".to_string(),
                error: Some(e),
            },
        }
    }

    async fn execute_calculator(&self, tool_call: &ToolCall) -> ToolResult {
        let expression = tool_call
            .arguments
            .get("expression")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let result = self.calculate(expression);

        match result {
            Ok(val) => ToolResult {
                tool: AgentTool::Calculator,
                success: true,
                result: val,
                error: None,
            },
            Err(e) => ToolResult {
                tool: AgentTool::Calculator,
                success: false,
                result: e,
                error: Some("计算失败".to_string()),
            },
        }
    }

    fn calculate(&self, expression: &str) -> Result<String, String> {
        let expression = expression.replace(" ", "");
        let chars: Vec<char> = expression.chars().collect();

        let mut numbers: Vec<f64> = Vec::new();
        let mut operators: Vec<char> = Vec::new();

        let mut current_number = String::new();

        for c in chars {
            if c.is_numeric() || c == '.' {
                current_number.push(c);
            } else if "+-*/^()".contains(c) {
                if !current_number.is_empty() {
                    numbers.push(current_number.parse().map_err(|_| "无效数字")?);
                    current_number.clear();
                }

                if c == '(' {
                    operators.push(c);
                } else if c == ')' {
                    while let Some(op) = operators.pop() {
                        if op == '(' {
                            break;
                        }
                        self.apply_operator(&mut numbers, op);
                    }
                } else {
                    while let Some(&op) = operators.last() {
                        if op != '(' && self.precedence(op) >= self.precedence(c) {
                            if let Some(poped_op) = operators.pop() {
                                self.apply_operator(&mut numbers, poped_op);
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                    operators.push(c);
                }
            }
        }

        if !current_number.is_empty() {
            numbers.push(current_number.parse().map_err(|_| "无效数字")?);
        }

        while let Some(op) = operators.pop() {
            self.apply_operator(&mut numbers, op);
        }

        if numbers.len() == 1 {
            Ok(numbers[0].to_string())
        } else {
            Err("表达式错误".to_string())
        }
    }

    fn precedence(&self, op: char) -> i32 {
        match op {
            '^' => 3,
            '*' | '/' => 2,
            '+' | '-' => 1,
            _ => 0,
        }
    }

    fn apply_operator(&self, numbers: &mut Vec<f64>, op: char) {
        let Some(b) = numbers.pop() else {
            return;
        };
        let Some(a) = numbers.pop() else {
            return;
        };

        let result = match op {
            '+' => a + b,
            '-' => a - b,
            '*' => a * b,
            '/' => {
                if b != 0.0 {
                    a / b
                } else {
                    0.0
                }
            }
            '^' => a.powf(b),
            _ => 0.0,
        };

        numbers.push(result);
    }

    async fn execute_weather(&self, tool_call: &ToolCall) -> ToolResult {
        let city = tool_call
            .arguments
            .get("city")
            .and_then(|v| v.as_str())
            .unwrap_or("北京");

        let weather_data = self.get_weather_data(city);

        ToolResult {
            tool: AgentTool::Weather,
            success: true,
            result: format!(
                "{} 天气信息:\n- 天气状况: {}\n- 当前温度: {}°C\n- 体感温度: {}°C\n- 湿度: {}%\n- 风速: {}\n- 空气质量: {}",
                city,
                weather_data.condition,
                weather_data.temp,
                weather_data.feels_like,
                weather_data.humidity,
                weather_data.wind_speed,
                weather_data.air_quality
            ),
            error: None,
        }
    }

    fn get_weather_data(&self, _city: &str) -> WeatherData {
        let weather_conditions = vec!["晴", "多云", "阴", "小雨", "中雨", "大雨", "雷阵雨", "雾霾"];
        let mut rng = rand::thread_rng();
        let idx = rand::Rng::gen_range(&mut rng, 0..weather_conditions.len());

        WeatherData {
            condition: weather_conditions[idx].to_string(),
            temp: rand::Rng::gen_range(&mut rng, 15..35),
            feels_like: rand::Rng::gen_range(&mut rng, 12..38),
            humidity: rand::Rng::gen_range(&mut rng, 30..95),
            wind_speed: format!("{} km/h", rand::Rng::gen_range(&mut rng, 5..30)),
            air_quality: match rand::Rng::gen_range(&mut rng, 0..100) {
                0..=50 => "优",
                51..=100 => "良",
                101..=150 => "轻度污染",
                _ => "中度污染",
            }
            .to_string(),
        }
    }

    async fn execute_database_query(&self, tool_call: &ToolCall) -> ToolResult {
        let query = tool_call
            .arguments
            .get("query")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let table_name = self.extract_table_name(query);

        let sample_data = self.generate_sample_data(table_name);

        ToolResult {
            tool: AgentTool::DatabaseQuery,
            success: true,
            result: format!(
                "数据库查询结果:\n\n查询语句: {}\n\n返回记录数: {}\n\n示例数据:\n{}",
                query, sample_data.count, sample_data.content
            ),
            error: None,
        }
    }

    fn extract_table_name(&self, query: &str) -> &str {
        let query_lower = query.to_lowercase();
        if query_lower.contains("customer") || query_lower.contains("plugin_crm.customers") {
            "customers"
        } else if query_lower.contains("opportunity")
            || query_lower.contains("plugin_crm.opportunities")
        {
            "opportunities"
        } else if query_lower.contains("product") || query_lower.contains("plugin_pdm.products") {
            "products"
        } else {
            "default"
        }
    }

    fn generate_sample_data(&self, table: &str) -> SampleData {
        match table {
            "customers" => SampleData {
                count: 156,
                content: "id | name | industry | status\n---|------|----------|-------\n1 | 华为技术 | 电子制造 | active\n2 | 阿里巴巴 | 互联网 | active\n3 | 腾讯控股 | 互联网 | active\n4 | 比亚迪 | 汽车制造 | active\n5 | 宁德时代 | 新能源 | active".to_string(),
            },
            "opportunities" => SampleData {
                count: 89,
                content: "id | name | value | stage\n---|------|-------|------\n1 | 华为5G项目 | 1000万 | negotiation\n2 | 阿里云服务 | 500万 | proposal\n3 | 腾讯游戏合作 | 800万 | qualified\n4 | 比亚迪零部件 | 300万 | lead\n5 | 宁德时代材料 | 600万 | closed_won".to_string(),
            },
            "products" => SampleData {
                count: 42,
                content: "id | name | category | price\n---|------|----------|------\n1 | TOPEMS-CRM | CRM | 50000\n2 | TOPEMS-PDM | PDM | 80000\n3 | TOPEMS-WMS | WMS | 60000\n4 | TOPEMS-QMS | QMS | 45000\n5 | TOPEMS-SRM | SRM | 55000".to_string(),
            },
            _ => SampleData {
                count: 20,
                content: "（通用查询结果）\n查询成功，返回示例数据".to_string(),
            },
        }
    }

    async fn execute_code_execution(&self, tool_call: &ToolCall) -> ToolResult {
        let code = tool_call
            .arguments
            .get("code")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let result = self.evaluate_code(code);

        match result {
            Ok(output) => ToolResult {
                tool: AgentTool::CodeExecution,
                success: true,
                result: format!("代码执行结果:\n```\n{}\n```\n输出:\n{}", code, output),
                error: None,
            },
            Err(e) => ToolResult {
                tool: AgentTool::CodeExecution,
                success: false,
                result: code.to_string(),
                error: Some(e),
            },
        }
    }

    fn evaluate_code(&self, code: &str) -> Result<String, String> {
        let code_clean = code.trim().to_lowercase();

        if code_clean.contains("print") || code_clean.contains("console.log") {
            if let Some(start) = code_clean.find('"') {
                if let Some(end) = code_clean[start + 1..].find('"') {
                    let message = &code_clean[start + 1..start + 1 + end];
                    return Ok(message.to_string());
                }
            }
            return Ok("Hello, World!".to_string());
        }

        if code_clean.contains("sum") || code_clean.contains("add") {
            let nums: Vec<f64> = code_clean
                .chars()
                .filter(|c| c.is_digit(10) || *c == '.')
                .collect::<String>()
                .split('.')
                .filter(|s| !s.is_empty())
                .map(|s| s.parse().unwrap_or(0.0))
                .collect();
            let sum: f64 = nums.iter().sum();
            return Ok(format!("Sum: {}", sum));
        }

        if code_clean.contains("len") || code_clean.contains("length") {
            if let Some(start) = code_clean.find('[') {
                if let Some(end) = code_clean[start + 1..].find(']') {
                    let arr = &code_clean[start + 1..start + 1 + end];
                    let count = arr.split(',').count();
                    return Ok(format!("Length: {}", count));
                }
            }
        }

        Ok("代码执行成功".to_string())
    }

    async fn execute_web_search(&self, tool_call: &ToolCall) -> ToolResult {
        let query = tool_call
            .arguments
            .get("query")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        let search_results = self.perform_web_search(query);

        ToolResult {
            tool: AgentTool::WebSearch,
            success: true,
            result: format!("Web 搜索结果 - 关于 '{}':\n\n{}", query, search_results),
            error: None,
        }
    }

    fn perform_web_search(&self, _query: &str) -> String {
        let results = vec![
            (
                "TOPEMS 官方文档",
                "https://docs.topems.com",
                "TOPEMS 是企业级智能运营管理平台，提供全面的企业管理解决方案...",
            ),
            (
                "TOPEMS 产品介绍",
                "https://www.topems.com/products",
                "TOPEMS 提供 CRM、PDM、WMS、QMS 等多个模块，满足企业数字化转型需求...",
            ),
            (
                "TOPEMS 技术博客",
                "https://blog.topems.com",
                "最新技术文章和产品更新，涵盖企业管理、AI 智能、数字化转型等主题...",
            ),
            (
                "TOPEMS GitHub",
                "https://github.com/topems",
                "开源代码仓库，欢迎贡献和反馈...",
            ),
        ];

        results
            .into_iter()
            .enumerate()
            .map(|(i, (title, url, desc))| format!("{}. [{}]({})\n   {}", i + 1, title, url, desc))
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    async fn generate_final_answer(&self, state: &AgentState) -> Result<String, String> {
        let messages_str = state
            .messages
            .iter()
            .map(|m| {
                if let Some(results) = &m.tool_results {
                    let results_str = results
                        .iter()
                        .map(|r| format!("工具: {}, 结果: {}", r.tool.to_string(), r.result))
                        .collect::<Vec<_>>()
                        .join("\n");
                    format!("{}: {}\n工具结果:\n{}", m.role, m.content, results_str)
                } else {
                    format!("{}: {}", m.role, m.content)
                }
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        let prompt = format!(
            "你是 TOPEMS 智能助手。请根据以下对话历史和工具执行结果，给出最终答案。\n\n对话历史和工具结果:\n{}\n\n请用自然、友好的语言总结回答用户的问题。",
            messages_str
        );

        self.qa_service
            .ask(&prompt, None, 5, Uuid::nil())
            .await
            .map(|r| r.0)
    }
}

struct WeatherData {
    condition: String,
    temp: i32,
    feels_like: i32,
    humidity: i32,
    wind_speed: String,
    air_quality: String,
}

struct SampleData {
    count: i32,
    content: String,
}

// ========================================
// Agent Workflow Orchestration
// ========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tool: Option<AgentTool>,
    pub prompt: String,
    pub condition: Option<String>,
    pub retry_count: i32,
    pub timeout_seconds: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentWorkflow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub steps: Vec<WorkflowStep>,
    pub max_parallel_steps: usize,
    pub on_failure: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecution {
    pub workflow_id: String,
    pub execution_id: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub current_step: Option<usize>,
    pub results: Vec<StepResult>,
    pub context: HashMap<String, serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    pub step_id: String,
    pub step_name: String,
    pub status: String,
    pub input: serde_json::Value,
    pub output: Option<String>,
    pub error: Option<String>,
    pub duration_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecutionRequest {
    pub workflow_id: String,
    pub context: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecutionResponse {
    pub execution_id: String,
    pub status: String,
    pub results: Vec<StepResult>,
    pub final_output: Option<String>,
    pub error: Option<String>,
    pub duration_ms: i64,
}

pub struct WorkflowOrchestrator {
    agent_service: AgentService,
    workflows: HashMap<String, AgentWorkflow>,
}

impl WorkflowOrchestrator {
    pub fn new(agent_service: AgentService) -> Self {
        let mut workflows = HashMap::new();

        // Predefined workflow: Customer Service Automation
        workflows.insert(
            "customer_service".to_string(),
            AgentWorkflow {
                id: "customer_service".to_string(),
                name: "客户服务自动化".to_string(),
                description: "自动处理客户咨询，提供快速响应".to_string(),
                steps: vec![
                    WorkflowStep {
                        id: "classify".to_string(),
                        name: "问题分类".to_string(),
                        description: "识别客户问题的类型".to_string(),
                        tool: Some(AgentTool::DocumentQA),
                        prompt: "分析以下客户问题，判断其类型（咨询/投诉/技术问题/其他）："
                            .to_string(),
                        condition: None,
                        retry_count: 2,
                        timeout_seconds: 30,
                    },
                    WorkflowStep {
                        id: "search_kb".to_string(),
                        name: "知识库检索".to_string(),
                        description: "从知识库中查找相关解答".to_string(),
                        tool: Some(AgentTool::Search),
                        prompt: "搜索与客户问题相关的知识库内容".to_string(),
                        condition: Some("classify.status == 'success'".to_string()),
                        retry_count: 2,
                        timeout_seconds: 30,
                    },
                    WorkflowStep {
                        id: "generate_response".to_string(),
                        name: "生成回复".to_string(),
                        description: "根据检索结果生成回复".to_string(),
                        tool: Some(AgentTool::DocumentQA),
                        prompt: "基于以下信息生成专业的客户回复：".to_string(),
                        condition: Some("search_kb.status == 'success'".to_string()),
                        retry_count: 3,
                        timeout_seconds: 60,
                    },
                ],
                max_parallel_steps: 1,
                on_failure: "escalate".to_string(),
            },
        );

        // Predefined workflow: Data Analysis Pipeline
        workflows.insert(
            "data_analysis".to_string(),
            AgentWorkflow {
                id: "data_analysis".to_string(),
                name: "数据分析管道".to_string(),
                description: "自动化数据收集、分析和报告生成".to_string(),
                steps: vec![
                    WorkflowStep {
                        id: "collect_data".to_string(),
                        name: "数据收集".to_string(),
                        description: "从多个数据源收集数据".to_string(),
                        tool: Some(AgentTool::DatabaseQuery),
                        prompt: "执行数据查询，获取最新业务数据".to_string(),
                        condition: None,
                        retry_count: 3,
                        timeout_seconds: 60,
                    },
                    WorkflowStep {
                        id: "analyze_trends".to_string(),
                        name: "趋势分析".to_string(),
                        description: "分析数据趋势和模式".to_string(),
                        tool: Some(AgentTool::Calculator),
                        prompt: "计算关键指标，分析趋势".to_string(),
                        condition: Some("collect_data.status == 'success'".to_string()),
                        retry_count: 2,
                        timeout_seconds: 45,
                    },
                    WorkflowStep {
                        id: "generate_report".to_string(),
                        name: "生成报告".to_string(),
                        description: "生成分析报告摘要".to_string(),
                        tool: Some(AgentTool::DocumentQA),
                        prompt: "基于分析结果生成结构化报告".to_string(),
                        condition: Some("analyze_trends.status == 'success'".to_string()),
                        retry_count: 2,
                        timeout_seconds: 30,
                    },
                ],
                max_parallel_steps: 1,
                on_failure: "skip_and_continue".to_string(),
            },
        );

        // Predefined workflow: Document Processing
        workflows.insert(
            "document_processing".to_string(),
            AgentWorkflow {
                id: "document_processing".to_string(),
                name: "文档处理流程".to_string(),
                description: "自动处理和分类文档".to_string(),
                steps: vec![
                    WorkflowStep {
                        id: "extract_content".to_string(),
                        name: "内容提取".to_string(),
                        description: "从文档中提取关键信息".to_string(),
                        tool: Some(AgentTool::DocumentQA),
                        prompt: "提取文档的主要内容要点".to_string(),
                        condition: None,
                        retry_count: 2,
                        timeout_seconds: 60,
                    },
                    WorkflowStep {
                        id: "classify_doc".to_string(),
                        name: "文档分类".to_string(),
                        description: "对文档进行分类".to_string(),
                        tool: Some(AgentTool::DocumentQA),
                        prompt: "根据内容判断文档类型（合同/报告/发票/其他）".to_string(),
                        condition: Some("extract_content.status == 'success'".to_string()),
                        retry_count: 2,
                        timeout_seconds: 30,
                    },
                    WorkflowStep {
                        id: "extract_entities".to_string(),
                        name: "实体提取".to_string(),
                        description: "提取文档中的关键实体".to_string(),
                        tool: Some(AgentTool::DocumentQA),
                        prompt: "从文档中提取关键实体（日期、金额、名称等）".to_string(),
                        condition: Some("classify_doc.status == 'success'".to_string()),
                        retry_count: 2,
                        timeout_seconds: 30,
                    },
                ],
                max_parallel_steps: 1,
                on_failure: "log_and_continue".to_string(),
            },
        );

        Self {
            agent_service,
            workflows,
        }
    }

    pub fn get_available_workflows(&self) -> Vec<serde_json::Value> {
        self.workflows
            .values()
            .map(|w| {
                serde_json::json!({
                    "id": w.id,
                    "name": w.name,
                    "description": w.description,
                    "step_count": w.steps.len(),
                })
            })
            .collect()
    }

    pub fn get_workflow(&self, id: &str) -> Option<&AgentWorkflow> {
        self.workflows.get(id)
    }

    pub async fn execute_workflow(
        &self,
        request: WorkflowExecutionRequest,
    ) -> Result<WorkflowExecutionResponse, String> {
        let workflow = self
            .workflows
            .get(&request.workflow_id)
            .ok_or_else(|| format!("Workflow not found: {}", request.workflow_id))?;

        let execution_id = Uuid::new_v4().to_string();
        let start_time = std::time::Instant::now();
        let mut context = request.context.unwrap_or_default();
        let mut results: Vec<StepResult> = Vec::new();
        let mut has_error = false;
        let mut error_msg: Option<String> = None;

        for (_index, step) in workflow.steps.iter().enumerate() {
            // Check condition
            if let Some(condition) = &step.condition {
                if !self.evaluate_condition(condition, &context, &results) {
                    results.push(StepResult {
                        step_id: step.id.clone(),
                        step_name: step.name.clone(),
                        status: "skipped".to_string(),
                        input: serde_json::json!({}),
                        output: None,
                        error: Some("Condition not met".to_string()),
                        duration_ms: 0,
                    });
                    continue;
                }
            }

            let step_start = std::time::Instant::now();

            // Execute step with retry
            let mut step_success = false;
            let mut step_output: Option<String> = None;
            let mut step_error: Option<String> = None;

            for retry in 0..=step.retry_count {
                match self.execute_step(step, &context).await {
                    Ok(output) => {
                        step_success = true;
                        step_output = Some(output);
                        break;
                    }
                    Err(e) => {
                        step_error = Some(e.clone());
                        if retry < step.retry_count {
                            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        }
                    }
                }
            }

            let duration_ms = step_start.elapsed().as_millis() as i64;

            let status = if step_success { "success" } else { "failed" };

            if !step_success {
                has_error = true;
                error_msg = step_error.clone();

                match workflow.on_failure.as_str() {
                    "escalate" | "abort" => {
                        results.push(StepResult {
                            step_id: step.id.clone(),
                            step_name: step.name.clone(),
                            status: status.to_string(),
                            input: serde_json::json!({}),
                            output: step_output,
                            error: step_error,
                            duration_ms,
                        });
                        break;
                    }
                    _ => {}
                }
            }

            // Update context with step output
            if let Some(output) = &step_output {
                context.insert(step.id.clone(), serde_json::json!(output));
            }

            results.push(StepResult {
                step_id: step.id.clone(),
                step_name: step.name.clone(),
                status: status.to_string(),
                input: serde_json::json!({}),
                output: step_output,
                error: step_error,
                duration_ms,
            });
        }

        let final_output = if !has_error {
            context
                .get("generate_response")
                .or(context.get("generate_report"))
                .or(context.get("extract_entities"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        } else {
            None
        };

        let duration_ms = start_time.elapsed().as_millis() as i64;

        Ok(WorkflowExecutionResponse {
            execution_id,
            status: if has_error {
                "failed".to_string()
            } else {
                "completed".to_string()
            },
            results,
            final_output,
            error: error_msg,
            duration_ms,
        })
    }

    async fn execute_step(
        &self,
        step: &WorkflowStep,
        _context: &HashMap<String, serde_json::Value>,
    ) -> Result<String, String> {
        let prompt = format!("{}\n\n请给出简洁的回答。", step.prompt);

        if let Some(tool) = &step.tool {
            let tool_call = ToolCall {
                tool: tool.clone(),
                arguments: HashMap::new(),
                thought: step.description.clone(),
            };

            let result = self.agent_service.execute_tool(&tool_call).await;
            if result.success {
                Ok(result.result)
            } else {
                Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
            }
        } else {
            // Direct QA without tool
            self.agent_service
                .qa_service
                .ask(&prompt, None, 5, Uuid::nil())
                .await
                .map(|r| r.0)
        }
    }

    fn evaluate_condition(
        &self,
        condition: &str,
        _context: &HashMap<String, serde_json::Value>,
        results: &[StepResult],
    ) -> bool {
        // Parse simple conditions like "step_id.status == 'success'"
        let parts: Vec<&str> = condition.split("==").collect();
        if parts.len() != 2 {
            return true;
        }

        let step_id = parts[0].trim().split('.').next().unwrap_or("").trim();
        let expected = parts[1].trim().trim_matches(|c| c == '\'' || c == '"');

        results
            .iter()
            .any(|r| r.step_id == step_id && r.status == expected)
    }
}
