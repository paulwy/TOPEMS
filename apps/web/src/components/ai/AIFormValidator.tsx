import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button, Card, CardContent, Box, Typography } from "@mui/material";
import { AIGenerateModal } from "./AIGenerateModal";
import { useAIHelper } from "../../hooks/useAIHelper";
import type { ValidateRequest, ValidationIssue, Suggestion } from "@/types/ai";

export interface AIFormValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  validateRequest: ValidateRequest;
  onApplySuggestions?: (_suggestions: Suggestion[]) => void;
  onFixIssue?: (_issue: ValidationIssue) => void;
}

const issueIconMap: Record<string, React.ReactNode> = {
  error: <AlertCircle style={{ width: 20, height: 20, color: "#ef4444" }} />,
  warning: (
    <AlertTriangle style={{ width: 20, height: 20, color: "#f59e0b" }} />
  ),
  info: <Info style={{ width: 20, height: 20, color: "#3b82f6" }} />,
};

const issueTitleMap: Record<string, string> = {
  error: "错误",
  warning: "警告",
  info: "提示",
};

export function AIFormValidator({
  isOpen,
  onClose,
  validateRequest,
  onApplySuggestions,
  onFixIssue,
}: AIFormValidatorProps) {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const { isLoading, validate } = useAIHelper({
    featureType: "validate",
    onSuccess: (result) => {
      if (result) {
        setIssues(result.issues || []);
        setSuggestions(result.suggestions || []);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      setIssues([]);
      setSuggestions([]);
      handleValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleValidate = async () => {
    await validate(validateRequest);
  };

  const handleApplyAllSuggestions = () => {
    if (suggestions.length > 0 && onApplySuggestions) {
      onApplySuggestions(suggestions);
    }
  };

  const handleFixIssue = (issue: ValidationIssue) => {
    if (issue.fix && onFixIssue) {
      onFixIssue(issue);
    }
  };

  const isValid = issues.filter((i) => i.type === "error").length === 0;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 表单校验"
      description="AI 将检查表单数据的完整性、格式和逻辑"
      isLoading={isLoading}
      onConfirm={isValid ? onClose : undefined}
      confirmText={isValid ? "完成" : undefined}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isValid ? (
              <>
                <CheckCircle
                  style={{ width: 24, height: 24, color: "#22c55e" }}
                />
                <Typography sx={{ fontWeight: 500, color: "#15803d" }}>
                  校验通过
                </Typography>
              </>
            ) : (
              <>
                <AlertCircle
                  style={{ width: 24, height: 24, color: "#ef4444" }}
                />
                <Typography sx={{ fontWeight: 500, color: "#dc2626" }}>
                  发现问题
                </Typography>
              </>
            )}
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={handleValidate}
            disabled={isLoading}
            sx={{ gap: 0.5 }}
          >
            {isLoading ? (
              <RefreshCw
                style={{ width: 16, height: 16 }}
                className="animate-spin"
              />
            ) : (
              <Sparkles style={{ width: 16, height: 16 }} />
            )}
            重新校验
          </Button>
        </Box>

        {issues.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}
            >
              发现的问题
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {issues.map((issue, idx) => (
                <Card
                  key={idx}
                  sx={{
                    borderLeft: "4px solid",
                    borderLeftColor:
                      issue.type === "error"
                        ? "#ef4444"
                        : issue.type === "warning"
                          ? "#f59e0b"
                          : "#3b82f6",
                  }}
                >
                  <CardContent sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ mt: 0.125 }}>{issueIconMap[issue.type]}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            sx={{ fontWeight: 500, fontSize: "0.875rem" }}
                          >
                            {issueTitleMap[issue.type]}: {issue.field}
                          </Typography>
                          {issue.fix && (
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{ height: 28, fontSize: "0.75rem", px: 1 }}
                              onClick={() => handleFixIssue(issue)}
                            >
                              修复
                            </Button>
                          )}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            color: "#4b5563",
                            mt: 0.5,
                          }}
                        >
                          {issue.message}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {suggestions.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}
              >
                优化建议
              </Typography>
              {onApplySuggestions && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleApplyAllSuggestions}
                >
                  全部应用
                </Button>
              )}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {suggestions.map((suggestion, idx) => (
                <Card key={idx} sx={{ bgcolor: "#eff6ff" }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                      }}
                    >
                      <Info
                        style={{
                          width: 20,
                          height: 20,
                          color: "#3b82f6",
                          marginTop: 2,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{ fontWeight: 500, fontSize: "0.875rem" }}
                        >
                          {suggestion.field}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            color: "#4b5563",
                            mt: 0.5,
                          }}
                        >
                          {suggestion.reason}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            fontFamily: "monospace",
                            color: "#1d4ed8",
                            mt: 0.5,
                            bgcolor: "#fff",
                            px: 0.5,
                            py: 0.5,
                            borderRadius: 0.5,
                            border: "1px solid #dbeafe",
                          }}
                        >
                          {suggestion.value}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {issues.length === 0 && suggestions.length === 0 && !isLoading && (
          <Box sx={{ textAlign: "center", py: 4, color: "#6b7280" }}>
            <CheckCircle
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 12px",
                color: "#22c55e",
              }}
            />
            <Typography>表单校验通过！</Typography>
            <Typography sx={{ fontSize: "0.875rem", mt: 0.25 }}>
              未发现任何问题
            </Typography>
          </Box>
        )}
      </Box>
    </AIGenerateModal>
  );
}
