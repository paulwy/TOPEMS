import React from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { LayoutTemplate, Plus, Play, Edit, Trash2 } from 'lucide-react';
import type { ReportTemplate, ReportTypeInfo } from '@/api/report';
import { getReportTypeName } from '../utils';

interface TemplateListProps {
  templates: ReportTemplate[];
  reportTypes: ReportTypeInfo[];
  onShowCreateTemplateModal: () => void;
  onCreateReportFromTemplate: (templateId: string) => void;
  onEditTemplateClick: (template: ReportTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  reportTypes,
  onShowCreateTemplateModal,
  onCreateReportFromTemplate,
  onEditTemplateClick,
  onDeleteTemplate,
}) => {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, color: 'grey.900' }}
        >
          报表模板列表
        </Typography>
        <Button
          onClick={onShowCreateTemplateModal}
          variant='contained'
          startIcon={<Plus sx={{ width: 16, height: 16 }} />}
          sx={{ borderRadius: 3, textTransform: 'none' }}
        >
          新增模板
        </Button>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
        {templates.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <LayoutTemplate
              sx={{
                width: 64,
                height: 64,
                color: 'grey.300',
                mx: 'auto',
                mb: 2,
              }}
            />
            <Typography sx={{ color: 'grey.600' }}>暂无模板</Typography>
            <Button
              onClick={onShowCreateTemplateModal}
              variant='contained'
              sx={{ mt: 2, borderRadius: 3 }}
            >
              创建第一个模板
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              '& > div:not(:last-child)': {
                borderBottom: 1,
                borderColor: 'grey.200',
              },
            }}
          >
            {templates.map((template) => (
              <Box
                key={template.id}
                sx={{ p: 3, '&:hover': { bgcolor: 'grey.50' } }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, color: 'grey.900' }}
                      >
                        {template.name}
                      </Typography>
                      <Chip
                        label={template.category}
                        size='small'
                        sx={{
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          borderRadius: '50%',
                        }}
                      />
                      <Chip
                        label={template.isactive ? '启用' : '禁用'}
                        size='small'
                        sx={{
                          bgcolor: template.isactive ? 'success.light' : 'grey.100',
                          color: template.isactive ? 'success.main' : 'grey.600',
                          borderRadius: '50%',
                        }}
                      />
                    </Box>
                    <Typography sx={{ color: 'grey.600', mb: 2 }}>
                      {template.description || '暂无描述'}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 14,
                        color: 'grey.600',
                      }}
                    >
                      <span>编码: {template.code}</span>
                      <span>类型: {getReportTypeName(template.report_type, reportTypes)}</span>
                      <span>列数: {template.columns.length}</span>
                      <span>输出格式: {template.outputformat.toUpperCase()}</span>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      onClick={() => onCreateReportFromTemplate(template.id)}
                      size='small'
                      startIcon={<Play sx={{ width: 16, height: 16 }} />}
                      sx={{
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'primary.light' },
                        borderRadius: 3,
                      }}
                    >
                      创建报表
                    </Button>
                    <Button
                      onClick={() => onEditTemplateClick(template)}
                      size='small'
                      startIcon={<Edit sx={{ width: 16, height: 16 }} />}
                      sx={{
                        color: 'info.main',
                        '&:hover': { bgcolor: 'info.light' },
                        borderRadius: 3,
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      onClick={() => onDeleteTemplate(template.id)}
                      size='small'
                      sx={{
                        color: 'error.main',
                        '&:hover': { bgcolor: 'error.light' },
                        borderRadius: 3,
                        p: 1,
                        minWidth: 'auto',
                      }}
                    >
                      <Trash2 sx={{ width: 20, height: 20 }} />
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </>
  );
};

export default TemplateList;
