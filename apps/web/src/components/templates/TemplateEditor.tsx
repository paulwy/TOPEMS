import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import {
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateVariable,
  TemplateType,
  TemplateCategory,
} from "../../api/template";

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  categories: TemplateCategory[];
  onSave: (data: CreateTemplateRequest | UpdateTemplateRequest) => void;
}

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: "document", label: "文档模板" },
  { value: "workflow", label: "工作流模板" },
  { value: "form", label: "表单模板" },
  { value: "report", label: "报表模板" },
  { value: "notification", label: "通知模板" },
];

const VARIABLE_TYPES: { value: string; label: string }[] = [
  { value: "string", label: "文本" },
  { value: "number", label: "数字" },
  { value: "date", label: "日期" },
  { value: "select", label: "单选" },
  { value: "multiselect", label: "多选" },
  { value: "lookup", label: "查找" },
  { value: "user", label: "用户" },
  { value: "now", label: "当前时间" },
];

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  open,
  onOpenChange,
  template,
  categories,
  onSave,
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: "",
    code: "",
    module: "doc",
    content: "",
    variables: [],
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        code: template.code,
        template_type: template.template_type,
        category_id: template.category_id,
        module: template.module || "doc",
        description: template.description,
        content: template.content,
        variables: template.variables,
        is_active: template.is_active,
        is_public: template.is_public,
        ai_enabled: template.ai_enabled,
        sort_order: 0,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        module: "doc",
        content: "",
        variables: [],
        is_active: true,
        is_public: false,
        ai_enabled: false,
      });
    }
  }, [template, open]);

  const handleVariableAdd = () => {
    const newVariable: TemplateVariable = {
      key: `var_${Date.now()}`,
      label: "新变量",
      type: "string",
      required: false,
    };
    setFormData((prev) => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable],
    }));
  };

  const handleVariableRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables
        ? prev.variables.filter((_, i) => i !== index)
        : [],
    }));
  };

  const handleVariableChange = (
    index: number,
    field: keyof TemplateVariable,
    value: any,
  ) => {
    setFormData((prev) => {
      const variables = prev.variables || [];
      const updatedVariables = variables.map((v, i) =>
        i === index ? { ...v, [field]: value } : v,
      );
      return { ...prev, variables: updatedVariables };
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) return;

    if (template) {
      onSave({
        ...formData,
        id: template.id,
      } as UpdateTemplateRequest);
    } else {
      onSave(formData);
    }

    onOpenChange(false);
  };

  const insertVariable = (variableKey: string) => {
    const textarea = document.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement;
    const cursorPos = textarea?.selectionStart;
    if (cursorPos !== undefined) {
      const content = formData.content;
      const newContent =
        content.slice(0, cursorPos) +
        `{{${variableKey}}}` +
        content.slice(cursorPos);
      setFormData((prev) => ({ ...prev, content: newContent }));
    }
  };

  const previewContent = () => {
    if (!formData.content) return "";
    let content = formData.content;
    (formData.variables || []).forEach((v) => {
      const pattern = new RegExp(`{{\\s*${v.key}\\s*}}`, "g");
      content = content.replace(pattern, v.default_value || `[${v.label}]`);
    });
    return content;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "编辑模板" : "创建模板"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">模板名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="输入模板名称"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="code">模板编码 *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="输入模板编码"
                disabled={!!template}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">模板类型</Label>
              <Select
                value={formData.template_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    template_type: value as TemplateType,
                  })
                }
              >
                <SelectTrigger id="type" className="mt-1">
                  <SelectValue placeholder="选择模板类型" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">分类</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value || undefined })
                }
              >
                <SelectTrigger id="category" className="mt-1">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="输入模板描述"
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <span>模板变量</span>
              <Button
                type="button"
                size="sm"
                onClick={handleVariableAdd}
                className="h-8"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加变量
              </Button>
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="h-8"
            >
              {isPreview ? (
                <EyeOff className="w-4 h-4 mr-1" />
              ) : (
                <Eye className="w-4 h-4 mr-1" />
              )}
              {isPreview ? "编辑模式" : "预览模式"}
            </Button>
          </div>

          {formData.variables && formData.variables.length > 0 && (
            <div className="space-y-3">
              {formData.variables.map((variable, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg group"
                >
                  <GripVertical className="w-4 h-4 text-gray-400 mt-2 cursor-move flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">变量标识</Label>
                      <Input
                        value={variable.key}
                        onChange={(e) =>
                          handleVariableChange(index, "key", e.target.value)
                        }
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">显示名称</Label>
                      <Input
                        value={variable.label}
                        onChange={(e) =>
                          handleVariableChange(index, "label", e.target.value)
                        }
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">类型</Label>
                      <Select
                        value={variable.type}
                        onValueChange={(value) =>
                          handleVariableChange(index, "type", value)
                        }
                      >
                        <SelectTrigger className="mt-1 h-8">
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {VARIABLE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={variable.required || false}
                          onCheckedChange={(checked) =>
                            handleVariableChange(index, "required", checked)
                          }
                        />
                        <span className="text-xs text-gray-600">必填</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleVariableRemove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="content">模板内容</Label>
              <div className="flex gap-2">
                {(formData.variables || []).map((v) => (
                  <Button
                    key={v.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(v.key)}
                    className="h-7"
                  >
                    {`{{${v.key}}}`}
                  </Button>
                ))}
              </div>
            </div>
            {isPreview ? (
              <div className="mt-1 p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px] whitespace-pre-wrap">
                {previewContent()}
              </div>
            ) : (
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="输入模板内容，使用 {{变量名}} 引用变量"
                className="mt-1 min-h-[200px] font-mono text-sm"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label>启用状态</Label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_public || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_public: checked })
                  }
                />
                <Label>公开模板</Label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ai_enabled || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ai_enabled: checked })
                  }
                />
                <Label className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI 辅助
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            {template ? "更新模板" : "创建模板"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateEditor;
