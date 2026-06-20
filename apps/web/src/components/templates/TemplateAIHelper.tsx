import {
  Button,
  TextField,
  FormLabel,
  Card,
  CardContent,
  CardHeader,
  Typography,
  CircularProgress,
} from "@mui/material";
import React, { useState } from "react";

import { Sparkles, Wand2, Lightbulb, TrendingUp, Send } from "lucide-react";

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
    <Card
      sx={{
        background: "linear-gradient(to bottom right, #fffbeb, #ffedd5)",
        border: "1px solid #fcd34d",
      }}
    >
      <CardHeader sx={{ pb: 1.5 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#92400e",
          }}
        >
          <Sparkles style={{ width: 20, height: 20 }} />
          AI 辅助助手
        </Typography>
        <Typography variant="body2" sx={{ color: "#d97706", mt: 0.5 }}>
          智能生成和优化模板内容
        </Typography>
      </CardHeader>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div>
          <FormLabel sx={{ fontSize: 14, fontWeight: 500, color: "#b45309" }}>
            描述模板用途
          </FormLabel>
          <TextField
            placeholder="例如：生成一份项目周报模板"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            sx={{
              width: "100%",
              mt: 1,
              backgroundColor: "#f59e0b",
              color: "white",
              "&:hover": { backgroundColor: "#d97706" },
            }}
            startIcon={
              isGenerating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Wand2 style={{ width: 16, height: 16 }} />
              )
            }
          >
            {isGenerating ? "生成中..." : "AI 生成模板"}
          </Button>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <Button
            variant="outlined"
            onClick={handleSuggestVariables}
            disabled={isAnalyzing || !content.trim()}
            sx={{
              borderColor: "#fcd34d",
              color: "#b45309",
              "&:hover": { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
            }}
            startIcon={<Lightbulb style={{ width: 16, height: 16 }} />}
          >
            建议变量
          </Button>
          <Button
            variant="outlined"
            onClick={handleOptimize}
            disabled={isGenerating || !content.trim()}
            sx={{
              borderColor: "#fcd34d",
              color: "#b45309",
              "&:hover": { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
            }}
            startIcon={<TrendingUp style={{ width: 16, height: 16 }} />}
          >
            优化内容
          </Button>
        </div>

        <Button
          variant="outlined"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          sx={{
            width: "100%",
            borderColor: "#fcd34d",
            color: "#b45309",
            "&:hover": { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
          }}
          startIcon={
            isAnalyzing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Send style={{ width: 16, height: 16 }} />
            )
          }
        >
          {isAnalyzing ? "分析中..." : "分析变量使用"}
        </Button>

        {suggestions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FormLabel sx={{ fontSize: 12, fontWeight: 500, color: "#b45309" }}>
              AI 建议
            </FormLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: 14,
                    color: "#92400e",
                    backgroundColor: "#fef3c7",
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResult && analysisResult.suggestions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FormLabel sx={{ fontSize: 12, fontWeight: 500, color: "#b45309" }}>
              分析结果
            </FormLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {analysisResult.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: 14,
                    borderRadius: 8,
                    padding: "8px 12px",
                    backgroundColor:
                      suggestion.includes("未使用") ||
                      suggestion.includes("未定义")
                        ? "#fef2f2"
                        : "#f0fdf4",
                    color:
                      suggestion.includes("未使用") ||
                      suggestion.includes("未定义")
                        ? "#b91c1c"
                        : "#15803d",
                  }}
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
