import React, { useState, useCallback } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { Search, Send } from 'lucide-react';

interface AICopilotSearchBoxProps {
  onSubmit: (query: string) => void;
}

export const AICopilotSearchBox: React.FC<AICopilotSearchBoxProps> = ({ onSubmit }) => {
  const [query, setQuery] = useState('');

  const submit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setQuery('');
  }, [onSubmit, query]);

  return (
    <TextField
      fullWidth
      size='small'
      placeholder='搜索或向 AI 提问...'
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          submit();
        }
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position='start'>
              <Search style={{ width: 18, height: 18 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position='end'>
              <IconButton
                size='small'
                onClick={submit}
                aria-label='发送'
              >
                <Send style={{ width: 16, height: 16 }} />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default AICopilotSearchBox;
