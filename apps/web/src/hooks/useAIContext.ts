import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildAICopilotContext,
  getModuleFromPath,
  type AICopilotContext,
} from '@/lib/ai/copilotContext';
import {
  getRecommendations,
  getTopRecommendations,
  quickCommands,
  type AIRecommendation,
  type QuickCommand,
} from '@/lib/ai/recommendations';

export type { AIRecommendation, QuickCommand } from '@/lib/ai/recommendations';

export interface AIContextState {
  currentPage: string;
  module: string;
  context: AICopilotContext;
  recommendations: AIRecommendation[];
  topRecommendations: AIRecommendation[];
  quickCommands: QuickCommand[];
}

export function useAIContext(): AIContextState {
  const location = useLocation();

  const module = useMemo(() => getModuleFromPath(location.pathname), [location.pathname]);

  const context = useMemo(
    () =>
      buildAICopilotContext({
        pathname: location.pathname,
        source: 'fab',
        intent: 'chat',
      }),
    [location.pathname]
  );

  const recommendations = useMemo(() => getRecommendations(context), [context]);
  const topRecommendations = useMemo(() => getTopRecommendations(context, 3), [context]);

  return {
    currentPage: location.pathname,
    module,
    context,
    recommendations,
    topRecommendations,
    quickCommands,
  };
}

export default useAIContext;
