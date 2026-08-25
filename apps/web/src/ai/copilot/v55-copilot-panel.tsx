import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Users } from 'lucide-react';
import i18n from '@/i18n';
import type { SymbolInfo, FileStructure, SearchResult } from './code-navigator';
import type { DocTemplate, GenerateDocOptions, ChangelogEntry } from './doc-generator';
import type { QAEntry, KnowledgeDocument, QAResult } from './knowledge-qa';

const V55CopilotPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Users size={20} />
          <Typography variant='h6'>{i18n.t('ai.v55-copilot-panel.title')}</Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size='small'
        >
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {i18n.t('ai.v55-copilot-panel.disabled')}
      </Typography>
    </Box>
  );
};

export { V55CopilotPanel };
export default V55CopilotPanel;
