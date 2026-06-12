import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { AIGenerateModal } from "./AIGenerateModal";
import { useAIHelper } from "../../hooks/useAIHelper";
import type {
  ValidateRequest,
  ValidationIssue,
  Suggestion,
} from "../../types/ai";

export interface AIFormValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  validateRequest: ValidateRequest;
  onApplySuggestions?: (suggestions: Suggestion[]) => void;
  onFixIssue?: (issue: ValidationIssue) => void;
}

const issueIconMap: Record<string, React.ReactNode> = {
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValid ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="font-medium text-green-700">校验通过</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-red-500" />
                <span className="font-medium text-red-700">发现问题</span>
              </>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleValidate}
            disabled={isLoading}
            className="gap-1"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            重新校验
          </Button>
        </div>

        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">发现的问题</h4>
            <div className="space-y-2">
              {issues.map((issue, idx) => (
                <Card
                  key={idx}
                  className="border-l-4"
                  style={{
                    borderLeftColor:
                      issue.type === "error"
                        ? "#ef4444"
                        : issue.type === "warning"
                          ? "#f59e0b"
                          : "#3b82f6",
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{issueIconMap[issue.type]}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {issueTitleMap[issue.type]}: {issue.field}
                          </span>
                          {issue.fix && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => handleFixIssue(issue)}
                            >
                              修复
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {issue.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">优化建议</h4>
              {onApplySuggestions && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApplyAllSuggestions}
                >
                  全部应用
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <Card key={idx} className="bg-blue-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">
                          {suggestion.field}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          {suggestion.reason}
                        </p>
                        <p className="text-sm font-mono text-blue-700 mt-1 bg-white px-2 py-1 rounded border border-blue-100">
                          {suggestion.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {issues.length === 0 && suggestions.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>表单校验通过！</p>
            <p className="text-sm mt-1">未发现任何问题</p>
          </div>
        )}
      </div>
    </AIGenerateModal>
  );
}
