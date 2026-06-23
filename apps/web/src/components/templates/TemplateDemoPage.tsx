import { Card, CardContent, CardHeader, Tabs, Tab, Box, TextField, FormControl, FormLabel, Typography, Chip,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";

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
import { logger } from "@/utils/logger";

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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState(0);
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
    setActiveTab(1);
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
    logger.info("=== 开始模板渲染 ===");
    logger.info("模板名称:", selectedTemplate.name);
    logger.info("模板ID:", selectedTemplate.id);
    logger.info("原始内容长度:", selectedTemplate.content.length);
    logger.debug("原始内容:\n", selectedTemplate.content);
    logger.debug("变量配置:", JSON.stringify(templateVariables, null, 2));
    logger.debug(
      "变量定义:",
      JSON.stringify(selectedTemplate.variables, null, 2),
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    let result = selectedTemplate.content;
    let stepNumber = 1;

    // 步骤1: 替换变量
    logger.info(`\n--- 步骤${stepNumber}: 替换变量 ---`);
    Object.entries(templateVariables).forEach(([key, value]) => {
      const pattern = new RegExp(`{{${key}}}`, "g");
      const matches = result.match(pattern);
      const matchCount = matches ? matches.length : 0;
      const beforeReplace = result;
      result = result.replace(pattern, String(value));
      const replacedCount = beforeReplace.split(pattern).length - 1;

      logger.info(`变量 [${key}]:`);
      logger.info(`  - 值: "${value}" (类型: ${typeof value})`);
      logger.info(`  - 匹配次数: ${matchCount}`);
      logger.info(`  - 替换次数: ${replacedCount}`);
      logger.debug(`  - 正则模式: ${pattern}`);

      if (matchCount === 0) {
        logger.warn(`  ⚠️ 警告: 模板中未找到变量 {{${key}}}`);
      }

      // 检查是否还有未替换的变量
      const remainingPattern = new RegExp(`{{${key}}}`, "g");
      if (remainingPattern.test(result)) {
        logger.error(`  ❌ 错误: 变量 {{${key}}} 替换后仍存在`);
      }
    });
    stepNumber++;

    // 步骤2: 处理条件判断
    logger.info(`\n--- 步骤${stepNumber}: 处理条件判断 ---`);
    const conditionPattern = /\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    let conditionMatches = result.match(conditionPattern);
    logger.info(
      "找到的条件块数量:",
      conditionMatches ? conditionMatches.length : 0,
    );

    result = result.replace(
      conditionPattern,
      (_: string, condition: string, content: string) => {
        const value = templateVariables[condition];
        const conditionResult = value ? content.trim() : "";
        logger.info(`条件块 {{#if ${condition}}}:`);
        logger.info(`  - 条件变量: ${condition}`);
        logger.info(`  - 变量值: "${value}" (类型: ${typeof value})`);
        logger.debug(`  - 布尔转换: ${Boolean(value)}`);
        logger.debug(`  - 内容长度: ${content.length}`);
        logger.debug(
          `  - 处理结果: "${conditionResult}" (保留: ${Boolean(value)})`,
        );
        return conditionResult;
      },
    );
    stepNumber++;

    // 步骤3: 处理默认值
    logger.info(`\n--- 步骤${stepNumber}: 处理默认值 ---`);
    const defaultPattern = /\{\{(\w+)\s*\|\|\s*["']([^"']+)["']\}\}/g;
    let defaultMatches = result.match(defaultPattern);
    logger.info(
      "找到的默认值块数量:",
      defaultMatches ? defaultMatches.length : 0,
    );

    result = result.replace(
      defaultPattern,
      (_: string, key: string, defaultValue: string) => {
        const value = templateVariables[key];
        const finalValue = value && value !== "" ? String(value) : defaultValue;
        logger.info(
          `默认值块 {${"${" + "{"}${key} || "${defaultValue}"${"}" + "}"}:`,
        );
        logger.info(`  - 变量: ${key}`);
        logger.info(`  - 变量值: "${value}"`);
        logger.info(`  - 默认值: "${defaultValue}"`);
        logger.info(`  - 最终值: "${finalValue}"`);
        logger.debug(`  - 使用默认值: ${!value || value === ""}`);
        return finalValue;
      },
    );
    stepNumber++;

    // 步骤4: 替换动态变量
    logger.info(`\n--- 步骤${stepNumber}: 替换动态变量 ---`);
    const now = new Date();
    const todayValue = now.toISOString().split("T")[0];
    const nowValue = now.toISOString();

    logger.info("动态变量:");
    logger.info(`  - {{today}}: "${todayValue}"`);
    logger.info(`  - {{now}}: "${nowValue}"`);

    const todayPattern = /\{\{today\}\}/g;
    const todayMatches = result.match(todayPattern);
    logger.info(
      `  - {{today}} 匹配次数: ${todayMatches ? todayMatches.length : 0}`,
    );
    result = result.replace(todayPattern, todayValue);

    const nowPattern = /\{\{now\}\}/g;
    const nowMatches = result.match(nowPattern);
    logger.info(`  - {{now}} 匹配次数: ${nowMatches ? nowMatches.length : 0}`);
    result = result.replace(nowPattern, nowValue);
    stepNumber++;

    // 步骤5: 检查未处理的变量
    logger.info(`\n--- 步骤${stepNumber}: 检查未处理的变量 ---`);
    const remainingVarsPattern = /\{\{([^#/][^}]+)\}\}/g;
    const remainingVars = result.match(remainingVarsPattern);
    if (remainingVars && remainingVars.length > 0) {
      logger.warn("⚠️ 发现未处理的变量:");
      remainingVars.forEach((varMatch) => {
        logger.warn(`  - ${varMatch}`);
      });
      logger.warn("建议检查:");
      logger.warn("  1. 变量名是否正确");
      logger.warn("  2. 变量是否已配置值");
      logger.warn("  3. 变量格式是否正确");
    } else {
      logger.info("✅ 所有变量已成功处理");
    }
    stepNumber++;

    // 最终结果
    logger.info("\n=== 渲染完成 ===");
    logger.info("最终内容长度:", result.length);
    logger.debug("最终内容:\n", result);
    logger.info("渲染耗时:", "300ms (模拟延迟)");

    setRenderedContent(result);
    setIsLoading(false);
    setActiveTab(2);
  };

  // 应用模板
  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    alert(
      `已将模板 "${selectedTemplate.name}" 应用到工作流！\n\n变量配置：\n${JSON.stringify(templateVariables, null, 2)}`,
    );
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* 顶部导航 */}
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            maxWidth: 1400,
            mx: "auto",
            px: 2,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: "secondary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: "white" }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "grey.800" }}
              >
                工作流模板演示
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.500" }}>
                动态加载、配置和渲染工作流模板
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box component="main" sx={{ maxWidth: 1400, mx: "auto", px: 2, py: 3 }}>
        {/* 功能介绍卡片 */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Sparkles sx={{ color: "warning.main", fontSize: 20 }} />
                <Typography variant="h6">模板功能演示</Typography>
              </Box>
            }
            subheader="本演示展示了如何在前端应用中动态加载模板列表、选择模板、配置变量并渲染最终内容"
          />
          <CardContent
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 2,
                bgcolor: "info.light",
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "info.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{ color: "white", fontWeight: 700, fontSize: 14 }}
                >
                  1
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 500, color: "grey.800" }}
                >
                  选择模板
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  从模板库中选择合适的工作流模板
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 2,
                bgcolor: "secondary.light",
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "secondary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{ color: "white", fontWeight: 700, fontSize: 14 }}
                >
                  2
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 500, color: "grey.800" }}
                >
                  配置变量
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  根据业务需求填写模板变量值
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 2,
                bgcolor: "success.light",
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{ color: "white", fontWeight: 700, fontSize: 14 }}
                >
                  3
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 500, color: "grey.800" }}
                >
                  渲染应用
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  预览并应用模板到实际工作流
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 主内容区域 */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
          >
            <Tab
              icon={<FileText sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="选择模板"
            />
            <Tab
              icon={<Settings sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="配置变量"
              disabled={!selectedTemplate}
            />
            <Tab
              icon={<Play sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="预览渲染"
              disabled={!selectedTemplate}
            />
          </Tabs>
        </Box>

        {/* 选择模板 */}
        <TabPanel value={activeTab} index={0}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: "grey.800" }}
              >
                可用模板
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                共 {templates.length} 个模板
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              <Box sx={{ position: "relative", flex: { xs: 1, sm: "none" } }}>
                <Search
                  sx={{
                    position: "absolute",
                    left: 2,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 18,
                    color: "grey.400",
                  }}
                />
                <TextField
                  size="small"
                  placeholder="搜索模板..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ pl: 5, width: { xs: "100%", sm: 200 } }}
                />
              </Box>
              <TextField
                select
                size="small"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ minWidth: 120 }}
                slotProps={{ select: { native: true } }}
              >
                <option value="">全部分类</option>
                {mockCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </TextField>
            </Box>
          </Box>

          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 6,
              }}
            >
              <RefreshCw
                sx={{
                  fontSize: 24,
                  color: "primary.main",
                  animation: "spin 1s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
              <Typography sx={{ ml: 1, color: "grey.500" }}>
                加载中...
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      boxShadow: 4,
                    },
                    ...(selectedTemplate?.id === template.id && {
                      outline: 2,
                      outlineColor: "primary.main",
                      boxShadow: 3,
                    }),
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader
                    subheader={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600 }}
                          >
                            {template.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "grey.500" }}
                          >
                            {template.description}
                          </Typography>
                        </Box>
                        {template.ai_enabled && (
                          <Sparkles
                            sx={{ fontSize: 16, color: "warning.main" }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Chip
                        label={template.template_type}
                        size="small"
                        sx={{
                          bgcolor: "info.light",
                          color: "info.main",
                          fontSize: 12,
                        }}
                      />
                      <Chip
                        label={`${template.use_count} 次使用`}
                        size="small"
                        sx={{
                          bgcolor: "success.light",
                          color: "success.main",
                          fontSize: 12,
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "grey.400",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "grey.400" }}>
                        版本 {template.version}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "grey.400" }}>
                        查看 {template.view_count}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* 配置变量 */}
        <TabPanel value={activeTab} index={1}>
          {selectedTemplate && (
            <>
              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={selectedTemplate.name}
                  subheader={selectedTemplate.description}
                />
              </Card>

              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Settings sx={{ fontSize: 18 }} />
                      <Typography variant="h6">变量配置</Typography>
                    </Box>
                  }
                  subheader="请填写以下变量值"
                />
                <CardContent
                  sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {selectedTemplate.variables?.map(
                    (varDef: TemplateVariable) => (
                      <FormControl key={varDef.key} fullWidth>
                        <FormLabel
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mb: 1,
                          }}
                        >
                          {varDef.label}
                          {varDef.required && (
                            <Typography sx={{ color: "error.main" }}>
                              *
                            </Typography>
                          )}
                        </FormLabel>
                        {varDef.type === "select" ? (
                          <TextField
                            select
                            size="small"
                            value={templateVariables[varDef.key] || ""}
                            onChange={(e) =>
                              handleVariableChange(varDef.key, e.target.value)
                            }
                            slotProps={{ select: { native: true } }}
                          >
                            <option value="">请选择</option>
                            {varDef.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </TextField>
                        ) : varDef.type === "number" ? (
                          <TextField
                            type="number"
                            size="small"
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
                          <TextField
                            type="date"
                            size="small"
                            value={templateVariables[varDef.key] || ""}
                            onChange={(e) =>
                              handleVariableChange(varDef.key, e.target.value)
                            }
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                        ) : (
                          <TextField
                            size="small"
                            value={templateVariables[varDef.key] || ""}
                            onChange={(e) =>
                              handleVariableChange(varDef.key, e.target.value)
                            }
                            placeholder={`请输入${varDef.label}`}
                          />
                        )}
                      </FormControl>
                    ),
                  )}
                </CardContent>
              </Card>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button onClick={() => setActiveTab(0)} variant="outlined">
                  返回选择
                </Button>
                <Button
                  onClick={handleRender}
                  variant="contained"
                  color="primary"
                  sx={{ flex: 1 }}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? (
                      <RefreshCw
                        sx={{
                          fontSize: 18,
                          animation: "spin 1s linear infinite",
                          "@keyframes spin": {
                            "0%": { transform: "rotate(0deg)" },
                            "100%": { transform: "rotate(360deg)" },
                          },
                        }}
                      />
                    ) : (
                      <Play sx={{ fontSize: 18 }} />
                    )
                  }
                >
                  {isLoading ? "渲染中..." : "渲染模板"}
                </Button>
              </Box>
            </>
          )}
        </TabPanel>

        {/* 预览渲染 */}
        <TabPanel value={activeTab} index={2}>
          {selectedTemplate && (
            <>
              <Card sx={{ mb: 2 }}>
                <CardHeader
                  title={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Play sx={{ fontSize: 18 }} />
                        <Typography variant="h6">渲染结果预览</Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Download sx={{ fontSize: 16 }} />}
                        >
                          导出
                        </Button>
                      </Box>
                    </Box>
                  }
                />
                <CardContent>
                  <Box
                    component="pre"
                    sx={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "inherit",
                      color: "grey.700",
                      bgcolor: "grey.50",
                      p: 2,
                      borderRadius: 1,
                      minHeight: 300,
                    }}
                  >
                    {renderedContent || "点击上方「渲染模板」按钮查看结果"}
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ mb: 2 }}>
                <CardHeader title="变量配置摘要" />
                <CardContent>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, 1fr)",
                        lg: "repeat(3, 1fr)",
                      },
                      gap: 1,
                    }}
                  >
                    {Object.entries(templateVariables).map(([key, value]) => (
                      <Box
                        key={key}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1,
                          bgcolor: "grey.50",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: "grey.500" }}>
                          {key}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: "grey.800" }}
                        >
                          {typeof value === "boolean"
                            ? value
                              ? "是"
                              : "否"
                            : String(value)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button onClick={() => setActiveTab(1)} variant="outlined">
                  返回配置
                </Button>
                <Button
                  onClick={handleApplyTemplate}
                  variant="contained"
                  color="success"
                  sx={{ flex: 1 }}
                  startIcon={<Play sx={{ fontSize: 18 }} />}
                >
                  应用到工作流
                </Button>
              </Box>
            </>
          )}
        </TabPanel>
      </Box>
    </Box>
  );
};

export default TemplateDemoPage;
