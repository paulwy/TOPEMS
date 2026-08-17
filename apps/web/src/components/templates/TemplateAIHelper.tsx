import {
  TextField,
  FormLabel,
  Card,
  CardContent,
  CardHeader,
  Typography,
  CircularProgress,
  Button,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState } from 'react';

import { Sparkles, Wand2, Lightbulb, TrendingUp, Send } from 'lucide-react';
import { designTokens } from '@topems/tokens';

interface TemplateAIHelperProps {
  content: string;
  variables: { key: string; label: string; type: string }[];
  onContentChange: (content: string) => void;
  onVariablesChange: (variables: { key: string; label: string; type: string }[]) => void;
}

interface AIResponse {
  content: string;
  variables: { key: string; label: string; type: string }[];
  suggestions: string[];
}

const TemplateAIHelper: React.FC<TemplateAIHelperProps> = ({
  content,
  variables,
  onContentChange,
  onVariablesChange,
}) => {
  const theme = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AIResponse | null>(null);

  const mockGenerateResponse: AIResponse = {
    content: `# {{report_title}}

{i18n.t('components.template_ai_helper.k0')}
{{summary}}

{i18n.t('components.template_ai_helper.k1')}
{{details}}

{i18n.t('components.template_ai_helper.k2')}
{{conclusion}}

{i18n.t('components.template_ai_helper.k3')}{{reporter}}
{i18n.t('components.template_ai_helper.k4')}{{today}}`,
    variables: [
      { key: 'report_title', label: i18n.t('templates.template_ai_helper.k0'), type: 'string' },
      { key: 'summary', label: i18n.t('templates.template_ai_helper.k1'), type: 'string' },
      { key: 'details', label: i18n.t('templates.template_ai_helper.k2'), type: 'string' },
      { key: 'conclusion', label: i18n.t('templates.template_ai_helper.k3'), type: 'string' },
      { key: 'reporter', label: i18n.t('templates.template_ai_helper.k4'), type: 'user' },
    ],
    suggestions: [
      i18n.t('templates.template_ai_helper.k6'),
      i18n.t('templates.template_ai_helper.k5'),
    ],
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    onContentChange(mockGenerateResponse.content);
    onVariablesChange(mockGenerateResponse.variables);
    setSuggestions(mockGenerateResponse.suggestions);
    setIsGenerating(false);
  };

  const handleSuggestVariables = async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    const detectedVars: { key: string; label: string; type: string }[] = [];
    const varRegex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const key = match[1];
      if (
        !['now', 'today', 'now_date', 'now_time', 'now_timestamp'].includes(key) &&
        !detectedVars.some((v) => v.key === key)
      ) {
        detectedVars.push({
          key,
          label: generateLabel(key),
          type: inferType(key),
        });
      }
    }

    const existingKeys = new Set(variables.map((v) => v.key));
    const newVariables = [...variables];
    detectedVars.forEach((v) => {
      if (!existingKeys.has(v.key)) {
        newVariables.push(v);
      }
    });

    onVariablesChange(newVariables);
    setSuggestions([
      `${i18n.t('components.template_ai_helper.k0')}${detectedVars.length}${i18n.t('components.template_ai_helper.k1')}`,
    ]);
    setIsAnalyzing(false);
  };

  const handleOptimize = async () => {
    if (!content.trim()) return;

    setIsGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const optimized = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '')
      .replace(/{{\s*(\w+)\s*}}/g, '{{$1}}');

    onContentChange(optimized);
    setSuggestions([i18n.t('templates.template_ai_helper.k7')]);
    setIsGenerating(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const usedVars = new Set<string>();
    const varRegex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      usedVars.add(match[1]);
    }

    const unusedVars = variables.filter((v) => !usedVars.has(v.key));
    const undefinedVars = Array.from(usedVars).filter(
      (v) => !variables.some((varDef) => varDef.key === v)
    );

    const result: AIResponse = {
      content: '',
      variables: [],
      suggestions: [],
    };

    if (unusedVars.length > 0) {
      result.suggestions.push(
        `${i18n.t('components.template_ai_helper.k2')}${unusedVars.map((v) => v.key).join(', ')}`
      );
    }

    if (undefinedVars.length > 0) {
      result.suggestions.push(
        `${i18n.t('components.template_ai_helper.k3')}${undefinedVars.join(', ')}`
      );
    }

    if (result.suggestions.length === 0) {
      result.suggestions.push(i18n.t('templates.template_ai_helper.k8'));
    }

    setAnalysisResult(result);
    setSuggestions(result.suggestions);
    setIsAnalyzing(false);
  };

  const generateLabel = (key: string): string => {
    const replacements: Record<string, string> = {
      name: i18n.t('templates.template_ai_helper.k9'),
      title: i18n.t('templates.template_ai_helper.k10'),
      code: i18n.t('templates.template_ai_helper.k11'),
      description: i18n.t('templates.template_ai_helper.k12'),
      content: i18n.t('templates.template_ai_helper.k13'),
      date: i18n.t('templates.template_ai_helper.k14'),
      time: i18n.t('templates.template_ai_helper.k15'),
      user: i18n.t('templates.template_ai_helper.k16'),
      author: i18n.t('templates.template_ai_helper.k17'),
      department: i18n.t('templates.template_ai_helper.k18'),
      company: i18n.t('templates.template_ai_helper.k19'),
      project: i18n.t('templates.template_ai_helper.k20'),
      amount: i18n.t('templates.template_ai_helper.k21'),
      number: i18n.t('templates.template_ai_helper.k22'),
      status: i18n.t('templates.template_ai_helper.k23'),
      type: i18n.t('templates.template_ai_helper.k24'),
      category: i18n.t('templates.template_ai_helper.k25'),
      subject: i18n.t('templates.template_ai_helper.k26'),
      summary: i18n.t('templates.template_ai_helper.k27'),
      body: i18n.t('templates.template_ai_helper.k28'),
    };

    for (const [k, v] of Object.entries(replacements)) {
      if (key.toLowerCase() === k || key.toLowerCase().endsWith(k)) {
        return v;
      }
    }

    const parts = key.split('_');
    if (parts.length > 1) {
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const inferType = (key: string): string => {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('date') || lowerKey.includes('time')) return 'date';
    if (lowerKey.includes('amount') || lowerKey.includes('number') || lowerKey.includes('price'))
      return 'number';
    if (lowerKey.includes('user') || lowerKey.includes('author') || lowerKey.includes('creator'))
      return 'user';
    if (lowerKey.includes('status') || lowerKey.includes('type') || lowerKey.includes('category'))
      return 'select';

    return 'string';
  };

  return (
    <Card
      sx={{
        background: `linear-gradient(to bottom right, warning.light, ${designTokens.colors.warning[100]})`,
        border: '1px solid #fcd34d',
      }}
    >
      <CardHeader sx={{ pb: 1.5 }}>
        <Typography
          variant='h6'
          component='h3'
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'warning.800',
          }}
        >
          <Sparkles style={{ width: 20, height: 20 }} />
          {i18n.t('components.template_ai_helper.ai_0')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'warning.dark', mt: 0.5 }}
        >
          {i18n.t('components.template_ai_helper.k1')}
        </Typography>
      </CardHeader>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div>
          <FormLabel sx={{ fontSize: 14, fontWeight: 500, color: 'warning.700' }}>
            {i18n.t('components.template_ai_helper.k2')}
          </FormLabel>
          <TextField
            placeholder={i18n.t('templates.template_ai_helper.k29')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size='small'
            fullWidth
            sx={{ mt: 1 }}
          />
          <Button
            variant='contained'
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            sx={{
              width: '100%',
              mt: 1,
              backgroundColor: 'warning.main',
              color: 'common.white',
              '&:hover': { backgroundColor: 'warning.dark' },
            }}
            startIcon={
              isGenerating ? (
                <CircularProgress
                  size={16}
                  color='inherit'
                />
              ) : (
                <Wand2 style={{ width: 16, height: 16 }} />
              )
            }
          >
            {isGenerating
              ? i18n.t('components.template_ai_helper.k5')
              : i18n.t('components.template_ai_helper.ai_4')}
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button
            variant='outlined'
            onClick={handleSuggestVariables}
            disabled={isAnalyzing || !content.trim()}
            sx={{
              borderColor: 'warning.300',
              color: 'warning.700',
              '&:hover': { backgroundColor: 'warning.light', borderColor: 'warning.300' },
            }}
            startIcon={<Lightbulb style={{ width: 16, height: 16 }} />}
          >
            {i18n.t('components.template_ai_helper.k3')}
          </Button>
          <Button
            variant='outlined'
            onClick={handleOptimize}
            disabled={isGenerating || !content.trim()}
            sx={{
              borderColor: 'warning.300',
              color: 'warning.700',
              '&:hover': { backgroundColor: 'warning.light', borderColor: 'warning.300' },
            }}
            startIcon={<TrendingUp style={{ width: 16, height: 16 }} />}
          >
            {i18n.t('components.template_ai_helper.k4')}
          </Button>
        </div>

        <Button
          variant='outlined'
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          sx={{
            width: '100%',
            borderColor: 'warning.300',
            color: 'warning.700',
            '&:hover': { backgroundColor: 'warning.light', borderColor: 'warning.300' },
          }}
          startIcon={
            isAnalyzing ? (
              <CircularProgress
                size={16}
                color='inherit'
              />
            ) : (
              <Send style={{ width: 16, height: 16 }} />
            )
          }
        >
          {isAnalyzing
            ? i18n.t('components.template_ai_helper.k6')
            : i18n.t('templates.template_ai_helper.k30')}
        </Button>

        {suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FormLabel sx={{ fontSize: 12, fontWeight: 500, color: 'warning.700' }}>
              {i18n.t('components.template_ai_helper.ai_5')}
            </FormLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: 14,
                    color: 'warning.800',
                    backgroundColor: theme.palette.warning.light,
                    borderRadius: 8,
                    padding: `${designTokens.spacing.sm} 12px`,
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResult && analysisResult.suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FormLabel sx={{ fontSize: 12, fontWeight: 500, color: 'warning.700' }}>
              {i18n.t('components.template_ai_helper.k6')}
            </FormLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {analysisResult.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: 14,
                    borderRadius: 8,
                    padding: `${designTokens.spacing.sm} 12px`,
                    backgroundColor:
                      suggestion.includes(i18n.t('templates.template_ai_helper.k32')) ||
                      suggestion.includes(i18n.t('templates.template_ai_helper.k31'))
                        ? theme.palette.error.light
                        : theme.palette.success.light,
                    color:
                      suggestion.includes(i18n.t('templates.template_ai_helper.k34')) ||
                      suggestion.includes(i18n.t('templates.template_ai_helper.k33'))
                        ? 'error.darker'
                        : 'success.700',
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { TemplateAIHelper };
export default TemplateAIHelper;
