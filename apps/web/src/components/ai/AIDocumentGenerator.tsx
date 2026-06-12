import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { AIGenerateModal } from "./AIGenerateModal";
import { useAIHelper } from "../../hooks/useAIHelper";
import { AI_TEMPLATES, getAITemplatesList } from "../../config/ai-templates";
import type { AITemplate } from "../../types/ai";

export interface AIDocumentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplateId?: string;
  onDocumentGenerated: (document: string) => void;
}

export function AIDocumentGenerator({
  isOpen,
  onClose,
  initialTemplateId,
  onDocumentGenerated,
}: AIDocumentGeneratorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    string | undefined
  >(initialTemplateId);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const { isLoading, generate, result } = useAIHelper<string>({
    featureType: "document",
  });

  const templates = getAITemplatesList;

  const selectedTemplate = selectedTemplateId
    ? AI_TEMPLATES[selectedTemplateId]
    : undefined;

  useEffect(() => {
    if (isOpen) {
      setFormData({});
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    // 替换模板变量
    let prompt = selectedTemplate.promptTemplate;
    Object.entries(formData).forEach(([key, value]) => {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
    });

    await generate(prompt);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (result) {
      onDocumentGenerated(result);
      onClose();
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasResult = !!result;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 文档生成"
      description="选择模板，填写信息，让 AI 帮您生成专业文档"
      isLoading={isLoading}
      onConfirm={hasResult ? handleApply : undefined}
      confirmText="应用"
      extraActions={
        hasResult ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "已复制" : "复制"}
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>选择文档模板</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={(value) => {
              setSelectedTemplateId(value);
              setFormData({});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择模板" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              {selectedTemplate.description}
            </div>

            <div className="space-y-3">
              {selectedTemplate.fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      placeholder={`请输入${field.label}`}
                      rows={3}
                    />
                  ) : field.type === "select" && field.options ? (
                    <Select
                      value={formData[field.name] || ""}
                      onValueChange={(value) =>
                        handleFieldChange(field.name, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`请选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      placeholder={`请输入${field.label}`}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isLoading ? "正在生成..." : "生成文档"}
            </Button>

            {hasResult && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-purple-700 font-medium">
                      生成的文档
                    </Label>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerate}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      重新生成
                    </Button>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <pre className="text-gray-700 whitespace-pre-wrap text-sm">
                      {result}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AIGenerateModal>
  );
}
