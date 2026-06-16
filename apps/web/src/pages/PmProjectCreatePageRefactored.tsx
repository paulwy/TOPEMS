/**
 * PmProjectCreatePage 重构
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 MUI 组件替代 Tailwind CSS
 * 3. 保持 AI 组件集成
 * 4. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import { Save } from "lucide-react";
import { pmApi } from "../api/pm";
import {
  AIHelperButton,
  AICodeGenerator,
  AITextOptimizer,
  AIFormValidator,
  AIDataCompleter,
} from "../components/ai";
import type { CompletionItem } from "../types/ai";
import { PageHeader } from "../components/layout";

type ProjectType =
  | "RESEARCH"
  | "PRODUCTION"
  | "CONSTRUCTION"
  | "DESIGN"
  | "SERVICE";

const PROJECT_TYPES: {
  value: ProjectType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "RESEARCH",
    label: "科研项目",
    description: "实验驱动、创新研究、专利申请",
    icon: "🔬",
  },
  {
    value: "PRODUCTION",
    label: "生产项目",
    description: "标准化生产、质量控制、量产",
    icon: "🏭",
  },
  {
    value: "CONSTRUCTION",
    label: "施工项目",
    description: "资源密集、周期长、工程建设",
    icon: "🏗️",
  },
  {
    value: "DESIGN",
    label: "设计项目",
    description: "迭代设计、版本管理、产品设计",
    icon: "🎨",
  },
  {
    value: "SERVICE",
    label: "服务项目",
    description: "客户导向、灵活交付、咨询服务",
    icon: "💼",
  },
];

const PmProjectCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    project_type: "RESEARCH" as ProjectType,
    description: "",
    budget: "",
    leader: "",
    start_date: "",
    end_date: "",
    tags: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [showAITextOptimizer, setShowAITextOptimizer] = useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = useState(false);
  const [showAIDataCompleter, setShowAIDataCompleter] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "请输入项目名称";
    if (!formData.code.trim()) newErrors.code = "请输入项目编号";
    if (!formData.project_type) newErrors.project_type = "请选择项目类型";
    if (!formData.budget || isNaN(parseFloat(formData.budget)))
      newErrors.budget = "请输入有效预算金额";
    if (!formData.start_date) newErrors.start_date = "请选择开始日期";
    if (!formData.end_date) newErrors.end_date = "请选择结束日期";
    if (
      formData.start_date &&
      formData.end_date &&
      formData.end_date < formData.start_date
    ) {
      newErrors.end_date = "结束日期不能早于开始日期";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await pmApi.projects.create({
        name: formData.name.trim(),
        code: formData.code.trim(),
        project_type: formData.project_type,
        description: formData.description.trim() || undefined,
        budget: parseFloat(formData.budget),
        leader: formData.leader.trim() || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        tags: formData.tags.trim()
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
      });

      if (response.success) {
        navigate(`/pm/projects/${response.data?.id}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSelectAICode = (code: string) => {
    setFormData((prev) => ({ ...prev, code: code }));
  };

  const handleOptimizedText = (text: string) => {
    setFormData((prev) => ({ ...prev, description: text }));
    setShowAITextOptimizer(false);
  };

  const handleApplyCompletion = (
    completions: Record<string, CompletionItem>,
  ) => {
    const updates: Record<string, any> = {};
    Object.entries(completions).forEach(([field, item]) => {
      updates[field] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIDataCompleter(false);
  };

  const handleApplyValidationSuggestions = (suggestions: any[]) => {
    const updates: Record<string, any> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  };

  return (
    <>
      <PageHeader
        title="创建项目"
        subtitle="填写项目基本信息"
        backButton={{ onClick: () => navigate("/pm/projects") }}
      />

      <Box sx={{ p: 3, maxWidth: 960, mx: "auto" }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              {/* 项目名称和编号 */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 3,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    项目名称{" "}
                    <Box component="span" sx={{ color: "error.main" }}>
                      *
                    </Box>
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="请输入项目名称"
                    error={!!errors.name}
                    helperText={errors.name}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    项目编号{" "}
                    <Box component="span" sx={{ color: "error.main" }}>
                      *
                    </Box>
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      fullWidth
                      value={formData.code}
                      onChange={(e) => handleChange("code", e.target.value)}
                      placeholder="请输入项目编号"
                      error={!!errors.code}
                      helperText={errors.code}
                    />
                    <AIHelperButton
                      type="generate"
                      onClick={() => setShowAICodeGenerator(true)}
                      size="small"
                      variant="outlined"
                      label="AI 生成"
                    />
                  </Box>
                </Box>
              </Box>

              {/* 项目类型 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  项目类型{" "}
                  <Box component="span" sx={{ color: "error.main" }}>
                    *
                  </Box>
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 2,
                  }}
                >
                  {PROJECT_TYPES.map((type) => (
                    <Box
                      key={type.value}
                      onClick={() => handleChange("project_type", type.value)}
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor:
                          formData.project_type === type.value
                            ? "primary.main"
                            : "grey.300",
                        borderRadius: 2,
                        cursor: "pointer",
                        bgcolor:
                          formData.project_type === type.value
                            ? "primary.light"
                            : "background.paper",
                        "&:hover": { borderColor: "primary.main" },
                        transition: "all 0.2s",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontSize: "1.25rem" }}
                        >
                          {type.icon}
                        </Typography>
                        <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                          {type.label}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "grey.500", fontSize: "0.75rem" }}
                      >
                        {type.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {errors.project_type && (
                  <Typography
                    variant="caption"
                    sx={{ color: "error.main", mt: 1 }}
                  >
                    {errors.project_type}
                  </Typography>
                )}
              </Box>

              {/* 项目描述 */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    项目描述
                  </Typography>
                  <AIHelperButton
                    type="optimize"
                    onClick={() => setShowAITextOptimizer(true)}
                    size="small"
                    variant="outlined"
                    label="AI 优化"
                  />
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="请输入项目描述..."
                />
              </Box>

              {/* 预算和负责人 */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 3,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    项目预算{" "}
                    <Box component="span" sx={{ color: "error.main" }}>
                      *
                    </Box>
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleChange("budget", e.target.value)}
                    placeholder="请输入预算金额"
                    error={!!errors.budget}
                    helperText={errors.budget}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Typography component="span" sx={{ color: "grey.500", mr: 1 }}>
                            ¥
                          </Typography>
                        ),
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    项目负责人
                  </Typography>
                  <TextField
                    fullWidth
                    value={formData.leader}
                    onChange={(e) => handleChange("leader", e.target.value)}
                    placeholder="请输入负责人姓名"
                  />
                </Box>
              </Box>

              {/* 开始和结束日期 */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 3,
                  mb: 3,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    开始日期{" "}
                    <Box component="span" sx={{ color: "error.main" }}>
                      *
                    </Box>
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    error={!!errors.start_date}
                    helperText={errors.start_date}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    结束日期{" "}
                    <Box component="span" sx={{ color: "error.main" }}>
                      *
                    </Box>
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                    error={!!errors.end_date}
                    helperText={errors.end_date}
                  />
                </Box>
              </Box>

              {/* 标签 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  标签
                </Typography>
                <TextField
                  fullWidth
                  value={formData.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                  placeholder="多个标签用逗号分隔"
                />
              </Box>

              {/* 操作按钮 */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pt: 3,
                  borderTop: "1px solid",
                  borderColor: "grey.200",
                }}
              >
                <Box sx={{ display: "flex", gap: 1 }}>
                  <AIHelperButton
                    type="complete"
                    onClick={() => setShowAIDataCompleter(true)}
                    size="small"
                    variant="outlined"
                    label="智能补全"
                  />
                  <AIHelperButton
                    type="validate"
                    onClick={() => setShowAIFormValidator(true)}
                    size="small"
                    variant="outlined"
                    label="AI 校验"
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/pm/projects")}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                    startIcon={<Save sx={{ width: 16, height: 16 }} />}
                  >
                    {submitting ? "提交中..." : "保存项目"}
                  </Button>
                </Box>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>

      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{
          entityType: "project",
          name: formData.name,
        }}
        onSelect={handleSelectAICode}
        existingCodes={[]}
      />

      <AITextOptimizer
        isOpen={showAITextOptimizer}
        onClose={() => setShowAITextOptimizer(false)}
        context={{
          textType: "description",
          name: formData.name,
        }}
        originalText={formData.description}
        onOptimized={handleOptimizedText}
      />

      <AIDataCompleter
        isOpen={showAIDataCompleter}
        onClose={() => setShowAIDataCompleter(false)}
        completeRequest={{
          partialData: Object.fromEntries(
            Object.entries(formData).filter(
              ([, v]) => v !== "" && v !== null && v !== undefined,
            ),
          ),
          context: {
            module: "pm",
            entityType: "project",
          },
        }}
        onApplyCompletion={handleApplyCompletion}
      />

      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: {
            module: "pm",
            entityType: "project",
          },
        }}
        onApplySuggestions={handleApplyValidationSuggestions}
        onFixIssue={(issue) => {
          if (issue.fix !== undefined) {
            setFormData((prev) => ({ ...prev, [issue.field]: issue.fix }));
          }
        }}
      />
    </>
  );
};

export default PmProjectCreatePage;
