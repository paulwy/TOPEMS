import React from 'react';
import { Typography, Box } from '@mui/material';
import { StatusBadge, StatCardGroup } from '@/components';
import type { StatCardGroupProps } from '@/components/common';
import type { AccountingSubject } from '@/api/finance';
import { localizedName } from '@/utils/i18n';

import { useTranslation } from 'react-i18next';

interface SubjectListPanelProps {
  subjects: AccountingSubject[];
  subjectStatCards: StatCardGroupProps['stats'];
}

const SubjectListPanel: React.FC<SubjectListPanelProps> = ({ subjects, subjectStatCards }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'block' }}>
      <StatCardGroup
        stats={subjectStatCards}
        columns={4}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr 1fr',
            lg: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {subjects.map((subject) => (
          <Box
            key={subject.id}
            sx={{
              bgcolor: 'background.paper',
              '&:hover': { boxShadow: 3 },
              transition: 'box-shadow 0.3s',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 'bold', color: 'indigo.600' }}
                >
                  {subject.code}
                </Typography>
                {subject.is_cash_flow && (
                  <StatusBadge
                    status='cash_flow'
                    label={t(
                      'finance.finance_voucher_page_components__subject_list_panel.text_16b663'
                    )}
                    color='secondary'
                  />
                )}
              </Box>
              <StatusBadge
                status={subject.status}
                label={
                  subject.status === 'active'
                    ? t('finance.finance_voucher_page_components__subject_list_panel.active')
                    : t('finance.finance_voucher_page_components__subject_list_panel.text_710ad0')
                }
                color={subject.status === 'active' ? 'success' : 'default'}
              />
            </Box>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              {localizedName(subject.name, subject.name_en)}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mt: 1,
                color: 'text.secondary',
              }}
            >
              <Typography variant='body2'>
                {t('finance.finance_voucher_page_components_subject_list_panel.m1', {
                  v1: subject.level,
                })}
              </Typography>
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: 'grey.300',
                }}
              />
              <Typography variant='body2'>
                {subject.category ||
                  t('finance.finance_voucher_page_components__subject_list_panel.text_ecf7eb')}
              </Typography>
            </Box>
            {subject.parent_code && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.100' }}>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.disabled' }}
                >
                  <Typography
                    variant='caption'
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {t('finance.finance_voucher_page_components_subject_list_panel.e1')}:
                  </Typography>{' '}
                  {subject.parent_code}
                </Typography>
              </Box>
            )}
            {subject.description && (
              <Typography
                variant='body2'
                sx={{
                  color: 'text.secondary',
                  mt: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {subject.description}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SubjectListPanel;
