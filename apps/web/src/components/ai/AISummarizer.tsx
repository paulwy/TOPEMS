import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Copy, Check, Quote } from "lucide-react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormLabel from "@mui/material/FormLabel";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { AIGenerateModal } from "./AIGenerateModal";
import { useAIHelper } from "../../hooks/useAIHelper";
import type { SummarizeRequest, SummarizeResponse } from "../../types/ai";

export interface AISummarizerProps {
  isOpen: boolean;
  onClose: () => void;
  summarizeRequest: SummarizeRequest;
  onSummaryGenerated: (_summary: string) => void;
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
            variant="outlined"
            size="small"
            onClick={handleCopy}
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            {copied ? (
              <Check style={{ width: 16, height: 16 }} />
            ) : (
              <Copy style={{ width: 16, height: 16 }} />
            )}
            {copied ? "已复制" : "复制"}
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <FormLabel>摘要类型</FormLabel>
          <Select
            value={summaryType}
            onChange={(e) => handleTypeChange(e.target.value as any)}
            size="small"
          >
            {(
              Object.entries(summaryTypeConfig) as [
                keyof typeof summaryTypeConfig,
                typeof summaryTypeConfig.short,
              ][]
            ).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                {config.label} - {config.description}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {hasSummary ? (
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
              >
                <Quote style={{ width: 20, height: 20, color: "#9333ea" }} />
                <FormLabel sx={{ color: "#7c3aed", fontWeight: 500 }}>
                  生成的摘要
                </FormLabel>
              </Box>
              <Box
                sx={{
                  bgcolor: "#faf5ff",
                  border: "1px solid #e9d5ff",
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Typography
                  sx={{
                    color: "#374151",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {result.summary}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 1.5, width: "100%" }}
                onClick={handleSummarize}
              >
                <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
                重新生成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent sx={{ p: 3, textAlign: "center", color: "#6b7280" }}>
              <Sparkles
                style={{
                  width: 40,
                  height: 40,
                  margin: "0 auto 12px",
                  opacity: 0.5,
                }}
              />
              <Typography>正在生成摘要...</Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </AIGenerateModal>
  );
}
