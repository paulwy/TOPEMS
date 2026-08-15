/**
 * V45.0 Track D: A/B 测试管理面板
 *
 * 功能:
 * - 实验列表（状态 / 变体 / 流量分配 / 参与人数）
 * - 创建实验表单（名称 / 描述 / 变体 / 流量比例 / 定向规则）
 * - 实验结果可视化（转化率对比 + 置信度 + Z-score）
 * - 暂停 / 恢复 / 完成实验
 *
 * 与 abTestEngine 单例 + useABTest hooks 配合。
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  TextField,
  MenuItem,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  AlertTitle,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import i18n from '@/i18n';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  FlaskConical,
  TrendingUp,
  Trophy,
  Activity,
  Target,
} from 'lucide-react';
import {
  useActiveExperiments,
  useExperimentResult,
  useExperimentAdmin,
} from '@/hooks/bff/useABTest';
import { ExperimentStatus, type Experiment, type Variant } from '@/utils/bff/ab-testing';
import { useNotificationStore } from '@/store';

// ==================== 状态映射 ====================

const STATUS_LABELS: Record<ExperimentStatus, string> = {
  [ExperimentStatus.DRAFT]: i18n.t('components.ab_test_panel.k0'),
  [ExperimentStatus.RUNNING]: i18n.t('components.ab_test_panel.k1'),
  [ExperimentStatus.PAUSED]: i18n.t('components.ab_test_panel.k2'),
  [ExperimentStatus.COMPLETED]: i18n.t('components.ab_test_panel.k3'),
};

const STATUS_COLORS: Record<ExperimentStatus, 'default' | 'primary' | 'warning' | 'success'> = {
  [ExperimentStatus.DRAFT]: 'default',
  [ExperimentStatus.RUNNING]: 'primary',
  [ExperimentStatus.PAUSED]: 'warning',
  [ExperimentStatus.COMPLETED]: 'success',
};

// ==================== 转化率可视化 ====================

/** 转化率对比条 */
const ConversionRateBar: React.FC<{
  variantName: string;
  rate: number;
  participants: number;
  conversions: number;
  isWinner: boolean;
  isControl: boolean;
}> = ({ variantName, rate, participants, conversions, isWinner, isControl }) => {
  const percent = (rate * 100).toFixed(2);
  const barColor = isWinner ? 'success.main' : isControl ? 'info.main' : 'primary.main';

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack
        direction='row'
        sx={{ mb: 0.5, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Typography
            variant='body2'
            sx={{ fontWeight: 600 }}
          >
            {variantName}
          </Typography>
          {isControl && (
            <Chip
              size='small'
              label={i18n.t('components.ab_test_panel.k4')}
              variant='outlined'
              color='info'
              sx={{ height: 18 }}
            />
          )}
          {isWinner && (
            <Chip
              size='small'
              icon={<Trophy size={12} />}
              label={i18n.t('components.ab_test_panel.k5')}
              color='success'
              sx={{ height: 18 }}
            />
          )}
        </Stack>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {conversions} / {participants} ({percent}%)
        </Typography>
      </Stack>
      <LinearProgress
        variant='determinate'
        value={rate * 100}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 4 },
        }}
      />
    </Box>
  );
};

// ==================== 实验结果面板 ====================

/** 实验结果面板 */
const ExperimentResultPanel: React.FC<{ experimentId: string }> = ({ experimentId }) => {
  const { result, isSignificant, winner } = useExperimentResult(experimentId);

  if (!result || result.variant_results.length === 0) {
    return (
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ py: 1, display: 'block' }}
      >
        {i18n.t('components.ab_test_panel.k0')}
      </Typography>
    );
  }

  return (
    <Box sx={{ py: 1 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2, flexWrap: 'wrap', gap: 2 }}
      >
        <Chip
          size='small'
          icon={<Activity size={14} />}
          label={`${i18n.t('components.ab_test_panel.k0')}${(result.confidence * 100).toFixed(1)}%`}
          color={isSignificant ? 'success' : 'default'}
          variant={isSignificant ? 'filled' : 'outlined'}
        />
        <Chip
          size='small'
          label={`Z-score ${result.z_score.toFixed(3)}`}
          variant='outlined'
        />
        <Chip
          size='small'
          label={`P-value ${result.p_value.toFixed(4)}`}
          variant='outlined'
        />
        <Chip
          size='small'
          label={isSignificant ? i18n.t('components.ab_test_panel.k7') : i18n.t('components.ab_test_panel.k6')}
          color={isSignificant ? 'success' : 'warning'}
          variant='outlined'
        />
      </Stack>

      {result.variant_results.map((vr) => (
        <ConversionRateBar
          key={vr.variant_id}
          variantName={vr.variant_name}
          rate={vr.conversion_rate}
          participants={vr.participants}
          conversions={vr.conversions}
          isWinner={winner === vr.variant_id}
          isControl={vr.is_control}
        />
      ))}

      {winner && (
        <Alert
          severity='success'
          icon={<Trophy size={18} />}
          sx={{ mt: 1.5, py: 0.5 }}
        >
          <AlertTitle sx={{ mb: 0 }}>{i18n.t('components.ab_test_panel.k8')}</AlertTitle>
          [i18n.t('components.ab_test_panel.k1')]: {result.variant_results.find((v) => v.variant_id === winner)?.variant_name}
        </Alert>
      )}
    </Box>
  );
};

// ==================== 实验行 ====================

/** 实验行（可展开） */
const ExperimentRow: React.FC<{
  experiment: Experiment;
  onAction: (action: 'start' | 'pause' | 'complete' | 'delete', id: string) => void;
}> = ({ experiment, onAction }) => {
  const [open, setOpen] = useState(false);
  const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0);

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton
            size='small'
            onClick={() => setOpen((v) => !v)}
            aria-label={i18n.t('components.ab_test_panel.k9')}
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Stack spacing={0.5}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 600 }}
            >
              {experiment.name}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {experiment.id}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell>
          <Chip
            size='small'
            label={STATUS_LABELS[experiment.status]}
            color={STATUS_COLORS[experiment.status]}
          />
        </TableCell>
        <TableCell>
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {experiment.variants.map((v) => (
              <Chip
                key={v.id}
                size='small'
                label={`${v.name} (${((v.weight / totalWeight) * 100).toFixed(0)}%)`}
                variant={v.is_control ? 'filled' : 'outlined'}
                color={v.is_control ? 'info' : 'default'}
                sx={{ mb: 0.5 }}
              />
            ))}
          </Stack>
        </TableCell>
        <TableCell>
          <Typography variant='body2'>
            {(experiment.traffic_allocation * 100).toFixed(0)}%
          </Typography>
        </TableCell>
        <TableCell align='right'>
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ justifyContent: 'flex-end' }}
          >
            {experiment.status === ExperimentStatus.DRAFT && (
              <Tooltip title={i18n.t('components.ab_test_panel.k10')}>
                <IconButton
                  size='small'
                  color='primary'
                  onClick={() => onAction('start', experiment.id)}
                  aria-label={i18n.t('components.ab_test_panel.k11')}
                >
                  <Play size={16} />
                </IconButton>
              </Tooltip>
            )}
            {experiment.status === ExperimentStatus.RUNNING && (
              <Tooltip title={i18n.t('components.ab_test_panel.k12')}>
                <IconButton
                  size='small'
                  color='warning'
                  onClick={() => onAction('pause', experiment.id)}
                  aria-label={i18n.t('components.ab_test_panel.k13')}
                >
                  <Pause size={16} />
                </IconButton>
              </Tooltip>
            )}
            {(experiment.status === ExperimentStatus.RUNNING ||
              experiment.status === ExperimentStatus.PAUSED) && (
              <Tooltip title={i18n.t('components.ab_test_panel.k14')}>
                <IconButton
                  size='small'
                  color='success'
                  onClick={() => onAction('complete', experiment.id)}
                  aria-label={i18n.t('components.ab_test_panel.k15')}
                >
                  <CheckCircle size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={i18n.t('components.ab_test_panel.k16')}>
              <IconButton
                size='small'
                color='error'
                onClick={() => onAction('delete', experiment.id)}
                aria-label={i18n.t('components.ab_test_panel.k17')}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          colSpan={6}
          sx={{ py: 0, borderBottom: open ? undefined : 'none' }}
        >
          <Collapse in={open}>
            <Box sx={{ p: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mb: 1 }}
              >
                {experiment.description}
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 1, alignItems: 'center' }}
              >
                <TrendingUp size={16} />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('components.ab_test_panel.k2')}
                </Typography>
              </Stack>
              <ExperimentResultPanel experimentId={experiment.id} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// ==================== 创建实验表单 ====================

/** 变体表单行 */
interface VariantForm {
  name: string;
  weight: number;
  is_control: boolean;
  config: Record<string, unknown>;
}

/** 创建实验表单 */
const CreateExperimentForm: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    variants: VariantForm[];
    traffic_allocation: number;
  }) => void;
}> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [traffic, setTraffic] = useState(100);
  const [variants, setVariants] = useState<VariantForm[]>([
    { name: i18n.t('components.ab_test_panel.k18'), weight: 50, is_control: true, config: {} },
    { name: i18n.t('components.ab_test_panel.a_19'), weight: 50, is_control: false, config: {} },
  ]);

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        name: `${i18n.t('components.ab_test_panel.k1')}${String.fromCharCode(65 + prev.length)}`,
        weight: 25,
        is_control: false,
        config: {},
      },
    ]);
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants((prev) => {
      // 不允许删除对照组；至少保留 2 个变体
      if (prev[idx].is_control) return prev;
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleVariantChange = (idx: number, field: keyof VariantForm, value: unknown) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        if (field === 'is_control' && value === true) {
          // 设置为对照组时，清除其他变体的 is_control
          return { ...v, is_control: true };
        }
        return { ...v, [field]: value };
      })
    );
    // 处理对照组互斥
    if (field === 'is_control' && value === true) {
      setVariants((prev) => prev.map((v, i) => (i === idx ? v : { ...v, is_control: false })));
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (variants.length < 2) return;
    if (!variants.some((v) => v.is_control)) return;
    onCreate({
      name: name.trim(),
      description: description.trim() || i18n.t('components.ab_test_panel.k20'),
      variants,
      traffic_allocation: traffic / 100,
    });
    // 重置表单
    setName('');
    setDescription('');
    setTraffic(100);
    setVariants([
      { name: i18n.t('components.ab_test_panel.k21'), weight: 50, is_control: true, config: {} },
      { name: i18n.t('components.ab_test_panel.a_22'), weight: 50, is_control: false, config: {} },
    ]);
    onClose();
  };

  const totalWeight = variants.reduce((s, v) => s + v.weight, 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <FlaskConical size={18} />
          <span>{i18n.t('components.ab_test_panel.k23')}</span>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label={i18n.t('components.ab_test_panel.k24')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size='small'
            placeholder={i18n.t('components.ab_test_panel.k25')}
          />
          <TextField
            label={i18n.t('components.ab_test_panel.k26')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size='small'
            multiline
            minRows={2}
            placeholder={i18n.t('components.ab_test_panel.k27')}
          />
          <Box>
            <Stack
              direction='row'
              sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('components.ab_test_panel.k0')}{traffic}%
              </Typography>
            </Stack>
            <Slider
              value={traffic}
              onChange={(_, v) => setTraffic(v as number)}
              min={1}
              max={100}
              step={1}
              valueLabelDisplay='auto'
            />
          </Box>
          <Divider />
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant='subtitle2'>{i18n.t('components.ab_test_panel.k0')}</Typography>
            <Button
              size='small'
              startIcon={<Plus size={14} />}
              onClick={handleAddVariant}
            >
              {i18n.t('components.ab_test_panel.k3')}
            </Button>
          </Stack>
          {variants.map((v, idx) => (
            <Stack
              key={idx}
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <TextField
                label={i18n.t('components.ab_test_panel.k28')}
                value={v.name}
                onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                size='small'
                sx={{ flex: 1 }}
              />
              <TextField
                label={i18n.t('components.ab_test_panel.k29')}
                type='number'
                value={v.weight}
                onChange={(e) => handleVariantChange(idx, 'weight', Number(e.target.value) || 0)}
                size='small'
                sx={{ width: 90 }}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <ToggleButtonGroup
                size='small'
                value={v.is_control ? 'control' : 'variant'}
                exclusive
                onChange={(_, val) =>
                  val && handleVariantChange(idx, 'is_control', val === 'control')
                }
              >
                <ToggleButton value='variant'>{i18n.t('components.ab_test_panel.k30')}</ToggleButton>
                <ToggleButton value='control'>{i18n.t('components.ab_test_panel.k31')}</ToggleButton>
              </ToggleButtonGroup>
              <IconButton
                size='small'
                color='error'
                onClick={() => handleRemoveVariant(idx)}
                disabled={v.is_control || variants.length <= 2}
                aria-label={i18n.t('components.ab_test_panel.k32')}
              >
                <Trash2 size={16} />
              </IconButton>
            </Stack>
          ))}
          {totalWeight > 0 && (
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('components.ab_test_panel.k4')}
              {variants
                .map((v) => `${v.name}: ${((v.weight / totalWeight) * 100).toFixed(1)}%`)
                .join('， ')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{i18n.t('components.ab_test_panel.k33')}</Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={!name.trim() || variants.length < 2 || !variants.some((v) => v.is_control)}
        >
          {i18n.t('components.ab_test_panel.k5')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==================== ABTestPanel 主组件 ====================

/** ABTestPanel Props */
export interface ABTestPanelProps {
  /** 是否默认展开，默认 false */
  defaultExpanded?: boolean;
  /** 面板最大高度（px），默认 600 */
  maxHeight?: number;
}

/**
 * A/B 测试管理面板
 *
 * 展示所有实验列表 + 创建实验 + 实验结果可视化 + 生命周期管理。
 *
 * @example
 * ```tsx
 * <ABTestPanel defaultExpanded />
 * ```
 */
export const ABTestPanel: React.FC<ABTestPanelProps> = ({
  defaultExpanded = false,
  maxHeight = 600,
}) => {
  const { allExperiments, refresh } = useActiveExperiments();
  const {
    createExperiment,
    startExperiment,
    pauseExperiment,
    completeExperiment,
    deleteExperiment,
  } = useExperimentAdmin();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleAction = (action: 'start' | 'pause' | 'complete' | 'delete', id: string) => {
    try {
      switch (action) {
        case 'start':
          startExperiment(id);
          addNotification({ title: i18n.t('components.ab_test_panel.k34'), message: id, type: 'success' });
          break;
        case 'pause':
          pauseExperiment(id);
          addNotification({ title: i18n.t('components.ab_test_panel.k35'), message: id, type: 'warning' });
          break;
        case 'complete':
          completeExperiment(id);
          addNotification({ title: i18n.t('components.ab_test_panel.k36'), message: id, type: 'success' });
          break;
        case 'delete':
          deleteExperiment(id);
          addNotification({ title: i18n.t('components.ab_test_panel.k37'), message: id, type: 'info' });
          break;
      }
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addNotification({ title: i18n.t('components.ab_test_panel.k38'), message, type: 'error' });
    }
  };

  const handleCreate = (input: {
    name: string;
    description: string;
    variants: VariantForm[];
    traffic_allocation: number;
  }) => {
    try {
      createExperiment(input);
      addNotification({ title: i18n.t('components.ab_test_panel.k39'), message: input.name, type: 'success' });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addNotification({ title: i18n.t('components.ab_test_panel.k40'), message, type: 'error' });
    }
  };

  const runningCount = useMemo(
    () => allExperiments.filter((e) => e.status === ExperimentStatus.RUNNING).length,
    [allExperiments]
  );

  return (
    <Paper
      elevation={2}
      sx={{ borderRadius: 2, overflow: 'hidden' }}
    >
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          bgcolor: 'primary.50',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <FlaskConical size={18} />
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('components.ab_test_panel.ab_6')}
          </Typography>
          <Chip
            size='small'
            label={`${allExperiments.length}${i18n.t('components.ab_test_panel.k2')}`}
            variant='outlined'
          />
          {runningCount > 0 && (
            <Chip
              size='small'
              icon={<Activity size={12} />}
              label={`${runningCount}${i18n.t('components.ab_test_panel.k3')}`}
              color='primary'
            />
          )}
        </Stack>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Button
            size='small'
            startIcon={<Plus size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              setCreateOpen(true);
            }}
          >
            {i18n.t('components.ab_test_panel.k7')}
          </Button>
          <IconButton
            size='small'
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-label={i18n.t('components.ab_test_panel.k41')}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
        </Stack>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ maxHeight, overflow: 'auto' }}>
          {allExperiments.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
              }}
            >
              <Target
                size={32}
                color='#bbb'
              />
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mt: 1 }}
              >
                {i18n.t('components.ab_test_panel.i18n_8')}.t('components.ab_test_panel.k42')开始
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell>{i18n.t('components.ab_test_panel.k43')}</TableCell>
                    <TableCell sx={{ width: 90 }}>{i18n.t('components.ab_test_panel.k44')}</TableCell>
                    <TableCell>{i18n.t('components.ab_test_panel.k45')}</TableCell>
                    <TableCell sx={{ width: 70 }}>{i18n.t('components.ab_test_panel.k46')}</TableCell>
                    <TableCell
                      sx={{ width: 140 }}
                      align='right'
                    >
                      {i18n.t('components.ab_test_panel.k10')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allExperiments.map((exp) => (
                    <ExperimentRow
                      key={exp.id}
                      experiment={exp}
                      onAction={handleAction}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Collapse>
      <CreateExperimentForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </Paper>
  );
};

export default ABTestPanel;
