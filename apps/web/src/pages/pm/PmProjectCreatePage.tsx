import React, { useState, useMemo } from "react";
import { apiLogger } from "@/utils/logger";
import {
  ArrowLeft,
  Save,
  Calendar,
  Users,
  DollarSign,
  Tag,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { pmApi } from "@/api/pm";
import { Card, CardContent, CardHeader, TextField, FormControlLabel, Typography,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import {
  AIHelperButton,
  AICodeGenerator,
  AITextOptimizer,
  AIFormValidator,
  AIDataCompleter,
} from "@/components/ai";
import type { CompletionItem } from "@/types/ai";
import {
  CardTitle,
  Label,
  Input,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/shadcn";
import { ImageUpload } from "@/components/common";

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
}[] = [
  {
    value: "RESEARCH",
    label: "科研项目",
    description: "实验驱动、创新研究、专利申请",
  },
  {
    value: "PRODUCTION",
    label: "生产项目",
    description: "标准化生产、质量控制、量产",
  },
  {
    value: "CONSTRUCTION",
    label: "施工项目",
    description: "资源密集、周期长、工程建设",
  },
  {
    value: "DESIGN",
    label: "设计项目",
    description: "迭代设计、版本管理、产品设计",
  },
  {
    value: "SERVICE",
    label: "服务项目",
    description: "客户导向、灵活交付、咨询服务",
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
    images: [] as string[],
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
          ? formData.tags.split(",").map((t) => t.trim())
          : undefined,
      });

      if (response.success) {
        navigate(`/pm/projects/${response.data?.id}`);
      }
    } catch (error) {
      apiLogger.error("Failed to create project:", error);
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
    setFormData((prev) => ({ ...prev, code }));
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
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
      }}
    >
      <div style={{ flex: 1, padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => navigate("/pm/projects")}
            sx={{ gap: 8 }}
          >
            <ArrowLeft sx={{ width: 16, height: 16 }} />
            返回列表
          </Button>
        </div>

        <Card sx={{ maxWidth: 768, margin: "0 auto" }}>
          <CardHeader>
            <CardTitle sx={{ fontSize: "1.25rem" }}>创建项目</CardTitle>
            <p style={{ color: "#6b7280", marginTop: 4 }}>填写项目基本信息</p>
          </CardHeader>
          <CardContent>
            <form style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Label htmlFor="project-name">
                    项目名称 <span style={{ color: "#ef4444" }}>*</span>
                  </Label>
                  <Input
                    id="project-name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="请输入项目名称"
                    className={
                      errors.name ? "border-red-500 focus:ring-red-500" : ""
                    }
                  />
                  {errors.name && (
                    <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Label htmlFor="project-code">
                    项目编号 <span style={{ color: "#ef4444" }}>*</span>
                  </Label>
                  <Input
                    id="project-code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="请输入项目编号"
                    className={
                      errors.code ? "border-red-500 focus:ring-red-500" : ""
                    }
                  />
                  {errors.code && (
                    <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                      {errors.code}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Label>
                  项目类型 <span style={{ color: "#ef4444" }}>*</span>
                </Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  {PROJECT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange("project_type", type.value)}
                      style={{
                        padding: 16,
                        border: `1px solid ${formData.project_type === type.value ? "#3b82f6" : "#d1d5db"}`,
                        borderRadius: 8,
                        textAlign: "left",
                        backgroundColor:
                          formData.project_type === type.value
                            ? "#eff6ff"
                            : "transparent",
                      }}
                    >
                      <div style={{ fontWeight: 500, color: "#111827" }}>
                        {type.label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          marginTop: 4,
                        }}
                      >
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
                {errors.project_type && (
                  <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                    {errors.project_type}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Label sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <FileText sx={{ width: 16, height: 16 }} />
                    项目描述
                  </Label>
                  <AIHelperButton
                    type="optimize"
                    onClick={() => setShowAITextOptimizer(true)}
                    size="small"
                    variant="outlined"
                    label="AI 优化"
                  />
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="请输入项目描述..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Label sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <DollarSign sx={{ width: 16, height: 16 }} />
                    项目预算 <span style={{ color: "#ef4444" }}>*</span>
                  </Label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#6b7280",
                      }}
                    >
                      ¥
                    </span>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => handleChange("budget", e.target.value)}
                      placeholder="请输入预算金额"
                      style={{ paddingLeft: 32 }}
                      className={
                        errors.budget ? "border-red-500 focus:ring-red-500" : ""
                      }
                    />
                  </div>
                  {errors.budget && (
                    <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                      {errors.budget}
                    </p>
                  )}
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Label sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Users sx={{ width: 16, height: 16 }} />
                    项目负责人
                  </Label>
                  <Input
                    type="text"
                    value={formData.leader}
                    onChange={(e) => handleChange("leader", e.target.value)}
                    placeholder="请输入负责人姓名"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Label sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar sx={{ width: 16, height: 16 }} />
                    开始日期 <span style={{ color: "#ef4444" }}>*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    className={
                      errors.start_date
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }
                  />
                  {errors.start_date && (
                    <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                      {errors.start_date}
                    </p>
                  )}
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Label sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar sx={{ width: 16, height: 16 }} />
                    结束日期 <span style={{ color: "#ef4444" }}>*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                    className={
                      errors.end_date ? "border-red-500 focus:ring-red-500" : ""
                    }
                  />
                  {errors.end_date && (
                    <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                      {errors.end_date}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Label sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Tag sx={{ width: 16, height: 16 }} />
                  标签
                </Label>
                <Input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                  placeholder="多个标签用逗号分隔"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Label sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                  项目封面图片
                </Label>
                <ImageUpload
                  value={formData.images}
                  onChange={(files) =>
                    setFormData((prev) => ({ ...prev, images: files }))
                  }
                  maxCount={9}
                  accept="image/*"
                  cropEnabled
                  height={200}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 16,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <AIHelperButton
                    type="generate"
                    onClick={() => setShowAICodeGenerator(true)}
                    size="small"
                    variant="outlined"
                    label="生成编号"
                  />
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
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/pm/projects")}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    sx={{
                      gap: 8,
                      padding: "8px 16px",
                      backgroundColor: "#2563eb",
                      color: "#fff",
                      "&:hover": { backgroundColor: "#1d4ed8" },
                    }}
                  >
                    <Save sx={{ width: 16, height: 16 }} />
                    {submitting ? "提交中..." : "保存项目"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

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
          partialData: formData,
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
        onFixIssue={() => {}}
      />
    </div>
  );
};

export default PmProjectCreatePage;
