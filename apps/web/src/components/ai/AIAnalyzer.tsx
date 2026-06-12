import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  BarChart3,
  Users,
  Tag,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { AIGenerateModal } from "./AIGenerateModal";
import { aiApi } from "../../api/ai";

export interface AIAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onAnalysisComplete?: (_results: AnalysisResults) => void;
}

export interface AnalysisResults {
  sentiment?: SentimentResult;
  classification?: ClassificationResult;
  entities?: Entity[];
  keywords?: Keyword[];
}

export interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  details?: {
    positive_words?: string[];
    negative_words?: string[];
    emotional_intensity?: number;
  };
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  all_categories?: Array<{ category: string; score: number }>;
}

export interface Entity {
  text: string;
  entity_type: string;
  start_pos?: number;
  end_pos?: number;
  confidence: number;
}

export interface Keyword {
  text: string;
  score: number;
  frequency: number;
}

const sentimentColors: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  positive: { bg: "bg-green-100", text: "text-green-700", label: "积极" },
  negative: { bg: "bg-red-100", text: "text-red-700", label: "消极" },
  neutral: { bg: "bg-gray-100", text: "text-gray-700", label: "中性" },
};

export function AIAnalyzer({
  isOpen,
  onClose,
  initialText = "",
  onAnalysisComplete,
}: AIAnalyzerProps) {
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sentimentResult, setSentimentResult] =
    useState<SentimentResult | null>(null);
  const [classificationResult, setClassificationResult] =
    useState<ClassificationResult | null>(null);
  const [entitiesResult, setEntitiesResult] = useState<Entity[]>([]);
  const [keywordsResult, setKeywordsResult] = useState<Keyword[]>([]);

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    sentiment: true,
    classify: true,
    entities: true,
    keywords: true,
  });

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      clearResults();
      if (initialText.trim()) {
        runAllAnalysis();
      }
    }
  }, [isOpen, initialText]);

  const clearResults = () => {
    setSentimentResult(null);
    setClassificationResult(null);
    setEntitiesResult([]);
    setKeywordsResult([]);
  };

  const runAllAnalysis = async () => {
    if (!text.trim()) return;

    setIsLoading(true);

    try {
      await Promise.all([
        analyzeSentiment(),
        classifyText(),
        extractEntities(),
        extractKeywords(),
      ]);

      onAnalysisComplete?.({
        sentiment: sentimentResult || undefined,
        classification: classificationResult || undefined,
        entities: entitiesResult.length > 0 ? entitiesResult : undefined,
        keywords: keywordsResult.length > 0 ? keywordsResult : undefined,
      });
    } catch (error) {
      console.error("分析失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSentiment = async () => {
    try {
      const response = await aiApi.analyzeSentiment({ text });
      if (response.success && response.data) {
        setSentimentResult({
          sentiment: response.data.sentiment as
            | "positive"
            | "negative"
            | "neutral",
          confidence: response.data.confidence,
          details: response.data.details as any,
        });
      }
    } catch (error) {
      console.error("情感分析失败:", error);
    }
  };

  const classifyText = async () => {
    try {
      const response = await aiApi.classifyText({ text });
      if (response.success && response.data) {
        setClassificationResult({
          category: response.data.category,
          confidence: response.data.confidence,
          all_categories: response.data.all_categories,
        });
      }
    } catch (error) {
      console.error("文本分类失败:", error);
    }
  };

  const extractEntities = async () => {
    try {
      const response = await aiApi.extractEntities({ text });
      if (response.success && response.data) {
        setEntitiesResult(response.data.entities);
      }
    } catch (error) {
      console.error("实体提取失败:", error);
    }
  };

  const extractKeywords = async () => {
    try {
      const response = await aiApi.extractKeywords({ text });
      if (response.success && response.data) {
        setKeywordsResult(response.data.keywords);
      }
    } catch (error) {
      console.error("关键词提取失败:", error);
    }
  };

  const handleCopyResults = async () => {
    const results = {
      sentiment: sentimentResult,
      classification: classificationResult,
      entities: entitiesResult,
      keywords: keywordsResult,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 文本分析"
      description="分析文本的情感、分类、实体和关键词"
      isLoading={isLoading}
      onConfirm={undefined}
      confirmText=""
      extraActions={
        sentimentResult ||
        classificationResult ||
        entitiesResult.length > 0 ||
        keywordsResult.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyResults}
            className="flex items-center gap-1"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "已复制" : "复制结果"}
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">输入文本</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入需要分析的文本..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={4}
          />
        </div>

        <Button
          onClick={runAllAnalysis}
          disabled={isLoading || !text.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              分析中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              执行分析
            </>
          )}
        </Button>

        <div className="space-y-3">
          {/* 情感分析结果 */}
          {sentimentResult && (
            <Card>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection("sentiment")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">情感分析</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`${sentimentColors[sentimentResult.sentiment].bg} ${sentimentColors[sentimentResult.sentiment].text}`}
                        >
                          {sentimentColors[sentimentResult.sentiment].label}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          置信度: {Math.round(sentimentResult.confidence * 100)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedSections.sentiment ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {expandedSections.sentiment && sentimentResult.details && (
                  <div className="mt-4 space-y-3">
                    {sentimentResult.details.positive_words &&
                      sentimentResult.details.positive_words.length > 0 && (
                        <div>
                          <p className="text-xs text-green-600 font-medium">
                            积极词汇
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sentimentResult.details.positive_words.map(
                              (word, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="bg-green-50 text-green-700"
                                >
                                  {word}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    {sentimentResult.details.negative_words &&
                      sentimentResult.details.negative_words.length > 0 && (
                        <div>
                          <p className="text-xs text-red-600 font-medium">
                            消极词汇
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sentimentResult.details.negative_words.map(
                              (word, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="bg-red-50 text-red-700"
                                >
                                  {word}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    {sentimentResult.details.emotional_intensity !==
                      undefined && (
                      <div>
                        <p className="text-xs text-gray-600 font-medium">
                          情感强度
                        </p>
                        <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{
                              width: `${sentimentResult.details.emotional_intensity * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 文本分类结果 */}
          {classificationResult && (
            <Card>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection("classify")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">文本分类</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-blue-100 text-blue-700">
                          {classificationResult.category}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          置信度:{" "}
                          {Math.round(classificationResult.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedSections.classify ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {expandedSections.classify &&
                  classificationResult.all_categories &&
                  classificationResult.all_categories.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-600 font-medium">
                        各类别得分
                      </p>
                      <div className="space-y-2 mt-2">
                        {classificationResult.all_categories.map(
                          (item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <span className="text-sm text-gray-700 w-20 truncate">
                                {item.category}
                              </span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${item.score * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-12 text-right">
                                {Math.round(item.score * 100)}%
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* 实体提取结果 */}
          {entitiesResult.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection("entities")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">实体提取</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        共识别到 {entitiesResult.length} 个实体
                      </p>
                    </div>
                  </div>
                  {expandedSections.entities ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {expandedSections.entities && (
                  <div className="mt-4 space-y-2">
                    {entitiesResult.map((entity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <Badge className="bg-green-100 text-green-700">
                          {entity.entity_type}
                        </Badge>
                        <span className="flex-1 font-medium">
                          {entity.text}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(entity.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 关键词提取结果 */}
          {keywordsResult.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection("keywords")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Tag className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">关键词提取</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        共提取到 {keywordsResult.length} 个关键词
                      </p>
                    </div>
                  </div>
                  {expandedSections.keywords ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {expandedSections.keywords && (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {keywordsResult.map((keyword, idx) => (
                        <Badge
                          key={idx}
                          className="bg-orange-100 text-orange-700 px-3 py-1"
                        >
                          {keyword.text}
                          <span className="ml-1 text-xs opacity-70">
                            ({keyword.frequency})
                          </span>
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      {keywordsResult.slice(0, 5).map((keyword, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-24 truncate">
                            {keyword.text}
                          </span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${keyword.score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            频率: {keyword.frequency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AIGenerateModal>
  );
}
