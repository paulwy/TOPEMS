import { useState, useEffect } from "react";
import { Sparkles, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { AIGenerateModal } from "./AIGenerateModal";
import { useAIHelper } from "../../hooks/useAIHelper";
import type { CompleteRequest, CompletionItem } from "../../types/ai";

export interface AIDataCompleterProps {
  isOpen: boolean;
  onClose: () => void;
  completeRequest: CompleteRequest;
  onApplyCompletion: (completions: Record<string, CompletionItem>) => void;
}

const sourceColorMap: Record<string, string> = {
  inference: "bg-purple-100 text-purple-700",
  history: "bg-blue-100 text-blue-700",
  knowledge: "bg-green-100 text-green-700",
};

const sourceLabelMap: Record<string, string> = {
  inference: "智能推断",
  history: "历史数据",
  knowledge: "知识库",
};

export function AIDataCompleter({
  isOpen,
  onClose,
  completeRequest,
  onApplyCompletion,
}: AIDataCompleterProps) {
  const [completions, setCompletions] = useState<
    Record<string, CompletionItem>
  >({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const { isLoading, complete } = useAIHelper({
    featureType: "complete",
    onSuccess: (result) => {
      if (result?.completions) {
        setCompletions(result.completions);
        // 默认选中所有推荐字段
        setSelectedFields(new Set(Object.keys(result.completions)));
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      setCompletions({});
      setSelectedFields(new Set());
      handleComplete();
    }
  }, [isOpen]);

  const handleComplete = async () => {
    // 兼容 data 和 partialData 字段
    const request = {
      ...completeRequest,
      partialData: completeRequest.partialData || completeRequest.data,
    };
    await complete(request);
  };

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleApply = () => {
    const selectedCompletions: Record<string, CompletionItem> = {};
    selectedFields.forEach((field) => {
      if (completions[field]) {
        selectedCompletions[field] = completions[field];
      }
    });
    onApplyCompletion(selectedCompletions);
    onClose();
  };

  const selectAll = () => {
    setSelectedFields(new Set(Object.keys(completions)));
  };

  const selectNone = () => {
    setSelectedFields(new Set());
  };

  const hasCompletions = Object.keys(completions).length > 0;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 智能补全"
      description="AI 根据已有信息推断并补全相关字段"
      isLoading={isLoading}
      onConfirm={
        hasCompletions && selectedFields.size > 0 ? handleApply : undefined
      }
      confirmText="应用所选"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>推荐补全的字段</Label>
          {hasCompletions && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={selectAll}>
                全选
              </Button>
              <Button variant="secondary" size="sm" onClick={selectNone}>
                取消
              </Button>
            </div>
          )}
        </div>

        {hasCompletions ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {Object.entries(completions).map(([field, item]) => (
              <Card
                key={field}
                className={`cursor-pointer transition-all ${
                  selectedFields.has(field)
                    ? "border-purple-500 bg-purple-50"
                    : "hover:border-purple-200"
                }`}
                onClick={() => toggleField(field)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
                      ${selectedFields.has(field) ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"}
                    `}
                    >
                      {selectedFields.has(field) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{field}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${sourceColorMap[item.source] || sourceColorMap.inference}`}
                        >
                          {sourceLabelMap[item.source] || item.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-mono text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 flex-1">
                          {item.value}
                        </span>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>置信度:</span>
                          <div className="ml-1 flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500"
                                style={{ width: `${item.confidence * 100}%` }}
                              />
                            </div>
                            <span>{Math.round(item.confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>正在分析数据...</p>
          </div>
        )}
      </div>
    </AIGenerateModal>
  );
}
