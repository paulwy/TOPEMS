import React, { useState } from "react";
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
import { pmApi } from "../api/pm";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  AIHelperButton,
  AICodeGenerator,
  AITextOptimizer,
  AIFormValidator,
  AIDataCompleter,
} from "../components/ai";
import type { CompletionItem } from "../types/ai";

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
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/pm/projects")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">创建项目</CardTitle>
            <p className="text-gray-500 mt-1">填写项目基本信息</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">
                    项目名称 <span className="text-red-500">*</span>
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
                    <p className="text-red-500 text-sm">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-code">
                    项目编号 <span className="text-red-500">*</span>
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
                    <p className="text-red-500 text-sm">{errors.code}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  项目类型 <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PROJECT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange("project_type", type.value)}
                      className={`p-4 border rounded-lg text-left transition-all ${
                        formData.project_type === type.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
                {errors.project_type && (
                  <p className="text-red-500 text-sm">{errors.project_type}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    项目描述
                  </Label>
                  <AIHelperButton
                    type="optimize"
                    onClick={() => setShowAITextOptimizer(true)}
                    size="sm"
                    variant="secondary"
                    label="AI 优化"
                  />
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="请输入项目描述..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    项目预算 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ¥
                    </span>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => handleChange("budget", e.target.value)}
                      placeholder="请输入预算金额"
                      className={`pl-8 ${
                        errors.budget ? "border-red-500 focus:ring-red-500" : ""
                      }`}
                    />
                  </div>
                  {errors.budget && (
                    <p className="text-red-500 text-sm">{errors.budget}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    开始日期 <span className="text-red-500">*</span>
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
                    <p className="text-red-500 text-sm">{errors.start_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    结束日期 <span className="text-red-500">*</span>
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
                    <p className="text-red-500 text-sm">{errors.end_date}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  标签
                </Label>
                <Input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                  placeholder="多个标签用逗号分隔"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <AIHelperButton
                    type="generate"
                    onClick={() => setShowAICodeGenerator(true)}
                    size="sm"
                    variant="secondary"
                    label="生成编号"
                  />
                  <AIHelperButton
                    type="complete"
                    onClick={() => setShowAIDataCompleter(true)}
                    size="sm"
                    variant="secondary"
                    label="智能补全"
                  />
                  <AIHelperButton
                    type="validate"
                    onClick={() => setShowAIFormValidator(true)}
                    size="sm"
                    variant="secondary"
                    label="AI 校验"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/pm/projects")}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    <Save className="w-4 h-4" />
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
