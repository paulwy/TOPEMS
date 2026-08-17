import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AI_PATHS } from '@/modules/ai/config';
import { useAIContext } from '@/hooks';
import { AICopilotFab, AICopilotPanel, AISelectionBubble } from '@/components/ai/copilot';
import { writeAICopilotContext, type AICopilotIntent } from '@/lib/ai/copilotContext';
import type { AIRecommendation, QuickCommand } from '@/lib/ai/recommendations';

export const FloatingAIHelper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { topRecommendations, quickCommands } = useAIContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const open = Boolean(anchorEl);

  const openPanel = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      writeAICopilotContext({
        pathname: location.pathname,
        source: 'fab',
        intent: 'chat',
      });
      setAnchorEl(event.currentTarget);
    },
    [location.pathname]
  );

  const closePanel = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const openFullAssistant = useCallback(() => {
    writeAICopilotContext({
      pathname: location.pathname,
      source: 'fab',
      intent: 'chat',
    });
    closePanel();
    navigate(AI_PATHS.root);
  }, [closePanel, location.pathname, navigate]);

  const handleSearch = useCallback(
    (query: string) => {
      writeAICopilotContext({
        pathname: location.pathname,
        source: 'fab',
        intent: 'chat',
        query,
      });
      closePanel();
      navigate(`${AI_PATHS.root}?query=${encodeURIComponent(query)}`);
    },
    [closePanel, location.pathname, navigate]
  );

  const handleRecommendationSelect = useCallback(
    (recommendation: AIRecommendation) => {
      writeAICopilotContext({
        pathname: location.pathname,
        source: 'fab',
        intent: 'recommendation',
        recommendationId: recommendation.id,
      });
      closePanel();
      navigate(recommendation.action);
    },
    [closePanel, location.pathname, navigate]
  );

  const handleCommandSelect = useCallback(
    (command: QuickCommand) => {
      writeAICopilotContext({
        pathname: location.pathname,
        source: 'fab',
        intent: 'chat',
        query: command.command,
      });
      closePanel();
      navigate(command.action);
    },
    [closePanel, location.pathname, navigate]
  );

  const handleSelectionAction = useCallback(
    (intent: AICopilotIntent, selectedText: string) => {
      writeAICopilotContext({
        pathname: location.pathname,
        source: 'selection',
        intent,
        selectedText,
      });
      navigate(AI_PATHS.root);
    },
    [location.pathname, navigate]
  );

  return (
    <>
      <AICopilotFab onClick={openPanel} />
      <AICopilotPanel
        anchorEl={anchorEl}
        open={open}
        onClose={closePanel}
        recommendations={topRecommendations}
        commands={quickCommands}
        onSearch={handleSearch}
        onRecommendationSelect={handleRecommendationSelect}
        onCommandSelect={handleCommandSelect}
        onOpenFull={openFullAssistant}
      />
      <AISelectionBubble onAction={handleSelectionAction} />
    </>
  );
};

export default FloatingAIHelper;
