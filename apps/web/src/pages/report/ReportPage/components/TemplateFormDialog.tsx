import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Typography,
  Button,
} from '@mui/material';
import type {
  ReportType,
  ReportTypeInfo,
  ReportTemplate,
  CreateTemplateRequest,
} from '@/api/report';

interface TemplateFormDialogProps {
  open: boolean;
  selectedTemplate: ReportTemplate | null;
  templateFormData: CreateTemplateRequest;
  mockReportTypes: ReportTypeInfo[];
  onClose: () => void;
  onFormDataChange: (data: CreateTemplateRequest) => void;
  onSubmit: () => void;
}

const TemplateFormDialog: React.FC<TemplateFormDialogProps> = ({
  open,
  selectedTemplate,
  templateFormData,
  mockReportTypes,
  onClose,
  onFormDataChange,
  onSubmit,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle>{selectedTemplate ? '编辑模板' : '新增模板'}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto', maxHeight: '80vh' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <TextField
              label='模板名称 *'
              required
              value={templateFormData.name}
              onChange={(e) => onFormDataChange({ ...templateFormData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label='模板编码 *'
              required
              value={templateFormData.code}
              onChange={(e) => onFormDataChange({ ...templateFormData, code: e.target.value })}
              fullWidth
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>报表类型 *</InputLabel>
              <Select
                required
                value={templateFormData.report_type}
                label='报表类型 *'
                onChange={(e) =>
                  onFormDataChange({
                    ...templateFormData,
                    report_type: e.target.value as ReportType,
                  })
                }
                fullWidth
              >
                {mockReportTypes.map((type) => (
                  <MenuItem
                    key={type.type}
                    value={type.type}
                  >
                    {type.name} ({type.module})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='分类'
              value={templateFormData.category}
              onChange={(e) => onFormDataChange({ ...templateFormData, category: e.target.value })}
              fullWidth
            />
          </Box>

          <TextField
            label='描述'
            value={templateFormData.description || ''}
            onChange={(e) => onFormDataChange({ ...templateFormData, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>输出格式</InputLabel>
              <Select
                value={templateFormData.outputformat}
                label='输出格式'
                onChange={(e) =>
                  onFormDataChange({ ...templateFormData, outputformat: e.target.value })
                }
                fullWidth
              >
                <MenuItem value='pdf'>PDF</MenuItem>
                <MenuItem value='excel'>Excel</MenuItem>
                <MenuItem value='csv'>CSV</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography>启用状态</Typography>
              <Switch
                checked={selectedTemplate?.isactive ?? true}
                disabled={!!selectedTemplate}
              />
            </Box>
          </Box>

          <TextField
            label='数据源查询'
            value={templateFormData.data_source.query}
            onChange={(e) =>
              onFormDataChange({
                ...templateFormData,
                data_source: { ...templateFormData.data_source, query: e.target.value },
              })
            }
            multiline
            rows={4}
            fullWidth
            placeholder='输入SQL查询语句'
            sx={{ fontFamily: 'monospace' }}
          />

          <TextField
            label='列配置 (JSON)'
            value={JSON.stringify(templateFormData.columns, null, 2)}
            onChange={(e) => {
              try {
                const columns = JSON.parse(e.target.value);
                onFormDataChange({ ...templateFormData, columns });
              } catch (e) { console.error("[Report] Failed to parse JSON column config", e); }
            }}
            multiline
            rows={4}
            fullWidth
            sx={{ fontFamily: 'monospace' }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          取消
        </Button>
        <Button
          variant='contained'
          onClick={onSubmit}
        >
          {selectedTemplate ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateFormDialog;
