import { TextField, Select, FormControl, InputLabel, MenuItem, Card, CardContent, Box,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Copy, Check } from "lucide-react";

import { AIGenerateModal } from "./AIGenerateModal";
import { useAIHelper } from "../../hooks/useAIHelper";
import { AI_TEMPLATES, getAITemplatesList } from "../../config/ai-templates";
import type { AITemplate } from "@/types/ai";

export interface AIDocumentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplateId?: string;
  onDocumentGenerated: (_document: string) => void;
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
            variant="outlined"
            size="small"
            onClick={handleCopy}
            startIcon={
              copied ? (
                <Check style={{ fontSize: 16 }} />
              ) : (
                <Copy style={{ fontSize: 16 }} />
              )
            }
          >
            {copied ? "已复制" : "复制"}
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <InputLabel shrink>选择文档模板</InputLabel>
          <Select
            value={selectedTemplateId || ""}
            onChange={(e) => {
              setSelectedTemplateId(e.target.value);
              setFormData({});
            }}
            displayEmpty
            size="small"
          >
            <MenuItem value="" disabled>
              请选择模板
            </MenuItem>
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {selectedTemplate && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                fontSize: "0.875rem",
                color: "text.secondary",
                bgcolor: "grey.50",
                p: 2,
                borderRadius: 1,
              }}
            >
              {selectedTemplate.description}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {selectedTemplate.fields.map(
                (field: AITemplate["fields"][number]) => (
                  <Box
                    key={field.name}
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <InputLabel shrink sx={{ fontSize: "0.875rem" }}>
                      {field.label}
                      {field.required && (
                        <Box
                          component="span"
                          sx={{ color: "error.main", ml: 0.5 }}
                        >
                          *
                        </Box>
                      )}
                    </InputLabel>
                    {field.type === "textarea" ? (
                      <TextField
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          handleFieldChange(field.name, e.target.value)
                        }
                        placeholder={`请输入${field.label}`}
                        multiline
                        rows={3}
                        size="small"
                        fullWidth
                      />
                    ) : field.type === "select" && field.options ? (
                      <FormControl size="small" fullWidth>
                        <Select
                          value={formData[field.name] || ""}
                          onChange={(e) =>
                            handleFieldChange(
                              field.name,
                              e.target.value as string,
                            )
                          }
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            {`请选择${field.label}`}
                          </MenuItem>
                          {field.options?.map(
                            (option: { label: string; value: string }) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ),
                          )}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        type={field.type}
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          handleFieldChange(field.name, e.target.value)
                        }
                        placeholder={`请输入${field.label}`}
                        size="small"
                        fullWidth
                      />
                    )}
                  </Box>
                ),
              )}
            </Box>

            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              variant="contained"
              fullWidth
              startIcon={<Sparkles style={{ fontSize: 16 }} />}
            >
              {isLoading ? "正在生成..." : "生成文档"}
            </Button>

            {hasResult && (
              <Card>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <InputLabel
                      sx={{ color: "purple.700", fontWeight: 500, mb: 0 }}
                    >
                      生成的文档
                    </InputLabel>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleGenerate}
                      startIcon={<RefreshCw style={{ fontSize: 16 }} />}
                    >
                      重新生成
                    </Button>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: "purple.50",
                      border: "1px solid",
                      borderColor: "purple.200",
                      borderRadius: 1,
                      p: 2,
                    }}
                  >
                    <Box
                      component="pre"
                      sx={{
                        color: "grey.700",
                        whiteSpace: "pre-wrap",
                        fontSize: "0.875rem",
                        m: 0,
                        fontFamily: "inherit",
                      }}
                    >
                      {result}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </Box>
    </AIGenerateModal>
  );
}
