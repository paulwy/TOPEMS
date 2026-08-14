import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Paper } from '@mui/material';
import { CheckSquare, FileEdit, FileText, Sparkles } from 'lucide-react';
import type { AICopilotIntent } from '@/lib/ai/copilotContext';
import i18n from '@/i18n';

interface SelectionState {
  text: string;
  top: number;
  left: number;
}

interface AISelectionBubbleProps {
  onAction: (intent: AICopilotIntent, selectedText: string) => void;
}

const selectionActions: Array<{
  intent: AICopilotIntent;
  label: string;
  icon: React.ReactNode;
}> = [
  { intent: 'explain', label: i18n.t('ai.ai_selection_bubble.k0'), icon: <Sparkles style={{ width: 14, height: 14 }} /> },
  { intent: 'summarize', label: i18n.t('ai.ai_selection_bubble.k1'), icon: <FileText style={{ width: 14, height: 14 }} /> },
  { intent: 'rewrite', label: i18n.t('ai.ai_selection_bubble.k2'), icon: <FileEdit style={{ width: 14, height: 14 }} /> },
  { intent: 'todo', label: i18n.t('ai.ai_selection_bubble.k3'), icon: <CheckSquare style={{ width: 14, height: 14 }} /> },
];

function isEditableElement(node: Node | null): boolean {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const element = node as HTMLElement;
  return Boolean(element.closest('input, textarea, [contenteditable="true"]'));
}

export const AISelectionBubble: React.FC<AISelectionBubbleProps> = ({ onAction }) => {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const refreshSelection = useCallback(() => {
    const activeSelection = window.getSelection();
    const selectedText = activeSelection?.toString().trim() || '';

    if (!activeSelection || selectedText.length < 2 || isEditableElement(activeSelection.anchorNode)) {
      setSelection(null);
      return;
    }

    const range = activeSelection.rangeCount > 0 ? activeSelection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setSelection(null);
      return;
    }

    setSelection({
      text: selectedText.slice(0, 1000),
      top: Math.max(12, rect.top + window.scrollY - 48),
      left: Math.min(window.innerWidth - 260, Math.max(12, rect.left + window.scrollX)),
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshSelection);
    window.addEventListener('scroll', refreshSelection, true);
    window.addEventListener('resize', refreshSelection);

    return () => {
      document.removeEventListener('selectionchange', refreshSelection);
      window.removeEventListener('scroll', refreshSelection, true);
      window.removeEventListener('resize', refreshSelection);
    };
  }, [refreshSelection]);

  if (!selection) return null;

  return (
    <Paper
      elevation={8}
      className='ai-selection-bubble'
      sx={{
        position: 'absolute',
        top: selection.top,
        left: selection.left,
        zIndex: (theme) => theme.zIndex.modal + 1,
        p: 0.5,
        borderRadius: 2,
        display: 'flex',
        gap: 0.5,
        alignItems: 'center',
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {selectionActions.map((action) => (
        <Button
          key={action.intent}
          size='small'
          startIcon={action.icon}
          onClick={() => {
            onAction(action.intent, selection.text);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          sx={{ minWidth: 0, px: 1 }}
        >
          {action.label}
        </Button>
      ))}
      <Box sx={{ width: 1, height: 20, bgcolor: 'divider', mx: 0.25 }} />
      <Button
        size='small'
        color='inherit'
        onClick={() => setSelection(null)}
        sx={{ minWidth: 0, px: 1 }}
      >
        {i18n.t('components.ai_selection_bubble.k0')}
      </Button>
    </Paper>
  );
};

export default AISelectionBubble;
