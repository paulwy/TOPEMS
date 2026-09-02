import React, { useState, useEffect, useRef } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, Box, Typography, TextField, Button, useTheme } from '@mui/material';
import { AIGenerateModal } from './AIGenerateModal';
import type { CodeGenerateContext } from '@/types/ai';
import i18n from '@/i18n';

export interface AICodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  context: CodeGenerateContext;
  onSelect: (_code: string) => void;
  existingCodes?: string[];
}

const chineseToEnglish: Record<string, string> = {
  [i18n.t('components.ai_code_generator.k0')]: 'RD',
  [i18n.t('components.ai_code_generator.k1')]: 'Tech',
  [i18n.t('components.ai_code_generator.k2')]: 'PM',
  [i18n.t('components.ai_code_generator.k3')]: 'PM',
  [i18n.t('components.ai_code_generator.k4')]: 'Marketing',
  [i18n.t('components.ai_code_generator.k5')]: 'Marketing',
  [i18n.t('components.ai_code_generator.k6')]: 'Sales',
  [i18n.t('components.ai_code_generator.k7')]: 'Finance',
  [i18n.t('components.ai_code_generator.k8')]: 'Accounting',
  [i18n.t('components.ai_code_generator.k9')]: 'HR',
  [i18n.t('components.ai_code_generator.k10')]: 'HR',
  [i18n.t('components.ai_code_generator.k11')]: 'Admin',
  [i18n.t('components.ai_code_generator.k12')]: 'Legal',
  [i18n.t('components.ai_code_generator.k13')]: 'Operations',
  [i18n.t('components.ai_code_generator.k14')]: 'Operations',
  [i18n.t('components.ai_code_generator.k15')]: 'CustomerService',
  [i18n.t('components.ai_code_generator.k16')]: 'CustomerService',
  [i18n.t('components.ai_code_generator.k17')]: 'Purchasing',
  [i18n.t('components.ai_code_generator.k18')]: 'SupplyChain',
  [i18n.t('components.ai_code_generator.k19')]: 'Quality',
  [i18n.t('components.ai_code_generator.k20')]: 'Quality',
  [i18n.t('components.ai_code_generator.k21')]: 'Logistics',
  [i18n.t('components.ai_code_generator.k22')]: 'Production',
  [i18n.t('components.ai_code_generator.k23')]: 'Director',
  [i18n.t('components.ai_code_generator.k24')]: 'Manager',
  [i18n.t('components.ai_code_generator.k25')]: 'Supervisor',
  [i18n.t('components.ai_code_generator.k26')]: 'Employee',
  [i18n.t('components.ai_code_generator.k27')]: 'Specialist',
  [i18n.t('components.ai_code_generator.k28')]: 'Vice',
  [i18n.t('components.ai_code_generator.k29')]: 'Assistant',
  [i18n.t('components.ai_code_generator.k30')]: 'GM',
  [i18n.t('components.ai_code_generator.k31')]: 'CEO',
  [i18n.t('components.ai_code_generator.k32')]: 'R',
  [i18n.t('components.ai_code_generator.k33')]: 'D',
  [i18n.t('components.ai_code_generator.k34')]: 'D',
  [i18n.t('components.ai_code_generator.k35')]: 'M',
  [i18n.t('components.ai_code_generator.k36')]: 'H',
  [i18n.t('components.ai_code_generator.k37')]: 'R',
  [i18n.t('components.ai_code_generator.k38')]: 'H',
  [i18n.t('components.ai_code_generator.k39')]: 'R',
  [i18n.t('components.ai_code_generator.k40')]: 'F',
  [i18n.t('components.ai_code_generator.k41')]: 'F',
  [i18n.t('components.ai_code_generator.k42')]: 'A',
  [i18n.t('components.ai_code_generator.k43')]: 'C',
  [i18n.t('components.ai_code_generator.k44')]: 'S',
  [i18n.t('components.ai_code_generator.k45')]: 'S',
  [i18n.t('components.ai_code_generator.k46')]: 'M',
  [i18n.t('components.ai_code_generator.k47')]: 'K',
  [i18n.t('components.ai_code_generator.k48')]: 'O',
  [i18n.t('components.ai_code_generator.k49')]: 'O',
  [i18n.t('components.ai_code_generator.k50')]: 'M',
  [i18n.t('components.ai_code_generator.k51')]: 'T',
  [i18n.t('components.ai_code_generator.k52')]: 'E',
  [i18n.t('components.ai_code_generator.k53')]: 'D',
  [i18n.t('components.ai_code_generator.k54')]: 'P',
  [i18n.t('components.ai_code_generator.k55')]: 'P',
  [i18n.t('components.ai_code_generator.k56')]: 'M',
  [i18n.t('components.ai_code_generator.k57')]: 'M',
  [i18n.t('components.ai_code_generator.k58')]: 'E',
  [i18n.t('components.ai_code_generator.k59')]: 'E',
  [i18n.t('components.ai_code_generator.k60')]: 'M',
  [i18n.t('components.ai_code_generator.k61')]: 'M',
  [i18n.t('components.ai_code_generator.k62')]: 'C',
  [i18n.t('components.ai_code_generator.k63')]: 'O',
  [i18n.t('components.ai_code_generator.k64')]: 'A',
  [i18n.t('components.ai_code_generator.k65')]: 'S',
  [i18n.t('components.ai_code_generator.k66')]: 'P',
  [i18n.t('components.ai_code_generator.k67')]: 'O',
  [i18n.t('components.ai_code_generator.k68')]: 'I',
  [i18n.t('components.ai_code_generator.k69')]: 'N',
  [i18n.t('components.ai_code_generator.k70')]: 'W',
  [i18n.t('components.ai_code_generator.k71')]: 'L',
  [i18n.t('components.ai_code_generator.k72')]: 'P',
  [i18n.t('components.ai_code_generator.k73')]: 'Q',
  [i18n.t('components.ai_code_generator.k74')]: 'Q',
  [i18n.t('components.ai_code_generator.k75')]: 'S',
  [i18n.t('components.ai_code_generator.k76')]: 'S',
  [i18n.t('components.ai_code_generator.k77')]: 'A',
  [i18n.t('components.ai_code_generator.k78')]: 'D',
  [i18n.t('components.ai_code_generator.k79')]: 'L',
  [i18n.t('components.ai_code_generator.k80')]: 'R',
  [i18n.t('components.ai_code_generator.k81')]: 'R',
};

const pinyinInitials: Record<string, string> = {
  [i18n.t('components.ai_code_generator.k82')]: 'Y',
  [i18n.t('components.ai_code_generator.k83')]: 'F',
  [i18n.t('components.ai_code_generator.k84')]: 'R',
  [i18n.t('components.ai_code_generator.k85')]: 'L',
  [i18n.t('components.ai_code_generator.k86')]: 'Z',
  [i18n.t('components.ai_code_generator.k87')]: 'Y',
  [i18n.t('components.ai_code_generator.k88')]: 'C',
  [i18n.t('components.ai_code_generator.k89')]: 'W',
  [i18n.t('components.ai_code_generator.k90')]: 'H',
  [i18n.t('components.ai_code_generator.k91')]: 'J',
  [i18n.t('components.ai_code_generator.k92')]: 'X',
  [i18n.t('components.ai_code_generator.k93')]: 'S',
  [i18n.t('components.ai_code_generator.k94')]: 'S',
  [i18n.t('components.ai_code_generator.k95')]: 'C',
  [i18n.t('components.ai_code_generator.k96')]: 'Y',
  [i18n.t('components.ai_code_generator.k97')]: 'W',
  [i18n.t('components.ai_code_generator.k98')]: 'H',
  [i18n.t('components.ai_code_generator.k99')]: 'J',
  [i18n.t('components.ai_code_generator.k100')]: 'S',
  [i18n.t('components.ai_code_generator.k101')]: 'K',
  [i18n.t('components.ai_code_generator.k102')]: 'C',
  [i18n.t('components.ai_code_generator.k103')]: 'P',
  [i18n.t('components.ai_code_generator.k104')]: 'G',
  [i18n.t('components.ai_code_generator.k105')]: 'L',
  [i18n.t('components.ai_code_generator.k106')]: 'Y',
  [i18n.t('components.ai_code_generator.k107')]: 'G',
  [i18n.t('components.ai_code_generator.k108')]: 'Z',
  [i18n.t('components.ai_code_generator.k109')]: 'J',
  [i18n.t('components.ai_code_generator.k110')]: 'Z',
  [i18n.t('components.ai_code_generator.k111')]: 'C',
  [i18n.t('components.ai_code_generator.k112')]: 'F',
  [i18n.t('components.ai_code_generator.k113')]: 'Z',
  [i18n.t('components.ai_code_generator.k114')]: 'Z',
  [i18n.t('components.ai_code_generator.k115')]: 'C',
  [i18n.t('components.ai_code_generator.k116')]: 'G',
  [i18n.t('components.ai_code_generator.k117')]: 'K',
  [i18n.t('components.ai_code_generator.k118')]: 'C',
  [i18n.t('components.ai_code_generator.k119')]: 'W',
  [i18n.t('components.ai_code_generator.k120')]: 'L',
  [i18n.t('components.ai_code_generator.k121')]: 'S',
  [i18n.t('components.ai_code_generator.k122')]: 'Z',
  [i18n.t('components.ai_code_generator.k123')]: 'L',
  [i18n.t('components.ai_code_generator.k124')]: 'A',
  [i18n.t('components.ai_code_generator.k125')]: 'Q',
  [i18n.t('components.ai_code_generator.k126')]: 'X',
  [i18n.t('components.ai_code_generator.k127')]: 'Z',
  [i18n.t('components.ai_code_generator.k128')]: 'F',
  [i18n.t('components.ai_code_generator.k129')]: 'F',
  [i18n.t('components.ai_code_generator.k130')]: 'X',
};

function translateToEnglish(name: string): string {
  if (!name) return 'Department';
  const cleanName = name.replace(/\s+/g, '').replace(/[^\u4E00-\u9FA5a-zA-Z0-9]/g, '');
  let result = '';
  let i = 0;

  while (i < cleanName.length) {
    let matched = false;
    for (let len = 4; len >= 2; len--) {
      if (i + len <= cleanName.length) {
        const sub = cleanName.substring(i, i + len);
        if (chineseToEnglish[sub]) {
          result += (result ? '-' : '') + chineseToEnglish[sub];
          i += len;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      const char = cleanName[i];
      if (/[a-zA-Z0-9]/.test(char)) {
        result += char;
      } else if (/[\u4E00-\u9FA5]/.test(char) && chineseToEnglish[char]) {
        result += (result ? '-' : '') + chineseToEnglish[char];
      }
      i++;
    }
  }

  return result || 'Department';
}

function generateInitialsFromName(name: string, maxLength: number = 4): string {
  if (!name) return 'DEF';
  const cleanName = name.replace(/\s+/g, '').replace(/[^\u4E00-\u9FA5a-zA-Z0-9]/g, '');
  let initials = '';
  let i = 0;

  while (i < cleanName.length && initials.length < maxLength) {
    let matched = false;
    for (let len = 3; len >= 2; len--) {
      if (i + len <= cleanName.length) {
        const sub = cleanName.substring(i, i + len);
        if (chineseToEnglish[sub]) {
          initials += chineseToEnglish[sub].toUpperCase().substring(0, 3);
          i += len;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      const char = cleanName[i];
      if (/[a-zA-Z]/.test(char)) {
        initials += char.toUpperCase();
      } else if (/[\u4E00-\u9FA5]/.test(char)) {
        if (chineseToEnglish[char]) {
          initials += chineseToEnglish[char].toUpperCase().substring(0, 1);
        } else if (pinyinInitials[char]) {
          initials += pinyinInitials[char].toUpperCase();
        } else {
          initials += 'X';
        }
      }
      i++;
    }
  }

  if (!initials) initials = 'DEF';
  return initials.substring(0, maxLength);
}

const codeRules = {
  department: {
    examples: (name: string, _seq: number, year: number) => {
      const initials = generateInitialsFromName(name, 4);
      const shortInitials = initials.substring(0, Math.min(2, initials.length));
      const english = translateToEnglish(name);
      return [
        `${initials}`,
        `${shortInitials}`,
        `${english}`,
        `DEPT-${initials}`,
        `${initials}-${year}`,
      ];
    },
  },
  employee: {
    examples: (name: string, seq: number, year: number) => {
      const initials = generateInitialsFromName(name, 3);
      const shortInitials = initials.substring(0, Math.min(2, initials.length));
      return [
        `${initials}-${year}${String(seq).padStart(4, '0')}`,
        `${shortInitials}${year}${String(seq).padStart(3, '0')}`,
        `E${initials}${year}${String(seq).padStart(3, '0')}`,
        `EMP-${shortInitials}-${year}${String(seq).padStart(2, '0')}`,
      ];
    },
  },
  project: {
    examples: (name: string, seq: number, year: number) => {
      const initials = generateInitialsFromName(name, 4);
      const shortInitials = initials.substring(0, Math.min(2, initials.length));
      return [
        `${initials}-${year}${String(seq).padStart(3, '0')}`,
        `${shortInitials}-${year}-${String(seq).padStart(2, '0')}`,
        `PRJ-${initials}-${year}${String(seq).padStart(3, '0')}`,
        `PJ-${shortInitials}${year}${String(seq).padStart(2, '0')}`,
      ];
    },
  },
  contract: {
    examples: (name: string, seq: number, year: number) => {
      const initials = generateInitialsFromName(name, 3);
      const shortInitials = initials.substring(0, Math.min(2, initials.length));
      return [
        `${initials}-${year}${String(seq).padStart(3, '0')}`,
        `CT-${initials}-${String(seq).padStart(4, '0')}`,
        `${shortInitials}${year}${String(seq).padStart(3, '0')}`,
        `CON-${shortInitials}-${year}${String(seq).padStart(2, '0')}`,
      ];
    },
  },
};

function generateMockCodes(
  context: CodeGenerateContext,
  savedName: string,
  existingCodes: string[] = []
): string[] {
  const { entityType } = context;
  const name = savedName || context.name || '';
  const seq = existingCodes.length + 1;
  const year = new Date().getFullYear();

  let codes: string[] = [];

  if (codeRules[entityType]) {
    codes = codeRules[entityType].examples(name, seq, year);
  }

  return codes.filter((code) => !existingCodes.includes(code));
}

export function AICodeGenerator({
  isOpen,
  onClose,
  context,
  onSelect,
  existingCodes = [],
}: AICodeGeneratorProps) {
  const [suggestedCodes, setSuggestedCodes] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const theme = useTheme();
  const [customCode, setCustomCode] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const savedNameRef = useRef<string>('');

  useEffect(() => {
    if (context.name) {
      savedNameRef.current = context.name;
    }
  }, [context.name]);

  useEffect(() => {
    if (isOpen) {
      const codes = generateMockCodes(context, savedNameRef.current, existingCodes);
      setSuggestedCodes(codes);
      setSelectedCode(null);
      setCustomCode('');
    }
  }, [isOpen, context.entityType, existingCodes]);

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => {
      const codes = generateMockCodes(context, savedNameRef.current, existingCodes);
      setSuggestedCodes(codes);
      setSelectedCode(null);
      setCustomCode('');
      setRegenerating(false);
    }, 300);
  };

  const handleConfirm = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const code = selectedCode || customCode;
    if (code) {
      onSelect(code);
      onClose();
    }
  };

  const handleSelectCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(code);
    onClose();
  };

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title={i18n.t('components.ai_code_generator.ai_131')}
      description={i18n.t('components.ai_code_generator.k0')}
      isLoading={regenerating}
      onConfirm={customCode ? handleConfirm : undefined}
      confirmText={i18n.t('components.ai_code_generator.k1')}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {!context.name && (
          <Box
            sx={{
              p: 2,
              backgroundColor: 'warning.light',
              border: 1,
              borderColor: 'warning.main',
              borderRadius: 1,
              fontSize: 'small',
              color: 'warning.dark',
            }}
          >
            {i18n.t('components.ai_code_generator.k132')}
          </Box>
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 500, color: 'text.secondary' }}
          >
            {i18n.t('components.ai_code_generator.k133')}
          </Typography>
          <Button
            variant='outlined'
            size='small'
            onClick={handleRegenerate}
            disabled={regenerating}
            startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
          >
            {i18n.t('components.ai_code_generator.k134')}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {suggestedCodes.map((code, index) => (
            <Card
              key={index}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'secondary.main',
                  backgroundColor: 'secondary.light',
                },
              }}
              onClick={(e) => handleSelectCode(e, code)}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <code style={{ fontSize: '16px', fontFamily: 'monospace' }}>{code}</code>
                <Check
                  style={{
                    width: 20,
                    height: 20,
                    color: theme.palette.secondary.main,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  className='hover:opacity-100'
                />
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ pt: 1 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 500, color: 'text.secondary', mb: 1.5 }}
          >
            {i18n.t('components.ai_code_generator.k135')}
          </Typography>
          <TextField
            fullWidth
            size='small'
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            placeholder={i18n.t('components.ai_code_generator.k136')}
          />
        </Box>
      </Box>
    </AIGenerateModal>
  );
}
