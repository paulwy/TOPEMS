import { designTokens } from '@topems/tokens';
/**
 * Chat header - title, model selector, mobile sidebar toggle and tabs.
 */
import React from 'react';
import { Sparkles, ChevronRight, RefreshCw } from 'lucide-react';
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getTypeLabel, type ChatMode, type ChatSession } from '../hooks/useAiChat';

interface ChatHeaderProps {
  selectedSession: ChatSession | undefined;
  selectedModel: string;
  activeTab: ChatMode;
  onToggleSidebar: () => void;
  onChangeModel: (model: string) => void;
  onNewChat: () => void;
  onChangeTab: (tab: ChatMode) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedSession,
  selectedModel,
  activeTab,
  onToggleSidebar,
  onChangeModel,
  onNewChat,
  onChangeTab,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size='small'
            onClick={onToggleSidebar}
            sx={{ display: { md: 'none' } }}
            aria-label={t('ai.chat_header.k0')}
          >
            <ChevronRight size={20} />
          </IconButton>
          <Sparkles
            size={20}
            color='primary.main'
          />
          <Typography variant='h6'>
            {selectedSession?.title || t('ai.chat.title.default')}
          </Typography>
          {selectedSession && (
            <Chip
              label={getTypeLabel(selectedSession.type, t)}
              size='small'
              color='primary'
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl
            size='small'
            sx={{ minWidth: 150 }}
          >
            <InputLabel>{t('ai.chat.field.model')}</InputLabel>
            <Select
              value={selectedModel}
              label={t('ai.chat.field.model')}
              onChange={(e) => onChangeModel(e.target.value)}
            >
              <MenuItem value='gpt-4'>GPT-4</MenuItem>
              <MenuItem value='gpt-3.5'>GPT-3.5</MenuItem>
              <MenuItem value='claude'>Claude</MenuItem>
              <MenuItem value='ERNIE'>{t('ai.chat.model.ernie')}</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            onClick={onNewChat}
            aria-label={t('ai.chat.action.new_chat')}
          >
            <RefreshCw size={20} />
          </IconButton>
        </Box>
      </Box>

      {/* Mobile tabs */}
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', display: { md: 'none' } }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => onChangeTab(v)}
          variant='scrollable'
          scrollButtons='auto'
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            },
          }}
        >
          <Tab
            label={t('ai.chat.tab.qa')}
            value='qa'
          />
          <Tab
            label={t('ai.chat.tab.summary')}
            value='summary'
          />
          <Tab
            label={t('ai.chat.tab.code')}
            value='code'
          />
          <Tab
            label={t('ai.chat.tab.general')}
            value='general'
          />
        </Tabs>
      </Box>
    </>
  );
};

export default ChatHeader;
