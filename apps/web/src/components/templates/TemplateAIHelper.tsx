import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Sparkles,
  Wand2,
  Lightbulb,
  TrendingUp,
  Send,
  Loader2,
} from "lucide-react";

interface TemplateAIHelperProps {
  content: string;
  variables: { key: string; label: string; type: string }[];
  onContentChange: (content: string) => void;
  onVariablesChange: (
    variables: { key: string; label: string; type: string }[],
  ) => void;
}

interface AIResponse {
  content: string;
  variables: { key: string; label: string; type: string }[];
  suggestions: string[];
}

const TemplateAIHelper: React.FC<TemplateAIHelperProps> = ({
  content,
  variables,
  onContentChange,
  onVariablesChange,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AIResponse | null>(null);

  const mockGenerateResponse: AIResponse = {
    content: `# {{report_title}}

## 一、概述
{{summary}}

## 二、详细内容
{{details}}

## 三、结论
{{conclusion}}

报告人：{{reporter}}
报告日期：{{today}}`,
    variables: [
      { key: "report_title", label: "报告标题", type: "string" },
      { key: "summary", label: "概述", type: "string" },
      { key: "details", label: "详细内容", type: "string" },
      { key: "conclusion", label: "结论", type: "string" },
      { key: "reporter", label: "报告人", type: "user" },
    ],
    suggestions: ["已根据描述生成模板框架", "建议根据实际需求调整变量"],
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    onContentChange(mockGenerateResponse.content);
    onVariablesChange(mockGenerateResponse.variables);
    setSuggestions(mockGenerateResponse.suggestions);
    setIsGenerating(false);
  };

  const handleSuggestVariables = async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    const detectedVars: { key: string; label: string; type: string }[] = [];
    const varRegex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const key = match[1];
      if (
        !["now", "today", "now_date", "now_time", "now_timestamp"].includes(key)
      ) {
        if (!detectedVars.some((v) => v.key === key)) {
          detectedVars.push({
            key,
            label: generateLabel(key),
            type: inferType(key),
          });
        }
      }
    }

    const existingKeys = new Set(variables.map((v) => v.key));
    const newVariables = [...variables];
    detectedVars.forEach((v) => {
      if (!existingKeys.has(v.key)) {
        newVariables.push(v);
      }
    });

    onVariablesChange(newVariables);
    setSuggestions([
      `检测到 ${detectedVars.length} 个变量引用，已添加到变量列表`,
    ]);
    setIsAnalyzing(false);
  };

  const handleOptimize = async () => {
    if (!content.trim()) return;

    setIsGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const optimized = content
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\s+|\s+$/gm, "")
      .replace(/{{\s*(\w+)\s*}}/g, "{{$1}}");

    onContentChange(optimized);
    setSuggestions(["内容已优化，移除多余空行和空格"]);
    setIsGenerating(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const usedVars = new Set<string>();
    const varRegex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      usedVars.add(match[1]);
    }

    const unusedVars = variables.filter((v) => !usedVars.has(v.key));
    const undefinedVars = Array.from(usedVars).filter(
      (v) => !variables.some((varDef) => varDef.key === v),
    );

    const result: AIResponse = {
      content: "",
      variables: [],
      suggestions: [],
    };

    if (unusedVars.length > 0) {
      result.suggestions.push(
        `以下变量定义了但未使用：${unusedVars.map((v) => v.key).join(", ")}`,
      );
    }

    if (undefinedVars.length > 0) {
      result.suggestions.push(
        `以下变量使用了但未定义：${undefinedVars.join(", ")}`,
      );
    }

    if (result.suggestions.length === 0) {
      result.suggestions.push("模板检查通过，变量使用正常");
    }

    setAnalysisResult(result);
    setSuggestions(result.suggestions);
    setIsAnalyzing(false);
  };

  const generateLabel = (key: string): string => {
    const replacements: Record<string, string> = {
      name: "名称",
      title: "标题",
      code: "编码",
      description: "描述",
      content: "内容",
      date: "日期",
      time: "时间",
      user: "用户",
      author: "作者",
      department: "部门",
      company: "公司",
      project: "项目",
      amount: "金额",
      number: "编号",
      status: "状态",
      type: "类型",
      category: "分类",
      subject: "主题",
      summary: "摘要",
      body: "正文",
    };

    for (const [k, v] of Object.entries(replacements)) {
      if (key.toLowerCase() === k || key.toLowerCase().endsWith(k)) {
        return v;
      }
    }

    const parts = key.split("_");
    if (parts.length > 1) {
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const inferType = (key: string): string => {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes("date") || lowerKey.includes("time")) return "date";
    if (
      lowerKey.includes("amount") ||
      lowerKey.includes("number") ||
      lowerKey.includes("price")
    )
      return "number";
    if (
      lowerKey.includes("user") ||
      lowerKey.includes("author") ||
      lowerKey.includes("creator")
    )
      return "user";
    if (
      lowerKey.includes("status") ||
      lowerKey.includes("type") ||
      lowerKey.includes("category")
    )
      return "select";

    return "string";
  };

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Sparkles className="w-5 h-5" />
          AI 辅助助手
        </CardTitle>
        <p className="text-sm text-amber-600">智能生成和优化模板内容</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-amber-700">
            描述模板用途
          </Label>
          <Input
            placeholder="例如：生成一份项目周报模板"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
          <Button
            className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                AI 生成模板
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={handleSuggestVariables}
            disabled={isAnalyzing || !content.trim()}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            建议变量
          </Button>
          <Button
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={handleOptimize}
            disabled={isGenerating || !content.trim()}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            优化内容
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              分析变量使用
            </>
          )}
        </Button>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-amber-700">
              AI 建议
            </Label>
            <div className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="text-sm text-amber-800 bg-amber-100 rounded-lg px-3 py-2"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResult && analysisResult.suggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-amber-700">
              分析结果
            </Label>
            <div className="space-y-1">
              {analysisResult.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`text-sm rounded-lg px-3 py-2 ${
                    suggestion.includes("未使用") ||
                    suggestion.includes("未定义")
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplateAIHelper;
