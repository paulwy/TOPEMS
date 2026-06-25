import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  UserPlus,
  Search,
  ChevronLeft,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip } from '@mui/material';
import { apiLogger } from '@/utils/logger';
import { useNotification } from '@/hooks/useNotification';
import { StatCardGroup } from '@/components/mui';
import {
  jobOpeningApi,
  candidateApi,
  interviewApi,
  departmentApi,
  positionApi,
  type JobOpening,
  type Candidate as ApiCandidate,
  type Interview as ApiInterview,
  type Department,
} from '@/api/hrm';

interface Candidate {
  id: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  email: string;
  position: string;
  education: string;
  experience: string;
  status: 'new' | 'interview' | 'offer' | 'hired' | 'rejected';
  source: string;
  resume_url?: string;
  interview_time?: string;
  salary_expectation?: number;
  applied_at: string;
}

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  salary_range: string;
  requirements: string[];
  description: string;
  status: 'open' | 'closed' | 'filled';
  headcount: number;
  filled_count: number;
  published_at: string;
}

interface InterviewRecord {
  id: string;
  candidate_name: string;
  position: string;
  interviewer: string;
  interview_time: string;
  interview_type: 'first' | 'second' | 'final';
  result: 'pass' | 'fail' | 'pending';
  feedback?: string;
}

const HrmRecruitmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<'positions' | 'candidates' | 'interviews'>(
    'positions'
  );
  const [showCreatePositionModal, setShowCreatePositionModal] = useState(false);
  const [showCreateCandidateModal, setShowCreateCandidateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [departments, setDepartments] = useState<Record<string, Department>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据，但添加错误处理
      const results = await Promise.allSettled([
        jobOpeningApi.list({ page_size: 100 }),
        candidateApi.list({ page_size: 100 }),
        interviewApi.list({ page_size: 100 }),
        departmentApi.list({ page_size: 100 }),
        positionApi.list({ page_size: 100 }),
      ]);

      // 处理每个结果
      const [
        openingsResult,
        candidatesResult,
        interviewsResult,
        departmentsResult,
        positionsResult,
      ] = results;

      // 创建部门映射
      const deptMap: Record<string, Department> = {};
      if (departmentsResult.status === 'fulfilled' && departmentsResult.value.data?.items) {
        departmentsResult.value.data.items.forEach((dept) => {
          deptMap[dept.id] = dept;
        });
      }
      setDepartments(deptMap);

      // 创建职位映射
      const positionMap: Record<string, any> = {};
      if (positionsResult.status === 'fulfilled' && positionsResult.value.data?.items) {
        positionsResult.value.data.items.forEach((pos) => {
          positionMap[pos.id] = pos;
        });
      }

      // 转换职位数据
      const openings =
        openingsResult.status === 'fulfilled' ? openingsResult.value.data?.items || [] : [];
      const transformedPositions: JobPosition[] = openings.map((opening) => {
        const dept = deptMap[opening.department_id || ''];
        const pos = positionMap[opening.position_id || ''];
        return {
          id: opening.id,
          title: opening.title,
          department: dept?.name || '',
          location: opening.location || '',
          salary_range:
            opening.salary_min && opening.salary_max
              ? `${opening.salary_min}-${opening.salary_max}`
              : '',
          requirements: opening.requirements ? [opening.requirements] : [],
          description: opening.description || '',
          status: mapPositionStatus(opening.status),
          headcount: 1,
          filled_count: 0,
          published_at: opening.publish_date || opening.created_at,
        };
      });
      setPositions(transformedPositions);

      // 转换候选人数据
      const candidates =
        candidatesResult.status === 'fulfilled' ? candidatesResult.value.data?.items || [] : [];
      const transformedCandidates: Candidate[] = candidates.map((candidate) => {
        const pos = positionMap[candidate.position_id || ''];
        const opening = transformedPositions.find((o) => o.id === candidate.job_opening_id);
        return {
          id: candidate.id,
          name: candidate.name,
          gender: '',
          age: 0,
          phone: candidate.phone || '',
          email: candidate.email || '',
          position: pos?.name || opening?.title || '',
          education: '',
          experience: '',
          status: mapCandidateStatus(candidate.status),
          source: candidate.source || '',
          resume_url: candidate.resume_path,
          salary_expectation: undefined,
          applied_at: candidate.created_at,
        };
      });
      setCandidates(transformedCandidates);

      // 转换面试数据
      const interviews =
        interviewsResult.status === 'fulfilled' ? interviewsResult.value.data?.items || [] : [];
      const transformedInterviews: InterviewRecord[] = interviews.map((interview) => {
        const candidate = transformedCandidates.find((c) => c.id === interview.candidate_id);
        return {
          id: interview.id,
          candidate_name: candidate?.name || '',
          position: candidate?.position || '',
          interviewer: '',
          interview_time: interview.scheduled_at || '',
          interview_type: mapInterviewType(interview.round),
          result: mapInterviewResult(interview.result || interview.status),
          feedback: interview.notes,
        };
      });
      setInterviews(transformedInterviews);
    } catch (err: unknown) {
      error('加载数据失败');
      apiLogger.error('Failed to load recruitment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapPositionStatus = (status: string): JobPosition['status'] => {
    const statusMap: Record<string, JobPosition['status']> = {
      open: 'open',
      closed: 'closed',
      filled: 'filled',
    };
    return statusMap[status] || 'open';
  };

  const mapCandidateStatus = (status: string): Candidate['status'] => {
    const statusMap: Record<string, Candidate['status']> = {
      new: 'new',
      interview: 'interview',
      offer: 'offer',
      hired: 'hired',
      rejected: 'rejected',
    };
    return statusMap[status] || 'new';
  };

  const mapInterviewType = (round: number): InterviewRecord['interview_type'] => {
    const typeMap: Record<number, InterviewRecord['interview_type']> = {
      1: 'first',
      2: 'second',
      3: 'final',
    };
    return typeMap[round] || 'first';
  };

  const mapInterviewResult = (result: string): InterviewRecord['result'] => {
    const resultMap: Record<string, InterviewRecord['result']> = {
      pass: 'pass',
      fail: 'fail',
      pending: 'pending',
    };
    return resultMap[result] || 'pending';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      open: (
        <Chip
          label='招聘中'
          size='small'
          sx={{ bgcolor: 'success.light', color: 'success.dark' }}
        />
      ),
      closed: (
        <Chip
          label='已关闭'
          size='small'
          sx={{ bgcolor: 'grey.200', color: 'grey.700' }}
        />
      ),
      filled: (
        <Chip
          label='已招满'
          size='small'
          sx={{ bgcolor: 'info.light', color: 'info.dark' }}
        />
      ),
      new: (
        <Chip
          label='新增'
          size='small'
          sx={{ bgcolor: 'info.light', color: 'info.dark' }}
        />
      ),
      interview: (
        <Chip
          label='面试中'
          size='small'
          sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}
        />
      ),
      offer: (
        <Chip
          label='Offer'
          size='small'
          sx={{ bgcolor: 'secondary.light', color: 'secondary.dark' }}
        />
      ),
      hired: (
        <Chip
          label='已入职'
          size='small'
          sx={{ bgcolor: 'success.light', color: 'success.dark' }}
        />
      ),
      rejected: (
        <Chip
          label='已拒绝'
          size='small'
          sx={{ bgcolor: 'error.light', color: 'error.dark' }}
        />
      ),
      pass: (
        <Chip
          label='通过'
          size='small'
          sx={{ bgcolor: 'success.light', color: 'success.dark' }}
        />
      ),
      fail: (
        <Chip
          label='未通过'
          size='small'
          sx={{ bgcolor: 'error.light', color: 'error.dark' }}
        />
      ),
      pending: (
        <Chip
          label='待定'
          size='small'
          sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}
        />
      ),
    };
    return (
      badges[status] || (
        <Chip
          label={status}
          size='small'
          sx={{ bgcolor: 'grey.200', color: 'grey.700' }}
        />
      )
    );
  };

  const filteredPositions = positions.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'grey.200',
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                component='button'
                onClick={() => navigate('/dashboard')}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  border: 'none',
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.100' },
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft sx={{ width: 20, height: 20, color: 'grey.600' }} />
              </Box>
              <Box>
                {/* 面包屑导航 */}
                <Box sx={{ mb: 1 }}>
                  <Typography
                    component='a'
                    href='/hrm'
                    sx={{
                      color: 'text.secondary',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      '&:hover': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    人力资源
                  </Typography>
                  <Typography
                    component='span'
                    sx={{ mx: 1, color: 'text.disabled' }}
                  >
                    /
                  </Typography>
                  <Typography
                    component='span'
                    sx={{ color: 'text.primary', fontSize: '0.875rem' }}
                  >
                    招聘管理
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 700,
                    color: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <UserPlus sx={{ width: 28, height: 28, color: 'primary.main' }} />
                  招聘管理
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, color: 'grey.500' }}
                >
                  管理招聘流程、职位发布和候选人信息
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 统计卡片 */}
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
          py: 3,
        }}
      >
        <StatCardGroup
          stats={[
            {
              title: '招聘岗位数',
              value: positions.length,
              icon: <Briefcase style={{ width: 24, height: 24 }} />,
              color: 'primary',
            },
            {
              title: '候选人总数',
              value: candidates.length,
              icon: <Users style={{ width: 24, height: 24 }} />,
              color: 'secondary',
            },
            {
              title: '面试安排数',
              value: interviews.length,
              icon: <Calendar style={{ width: 24, height: 24 }} />,
              color: 'warning',
            },
            {
              title: '已录用数',
              value: candidates.filter((c) => c.status === 'hired').length,
              icon: <CheckCircle style={{ width: 24, height: 24 }} />,
              color: 'success',
            },
          ]}
          columns={4}
          loading={loading}
        />
      </Box>

      {/* Tabs */}
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
          py: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            borderBottom: 1,
            borderColor: 'grey.200',
          }}
        >
          <Box
            component='button'
            onClick={() => setActiveTab('positions')}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: activeTab === 'positions' ? 'primary.main' : 'text.secondary',
              borderBottom: activeTab === 'positions' ? 2 : 0,
              borderColor: activeTab === 'positions' ? 'primary.main' : 'transparent',
              '&:hover': {
                color: activeTab === 'positions' ? 'primary.main' : 'text.primary',
              },
              transition: 'all 0.2s',
            }}
          >
            <Briefcase sx={{ width: 20, height: 20 }} />
            <span>招聘职位</span>
          </Box>
          <Box
            component='button'
            onClick={() => setActiveTab('candidates')}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: activeTab === 'candidates' ? 'primary.main' : 'text.secondary',
              borderBottom: activeTab === 'candidates' ? 2 : 0,
              borderColor: activeTab === 'candidates' ? 'primary.main' : 'transparent',
              '&:hover': {
                color: activeTab === 'candidates' ? 'primary.main' : 'text.primary',
              },
              transition: 'all 0.2s',
            }}
          >
            <Users sx={{ width: 20, height: 20 }} />
            <span>候选人</span>
          </Box>
          <Box
            component='button'
            onClick={() => setActiveTab('interviews')}
            sx={{
              pb: 2,
              px: 1,
              fontWeight: 500,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: activeTab === 'interviews' ? 'primary.main' : 'text.secondary',
              borderBottom: activeTab === 'interviews' ? 2 : 0,
              borderColor: activeTab === 'interviews' ? 'primary.main' : 'transparent',
              '&:hover': {
                color: activeTab === 'interviews' ? 'primary.main' : 'text.primary',
              },
              transition: 'all 0.2s',
            }}
          >
            <Calendar sx={{ width: 20, height: 20 }} />
            <span>面试安排</span>
          </Box>
        </Box>

        {/* Search Bar */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Search
                sx={{
                  position: 'absolute',
                  left: 1.5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 20,
                  height: 20,
                  color: 'grey.400',
                }}
              />
              <Box
                component='input'
                type='text'
                placeholder='搜索职位/候选人...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  width: '100%',
                  pl: 4,
                  pr: 2,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
                  outline: 'none',
                  '&:focus': {
                    borderColor: 'primary.main',
                    boxShadow: (theme: any) => `0 0 0 2px ${theme.palette.primary.main}20`,
                  },
                }}
              />
            </Box>
            <Box
              component='button'
              onClick={loadData}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                bgcolor: 'primary.main',
                color: 'white',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'primary.dark' },
                transition: 'all 0.2s',
              }}
            >
              <Plus sx={{ width: 20, height: 20, mr: 1 }} />
              刷新数据
            </Box>
          </Box>
        </Box>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 10,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 3,
                borderColor: 'primary.main',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
          </Box>
        ) : (
          <>
            {/* Content */}
            {activeTab === 'positions' && (
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 1,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    component='table'
                    sx={{ minWidth: '100%', borderCollapse: 'collapse' }}
                  >
                    <Box
                      component='thead'
                      sx={{ bgcolor: 'grey.50' }}
                    >
                      <Box component='tr'>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          职位名称
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          部门
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          薪资范围
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          招聘人数
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          状态
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          发布时间
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          操作
                        </Box>
                      </Box>
                    </Box>
                    <Box component='tbody'>
                      {filteredPositions.map((position) => (
                        <Box
                          component='tr'
                          key={position.id}
                          sx={{
                            '&:hover': { bgcolor: 'grey.50' },
                            borderTop: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500, color: 'grey.900' }}
                            >
                              {position.title}
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ color: 'grey.500' }}
                            >
                              {position.location}
                            </Typography>
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {position.department}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {position.salary_range}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {position.filled_count}/{position.headcount}
                          </Box>
                          <Box
                            component='td'
                            sx={{ px: 3, py: 2, whiteSpace: 'nowrap' }}
                          >
                            {getStatusBadge(position.status)}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.500',
                              fontSize: '0.875rem',
                            }}
                          >
                            {position.published_at}
                          </Box>
                          <Box
                            component='td'
                            sx={{ px: 3, py: 2, whiteSpace: 'nowrap' }}
                          >
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Box
                                component='button'
                                sx={{
                                  color: 'primary.main',
                                  border: 'none',
                                  bgcolor: 'transparent',
                                  cursor: 'pointer',
                                  p: 0,
                                  '&:hover': { color: 'primary.dark' },
                                }}
                              >
                                查看
                              </Box>
                              <Box
                                component='button'
                                sx={{
                                  color: 'primary.main',
                                  border: 'none',
                                  bgcolor: 'transparent',
                                  cursor: 'pointer',
                                  p: 0,
                                  '&:hover': { color: 'primary.dark' },
                                }}
                              >
                                编辑
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {activeTab === 'candidates' && (
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 1,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    component='table'
                    sx={{ minWidth: '100%', borderCollapse: 'collapse' }}
                  >
                    <Box
                      component='thead'
                      sx={{ bgcolor: 'grey.50' }}
                    >
                      <Box component='tr'>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          姓名
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          应聘职位
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          学历
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          工作经验
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          期望薪资
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          状态
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          申请时间
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          操作
                        </Box>
                      </Box>
                    </Box>
                    <Box component='tbody'>
                      {filteredCandidates.map((candidate) => (
                        <Box
                          component='tr'
                          key={candidate.id}
                          sx={{
                            '&:hover': { bgcolor: 'grey.50' },
                            borderTop: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500, color: 'grey.900' }}
                            >
                              {candidate.name}
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ color: 'grey.500' }}
                            >
                              {candidate.phone}
                            </Typography>
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {candidate.position}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {candidate.education}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {candidate.experience}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {candidate.salary_expectation
                              ? `¥${candidate.salary_expectation.toLocaleString()}`
                              : '-'}
                          </Box>
                          <Box
                            component='td'
                            sx={{ px: 3, py: 2, whiteSpace: 'nowrap' }}
                          >
                            {getStatusBadge(candidate.status)}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.500',
                              fontSize: '0.875rem',
                            }}
                          >
                            {candidate.applied_at}
                          </Box>
                          <Box
                            component='td'
                            sx={{ px: 3, py: 2, whiteSpace: 'nowrap' }}
                          >
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Box
                                component='button'
                                sx={{
                                  color: 'primary.main',
                                  border: 'none',
                                  bgcolor: 'transparent',
                                  cursor: 'pointer',
                                  p: 0,
                                  '&:hover': { color: 'primary.dark' },
                                }}
                              >
                                查看
                              </Box>
                              <Box
                                component='button'
                                sx={{
                                  color: 'primary.main',
                                  border: 'none',
                                  bgcolor: 'transparent',
                                  cursor: 'pointer',
                                  p: 0,
                                  '&:hover': { color: 'primary.dark' },
                                }}
                              >
                                面试
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {activeTab === 'interviews' && (
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 1,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    component='table'
                    sx={{ minWidth: '100%', borderCollapse: 'collapse' }}
                  >
                    <Box
                      component='thead'
                      sx={{ bgcolor: 'grey.50' }}
                    >
                      <Box component='tr'>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          候选人
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          应聘职位
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          面试官
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          面试时间
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          面试类型
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          结果
                        </Box>
                        <Box
                          component='th'
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'grey.500',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          操作
                        </Box>
                      </Box>
                    </Box>
                    <Box component='tbody'>
                      {interviews.map((interview) => (
                        <Box
                          component='tr'
                          key={interview.id}
                          sx={{
                            '&:hover': { bgcolor: 'grey.50' },
                            borderTop: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              fontWeight: 500,
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {interview.candidate_name}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {interview.position}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {interview.interviewer}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {interview.interview_time}
                          </Box>
                          <Box
                            component='td'
                            sx={{
                              px: 3,
                              py: 2,
                              whiteSpace: 'nowrap',
                              color: 'grey.900',
                              fontSize: '0.875rem',
                            }}
                          >
                            {interview.interview_type === 'first'
                              ? '初试'
                              : interview.interview_type === 'second'
                                ? '复试'
                                : '终面'}
                          </Box>
                          <Box
                            component='td'
                            sx={{ px: 3, py: 2, whiteSpace: 'nowrap' }}
                          >
                            {getStatusBadge(interview.result)}
                          </Box>
                          <Box
                            component='td'
                            sx={{ px: 3, py: 2, whiteSpace: 'nowrap' }}
                          >
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Box
                                component='button'
                                sx={{
                                  color: 'primary.main',
                                  border: 'none',
                                  bgcolor: 'transparent',
                                  cursor: 'pointer',
                                  p: 0,
                                  fontSize: '0.875rem',
                                  '&:hover': { color: 'primary.dark' },
                                }}
                              >
                                查看详情
                              </Box>
                              {interview.result === 'pending' && (
                                <>
                                  <Box
                                    component='button'
                                    sx={{
                                      color: 'success.main',
                                      border: 'none',
                                      bgcolor: 'transparent',
                                      cursor: 'pointer',
                                      p: 0,
                                      fontSize: '0.875rem',
                                      '&:hover': { color: 'success.dark' },
                                    }}
                                  >
                                    通过
                                  </Box>
                                  <Box
                                    component='button'
                                    sx={{
                                      color: 'error.main',
                                      border: 'none',
                                      bgcolor: 'transparent',
                                      cursor: 'pointer',
                                      p: 0,
                                      fontSize: '0.875rem',
                                      '&:hover': { color: 'error.dark' },
                                    }}
                                  >
                                    拒绝
                                  </Box>
                                </>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default HrmRecruitmentPage;
