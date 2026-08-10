/**
 * @done V80 split
 * Knowledge base Q&A tab: question form + answer / sources / follow-ups.
 */
import React from 'react';
import { Box, Typography, TextField, Button, Paper, Chip, CircularProgress } from '@mui/material';
import { Send, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { KnowledgeAskResponse } from '@/api/ai';

const KnowledgeResultView: React.FC<{ result: KnowledgeAskResponse }> = ({ result }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mt: 3 }}>
      <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Sparkles size={18} />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {t('ai.assistant.knowledge.ai_answer')}
          </Typography>
        </Box>
        <Typography
          variant='body1'
          sx={{ whiteSpace: 'pre-wrap' }}
        >
          {result.answer}
        </Typography>
      </Paper>
      <Box sx={{ mt: 2 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1 }}
        >
          {t('ai.assistant.knowledge.reference_source')}
        </Typography>
        {result.sources.map((source, index) => (
          <Paper
            key={index}
            sx={{ p: 2, mb: 1 }}
            variant='outlined'
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {source.title}
            </Typography>
            {source.content && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {source.content}
              </Typography>
            )}
            {source.relevance !== undefined && (
              <Chip
                label={t('ai.assistant.knowledge.relevance', {
                  pct: (source.relevance * 100).toFixed(0),
                })}
                size='small'
                sx={{ mt: 0.5 }}
              />
            )}
          </Paper>
        ))}
      </Box>
      {result.follow_up_questions && result.follow_up_questions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1 }}
          >
            {t('ai.assistant.knowledge.follow_up')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {result.follow_up_questions.map((question, index) => (
              <Chip
                key={index}
                label={question}
                variant='outlined'
                size='small'
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export interface AiAssistantKnowledgeTabProps {
  knowledgeQuestion: string;
  setKnowledgeQuestion: (v: string) => void;
  knowledgeBase: string;
  setKnowledgeBase: (v: string) => void;
  knowledgeResult: KnowledgeAskResponse | null;
  loading: boolean;
  onSubmit: () => void;
}

const AiAssistantKnowledgeTab: React.FC<AiAssistantKnowledgeTabProps> = ({
  knowledgeQuestion,
  setKnowledgeQuestion,
  knowledgeBase,
  setKnowledgeBase,
  knowledgeResult,
  loading,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.knowledge.title')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.knowledge.desc')}
        </Typography>
        <TextField
          fullWidth
          label={t('ai.assistant.knowledge.label.question')}
          placeholder={t('ai.assistant.knowledge.placeholder.question')}
          value={knowledgeQuestion}
          onChange={(e) => setKnowledgeQuestion(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label={t('ai.assistant.knowledge.label.base')}
          placeholder={t('ai.assistant.knowledge.placeholder.base')}
          value={knowledgeBase}
          onChange={(e) => setKnowledgeBase(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant='contained'
          startIcon={
            loading ? (
              <CircularProgress
                size={18}
                color='inherit'
              />
            ) : (
              <Send size={18} />
            )
          }
          onClick={onSubmit}
          disabled={loading || !knowledgeQuestion.trim()}
        >
          {t('ai.assistant.knowledge.button.ask')}
        </Button>
      </Paper>
      {knowledgeResult && <KnowledgeResultView result={knowledgeResult} />}
    </Box>
  );
};

export default AiAssistantKnowledgeTab;
