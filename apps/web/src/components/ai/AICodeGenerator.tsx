import React, { useState, useEffect, useRef } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import {Card, CardContent, Box, Typography, TextField, Button, useTheme} from '@mui/material';
import { AIGenerateModal } from './AIGenerateModal';
import type { CodeGenerateContext } from '@/types/ai';

export interface AICodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  context: CodeGenerateContext;
  onSelect: (_code: string) => void;
  existingCodes?: string[];
}

const chineseToEnglish: Record<string, string> = {
  研发: 'RD',
  技术: 'Tech',
  产品: 'PM',
  产品经理: 'PM',
  市场: 'Marketing',
  营销: 'Marketing',
  销售: 'Sales',
  财务: 'Finance',
  会计: 'Accounting',
  人事: 'HR',
  人力资源: 'HR',
  行政: 'Admin',
  法务: 'Legal',
  运营: 'Operations',
  运维: 'Operations',
  客服: 'CustomerService',
  客户服务: 'CustomerService',
  采购: 'Purchasing',
  供应链: 'SupplyChain',
  质量: 'Quality',
  品管: 'Quality',
  物流: 'Logistics',
  生产: 'Production',
  总监: 'Director',
  经理: 'Manager',
  主管: 'Supervisor',
  员工: 'Employee',
  专员: 'Specialist',
  副: 'Vice',
  助理: 'Assistant',
  总经理: 'GM',
  首席执行官: 'CEO',
  研: 'R',
  发: 'D',
  部: 'D',
  门: 'M',
  人: 'H',
  力: 'R',
  资: 'H',
  源: 'R',
  财: 'F',
  务: 'F',
  会: 'A',
  计: 'C',
  销: 'S',
  售: 'S',
  市: 'M',
  场: 'K',
  运: 'O',
  维: 'O',
  护: 'M',
  技: 'T',
  术: 'E',
  开: 'D',
  产: 'P',
  品: 'P',
  管: 'M',
  理: 'M',
  员: 'E',
  工: 'E',
  主: 'M',
  经: 'M',
  总: 'C',
  裁: 'O',
  助: 'A',
  专: 'S',
  采: 'P',
  购: 'O',
  库: 'I',
  存: 'N',
  物: 'W',
  流: 'L',
  生: 'P',
  质: 'Q',
  量: 'Q',
  安: 'S',
  全: 'S',
  行: 'A',
  政: 'D',
  法: 'L',
  风: 'R',
  险: 'R',
};

const pinyinInitials: Record<string, string> = {
  研: 'Y',
  发: 'F',
  人: 'R',
  力: 'L',
  资: 'Z',
  源: 'Y',
  财: 'C',
  务: 'W',
  会: 'H',
  计: 'J',
  销: 'X',
  售: 'S',
  市: 'S',
  场: 'C',
  运: 'Y',
  维: 'W',
  护: 'H',
  技: 'J',
  术: 'S',
  开: 'K',
  产: 'C',
  品: 'P',
  管: 'G',
  理: 'L',
  员: 'Y',
  工: 'G',
  主: 'Z',
  经: 'J',
  总: 'Z',
  裁: 'C',
  副: 'F',
  助: 'Z',
  专: 'Z',
  采: 'C',
  购: 'G',
  库: 'K',
  存: 'C',
  物: 'W',
  流: 'L',
  生: 'S',
  质: 'Z',
  量: 'L',
  安: 'A',
  全: 'Q',
  行: 'X',
  政: 'Z',
  法: 'F',
  风: 'F',
  险: 'X',
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
      title='AI 编码生成'
      description='选择一个推荐的编码，或输入自定义编码后点击确认'
      isLoading={regenerating}
      onConfirm={customCode ? handleConfirm : undefined}
      confirmText='使用自定义编码'
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
            💡 提示：请先在名称中输入内容，才能生成个性化编码
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
            推荐编码 (点击即选)
          </Typography>
          <Button
            variant='outlined'
            size='small'
            onClick={handleRegenerate}
            disabled={regenerating}
            startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
          >
            重新生成
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
            或自定义编码
          </Typography>
          <TextField
            fullWidth
            size='small'
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            placeholder='输入自定义编码...'
          />
        </Box>
      </Box>
    </AIGenerateModal>
  );
}
