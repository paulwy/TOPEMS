import { Grid } from '@/components/Grid';
import React, { useState, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Autocomplete,
  Divider,
  Stack,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Save, X } from 'lucide-react';

const RsExperimentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    project_id: '',
    formula_id: '',
    experiment_type: '活性测试',
    phase: '小试',
    objective: '',
    method: '',
    experimenter: '',
    batch_number: '',
    scale: '',
    scale_unit: 'kg',
  });

  const experimentTypes = ['活性测试', '稳定性测试', '配方优化', '工艺验证', '性能评估', '其他'];

  const phases = ['小试', '中试', '放大', '生产验证'];
  const scaleUnits = ['g', 'kg', 't', 'mL', 'L'];

  const projects = [
    { id: '1', name: '新型催化剂研发项目' },
    { id: '2', name: '聚合物改性研究' },
    { id: '3', name: '环保材料开发' },
  ];

  const formulas = [
    { id: '1', name: '配方A-001' },
    { id: '2', name: '配方B-002' },
    { id: '3', name: '配方C-003' },
  ];

  const experimenters = ['张三', '李四', '王五', '赵六', '孙七'];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    logger.info('提交数据:', formData);
    navigate('/rs/experiments');
  };

  const handleCancel = () => {
    navigate('/rs/experiments');
  };

  return (
    <Container
      maxWidth='lg'
      sx={{ py: 3 }}
    >
      <div style={{ marginBottom: 12 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 'bold' }}
          gutterBottom
        >
          {isEdit ? '编辑试验' : '新建试验'}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {isEdit ? '修改试验信息' : '创建新的研发试验记录'}
        </Typography>
      </div>

      <Paper sx={{ p: 3 }}>
        <Grid
          container
          spacing={3}
        >
          <Grid size={{ xs: 12 }}>
            <Typography
              variant='h6'
              gutterBottom
            >
              基本信息
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label='试验名称'
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder='请输入试验名称'
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label='试验编码'
              required
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              placeholder='例如: EXP-2024-001'
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>所属项目</InputLabel>
              <Select
                value={formData.project_id}
                label='所属项目'
                onChange={(e) => handleInputChange('project_id', e.target.value)}
              >
                {projects.map((p) => (
                  <MenuItem
                    key={p.id}
                    value={p.id}
                  >
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>关联配方</InputLabel>
              <Select
                value={formData.formula_id}
                label='关联配方'
                onChange={(e) => handleInputChange('formula_id', e.target.value)}
              >
                {formulas.map((f) => (
                  <MenuItem
                    key={f.id}
                    value={f.id}
                  >
                    {f.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>试验类型</InputLabel>
              <Select
                value={formData.experiment_type}
                label='试验类型'
                onChange={(e) => handleInputChange('experiment_type', e.target.value)}
              >
                {experimentTypes.map((type) => (
                  <MenuItem
                    key={type}
                    value={type}
                  >
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>试验阶段</InputLabel>
              <Select
                value={formData.phase}
                label='试验阶段'
                onChange={(e) => handleInputChange('phase', e.target.value)}
              >
                {phases.map((phase) => (
                  <MenuItem
                    key={phase}
                    value={phase}
                  >
                    {phase}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography
              variant='h6'
              gutterBottom
              sx={{ mt: 2 }}
            >
              试验内容
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label='试验目标'
              multiline
              rows={3}
              value={formData.objective}
              onChange={(e) => handleInputChange('objective', e.target.value)}
              placeholder='请输入试验目标'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label='实验方法'
              multiline
              rows={4}
              value={formData.method}
              onChange={(e) => handleInputChange('method', e.target.value)}
              placeholder='请输入实验方法描述'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography
              variant='h6'
              gutterBottom
              sx={{ mt: 2 }}
            >
              执行信息
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>实验员</InputLabel>
              <Select
                value={formData.experimenter}
                label='实验员'
                onChange={(e) => handleInputChange('experimenter', e.target.value)}
              >
                {experimenters.map((exp) => (
                  <MenuItem
                    key={exp}
                    value={exp}
                  >
                    {exp}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label='批次号'
              value={formData.batch_number}
              onChange={(e) => handleInputChange('batch_number', e.target.value)}
              placeholder='例如: B-2024-001'
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label='试验规模'
              type='number'
              value={formData.scale}
              onChange={(e) => handleInputChange('scale', e.target.value)}
              placeholder='请输入规模数值'
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>规模单位</InputLabel>
              <Select
                value={formData.scale_unit}
                label='规模单位'
                onChange={(e) => handleInputChange('scale_unit', e.target.value)}
              >
                {scaleUnits.map((unit) => (
                  <MenuItem
                    key={unit}
                    value={unit}
                  >
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider sx={{ mb: 2 }} />
            <Stack
              direction='row'
              spacing={2}
              sx={{ justifyContent: 'flex-end' }}
            >
              <Button
                variant='outlined'
                startIcon={<X />}
                onClick={handleCancel}
              >
                取消
              </Button>
              <Button
                variant='contained'
                startIcon={<Save />}
                onClick={handleSubmit}
              >
                {isEdit ? '保存修改' : '创建试验'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default RsExperimentCreatePage;
