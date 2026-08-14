import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  TextField,
  Chip,
  Avatar,
  Divider,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  FileText,
  Languages,
  FileSearch,
  MessageSquare,
  Upload,
  Sparkles,
  Copy,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer, Grid } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

type AnalysisTab = 'summary' | 'translate' | 'qa' | 'extract' | 'ocr';

const recentDocuments = [
  { id: '1', name: '员工手册2024版.pdf', type: 'pdf', size: '2.3 MB', date: '2024-06-20' },
  { id: '2', name: '产品规格书.docx', type: 'docx', size: '856 KB', date: '2024-06-19' },
  { id: '3', name: '年度报告.pdf', type: 'pdf', size: '5.1 MB', date: '2024-06-18' },
];

const summaryResult = `本文档是一份企业员工手册，主要内容包括：

1. 公司简介与企业文化
   - 公司成立背景、发展历程和愿景使命
   - 核心价值观：创新、专业、诚信、共赢

2. 人力资源管理制度
   - 招聘与录用流程
   - 试用期规定与转正流程
   - 考勤管理制度（工作时间、请假流程）
   - 薪酬福利体系

3. 员工行为规范
   - 职业道德准则
   - 办公场所行为规范
   - 信息安全与保密规定

4. 培训与发展
   - 新员工入职培训
   - 职业发展通道
   - 绩效考核制度

5. 奖惩制度
   - 奖励种类与条件
   - 违纪处分规定
   - 申诉流程

总体而言，这份员工手册系统地规范了员工的权利和义务，是企业管理的重要指导性文件。`;

const keyPoints = [
  '公司实行双休制，工作时间为周一至周五 9:00-18:00',
  '试用期一般为3个月，表现优秀可申请提前转正',
  '员工每年享有5-15天带薪年假，根据工龄递增',
  '公司提供五险一金、年度体检、节日福利等',
  '保密协议为必备签署文件，违反者将承担法律责任',
  '绩效考核分为季度考核和年度考核，与晋升调薪挂钩',
];

export const AiDocumentAnalysisPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('summary');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [translateTarget, setTranslateTarget] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [copied, setCopied] = useState(false);

  const steps = [
    t('ai.document_analysis.step.upload'),
    t('ai.document_analysis.step.parse'),
    t('ai.document_analysis.step.analyze'),
    t('ai.document_analysis.step.generate'),
  ];

  const handleAnalyze = useCallback(() => {
    if (!selectedDocument && !uploadedFile) {
      addNotification({
        title: t('ai.document_analysis.message.notice'),
        message: t('ai.document_analysis.message.select_document'),
        type: 'warning',
      });
      return;
    }

    setAnalyzing(true);
    setAnalysisStep(0);
    setAnalysisComplete(false);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev >= 3) {
          clearInterval(stepInterval);
          setAnalyzing(false);
          setAnalysisComplete(true);
          addNotification({
            title: t('ai.document_analysis.message.analysis_complete'),
            message: t('ai.document_analysis.message.analysis_complete_body'),
            type: 'success',
          });
          return 3;
        }
        return prev + 1;
      });
    }, 800);
  }, [selectedDocument, uploadedFile, addNotification, t]);

  const handleAskQuestion = () => {
    if (!question.trim()) return;

    const answer = t('ai.document_analysis.mock.qa_answer', { question });
    setQaHistory((prev) => [...prev, { q: question, a: answer }]);
    setQuestion('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification({
      title: t('ai.document_analysis.message.copied'),
      message: t('ai.document_analysis.message.copied_body'),
      type: 'success',
    });
  };

  const handleTranslate = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setTranslatedText(
        'This is the translated content of the document. In actual use, it would be the professional translation of the uploaded document.'
      );
      setAnalyzing(false);
      setAnalysisComplete(true);
    }, 1500);
  };

  const tabConfig = [
    {
      id: 'summary' as AnalysisTab,
      label: t('ai.document_analysis.tab.summary'),
      icon: <FileText size={18} />,
    },
    {
      id: 'translate' as AnalysisTab,
      label: t('ai.document_analysis.tab.translate'),
      icon: <Languages size={18} />,
    },
    {
      id: 'qa' as AnalysisTab,
      label: t('ai.document_analysis.tab.qa'),
      icon: <MessageSquare size={18} />,
    },
    {
      id: 'extract' as AnalysisTab,
      label: t('ai.document_analysis.tab.extract'),
      icon: <FileSearch size={18} />,
    },
    {
      id: 'ocr' as AnalysisTab,
      label: t('ai.document_analysis.tab.ocr'),
      icon: <BookOpen size={18} />,
    },
  ];

  return (
    <PageContainer
      title={t('ai.document_analysis.title')}
      subtitle={t('ai.document_analysis.subtitle')}
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.cyan[600]} 0%, ${ct.cyan[300]} 100%)`,
      }}
    >
      <Box sx={{ p: 3 }}>
        <Grid
          container
          spacing={3}
        >
          {/* 左侧：文档选择和最近文档 */}
          <Grid
            item
            xs={12}
            md={3}
          >
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('ai.document_analysis.label.select_document')}
              </Typography>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 3,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  mb: 2,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                  },
                }}
                onClick={() => document.getElementById('doc-upload')?.click()}
              >
                <input
                  type='file'
                  id='doc-upload'
                  accept='.pdf,.docx,.doc,.txt'
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadedFile(e.target.files[0]);
                      setAnalysisComplete(false);
                    }
                  }}
                />
                <Upload
                  size={32}
                  style={{ margin: '0 auto 8px', color: ct.grey[400] }}
                />
                <Typography variant='body2'>
                  {t('ai.document_analysis.label.click_upload')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('ai.document_analysis.label.support_format')}
                </Typography>
              </Box>

              {uploadedFile && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'primary.50',
                    borderRadius: 1,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <FileText
                    size={20}
                    style={{ color: ct.primary.main }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant='body2'
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {uploadedFile.name}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                </Box>
              )}

              <Button
                fullWidth
                variant='contained'
                startIcon={<Sparkles size={18} />}
                onClick={handleAnalyze}
                disabled={analyzing || (!selectedDocument && !uploadedFile)}
              >
                {analyzing
                  ? t('ai.document_analysis.button.analyzing')
                  : t('ai.document_analysis.button.start_analysis')}
              </Button>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('ai.document_analysis.label.recent_documents')}
              </Typography>
              <List disablePadding>
                {recentDocuments.map((doc) => (
                  <ListItem
                    key={doc.id}
                    sx={{
                      px: 1,
                      mb: 1,
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: selectedDocument === doc.id ? 'primary.50' : 'transparent',
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                    onClick={() => {
                      setSelectedDocument(doc.id);
                      setUploadedFile(null);
                      setAnalysisComplete(false);
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FileText
                        size={18}
                        style={{ color: ct.error.main }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                          noWrap
                        >
                          {doc.name}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {doc.size} · {doc.date}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* 右侧：分析结果区域 */}
          <Grid
            item
            xs={12}
            md={9}
          >
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {/* 标签页 */}
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  px: 2,
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  sx={{ minHeight: 48 }}
                >
                  {tabConfig.map((tab) => (
                    <Tab
                      key={tab.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {tab.icon}
                          {tab.label}
                        </Box>
                      }
                      value={tab.id}
                      sx={{ minHeight: 48, textTransform: 'none' }}
                    />
                  ))}
                </Tabs>
              </Box>

              {/* 分析进度 */}
              {analyzing && (
                <Box sx={{ p: 4 }}>
                  <Stepper
                    activeStep={analysisStep}
                    sx={{ mb: 4 }}
                  >
                    {steps.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress
                      size={48}
                      sx={{ mb: 2 }}
                    />
                    <Typography variant='body1'>{steps[analysisStep]}...</Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.document_analysis.message.processing')}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* 初始状态 */}
              {!analyzing && !analysisComplete && (
                <Box sx={{ p: 8, textAlign: 'center' }}>
                  <Zap
                    size={64}
                    style={{ margin: '0 auto 16px', color: ct.text.disabled }}
                  />
                  <Typography
                    variant='h6'
                    sx={{ mb: 1 }}
                  >
                    {t('ai.document_analysis.message.select_to_start')}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('ai.document_analysis.message.supported_features')}
                  </Typography>
                </Box>
              )}

              {/* 分析结果 */}
              {!analyzing && analysisComplete && (
                <Box sx={{ p: 4 }}>
                  {/* 文档摘要 */}
                  {activeTab === 'summary' && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 600 }}
                        >
                          {t('ai.document_analysis.tab.summary')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size='small'
                            variant='outlined'
                            startIcon={<RefreshCw size={16} />}
                            onClick={handleAnalyze}
                          >
                            {t('ai.document_analysis.button.regenerate')}
                          </Button>
                          <Button
                            size='small'
                            variant='outlined'
                            startIcon={<Copy size={16} />}
                            onClick={() => handleCopy(summaryResult)}
                          >
                            {copied
                              ? t('ai.document_analysis.button.copied')
                              : t('ai.document_analysis.button.copy')}
                          </Button>
                        </Box>
                      </Box>
                      <Divider sx={{ mb: 3 }} />

                      <Paper
                        variant='outlined'
                        sx={{ p: 3, borderRadius: 3, mb: 3 }}
                      >
                        <Typography
                          variant='body1'
                          sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
                        >
                          {summaryResult}
                        </Typography>
                      </Paper>

                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        {t('ai.document_analysis.label.key_points')}
                      </Typography>
                      <List disablePadding>
                        {keyPoints.map((point, index) => (
                          <ListItem
                            key={index}
                            sx={{ px: 0, py: 1, alignItems: 'flex-start' }}
                          >
                            <ListItemIcon sx={{ minWidth: 32, pt: 0.5 }}>
                              <Lightbulb
                                size={18}
                                style={{ color: ct.warning.main }}
                              />
                            </ListItemIcon>
                            <ListItemText primary={point} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* 智能翻译 */}
                  {activeTab === 'translate' && (
                    <Box>
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
                          sx={{ fontWeight: 600 }}
                        >
                          {t('ai.document_analysis.tab.translate')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <FormControl
                            size='small'
                            sx={{ width: 150 }}
                          >
                            <InputLabel id='translate-target-label'>
                              {t('ai.document_analysis.label.target_language')}
                            </InputLabel>
                            <Select
                              labelId='translate-target-label'
                              value={translateTarget}
                              label={t('ai.document_analysis.label.target_language')}
                              onChange={(e) => setTranslateTarget(e.target.value)}
                            >
                              <MenuItem value='en'>
                                {t('ai.document_analysis.language.english')}
                              </MenuItem>
                              <MenuItem value='ja'>
                                {t('ai.document_analysis.language.japanese')}
                              </MenuItem>
                              <MenuItem value='ko'>
                                {t('ai.document_analysis.language.korean')}
                              </MenuItem>
                              <MenuItem value='fr'>
                                {t('ai.document_analysis.language.french')}
                              </MenuItem>
                              <MenuItem value='de'>
                                {t('ai.document_analysis.language.german')}
                              </MenuItem>
                            </Select>
                          </FormControl>
                          <Button
                            variant='contained'
                            size='small'
                            startIcon={<Languages size={16} />}
                            onClick={handleTranslate}
                          >
                            {t('ai.document_analysis.button.start_translate')}
                          </Button>
                        </Box>
                      </Box>
                      <Paper
                        variant='outlined'
                        sx={{ p: 3, borderRadius: 3, minHeight: 300 }}
                      >
                        {translatedText ? (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                              <Button
                                size='small'
                                startIcon={<Copy size={16} />}
                                onClick={() => handleCopy(translatedText)}
                              >
                                {t('ai.document_analysis.button.copy')}
                              </Button>
                            </Box>
                            <Typography
                              variant='body1'
                              sx={{ lineHeight: 1.8 }}
                            >
                              {translatedText}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Languages
                              size={48}
                              style={{ margin: '0 auto 12px', color: ct.text.disabled }}
                            />
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {t('ai.document_analysis.message.select_language')}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  )}

                  {/* 文档问答 */}
                  {activeTab === 'qa' && (
                    <Box>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, mb: 3 }}
                      >
                        {t('ai.document_analysis.tab.qa')}
                      </Typography>

                      <Box sx={{ mb: 3 }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          placeholder={t('ai.document_analysis.placeholder.qa_input')}
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
                          sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant='contained'
                            startIcon={<MessageSquare size={16} />}
                            onClick={handleAskQuestion}
                            disabled={!question.trim()}
                          >
                            {t('ai.document_analysis.button.ask')}
                          </Button>
                        </Box>
                      </Box>

                      <Divider sx={{ mb: 3 }} />

                      {qaHistory.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                          <MessageSquare
                            size={48}
                            style={{ margin: '0 auto 12px', color: ct.text.disabled }}
                          />
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {t('ai.document_analysis.message.empty_qa')}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {qaHistory.map((item, index) => (
                            <React.Fragment key={index}>
                              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Paper
                                  sx={{
                                    p: 2,
                                    maxWidth: '70%',
                                    bgcolor: 'primary.main',
                                    color: 'common.white',
                                    borderRadius: '16px 16px 4px 16px',
                                  }}
                                >
                                  <Typography variant='body2'>{item.q}</Typography>
                                </Paper>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 2 }}>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'primary.50',
                                    color: 'primary.main',
                                  }}
                                >
                                  <Sparkles size={16} />
                                </Avatar>
                                <Paper
                                  sx={{
                                    p: 2,
                                    maxWidth: '70%',
                                    borderRadius: '16px 16px 16px 4px',
                                  }}
                                >
                                  <Typography
                                    variant='body2'
                                    sx={{ whiteSpace: 'pre-wrap' }}
                                  >
                                    {item.a}
                                  </Typography>
                                </Paper>
                              </Box>
                            </React.Fragment>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* 信息提取 */}
                  {activeTab === 'extract' && (
                    <Box>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, mb: 3 }}
                      >
                        {t('ai.document_analysis.tab.extract')}
                      </Typography>
                      <Grid
                        container
                        spacing={2}
                      >
                        {[
                          t('ai.document_analysis.extract.date'),
                          t('ai.document_analysis.extract.person'),
                          t('ai.document_analysis.extract.organization'),
                          t('ai.document_analysis.extract.location'),
                          t('ai.document_analysis.extract.keyword'),
                          t('ai.document_analysis.extract.amount'),
                        ].map((type) => (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            key={type}
                          >
                            <Card
                              variant='outlined'
                              sx={{ borderRadius: 3 }}
                            >
                              <CardContent>
                                <Typography
                                  variant='subtitle2'
                                  sx={{ fontWeight: 600, mb: 1 }}
                                >
                                  {type}
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  <Chip
                                    label={t('ai.document_analysis.extract.sample_1')}
                                    size='small'
                                    variant='outlined'
                                  />
                                  <Chip
                                    label={t('ai.document_analysis.extract.sample_2')}
                                    size='small'
                                    variant='outlined'
                                  />
                                  <Chip
                                    label={t('ai.document_analysis.extract.sample_3')}
                                    size='small'
                                    variant='outlined'
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* OCR识别 */}
                  {activeTab === 'ocr' && (
                    <Box>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600, mb: 3 }}
                      >
                        {t('ai.document_analysis.ocr.title')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <Chip
                          icon={<CheckCircle2 size={14} />}
                          label={t('ai.document_analysis.ocr.recognition_complete')}
                          color='success'
                          size='small'
                        />
                        <Chip
                          label={t('ai.document_analysis.ocr.total_pages')}
                          size='small'
                          variant='outlined'
                        />
                        <Chip
                          label={t('ai.document_analysis.ocr.confidence')}
                          size='small'
                          variant='outlined'
                        />
                      </Box>
                      <Paper
                        variant='outlined'
                        sx={{ p: 3, borderRadius: 3, maxHeight: 400, overflowY: 'auto' }}
                      >
                        <Typography
                          variant='body2'
                          sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
                        >
                          {`[OCR识别结果示例]\n\n这是文档的第一页内容...\n\n这是文档的第二页内容...\n\n这是文档的第三页内容...`}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default AiDocumentAnalysisPage;
