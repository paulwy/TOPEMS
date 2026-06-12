import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Copy, Check, Quote } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { AIGenerateModal } from "./AIGenerateModal";
import { useAIHelper } from "../../hooks/useAIHelper";
import type { SummarizeRequest, SummarizeResponse } from "../../types/ai";

export interface AISummarizerProps {
  isOpen: boolean;
  onClose: () => void;
  summarizeRequest: SummarizeRequest;
  onSummaryGenerated: (summary: string) => void;
}

const summaryTypeConfig = {
  short: {
    label: "简短摘要",
    description: "100字以内，核心要点",
  },
  medium: {
    label: "标准摘要",
    description: "200-300字，全面概述",
  },
  detailed: {
    label: "详细摘要",
    description: "400字以上，细节丰富",
  },
};

export function AISummarizer({
  isOpen,
  onClose,
  summarizeRequest,
  onSummaryGenerated,
}: AISummarizerProps) {
  const [summaryType, setSummaryType] = useState<
    "short" | "medium" | "detailed"
  >("medium");
  const [copied, setCopied] = useState(false);

  const { isLoading, summarize, result } = useAIHelper<SummarizeResponse>({
    featureType: "document",
    onSuccess: () => {
      // Summary will be available in result
    },
  });

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      handleSummarize();
    }
  }, [isOpen]);

  const handleSummarize = async () => {
    await summarize({
      ...summarizeRequest,
      type: summaryType,
    });
  };

  const handleTypeChange = async (type: "short" | "medium" | "detailed") => {
    setSummaryType(type);
    await summarize({
      ...summarizeRequest,
      type,
    });
  };

  const handleCopy = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (result?.summary) {
      onSummaryGenerated(result.summary);
      onClose();
    }
  };

  const hasSummary = !!result?.summary;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 智能摘要"
      description="根据内容自动生成专业摘要"
      isLoading={isLoading}
      onConfirm={hasSummary ? handleApply : undefined}
      confirmText="应用"
      extraActions={
        hasSummary ? (
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
          <Label>摘要类型</Label>
          <Select
            value={summaryType}
            onValueChange={(value) => handleTypeChange(value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择摘要类型" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(summaryTypeConfig) as [
                  keyof typeof summaryTypeConfig,
                  typeof summaryTypeConfig.short,
                ][]
              ).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label} - {config.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasSummary ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Quote className="w-5 h-5 text-purple-600" />
                <Label className="text-purple-700 font-medium">
                  生成的摘要
                </Label>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {result.summary}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={handleSummarize}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新生成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>正在生成摘要...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AIGenerateModal>
  );
}
