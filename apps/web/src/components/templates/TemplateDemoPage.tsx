import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Download,
  Play,
  RefreshCw,
  FileText,
  Settings,
  Sparkles,
  Search,
} from "lucide-react";
import type {
  Template,
  TemplateCategory,
  TemplateVariable,
} from "../../api/template";

// Mock数据 - 模拟从API获取的模板列表
const mockTemplates: Template[] = [
  {
    id: "1",
    name: "采购审批流程",
    code: "purchase-approval",
    template_type: "workflow",
    category_id: "cat1",
    module: "procurement",
    description: "用于公司采购申请的标准化审批流程模板",
    content: `【{{workflow_name}}】

## 流程概述
{{description}}

## 审批步骤

### 步骤1: 部门初审
- 负责人：{{step1_assignee}}
- 任务：{{step1_task}}
- 期限：{{step1_deadline}}天

### 步骤2: 财务复核
- 负责人：{{step2_assignee}}
- 任务：{{step2_task}}
- 期限：{{step2_deadline}}天

### 步骤3: 最终审批
- 负责人：{{step3_assignee}}
- 任务：{{step3_task}}
- 期限：{{step3_deadline}}天

---
创建人：{{creator}}
创建时间：{{today}}`,
    variables: [
      {
        key: "workflow_name",
        label: "工作流名称",
        type: "string",
        required: true,
      },
      {
        key: "description",
        label: "流程描述",
        type: "string",
        required: false,
      },
      {
        key: "step1_assignee",
        label: "步骤1负责人",
        type: "user",
        required: true,
      },
      { key: "step1_task", label: "步骤1任务", type: "string", required: true },
      {
        key: "step1_deadline",
        label: "步骤1期限(天)",
        type: "number",
        required: true,
      },
      {
        key: "step2_assignee",
        label: "步骤2负责人",
        type: "user",
        required: true,
      },
      { key: "step2_task", label: "步骤2任务", type: "string", required: true },
      {
        key: "step2_deadline",
        label: "步骤2期限(天)",
        type: "number",
        required: true,
      },
      {
        key: "step3_assignee",
        label: "步骤3负责人",
        type: "user",
        required: true,
      },
      { key: "step3_task", label: "步骤3任务", type: "string", required: true },
      {
        key: "step3_deadline",
        label: "步骤3期限(天)",
        type: "number",
        required: true,
      },
      { key: "creator", label: "创建人", type: "user", required: true },
    ],
    is_active: true,
    is_system: false,
    is_public: true,
    ai_enabled: true,
    version: 1,
    view_count: 120,
    use_count: 45,
    created_at: "2026-06-01T10:00:00Z",
    updated_at: "2026-06-10T15:30:00Z",
    created_by: "admin",
  },
  {
    id: "2",
    name: "请假申请流程",
    code: "leave-application",
    template_type: "workflow",
    category_id: "cat2",
    module: "hr",
    description: "员工请假申请的审批流程模板",
    content: `请假申请单

申请人：{{applicant_name}}
部门：{{department}}
职位：{{position}}

请假类型：{{leave_type}}
开始日期：{{start_date}}
结束日期：{{end_date}}
共计：{{days}}天

{{#if is_urgent}}⚠️ 紧急申请，请优先处理{{/if}}

请假原因：
{{reason}}

{{#if has_attachment}}📎 附件已上传{{/if}}

审批流程：
1. 直属上级审批：{{manager_name}}
2. HR审核：{{hr_assignee}}

申请时间：{{apply_time}}`,
    variables: [
      { key: "applicant_name", label: "申请人", type: "user", required: true },
      { key: "department", label: "部门", type: "string", required: true },
      { key: "position", label: "职位", type: "string", required: true },
      {
        key: "leave_type",
        label: "请假类型",
        type: "select",
        required: true,
        options: [
          { value: "年假", label: "年假" },
          { value: "事假", label: "事假" },
          { value: "病假", label: "病假" },
          { value: "婚假", label: "婚假" },
          { value: "产假", label: "产假" },
        ],
      },
      { key: "start_date", label: "开始日期", type: "date", required: true },
      { key: "end_date", label: "结束日期", type: "date", required: true },
      { key: "days", label: "天数", type: "number", required: true },
      {
        key: "is_urgent",
        label: "紧急申请",
        type: "string",
        required: false,
        options: [
          { value: "true", label: "是" },
          { value: "false", label: "否" },
        ],
      },
      { key: "reason", label: "请假原因", type: "string", required: false },
      {
        key: "has_attachment",
        label: "有附件",
        type: "string",
        required: false,
        options: [
          { value: "true", label: "是" },
          { value: "false", label: "否" },
        ],
      },
      { key: "manager_name", label: "直属上级", type: "user", required: true },
      { key: "hr_assignee", label: "HR审核人", type: "user", required: true },
      { key: "apply_time", label: "申请时间", type: "date", required: true },
    ],
    is_active: true,
    is_system: false,
    is_public: true,
    ai_enabled: true,
    version: 2,
    view_count: 200,
    use_count: 89,
    created_at: "2026-05-15T09:00:00Z",
    updated_at: "2026-06-12T11:00:00Z",
    created_by: "hr-admin",
  },
  {
    id: "3",
    name: "报销申请流程",
    code: "expense-reimbursement",
    template_type: "workflow",
    category_id: "cat3",
    module: "finance",
    description: "员工费用报销申请流程模板",
    content: `报销申请

申请人：{{applicant_name}}
部门：{{department}}

报销类型：{{expense_type}}
报销金额：¥{{amount}}

明细：
{{details}}

{{#if is_over_budget}}⚠️ 超出预算，请说明原因{{/if}}

{{#if is_over_budget}}原因说明：{{over_budget_reason}}{{/if}}

审批人：{{approver_name}}
提交时间：{{submit_time}}`,
    variables: [
      { key: "applicant_name", label: "申请人", type: "user", required: true },
      { key: "department", label: "部门", type: "string", required: true },
      {
        key: "expense_type",
        label: "报销类型",
        type: "select",
        required: true,
        options: [
          { value: "差旅费", label: "差旅费" },
          { value: "办公费", label: "办公费" },
          { value: "招待费", label: "招待费" },
          { value: "交通费", label: "交通费" },
          { value: "其他", label: "其他" },
        ],
      },
      { key: "amount", label: "金额", type: "number", required: true },
      { key: "details", label: "明细说明", type: "string", required: true },
      {
        key: "is_over_budget",
        label: "超出预算",
        type: "string",
        required: false,
        options: [
          { value: "true", label: "是" },
          { value: "false", label: "否" },
        ],
      },
      {
        key: "over_budget_reason",
        label: "超预算原因",
        type: "string",
        required: false,
      },
      { key: "approver_name", label: "审批人", type: "user", required: true },
      { key: "submit_time", label: "提交时间", type: "date", required: true },
    ],
    is_active: true,
    is_system: false,
    is_public: true,
    ai_enabled: false,
    version: 1,
    view_count: 156,
    use_count: 67,
    created_at: "2026-05-20T14:00:00Z",
    updated_at: "2026-06-05T16:00:00Z",
    created_by: "finance-admin",
  },
];

const mockCategories: TemplateCategory[] = [
  {
    id: "cat1",
    name: "采购管理",
    code: "procurement",
    category_type: "workflow",
    template_count: 1,
    is_active: true,
  },
  {
    id: "cat2",
    name: "人事管理",
    code: "hr",
    category_type: "workflow",
    template_count: 1,
    is_active: true,
  },
  {
    id: "cat3",
    name: "财务管理",
    code: "finance",
    category_type: "workflow",
    template_count: 1,
    is_active: true,
  },
];

interface TemplateDemoPageProps {
  onClose?: () => void;
}

const TemplateDemoPage: React.FC<TemplateDemoPageProps> = ({ onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [templateVariables, setTemplateVariables] = useState<
    Record<string, any>
  >({});
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("select");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // 模拟加载模板列表
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setTemplates(mockTemplates);
    setIsLoading(false);
  };

  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchTerm === "" ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === "" || template.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 处理模板选择
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setActiveTab("config");
    const initialVariables: Record<string, any> = {};
    template.variables?.forEach((varDef: TemplateVariable) => {
      if (varDef.default_value) {
        initialVariables[varDef.key] = varDef.default_value;
      } else if (varDef.type === "number") {
        initialVariables[varDef.key] = 0;
      } else {
        initialVariables[varDef.key] = "";
      }
    });
    setTemplateVariables(initialVariables);
  };

  // 处理变量值变化
  const handleVariableChange = (key: string, value: any) => {
    setTemplateVariables((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

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
    console.log(
      "变量定义:",
      JSON.stringify(selectedTemplate.variables, null, 2),
    );

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

    // 步骤2: 处理条件判断
    console.log(`\n--- 步骤${stepNumber}: 处理条件判断 ---`);
    const conditionPattern = /\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    let conditionMatches = result.match(conditionPattern);
    console.log(
      "找到的条件块数量:",
      conditionMatches ? conditionMatches.length : 0,
    );

    result = result.replace(
      conditionPattern,
      (_: string, condition: string, content: string) => {
        const value = templateVariables[condition];
        const conditionResult = value ? content.trim() : "";
        console.log(`条件块 {{#if ${condition}}}:`);
        console.log(`  - 条件变量: ${condition}`);
        console.log(`  - 变量值: "${value}" (类型: ${typeof value})`);
        console.log(`  - 布尔转换: ${Boolean(value)}`);
        console.log(`  - 内容长度: ${content.length}`);
        console.log(
          `  - 处理结果: "${conditionResult}" (保留: ${Boolean(value)})`,
        );
        return conditionResult;
      },
    );
    stepNumber++;

    // 步骤3: 处理默认值
    console.log(`\n--- 步骤${stepNumber}: 处理默认值 ---`);
    const defaultPattern = /\{\{(\w+)\s*\|\|\s*["']([^"']+)["']\}\}/g;
    let defaultMatches = result.match(defaultPattern);
    console.log(
      "找到的默认值块数量:",
      defaultMatches ? defaultMatches.length : 0,
    );

    result = result.replace(
      defaultPattern,
      (_: string, key: string, defaultValue: string) => {
        const value = templateVariables[key];
        const finalValue = value && value !== "" ? String(value) : defaultValue;
        console.log(
          `默认值块 {${"${" + "{"}${key} || "${defaultValue}"${"}" + "}"}:`,
        );
        console.log(`  - 变量: ${key}`);
        console.log(`  - 变量值: "${value}"`);
        console.log(`  - 默认值: "${defaultValue}"`);
        console.log(`  - 最终值: "${finalValue}"`);
        console.log(`  - 使用默认值: ${!value || value === ""}`);
        return finalValue;
      },
    );
    stepNumber++;

    // 步骤4: 替换动态变量
    console.log(`\n--- 步骤${stepNumber}: 替换动态变量 ---`);
    const now = new Date();
    const todayValue = now.toISOString().split("T")[0];
    const nowValue = now.toISOString();

    console.log("动态变量:");
    console.log(`  - {{today}}: "${todayValue}"`);
    console.log(`  - {{now}}: "${nowValue}"`);

    const todayPattern = /\{\{today\}\}/g;
    const todayMatches = result.match(todayPattern);
    console.log(
      `  - {{today}} 匹配次数: ${todayMatches ? todayMatches.length : 0}`,
    );
    result = result.replace(todayPattern, todayValue);

    const nowPattern = /\{\{now\}\}/g;
    const nowMatches = result.match(nowPattern);
    console.log(`  - {{now}} 匹配次数: ${nowMatches ? nowMatches.length : 0}`);
    result = result.replace(nowPattern, nowValue);
    stepNumber++;

    // 步骤5: 检查未处理的变量
    console.log(`\n--- 步骤${stepNumber}: 检查未处理的变量 ---`);
    const remainingVarsPattern = /\{\{([^#/][^}]+)\}\}/g;
    const remainingVars = result.match(remainingVarsPattern);
    if (remainingVars && remainingVars.length > 0) {
      console.warn("⚠️ 发现未处理的变量:");
      remainingVars.forEach((varMatch) => {
        console.warn(`  - ${varMatch}`);
      });
      console.warn("建议检查:");
      console.warn("  1. 变量名是否正确");
      console.warn("  2. 变量是否已配置值");
      console.warn("  3. 变量格式是否正确");
    } else {
      console.log("✅ 所有变量已成功处理");
    }
    stepNumber++;

    // 最终结果
    console.log("\n=== 渲染完成 ===");
    console.log("最终内容长度:", result.length);
    console.log("最终内容:\n", result);
    console.log("渲染耗时:", "300ms (模拟延迟)");

    setRenderedContent(result);
    setIsLoading(false);
    setActiveTab("preview");
  };

  // 应用模板
  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    alert(
      `已将模板 "${selectedTemplate.name}" 应用到工作流！\n\n变量配置：\n${JSON.stringify(templateVariables, null, 2)}`,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                工作流模板演示
              </h1>
              <p className="text-sm text-slate-500">
                动态加载、配置和渲染工作流模板
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 功能介绍卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              模板功能演示
            </CardTitle>
            <CardDescription>
              本演示展示了如何在前端应用中动态加载模板列表、选择模板、配置变量并渲染最终内容
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-800">选择模板</h4>
                <p className="text-sm text-slate-500">
                  从模板库中选择合适的工作流模板
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-800">配置变量</h4>
                <p className="text-sm text-slate-500">
                  根据业务需求填写模板变量值
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-800">渲染应用</h4>
                <p className="text-sm text-slate-500">
                  预览并应用模板到实际工作流
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 主内容区域 */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="select">
              <FileText className="w-4 h-4 mr-2" />
              选择模板
            </TabsTrigger>
            <TabsTrigger value="config" disabled={!selectedTemplate}>
              <Settings className="w-4 h-4 mr-2" />
              配置变量
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!selectedTemplate}>
              <Play className="w-4 h-4 mr-2" />
              预览渲染
            </TabsTrigger>
          </TabsList>

          {/* 选择模板 */}
          <TabsContent value="select" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-800">可用模板</h3>
                <p className="text-sm text-slate-500">
                  共 {templates.length} 个模板
                </p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="搜索模板..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部分类</option>
                  {mockCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="ml-2 text-slate-500">加载中...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedTemplate?.id === template.id
                        ? "ring-2 ring-blue-500 shadow-md"
                        : ""
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        </div>
                        {template.ai_enabled && (
                          <Sparkles className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                          {template.template_type}
                        </span>
                        <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs">
                          {template.use_count} 次使用
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>版本 {template.version}</span>
                        <span>查看 {template.view_count}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 配置变量 */}
          <TabsContent value="config" className="space-y-4">
            {selectedTemplate && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription>
                      {selectedTemplate.description}
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      变量配置
                    </CardTitle>
                    <CardDescription>请填写以下变量值</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTemplate.variables?.map(
                      (varDef: TemplateVariable) => (
                        <div key={varDef.key} className="space-y-2">
                          <Label className="flex items-center gap-2">
                            {varDef.label}
                            {varDef.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </Label>
                          {varDef.type === "select" ? (
                            <select
                              value={templateVariables[varDef.key] || ""}
                              onChange={(e) =>
                                handleVariableChange(varDef.key, e.target.value)
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">请选择</option>
                              {varDef.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : varDef.type === "number" ? (
                            <Input
                              type="number"
                              value={templateVariables[varDef.key] || ""}
                              onChange={(e) =>
                                handleVariableChange(
                                  varDef.key,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              placeholder={`请输入${varDef.label}`}
                            />
                          ) : varDef.type === "date" ? (
                            <Input
                              type="date"
                              value={templateVariables[varDef.key] || ""}
                              onChange={(e) =>
                                handleVariableChange(varDef.key, e.target.value)
                              }
                            />
                          ) : (
                            <Input
                              value={templateVariables[varDef.key] || ""}
                              onChange={(e) =>
                                handleVariableChange(varDef.key, e.target.value)
                              }
                              placeholder={`请输入${varDef.label}`}
                            />
                          )}
                        </div>
                      ),
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setActiveTab("select")}
                    variant="outline"
                  >
                    返回选择
                  </Button>
                  <Button
                    onClick={handleRender}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        渲染中...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        渲染模板
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* 预览渲染 */}
          <TabsContent value="preview" className="space-y-4">
            {selectedTemplate && (
              <>
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      渲染结果预览
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        导出
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-slate-50 p-4 rounded-lg min-h-[300px]">
                      {renderedContent || "点击上方「渲染模板」按钮查看结果"}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>变量配置摘要</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(templateVariables).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded"
                        >
                          <span className="text-sm text-slate-500">{key}</span>
                          <span className="text-sm font-medium text-slate-800">
                            {typeof value === "boolean"
                              ? value
                                ? "是"
                                : "否"
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setActiveTab("config")}
                    variant="outline"
                  >
                    返回配置
                  </Button>
                  <Button
                    onClick={handleApplyTemplate}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    应用到工作流
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TemplateDemoPage;
