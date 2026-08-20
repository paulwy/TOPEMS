/**
 * @done V80 split
 * AI Assistant page centralized state + API call hook.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/store';
import { assistantApi } from '@/api/ai';
import type {
  ReportAssistantResponse,
  FlowAssistantResponse,
  AnomalyPredictResponse,
  KnowledgeAskResponse,
} from '@/api/ai';

type AiAssistantTab = 'report' | 'flow' | 'knowledge';

interface UseAiAssistantResult {
  activeTab: AiAssistantTab;
  setActiveTab: (tab: AiAssistantTab) => void;
  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;

  // report
  reportQuery: string;
  setReportQuery: (v: string) => void;
  reportDataSource: string;
  setReportDataSource: (v: string) => void;
  reportTimeRange: string;
  setReportTimeRange: (v: string) => void;
  reportResult: ReportAssistantResponse | null;
  handleReportSubmit: () => Promise<void>;

  // flow
  flowQuery: string;
  setFlowQuery: (v: string) => void;
  flowModule: string;
  setFlowModule: (v: string) => void;
  flowResult: FlowAssistantResponse | null;
  handleFlowSubmit: () => Promise<void>;

  // anomaly
  anomalyMetric: string;
  setAnomalyMetric: (v: string) => void;
  anomalyTimeRange: string;
  setAnomalyTimeRange: (v: string) => void;
  anomalyResult: AnomalyPredictResponse | null;
  handleAnomalySubmit: () => Promise<void>;

  // knowledge
  knowledgeQuestion: string;
  setKnowledgeQuestion: (v: string) => void;
  knowledgeBase: string;
  setKnowledgeBase: (v: string) => void;
  knowledgeResult: KnowledgeAskResponse | null;
  handleKnowledgeSubmit: () => Promise<void>;
}

const useAiAssistant = (): UseAiAssistantResult => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTabState] = useState<AiAssistantTab>('report');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // report form
  const [reportQuery, setReportQuery] = useState('');
  const [reportDataSource, setReportDataSource] = useState('');
  const [reportTimeRange, setReportTimeRange] = useState('');
  const [reportResult, setReportResult] = useState<ReportAssistantResponse | null>(null);

  // flow form
  const [flowQuery, setFlowQuery] = useState('');
  const [flowModule, setFlowModule] = useState('');
  const [flowResult, setFlowResult] = useState<FlowAssistantResponse | null>(null);

  // anomaly form
  const [anomalyMetric, setAnomalyMetric] = useState('');
  const [anomalyTimeRange, setAnomalyTimeRange] = useState('');
  const [anomalyResult, setAnomalyResult] = useState<AnomalyPredictResponse | null>(null);

  // knowledge form
  const [knowledgeQuestion, setKnowledgeQuestion] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [knowledgeResult, setKnowledgeResult] = useState<KnowledgeAskResponse | null>(null);

  const setActiveTab = (tab: AiAssistantTab) => {
    setActiveTabState(tab);
    setError(null);
  };

  const handleReportSubmit = async () => {
    if (!reportQuery.trim()) {
      setError(t('ai.assistant.report.message.input_query'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.reportAssistant({
        query: reportQuery,
        data_source: reportDataSource || undefined,
        time_range: reportTimeRange || undefined,
      });
      if (response.success && response.data) {
        setReportResult(response.data);
      } else {
        setError(response.message || t('ai.assistant.report.message.fail'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('ai.assistant.message.request_fail');
      setError(message);
      addNotification({ title: t('ai.assistant.tab.report'), message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFlowSubmit = async () => {
    if (!flowQuery.trim()) {
      setError(t('ai.assistant.flow.message.input_query'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.flowAssistant({
        query: flowQuery,
        module: flowModule || undefined,
      });
      if (response.success && response.data) {
        setFlowResult(response.data);
      } else {
        setError(response.message || t('ai.assistant.flow.message.fail'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('ai.assistant.message.request_fail');
      setError(message);
      addNotification({ title: t('ai.assistant.tab.flow'), message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAnomalySubmit = async () => {
    if (!anomalyMetric.trim()) {
      setError(t('ai.assistant.anomaly.message.input_metric'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.anomalyPredict({
        metric: anomalyMetric,
        time_range: anomalyTimeRange || undefined,
      });
      if (response.success && response.data) {
        setAnomalyResult(response.data);
      } else {
        setError(response.message || t('ai.assistant.anomaly.message.fail'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('ai.assistant.message.request_fail');
      setError(message);
      addNotification({ title: t('ai.assistant.anomaly.section_title'), message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleKnowledgeSubmit = async () => {
    if (!knowledgeQuestion.trim()) {
      setError(t('ai.assistant.knowledge.message.input_question'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.knowledgeAsk({
        question: knowledgeQuestion,
        knowledge_base: knowledgeBase || undefined,
      });
      if (response.success && response.data) {
        setKnowledgeResult(response.data);
      } else {
        setError(response.message || t('ai.assistant.knowledge.message.fail'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('ai.assistant.message.request_fail');
      setError(message);
      addNotification({ title: t('ai.assistant.tab.knowledge'), message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    error,
    setError,
    reportQuery,
    setReportQuery,
    reportDataSource,
    setReportDataSource,
    reportTimeRange,
    setReportTimeRange,
    reportResult,
    handleReportSubmit,
    flowQuery,
    setFlowQuery,
    flowModule,
    setFlowModule,
    flowResult,
    handleFlowSubmit,
    anomalyMetric,
    setAnomalyMetric,
    anomalyTimeRange,
    setAnomalyTimeRange,
    anomalyResult,
    handleAnomalySubmit,
    knowledgeQuestion,
    setKnowledgeQuestion,
    knowledgeBase,
    setKnowledgeBase,
    knowledgeResult,
    handleKnowledgeSubmit,
  };
};
