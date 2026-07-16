import React from 'react';
import { Typography, Box } from '@mui/material';
import { StatusBadge, StatCardGroup } from '@/components';
import type { AccountingSubject } from '@/api/erp';

interface SubjectListPanelProps {
  subjects: AccountingSubject[];
  subjectStatCards: any[];
}

const SubjectListPanel: React.FC<SubjectListPanelProps> = ({
  subjects,
  subjectStatCards,
}) => {
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
                    label='现金流量'
                    color='secondary'
                  />
                )}
              </Box>
              <StatusBadge
                status={subject.status}
                label={subject.status === 'active' ? '启用' : '禁用'}
                color={subject.status === 'active' ? 'success' : 'default'}
              />
            </Box>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              {subject.name}
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
              <Typography variant='body2'>层级: {subject.level}</Typography>
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: 'grey.300',
                }}
              />
              <Typography variant='body2'>{subject.category || '未分类'}</Typography>
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
                    上级科目:
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
