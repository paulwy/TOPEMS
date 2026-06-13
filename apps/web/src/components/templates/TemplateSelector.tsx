import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Search, FileText, Workflow, FormInput, BarChart3, Bell, Check, Sparkles } from "lucide-react";
import type { Template, TemplateType, TemplateCategory, RenderTemplateResponse } from "../../api/template";
import { templateApi } from "../../api/template";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType?: TemplateType;
  onSelect: (template: Template, renderedContent?: string) => void;
  showVariables?: boolean;
}

const TYPE_ICONS: Record<TemplateType, React.ReactNode> = {
  document: <FileText className="w-5 h-5" />,
  workflow: <Workflow className="w-5 h-5" />,
  form: <FormInput className="w-5 h-5" />,
  report: <BarChart3 className="w-5 h-5" />,
  notification: <Bell className="w-5 h-5" />,
};

const TYPE_LABELS: Record<TemplateType, string> = {
  document: "文档",
  workflow: "工作流",
  form: "表单",
  report: "报表",
  notification: "通知",
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onOpenChange,
  templateType,
  onSelect,
  showVariables = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadCategories();
      setSelectedTemplate(null);
      setVariableValues({});
    }
  }, [open, templateType]);

  const loadTemplates = async () => {
    try {
      const response = await templateApi.list({
        type: templateType,
        category: selectedCategory,
        search: searchQuery || undefined,
        is_active: true,
        page_size: 50,
      });
      if (response.success && response.data) {
        setTemplates(response.data.items);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await templateApi.listCategories({ type: templateType });
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadTemplates();
  };

  const handleCategoryChange = (categoryId: string | undefined) => {
    setSelectedCategory(categoryId);
    loadTemplates();
  };

  const handleVariableChange = (key: string, value: any) => {
    setVariableValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;

    if (showVariables && selectedTemplate.variables.length > 0) {
      setIsRendering(true);
      try {
        const response = await templateApi.render(selectedTemplate.id, variableValues);
        if (response.success && response.data) {
          onSelect(selectedTemplate, response.data.content);
        } else {
          onSelect(selectedTemplate, selectedTemplate.content);
        }
      } catch (error) {
        console.error("Failed to render template:", error);
        onSelect(selectedTemplate, selectedTemplate.content);
      } finally {
        setIsRendering(false);
      }
    } else {
      onSelect(selectedTemplate);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>选择模板</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Label className="block text-sm mb-1">分类筛选</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={!selectedCategory ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryChange(undefined)}
                >
                  全部
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCategoryChange(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {!selectedTemplate ? (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer transition-all hover:border-primary"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {TYPE_ICONS[template.template_type]}
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <p className="text-xs text-gray-500">{TYPE_LABELS[template.template_type]}</p>
                          </div>
                        </div>
                        {template.ai_enabled && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {template.description || "暂无描述"}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{template.category_name || "未分类"}</Badge>
                          {template.is_public && (
                            <Badge variant="secondary">公开</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          已使用 {template.use_count} 次
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p>暂无模板</p>
                  <p className="text-sm">请先在系统管理中创建模板</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        {TYPE_ICONS[selectedTemplate.template_type]}
                      </div>
                      <div>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{TYPE_LABELS[selectedTemplate.template_type]}</span>
                          {selectedTemplate.is_public && (
                            <Badge variant="secondary">公开</Badge>
                          )}
                          {selectedTemplate.ai_enabled && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI 辅助
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      返回列表
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>

                  <div className="mb-6">
                    <Label className="block mb-2">模板预览</Label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[100px] whitespace-pre-wrap font-mono text-sm">
                      {selectedTemplate.content}
                    </div>
                  </div>

                  {showVariables && selectedTemplate.variables.length > 0 && (
                    <div>
                      <Label className="block mb-3 font-semibold">变量配置</Label>
                      <div className="space-y-3">
                        {selectedTemplate.variables.map((variable) => (
                          <div key={variable.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{variable.label}</span>
                              {variable.required && (
                                <span className="text-xs text-red-500">必填</span>
                              )}
                            </div>
                            <Input
                              placeholder={variable.placeholder || `输入${variable.label}`}
                              defaultValue={variable.default_value}
                              onChange={(e) =>
                                handleVariableChange(variable.key, e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          {selectedTemplate ? (
            <>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                返回列表
              </Button>
              <Button onClick={handleApply} disabled={isRendering}>
                {isRendering ? "处理中..." : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    应用模板
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button disabled={!selectedTemplate} onClick={handleApply}>
                应用模板
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelector;