import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { getDateRange } from '../utils/export';

interface DateRangePickerProps {
  value: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
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
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  const handlePresetClick = (presetId: string) => {
    const range = getDateRange(presetId);
    onChange(range);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ start: customStart, end: customEnd });
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2'>
          <Calendar className='w-4 h-4' />
          <span className='hidden sm:inline'>
            {value.start === value.end ? value.start : `${value.start} - ${value.end}`}
          </span>
          <ChevronDown className='w-4 h-4' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0'>
        <div className='p-4 space-y-4'>
          <div className='grid grid-cols-3 gap-2'>
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className='px-3 py-2 text-sm rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors'
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className='border-t border-gray-200 pt-4 space-y-3'>
            <div className='flex items-center gap-2'>
              <input
                type='date'
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className='flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <span className='text-gray-400'>至</span>
              <input
                type='date'
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className='flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
            <Button onClick={handleCustomApply} className='w-full'>
              应用自定义范围
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
