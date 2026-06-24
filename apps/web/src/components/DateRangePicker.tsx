import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Menu, MenuItem, TextField, Paper } from '@mui/material';
import { Button } from '@mui/material';
import { getDateRange } from '../utils/export';

interface DateRangePickerProps {
  value: { start: string; end: string };
  onChange: (_range: { start: string; end: string }) => void;
}

const presets = [
  { id: 'today', label: '今天' },
  { id: 'yesterday', label: '昨天' },
  { id: 'week', label: '最近7天' },
  { id: 'month', label: '最近30天' },
  { id: 'quarter', label: '最近90天' },
  { id: 'year', label: '最近一年' },
];

export const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  const handlePresetClick = (presetId: string) => {
    const range = getDateRange(presetId);
    onChange(range);
    setAnchorEl(null);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ start: customStart, end: customEnd });
      setAnchorEl(null);
    }
  };

  return (
    <>
      <Button
        variant='outlined'
        size='small'
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ textTransform: 'none' }}
      >
        <Calendar sx={{ width: 16, height: 16, marginRight: 8 }} />
        <span className='hidden sm:inline'>
          {value.start === value.end ? value.start : `${value.start} - ${value.end}`}
        </span>
        <ChevronDown sx={{ width: 16, height: 16, marginLeft: 4 }} />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <Paper sx={{ padding: 2, minWidth: 300 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant='text'
                size='small'
                onClick={() => handlePresetClick(preset.id)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div
            style={{
              borderTop: '1px solid rgba(0,0,0,0.1)',
              marginTop: 16,
              paddingTop: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <TextField
                type='date'
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                size='small'
                sx={{ flex: 1 }}
              />
              <span style={{ color: 'text.secondary' }}>至</span>
              <TextField
                type='date'
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                size='small'
                sx={{ flex: 1 }}
              />
            </div>
            <Button
              onClick={handleCustomApply}
              fullWidth
            >
              应用自定义范围
            </Button>
          </div>
        </Paper>
      </Menu>
    </>
  );
};
