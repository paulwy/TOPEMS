/**
 * V45.0 Track D: A/B 测试管理面板
 *
 * 实验列表 + 创建表单 + 结果可视化：
 * - 列出全部实验（名称 / 状态 / 变体 / 流量分配）
 * - 创建实验（名称 + 描述 + 变体 + 对照组 + 流量分配）
 * - 生命周期操作（启动 / 暂停 / 完成 / 删除）
 * - 结果可视化（各变体转化率 / 置信度 / 赢家）
 *
 * 数据源：@/utils/bff/abTesting（abTestEngine）+ @/hooks/bff/useABTest。
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  type ChipOwnProps,
} from '@mui/material';
import {
  Plus,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  FlaskConical,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import i18n from '@/i18n';
import { ExperimentStatus, type Experiment } from '@/utils/bff/abTesting';
import {
  useActiveExperiments,
  useExperimentAdmin,
  useExperimentResult,
  type CreateExperimentInput,
} from '@/hooks/bff/useABTest';

// ==================== 状态徽标 ====================

const STATUS_META: Record<ExperimentStatus, { color: ChipOwnProps['color']; label: string }> = {
  [ExperimentStatus.DRAFT]: { color: 'default', label: i18n.t('abtest.status_draft', '草稿') },
  [ExperimentStatus.RUNNING]: {
    color: 'success',
    label: i18n.t('abtest.status_running', '运行中'),
  },
  [ExperimentStatus.PAUSED]: { color: 'warning', label: i18n.t('abtest.status_paused', '已暂停') },
  [ExperimentStatus.COMPLETED]: {
    color: 'info',
    label: i18n.t('abtest.status_completed', '已完成'),
  },
};

// ==================== 创建表单 ====================

interface CreateFormState {
  name: string;
  description: string;
  controlName: string;
  variantName: string;
  traffic: number;
}

function emptyForm(): CreateFormState {
  return {
    name: '',
    description: '',
    controlName: i18n.t('ai.ab_test_panel.control_group'),
    variantName: i18n.t('ai.ab_test_panel.variant_group'),
    traffic: 100,
  };
}

// ==================== 单行实验 ====================

function ExperimentRow({
  experiment,
  onRefresh,
}: {
  experiment: Experiment;
  onRefresh: () => void;
}) {
  const admin = useExperimentAdmin();
  const { result, isSignificant, winner } = useExperimentResult(experiment.id);
  const meta = STATUS_META[experiment.status];
  const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0) || 1;

  return (
    <TableRow hover>
      <TableCell>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <FlaskConical size={16} />
          <Typography
            variant='body2'
            sx={{ fontWeight: 600 }}
          >
            {experiment.name}
          </Typography>
        </Stack>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {experiment.description || experiment.id}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          size='small'
          color={meta.color}
          label={meta.label}
        />
      </TableCell>
      <TableCell>
        <Stack
          direction='row'
          spacing={0.5}
        >
          {experiment.variants.map((v) => (
            <Tooltip
              key={v.id}
              title={`${v.name} · ${((v.weight / totalWeight) * 100).toFixed(0)}%`}
            >
              <Chip
                size='small'
                variant={v.is_control ? 'filled' : 'outlined'}
                color={v.is_control ? 'primary' : 'default'}
                label={`${v.name} ${((v.weight / totalWeight) * 100).toFixed(0)}%`}
              />
            </Tooltip>
          ))}
        </Stack>
      </TableCell>
      <TableCell align='right'>{(experiment.traffic_allocation * 100).toFixed(0)}%</TableCell>
      <TableCell>
        {result ? (
          <Box sx={{ minWidth: 140 }}>
            {result.variant_results.map((vr) => (
              <Stack
                key={vr.variant_id}
                direction='row'
                spacing={1}
                sx={{ alignItems: 'center', mb: 0.5 }}
              >
                <Typography
                  variant='caption'
                  sx={{ width: 64 }}
                >
                  {vr.variant_name}
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(100, vr.conversion_rate * 100)}
                  sx={{ flex: 1, height: 6, borderRadius: 3 }}
                  color={vr.is_control ? 'primary' : 'secondary'}
                />
                <Typography variant='caption'>{(vr.conversion_rate * 100).toFixed(1)}%</Typography>
              </Stack>
            ))}
            {isSignificant && winner && (
              <Chip
                size='small'
                color='success'
                icon={<Trophy size={12} />}
                label={i18n.t('abtest.winner', '赢家')}
              />
            )}
            {!isSignificant && experiment.status === ExperimentStatus.RUNNING && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('abtest.not_significant', '未达显著')}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('abtest.no_data', '暂无数据')}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Stack
          direction='row'
          spacing={0.5}
          sx={{ justifyContent: 'flex-end' }}
        >
          {experiment.status === ExperimentStatus.DRAFT && (
            <Tooltip title={i18n.t('abtest.start', '启动')}>
              <IconButton
                size='small'
                color='success'
                onClick={() => {
                  admin.startExperiment(experiment.id);
                  onRefresh();
                }}
              >
                <Play size={16} />
              </IconButton>
            </Tooltip>
          )}
          {experiment.status === ExperimentStatus.RUNNING && (
            <Tooltip title={i18n.t('abtest.pause', '暂停')}>
              <IconButton
                size='small'
                color='warning'
                onClick={() => {
                  admin.pauseExperiment(experiment.id);
                  onRefresh();
                }}
              >
                <Pause size={16} />
              </IconButton>
            </Tooltip>
          )}
          {experiment.status !== ExperimentStatus.COMPLETED && (
            <Tooltip title={i18n.t('abtest.complete', '完成')}>
              <IconButton
                size='small'
                color='info'
                onClick={() => {
                  admin.completeExperiment(experiment.id);
                  onRefresh();
                }}
              >
                <CheckCircle size={16} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={i18n.t('abtest.delete', '删除')}>
            <IconButton
              size='small'
              color='error'
              onClick={() => {
                admin.deleteExperiment(experiment.id);
                onRefresh();
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

// ==================== ABTestPanel ====================

/** ABTestPanel Props */
export interface ABTestPanelProps {
  /** 面板标题（默认使用 i18n 文案） */
  title?: string;
  /** 是否允许创建实验，默认 true */
  allowCreate?: boolean;
}

/**
 * A/B 测试管理面板
 *
 * @example
 * ```tsx
 * <ABTestPanel />
 * ```
 */
export function ABTestPanel({
  title,
  allowCreate = true,
}: ABTestPanelProps = {}): React.ReactElement {
  const { allExperiments, count, refresh } = useActiveExperiments();
  const admin = useExperimentAdmin();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (): void => {
    if (!form.name.trim()) {
      setError(i18n.t('abtest.name_required', '请输入实验名称'));
      return;
    }
    const input: CreateExperimentInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      traffic_allocation: Math.min(100, Math.max(0, form.traffic)) / 100,
      variants: [
        {
          name: form.controlName.trim() || i18n.t('ai.ab_test_panel.control_group'),
          weight: 50,
          is_control: true,
          config: {},
        },
        {
          name: form.variantName.trim() || i18n.t('ai.ab_test_panel.variant_group'),
          weight: 50,
          is_control: false,
          config: {},
        },
      ],
    };
    admin.createExperiment(input);
    setOpen(false);
    setForm(emptyForm());
    setError(null);
    refresh();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack
        direction='row'
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <FlaskConical size={20} />
          <Typography variant='h6'>{title ?? i18n.t('abtest.title', 'A/B 实验管理')}</Typography>
          <Chip
            size='small'
            color='success'
            label={i18n.t('abtest.active_count', '活跃 {count}', { count })}
          />
        </Stack>
        <Stack
          direction='row'
          spacing={1}
        >
          <Tooltip title={i18n.t('abtest.refresh', '刷新')}>
            <IconButton
              size='small'
              onClick={refresh}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
          {allowCreate && (
            <Button
              size='small'
              variant='contained'
              startIcon={<Plus size={16} />}
              onClick={() => setOpen(true)}
            >
              {i18n.t('abtest.create', '创建实验')}
            </Button>
          )}
        </Stack>
      </Stack>

      {allExperiments.length === 0 ? (
        <Alert severity='info'>
          {i18n.t('abtest.empty', '暂无实验，点击右上角创建第一个 A/B 实验')}
        </Alert>
      ) : (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('abtest.col_name', '实验')}</TableCell>
                <TableCell>{i18n.t('abtest.col_status', '状态')}</TableCell>
                <TableCell>{i18n.t('abtest.col_variants', '变体')}</TableCell>
                <TableCell align='right'>{i18n.t('abtest.col_traffic', '流量')}</TableCell>
                <TableCell>{i18n.t('abtest.col_result', '结果')}</TableCell>
                <TableCell align='right'>{i18n.t('abtest.col_actions', '操作')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allExperiments.map((exp) => (
                <ExperimentRow
                  key={exp.id}
                  experiment={exp}
                  onRefresh={refresh}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 创建对话框 */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('abtest.create_title', '创建 A/B 实验')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert
              severity='error'
              sx={{ mb: 2, mt: 1 }}
            >
              {error}
            </Alert>
          )}
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={i18n.t('abtest.name', '实验名称')}
              size='small'
              value={form.name}
              required
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label={i18n.t('abtest.description', '实验描述')}
              size='small'
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Stack
              direction='row'
              spacing={2}
            >
              <TextField
                label={i18n.t('abtest.control', '对照组')}
                size='small'
                value={form.controlName}
                onChange={(e) => setForm((f) => ({ ...f, controlName: e.target.value }))}
              />
              <TextField
                label={i18n.t('abtest.treatment', '实验组')}
                size='small'
                value={form.variantName}
                onChange={(e) => setForm((f) => ({ ...f, variantName: e.target.value }))}
              />
            </Stack>
            <TextField
              label={i18n.t('abtest.traffic', '流量分配 (%)')}
              size='small'
              type='number'
              slotProps={{ htmlInput: { min: 1, max: 100 } }}
              value={form.traffic}
              onChange={(e) => setForm((f) => ({ ...f, traffic: Number(e.target.value) }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{i18n.t('abtest.cancel', '取消')}</Button>
          <Button
            variant='contained'
            startIcon={<Plus size={16} />}
            onClick={handleCreate}
          >
            {i18n.t('abtest.create', '创建')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export default ABTestPanel;
