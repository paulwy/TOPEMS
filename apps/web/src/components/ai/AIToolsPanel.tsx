import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Alert,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { FileJson, Calendar, Calculator, Shield, Copy, Check, ArrowRightLeft } from 'lucide-react';

const JsonFormatter: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message);
      setOutput('');
    }
  }, [input]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (e: unknown) {
      setError((e as Error).message);
      setOutput('');
    }
  }, [input]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography
        variant='subtitle2'
        sx={{ mb: 1.5, fontWeight: 600 }}
      >
        {i18n.t('components.ai_tools_panel.json_0')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Button
          size='small'
          variant='outlined'
          onClick={handleFormat}
        >
          {i18n.t('components.ai_tools_panel.k1')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          onClick={handleMinify}
        >
          {i18n.t('components.ai_tools_panel.k2')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          onClick={handleClear}
        >
          {i18n.t('components.ai_tools_panel.k3')}
        </Button>
      </Box>

      <TextField
        multiline
        rows={4}
        fullWidth
        placeholder={i18n.t('components.ai_tools_panel.json_4')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        sx={{ mb: 1.5 }}
        size='small'
      />

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 1.5, fontSize: '0.75rem' }}
        >
          {error}
        </Alert>
      )}

      {output && (
        <Box sx={{ position: 'relative' }}>
          <TextField
            inputRef={outputRef}
            multiline
            rows={5}
            fullWidth
            value={output}
            disabled
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip
              title={
                copied
                  ? i18n.t('components.ai_tools_panel.k1')
                  : i18n.t('components.ai_tools_panel.k0')
              }
            >
              <IconButton
                size='small'
                onClick={handleCopy}
                color={copied ? 'success' : 'primary'}
                aria-label={i18n.t('components.ai_tools_panel.k2')}
              >
                {copied ? (
                  <Check style={{ width: 16, height: 16 }} />
                ) : (
                  <Copy style={{ width: 16, height: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const DateCalculator: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [result, setResult] = useState<{
    days: number;
    workdays: number;
    weekends: number;
  } | null>(null);

  const calculate = useCallback(() => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let workdays = 0;
    let weekends = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends++;
      } else {
        workdays++;
      }
    }

    setResult({ days: diffDays, workdays, weekends });
  }, [startDate, endDate]);

  const addDays = useCallback(
    (days: number) => {
      const base = startDate || today;
      const date = new Date(base);
      date.setDate(date.getDate() + days);
      setStartDate(date.toISOString().split('T')[0]);
    },

    [startDate]
  );

  const setToToday = useCallback(() => {
    setStartDate(today);
    setEndDate(today);
    calculate();
  }, [today, calculate]);

  const clear = useCallback(() => {
    setStartDate(today);
    setEndDate('');
    setResult(null);
  }, [today]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography
        variant='subtitle2'
        sx={{ mb: 1.5, fontWeight: 600 }}
      >
        {i18n.t('components.ai_tools_panel.k5')}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <TextField
          type='date'
          size='small'
          label={i18n.t('components.ai_tools_panel.k3')}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          type='date'
          size='small'
          label={i18n.t('components.ai_tools_panel.k4')}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Button
          size='small'
          variant='outlined'
          onClick={calculate}
        >
          {i18n.t('components.ai_tools_panel.k6')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          onClick={() => addDays(7)}
        >
          {i18n.t('components.ai_tools_panel.7_7')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          onClick={() => addDays(30)}
        >
          {i18n.t('components.ai_tools_panel.30_8')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          onClick={setToToday}
        >
          {i18n.t('components.ai_tools_panel.k9')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          onClick={clear}
        >
          {i18n.t('components.ai_tools_panel.k10')}
        </Button>
      </Box>

      {result && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<Calendar style={{ width: 14, height: 14 }} />}
            label={`${i18n.t('components.ai_tools_panel.k11')} ${result.days}`}
            size='small'
          />
          <Chip
            icon={<Calculator style={{ width: 14, height: 14 }} />}
            label={`${i18n.t('components.ai_tools_panel.k12')} ${result.workdays}`}
            size='small'
            color='primary'
          />
          <Chip
            label={`${i18n.t('components.ai_tools_panel.k13')} ${result.weekends}`}
            size='small'
            variant='outlined'
          />
        </Box>
      )}
    </Box>
  );
};

const unitCategories = {
  weight: {
    name: i18n.t('components.ai_tools_panel.k5'),
    units: [
      { label: i18n.t('components.ai_tools_panel.kg_6'), factor: 1 },
      { label: i18n.t('components.ai_tools_panel.g_7'), factor: 1000 },
      { label: i18n.t('components.ai_tools_panel.mg_8'), factor: 1000000 },
      { label: i18n.t('components.ai_tools_panel.t_9'), factor: 0.001 },
      { label: i18n.t('components.ai_tools_panel.lb_10'), factor: 2.20462 },
      { label: i18n.t('components.ai_tools_panel.oz_11'), factor: 35.274 },
    ],
  },
  volume: {
    name: i18n.t('components.ai_tools_panel.k12'),
    units: [
      { label: i18n.t('components.ai_tools_panel.l_13'), factor: 1 },
      { label: i18n.t('components.ai_tools_panel.ml_14'), factor: 1000 },
      { label: i18n.t('components.ai_tools_panel.m_14'), factor: 0.001 },
      { label: i18n.t('components.ai_tools_panel.cm_15'), factor: 1000 },
      { label: i18n.t('components.ai_tools_panel.gal_15'), factor: 0.264172 },
      { label: i18n.t('components.ai_tools_panel.qt_16'), factor: 1.05669 },
    ],
  },
  length: {
    name: i18n.t('components.ai_tools_panel.k17'),
    units: [
      { label: i18n.t('components.ai_tools_panel.m_18'), factor: 1 },
      { label: i18n.t('components.ai_tools_panel.cm_19'), factor: 100 },
      { label: i18n.t('components.ai_tools_panel.mm_20'), factor: 1000 },
      { label: i18n.t('components.ai_tools_panel.km_21'), factor: 0.001 },
      { label: i18n.t('components.ai_tools_panel.in_22'), factor: 39.3701 },
      { label: i18n.t('components.ai_tools_panel.ft_23'), factor: 3.28084 },
    ],
  },
  temperature: {
    name: i18n.t('components.ai_tools_panel.k24'),
    units: [
      { label: i18n.t('components.ai_tools_panel.c_16'), factor: 1, isSpecial: true },
      { label: i18n.t('components.ai_tools_panel.f_17'), factor: 1, isSpecial: true },
      { label: i18n.t('components.ai_tools_panel.k_25'), factor: 1, isSpecial: true },
    ],
  },
};

type CategoryKey = keyof typeof unitCategories;

const UnitConverter: React.FC = () => {
  const [category, setCategory] = useState<CategoryKey>('weight');
  const [fromValue, setFromValue] = useState('');
  const [fromUnit, setFromUnit] = useState(0);
  const [toUnit, setToUnit] = useState(1);
  const [copied, setCopied] = useState(false);

  const units = unitCategories[category].units;

  const calculate = useCallback(() => {
    if (!fromValue) return '';
    const value = parseFloat(fromValue);
    if (isNaN(value)) return '';

    if (category === 'temperature') {
      const fromLabel = units[fromUnit].label;
      const toLabel = units[toUnit].label;

      if (fromLabel.includes('°C') && toLabel.includes('°F')) {
        return ((value * 9) / 5 + 32).toFixed(2);
      } else if (fromLabel.includes('°F') && toLabel.includes('°C')) {
        return (((value - 32) * 5) / 9).toFixed(2);
      } else if (fromLabel.includes('°C') && toLabel.includes('K')) {
        return (value + 273.15).toFixed(2);
      } else if (fromLabel.includes('K') && toLabel.includes('°C')) {
        return (value - 273.15).toFixed(2);
      } else if (fromLabel.includes('°F') && toLabel.includes('K')) {
        return (((value - 32) * 5) / 9 + 273.15).toFixed(2);
      } else if (fromLabel.includes('K') && toLabel.includes('°F')) {
        return (((value - 273.15) * 9) / 5 + 32).toFixed(2);
      }
      return value.toString();
    }

    const fromFactor = units[fromUnit].factor;
    const toFactor = units[toUnit].factor;
    const baseValue = value / fromFactor;
    return (baseValue * toFactor).toFixed(6).replace(/\.?0+$/, '');
  }, [fromValue, fromUnit, toUnit, units, category]);

  const handleSwap = useCallback(() => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  }, [fromUnit, toUnit]);

  const handleCopy = useCallback(() => {
    const result = calculate();
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [calculate]);

  const result = calculate();

  return (
    <Box sx={{ p: 2 }}>
      <Typography
        variant='subtitle2'
        sx={{ mb: 1.5, fontWeight: 600 }}
      >
        {i18n.t('components.ai_tools_panel.k18')}
      </Typography>

      <FormControl
        fullWidth
        size='small'
        sx={{ mb: 1.5 }}
      >
        <InputLabel>{i18n.t('components.ai_tools_panel.k26')}</InputLabel>
        <TextField
          select
          value={category}
          label={i18n.t('components.ai_tools_panel.k27')}
          onChange={(e) => {
            setCategory(e.target.value as CategoryKey);
            setFromUnit(0);
            setToUnit(1);
          }}
          sx={{ minWidth: 120 }}
        >
          {(Object.keys(unitCategories) as CategoryKey[]).map((key) => (
            <option
              key={key}
              value={key}
            >
              {unitCategories[key].name}
            </option>
          ))}
        </TextField>
      </FormControl>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <TextField
          type='number'
          size='small'
          placeholder={i18n.t('components.ai_tools_panel.k28')}
          value={fromValue}
          onChange={(e) => setFromValue(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          size='small'
          value={fromUnit}
          onChange={(e) => setFromUnit(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {units.map((u, i) => (
            <option
              key={i}
              value={i}
            >
              {u.label}
            </option>
          ))}
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <Tooltip title={i18n.t('components.ai_tools_panel.k29')}>
          <IconButton
            size='small'
            onClick={handleSwap}
            aria-label={i18n.t('components.ai_tools_panel.k30')}
          >
            <ArrowRightLeft style={{ width: 18, height: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <TextField
          size='small'
          placeholder={i18n.t('components.ai_tools_panel.k31')}
          value={result}
          disabled
          sx={{ flex: 1 }}
        />
        <TextField
          select
          size='small'
          value={toUnit}
          onChange={(e) => setToUnit(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {units.map((u, i) => (
            <option
              key={i}
              value={i}
            >
              {u.label}
            </option>
          ))}
        </TextField>
        <Tooltip
          title={
            copied
              ? i18n.t('components.ai_tools_panel.k33')
              : i18n.t('components.ai_tools_panel.k32')
          }
        >
          <IconButton
            size='small'
            onClick={handleCopy}
            color={copied ? 'success' : 'primary'}
            aria-label={i18n.t('components.ai_tools_panel.k34')}
          >
            {copied ? (
              <Check style={{ width: 14, height: 14 }} />
            ) : (
              <Copy style={{ width: 14, height: 14 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

function getMaskTypes() {
  return [
    {
      id: 'phone',
      label: i18n.t('components.ai_tools_panel.k35'),
      pattern: /(\d{3})\d{4}(\d{4})/,
      replacement: '$1****$2',
      example: '13800138000 → 138****8000',
    },
    {
      id: 'id',
      label: i18n.t('components.ai_tools_panel.k36'),
      pattern: /(\d{6})\d{8}(\d{4})/,
      replacement: '$1********$2',
      example: '110101199001011234 → 110101********1234',
    },
    {
      id: 'email',
      label: i18n.t('components.ai_tools_panel.k37'),
      pattern: /(\w{1,3})\w+(@\w+\.\w+)/,
      replacement: '$1***$2',
      example: 'test@example.com → tes***@example.com',
    },
    {
      id: 'bank',
      label: i18n.t('components.ai_tools_panel.k38'),
      pattern: /(\d{4})\d+(\d{4})/,
      replacement: '$1****$2',
      example: '6222021234567890123 → 6222****0123',
    },
    {
      id: 'name',
      label: i18n.t('components.ai_tools_panel.k39'),
      pattern: /([\u4E00-\u9FA5]{1})[\u4E00-\u9FA5]+/,
      replacement: '$1**',
      example: i18n.t('components.ai_tools_panel.k19'),
    },
  ];
}

const DataMasker: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [selectedType, setSelectedType] = useState('phone');
  const [copied, setCopied] = useState(false);

  const handleMask = useCallback(() => {
    const mask = getMaskTypes().find((m) => m.id === selectedType);
    if (!mask || !input) return;

    const lines = input.split('\n');
    const masked = lines.map((line) => {
      return line.replace(mask.pattern, mask.replacement);
    });

    setOutput(masked.join('\n'));
  }, [input, selectedType]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const currentMask = getMaskTypes().find((m) => m.id === selectedType);

  return (
    <Box sx={{ p: 2 }}>
      <Typography
        variant='subtitle2'
        sx={{ mb: 1.5, fontWeight: 600 }}
      >
        {i18n.t('components.ai_tools_panel.k20')}
      </Typography>

      <FormControl
        fullWidth
        size='small'
        sx={{ mb: 1 }}
      >
        <InputLabel>{i18n.t('components.ai_tools_panel.k40')}</InputLabel>
        <TextField
          select
          value={selectedType}
          label={i18n.t('components.ai_tools_panel.k41')}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {getMaskTypes().map((m) => (
            <option
              key={m.id}
              value={m.id}
            >
              {m.label}
            </option>
          ))}
        </TextField>
      </FormControl>

      {currentMask && (
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mb: 1.5, display: 'block' }}
        >
          [i18n.t('components.ai_tools_panel.k21')]: {currentMask.example}
        </Typography>
      )}

      <TextField
        multiline
        rows={3}
        fullWidth
        placeholder={i18n.t('components.ai_tools_panel.k22')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        sx={{ mb: 1.5 }}
        size='small'
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Button
          size='small'
          variant='outlined'
          onClick={handleMask}
        >
          {i18n.t('components.ai_tools_panel.k23')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          onClick={handleClear}
        >
          {i18n.t('components.ai_tools_panel.k24')}
        </Button>
        {output && (
          <Tooltip
            title={
              copied
                ? i18n.t('components.ai_tools_panel.k43')
                : i18n.t('components.ai_tools_panel.k42')
            }
          >
            <IconButton
              size='small'
              onClick={handleCopy}
              color={copied ? 'success' : 'primary'}
              aria-label={i18n.t('components.ai_tools_panel.k44')}
            >
              {copied ? (
                <Check style={{ width: 14, height: 14 }} />
              ) : (
                <Copy style={{ width: 14, height: 14 }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {output && (
        <TextField
          multiline
          rows={3}
          fullWidth
          value={output}
          disabled
        />
      )}
    </Box>
  );
};

interface AIToolsPanelProps {
  defaultTool?: string;
  onClose?: () => void;
}

export const AIToolsPanel: React.FC<AIToolsPanelProps> = ({ defaultTool, onClose }) => {
  const [activeTab, setActiveTab] = useState(defaultTool || 'json');

  const tools = [
    {
      id: 'json',
      label: 'JSON',
      icon: <FileJson style={{ width: 16, height: 16 }} />,
    },
    {
      id: 'date',
      label: i18n.t('components.ai_tools_panel.k45'),
      icon: <Calendar style={{ width: 16, height: 16 }} />,
    },
    {
      id: 'unit',
      label: i18n.t('components.ai_tools_panel.k46'),
      icon: <ArrowRightLeft style={{ width: 16, height: 16 }} />,
    },
    {
      id: 'mask',
      label: i18n.t('components.ai_tools_panel.k47'),
      icon: <Shield style={{ width: 16, height: 16 }} />,
    },
  ];

  React.useEffect(() => {
    if (defaultTool) {
      setActiveTab(defaultTool);
    }
  }, [defaultTool]);

  return (
    <Box sx={{ width: '100%', maxWidth: 400 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant='fullWidth'
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              fontSize: '0.75rem',
            },
          }}
        >
          {tools.map((tool) => (
            <Tab
              key={tool.id}
              value={tool.id}
              icon={tool.icon}
              iconPosition='start'
              label={tool.label}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
        {activeTab === 'json' && <JsonFormatter />}
        {activeTab === 'date' && <DateCalculator />}
        {activeTab === 'unit' && <UnitConverter />}
        {activeTab === 'mask' && <DataMasker />}
      </Box>
    </Box>
  );
};

export default AIToolsPanel;
