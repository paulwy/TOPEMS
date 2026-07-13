import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

interface SearchShortcutsProps {
  onSelect: (text: string) => void;
}

export const SearchShortcuts: React.FC<SearchShortcutsProps> = ({ onSelect }) => {
  const shortcuts = [
    { text: '我的任务', hint: '查看待办任务' },
    { text: '客户管理', hint: '进入客户列表' },
    { text: '订单列表', hint: '查看销售订单' },
    { text: '系统设置', hint: '配置系统参数' },
  ];

  return (
    <Box sx={{ p: 2, pb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        快捷搜索
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {shortcuts.map((s) => (
          <Chip
            key={s.text}
            label={s.text}
            size="small"
            variant="outlined"
            onClick={() => onSelect(s.text)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default SearchShortcuts;
