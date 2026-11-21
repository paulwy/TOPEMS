import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  MenuItem,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import {
  aiGovernanceApi,
  type GovernanceSuggestion,
  type GovernanceModel,
  type MatchRule,
  type MatchResult,
  type MatchStats,
  type ClassificationModel,
  type ClassificationResult,
  type ClassificationStats,
} from '@/api/master/aiGovernance';
import i18n from '@/i18n';

const t = (key: string): string => i18n.t(`master.ai_governance.${key}`);

const AiGovernancePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 治理建议
  const [analyzeForm, setAnalyzeForm] = useState({ entity_type: '', entity_id: '' });
  const [suggestions, setSuggestions] = useState<GovernanceSuggestion[]>([]);
  const [models, setModels] = useState<GovernanceModel[]>([]);

  // 智能匹配
  const [matchForm, setMatchForm] = useState({
    source_id: '',
    target_id: '',
    entity_type: '',
  });
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [rules, setRules] = useState<MatchRule[]>([]);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    rule_type: '',
    field_config: '{}',
    threshold: 0.8,
  });
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);

  // 自动分类
  const [classifyForm, setClassifyForm] = useState({ entity_type: '', entity_id: '' });
  const [classifiers, setClassifiers] = useState<ClassificationModel[]>([]);
  const [classifierForm, setClassifierForm] = useState({
    name: '',
    entity_type: '',
    categories: '',
    algorithm: '',
  });
  const [classifyResult, setClassifyResult] = useState<ClassificationResult | null>(null);
  const [classifyStats, setClassifyStats] = useState<ClassificationStats | null>(null);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await aiGovernanceApi.getSuggestions();
      if (res.success) setSuggestions(res.data || []);
    } catch (err) {
      console.error('加载治理建议失败', err);
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const res = await aiGovernanceApi.getModels();
      if (res.success) setModels(res.data || []);
    } catch (err) {
      console.error('加载模型失败', err);
    }
  }, []);

  const loadMatchData = useCallback(async () => {
    try {
      const [res, r2, stats] = await Promise.all([
        aiGovernanceApi.getMatchResults(),
        aiGovernanceApi.getMatchRules(),
        aiGovernanceApi.getMatchStats(),
      ]);
      if (res.success) setMatchResults(res.data || []);
      if (r2.success) setRules(r2.data || []);
      if (stats.success) setMatchStats(stats.data || null);
    } catch (err) {
      console.error('加载匹配数据失败', err);
    }
  }, []);

  const loadClassifierData = useCallback(async () => {
    try {
      const [res, stats] = await Promise.all([
        aiGovernanceApi.getClassifiers(),
        aiGovernanceApi.getClassificationStats(),
      ]);
      if (res.success) setClassifiers(res.data || []);
      if (stats.success) setClassifyStats(stats.data || null);
    } catch (err) {
      console.error('加载分类数据失败', err);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
    loadModels();
    loadMatchData();
    loadClassifierData();
  }, [loadSuggestions, loadModels, loadMatchData, loadClassifierData]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiGovernanceApi.analyze(analyzeForm);
      if (!res.success) setError(res.message || t('analyze_failed'));
      else {
        setSuggestions(res.data || []);
        loadModels();
      }
    } catch (err) {
      console.error('AI 分析失败', err);
      setError(t('analyze_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    try {
      const res = await aiGovernanceApi.applySuggestion(id);
      if (res.success) setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('应用建议失败', err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const res = await aiGovernanceApi.dismissSuggestion(id);
      if (res.success) setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('忽略建议失败', err);
    }
  };

  const handleTrain = async (modelId: string) => {
    setLoading(true);
    try {
      await aiGovernanceApi.trainModel(modelId);
      loadModels();
    } catch (err) {
      console.error('训练模型失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiGovernanceApi.matchEntities(matchForm);
      if (!res.success) setError(res.message || t('match_failed'));
      else {
        setMatchResult(res.data);
        loadMatchData();
      }
    } catch (err) {
      console.error('实体匹配失败', err);
      setError(t('match_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMatchReview = async (id: string, confirm: boolean) => {
    try {
      if (confirm) await aiGovernanceApi.confirmMatch(id);
      else await aiGovernanceApi.rejectMatch(id);
      loadMatchData();
    } catch (err) {
      console.error('匹配裁决失败', err);
    }
  };

  const handleAddRule = async () => {
    setLoading(true);
    setError(null);
    try {
      let fieldConfig: Record<string, unknown>;
      try {
        fieldConfig = JSON.parse(ruleForm.field_config);
      } catch {
        setError(t('field_config_invalid'));
        setLoading(false);
        return;
      }
      const res = await aiGovernanceApi.createMatchRule({
        name: ruleForm.name,
        rule_type: ruleForm.rule_type,
        field_config: fieldConfig,
        threshold: ruleForm.threshold || undefined,
      });
      if (!res.success) setError(res.message || t('rule_add_failed'));
      else {
        setRuleForm({ name: '', rule_type: '', field_config: '{}', threshold: 0.8 });
        loadMatchData();
      }
    } catch (err) {
      console.error('新增匹配规则失败', err);
      setError(t('rule_add_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassifier = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiGovernanceApi.createClassifier({
        name: classifierForm.name,
        entity_type: classifierForm.entity_type,
        categories: classifierForm.categories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        algorithm: classifierForm.algorithm || undefined,
      });
      if (!res.success) setError(res.message || t('classifier_create_failed'));
      else {
        setClassifierForm({ name: '', entity_type: '', categories: '', algorithm: '' });
        loadClassifierData();
      }
    } catch (err) {
      console.error('创建分类器失败', err);
      setError(t('classifier_create_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiGovernanceApi.classifyEntity(
        classifyForm.entity_type,
        classifyForm.entity_id
      );
      if (!res.success) setError(res.message || t('classify_failed'));
      else {
        setClassifyResult(res.data);
        loadClassifierData();
      }
    } catch (err) {
      console.error('自动分类失败', err);
      setError(t('classify_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyReview = async (approved: boolean) => {
    if (!classifyResult) return;
    try {
      const res = await aiGovernanceApi.reviewClassification(classifyResult.id, approved);
      if (res.success) {
        setClassifyResult(null);
        loadClassifierData();
      }
    } catch (err) {
      console.error('分类复核失败', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
        <Typography
          variant='h5'
          sx={{ fontWeight: 600 }}
        >
          {t('title')}
        </Typography>
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {t('desc')}
      </Typography>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab
          icon={<AutoAwesomeIcon />}
          iconPosition='start'
          label={t('tab_governance')}
        />
        <Tab
          icon={<FactCheckIcon />}
          iconPosition='start'
          label={t('tab_matching')}
        />
        <Tab
          icon={<CategoryIcon />}
          iconPosition='start'
          label={t('tab_classify')}
        />
      </Tabs>

      {loading && (
        <CircularProgress
          size={24}
          sx={{ display: 'block', mb: 2 }}
        />
      )}

      {/* Tab 1: 治理建议 */}
      {tab === 0 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('analyze_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('entity_type')}
                  value={analyzeForm.entity_type}
                  onChange={(e) => setAnalyzeForm({ ...analyzeForm, entity_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('entity_id')}
                  value={analyzeForm.entity_id}
                  onChange={(e) => setAnalyzeForm({ ...analyzeForm, entity_id: e.target.value })}
                  size='small'
                />
                <Button
                  variant='contained'
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {t('analyze_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('suggestions_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadSuggestions}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {suggestions.length === 0 ? (
                <Typography variant='body1'>{t('suggestions_empty')}</Typography>
              ) : (
                suggestions.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      p: 1,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderRadius: 1,
                    }}
                  >
                    <Chip
                      label={s.type}
                      size='small'
                      color='primary'
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant='body2'>{s.description}</Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {s.entity_type} / {s.entity_id} · {t('confidence')}:{' '}
                        {(s.confidence * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Chip
                      label={s.action}
                      size='small'
                    />
                    <Tooltip title={t('apply')}>
                      <IconButton
                        size='small'
                        color='success'
                        onClick={() => handleApply(s.id)}
                      >
                        <CheckIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('dismiss')}>
                      <IconButton
                        size='small'
                        color='default'
                        onClick={() => handleDismiss(s.id)}
                      >
                        <CloseIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('models_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadModels}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {models.length === 0 ? (
                <Typography variant='body1'>{t('models_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('model_name')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('model_domain')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('model_accuracy')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('model_version')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('col_actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {models.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.name}</TableCell>
                          <TableCell>{m.domain}</TableCell>
                          <TableCell>{(m.accuracy * 100).toFixed(1)}%</TableCell>
                          <TableCell>{m.version}</TableCell>
                          <TableCell>
                            <Tooltip title={t('train')}>
                              <IconButton
                                size='small'
                                onClick={() => handleTrain(m.id)}
                              >
                                <ModelTrainingIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 2: 智能匹配 */}
      {tab === 1 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('match_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('source_id')}
                  value={matchForm.source_id}
                  onChange={(e) => setMatchForm({ ...matchForm, source_id: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('target_id')}
                  value={matchForm.target_id}
                  onChange={(e) => setMatchForm({ ...matchForm, target_id: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('entity_type')}
                  value={matchForm.entity_type}
                  onChange={(e) => setMatchForm({ ...matchForm, entity_type: e.target.value })}
                  size='small'
                />
                <Button
                  variant='contained'
                  onClick={handleMatch}
                  disabled={loading}
                >
                  {t('match_btn')}
                </Button>
              </Box>
              {matchResult && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`${t('match_score')}: ${(matchResult.match_score * 100).toFixed(1)}%`}
                    color='primary'
                    size='small'
                  />
                  <Chip
                    label={`${t('confidence')}: ${(matchResult.confidence * 100).toFixed(1)}%`}
                    size='small'
                  />
                  <Chip
                    label={matchResult.status}
                    size='small'
                    color='warning'
                  />
                  <Tooltip title={t('confirm')}>
                    <IconButton
                      size='small'
                      color='success'
                      onClick={() => handleMatchReview(matchResult.id, true)}
                    >
                      <ThumbUpIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('reject')}>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={() => handleMatchReview(matchResult.id, false)}
                    >
                      <ThumbDownIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </CardContent>
          </Card>

          {matchStats && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {t('match_stats_title')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip label={`${t('total_results')}: ${matchStats.total_results}`} />
                  <Chip
                    label={`${t('pending')}: ${matchStats.pending}`}
                    color='warning'
                  />
                  <Chip
                    label={`${t('confirmed')}: ${matchStats.confirmed}`}
                    color='success'
                  />
                  <Chip
                    label={`${t('rejected')}: ${matchStats.rejected}`}
                    color='error'
                  />
                  <Chip label={`${t('avg_score')}: ${(matchStats.avg_score * 100).toFixed(1)}%`} />
                </Box>
              </CardContent>
            </Card>
          )}

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('match_results_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadMatchData}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {matchResults.length === 0 ? (
                <Typography variant='body1'>{t('match_results_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('source_id')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('target_id')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('match_score')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('col_actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {matchResults.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.source_id}</TableCell>
                          <TableCell>{r.target_id}</TableCell>
                          <TableCell>{(r.match_score * 100).toFixed(1)}%</TableCell>
                          <TableCell>
                            <Chip
                              label={r.status}
                              size='small'
                              color={
                                r.status === 'confirmed'
                                  ? 'success'
                                  : r.status === 'rejected'
                                    ? 'error'
                                    : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {r.status === 'pending' && (
                              <>
                                <Tooltip title={t('confirm')}>
                                  <IconButton
                                    size='small'
                                    color='success'
                                    onClick={() => handleMatchReview(r.id, true)}
                                  >
                                    <ThumbUpIcon fontSize='small' />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('reject')}>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleMatchReview(r.id, false)}
                                  >
                                    <ThumbDownIcon fontSize='small' />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('rules_title')}
              </Typography>
              {rules.length === 0 ? (
                <Typography variant='body1'>{t('rules_empty')}</Typography>
              ) : (
                <TableContainer sx={{ mb: 2 }}>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('rule_name')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('rule_type')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('threshold')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rules.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.rule_type}</TableCell>
                          <TableCell>{r.threshold}</TableCell>
                          <TableCell>
                            <Chip
                              label={r.enabled ? t('enabled') : t('disabled')}
                              size='small'
                              color={r.enabled ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('rule_name')}
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('rule_type')}
                  value={ruleForm.rule_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('field_config')}
                  value={ruleForm.field_config}
                  onChange={(e) => setRuleForm({ ...ruleForm, field_config: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('threshold')}
                  type='number'
                  value={ruleForm.threshold}
                  onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })}
                  size='small'
                  slotProps={{ htmlInput: { step: 0.05, min: 0, max: 1 } }}
                />
                <Button
                  variant='outlined'
                  startIcon={<AddIcon />}
                  onClick={handleAddRule}
                  disabled={loading}
                >
                  {t('add_rule_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 3: 自动分类 */}
      {tab === 2 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('classify_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('entity_type')}
                  value={classifyForm.entity_type}
                  onChange={(e) =>
                    setClassifyForm({ ...classifyForm, entity_type: e.target.value })
                  }
                  size='small'
                />
                <TextField
                  label={t('entity_id')}
                  value={classifyForm.entity_id}
                  onChange={(e) => setClassifyForm({ ...classifyForm, entity_id: e.target.value })}
                  size='small'
                />
                <Button
                  variant='contained'
                  onClick={handleClassify}
                  disabled={loading}
                >
                  {t('classify_btn')}
                </Button>
              </Box>
              {classifyResult && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`${t('category')}: ${classifyResult.suggested_category}`}
                    color='primary'
                    size='small'
                  />
                  <Chip
                    label={`${t('confidence')}: ${(classifyResult.confidence * 100).toFixed(1)}%`}
                    size='small'
                  />
                  <Tooltip title={t('approve')}>
                    <IconButton
                      size='small'
                      color='success'
                      onClick={() => handleClassifyReview(true)}
                    >
                      <ThumbUpIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('reject')}>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={() => handleClassifyReview(false)}
                    >
                      <ThumbDownIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </CardContent>
          </Card>

          {classifyStats && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={`${t('total_classifications')}: ${classifyStats.total_classifications}`}
                  />
                  <Chip
                    label={`${t('approved')}: ${classifyStats.approved}`}
                    color='success'
                  />
                  <Chip
                    label={`${t('pending')}: ${classifyStats.pending}`}
                    color='warning'
                  />
                  <Chip label={`${t('accuracy')}: ${(classifyStats.accuracy * 100).toFixed(1)}%`} />
                </Box>
              </CardContent>
            </Card>
          )}

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('classifiers_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadClassifierData}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {classifiers.length === 0 ? (
                <Typography variant='body1'>{t('classifiers_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('classifier_name')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('entity_type')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('categories')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('algorithm')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classifiers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.entity_type}</TableCell>
                          <TableCell>{c.categories.join(', ')}</TableCell>
                          <TableCell>{c.algorithm || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('create_classifier_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('classifier_name')}
                  value={classifierForm.name}
                  onChange={(e) => setClassifierForm({ ...classifierForm, name: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('entity_type')}
                  value={classifierForm.entity_type}
                  onChange={(e) =>
                    setClassifierForm({ ...classifierForm, entity_type: e.target.value })
                  }
                  size='small'
                />
                <TextField
                  label={t('categories')}
                  value={classifierForm.categories}
                  onChange={(e) =>
                    setClassifierForm({ ...classifierForm, categories: e.target.value })
                  }
                  size='small'
                  placeholder='a, b, c'
                />
                <TextField
                  select
                  label={t('algorithm')}
                  value={classifierForm.algorithm}
                  onChange={(e) =>
                    setClassifierForm({ ...classifierForm, algorithm: e.target.value })
                  }
                  size='small'
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value=''>-</MenuItem>
                  <MenuItem value='rule_based'>rule_based</MenuItem>
                  <MenuItem value='naive_bayes'>naive_bayes</MenuItem>
                  <MenuItem value='tf_idf'>tf_idf</MenuItem>
                </TextField>
                <Button
                  variant='outlined'
                  startIcon={<AddIcon />}
                  onClick={handleCreateClassifier}
                  disabled={loading}
                >
                  {t('create_classifier_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default AiGovernancePage;
