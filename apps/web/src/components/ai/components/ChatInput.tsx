/**
 * Chat input area - text field, send button, code language selector, and
 * summary document-upload trigger.
 */
import React from 'react';
import { Send, FileText } from 'lucide-react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ChatMode } from '../hooks/useAiChat';

export interface ChatInputProps {
  activeTab: ChatMode;
  inputValue: string;
  isTyping: boolean;
  codeLanguage: string;
  onChangeInput: (value: string) => void;
  onChangeCodeLanguage: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onOpenDocUpload: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  activeTab,
  inputValue,
  isTyping,
  codeLanguage,
  onChangeInput,
  onChangeCodeLanguage,
  onKeyPress,
  onSend,
  onOpenDocUpload,
}) => {
  const { t } = useTranslation();

  const placeholder =
    activeTab === 'qa'
      ? t('ai.chat.placeholder.qa')
      : activeTab === 'summary'
        ? t('ai.chat.placeholder.summary')
        : activeTab === 'code'
          ? t('ai.chat.placeholder.code')
          : t('ai.chat.placeholder.general');

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      {activeTab === 'code' && (
        <Box sx={{ mb: 2 }}>
          <FormControl
            size='small'
            sx={{ width: 200 }}
          >
            <InputLabel>{t('ai.chat.field.code_language')}</InputLabel>
            <Select
              value={codeLanguage}
              label={t('ai.chat.field.code_language')}
              onChange={(e) => onChangeCodeLanguage(e.target.value)}
            >
              <MenuItem value='typescript'>TypeScript</MenuItem>
              <MenuItem value='javascript'>JavaScript</MenuItem>
              <MenuItem value='python'>Python</MenuItem>
              <MenuItem value='java'>Java</MenuItem>
              <MenuItem value='sql'>SQL</MenuItem>
              <MenuItem value='go'>Go</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {activeTab === 'summary' && (
            <Button
              size='small'
              variant='outlined'
              startIcon={<FileText size={16} />}
              onClick={onOpenDocUpload}
            >
              {t('ai.chat.action.upload_document')}
            </Button>
          )}
        </Box>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={onKeyPress}
          size='small'
        />
        <Button
          variant='contained'
          onClick={onSend}
          disabled={!inputValue.trim() || isTyping}
        >
          <Send size={20} />
        </Button>
      </Box>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mt: 1, display: 'block' }}
      >
        {t('ai.chat.disclaimer')}
      </Typography>
    </Box>
  );
};

export default ChatInput;
